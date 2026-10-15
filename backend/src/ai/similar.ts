/**
 * Duplicate detection: find similar open/resolved tickets via Postgres ILIKE.
 * Employees only see { id, title, status } of other tickets.
 * Technicians see id, title, status, and summary.
 */
import { prisma } from "../lib/prisma";
import { toApiStatus } from "../lib/enums";

export async function findSimilarTickets(
  title: string,
  description: string,
  callerId: string,
  callerRole: string
) {
  const terms = `${title} ${description}`.split(/\s+/).filter(w => w.length > 3).slice(0, 8);
  if (terms.length === 0) return [];

  const tickets = await prisma.ticket.findMany({
    where: {
      OR: terms.map(t => ({ title: { contains: t, mode: "insensitive" as const } })),
      status: { in: ["open","in_progress","resolved"] },
    },
    select: { id: true, title: true, status: true, summary: true, reported_by: true },
    take: 5,
    orderBy: { created_at: "desc" },
  });

  return tickets.slice(0, 3).map(t => {
    const base = { id: t.id, title: t.title, status: toApiStatus(t.status as any) };
    if (callerRole === "technician") {
      return { ...base, resolution_note: t.summary ?? null };
    }
    // Employees: never expose other employees details — just id/title/status
    return base;
  });
}
