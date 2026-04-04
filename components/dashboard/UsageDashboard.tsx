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

const BTN_PRESET_ACTIVE =
  "bg-teal-600 text-white shadow-sm ring-1 ring-teal-600/20";
const BTN_PRESET_IDLE =
  "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80";

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
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.65rem]">
            <span className="text-gradient">Neon</span> usage
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="self-start rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          Sign out
        </button>
      </header>

      <SyncPanel runs={runs} />

      {error ? (
        <div
          className="glass-card border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <section className="glass-card flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-700">Period</span>
          <span className="font-mono text-xs text-zinc-500">
            {range.from} → {range.to}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onPreset(p.days)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                preset.days === p.days ? BTN_PRESET_ACTIVE : BTN_PRESET_IDLE
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total" value={formatAbbrev(totalForPeriod)} />
        <KpiCard label="Projects" value={String(projectIds.length)} />
        <KpiCard label="Range" value={`${range.from} → ${range.to}`} />
        <KpiCard label="Step" value={groupBy === "day" ? "Daily" : "Monthly"} />
      </section>

      <section className="glass-card flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-zinc-900">By project</h2>
        {loading && !totalsPayload ? (
          <p className="text-sm text-zinc-500">Loading…</p>
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
