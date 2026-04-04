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
import { CHART_STROKES } from "@/components/dashboard/chart-colors";
import type { RechartsRow } from "@/components/dashboard/chart-data";
import { formatAbbrev } from "@/components/dashboard/DashboardWidgets";

const CHART_GRID_STROKE = "rgba(24, 24, 27, 0.07)";
const CHART_AXIS_LINE = "rgba(24, 24, 27, 0.12)";
const TICK_FILL = "#71717a";

export function UsageLineChartPanel({
  loading,
  rows,
  projectIds,
  projectNames,
  metricTitle,
}: {
  loading: boolean;
  rows: RechartsRow[];
  projectIds: string[];
  projectNames: Record<string, string>;
  metricTitle: string;
}) {
  return (
    <section className="glass-card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Usage over time</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{metricTitle}</p>
        </div>
      </div>

      <div className="h-[300px] w-full sm:h-[360px]">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No data in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
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
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(24, 24, 27, 0.1)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(24, 24, 27, 0.1)",
                }}
                labelStyle={{ color: "#18181b", fontSize: 12, fontWeight: 600 }}
                itemStyle={{ color: "#3f3f46", fontSize: 12 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#52525b", paddingTop: 12 }}
                iconType="circle"
              />
              {projectIds.map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={projectNames[id] ?? id}
                  stroke={CHART_STROKES[i % CHART_STROKES.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
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
