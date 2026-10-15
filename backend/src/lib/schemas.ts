import { z } from "zod";

// ── Enum schemas (API display forms) ─────────────────────────────────────────
export const CategorySchema = z.enum(["hardware", "network", "software", "account-access"]);
export const PrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const StatusSchema   = z.enum(["open", "in-progress", "resolved", "closed"]);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// ── Ticket creation ────────────────────────────────────────────────────────────
export const CreateTicketSchema = z.object({
  title:       z.string().min(1, "Title is required").max(120, "Title must be 120 characters or fewer"),
  description: z.string().min(1, "Description is required").max(5000, "Description must be 5000 characters or fewer"),
  category:    CategorySchema,
  priority:    PrioritySchema,
});

// ── Ticket list query params ───────────────────────────────────────────────────
export const TicketListQuerySchema = z.object({
  status:      StatusSchema.optional(),
  priority:    PrioritySchema.optional(),
  category:    CategorySchema.optional(),
  assigned_to: z.string().optional(), // UUID or "unassigned"
  q:           z.string().optional(),
  sort:        z.enum(["priority", "created_at", "updated_at"]).optional(),
  order:       z.enum(["asc", "desc"]).optional(),
  page:        z.coerce.number().int().positive().optional().default(1),
  pageSize:    z.coerce.number().int().positive().max(100).optional().default(20),
});

// ── Status change ─────────────────────────────────────────────────────────────
export const StatusChangeSchema = z.object({
  status: StatusSchema,
  note:   z.string().max(500).optional(),
});

// ── Assign ────────────────────────────────────────────────────────────────────
export const AssignSchema = z.object({
  assigned_to: z.string().uuid("Must be a valid user UUID").nullable(),
});

// ── Comment ───────────────────────────────────────────────────────────────────
export const CreateCommentSchema = z.object({
  body: z.string().min(1, "Comment body is required").max(2000, "Comment must be 2000 characters or fewer"),
});

// ── AI triage ─────────────────────────────────────────────────────────────────
export const AiTriageInputSchema = z.object({
  title:       z.string().min(1).max(120),
  description: z.string().min(1).max(5000),
});

// ── NL query ──────────────────────────────────────────────────────────────────
export const NlQuerySchema = z.object({
  question: z.string().min(1).max(500),
});
