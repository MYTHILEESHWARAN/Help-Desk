import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth";

export const usersRouter = Router();

/**
 * GET /api/users
 * Technician only. Accepts optional query param ?role=technician.
 * Returns a list of users (id, username, full_name, email, role).
 */
usersRouter.get(
  "/",
  requireRole("technician"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roleFilter = req.query.role as string | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};
      if (roleFilter === "technician" || roleFilter === "employee") {
        where.role = roleFilter;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          full_name: true,
          email: true,
          role: true,
          created_at: true,
        },
        orderBy: { full_name: "asc" },
      });

      res.json(users);
    } catch (err) {
      next(err);
    }
  }
);
