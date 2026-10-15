import { getSlaHours, StatusDB, PriorityDB } from "./enums";

export interface SlaInfo {
  target_hours: number;
  elapsed_hours: number;
  percent: number;
  label: "ok" | "at-risk" | "breached";
}

/**
 * Compute SLA information for a ticket.
 * No SLA badge is shown for resolved or closed tickets.
 */
export function computeSla(
  priority: PriorityDB,
  status: StatusDB,
  createdAt: Date
): SlaInfo {
  const target = getSlaHours(priority);

  // Resolved / closed tickets: show elapsed but no risk label
  if (status === "resolved" || status === "closed") {
    const elapsed = (Date.now() - createdAt.getTime()) / 3_600_000;
    return { target_hours: target, elapsed_hours: Math.round(elapsed * 100) / 100, percent: 100, label: "ok" };
  }

  const elapsed = (Date.now() - createdAt.getTime()) / 3_600_000;
  const percent = (elapsed / target) * 100;

  const label: SlaInfo["label"] =
    percent >= 100 ? "breached" : percent >= 75 ? "at-risk" : "ok";

  return {
    target_hours: target,
    elapsed_hours: Math.round(elapsed * 100) / 100,
    percent: Math.round(percent * 10) / 10,
    label,
  };
}
