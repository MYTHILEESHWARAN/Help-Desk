import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { AiTriageInputSchema, NlQuerySchema } from "../lib/schemas";
import { triageTicket } from "../ai/triage";
import { findSimilarTickets } from "../ai/similar";
import { recommendAssignees } from "../ai/recommend";
import { runNlQuery } from "../ai/nlQuery";
import { z } from "zod";

export const aiRouter = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 20,
  message: { message: "Too many AI requests. Please wait a minute." },
  standardHeaders: true, legacyHeaders: false,
});

aiRouter.use(aiLimiter);

// POST /api/ai/triage
aiRouter.post(
  "/triage",
  validateBody(AiTriageInputSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await triageTicket(req.body.title, req.body.description);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// POST /api/ai/similar
aiRouter.post(
  "/similar",
  validateBody(AiTriageInputSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const tickets = await findSimilarTickets(req.body.title, req.body.description, user.id, user.role);
      res.json(tickets);
    } catch (err) { next(err); }
  }
);

// GET /api/ai/recommend-assignee/:ticketId
aiRouter.get(
  "/recommend-assignee/:ticketId",
  requireRole("technician"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await recommendAssignees(req.params.ticketId);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// POST /api/ai/ask
aiRouter.post(
  "/ask",
  requireRole("technician"),
  validateBody(NlQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await runNlQuery(req.body.question);
      if ("error" in result && !("answer" in result)) {
        res.status(400).json({ message: result.error, sql: result.sql });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }
);
