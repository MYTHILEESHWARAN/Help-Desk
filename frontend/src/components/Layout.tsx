import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useSSE } from "../hooks/useSSE";
import toast from "react-hot-toast";

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Open SSE connection for live updates
  useSSE();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="font-bold text-lg tracking-tight shrink-0">
            🎫 HelpDesk 360
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 text-sm" aria-label="Main navigation">
            {user?.role === "employee" && (
              <>
                <NavLink to="/tickets/new">New Ticket</NavLink>
                <NavLink to="/tickets">My Tickets</NavLink>
              </>
            )}
            {user?.role === "technician" && (
              <>
                <NavLink to="/tickets">Queue</NavLink>
                <NavLink to="/dashboard">Dashboard</NavLink>
              </>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* User info + logout */}
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.full_name}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      user.role === "technician"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm rounded-md hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-md text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    >
      {children}
    </Link>
  );
}
