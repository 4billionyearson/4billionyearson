// Shared metric configuration for the Climate Map (global / USA / UK).
// Centralised here so ClimateMap and ClimateMapCard agree on:
//   - which metrics exist
//   - how each metric is named, unit-labelled and coloured
//   - whether a metric is an anomaly (diverging) or absolute (sequential)
//   - which baseline / data source applies (used in tooltip / legend copy)

export type MetricKey =
  | 'temp-anomaly'
  | 'temp-actual'
  | 'precip-anomaly'
  | 'precip-actual'
  | 'sunshine-anomaly'
  | 'sunshine-actual'
  | 'frost-anomaly'
  | 'frost-actual';

export type MetricDomain = 'temp' | 'precip' | 'sunshine' | 'frost';

export interface MetricConfig {
  key: MetricKey;
  domain: MetricDomain;
  isAnomaly: boolean;
  shortLabel: string;       // toggle button label
  longLabel: string;        // legend / tooltip header
  unit: string;             // °C, mm, hrs, days
  baseline: string;         // copy for legend ("vs 1961–1990")
  // Sequential ramps go from "low" to "high"; anomaly ramps are diverging.
  legendGradient: string;   // CSS background for the legend swatch
  legendMin: string;        // copy for the left tick
  legendMax: string;        // copy for the right tick
  // Anomaly metrics: clip ±5; sequential: scaled to its own min/max.
  scale: { min: number; max: number };
  // Optional per-window overrides. 1m = monthly value, 3m = 3-month sum/avg,
  // 12m = 12-month rolling. We override the scale + legend labels for windows
  // whose magnitude differs significantly from the 1-month default
  // (e.g. 12-month rainfall sums that would otherwise saturate the ramp).
  scaleByWindow?: Partial<Record<'1m' | '3m' | '12m', { min: number; max: number; legendMin?: string; legendMax?: string }>>;
}

// Diverging blue↔red ramp shared by all anomaly metrics where positive = warmer / wetter / sunnier / less-frosty.
const ANOMALY_GRADIENT =
  'linear-gradient(to right, #1e3a8a 0%, #2563eb 20%, #60a5fa 35%, #bae6fd 48%, #fef3c7 52%, #fde68a 58%, #fb923c 70%, #ea580c 78%, #b91c1c 88%, #7f1d1d 100%)';

// For frost-anomaly we keep the same gradient direction (warm = red) but
// remember that fewer frost days = warming signal, so callers feed in
// `-anom` when colouring (handled by colorForMetric below).

