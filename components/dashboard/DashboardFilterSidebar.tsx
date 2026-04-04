'use client';

import {
  NEON_USAGE_METRIC_LABELS,
  NEON_USAGE_METRICS,
  type NeonUsageMetricName,
} from '@/lib/constants/neon-metrics';
import {
  rangeCurrentMonthUtc,
  rangeLastDays,
  rangePreviousMonthUtc,
  utcToday,
} from '@/components/dashboard/date-presets';
import { isValidIsoDate, normalizeRange } from '@/components/dashboard/date-range-validate';
import type { ProjectRow, Provider } from '@/components/dashboard/types';

const PRESETS = [
  { label: 'Current month', getRange: rangeCurrentMonthUtc },
  { label: 'Previous month', getRange: rangePreviousMonthUtc },
  { label: '7 days', getRange: () => rangeLastDays(7) },
  { label: '30 days', getRange: () => rangeLastDays(30) },
  { label: '60 days', getRange: () => rangeLastDays(60) },
] as const;

const PROVIDERS: { label: string; value: Provider | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Neon', value: 'neon' },
  { label: 'Vercel', value: 'vercel' },
];

const SELECT_CLASS =
  'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-teal-600/40 focus:ring-2 focus:ring-teal-600/20';

const LABEL_CLASS = 'text-xs font-medium text-zinc-500';

function presetActive(
  getRange: () => { from: string; to: string },
  range: { from: string; to: string },
): boolean {
  const exp = getRange();
  return range.from === exp.from && range.to === exp.to;
}

export function DashboardFilterSidebar({
  range,
  onRangeChange,
  metric,
  setMetric,
  groupBy,
  setGroupBy,
  projectId,
  setProjectId,
  projects,
  provider,
  setProvider,
  onRefresh,
  loading,
}: {
  range: { from: string; to: string };
  onRangeChange: (r: { from: string; to: string }) => void;
  metric: NeonUsageMetricName;
  setMetric: (m: NeonUsageMetricName) => void;
  groupBy: 'day' | 'month';
  setGroupBy: (g: 'day' | 'month') => void;
  projectId: string;
  setProjectId: (id: string) => void;
  projects: ProjectRow[];
  provider: Provider | 'all';
  setProvider: (p: Provider | 'all') => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const setFrom = (from: string) => {
    if (!isValidIsoDate(from)) return;
    onRangeChange(normalizeRange(from, range.to));
  };

  const setTo = (to: string) => {
    if (!isValidIsoDate(to)) return;
    onRangeChange(normalizeRange(range.from, to));
  };

  const todayUtc = utcToday();

  return (
    <aside className="w-full shrink-0 border-b border-zinc-200 bg-zinc-50/80 lg:w-[17.5rem] lg:border-b-0 lg:border-r lg:bg-white">
      <div className="sticky top-0 flex max-h-none flex-col gap-6 p-4 lg:max-h-screen lg:overflow-y-auto">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Filters</p>
        </div>

        <div>
          <p className={LABEL_CLASS}>Provider</p>
          <div className="mt-2 flex gap-1">
            {PROVIDERS.map((p) => {
              const active = provider === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setProvider(p.value);
                    setProjectId('');
                  }}
                  className={`flex-1 rounded-lg px-2 py-2 text-center text-sm font-medium transition ${
                    active
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={LABEL_CLASS}>Quick period</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {PRESETS.map((p) => {
              const on = presetActive(p.getRange, range);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onRangeChange(p.getRange())}
                  className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    on
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={LABEL_CLASS}>Custom range (UTC dates)</p>
          <div className="mt-2 space-y-3">
            <label className="block">
              <span className={LABEL_CLASS}>From</span>
              <input
                type="date"
                value={range.from}
                max={todayUtc}
                onChange={(e) => setFrom(e.target.value)}
                className={SELECT_CLASS}
              />
            </label>
            <label className="block">
              <span className={LABEL_CLASS}>To</span>
              <input
                type="date"
                value={range.to}
                min={range.from}
                max={todayUtc}
                onChange={(e) => setTo(e.target.value)}
                className={SELECT_CLASS}
              />
            </label>
          </div>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-zinc-400">
            {range.from} → {range.to}
          </p>
        </div>

        {provider !== 'vercel' ? (
          <div>
            <label className="block">
              <span className={LABEL_CLASS}>Chart metric</span>
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
          </div>
        ) : null}

        {provider !== 'vercel' ? (
          <div>
            <label className="block">
              <span className={LABEL_CLASS}>Step</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
                className={SELECT_CLASS}
              >
                <option value="day">Daily</option>
                <option value="month">Monthly</option>
              </select>
            </label>
          </div>
        ) : null}

        <div>
          <label className="block">
            <span className={LABEL_CLASS}>Project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={SELECT_CLASS}
              disabled={projects.length === 0}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.neonProjectId} value={p.neonProjectId}>
                  {p.name}
                  {provider === 'all' ? ` (${p.provider})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh data'}
        </button>
      </div>
    </aside>
  );
}
