/**
 * Application-layer enum values.
 * The DB stores "account_access" and "in_progress" (Prisma enums can't use hyphens).
 * The API layer maps them to the hyphenated display forms.
 */

export const CATEGORIES = ["hardware", "network", "software", "account_access"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export const ROLES = ["employee", "technician"] as const;

export type CategoryDB = (typeof CATEGORIES)[number];
export type PriorityDB = (typeof PRIORITIES)[number];
export type StatusDB = (typeof STATUSES)[number];
export type RoleDB = (typeof ROLES)[number];

// API display forms (hyphenated)
export type CategoryAPI = "hardware" | "network" | "software" | "account-access";
export type PriorityAPI = "low" | "medium" | "high" | "urgent";
export type StatusAPI = "open" | "in-progress" | "resolved" | "closed";

/** Convert DB enum to API display form */
export function toApiCategory(c: CategoryDB): CategoryAPI {
  return c === "account_access" ? "account-access" : c;
}
export function toApiStatus(s: StatusDB): StatusAPI {
  return s === "in_progress" ? "in-progress" : s;
}

/** Convert API display form to DB enum */
export function toDbCategory(c: string): CategoryDB {
  return c === "account-access" ? "account_access" : c as CategoryDB;
}
export function toDbStatus(s: string): StatusDB {
  return s === "in-progress" ? "in_progress" : s as StatusDB;
}

// Status transition rules (server-enforced)
export const ALLOWED_TRANSITIONS: Record<StatusDB, StatusDB[]> = {
  open:       ["in_progress"],
  in_progress: ["resolved"],
  resolved:   ["closed", "in_progress"],
  closed:     [],
};

// SLA target hours by priority
export function getSlaHours(priority: PriorityDB): number {
  const map: Record<PriorityDB, string> = {
    urgent: process.env.SLA_URGENT_HOURS ?? "4",
    high:   process.env.SLA_HIGH_HOURS   ?? "8",
    medium: process.env.SLA_MEDIUM_HOURS ?? "24",
    low:    process.env.SLA_LOW_HOURS    ?? "72",
  };
  return parseFloat(map[priority]);
}
