"use client";

import {
  NEON_USAGE_METRIC_LABELS,
  NEON_USAGE_METRICS,
  type NeonUsageMetricName,
} from "@/lib/constants/neon-metrics";
import {
  rangeCurrentMonthUtc,
  rangeLastDays,
  rangePreviousMonthUtc,
  rangeSingleDayUtc,
  utcToday,
} from "@/components/dashboard/date-presets";
import { isValidIsoDate, normalizeRange } from "@/components/dashboard/date-range-validate";
import type { ProjectRow } from "@/components/dashboard/types";

const PRESETS_MONTHS = [
  { label: "Current month", getRange: rangeCurrentMonthUtc },
  { label: "Previous month", getRange: rangePreviousMonthUtc },
] as const;

const PRESETS_ROLLING = [
  { label: "7 days", getRange: () => rangeLastDays(7) },
  { label: "30 days", getRange: () => rangeLastDays(30) },
  { label: "60 days", getRange: () => rangeLastDays(60) },
] as const;

const SELECT_CLASS =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-teal-600/40 focus:ring-2 focus:ring-teal-600/20";

const LABEL_CLASS = "text-xs font-medium text-zinc-500";

function presetActive(getRange: () => { from: string; to: string }, range: { from: string; to: string }): boolean {
  const exp = getRange();
  return range.from === exp.from && range.to === exp.to;
}

const PRESET_BTN_BASE =
  "rounded-lg px-3 py-2 text-left text-sm font-medium transition";

function QuickPeriodPresetButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${PRESET_BTN_BASE} ${
        active ? "bg-teal-600 text-white shadow-sm" : "bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}

export function DashboardFilterSidebar({
  range,
  onRangeChange,
  latestSyncedDayIso,
  metric,
  setMetric,
  groupBy,
  setGroupBy,
  projectId,
  setProjectId,
  projects,
  onRefresh,
  loading,
}: {
  range: { from: string; to: string };
  onRangeChange: (r: { from: string; to: string }) => void;
  /** Most recent UTC day present in usage snapshots (any project), or null if none yet. */
  latestSyncedDayIso: string | null;
  metric: NeonUsageMetricName;
  setMetric: (m: NeonUsageMetricName) => void;
  groupBy: "day" | "month";
  setGroupBy: (g: "day" | "month") => void;
  projectId: string;
  setProjectId: (id: string) => void;
  projects: ProjectRow[];
  onRefresh: () => void;
  loading: boolean;
}) {
  const setFrom = (from: string) => {
    if (!isValidIsoDate(from)) {
      return;
    }
    onRangeChange(normalizeRange(from, range.to));
  };

  const setTo = (to: string) => {
    if (!isValidIsoDate(to)) {
      return;
    }
    onRangeChange(normalizeRange(range.from, to));
  };

  const todayUtc = utcToday();
  const latestSyncedRange =
    latestSyncedDayIso !== null ? rangeSingleDayUtc(latestSyncedDayIso) : null;
  const latestSyncedActive =
    latestSyncedRange !== null &&
    range.from === latestSyncedRange.from &&
    range.to === latestSyncedRange.to;

  return (
    <aside className="w-full shrink-0 border-b border-zinc-200 bg-zinc-50/80 lg:w-[17.5rem] lg:border-b-0 lg:border-r lg:bg-white">
      <div className="sticky top-0 flex max-h-none flex-col gap-6 p-4 lg:max-h-screen lg:overflow-y-auto">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Filters</p>
        </div>

        <div>
          <p className={LABEL_CLASS}>Quick period</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {PRESETS_MONTHS.map((p) => (
              <QuickPeriodPresetButton
                key={p.label}
                label={p.label}
                active={presetActive(p.getRange, range)}
                onClick={() => onRangeChange(p.getRange())}
              />
            ))}
            <button
              type="button"
              disabled={latestSyncedRange === null}
              title={
                latestSyncedRange === null
                  ? "No usage snapshots yet — run sync or pick another period"
                  : `UTC ${latestSyncedDayIso} (latest day in synced data)`
              }
              onClick={() => {
                if (latestSyncedRange !== null) {
                  onRangeChange(latestSyncedRange);
                }
              }}
              className={`${PRESET_BTN_BASE} ${
                latestSyncedActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : latestSyncedRange === null
                    ? "cursor-not-allowed bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200"
                    : "bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              1 day
            </button>
            {PRESETS_ROLLING.map((p) => (
              <QuickPeriodPresetButton
                key={p.label}
                label={p.label}
                active={presetActive(p.getRange, range)}
                onClick={() => onRangeChange(p.getRange())}
              />
            ))}
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

        <div>
          <label className="block">
            <span className={LABEL_CLASS}>Step</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "day" | "month")}
              className={SELECT_CLASS}
            >
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
            </select>
          </label>
        </div>

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
          {loading ? "Loading…" : "Refresh data"}
        </button>
      </div>
    </aside>
  );
}
