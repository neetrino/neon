"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COMPUTE_BAR_FILL } from "@/components/dashboard/chart-colors";
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
const CHART_HEIGHT_PX = 380;
const CHART_MARGIN = { top: 28, right: 16, left: 8, bottom: 52 } as const;
const CHART_MIN_INNER_WIDTH_PX = 520;

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
    <div className="max-w-xs rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs text-zinc-200 shadow-lg">
      <p className="font-medium text-zinc-100">{row.fullName}</p>
      <ul className="mt-2 space-y-1.5">
        <li>
          <span className="text-zinc-500">Compute (CU·s), total</span>
          <div className="font-mono text-zinc-100">
            {formatTotalsIntegerString(row.computeExact)}
          </div>
        </li>
        <li>
          <span className="text-zinc-500">Compute (CU·s), avg / calendar day</span>
          <div className="font-mono text-zinc-100">
            {formatAvgBigIntPerDay(row.computeExact, calendarDays)}
          </div>
        </li>
        <li>
          <span className="text-zinc-500">Storage (byte·month sum)</span>
          <div className="font-mono text-zinc-100">{formatByteMonthSumScaled(storageBn)}</div>
          <div className="mt-0.5 text-[10px] text-zinc-600">
            Raw: {formatTotalsIntegerString(row.storageByteMoExact)} B·mo
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
  calendarDays,
}: {
  data: CompareBarDatum[];
  calendarDays: number;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No project totals in this range for a bar comparison.
      </p>
    );
  }

  const innerW = barChartWidthPx(data.length);

  return (
    <div className="overflow-x-auto pb-1 [-ms-overflow-style:auto] [scrollbar-gutter:stable]">
      <p className="mb-2 text-xs text-zinc-500">
        Bar height = compute (CU·s) for the same date range as below. Scroll horizontally to see
        all projects (sorted by compute, highest first). Values on bars are CU·s (abbreviated).
      </p>
      <div style={{ width: innerW, minWidth: "100%", height: CHART_HEIGHT_PX }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ ...CHART_MARGIN }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#71717a", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              interval={0}
              angle={-32}
              textAnchor="end"
              height={48}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatAbbrev(Number(v))}
              label={{
                value: "CU·s (total in range)",
                angle: -90,
                position: "insideLeft",
                fill: "#71717a",
                fontSize: 11,
              }}
            />
            <Tooltip content={<CompareTooltip calendarDays={calendarDays} />} />
            <Bar
              dataKey="compute"
              name="Compute (CU·s)"
              fill={COMPUTE_BAR_FILL}
              maxBarSize={BAR_SLOT_PX - 20}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="compute"
                position="top"
                fill="#a1a1aa"
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
