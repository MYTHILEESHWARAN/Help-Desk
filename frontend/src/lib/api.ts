/**
 * Centralised API client.
 * All requests go through `apiFetch` which:
 * - Includes credentials (for the httpOnly JWT cookie)
 * - Parses JSON responses
 * - Throws typed errors with status codes
 */

const BASE = ""; // Vite proxy rewrites /api → backend

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // No-content responses
  if (res.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, "Invalid response from server");
  }

  if (!res.ok) {
    const msg =
      (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }

  return body as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),

  me: () => apiFetch("/api/auth/me"),
};

// ── Health ─────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => apiFetch<{ status: string; timestamp: string }>("/api/health"),
};

// ── Tickets ────────────────────────────────────────────────────────────────────
export interface CreateTicketInput {
  title: string;
  description: string;
  category: string;
  priority: string;
  idempotencyKey?: string;
}

export interface TicketListParams {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  q?: string;
  sort?: string;
  order?: string;
  page?: number;
  pageSize?: number;
}

export const ticketsApi = {
  create: ({ idempotencyKey, ...body }: CreateTicketInput) =>
    apiFetch("/api/tickets", {
      method: "POST",
      body: JSON.stringify(body),
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    }),

  list: (params: TicketListParams = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return apiFetch(`/api/tickets?${q.toString()}`);
  },

  get: (id: string) => apiFetch(`/api/tickets/${id}`),

  changeStatus: (id: string, status: string, note?: string) =>
    apiFetch(`/api/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    }),

  assign: (id: string, assigned_to: string | null) =>
    apiFetch(`/api/tickets/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assigned_to }),
    }),

  addComment: (id: string, body: string) =>
    apiFetch(`/api/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const usersApi = {
  listTechnicians: () => apiFetch("/api/users?role=technician"),
};

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => apiFetch("/api/dashboard"),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => apiFetch("/api/notifications"),
  markRead: (id: string) => apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
};
