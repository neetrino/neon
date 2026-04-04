"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  NEON_USAGE_METRIC_LABELS,
  NEON_USAGE_METRICS,
  type NeonUsageMetricName,
} from "@/lib/constants/neon-metrics";
import { buildRechartsRows } from "@/components/dashboard/chart-data";
import { CHART_STROKES } from "@/components/dashboard/chart-colors";
import { rangeLastDays } from "@/components/dashboard/date-presets";
import {
  formatAbbrev,
  KpiCard,
  SyncPanel,
} from "@/components/dashboard/DashboardWidgets";
import { ProjectTable } from "@/components/dashboard/ProjectTable";
import type {
  ProjectRow,
  SeriesPoint,
  SyncRunRow,
  UsageSeriesResponse,
} from "@/components/dashboard/types";

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
] as const;

async function readJson<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function UsageDashboard() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>(PRESETS[1]);
  const [range, setRange] = useState(() => rangeLastDays(30));
  const [metric, setMetric] = useState<NeonUsageMetricName>("compute_unit_seconds");
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [points, setPoints] = useState<SeriesPoint[]>([]);
  const [runs, setRuns] = useState<SyncRunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const projectNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of projects) {
      m[p.neonProjectId] = p.name;
    }
    return m;
  }, [projects]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pr, st] = await Promise.all([
        readJson<{ projects: ProjectRow[] }>(await fetch("/api/usage/projects")),
        readJson<{ runs: SyncRunRow[] }>(await fetch("/api/usage/sync-status")),
      ]);
      setProjects(pr.projects);
      setRuns(st.runs);

      const qs = new URLSearchParams({
        from: range.from,
        to: range.to,
        metric,
        groupBy,
      });
      if (projectId) {
        qs.set("projectId", projectId);
      }
      const se = await readJson<UsageSeriesResponse>(
        await fetch(`/api/usage/series?${qs.toString()}`),
      );
      setPoints(se.points);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [groupBy, metric, projectId, range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPreset = (days: number) => {
    const p = PRESETS.find((x) => x.days === days) ?? PRESETS[1];
    setPreset(p);
    setRange(rangeLastDays(days));
  };

  const { rows, projectIds } = useMemo(() => buildRechartsRows(points), [points]);

  const totalForPeriod = useMemo(() => {
    let t = 0;
    for (const p of points) {
      for (const v of Object.values(p.byProject)) {
        t += v;
      }
    }
    return t;
  }, [points]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-zinc-500">
            Neon · consumption analytics
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="text-gradient">Usage</span>{" "}
            <span className="text-zinc-100">by project</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Daily snapshots from Neon&apos;s consumption API, stored in Postgres. Cron syncs
            yesterday once per day on Vercel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="self-start rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-100"
        >
          Sign out
        </button>
      </header>

      <SyncPanel runs={runs} />

      {error ? (
        <div
          className="glass-card border-red-500/20 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total (selected metric)" value={formatAbbrev(totalForPeriod)} />
        <KpiCard label="Projects (in chart)" value={String(projectIds.length)} />
        <KpiCard label="Range" value={`${range.from} → ${range.to}`} />
        <KpiCard label="Granularity" value={groupBy === "day" ? "Daily" : "Monthly"} />
      </section>

      <section className="glass-card flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onPreset(p.days)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  preset.days === p.days
                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-500/40"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="whitespace-nowrap">Metric</span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as NeonUsageMetricName)}
              className="rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-100"
            >
              {NEON_USAGE_METRICS.map((m) => (
                <option key={m} value={m}>
                  {NEON_USAGE_METRIC_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <span>Group</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "day" | "month")}
              className="rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-100"
            >
              <option value="day">By day</option>
              <option value="month">By month</option>
            </select>
          </label>
          <label className="flex min-w-[12rem] items-center gap-2 text-sm text-zinc-400">
            <span>Project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-100"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.neonProjectId} value={p.neonProjectId}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-500/20"
          >
            Refresh
          </button>
        </div>

        <div className="h-[380px] w-full pt-2">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading chart…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No snapshots in this range. Run a cron sync or check your Neon plan (consumption
              API requires a supported billing plan).
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatAbbrev(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(14,14,20,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: "#e4e4e7" }}
                />
                <Legend />
                {projectIds.map((id, i) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={projectNames[id] ?? id}
                    stroke={CHART_STROKES[i % CHART_STROKES.length]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <ProjectTable projects={projects} />
    </div>
  );
}
