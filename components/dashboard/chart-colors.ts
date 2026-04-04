/**
 * Distinct series colors for lines and bars (light UI).
 */
export const SERIES_COLORS = [
  '#2563eb',
  '#db2777',
  '#d97706',
  '#059669',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
  '#0d9488',
  '#ca8a04',
  '#c026d3',
] as const;

/** @deprecated Bars use SERIES_COLORS per index */
export const COMPUTE_BAR_FILL = SERIES_COLORS[0];

/** Bar fill for storage (byte·month) series. */
export const STORAGE_BAR_FILL = '#8b5cf6';

export const CHART_STROKES = [...SERIES_COLORS];
