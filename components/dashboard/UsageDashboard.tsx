"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import { buildRechartsRows } from "@/components/dashboard/chart-data";
import { rangeLastDays } from "@/components/dashboard/date-presets";
import {
  formatAbbrev,
  KpiCard,
  SyncPanel,
} from "@/components/dashboard/DashboardWidgets";
import {
  buildCompareBarData,
  ProjectCompareBars,
} from "@/components/dashboard/ProjectCompareBars";
import { ProjectTable } from "@/components/dashboard/ProjectTable";
import { UsageLineChartPanel } from "@/components/dashboard/UsageLineChartPanel";
import type {
  ProjectRow,
  ProjectTotalsResponse,
  ProjectUsageAggregate,
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
  const [totalsPayload, setTotalsPayload] = useState<ProjectTotalsResponse | null>(null);
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

  const usageByProjectId = useMemo(() => {
    if (totalsPayload === null) {
      return null;
    }
    const m = new Map<string, ProjectUsageAggregate>();
    for (const p of totalsPayload.projects) {
      m.set(p.neonProjectId, p);
    }
    return m;
  }, [totalsPayload]);

  const compareBarData = useMemo(() => {
    if (!totalsPayload) {
      return [];
    }
    const projs = projectId
      ? totalsPayload.projects.filter((p) => p.neonProjectId === projectId)
      : totalsPayload.projects;
    return buildCompareBarData(projs);
  }, [totalsPayload, projectId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const totalsUrl = `/api/usage/project-totals?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
      const qs = new URLSearchParams({
        from: range.from,
        to: range.to,
        metric,
        groupBy,
      });
      if (projectId) {
        qs.set("projectId", projectId);
      }
      const seriesUrl = `/api/usage/series?${qs.toString()}`;

      const [pr, st, pt, se] = await Promise.all([
        readJson<{ projects: ProjectRow[] }>(await fetch("/api/usage/projects")),
        readJson<{ runs: SyncRunRow[] }>(await fetch("/api/usage/sync-status")),
        readJson<ProjectTotalsResponse>(await fetch(totalsUrl)),
        readJson<UsageSeriesResponse>(await fetch(seriesUrl)),
      ]);

      setProjects(pr.projects);
      setRuns(st.runs);
      setTotalsPayload(pt);
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
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Daily snapshots from Neon&apos;s consumption API (v2), stored in Postgres. Cron syncs
            yesterday once per day on Vercel. Pick a date range below: both charts use the same{" "}
            <span className="text-zinc-300">from → to</span> window. Bars rank projects by total
            compute in that window; the line chart plots the selected metric over time. Billing does
            not expose per-database splits or a separate RAM series—compute covers provisioned
            compute for that period.
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

      <section className="glass-card flex flex-col gap-3 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-medium text-zinc-100">Date range</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Applies to project totals (bar chart), the line chart, and the table. Presets count
            calendar days through today (UTC).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <p className="text-sm text-zinc-400">
            <span className="text-zinc-500">Active range: </span>
            <span className="font-mono text-zinc-200">
              {range.from} → {range.to}
            </span>
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total (selected metric)" value={formatAbbrev(totalForPeriod)} />
        <KpiCard label="Projects (in chart)" value={String(projectIds.length)} />
        <KpiCard label="Range" value={`${range.from} → ${range.to}`} />
        <KpiCard label="Granularity" value={groupBy === "day" ? "Daily" : "Monthly"} />
      </section>

      <section className="glass-card flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-medium text-zinc-100">Project comparison</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Totals for{" "}
            <span className="font-mono text-zinc-400">
              {range.from} → {range.to}
            </span>
            {projectId ? (
              <>
                {" "}
                · filtered to one project (same as line chart &quot;Project&quot; selector).
              </>
            ) : (
              <> · all projects with snapshots in range.</>
            )}
          </p>
        </div>
        {loading && !totalsPayload ? (
          <p className="text-sm text-zinc-500">Loading comparison…</p>
        ) : (
          <ProjectCompareBars
            data={compareBarData}
            calendarDays={totalsPayload?.calendarDays ?? 1}
          />
        )}
      </section>

      <UsageLineChartPanel
        loading={loading}
        rows={rows}
        projectIds={projectIds}
        projectNames={projectNames}
        rangeLabel={`${range.from} → ${range.to}`}
        metric={metric}
        setMetric={setMetric}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        projectId={projectId}
        setProjectId={setProjectId}
        projects={projects}
        onRefresh={load}
      />

      <ProjectTable
        projects={projects}
        usageByProjectId={usageByProjectId}
        calendarDays={totalsPayload?.calendarDays ?? null}
      />
    </div>
  );
}
