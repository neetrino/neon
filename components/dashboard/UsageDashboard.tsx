'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { NEON_USAGE_METRIC_LABELS } from '@/lib/constants/neon-metrics';
import type { NeonUsageMetricName } from '@/lib/constants/neon-metrics';
import { buildRechartsRows } from '@/components/dashboard/chart-data';
import { DashboardFilterSidebar } from '@/components/dashboard/DashboardFilterSidebar';
import { rangeLastDays } from '@/components/dashboard/date-presets';
import { SyncPanel } from '@/components/dashboard/DashboardWidgets';
import { UsageKpiStrip } from '@/components/dashboard/UsageKpiStrip';
import { sumDashboardKpis } from '@/components/dashboard/usage-kpi-summary';
import { buildCompareBarData, ProjectCompareBars } from '@/components/dashboard/ProjectCompareBars';
import { buildSpendingBarData, SpendingBarChart } from '@/components/dashboard/SpendingBarChart';
import { ProjectTable } from '@/components/dashboard/ProjectTable';
import { UsageLineChartPanel } from '@/components/dashboard/UsageLineChartPanel';
import { VercelCostLineChart } from '@/components/dashboard/VercelCostLineChart';
import { VercelBreakdownBarChart } from '@/components/dashboard/VercelBreakdownBarChart';
import type {
  NeonUsageAggregate,
  ProjectRow,
  ProjectTotalsResponse,
  ProjectUsageAggregate,
  Provider,
  SeriesPoint,
  SyncRunRow,
  UsageSeriesResponse,
  VercelSeriesResponse,
} from '@/components/dashboard/types';

type ProviderFilter = Provider | 'all';

