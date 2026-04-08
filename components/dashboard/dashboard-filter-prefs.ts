import { isValidIsoDate, normalizeRange } from "@/components/dashboard/date-range-validate";
import { rangeCurrentMonthUtc } from "@/components/dashboard/date-presets";

export const DASHBOARD_FILTER_PREFS_KEY = "neon-dashboard-filter-prefs";

export type DashboardFilterPrefs = {
  range: { from: string; to: string };
  compareMode: "usage" | "cost";
};

export function defaultDashboardFilterPrefs(): DashboardFilterPrefs {
  return {
    range: rangeCurrentMonthUtc(),
    compareMode: "cost",
  };
}

function parseStoredPrefs(raw: string): DashboardFilterPrefs | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") {
    return null;
  }
  const d = data as Record<string, unknown>;
  const rangeObj = d.range;
  if (!rangeObj || typeof rangeObj !== "object") {
    return null;
  }
  const r = rangeObj as Record<string, unknown>;
  const from = r.from;
  const to = r.to;
  if (typeof from !== "string" || typeof to !== "string") {
    return null;
  }
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return null;
  }
  const range = normalizeRange(from, to);
  const cm = d.compareMode;
  if (cm !== "usage" && cm !== "cost") {
    return null;
  }
  return { range, compareMode: cm };
}

export function readDashboardFilterPrefs(): DashboardFilterPrefs | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(DASHBOARD_FILTER_PREFS_KEY);
  if (!raw) {
    return null;
  }
  return parseStoredPrefs(raw);
}

export function writeDashboardFilterPrefs(prefs: DashboardFilterPrefs): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(DASHBOARD_FILTER_PREFS_KEY, JSON.stringify(prefs));
}
