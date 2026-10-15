/**
 * Centralised TanStack Query key factory.
 * Using an object factory pattern keeps invalidation predictable.
 */
export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  tickets: {
    all: () => ["tickets"] as const,
    list: (params: Record<string, unknown>) => ["tickets", "list", params] as const,
    detail: (id: string) => ["tickets", "detail", id] as const,
  },
  users: {
    technicians: () => ["users", "technicians"] as const,
  },
  dashboard: {
    all: () => ["dashboard"] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
  },
};
