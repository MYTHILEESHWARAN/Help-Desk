import React, {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../lib/api";
import { User } from "../types";
import { queryKeys } from "../lib/queryKeys";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => apiFetch<User>("/api/auth/me"),
    // Don't throw on 401 — it just means not logged in
    retry: (_, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return false;
    },
  });

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        refetch,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
