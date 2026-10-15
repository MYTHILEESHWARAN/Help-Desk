// Shared TypeScript types — mirror the backend Zod schemas.
// These are display-layer types: enums use the hyphenated form used in the UI.

export type Category = "hardware" | "network" | "software" | "account-access";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "open" | "in-progress" | "resolved" | "closed";
export type Role = "employee" | "technician";
export type EventType = "created" | "status_change" | "assignment";

export interface UserSummary {
  id: string;
  username: string;
  full_name: string;
}

export interface User extends UserSummary {
  email: string;
  role: Role;
  created_at: string;
}

export interface SlaInfo {
  target_hours: number;
  elapsed_hours: number;
  percent: number;
  label: "ok" | "at-risk" | "breached";
}

export interface StatusHistoryEntry {
  id: string;
  event_type: EventType;
  from_status: Status | null;
  to_status: Status;
  changed_by: UserSummary;
  note: string | null;
  changed_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  author: UserSummary;
  body: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  reported_by: UserSummary;
  assigned_to: UserSummary | null;
  idempotency_key: string | null;
  summary: string | null;
  ai_suggested_category: Category | null;
  ai_suggested_priority: Priority | null;
  sla: SlaInfo;
  created_at: string;
  updated_at: string;
  history: StatusHistoryEntry[];
  comments: Comment[];
}

export interface PaginatedTickets {
  data: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface Notification {
  id: string;
  ticket_id: string;
  message: string;
  read: boolean;
  created_at: string;
}
