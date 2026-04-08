"use client";

import { useEffect, useState } from "react";
import {
  defaultDashboardFilterPrefs,
  readDashboardFilterPrefs,
  writeDashboardFilterPrefs,
} from "@/components/dashboard/dashboard-filter-prefs";

/**
 * Defaults: current month + estimated cost. After first visit, restores last range and comparison mode from localStorage.
 */
export function usePersistedDashboardFilterPrefs() {
  const [range, setRange] = useState(() => defaultDashboardFilterPrefs().range);
  const [compareMode, setCompareMode] = useState(() => defaultDashboardFilterPrefs().compareMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readDashboardFilterPrefs();
    if (stored) {
      setRange(stored.range);
      setCompareMode(stored.compareMode);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeDashboardFilterPrefs({ range, compareMode });
  }, [hydrated, range, compareMode]);

  return { range, setRange, compareMode, setCompareMode };
}
