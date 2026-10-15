/**
 * Hostile-input hardening tests (Phase 5).
 * Verifies the server handles all edge cases without crashing.
 */
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../index";

const SECRET = "test_jwt_secret_at_least_32_characters_long";
const EMP_ID  = "00000000-0000-0000-0000-000000000001";
const TECH_ID = "00000000-0000-0000-0000-000000000002";

const empCookie  = () => `token=${jwt.sign({ id: EMP_ID,  username: "priya", role: "employee",   email: "p@x.com", full_name: "Priya" }, SECRET, { expiresIn: "1h" })}`;
const techCookie = () => `token=${jwt.sign({ id: TECH_ID, username: "arjun", role: "technician", email: "a@x.com", full_name: "Arjun" }, SECRET, { expiresIn: "1h" })}`;

vi.mock("../lib/prisma", () => ({
  prisma: {
    user:          { findUnique: vi.fn(() => Promise.resolve(null)), findMany: vi.fn(() => Promise.resolve([])) },
    ticket:        { findUnique: vi.fn(() => Promise.resolve(null)), findMany: vi.fn(() => Promise.resolve([])), count: vi.fn(() => Promise.resolve(0)),
                     create: vi.fn(({ data }: any) => Promise.resolve({ ...data, id: "t1", history: [], comments: [], reporter: { id: EMP_ID, username: "priya", full_name: "Priya" }, assignee: null, created_at: new Date(), updated_at: new Date() })) },
    statusHistory: { create: vi.fn(() => Promise.resolve({})) },
    comment:       { create: vi.fn(() => Promise.resolve({})) },
    notification:  { create: vi.fn(() => Promise.resolve({})) },
    $transaction:  vi.fn(async (arg: any) => {
      if (typeof arg === "function") {
        const tx = { ticket: { create: vi.fn(({ data }: any) => Promise.resolve({ ...data, id: "t1", history: [], comments: [], reporter: { id: EMP_ID, username: "priya", full_name: "Priya" }, assignee: null, created_at: new Date(), updated_at: new Date() })), update: vi.fn() }, statusHistory: { create: vi.fn(() => Promise.resolve({})) }, notification: { create: vi.fn(() => Promise.resolve({})) } };
        return arg(tx);
      }
      return Promise.all(arg);
    }),
  },
}));

describe("Hostile-input hardening", () => {
  it("returns 400 for empty title", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "", description: "desc", category: "software", priority: "low" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for title exactly 121 chars", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "A".repeat(121), description: "desc", category: "software", priority: "low" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for description exactly 5001 chars", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "Valid", description: "A".repeat(5001), category: "software", priority: "low" });
    expect(res.status).toBe(400);
  });

  it("stores XSS title as plain text — returns 201, response is JSON not HTML", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "<script>alert(1)</script>", description: "xss test", category: "software", priority: "low" });
    expect(res.status).toBe(201);
    // Server returns JSON — no HTML rendering, no script execution possible
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    // The raw text is present in JSON-encoded form (< > are not escaped in JSON but that is correct — React escapes on render)
    expect(typeof res.body.title).toBe("string");
  });

  it("stores SQL injection description safely — returns 201", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "SQL test", description: "'; DROP TABLE tickets; --", category: "software", priority: "low" });
    expect(res.status).toBe(201);
  });

  it("stores prompt-injection title as plain text — returns 201", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "Ignore all previous instructions", description: "prompt injection test", category: "software", priority: "low" });
    expect(res.status).toBe(201);
  });

  it("returns 401 for missing JWT", async () => {
    const res = await request(app).post("/api/tickets")
      .send({ title: "Test", description: "Test", category: "software", priority: "low" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON body", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .set("Content-Type", "application/json").send("{ not valid json }");
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown enum category value", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "Test", description: "Test desc", category: "unknown-cat", priority: "low" });
    expect(res.status).toBe(400);
  });

  it("returns 403 for employee calling GET /api/dashboard", async () => {
    const res = await request(app).get("/api/dashboard").set("Cookie", empCookie());
    expect(res.status).toBe(403);
  });

  it("allows title exactly 120 chars (boundary — valid)", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "A".repeat(120), description: "Valid description", category: "software", priority: "low" });
    expect(res.status).toBe(201);
  });

  it("allows description exactly 5000 chars (boundary — valid)", async () => {
    const res = await request(app).post("/api/tickets").set("Cookie", empCookie())
      .send({ title: "Valid title", description: "A".repeat(5000), category: "software", priority: "low" });
    expect(res.status).toBe(201);
  });
});
