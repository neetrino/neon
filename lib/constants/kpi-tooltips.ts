export type KpiMetricKey = 'compute' | 'storage' | 'history' | 'network';

const TOOLTIPS_ALL_PROJECTS: Record<KpiMetricKey, string> = {
  compute: 'The total compute usage (CU-hrs) across all projects in the selected range',
  storage: 'Average root + child storage (GB) across the selected range',
  history: 'Average instant restore history storage (GB) across the selected range',
  network: 'Total public + private network transfer (GB) across the selected range',
};

const TOOLTIPS_SINGLE_PROJECT: Record<KpiMetricKey, string> = {
  compute: 'The total compute usage (CU-hrs) for the selected project in the selected range',
  storage: 'Average root + child storage (GB) for the selected project in the selected range',
  history:
    'Average instant restore history storage (GB) for the selected project in the selected range',
  network:
    'Total public + private network transfer (GB) for the selected project in the selected range',
};

/**
 * Neon-console-style KPI definitions for the usage summary strip.
 * Wording matches the Neon billing UI; when a project filter is active, copy refers to that project.
 */
export function getKpiTooltip(metric: KpiMetricKey, scope: 'all' | 'project'): string {
  return scope === 'all' ? TOOLTIPS_ALL_PROJECTS[metric] : TOOLTIPS_SINGLE_PROJECT[metric];
}
