export type KpiMetricKey = "compute" | "storage" | "history" | "network";

const TOOLTIPS_ALL_PROJECTS: Record<KpiMetricKey, string> = {
  compute:
    "The total compute time across all projects in the current billing period",
  storage:
    "The combined storage across all root and child branches in the current billing period",
  history:
    "The total instant restore storage used for point-in-time recovery in the current billing period",
  network:
    "The total data transferred in and out of Neon across all projects in the current billing period",
};

const TOOLTIPS_SINGLE_PROJECT: Record<KpiMetricKey, string> = {
  compute:
    "The total compute time for the selected project in the current billing period",
  storage:
    "The combined storage across all root and child branches for the selected project in the current billing period",
  history:
    "The total instant restore storage used for point-in-time recovery for the selected project in the current billing period",
  network:
    "The total data transferred in and out of Neon for the selected project in the current billing period",
};

/**
 * Neon-console-style KPI definitions for the usage summary strip.
 * Wording matches the Neon billing UI; when a project filter is active, copy refers to that project.
 */
export function getKpiTooltip(metric: KpiMetricKey, scope: "all" | "project"): string {
  return scope === "all" ? TOOLTIPS_ALL_PROJECTS[metric] : TOOLTIPS_SINGLE_PROJECT[metric];
}
