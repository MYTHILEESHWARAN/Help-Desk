/**
 * Ticket service — all DB operations for tickets.
 * Routes call these functions; they never reach Prisma directly.
 */
import { prisma } from "../lib/prisma";
import { computeSla } from "../lib/sla";
import {
  toApiCategory,
  toApiStatus,
  toDbCategory,
  toDbStatus,
  ALLOWED_TRANSITIONS,
  StatusDB,
  CategoryDB,
  PriorityDB,
} from "../lib/enums";
import { Category, EventType, Priority, Status } from "@prisma/client";
import { createHttpError } from "../middleware/errorHandler";
import { emitTicketEvent } from "./sse";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Select clause reused everywhere to get consistent shape */
const TICKET_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  priority: true,
  status: true,
  idempotency_key: true,
  summary: true,
  ai_suggested_category: true,
  ai_suggested_priority: true,
  created_at: true,
  updated_at: true,
  reporter: {
    select: { id: true, username: true, full_name: true },
  },
  assignee: {
    select: { id: true, username: true, full_name: true },
  },
  history: {
    select: {
      id: true,
      event_type: true,
      from_status: true,
      to_status: true,
      note: true,
      changed_at: true,
      actor: { select: { id: true, username: true, full_name: true } },
    },
    orderBy: { changed_at: "asc" as const },
  },
  comments: {
    select: {
      id: true,
      body: true,
      created_at: true,
      author: { select: { id: true, username: true, full_name: true } },
    },
    orderBy: { created_at: "asc" as const },
  },
} as const;

/** Shape the raw Prisma result into the API response shape */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTicket(t: any) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: toApiCategory(t.category as CategoryDB),
    priority: t.priority as PriorityDB,
    status: toApiStatus(t.status as StatusDB),
    reported_by: t.reporter,
    assigned_to: t.assignee ?? null,
    idempotency_key: t.idempotency_key ?? null,
    summary: t.summary ?? null,
    ai_suggested_category: t.ai_suggested_category ? toApiCategory(t.ai_suggested_category as CategoryDB) : null,
    ai_suggested_priority: t.ai_suggested_priority ?? null,
    sla: computeSla(t.priority as PriorityDB, t.status as StatusDB, t.created_at),
    created_at: t.created_at.toISOString(),
    updated_at: t.updated_at.toISOString(),
    history: (t.history ?? []).map((h: any) => ({
      id: h.id,
      event_type: h.event_type,
      from_status: h.from_status ? toApiStatus(h.from_status as StatusDB) : null,
      to_status: toApiStatus(h.to_status as StatusDB),
      changed_by: h.actor,
      note: h.note ?? null,
      changed_at: h.changed_at.toISOString(),
    })),
    comments: (t.comments ?? []).map((c: any) => ({
      id: c.id,
      body: c.body,
      author: c.author,
      created_at: c.created_at.toISOString(),
    })),
  };
}

// ── Create ticket ─────────────────────────────────────────────────────────────

export async function createTicket(params: {
  title: string;
  description: string;
  category: string;
  priority: string;
  reportedBy: string;
  idempotencyKey?: string | null;
}) {
  const { title, description, category, priority, reportedBy, idempotencyKey } = params;

  const dbCategory = toDbCategory(category) as Category;
  const dbPriority = priority as Priority;

  // Idempotency: if key exists, return the existing ticket
  if (idempotencyKey) {
    const existing = await prisma.ticket.findUnique({
      where: { idempotency_key: idempotencyKey },
      select: TICKET_SELECT,
    });
    if (existing) return { ticket: formatTicket(existing), created: false };
  }

  // Create ticket + initial status_history row in a single transaction
  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        title,
        description,
        category: dbCategory,
        priority: dbPriority,
        status: "open",
        reported_by: reportedBy,
        idempotency_key: idempotencyKey ?? null,
      },
      select: TICKET_SELECT,
    });

    await tx.statusHistory.create({
      data: {
        ticket_id: t.id,
        event_type: "created",
        from_status: null,
        to_status: "open",
        changed_by: reportedBy,
      },
    });

    return t;
  });

  const formatted = formatTicket(ticket);
  emitTicketEvent("ticket_created", formatted);
  return { ticket: formatted, created: true };
}

// ── Get ticket list ────────────────────────────────────────────────────────────