export const METRICS: Record<MetricKey, MetricConfig> = {
  'temp-anomaly': {
    key: 'temp-anomaly', domain: 'temp', isAnomaly: true,
    shortLabel: 'Temp Anomaly', longLabel: 'Temperature anomaly',
    unit: '°C', baseline: 'vs 1961–1990',
    legendGradient: ANOMALY_GRADIENT, legendMin: '-5°C', legendMax: '+5°C',
    scale: { min: -5, max: 5 },
  },
  'temp-actual': {
    key: 'temp-actual', domain: 'temp', isAnomaly: false,
    shortLabel: 'Temp Actual', longLabel: 'Average temperature',
    unit: '°C', baseline: 'observed',
    legendGradient:
      'linear-gradient(to right, #1e3a8a, #2563eb, #60a5fa, #f8fafc, #fde68a, #fb923c, #ea580c, #b91c1c)',
    legendMin: '-30°C', legendMax: '+35°C',
    scale: { min: -30, max: 35 },
  },
  'precip-anomaly': {
    key: 'precip-anomaly', domain: 'precip', isAnomaly: true,
    shortLabel: 'Precip Anomaly', longLabel: 'Rainfall anomaly',
    unit: 'mm', baseline: 'vs 1991–2020',
    // Brown→white→teal: drier than normal = brown, wetter = teal/blue
    legendGradient:
      'linear-gradient(to right, #78350f, #b45309, #d97706, #fde68a, #f8fafc, #99f6e4, #14b8a6, #0f766e, #134e4a)',
    legendMin: '-100 mm', legendMax: '+100 mm',
    // Monthly anomalies (1m and 12m monthly-mean) are in mm; 3m is a sum so
    // its diff is roughly 3× larger.
    scale: { min: -100, max: 100 },
    scaleByWindow: {
      '3m': { min: -200, max: 200, legendMin: '-200 mm', legendMax: '+200 mm' },
    },
  },
  'precip-actual': {
    key: 'precip-actual', domain: 'precip', isAnomaly: false,
    shortLabel: 'Precip Actual', longLabel: 'Rainfall',
    unit: 'mm', baseline: 'observed',
    legendGradient:
      'linear-gradient(to right, #fef3c7, #fde68a, #bef264, #34d399, #14b8a6, #0ea5e9, #1d4ed8, #1e3a8a)',
    legendMin: '0 mm', legendMax: '200 mm',
    // 1m = monthly value; 12m window is a monthly mean over the last 12
    // months, so it lives on the same monthly scale. 3m is a 3-month sum
    // (UK Met Office) and needs a wider range.
    scale: { min: 0, max: 200 },
    scaleByWindow: {
      '3m': { min: 0, max: 500, legendMin: '0 mm', legendMax: '500 mm' },
    },
  },
  'sunshine-anomaly': {
    key: 'sunshine-anomaly', domain: 'sunshine', isAnomaly: true,
    shortLabel: 'Sunshine Anomaly', longLabel: 'Sunshine anomaly',
    unit: 'hrs', baseline: 'vs 1991–2020',
    legendGradient:
      'linear-gradient(to right, #1e3a8a, #3b82f6, #93c5fd, #f8fafc, #fde68a, #f59e0b, #b45309, #78350f)',
    legendMin: '-80 hrs', legendMax: '+80 hrs',
    scale: { min: -80, max: 80 },
    scaleByWindow: {
      '3m': { min: -150, max: 150, legendMin: '-150 hrs', legendMax: '+150 hrs' },
    },
  },
  'sunshine-actual': {
    key: 'sunshine-actual', domain: 'sunshine', isAnomaly: false,
    shortLabel: 'Sunshine Actual', longLabel: 'Sunshine',
    unit: 'hrs', baseline: 'observed',
    legendGradient:
      'linear-gradient(to right, #1e293b, #475569, #cbd5e1, #fde68a, #f59e0b, #d97706)',
    legendMin: '0 hrs', legendMax: '250 hrs',
    // Monthly value; 12m is monthly-mean so same scale. 3m is a sum.
    scale: { min: 0, max: 250 },
    scaleByWindow: {
      '3m': { min: 0, max: 700, legendMin: '0 hrs', legendMax: '700 hrs' },
    },
  },
  'frost-anomaly': {
    key: 'frost-anomaly', domain: 'frost', isAnomaly: true,
    shortLabel: 'Frost Anomaly', longLabel: 'Frost-day anomaly',
    unit: 'days', baseline: 'vs 1991–2020',
    // Diverging: more frost = blue, fewer frost = red (warming signal).
    legendGradient:
      'linear-gradient(to right, #b91c1c, #fb923c, #fef3c7, #f8fafc, #bae6fd, #60a5fa, #1e3a8a)',
    legendMin: '-15 days', legendMax: '+15 days',
    scale: { min: -15, max: 15 },
    scaleByWindow: {
      '3m': { min: -30, max: 30, legendMin: '-30 days', legendMax: '+30 days' },
      '12m': { min: -30, max: 30, legendMin: '-30 days', legendMax: '+30 days' },
    },
  },
  'frost-actual': {
    key: 'frost-actual', domain: 'frost', isAnomaly: false,
    shortLabel: 'Frost Actual', longLabel: 'Frost days',
    unit: 'days', baseline: 'observed',
    legendGradient:
      'linear-gradient(to right, #f8fafc, #bae6fd, #60a5fa, #2563eb, #1e3a8a)',
    legendMin: '0 days', legendMax: '30 days',
    scale: { min: 0, max: 30 },
    scaleByWindow: {
      '3m': { min: 0, max: 60, legendMin: '0 days', legendMax: '60 days' },
      // 12m comes from the yearly fallback (annual frost-day total) so it's
      // on a different scale to the monthly value.
      '12m': { min: 0, max: 100, legendMin: '0 days', legendMax: '100 days' },
    },
  },
};

export function isMetric(value: string | undefined | null): value is MetricKey {
  return !!value && value in METRICS;
}

// Linear interp between two hex colours.
function lerpHex(a: string, b: string, t: number): string {
  const ta = Math.max(0, Math.min(1, t));
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.slice(0, 2), 16), ag = parseInt(ah.slice(2, 4), 16), ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16), bg = parseInt(bh.slice(2, 4), 16), bb = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * ta);
  const g = Math.round(ag + (bg - ag) * ta);
  const b2 = Math.round(ab + (bb - ab) * ta);
  return `rgb(${r},${g},${b2})`;
}

// Multi-stop ramp: pick the segment based on `t` (0..1) and lerp inside it.
function rampAt(stops: string[], t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  if (stops.length === 1) return stops[0];
  const segCount = stops.length - 1;
  const segPos = tc * segCount;
  const idx = Math.min(segCount - 1, Math.floor(segPos));
  return lerpHex(stops[idx], stops[idx + 1], segPos - idx);
}

