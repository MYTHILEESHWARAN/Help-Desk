import { Router, Request, Response, NextFunction } from "express";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  CreateTicketSchema,
  TicketListQuerySchema,
  StatusChangeSchema,
  AssignSchema,
  CreateCommentSchema,
} from "../lib/schemas";
import {
  createTicket,
  listTickets,
  getTicket,
  changeStatus,
  assignTicket,
  addComment,
} from "../services/ticket";
import { requireRole } from "../middleware/auth";

export const ticketsRouter = Router();

// ── POST /api/tickets ─────────────────────────────────────────────────────────
// Employees and technicians can create tickets
ticketsRouter.post(
  "/",
  validateBody(CreateTicketSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
      const user = req.user!;

      const { ticket, created } = await createTicket({
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        priority: req.body.priority,
        reportedBy: user.id,
        idempotencyKey: idempotencyKey ?? null,
      });

      res.status(created ? 201 : 200).json(ticket);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/tickets ──────────────────────────────────────────────────────────
ticketsRouter.get(
  "/",
  validateQuery(TicketListQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = (req as any).parsedQuery;

      const result = await listTickets({
        userId: user.id,
        role: user.role,
        status:      query.status,
        priority:    query.priority,
        category:    query.category,
        assigned_to: query.assigned_to,
        q:           query.q,
        sort:        query.sort,
        order:       query.order,
        page:        query.page,
        pageSize:    query.pageSize,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/tickets/:id ──────────────────────────────────────────────────────
ticketsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const ticket = await getTicket(req.params.id, user.id, user.role);
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/tickets/:id/status ─────────────────────────────────────────────
// Technicians only
ticketsRouter.patch(
  "/:id/status",
  requireRole("technician"),
  validateBody(StatusChangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const ticket = await changeStatus({
        ticketId: req.params.id,
        newStatus: req.body.status,
        actorId: user.id,
        note: req.body.note,
      });
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/tickets/:id/assign ─────────────────────────────────────────────
// Technicians only
ticketsRouter.patch(
  "/:id/assign",
  requireRole("technician"),
  validateBody(AssignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const ticket = await assignTicket({
        ticketId: req.params.id,
        assigneeId: req.body.assigned_to,
        actorId: user.id,
      });
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/tickets/:id/comments ────────────────────────────────────────────
ticketsRouter.post(
  "/:id/comments",
  validateBody(CreateCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const comment = await addComment({
        ticketId: req.params.id,
        authorId: user.id,
        body: req.body.body,
        role: user.role,
      });
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);
