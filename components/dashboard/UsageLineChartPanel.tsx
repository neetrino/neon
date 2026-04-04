"use client";

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
import { CHART_STROKES } from "@/components/dashboard/chart-colors";
import type { ProjectRow } from "@/components/dashboard/types";
import type { RechartsRow } from "@/components/dashboard/chart-data";
import { formatAbbrev } from "@/components/dashboard/DashboardWidgets";

export function UsageLineChartPanel({
  loading,
  rows,
  projectIds,
  projectNames,
  rangeLabel,
  metric,
  setMetric,
  groupBy,
  setGroupBy,
  projectId,
  setProjectId,
  projects,
  onRefresh,
}: {
  loading: boolean;
  rows: RechartsRow[];
  projectIds: string[];
  projectNames: Record<string, string>;
  rangeLabel: string;
  metric: NeonUsageMetricName;
  setMetric: (m: NeonUsageMetricName) => void;
  groupBy: "day" | "month";
  setGroupBy: (g: "day" | "month") => void;
  projectId: string;
  setProjectId: (id: string) => void;
  projects: ProjectRow[];
  onRefresh: () => void;
}) {
  return (
    <section className="glass-card flex flex-col gap-4 p-5 sm:p-6">
      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-zinc-400">
        <span className="text-zinc-500">Time series uses the same range: </span>
        <span className="font-mono text-zinc-200">{rangeLabel}</span>
        <span className="text-zinc-500">
          . Each point is summed usage for that day or month; metric and project filter apply only
          here.
        </span>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
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
          onClick={() => void onRefresh()}
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
            No snapshots in this range. Run a cron sync or check your Neon plan (consumption API
            requires a supported billing plan).
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
  );
}
