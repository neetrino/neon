"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COMPUTE_BAR_FILL, STORAGE_BAR_FILL } from "@/components/dashboard/chart-colors";
import { formatAbbrev } from "@/components/dashboard/DashboardWidgets";
import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import {
  bigintToChartSafeNumber,
  formatTotalsIntegerString,
  sumStorageByteMonthStrings,
} from "@/components/dashboard/usage-display-format";

export type CompareBarDatum = {
  label: string;
  compute: number;
  storageByteMo: number;
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
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length || label === undefined) {
    return null;
  }
  const row = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs text-zinc-200 shadow-lg">
      <p className="font-medium text-zinc-100">{label}</p>
      <ul className="mt-2 space-y-1">
        {payload.map((p) => {
          const exact =
            p.dataKey === "compute"
              ? row?.computeExact
              : p.dataKey === "storageByteMo"
                ? row?.storageByteMoExact
                : undefined;
          const formatted = exact ? formatTotalsIntegerString(exact) : formatAbbrev(Number(p.value));
          return (
            <li key={String(p.dataKey)} className="flex justify-between gap-6">
              <span className="text-zinc-500">{p.name}</span>
              <span className="font-mono text-zinc-100">{formatted}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ProjectCompareBars({ data }: { data: CompareBarDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No project totals in this range for a bar comparison.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 56 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          interval={0}
          angle={-28}
          textAnchor="end"
          height={56}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatAbbrev(Number(v))}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatAbbrev(Number(v))}
        />
        <Tooltip content={<CompareTooltip />} />
        <Legend />
        <Bar
          yAxisId="left"
          dataKey="compute"
          name="Compute (CU·s)"
          fill={COMPUTE_BAR_FILL}
          maxBarSize={36}
          isAnimationActive={false}
        />
        <Bar
          yAxisId="right"
          dataKey="storageByteMo"
          name="Storage (B·mo sum)"
          fill={STORAGE_BAR_FILL}
          maxBarSize={36}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
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
      compute: bigintToChartSafeNumber(computeBn),
      storageByteMo: bigintToChartSafeNumber(storageSum),
      computeExact: computeStr,
      storageByteMoExact: storageStr,
    });
  }
  return rows.sort((a, b) => b.compute - a.compute);
}
