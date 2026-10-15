import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { BackendDownPage } from "./pages/BackendDownPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { NewTicketPage } from "./pages/NewTicketPage";
import { MyTicketsPage } from "./pages/MyTicketsPage";
import { QueuePage } from "./pages/QueuePage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { DashboardPage } from "./pages/DashboardPage";

function RoleGate({ employee, technician }: { employee: React.ReactNode; technician: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === "technician" ? <>{technician}</> : <>{employee}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/error" element={<BackendDownPage />} />
          <Route path="/403" element={<ForbiddenPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/tickets" replace />} />
              <Route path="/tickets" element={<RoleGate employee={<MyTicketsPage />} technician={<QueuePage />} />} />
              <Route path="/tickets/new" element={<NewTicketPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/dashboard" element={
                <ProtectedRouteInline requiredRole="technician">
                  <DashboardPage />
                </ProtectedRouteInline>
              } />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ProtectedRouteInline({ requiredRole, children }: { requiredRole: string; children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== requiredRole) return <ForbiddenPage />;
  return <>{children}</>;
}
