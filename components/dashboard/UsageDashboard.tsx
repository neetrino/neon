"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NEON_USAGE_METRIC_LABELS } from "@/lib/constants/neon-metrics";
import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import { buildRechartsRows } from "@/components/dashboard/chart-data";
import { DashboardFilterSidebar } from "@/components/dashboard/DashboardFilterSidebar";
import { rangeLastDays } from "@/components/dashboard/date-presets";
import { SyncPanel } from "@/components/dashboard/DashboardWidgets";
import { UsageKpiStrip } from "@/components/dashboard/UsageKpiStrip";
import { sumDashboardKpis } from "@/components/dashboard/usage-kpi-summary";
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
  const [range, setRange] = useState(() => rangeLastDays(30));
  const [metric, setMetric] = useState<NeonUsageMetricName>("compute_unit_seconds");
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [points, setPoints] = useState<SeriesPoint[]>([]);
  const [seriesDisplayUnit, setSeriesDisplayUnit] = useState<UsageSeriesResponse["displayUnit"]>("cu_hours");
  const [totalsPayload, setTotalsPayload] = useState<ProjectTotalsResponse | null>(null);
  const [runs, setRuns] = useState<SyncRunRow[]>([]);
  const [compareMode, setCompareMode] = useState<"usage" | "cost">("usage");
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
    return buildCompareBarData(projs, compareMode);
  }, [totalsPayload, projectId, compareMode]);

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
      setSeriesDisplayUnit(se.displayUnit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [groupBy, metric, projectId, range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const { rows, projectIds } = useMemo(() => buildRechartsRows(points), [points]);

  const kpiProjects = useMemo(() => {
    if (totalsPayload === null) {
      return [];
    }
    return projectId
      ? totalsPayload.projects.filter((p) => p.neonProjectId === projectId)
      : totalsPayload.projects;
  }, [totalsPayload, projectId]);

  const kpiSums = useMemo(() => {
    if (totalsPayload === null) {
      return null;
    }
    return sumDashboardKpis(kpiProjects);
  }, [kpiProjects, totalsPayload]);

  const metricTitleWithUnit = useMemo(() => {
    const unit = (() => {
      if (seriesDisplayUnit === "cu_hours") {
        return "CU-hrs";
      }
      if (seriesDisplayUnit === "avg_gb" || seriesDisplayUnit === "gb") {
        return "GB";
      }
      return "branch-months";
    })();
    return `${NEON_USAGE_METRIC_LABELS[metric]} (${unit})`;
  }, [metric, seriesDisplayUnit]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashboardFilterSidebar
        range={range}
        onRangeChange={setRange}
        metric={metric}
        setMetric={setMetric}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        projectId={projectId}
        setProjectId={setProjectId}
        projects={projects}
        onRefresh={load}
        loading={loading}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:max-w-[calc(100vw-17.5rem)]">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            <span className="text-gradient">Neon</span> usage
          </h1>
          <button
            type="button"
            onClick={() => void logout()}
            className="self-start rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
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

        <UsageKpiStrip
          loading={loading}
          fromIso={totalsPayload?.from ?? range.from}
          toIso={totalsPayload?.to ?? range.to}
          sums={kpiSums}
          kpiScope={projectId ? "project" : "all"}
        />

        <section className="glass-card flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900">Project comparison</h2>
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/90 p-1 text-xs">
              <button
                type="button"
                onClick={() => setCompareMode("usage")}
                className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                  compareMode === "usage" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
                }`}
              >
                Usage
              </button>
              <button
                type="button"
                onClick={() => setCompareMode("cost")}
                className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                  compareMode === "cost" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
                }`}
              >
                Estimated cost
              </button>
            </div>
          </div>
          {loading && !totalsPayload ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <ProjectCompareBars
              data={compareBarData}
              metricMode={compareMode}
            />
          )}
        </section>

        <UsageLineChartPanel
          loading={loading}
          rows={rows}
          projectIds={projectIds}
          projectNames={projectNames}
          metricTitle={metricTitleWithUnit}
        />

        <ProjectTable
          projects={projects}
          usageByProjectId={usageByProjectId}
          calendarDays={totalsPayload?.calendarDays ?? null}
        />
      </div>
    </div>
  );
}