async function readJson<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function UsageDashboard() {
  const [range, setRange] = useState(() => rangeLastDays(30));
  const [metric, setMetric] = useState<NeonUsageMetricName>('compute_unit_seconds');
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [projectId, setProjectId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [provider, setProvider] = useState<ProviderFilter>('neon');
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [points, setPoints] = useState<SeriesPoint[]>([]);
  const [seriesDisplayUnit, setSeriesDisplayUnit] =
    useState<UsageSeriesResponse['displayUnit']>('cu_hours');
  const [totalsPayload, setTotalsPayload] = useState<ProjectTotalsResponse | null>(null);
  const [runs, setRuns] = useState<SyncRunRow[]>([]);
  const [vercelRuns, setVercelRuns] = useState<SyncRunRow[]>([]);
  const [compareMode, setCompareMode] = useState<'usage' | 'cost'>('usage');
  const [vercelSeries, setVercelSeries] = useState<VercelSeriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncingVercelNow, setSyncingVercelNow] = useState(false);

  const projectNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of projects) {
      m[p.neonProjectId] = p.name;
    }
    return m;
  }, [projects]);

  const normalizedSearch = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm]);

  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch, projects]);

  const visibleProjectIds = useMemo(
    () => new Set(filteredProjects.map((p) => p.neonProjectId)),
    [filteredProjects],
  );

  const filteredPoints = useMemo(() => {
    if (!normalizedSearch) return points;
    return points.map((point) => {
      const byProject: Record<string, number> = {};
      for (const [id, value] of Object.entries(point.byProject)) {
        if (visibleProjectIds.has(id)) byProject[id] = value;
      }
      return { ...point, byProject };
    });
  }, [normalizedSearch, points, visibleProjectIds]);

  const filteredTotalsPayload = useMemo(() => {
    if (!totalsPayload) return null;
    if (!normalizedSearch) return totalsPayload;
    return {
      ...totalsPayload,
      projects: totalsPayload.projects.filter((p) => visibleProjectIds.has(p.neonProjectId)),
    };
  }, [normalizedSearch, totalsPayload, visibleProjectIds]);

  const usageByProjectId = useMemo(() => {
    if (filteredTotalsPayload === null) return null;
    const m = new Map<string, ProjectUsageAggregate>();
    for (const p of filteredTotalsPayload.projects) {
      m.set(p.neonProjectId, p);
    }
    return m;
  }, [filteredTotalsPayload]);

  const neonProjects = useMemo(
    () =>
      (filteredTotalsPayload?.projects ?? []).filter(
        (p): p is NeonUsageAggregate => p.provider === 'neon',
      ),
    [filteredTotalsPayload],
  );

  const projectStatsById = useMemo(() => {
    const stats: Record<string, { totalCostUsd: number; computeCuHours: number }> = {};
    for (const p of neonProjects) {
      stats[p.neonProjectId] = {
        totalCostUsd: p.estimatedCost.totalUsd,
        computeCuHours: p.normalizedTotals.computeCuHours,
      };
    }
    return stats;
  }, [neonProjects]);

  const compareBarData = useMemo(() => {
    const projs = projectId
      ? neonProjects.filter((p) => p.neonProjectId === projectId)
      : neonProjects;
    return buildCompareBarData(projs, compareMode);
  }, [neonProjects, projectId, compareMode]);

  const spendingBarData = useMemo(() => {
    if (!filteredTotalsPayload) return [];
    const projs = projectId
      ? filteredTotalsPayload.projects.filter((p) => p.neonProjectId === projectId)
      : filteredTotalsPayload.projects;
    return buildSpendingBarData(projs);
  }, [filteredTotalsPayload, projectId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const totalsUrl = `/api/usage/project-totals?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&provider=${provider}`;
      const qs = new URLSearchParams({
        from: range.from,
        to: range.to,
        metric,
        groupBy,
      });
      if (projectId) qs.set('projectId', projectId);
      const seriesUrl = `/api/usage/series?${qs.toString()}`;
      const projectsUrl = `/api/usage/projects?provider=${provider}`;

      const vercelSeriesUrl = `/api/usage/vercel-series?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;

      const fetchPromises: Promise<Response>[] = [
        fetch(projectsUrl),
        fetch('/api/usage/sync-status'),
        fetch(totalsUrl),
      ];
      if (provider !== 'vercel') {
        fetchPromises.push(fetch(seriesUrl));
      }
      if (provider === 'vercel') {
        fetchPromises.push(fetch(vercelSeriesUrl));
      }

      const responses = await Promise.all(fetchPromises);
      const [pr, st, pt, fourthRes] = responses;

      const projectsData = await readJson<{ projects: ProjectRow[] }>(pr);
      const statusData = await readJson<{ runs: SyncRunRow[]; vercelRuns: SyncRunRow[] }>(st);
      const totalsData = await readJson<ProjectTotalsResponse>(pt);

      setProjects(projectsData.projects);
      setRuns(statusData.runs);
      setVercelRuns(statusData.vercelRuns ?? []);
      setTotalsPayload(totalsData);

      if (provider === 'vercel' && fourthRes) {
        const vsData = await readJson<VercelSeriesResponse>(fourthRes);
        setVercelSeries(vsData);
        setPoints([]);
      } else if (provider !== 'vercel' && fourthRes) {
        const seriesData = await readJson<UsageSeriesResponse>(fourthRes);
        setPoints(seriesData.points);
        setSeriesDisplayUnit(seriesData.displayUnit);
        setVercelSeries(null);
      } else {
        setPoints([]);
        setVercelSeries(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [groupBy, metric, projectId, provider, range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncNow = useCallback(async () => {
    setSyncingNow(true);
    setError(null);
    try {
      await readJson<{ ok: boolean; targetDay: string; rows: number }>(
        await fetch('/api/usage/sync-now', { method: 'POST' }),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to synchronize');
    } finally {
      setSyncingNow(false);
    }
  }, [load]);

  const syncVercelNow = useCallback(async () => {
    setSyncingVercelNow(true);
    setError(null);
    try {
      await readJson<{ ok: boolean; targetDay: string; rows: number }>(
        await fetch('/api/usage/vercel-sync-now', { method: 'POST' }),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to synchronize Vercel');
    } finally {
      setSyncingVercelNow(false);
    }
  }, [load]);

  const { rows, projectIds } = useMemo(() => buildRechartsRows(filteredPoints), [filteredPoints]);

  const kpiProjects = useMemo(() => {
    if (filteredTotalsPayload === null) return [];
    return projectId ? neonProjects.filter((p) => p.neonProjectId === projectId) : neonProjects;
  }, [filteredTotalsPayload, neonProjects, projectId]);

  const kpiSums = useMemo(() => {
    if (filteredTotalsPayload === null) return null;
    return sumDashboardKpis(kpiProjects);
  }, [kpiProjects, filteredTotalsPayload]);

  const metricTitleWithUnit = useMemo(() => {
    const unit = (() => {
      if (seriesDisplayUnit === 'cu_hours') return 'CU-hrs';
      if (seriesDisplayUnit === 'avg_gb' || seriesDisplayUnit === 'gb') return 'GB';
      return 'branch-months';
    })();
    return `${NEON_USAGE_METRIC_LABELS[metric]} (${unit})`;
  }, [metric, seriesDisplayUnit]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const showNeonChart = provider !== 'vercel';
  const showSpendingChart = provider === 'all';
  const showNeonCompare = provider !== 'vercel';
  const showVercelCharts = provider === 'vercel';
  const showProviderBadge = provider === 'all';

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
        projects={filteredProjects}
        provider={provider}
        setProvider={(p) => {
          setProvider(p);
          setProjectId('');
        }}
        onRefresh={load}
        loading={loading}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:max-w-[calc(100vw-17.5rem)]">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {provider === 'neon' ? (
                <>
                  <span className="text-gradient">Neon</span> usage
                </>
              ) : provider === 'vercel' ? (
                <>
                  <span className="text-gradient">Vercel</span> spending
                </>
              ) : (
                <>Infrastructure spending</>
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {provider !== 'vercel' ? (
                <SyncPanel runs={runs} onSyncNow={syncNow} syncingNow={syncingNow} />
              ) : null}
              {provider !== 'neon' ? (
                <SyncPanel
                  runs={vercelRuns}
                  onSyncNow={syncVercelNow}
                  syncingNow={syncingVercelNow}
                />
              ) : null}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="w-full sm:w-56">
              <span className="sr-only">Search projects</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search project by name..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-teal-600/40 focus:ring-2 focus:ring-teal-600/20"
              />
            </label>
            <button
              type="button"
              onClick={() => void logout()}
              className="self-start rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              Sign out
            </button>
          </div>
        </header>

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
          fromIso={filteredTotalsPayload?.from ?? range.from}
          toIso={filteredTotalsPayload?.to ?? range.to}
          sums={kpiSums}
          kpiScope={projectId ? 'project' : 'all'}
          costSummary={filteredTotalsPayload?.costSummary ?? null}
          providerMode={provider}
        />

        {showSpendingChart ? (
          <section className="glass-card flex flex-col gap-4 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Combined spending by project</h2>
            {loading && !filteredTotalsPayload ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <SpendingBarChart data={spendingBarData} />
            )}
          </section>
        ) : null}

        {showNeonCompare ? (
          <section className="glass-card flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                {provider === 'all' ? 'Neon project comparison' : 'Project comparison'}
              </h2>
              <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/90 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCompareMode('usage')}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                    compareMode === 'usage' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'
                  }`}
                >
                  Usage
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('cost')}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                    compareMode === 'cost' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'
                  }`}
                >
                  Estimated cost
                </button>
              </div>
            </div>
            {loading && !filteredTotalsPayload ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <ProjectCompareBars data={compareBarData} metricMode={compareMode} />
            )}
          </section>
        ) : null}

        {showNeonChart ? (
          <UsageLineChartPanel
            loading={loading}
            rows={rows}
            projectIds={projectIds}
            projectNames={projectNames}
            projectStatsById={projectStatsById}
            metricTitle={metricTitleWithUnit}
          />
        ) : null}

        {showVercelCharts ? (
          <>
            <VercelCostLineChart
              loading={loading}
              points={vercelSeries?.costByProject ?? []}
              projectNames={vercelSeries?.projectNames ?? {}}
            />
            <VercelBreakdownBarChart loading={loading} breakdown={vercelSeries?.breakdown ?? []} />
          </>
        ) : null}

        <ProjectTable
          projects={filteredProjects}
          usageByProjectId={usageByProjectId}
          calendarDays={filteredTotalsPayload?.calendarDays ?? null}
          showProviderBadge={showProviderBadge}
        />
      </div>
    </div>
  );
}
