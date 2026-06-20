// Brand-aligned palette for recharts (SVG attributes need literal colors, so
// these mirror the indigo-based theme rather than referencing CSS variables).
export const CHART_PRIMARY = '#4f46e5';
export const CHART_AXIS = '#94a3b8';
export const CHART_GRID = '#e2e8f0';

export const CHART_COLORS = [
  '#4f46e5', // indigo
  '#7c3aed', // violet
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
];

export const CHART_TOOLTIP_STYLE = {
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
} as const;