const RAMP_TEMP_ACTUAL = ['#1e3a8a', '#2563eb', '#60a5fa', '#f8fafc', '#fde68a', '#fb923c', '#ea580c', '#b91c1c'];
// Stops equivalent of ANOMALY_GRADIENT, used when a custom (auto-stretched)
// scale overrides the bespoke segment-based colorFromAnomaly() ramp.
const RAMP_TEMP_ANOMALY = ['#1e3a8a', '#2563eb', '#60a5fa', '#bae6fd', '#fef3c7', '#fde68a', '#fb923c', '#ea580c', '#b91c1c', '#7f1d1d'];
const RAMP_PRECIP_ACTUAL = ['#fef3c7', '#fde68a', '#bef264', '#34d399', '#14b8a6', '#0ea5e9', '#1d4ed8', '#1e3a8a'];
const RAMP_SUNSHINE_ACTUAL = ['#1e293b', '#475569', '#cbd5e1', '#fde68a', '#f59e0b', '#d97706'];
const RAMP_FROST_ACTUAL = ['#f8fafc', '#bae6fd', '#60a5fa', '#2563eb', '#1e3a8a'];
// Frost anomaly: red(fewer)→white→blue(more). We feed positive=more frost = blue.
const RAMP_FROST_ANOMALY = ['#b91c1c', '#fb923c', '#fef3c7', '#f8fafc', '#bae6fd', '#60a5fa', '#1e3a8a'];
const RAMP_PRECIP_ANOMALY = ['#78350f', '#b45309', '#d97706', '#fde68a', '#f8fafc', '#99f6e4', '#14b8a6', '#0f766e', '#134e4a'];
const RAMP_SUNSHINE_ANOMALY = ['#1e3a8a', '#3b82f6', '#93c5fd', '#f8fafc', '#fde68a', '#f59e0b', '#b45309', '#78350f'];

const NO_DATA = '#1f2937';

export type AnomalyWindow = '1m' | '3m' | '12m';

export function scaleForWindow(metric: MetricKey, windowSel?: AnomalyWindow): { min: number; max: number } {
  const cfg = METRICS[metric];
  if (windowSel && cfg.scaleByWindow?.[windowSel]) {
    const w = cfg.scaleByWindow[windowSel]!;
    return { min: w.min, max: w.max };
  }
  return cfg.scale;
}

// Format a numeric scale bound for legend display, matching the unit string
// used elsewhere (°C, mm, hrs, days). Used when an auto-stretched legend
// needs to render its derived min/max with no static copy to fall back on.
function formatScaleBound(metric: MetricKey, v: number, isMax: boolean): string {
  const cfg = METRICS[metric];
  const decimals = cfg.unit === '°C' ? 1 : 0;
  const sign = cfg.isAnomaly && isMax && v > 0 ? '+' : '';
  const unit = cfg.unit === '°C' ? '°C' : ` ${cfg.unit}`;
  return `${sign}${v.toFixed(decimals)}${unit}`;
}

export function legendForWindow(
  metric: MetricKey,
  windowSel?: AnomalyWindow,
  customScale?: { min: number; max: number },
): { legendMin: string; legendMax: string; legendGradient: string } {
  const cfg = METRICS[metric];
  if (customScale) {
    return {
      legendMin: formatScaleBound(metric, customScale.min, false),
      legendMax: formatScaleBound(metric, customScale.max, true),
      legendGradient: cfg.legendGradient,
    };
  }
  const w = windowSel ? cfg.scaleByWindow?.[windowSel] : undefined;
  return {
    legendMin: w?.legendMin ?? cfg.legendMin,
    legendMax: w?.legendMax ?? cfg.legendMax,
    legendGradient: cfg.legendGradient,
  };
}

export function colorForMetric(
  metric: MetricKey,
  value: number | null | undefined,
  windowSel?: AnomalyWindow,
  customScale?: { min: number; max: number },
): string {
  if (value == null || !Number.isFinite(value)) return NO_DATA;
  const scale = customScale ?? scaleForWindow(metric, windowSel);
  // Guard against degenerate auto-stretch domains (single value or NaN);
  // fall back to the fixed scale so the legend shows a usable ramp.
  const span = scale.max - scale.min;
  const usable = Number.isFinite(span) && span > 1e-9
    ? scale
    : scaleForWindow(metric, windowSel);
  const t = (value - usable.min) / (usable.max - usable.min);
  switch (metric) {
    case 'temp-anomaly':
      // When the user opts into auto-stretch we want a ramp keyed to the
      // visible domain; otherwise keep the bespoke segment-based ramp that
      // matches the prior anomaly-only map exactly at integer °C breaks.
      return customScale ? rampAt(RAMP_TEMP_ANOMALY, t) : colorFromAnomaly(value);
    case 'temp-actual':
      return rampAt(RAMP_TEMP_ACTUAL, t);
    case 'precip-anomaly':
      return rampAt(RAMP_PRECIP_ANOMALY, t);
    case 'precip-actual':
      return rampAt(RAMP_PRECIP_ACTUAL, t);
    case 'sunshine-anomaly':
      return rampAt(RAMP_SUNSHINE_ANOMALY, t);
    case 'sunshine-actual':
      return rampAt(RAMP_SUNSHINE_ACTUAL, t);
    case 'frost-anomaly':
      return rampAt(RAMP_FROST_ANOMALY, t);
    case 'frost-actual':
      return rampAt(RAMP_FROST_ACTUAL, t);
  }
}

