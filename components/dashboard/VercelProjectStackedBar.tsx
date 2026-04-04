'use client';

import { useMemo } from 'react';
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

const CHART_GRID_STROKE = 'rgba(24, 24, 27, 0.07)';
const CHART_AXIS_LINE = 'rgba(24, 24, 27, 0.12)';
const TICK_FILL = '#71717a';

// Deterministic color palette for up to 12 projects
const PROJECT_COLORS = [
  '#2563eb', // blue
  '#059669', // emerald
  '#d97706', // amber
  '#7c3aed', // violet
  '#db2777', // pink
  '#0891b2', // cyan
  '#65a30d', // lime
  '#ea580c', // orange
  '#4f46e5', // indigo
  '#0d9488', // teal
  '#b45309', // yellow-brown
  '#9333ea', // purple
];

type DataPoint = { period: string; byProject: Record<string, number> };

type TooltipPayloadItem = {
  dataKey?: string;
  value?: number;
  fill?: string;
  name?: string;
};

function ProjectTooltip({
  active,
  label,
  payload,
  projectNames,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  projectNames: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;

  const items = [...payload].reverse().filter((item) => (item.value ?? 0) > 0);
  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-xl">
      <p className="font-semibold text-zinc-900">{label}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: item.fill }}
                aria-hidden
              />
              <span className="text-zinc-600">
                {item.dataKey ? (projectNames[item.dataKey] ?? item.dataKey) : item.name}
              </span>
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

export function VercelProjectStackedBar({
  loading,
  points,
  projectNames,
}: {
  loading: boolean;
  points: DataPoint[];
  projectNames: Record<string, string>;
}) {
  // Collect all project IDs, sorted by total cost descending
  const projectIds = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const pt of points) {
      for (const [id, cost] of Object.entries(pt.byProject)) {
        totals[id] = (totals[id] ?? 0) + (cost as number);
      }
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }, [points]);

  const colorByProject = useMemo(() => {
    const map: Record<string, string> = {};
    projectIds.forEach((id, i) => {
      map[id] = PROJECT_COLORS[i % PROJECT_COLORS.length];
    });
    return map;
  }, [projectIds]);

  // Flatten byProject into the row so Recharts string dataKeys work
  const flatData = useMemo(
    () => points.map((pt) => ({ period: pt.period, ...pt.byProject })),
    [points],
  );

  const legendFormatter = (value: string) => {
    const name = projectNames[value] ?? value;
    return <span style={{ color: TICK_FILL, fontSize: 11 }}>{name}</span>;
  };

  return (
    <section className="glass-card flex flex-col gap-3 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Daily spend by project</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Vercel charges per project per day (USD)</p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : flatData.length === 0 ? (
        <p className="text-sm text-zinc-500">No data in this range.</p>
      ) : (
        <div className="h-[320px] w-full sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flatData} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: TICK_FILL, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: TICK_FILL, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                width={52}
              />
              <Tooltip content={<ProjectTooltip projectNames={projectNames} />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={legendFormatter} />
              {projectIds.map((id) => (
                <Bar
                  key={id}
                  dataKey={id}
                  name={projectNames[id] ?? id}
                  stackId="projects"
                  fill={colorByProject[id]}
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
