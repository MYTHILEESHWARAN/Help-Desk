import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const notificationsRouter = Router();

// GET /api/notifications — own notifications, unread first, max 50
notificationsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const notes = await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: [{ read: "asc" }, { created_at: "desc" }],
        take: 50,
      });
      res.json(notes.map(n => ({
        id: n.id,
        ticket_id: n.ticket_id,
        message: n.message,
        read: n.read,
        created_at: n.created_at.toISOString(),
      })));
    } catch (err) { next(err); }
  }
);

// PATCH /api/notifications/:id/read — mark one as read
notificationsRouter.patch(
  "/:id/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const note = await prisma.notification.findUnique({ where: { id: req.params.id } });
      if (!note || note.user_id !== userId) {
        res.status(404).json({ message: "Notification not found" });
        return;
      }
      await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);