export async function listTickets(params: {
  userId: string;
  role: string;
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  q?: string;
  sort?: string;
  order?: string;
  page: number;
  pageSize: number;
}) {
  const { userId, role, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  // Build Prisma where clause for standard filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Employees only see their own tickets
  if (role === "employee") {
    where.reported_by = userId;
  }

  if (params.status)   where.status   = toDbStatus(params.status) as Status;
  if (params.priority) where.priority = params.priority as Priority;
  if (params.category) where.category = toDbCategory(params.category) as Category;

  if (params.assigned_to) {
    where.assigned_to = params.assigned_to === "unassigned" ? null : params.assigned_to;
  }

  // Full-text + trigram search: use Prisma OR for compatibility when Postgres FTS
  // is not available (e.g. in unit tests without a real DB). In production the
  // GIN indexes on tickets make this fast.
  if (params.q) {
    where.OR = [
      { title:       { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }

  // Priority CASE sort: urgent=1, high=2, medium=3, low=4 (ascending = urgent first)
  // Prisma doesn't support CASE in orderBy, so we sort in-memory after fetch.
  // For large tables Phase 6 can switch to a raw query; for now correctness > cleverness.
  const PRIORITY_RANK: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };

  let orderBy: object[];
  if (params.sort === "created_at" || params.sort === "updated_at") {
    const dir = params.order === "desc" ? "desc" : "asc";
    orderBy = [{ [params.sort]: dir }];
  } else if (params.sort === "priority") {
    // In-memory priority sort applied below; use created_at as DB tiebreak
    orderBy = [{ created_at: "asc" }];
  } else {
    // Default: DB fetches by oldest first; in-memory priority sort applied below
    orderBy = [{ created_at: "asc" }];
  }

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      select: TICKET_SELECT,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  let formatted = tickets.map(formatTicket);

  // Apply priority sort when requested (or as default)
  const wantPrioritySort = !params.sort || params.sort === "priority";
  if (wantPrioritySort) {
    const dir = params.sort === "priority" && params.order === "desc" ? -1 : 1;
    formatted = formatted.sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 99;
      const pb = PRIORITY_RANK[b.priority] ?? 99;
      if (pa !== pb) return (pa - pb) * dir;
      // Tiebreak: oldest first
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  return { data: formatted, total, page, pageSize };
}

// ── Get single ticket ─────────────────────────────────────────────────────────

export async function getTicket(ticketId: string, userId: string, role: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: TICKET_SELECT,
  });

  if (!ticket) {
    throw createHttpError(404, "Ticket not found");
  }

  // Employees can only see their own tickets (return 404 to avoid enumeration)
  if (role === "employee" && ticket.reporter.id !== userId) {
    throw createHttpError(404, "Ticket not found");
  }

  return formatTicket(ticket);
}

// ── Change status ─────────────────────────────────────────────────────────────

export async function changeStatus(params: {
  ticketId: string;
  newStatus: string;
  actorId: string;
  note?: string;
}) {
  const { ticketId, newStatus, actorId, note } = params;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw createHttpError(404, "Ticket not found");

  const currentStatus = ticket.status as StatusDB;
  const targetStatus = toDbStatus(newStatus) as StatusDB;

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed.includes(targetStatus)) {
    const allowedDisplay = allowed.map(s => toApiStatus(s));
    throw createHttpError(
      400,
      `Cannot transition from '${toApiStatus(currentStatus)}' to '${toApiStatus(targetStatus)}'. Allowed next states: ${allowedDisplay.join(", ") || "none"}`
    );
  }

  // Auto-assign to actor if resolving/closing with no assignee
  const needsAssignee = targetStatus === "resolved" || targetStatus === "closed";
  const assigneePatch = needsAssignee && !ticket.assigned_to ? { assigned_to: actorId } : {};

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: targetStatus as Status,
        ...assigneePatch,
        updated_at: new Date(),
      },
      select: TICKET_SELECT,
    });

    await tx.statusHistory.create({
      data: {
        ticket_id: ticketId,
        event_type: "status_change",
        from_status: currentStatus as Status,
        to_status: targetStatus as Status,
        changed_by: actorId,
        note: note ?? null,
      },
    });

    // If we auto-assigned, also log the assignment event
    if (needsAssignee && !ticket.assigned_to) {
      await tx.statusHistory.create({
        data: {
          ticket_id: ticketId,
          event_type: "assignment",
          from_status: targetStatus as Status,
          to_status: targetStatus as Status,
          changed_by: actorId,
          note: "Auto-assigned on resolution",
        },
      });
    }

    return t;
  });

  const formatted = formatTicket(updated);
  emitTicketEvent("ticket_updated", formatted);
  return formatted;
}

// ── Assign ticket ─────────────────────────────────────────────────────────────

export async function assignTicket(params: {
  ticketId: string;
  assigneeId: string | null;
  actorId: string;
}) {
  const { ticketId, assigneeId, actorId } = params;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw createHttpError(404, "Ticket not found");

  if (assigneeId !== null) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) throw createHttpError(400, "Assignee user not found");
    if (assignee.role !== "technician") {
      throw createHttpError(400, "Assignee must be a technician");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({
      where: { id: ticketId },
      data: { assigned_to: assigneeId, updated_at: new Date() },
      select: TICKET_SELECT,
    });

    await tx.statusHistory.create({
      data: {
        ticket_id: ticketId,
        event_type: "assignment",
        from_status: ticket.status as Status,
        to_status: ticket.status as Status,
        changed_by: actorId,
        note: assigneeId ? `Assigned to technician` : "Unassigned",
      },
    });

    return t;
  });

  const formatted = formatTicket(updated);
  emitTicketEvent("ticket_assigned", formatted);
  return formatted;
}

// ── Add comment ───────────────────────────────────────────────────────────────

export async function addComment(params: {
  ticketId: string;
  authorId: string;
  body: string;
  role: string;
}) {
  const { ticketId, authorId, body, role } = params;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw createHttpError(404, "Ticket not found");

  // Employees can only comment on their own tickets
  if (role === "employee" && ticket.reported_by !== authorId) {
    throw createHttpError(404, "Ticket not found");
  }

  const comment = await prisma.comment.create({
    data: { ticket_id: ticketId, author_id: authorId, body },
    select: {
      id: true,
      body: true,
      created_at: true,
      author: { select: { id: true, username: true, full_name: true } },
    },
  });

  return {
    id: comment.id,
    body: comment.body,
    author: comment.author,
    created_at: comment.created_at.toISOString(),
  };
}
