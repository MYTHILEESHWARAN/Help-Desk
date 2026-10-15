import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatRelative } from "../lib/utils";
import type { Notification } from "../types";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: () => notificationsApi.list() as Promise<Notification[]>,
    refetchInterval: 30_000,
  });

  const unread = notes.filter((n: Notification) => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications — ${unread} unread`}
        className="relative p-2 rounded-md hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true">??</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-card border rounded-lg shadow-lg z-50 overflow-hidden" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">?</button>
          </div>
          {notes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No notifications yet.</p>
          ) : (
            <ul className="divide-y max-h-80 overflow-y-auto">
              {notes.slice(0, 10).map((n: Notification) => (
                <li key={n.id} className={`px-4 py-3 text-sm ${n.read ? "opacity-60" : "bg-blue-50/50 dark:bg-blue-950/10"}`}>
                  <p className="leading-snug">{n.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
                    {!n.read && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
