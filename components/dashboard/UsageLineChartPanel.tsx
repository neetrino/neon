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

const SELECT_CLASS =
  "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-teal-600/40 focus:ring-2 focus:ring-teal-600/20";

const CHART_GRID_STROKE = "rgba(24, 24, 27, 0.06)";
const CHART_AXIS_LINE = "rgba(24, 24, 27, 0.12)";
const TICK_FILL = "#71717a";

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
    <section className="glass-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-medium text-zinc-500">
          Metric
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as NeonUsageMetricName)}
            className={SELECT_CLASS}
          >
            {NEON_USAGE_METRICS.map((m) => (
              <option key={m} value={m}>
                {NEON_USAGE_METRIC_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[8rem] flex-col gap-1 text-xs font-medium text-zinc-500">
          Step
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "day" | "month")}
            className={SELECT_CLASS}
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
          Project
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">All</option>
            {projects.map((p) => (
              <option key={p.neonProjectId} value={p.neonProjectId}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 lg:ml-auto">
          <span className="hidden font-mono text-xs text-zinc-400 sm:inline">{rangeLabel}</span>
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="h-[340px] w-full sm:h-[380px]">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No data in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: TICK_FILL, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE }}
              />
              <YAxis
                tick={{ fill: TICK_FILL, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatAbbrev(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(24, 24, 27, 0.1)",
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(24, 24, 27, 0.08)",
                }}
                labelStyle={{ color: "#18181b", fontSize: 12 }}
                itemStyle={{ color: "#3f3f46", fontSize: 12 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#52525b", paddingTop: 8 }}
              />
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
