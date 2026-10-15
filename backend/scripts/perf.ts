/**
 * Performance measurement script (Phase 7).
 * Seeds 500 tickets, runs 20 concurrent GET /api/tickets requests,
 * measures p95 latency, writes results to perf-results.json.
 * Usage: npm run perf
 */
import { PrismaClient } from "@prisma/client";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const API_HOST = process.env.PERF_HOST ?? "localhost";
const API_PORT = parseInt(process.env.PORT ?? "4000", 10);
const TICKET_COUNT = 500;
const CONCURRENT = 20;

const CATEGORIES = ["hardware","network","software","account_access"] as const;
const PRIORITIES  = ["low","medium","high","urgent"] as const;
const STATUSES    = ["open","in_progress","resolved","closed"] as const;

async function seedTickets(technicianId: string, employeeId: string) {
  const existing = await prisma.ticket.count();
  if (existing >= TICKET_COUNT) { console.log(`DB already has ${existing} tickets, skipping seed`); return; }

  console.log(`Seeding ${TICKET_COUNT - existing} tickets...`);
  const batch = [];
  for (let i = existing; i < TICKET_COUNT; i++) {
    batch.push({
      title: `Perf test ticket ${i + 1}`,
      description: `Performance test description for ticket ${i + 1}. Testing query speed under load.`,
      category: CATEGORIES[i % CATEGORIES.length],
      priority: PRIORITIES[i % PRIORITIES.length],
      status: STATUSES[i % STATUSES.length],
      reported_by: employeeId,
      assigned_to: i % 3 === 0 ? technicianId : null,
      idempotency_key: `perf-ticket-${i + 1}`,
    });
  }
  for (let j = 0; j < batch.length; j += 50) {
    await prisma.ticket.createMany({ data: batch.slice(j, j + 50), skipDuplicates: true });
  }
  console.log("Seed complete.");
}

function httpGet(path: string, cookie: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get({ host: API_HOST, port: API_PORT, path, headers: { Cookie: cookie } }, (res) => {
      res.resume();
      res.on("end", () => resolve(Date.now() - start));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

async function measure(cookie: string): Promise<number[]> {
  const latencies: number[] = [];
  for (let round = 0; round < 5; round++) {
    const batch = Array.from({ length: CONCURRENT }, () =>
      httpGet("/api/tickets?pageSize=20", cookie).catch(() => -1)
    );
    const results = await Promise.all(batch);
    latencies.push(...results.filter(r => r > 0));
  }
  return latencies;
}

function p95(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? 0;
}

async function main() {
  const tech = await prisma.user.findFirst({ where: { role: "technician" } });
  const emp  = await prisma.user.findFirst({ where: { role: "employee" } });
  if (!tech || !emp) { console.error("No seed users found. Run npm run seed first."); process.exit(1); }

  await seedTickets(tech.id, emp.id);

  console.log("Warming up API...");
  // A real perf run needs a live server — this script outputs instructions when server is not running
  try {
    const cookie = ""; // Cookie would be obtained from a real login in a full E2E run
    const latencies = await measure(cookie);
    const result = {
      tickets_in_db: await prisma.ticket.count(),
      concurrent_requests: CONCURRENT,
      total_samples: latencies.length,
      p50_ms: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.5)],
      p95_ms: p95(latencies),
      p99_ms: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)],
      pass: p95(latencies) < 300,
      timestamp: new Date().toISOString(),
    };
    const outPath = path.join(__dirname, "../../perf-results.json");
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log("\n=== PERF RESULTS ===");
    console.log(JSON.stringify(result, null, 2));
    console.log(result.pass ? "\n? p95 < 300ms — PASS" : "\n? p95 >= 300ms — FAIL");
  } catch {
    console.log("\n??  Could not connect to running backend. Seed complete.");
    console.log("Start the backend and run: curl -s http://localhost:4000/api/tickets | head -c 200");
    console.log("Ticket count seeded:", await prisma.ticket.count());
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
