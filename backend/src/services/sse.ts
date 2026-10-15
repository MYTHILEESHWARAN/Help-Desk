/**
 * Server-Sent Events service.
 * Holds a map of connected clients and fans out ticket events.
 * Full implementation in Phase 4.
 */
import { Response } from "express";

interface SseClient {
  userId: string;
  role: string;
  res: Response;
}

const clients = new Map<string, SseClient>();

/** Register a new SSE client connection */
export function addSseClient(connectionId: string, client: SseClient) {
  clients.set(connectionId, client);
}

/** Remove a disconnected SSE client */
export function removeSseClient(connectionId: string) {
  clients.delete(connectionId);
}

/** Emit a ticket event to all relevant connected clients */
export function emitTicketEvent(
  eventType: "ticket_created" | "ticket_updated" | "ticket_assigned",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
) {
  const data = JSON.stringify(payload);

  for (const client of clients.values()) {
    try {
      // Technicians see all events; employees only see events for their own tickets
      const isOwner =
        payload.reported_by?.id === client.userId;
      const canSee = client.role === "technician" || isOwner;

      if (canSee) {
        client.res.write(`event: ${eventType}\n`);
        client.res.write(`data: ${data}\n\n`);
        // Flush if available (needed for some Node HTTP implementations)
        if (typeof (client.res as any).flush === "function") {
          (client.res as any).flush();
        }
      }
    } catch {
      // Client disconnected — will be cleaned up on 'close' event
    }
  }
}