// Original temp-anomaly ramp (kept verbatim for visual continuity with the
// prior anomaly-only map).
function colorFromAnomaly(anom: number): string {
  const v = Math.max(-5, Math.min(5, anom));
  if (v >= 0) {
    if (v < 1) return lerpHex('#fef3c7', '#fde68a', v);
    if (v < 2) return lerpHex('#fde68a', '#fb923c', v - 1);
    if (v < 3) return lerpHex('#fb923c', '#ea580c', v - 2);
    if (v < 4) return lerpHex('#ea580c', '#b91c1c', v - 3);
    return lerpHex('#b91c1c', '#7f1d1d', v - 4);
  }
  const a = -v;
  if (a < 1) return lerpHex('#e0f2fe', '#bae6fd', a);
  if (a < 2) return lerpHex('#bae6fd', '#60a5fa', a - 1);
  if (a < 3) return lerpHex('#60a5fa', '#2563eb', a - 2);
  return lerpHex('#2563eb', '#1e3a8a', Math.min(1, a - 3));
}

// Format a value for tooltip display, e.g. "+2.4°C", "143 hrs", "12 days".
export function formatMetricValue(metric: MetricKey, v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'No data';
  const cfg = METRICS[metric];
  const sign = cfg.isAnomaly && v > 0 ? '+' : '';
  const decimals = cfg.unit === '°C' ? 2 : cfg.unit === 'days' ? 1 : 1;
  return `${sign}${v.toFixed(decimals)} ${cfg.unit}`;
}

// All metric keys grouped for the toggle UI.
export const ALL_METRICS: MetricKey[] = [
  'temp-anomaly', 'temp-actual',
  'precip-anomaly', 'precip-actual',
  'sunshine-anomaly', 'sunshine-actual',
  'frost-anomaly', 'frost-actual',
];

// Convenience: which metrics have global country-level coverage?
// (No precip/sunshine/frost data at country level - country-precip is too stale.)
export const GLOBAL_METRICS: MetricKey[] = ['temp-anomaly', 'temp-actual', 'precip-anomaly', 'precip-actual'];

// US national page: NOAA tavg + pcp at state level.
export const USA_METRICS: MetricKey[] = ['temp-anomaly', 'temp-actual', 'precip-anomaly', 'precip-actual'];

// UK page: full Met Office menu.
export const UK_METRICS: MetricKey[] = [
  'temp-anomaly', 'temp-actual',
  'precip-anomaly', 'precip-actual',
  'sunshine-anomaly', 'sunshine-actual',
  'frost-anomaly', 'frost-actual',
];

// Map levels supported by each metric. Used to disable toggle buttons whose
// (metric, level) combination has no data, instead of the user clicking and
// landing on an empty map.
export type MapLevel =
  | 'continents'
  | 'countries'
  | 'us-states'
  | 'us-regions'
  | 'uk-countries'
  | 'uk-regions';

export const METRIC_LEVELS: Record<MetricKey, MapLevel[]> = {
  // Temperature anomaly is the broadest series - we have it for every level.
  'temp-anomaly':     ['continents', 'countries', 'us-states', 'us-regions', 'uk-countries', 'uk-regions'],
  // US climate-region rollups only carry temp anomaly (no `actual`,
  // no precip/sunshine/frost), so suppress us-regions for everything else.
  'temp-actual':      ['countries', 'us-states', 'uk-countries', 'uk-regions'],
  'precip-anomaly':   ['us-states', 'uk-countries', 'uk-regions'],
  'precip-actual':    ['us-states', 'uk-countries', 'uk-regions'],
  // Sunshine + air-frost: Met Office UK only.
  'sunshine-anomaly': ['uk-countries', 'uk-regions'],
  'sunshine-actual':  ['uk-countries', 'uk-regions'],
  'frost-anomaly':    ['uk-countries', 'uk-regions'],
  'frost-actual':     ['uk-countries', 'uk-regions'],
};

export function metricSupportsLevel(metric: MetricKey, level: MapLevel): boolean {
  return METRIC_LEVELS[metric].includes(level);
}
