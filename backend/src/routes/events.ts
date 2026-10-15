import { Router, Request, Response } from "express";
import { addSseClient, removeSseClient } from "../services/sse";
import { requireAuth } from "../middleware/auth";

export const eventsRouter = Router();

let connectionCounter = 0;

/**
 * GET /api/events
 * SSE endpoint. Pushes ticket_created, ticket_updated, ticket_assigned events.
 * Employees only receive events for their own tickets.
 * Technicians receive all events.
 */
eventsRouter.get(
  "/",
  requireAuth,
  (req: Request, res: Response) => {
    const user = req.user!;
    const connectionId = `${user.id}-${++connectionCounter}`;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
    res.flushHeaders();

    // Send a comment to establish the connection and confirm it's working
    res.write(": connected\n\n");

    // Register this client
    addSseClient(connectionId, { userId: user.id, role: user.role, res });

    // Send a heartbeat every 25 seconds to keep the connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(": heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 25_000);

    // Clean up when the client disconnects
    req.on("close", () => {
      clearInterval(heartbeat);
      removeSseClient(connectionId);
    });
  }
);
