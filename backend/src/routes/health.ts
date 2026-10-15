import { Router } from "express";

export const healthRouter = Router();

/**
 * GET /api/health
 * Public endpoint — no auth required.
 * Used by Docker healthcheck and frontend to detect backend availability.
 */
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
