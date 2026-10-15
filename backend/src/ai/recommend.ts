/**
 * Smart assignee recommendation.
 * Scores technicians by: categoryMatch * 0.6 + workloadScore * 0.4
 */
import { prisma } from "../lib/prisma";
import { toDbCategory } from "../lib/enums";
import { logger } from "../services/logger";

export async function recommendAssignees(ticketId: string) {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { category: true } });
    if (!ticket) return [];

    const technicians = await prisma.user.findMany({
      where: { role: "technician" },
      select: { id: true, full_name: true, username: true },
    });

    const results = await Promise.all(technicians.map(async (tech) => {
      const [totalResolved, categoryResolved, openLoad] = await Promise.all([
        prisma.ticket.count({ where: { assigned_to: tech.id, status: "resolved" } }),
        prisma.ticket.count({ where: { assigned_to: tech.id, status: "resolved", category: ticket.category } }),
        prisma.ticket.count({ where: { assigned_to: tech.id, status: { in: ["open","in_progress"] } } }),
      ]);

      const categoryMatch = totalResolved > 0 ? categoryResolved / totalResolved : 0;
      const maxLoad = 10; // normalise against assumed max
      const workloadScore = Math.max(0, 1 - openLoad / maxLoad);
      const score = categoryMatch * 0.6 + workloadScore * 0.4;

      return { id: tech.id, full_name: tech.full_name, username: tech.username, score: Math.round(score * 100) / 100, open_load: openLoad };
    }));

    return results.sort((a, b) => b.score - a.score);
  } catch (err) {
    logger.error({ err }, "recommendAssignees failed");
    return [];
  }
}
