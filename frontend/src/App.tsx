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

// Renders different content based on the authenticated user's role
function RoleGate({
  employee,
  technician,
}: {
  employee: React.ReactNode;
  technician: React.ReactNode;
}) {
  const { user } = useAuth();
  return user?.role === "technician" ? <>{technician}</> : <>{employee}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/error" element={<BackendDownPage />} />
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Protected — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/tickets" replace />} />

              {/* Ticket routes — employee sees MyTickets, technician sees Queue */}
              <Route
                path="/tickets"
                element={<RoleGate employee={<MyTicketsPage />} technician={<QueuePage />} />}
              />
              <Route path="/tickets/new" element={<NewTicketPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />

              {/* Dashboard — technician only (added in Phase 4) */}
              <Route
                path="/dashboard"
                element={
                  <div className="text-center text-muted-foreground p-8">
                    Dashboard coming in Phase 4
                  </div>
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
