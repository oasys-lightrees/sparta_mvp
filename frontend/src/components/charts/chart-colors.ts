// LATO chart palette (SVG attributes need literal colors, so these
// mirror the ink-blue + forged-bronze theme rather than CSS variables).
export const CHART_PRIMARY = '#27406F'; // deep ink blue
export const CHART_BRONZE = '#B5803F'; // forged bronze accent
export const CHART_AXIS = '#94a3b8';
export const CHART_GRID = '#e8e4dc'; // warm stone grid

export const CHART_COLORS = [
  '#27406F', // ink blue
  '#B5803F', // bronze
  '#5B7BB4', // mid blue
  '#3E7C66', // disciplined green
  '#C8983F', // light bronze
  '#8A93A6', // slate
];

export const CHART_TOOLTIP_STYLE = {
  borderRadius: '0.5rem',
  border: '1px solid #e8e4dc',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(31,41,55,0.08)',
} as const;
