import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { PriorityBadge, StatusBadge, SlaBadge } from "../components/ui/Badge";
import { TicketRowSkeleton } from "../components/ui/Skeleton";
import { formatRelative } from "../lib/utils";
import type { Ticket, PaginatedTickets, Status } from "../types";

const STATUS_FILTERS: { value: Status | ""; label: string }[] = [
  { value: "",            label: "All" },
  { value: "open",        label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved" },
  { value: "closed",      label: "Closed" },
];

export function MyTicketsPage() {
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.tickets.list({ status: statusFilter, page }),
    queryFn: () =>
      ticketsApi.list({
        status: statusFilter || undefined,
        page,
        pageSize: 20,
      }) as Promise<PaginatedTickets>,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">My Tickets</h1>
        <Link
          to="/tickets/new"
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          + New ticket
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b" role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={statusFilter === f.value}
            onClick={() => { setStatusFilter(f.value as Status | ""); setPage(1); }}
            className={`px-4 py-2 text-sm border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
              statusFilter === f.value
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="rounded-lg border overflow-hidden">
        {isLoading && (
          <div aria-busy="true" aria-label="Loading tickets">
            {Array.from({ length: 5 }).map((_, i) => <TicketRowSkeleton key={i} />)}
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-muted-foreground" role="alert">
            Failed to load tickets. Please refresh.
          </div>
        )}

        {!isLoading && !isError && data?.data.length === 0 && (
          <div className="p-8 text-center" role="status">
            <p className="text-muted-foreground text-sm">
              {statusFilter
                ? `No ${statusFilter} tickets.`
                : "No tickets yet. Submit your first one!"}
            </p>
          </div>
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Assigned to</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((ticket: Ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {((page - 1) * data.pageSize) + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-md border hover:bg-accent disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * data.pageSize >= data.total}
              className="px-3 py-1.5 rounded-md border hover:bg-accent disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const isUrgent = ticket.priority === "urgent" && ticket.status === "open";

  return (
    <tr
      className={`hover:bg-muted/30 transition-colors ${
        isUrgent ? "bg-red-50/50 dark:bg-red-950/10" : ""
      }`}
    >
      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
        {ticket.id.slice(0, 6)}
      </td>
      <td className="px-4 py-3">
        <Link
          to={`/tickets/${ticket.id}`}
          className="font-medium hover:text-primary focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {isUrgent && (
            <span className="mr-1.5 text-red-600" aria-label="Urgent">🔴</span>
          )}
          {ticket.title}
        </Link>
        <div className="mt-0.5 flex gap-2 sm:hidden">
          <PriorityBadge priority={ticket.priority} />
          <SlaBadge label={ticket.sla.label} percent={ticket.sla.percent} />
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} />
          <SlaBadge label={ticket.sla.label} percent={ticket.sla.percent} />
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={ticket.status} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">
        {ticket.assigned_to?.full_name ?? (
          <span className="italic">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
        {formatRelative(ticket.created_at)}
      </td>
    </tr>
  );
}
