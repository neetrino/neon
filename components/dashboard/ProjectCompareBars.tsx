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
import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import {
  bigintToChartSafeNumber,
  formatAvgBigIntPerDay,
  formatByteMonthSumScaled,
  formatTotalsIntegerString,
  sumStorageByteMonthStrings,
} from "@/components/dashboard/usage-display-format";

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
  compute: number;
  computeExact: string;
  storageByteMoExact: string;
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
  calendarDays,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  calendarDays: number;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload;
  if (!row) {
    return null;
  }
  let storageBn = 0n;
  try {
    storageBn = BigInt(row.storageByteMoExact ?? "0");
  } catch {
    storageBn = 0n;
  }
  return (
    <div className="max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-700 shadow-xl">
      <p className="font-semibold text-zinc-900">{row.fullName}</p>
      <ul className="mt-2 space-y-1.5">
        <li>
          <span className="text-zinc-500">CU·s total</span>
          <div className="font-mono text-sm text-zinc-900">
            {formatTotalsIntegerString(row.computeExact)}
          </div>
        </li>
        <li>
          <span className="text-zinc-500">CU·s / day</span>
          <div className="font-mono text-sm text-zinc-900">
            {formatAvgBigIntPerDay(row.computeExact, calendarDays)}
          </div>
        </li>
        <li>
          <span className="text-zinc-500">Storage (byte·month)</span>
          <div className="font-mono text-sm text-zinc-900">{formatByteMonthSumScaled(storageBn)}</div>
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
  calendarDays,
}: {
  data: CompareBarDatum[];
  calendarDays: number;
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
                value: "CU·s",
                angle: -90,
                position: "insideLeft",
                fill: TICK_FILL,
                fontSize: 11,
              }}
            />
            <Tooltip content={<CompareTooltip calendarDays={calendarDays} />} cursor={{ fill: "rgba(24,24,27,0.04)" }} />
            <Bar
              dataKey="compute"
              name="Compute (CU·s)"
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
                dataKey="compute"
                position="top"
                fill={TICK_FILL}
                fontSize={10}
                formatter={(v: number) => formatAbbrev(v)}
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
    totals: Record<NeonUsageMetricName, string>;
  }>,
): CompareBarDatum[] {
  const rows: CompareBarDatum[] = [];
  for (const p of projects) {
    const storageSum = sumStorageByteMonthStrings(p.totals);
    let computeBn = 0n;
    try {
      computeBn = BigInt(p.totals.compute_unit_seconds ?? "0");
    } catch {
      computeBn = 0n;
    }
    const computeStr = computeBn.toString();
    const storageStr = storageSum.toString();
    rows.push({
      label: p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name,
      fullName: p.name,
      compute: bigintToChartSafeNumber(computeBn),
      computeExact: computeStr,
      storageByteMoExact: storageStr,
    });
  }
  return rows.sort((a, b) => b.compute - a.compute);
}
