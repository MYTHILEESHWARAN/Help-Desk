import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const isDev = import.meta.env.DEV;

const DEMO_ACCOUNTS = [
  { username: "arjun.mehta", role: "Technician", note: "Full access" },
  { username: "kavya.reddy", role: "Technician", note: "Full access" },
  { username: "priya.nair", role: "Employee", note: "Own tickets only" },
  { username: "rahul.verma", role: "Employee", note: "Own tickets only" },
  { username: "sneha.iyer", role: "Employee", note: "Own tickets only" },
];

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refetch } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      await refetch();
      navigate("/tickets", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not connect to the server. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">HelpDesk 360</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            IT support made simple
          </p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-lg border p-6 space-y-4 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Sign in</h2>

          {error && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="e.g. priya.nair"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Demo accounts panel — dev mode only */}
        {isDev && (
          <div className="bg-muted/50 rounded-lg border border-dashed p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Demo accounts (dev mode)
            </p>
            <p className="text-xs text-muted-foreground">
              Password for all accounts: set via <code>SEED_PASSWORD</code> env (default: <code>Demo1234!</code>)
            </p>
            <div className="space-y-1">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => setUsername(a.username)}
                  className="w-full text-left rounded px-2 py-1.5 text-xs hover:bg-accent flex items-center justify-between gap-2"
                >
                  <span className="font-mono">{a.username}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      a.role === "Technician"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    }`}
                  >
                    {a.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
