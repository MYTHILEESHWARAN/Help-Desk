import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { dashboardApi } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { CardSkeleton } from "../components/ui/Skeleton";

interface ChartRow    { label: string; count: number }
interface TechRow     { id: string; full_name: string; username: string; total_assigned: number; open_load: number }
interface MetricEntry { value: number | null; sql: string }
interface ChartBlock  { data: ChartRow[]; sql: string }
interface TechBlock   { data: TechRow[];  sql: string }

interface DashboardData {
  metrics: {
    open: MetricEntry; urgentOpen: MetricEntry; unassigned: MetricEntry;
    inProgress: MetricEntry; completed: MetricEntry; avgResolutionHours: MetricEntry;
  };
  byStatus: ChartBlock; byPriority: ChartBlock; byCategory: ChartBlock; byTechnician: TechBlock;
}

const STATUS_CLR: Record<string, string> = { open:"#3b82f6","in-progress":"#8b5cf6",resolved:"#22c55e",closed:"#6b7280" };
const PRI_CLR:    Record<string, string> = { urgent:"#ef4444",high:"#f97316",medium:"#eab308",low:"#22c55e" };
const CAT_CLR = ["#6366f1","#0ea5e9","#f59e0b","#10b981"];

function QueryToggle({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="text-xs text-muted-foreground hover:text-foreground underline focus-visible:ring-2 focus-visible:ring-ring">
        {open ? "Hide query ?" : "Show query ?"}
      </button>
      {open && <pre className="mt-2 p-3 rounded-md bg-muted text-xs overflow-x-auto whitespace-pre-wrap font-mono border">{sql}</pre>}
    </div>
  );
}

function MetricCard({ title, value, accent, sql }: { title: string; value: string | number; accent?: string; sql: string }) {
  return (
    <div className={`bg-card rounded-lg border p-4 space-y-1 shadow-sm ${accent ?? ""}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      <QueryToggle sql={sql} />
    </div>
  );
}

function EmptyChart() {
  return <p className="text-sm text-muted-foreground py-10 text-center">No data yet.</p>;
}

function NLQueryBox() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ answer: unknown; sql: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/ai/ask", { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ question: q }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "AI query failed");
      if (body.aiUnavailable) { setError("AI suggestions unavailable — ANTHROPIC_API_KEY not configured."); return; }
      setResult(body);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-card rounded-lg border p-5 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold">Ask a question about your data</h2>
      <form onSubmit={handleAsk} className="flex gap-2">
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="e.g. How many urgent tickets were opened this week?"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Natural-language dashboard question" />
        <button type="submit" disabled={loading || !q.trim()}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring">
          {loading ? "…" : "Ask"}
        </button>
      </form>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {result && (
        <div className="space-y-2">
          <pre className="p-3 rounded-md bg-muted text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(result.answer, null, 2)}</pre>
          <QueryToggle sql={result.sql} />
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.dashboard.all(),
    queryFn: () => dashboardApi.get() as Promise<DashboardData>,
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );

  if (isError || !data) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="rounded-lg border p-8 text-center text-muted-foreground" role="alert">Failed to load dashboard data. Please refresh.</div>
    </div>
  );

  const { metrics, byStatus, byPriority, byCategory, byTechnician } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard title="Open"        value={metrics.open.value ?? 0}        sql={metrics.open.sql}        accent="border-l-4 border-l-blue-500" />
        <MetricCard title="Urgent open" value={metrics.urgentOpen.value ?? 0}  sql={metrics.urgentOpen.sql}  accent="border-l-4 border-l-red-500" />
        <MetricCard title="Unassigned"  value={metrics.unassigned.value ?? 0}  sql={metrics.unassigned.sql}  accent="border-l-4 border-l-yellow-500" />
        <MetricCard title="In progress" value={metrics.inProgress.value ?? 0}  sql={metrics.inProgress.sql}  accent="border-l-4 border-l-purple-500" />
        <MetricCard title="Completed"   value={metrics.completed.value ?? 0}   sql={metrics.completed.sql}   accent="border-l-4 border-l-green-500" />
        <MetricCard title="Avg resolve" value={metrics.avgResolutionHours.value != null ? `${metrics.avgResolutionHours.value}h` : "—"} sql={metrics.avgResolutionHours.sql} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-card rounded-lg border p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold">By status</h2>
          {byStatus.data.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={byStatus.data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={({ label }) => label}>
                {byStatus.data.map((e, i) => <Cell key={i} fill={STATUS_CLR[e.label] ?? "#94a3b8"} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          )}
          <QueryToggle sql={byStatus.sql} />
        </div>

        <div className="bg-card rounded-lg border p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold">By priority</h2>
          {byPriority.data.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byPriority.data} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <XAxis dataKey="label" tick={{ fontSize:11 }} /><YAxis allowDecimals={false} tick={{ fontSize:11 }} /><Tooltip />
                <Bar dataKey="count" radius={[4,4,0,0]}>{byPriority.data.map((e, i) => <Cell key={i} fill={PRI_CLR[e.label] ?? "#94a3b8"} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <QueryToggle sql={byPriority.sql} />
        </div>

        <div className="bg-card rounded-lg border p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold">By category</h2>
          {byCategory.data.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={byCategory.data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70}>
                {byCategory.data.map((_, i) => <Cell key={i} fill={CAT_CLR[i % CAT_CLR.length]} />)}
              </Pie><Tooltip /><Legend iconSize={10} wrapperStyle={{ fontSize:11 }} /></PieChart>
            </ResponsiveContainer>
          )}
          <QueryToggle sql={byCategory.sql} />
        </div>
      </div>

      <div className="bg-card rounded-lg border p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Technician workload</h2>
        {byTechnician.data.length === 0 ? <p className="text-sm text-muted-foreground">No technicians yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Technician</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Open</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground w-40">Load</th>
              </tr></thead>
              <tbody className="divide-y">
                {byTechnician.data.map((t) => {
                  const max = Math.max(...byTechnician.data.map(x => x.open_load), 1);
                  const pct = Math.round((t.open_load / max) * 100);
                  return (
                    <tr key={t.id}>
                      <td className="py-2 px-3 font-medium">{t.full_name}</td>
                      <td className="py-2 px-3 text-right">{t.open_load}</td>
                      <td className="py-2 px-3 text-right">{t.total_assigned}</td>
                      <td className="py-2 px-3">
                        <div className="h-2 w-36 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <QueryToggle sql={byTechnician.sql} />
      </div>

      <NLQueryBox />
    </div>
  );
}
