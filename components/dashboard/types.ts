import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";

export type SeriesPoint = {
  period: string;
  byProject: Record<string, number>;
};

export type UsageSeriesResponse = {
  metric: string;
  groupBy: "day" | "month";
  points: SeriesPoint[];
};

export type ProjectRow = {
  neonProjectId: string;
  name: string;
  regionId: string | null;
  lastSnapshotDate: string | null;
};

export type SyncRunRow = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  errorMessage: string | null;
  rowsUpserted: number | null;
  targetDate: string;
};

export type ProjectUsageAggregate = {
  neonProjectId: string;
  name: string;
  snapshotRows: number;
  totals: Record<NeonUsageMetricName, string>;
  averagesPerCalendarDay: Record<NeonUsageMetricName, number>;
};

export type ProjectTotalsResponse = {
  from: string;
  to: string;
  calendarDays: number;
  projects: ProjectUsageAggregate[];
};
