import { Router, Request, Response, NextFunction } from "express";
import { requireRole } from "../middleware/auth";
import { getDashboardData } from "../services/dashboard";

export const dashboardRouter = Router();

/**
 * GET /api/dashboard
 * Technician only. Returns all metrics with their SQL strings.
 */
dashboardRouter.get(
  "/",
  requireRole("technician"),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getDashboardData();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);
