import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";

type SSEEventType = "ticket_created" | "ticket_updated" | "ticket_assigned";

/**
 * Opens an SSE connection to /api/events and invalidates the appropriate
 * TanStack Query cache keys when events arrive.
 *
 * Only one connection is opened per mount (ref-guarded to avoid double-connect
 * in React StrictMode).
 */
export function useSSE() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Don't open a second connection if one is already open
    if (esRef.current) return;

    const es = new EventSource("/api/events", { withCredentials: true });
    esRef.current = es;

    const handleEvent = (_event: MessageEvent, type: SSEEventType) => {
      // Invalidate the ticket list and any open detail queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all() });

      if (type === "ticket_created") {
        // Also invalidate dashboard counts
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      }
    };

    es.addEventListener("ticket_created",  (e) => handleEvent(e, "ticket_created"));
    es.addEventListener("ticket_updated",  (e) => handleEvent(e, "ticket_updated"));
    es.addEventListener("ticket_assigned", (e) => handleEvent(e, "ticket_assigned"));

    es.onerror = () => {
      // EventSource reconnects automatically — no action needed
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [queryClient]);
}
