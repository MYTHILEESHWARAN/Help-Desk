import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import {
  PriorityBadge,
  StatusBadge,
  CategoryBadge,
  SlaBadge,
} from "../components/ui/Badge";
import { CardSkeleton } from "../components/ui/Skeleton";
import { formatDate, formatRelative } from "../lib/utils";
import type { Ticket } from "../types";
import { useAuth } from "../hooks/useAuth";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const justCreated = location.state?.justCreated as boolean | undefined;

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: queryKeys.tickets.detail(id!),
    queryFn: () => ticketsApi.get(id!) as Promise<Ticket>,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border p-8 text-center" role="alert">
          <p className="text-muted-foreground">
            Ticket not found or you don't have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success banner on create */}
      {justCreated && (
        <div
          className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-300"
          role="status"
        >
          ✅ Your ticket has been submitted. Reference: <strong className="font-mono">{ticket.id.slice(0, 8).toUpperCase()}</strong>
        </div>
      )}

      {/* Header */}
      <div className="rounded-lg border p-6 space-y-4 bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-mono">
              #{ticket.id.slice(0, 8).toUpperCase()}
            </p>
            <h1 className="text-xl font-bold break-words">{ticket.title}</h1>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
          <CategoryBadge category={ticket.category} />
          <SlaBadge label={ticket.sla.label} percent={ticket.sla.percent} />
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs">Reported by</dt>
            <dd className="font-medium">{ticket.reported_by.full_name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Assigned to</dt>
            <dd className="font-medium">
              {ticket.assigned_to?.full_name ?? (
                <span className="text-muted-foreground italic">Unassigned</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Created</dt>
            <dd>{formatDate(ticket.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Last updated</dt>
            <dd>{formatRelative(ticket.updated_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">SLA target</dt>
            <dd>{ticket.sla.target_hours}h ({Math.round(ticket.sla.percent)}% elapsed)</dd>
          </div>
        </dl>

        {/* Description */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Description</p>
          {/* Plain text — never rendered as HTML */}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {ticket.description}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border p-6 space-y-4 bg-card shadow-sm">
        <h2 className="text-base font-semibold">Timeline</h2>
        <ol className="space-y-3" aria-label="Ticket history">
          {ticket.history.map((entry) => (
            <li key={entry.id} className="flex gap-3 text-sm">
              <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs" aria-hidden="true">
                {entry.event_type === "created"      ? "📝"
                 : entry.event_type === "assignment" ? "👤"
                 : "🔄"}
              </div>
              <div className="flex-1 min-w-0">
                <p>
                  <span className="font-medium">{entry.changed_by.full_name}</span>{" "}
                  {entry.event_type === "created" && "opened this ticket"}
                  {entry.event_type === "assignment" && (
                    <>assigned {entry.note === "Unassigned" ? "nobody" : "a technician"}</>
                  )}
                  {entry.event_type === "status_change" && (
                    <>moved from <StatusBadge status={entry.from_status!} /> to <StatusBadge status={entry.to_status} /></>
                  )}
                </p>
                {entry.note && (
                  <p className="text-xs text-muted-foreground mt-0.5 italic">"{entry.note}"</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(entry.changed_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Comments */}
      {ticket.comments.length > 0 && (
        <div className="rounded-lg border p-6 space-y-4 bg-card shadow-sm">
          <h2 className="text-base font-semibold">Comments</h2>
          <ul className="space-y-4">
            {ticket.comments.map((c) => (
              <li key={c.id} className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{c.author.full_name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
