/**
 * Dashboard service.
 * Every metric is computed by a named SQL query that is also returned in the
 * response so the frontend "Show query" toggle can display it verbatim.
 *
 * Rules:
 * - All queries use Prisma $queryRaw for type safety and parameterisation.
 * - Every metric object has shape { value: T, sql: string }.
 * - Empty database → all counts are 0, all arrays are [].
 */
import { prisma } from "../lib/prisma";

// ── SQL strings (returned alongside results for the "Show query" toggle) ──────

const SQL = {
  open: `
SELECT COUNT(*)::int AS value
FROM tickets
WHERE status = 'open'`.trim(),

  urgentOpen: `
SELECT COUNT(*)::int AS value
FROM tickets
WHERE status = 'open'
  AND priority = 'urgent'`.trim(),

  unassigned: `
SELECT COUNT(*)::int AS value
FROM tickets
WHERE status NOT IN ('resolved', 'closed')
  AND assigned_to IS NULL`.trim(),

  inProgress: `
SELECT COUNT(*)::int AS value
FROM tickets
WHERE status = 'in_progress'`.trim(),

  completed: `
SELECT COUNT(*)::int AS value
FROM tickets
WHERE status IN ('resolved', 'closed')`.trim(),

  avgResolutionHours: `
SELECT ROUND(
  AVG(EXTRACT(EPOCH FROM (
    sh.changed_at - t.created_at
  )) / 3600.0)::numeric, 2
)::float AS value
FROM status_history sh
JOIN tickets t ON t.id = sh.ticket_id
WHERE sh.event_type = 'status_change'
  AND sh.to_status = 'resolved'`.trim(),

  byStatus: `
SELECT status AS label, COUNT(*)::int AS count
FROM tickets
GROUP BY status
ORDER BY status`.trim(),

  byPriority: `
SELECT priority AS label, COUNT(*)::int AS count
FROM tickets
GROUP BY priority
ORDER BY
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high'   THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low'    THEN 4
  END`.trim(),

  byCategory: `
SELECT category AS label, COUNT(*)::int AS count
FROM tickets
GROUP BY category
ORDER BY category`.trim(),

  byTechnician: `
SELECT
  u.id,
  u.full_name,
  u.username,
  COUNT(t.id)::int AS total_assigned,
  COUNT(CASE WHEN t.status NOT IN ('resolved','closed') THEN 1 END)::int AS open_load
FROM users u
LEFT JOIN tickets t ON t.assigned_to = u.id
WHERE u.role = 'technician'
GROUP BY u.id, u.full_name, u.username
ORDER BY open_load DESC, u.full_name ASC`.trim(),
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartRow  { label: string; count: number }
interface TechRow   { id: string; full_name: string; username: string; total_assigned: number; open_load: number }

// ── Dashboard query ───────────────────────────────────────────────────────────

export async function getDashboardData() {
  // Run all queries in parallel for speed
  const [
    openResult,
    urgentOpenResult,
    unassignedResult,
    inProgressResult,
    completedResult,
    avgResult,
    byStatusResult,
    byPriorityResult,
    byCategoryResult,
    byTechResult,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<[{ value: number }]>(SQL.open),
    prisma.$queryRawUnsafe<[{ value: number }]>(SQL.urgentOpen),
    prisma.$queryRawUnsafe<[{ value: number }]>(SQL.unassigned),
    prisma.$queryRawUnsafe<[{ value: number }]>(SQL.inProgress),
    prisma.$queryRawUnsafe<[{ value: number }]>(SQL.completed),
    prisma.$queryRawUnsafe<[{ value: number | null }]>(SQL.avgResolutionHours),
    prisma.$queryRawUnsafe<ChartRow[]>(SQL.byStatus),
    prisma.$queryRawUnsafe<ChartRow[]>(SQL.byPriority),
    prisma.$queryRawUnsafe<ChartRow[]>(SQL.byCategory),
    prisma.$queryRawUnsafe<TechRow[]>(SQL.byTechnician),
  ]);

  // Map DB enum values to API display values
  const mapStatus = (s: string) => s === "in_progress" ? "in-progress" : s;
  const mapCategory = (c: string) => c === "account_access" ? "account-access" : c;

  return {
    metrics: {
      open:               { value: openResult[0]?.value       ?? 0,    sql: SQL.open },
      urgentOpen:         { value: urgentOpenResult[0]?.value ?? 0,    sql: SQL.urgentOpen },
      unassigned:         { value: unassignedResult[0]?.value ?? 0,    sql: SQL.unassigned },
      inProgress:         { value: inProgressResult[0]?.value ?? 0,    sql: SQL.inProgress },
      completed:          { value: completedResult[0]?.value  ?? 0,    sql: SQL.completed },
      avgResolutionHours: { value: avgResult[0]?.value        ?? null, sql: SQL.avgResolutionHours },
    },
    byStatus: {
      data: (byStatusResult ?? []).map((r) => ({ label: mapStatus(r.label), count: r.count })),
      sql: SQL.byStatus,
    },
    byPriority: {
      data: byPriorityResult ?? [],
      sql: SQL.byPriority,
    },
    byCategory: {
      data: (byCategoryResult ?? []).map((r) => ({ label: mapCategory(r.label), count: r.count })),
      sql: SQL.byCategory,
    },
    byTechnician: {
      data: byTechResult ?? [],
      sql: SQL.byTechnician,
    },
  };
}
