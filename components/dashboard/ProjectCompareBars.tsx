"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SERIES_COLORS } from "@/components/dashboard/chart-colors";
import { formatAbbrev } from "@/components/dashboard/DashboardWidgets";

/** Target ~10 projects visible before horizontal scroll at ~960px viewport. */
const BAR_SLOT_PX = 96;
const CHART_HEIGHT_PX = 400;
const CHART_MARGIN = { top: 32, right: 16, left: 8, bottom: 52 } as const;
const CHART_MIN_INNER_WIDTH_PX = 520;
const CHART_GRID_STROKE = "rgba(24, 24, 27, 0.07)";
const CHART_AXIS_LINE = "rgba(24, 24, 27, 0.12)";
const TICK_FILL = "#71717a";

export type CompareBarDatum = {
  label: string;
  fullName: string;
  usageCuHours: number;
  estimatedCostUsd: number;
};

type TooltipPayloadItem = {
  name?: string;
  value?: number;
  dataKey?: string;
  payload?: CompareBarDatum;
};

function CompareTooltip({
  active,
  payload,
  metricMode,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  metricMode: "usage" | "cost";
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload;
  if (!row) {
    return null;
  }
  const value = metricMode === "usage" ? row.usageCuHours : row.estimatedCostUsd;
  return (
    <div className="max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-700 shadow-xl">
      <p className="font-semibold text-zinc-900">{row.fullName}</p>
      <ul className="mt-2 space-y-1.5">
        <li>
          <span className="text-zinc-500">{metricMode === "usage" ? "Compute (CU-hrs)" : "Estimated cost ($)"}</span>
          <div className="font-mono text-sm text-zinc-900">
            {metricMode === "usage" ? value.toFixed(2) : `$${value.toFixed(2)}`}
          </div>
        </li>
      </ul>
    </div>
  );
}

function barChartWidthPx(count: number): number {
  return Math.max(CHART_MIN_INNER_WIDTH_PX, count * BAR_SLOT_PX);
}

export function ProjectCompareBars({
  data,
  metricMode,
}: {
  data: CompareBarDatum[];
  metricMode: "usage" | "cost";
}) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">Nothing to compare in this range.</p>;
  }

  const innerW = barChartWidthPx(data.length);

  return (
    <div className="overflow-x-auto pb-1 [-ms-overflow-style:auto] [scrollbar-gutter:stable]">
      <div style={{ width: innerW, minWidth: "100%", height: CHART_HEIGHT_PX }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ ...CHART_MARGIN }}>
            <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: TICK_FILL, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              interval={0}
              angle={-32}
              textAnchor="end"
              height={48}
            />
            <YAxis
              tick={{ fill: TICK_FILL, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatAbbrev(Number(v))}
              label={{
                value: metricMode === "usage" ? "CU-hrs" : "USD",
                angle: -90,
                position: "insideLeft",
                fill: TICK_FILL,
                fontSize: 11,
              }}
            />
            <Tooltip content={<CompareTooltip metricMode={metricMode} />} cursor={{ fill: "rgba(24,24,27,0.04)" }} />
            <Bar
              dataKey={metricMode === "usage" ? "usageCuHours" : "estimatedCostUsd"}
              name={metricMode === "usage" ? "Compute (CU-hrs)" : "Estimated cost ($)"}
              radius={[6, 6, 0, 0]}
              maxBarSize={BAR_SLOT_PX - 18}
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell
                  key={`${entry.fullName}-${i}`}
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                />
              ))}
              <LabelList
                dataKey={metricMode === "usage" ? "usageCuHours" : "estimatedCostUsd"}
                position="top"
                fill={TICK_FILL}
                fontSize={10}
                formatter={(v: number) =>
                  metricMode === "usage" ? formatAbbrev(v) : `$${formatAbbrev(v)}`
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function buildCompareBarData(
  projects: Array<{
    name: string;
    normalizedTotals: { computeCuHours: number };
    estimatedCost: { totalUsd: number };
  }>,
  mode: "usage" | "cost",
): CompareBarDatum[] {
  const rows: CompareBarDatum[] = [];
  for (const p of projects) {
    rows.push({
      label: p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name,
      fullName: p.name,
      usageCuHours: p.normalizedTotals.computeCuHours,
      estimatedCostUsd: p.estimatedCost.totalUsd,
    });
  }
  return rows.sort((a, b) =>
    mode === "usage"
      ? b.usageCuHours - a.usageCuHours
      : b.estimatedCostUsd - a.estimatedCostUsd,
  );
}
