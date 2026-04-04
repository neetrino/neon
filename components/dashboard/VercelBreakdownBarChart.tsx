'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VercelBreakdownPoint } from '@/components/dashboard/types';

const CHART_GRID_STROKE = 'rgba(24, 24, 27, 0.07)';
const CHART_AXIS_LINE = 'rgba(24, 24, 27, 0.12)';
const TICK_FILL = '#71717a';

const CATEGORY_COLORS = {
  bandwidthUsd: '#2563eb',
  functionsPlusEdgeUsd: '#059669',
  buildUsd: '#d97706',
  otherUsd: '#a1a1aa',
} as const;

const CATEGORY_LABELS: Record<keyof typeof CATEGORY_COLORS, string> = {
  bandwidthUsd: 'Bandwidth',
  functionsPlusEdgeUsd: 'Functions + Edge',
  buildUsd: 'Builds',
  otherUsd: 'Other',
};

type TooltipPayloadItem = {
  dataKey?: string;
  value?: number;
  fill?: string;
  name?: string;
};

function BreakdownTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-xl">
      <p className="font-semibold text-zinc-900">{label}</p>
      <ul className="mt-2 space-y-1">
        {[...payload].reverse().map((item) => (
          <li key={item.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: item.fill }}
                aria-hidden
              />
              <span className="text-zinc-600">{item.name}</span>
            </span>
            <span className="font-mono font-medium text-zinc-900">
              ${(item.value ?? 0).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
        <span className="font-medium text-zinc-700">Total</span>
        <span className="font-mono font-semibold text-zinc-900">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function VercelBreakdownBarChart({
  loading,
  breakdown,
}: {
  loading: boolean;
  breakdown: VercelBreakdownPoint[];
}) {
  return (
    <section className="glass-card flex flex-col gap-3 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Cost breakdown over time</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Vercel charges by category per month (USD)</p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : breakdown.length === 0 ? (
        <p className="text-sm text-zinc-500">No data in this range.</p>
      ) : (
        <div className="h-[300px] w-full sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
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
                tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                width={52}
              />
              <Tooltip content={<BreakdownTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => <span style={{ color: TICK_FILL }}>{value}</span>}
              />
              {(Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>).map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={CATEGORY_LABELS[key]}
                  stackId="breakdown"
                  fill={CATEGORY_COLORS[key]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
