import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ticketsApi, usersApi } from "../lib/api";
import { ApiError } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import {
  PriorityBadge,
  StatusBadge,
  CategoryBadge,
  SlaBadge,
} from "../components/ui/Badge";
import { TicketRowSkeleton } from "../components/ui/Skeleton";
import { formatRelative } from "../lib/utils";
import type { Ticket, PaginatedTickets, Status, Priority, Category, User } from "../types";
import { useAuth } from "../hooks/useAuth";

// Legal next states per current status
const NEXT_STATES: Record<Status, Status[]> = {
  "open":        ["in-progress"],
  "in-progress": ["resolved"],
  "resolved":    ["closed", "in-progress"],
  "closed":      [],
};

const STATUS_LABEL: Record<Status, string> = {
  "open":        "Open",
  "in-progress": "In Progress",
  "resolved":    "Resolved",
  "closed":      "Closed",
};

export function QueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter state
  const [statusFilter,   setStatusFilter]   = useState<Status | "">("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sort,   setSort]   = useState<"priority" | "created_at" | "updated_at">("priority");
  const [order,  setOrder]  = useState<"asc" | "desc">("asc");
  const [page,   setPage]   = useState(1);

  // Technicians list for assign dropdown
  const { data: technicians = [] } = useQuery({
    queryKey: queryKeys.users.technicians(),
    queryFn: () => usersApi.listTechnicians() as Promise<User[]>,
    staleTime: 5 * 60 * 1000,
  });

  // Ticket list
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.tickets.list({ statusFilter, priorityFilter, categoryFilter, assigneeFilter, search, sort, order, page }),
    queryFn: () =>
      ticketsApi.list({
        status:      statusFilter  || undefined,
        priority:    priorityFilter || undefined,
        category:    categoryFilter || undefined,
        assigned_to: assigneeFilter || undefined,
        q:           search        || undefined,
        sort,
        order,
        page,
        pageSize: 25,
      }) as Promise<PaginatedTickets>,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ticketsApi.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all() });
      toast.success("Status updated");
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Failed to update status");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
      ticketsApi.assign(id, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all() });
      toast.success("Ticket assigned");
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Failed to assign ticket");
    },
  });

  const resetFilters = useCallback(() => {
    setStatusFilter("");
    setPriorityFilter("");
    setCategoryFilter("");
    setAssigneeFilter("");
    setSearch("");
    setPage(1);
  }, []);

  const hasFilters = statusFilter || priorityFilter || categoryFilter || assigneeFilter || search;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Support Queue</h1>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} ticket{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* Search */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <label htmlFor="queue-search" className="sr-only">Search tickets</label>
            <input
              id="queue-search"
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search title or description…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Status filter */}
          <div>
            <label htmlFor="status-filter" className="sr-only">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as Status | ""); setPage(1); }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label htmlFor="priority-filter" className="sr-only">Priority</label>
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value as Priority | ""); setPage(1); }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          {/* Assignee filter */}
          <div>
            <label htmlFor="assignee-filter" className="sr-only">Assigned to</label>
            <select
              id="assignee-filter"
              value={assigneeFilter}
              onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort + clear row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sort-select" className="text-muted-foreground shrink-0">Sort by</label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="priority">Priority</option>
              <option value="created_at">Created</option>
              <option value="updated_at">Updated</option>
            </select>
            <button
              onClick={() => setOrder(o => o === "asc" ? "desc" : "asc")}
              className="px-2 py-1 rounded border hover:bg-accent text-xs focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Sort ${order === "asc" ? "descending" : "ascending"}`}
            >
              {order === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Ticket table */}
      <div className="rounded-lg border overflow-hidden">
        {isLoading && (
          <div aria-busy="true" aria-label="Loading tickets">
            {Array.from({ length: 6 }).map((_, i) => <TicketRowSkeleton key={i} />)}
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
              {hasFilters ? "No tickets match the current filters." : "No tickets in the queue."}
            </p>
          </div>
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36">Assign</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-40">Actions</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.map((ticket: Ticket) => (
                  <QueueRow
                    key={ticket.id}
                    ticket={ticket}
                    technicians={technicians}
                    currentUserId={user?.id ?? ""}
                    onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                    onAssign={(id, assigneeId) => assignMutation.mutate({ id, assigneeId })}
                    isPending={statusMutation.isPending || assignMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
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

// ── Queue Row ─────────────────────────────────────────────────────────────────

interface QueueRowProps {
  ticket: Ticket;
  technicians: User[];
  currentUserId: string;
  onStatusChange: (id: string, status: string) => void;
  onAssign: (id: string, assigneeId: string | null) => void;
  isPending: boolean;
}

function QueueRow({ ticket, technicians, onStatusChange, onAssign, isPending }: QueueRowProps) {
  const isUrgent = ticket.priority === "urgent" && (ticket.status === "open" || ticket.status === "in-progress");
  const nextStates = NEXT_STATES[ticket.status];

  return (
    <tr
      className={`hover:bg-muted/30 transition-colors ${
        isUrgent ? "bg-red-50/50 dark:bg-red-950/10" : ""
      }`}
    >
      {/* ID */}
      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
        {ticket.id.slice(0, 6)}
      </td>

      {/* Title + category + SLA */}
      <td className="px-4 py-3">
        <Link
          to={`/tickets/${ticket.id}`}
          className="font-medium hover:text-primary focus-visible:ring-2 focus-visible:ring-ring rounded block"
        >
          {isUrgent && <span className="mr-1 text-red-600" aria-label="Urgent">🔴</span>}
          {ticket.title}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <CategoryBadge category={ticket.category} />
          <SlaBadge label={ticket.sla.label} percent={ticket.sla.percent} />
        </div>
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <PriorityBadge priority={ticket.priority} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={ticket.status} />
      </td>

      {/* Assign dropdown */}
      <td className="px-4 py-3">
        <label htmlFor={`assign-${ticket.id}`} className="sr-only">
          Assign ticket {ticket.id.slice(0, 6)}
        </label>
        <select
          id={`assign-${ticket.id}`}
          value={ticket.assigned_to?.id ?? ""}
          onChange={(e) => onAssign(ticket.id, e.target.value || null)}
          disabled={isPending}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Unassigned</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>
      </td>

      {/* Status action buttons — only legal next states */}
      <td className="px-4 py-3">
        <div className="flex gap-1 flex-wrap">
          {nextStates.length === 0 && (
            <span className="text-xs text-muted-foreground italic">No actions</span>
          )}
          {nextStates.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(ticket.id, s)}
              disabled={isPending}
              className="px-2 py-1 rounded text-xs border hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition-colors"
              title={`Move to ${STATUS_LABEL[s]}`}
            >
              → {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </td>

      {/* Age */}
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {formatRelative(ticket.created_at)}
      </td>
    </tr>
  );
}
