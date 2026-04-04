'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatAbbrev } from '@/components/dashboard/DashboardWidgets';
import type { ProjectUsageAggregate } from '@/components/dashboard/types';

const BAR_SLOT_PX = 96;
const CHART_HEIGHT_PX = 400;
const CHART_MARGIN = { top: 32, right: 16, left: 8, bottom: 52 } as const;
const CHART_MIN_INNER_WIDTH_PX = 520;
const CHART_GRID_STROKE = 'rgba(24, 24, 27, 0.07)';
const CHART_AXIS_LINE = 'rgba(24, 24, 27, 0.12)';
const TICK_FILL = '#71717a';

const NEON_COLOR = '#14b8a6';
const VERCEL_COLOR = '#6366f1';

export type SpendingBarDatum = {
  label: string;
  fullName: string;
  neonUsd: number;
  vercelUsd: number;
};

type TooltipPayloadItem = {
  name?: string;
  value?: number;
  color?: string;
  payload?: SpendingBarDatum;
};

function SpendingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-700 shadow-xl">
      <p className="font-semibold text-zinc-900">{row.fullName}</p>
      <ul className="mt-2 space-y-1.5">
        {row.neonUsd > 0 ? (
          <li>
            <span className="text-zinc-500">Neon est. cost</span>
            <div className="font-mono text-sm text-zinc-900">${row.neonUsd.toFixed(2)}</div>
          </li>
        ) : null}
        {row.vercelUsd > 0 ? (
          <li>
            <span className="text-zinc-500">Vercel charges</span>
            <div className="font-mono text-sm text-zinc-900">${row.vercelUsd.toFixed(2)}</div>
          </li>
        ) : null}
        <li>
          <span className="text-zinc-500">Total</span>
          <div className="font-mono text-sm font-semibold text-zinc-900">
            ${(row.neonUsd + row.vercelUsd).toFixed(2)}
          </div>
        </li>
      </ul>
    </div>
  );
}

export function buildSpendingBarData(
  projects: ProjectUsageAggregate[],
): SpendingBarDatum[] {
  const byName = new Map<string, SpendingBarDatum>();

  for (const p of projects) {
    const key = p.name;
    let row = byName.get(key);
    if (!row) {
      row = {
        label: p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name,
        fullName: p.name,
        neonUsd: 0,
        vercelUsd: 0,
      };
      byName.set(key, row);
    }
    if (p.provider === 'neon') {
      row.neonUsd += p.estimatedCost.totalUsd;
    } else {
      row.vercelUsd += p.vercelCost.totalUsd;
    }
  }

  return [...byName.values()]
    .filter((r) => r.neonUsd + r.vercelUsd > 0)
    .sort((a, b) => b.neonUsd + b.vercelUsd - (a.neonUsd + a.vercelUsd));
}

export function SpendingBarChart({ data }: { data: SpendingBarDatum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">No spending data in this range.</p>;
  }

  const innerW = Math.max(CHART_MIN_INNER_WIDTH_PX, data.length * BAR_SLOT_PX);

  return (
    <div className="overflow-x-auto pb-1 [-ms-overflow-style:auto] [scrollbar-gutter:stable]">
      <div style={{ width: innerW, minWidth: '100%', height: CHART_HEIGHT_PX }}>
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
              tickFormatter={(v) => `$${formatAbbrev(Number(v))}`}
              label={{
                value: 'USD',
                angle: -90,
                position: 'insideLeft',
                fill: TICK_FILL,
                fontSize: 11,
              }}
            />
            <Tooltip content={<SpendingTooltip />} cursor={{ fill: 'rgba(24,24,27,0.04)' }} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string) =>
                value === 'neonUsd' ? 'Neon (estimated)' : 'Vercel (billed)'
              }
            />
            <Bar
              dataKey="neonUsd"
              name="neonUsd"
              stackId="cost"
              fill={NEON_COLOR}
              radius={[0, 0, 0, 0]}
              maxBarSize={BAR_SLOT_PX - 18}
              isAnimationActive={false}
            />
            <Bar
              dataKey="vercelUsd"
              name="vercelUsd"
              stackId="cost"
              fill={VERCEL_COLOR}
              radius={[6, 6, 0, 0]}
              maxBarSize={BAR_SLOT_PX - 18}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="vercelUsd"
                position="top"
                fill={TICK_FILL}
                fontSize={10}
                formatter={(_v: number, entry: { neonUsd?: number; vercelUsd?: number }) => {
                  const total = (entry?.neonUsd ?? 0) + (entry?.vercelUsd ?? 0);
                  return total > 0 ? `$${formatAbbrev(total)}` : '';
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
