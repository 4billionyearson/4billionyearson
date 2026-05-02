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
    shortLabel: 'Temp anomaly', longLabel: 'Temperature anomaly',
    unit: '°C', baseline: 'vs 1961–1990',
    legendGradient: ANOMALY_GRADIENT, legendMin: '-5°C', legendMax: '+5°C',
    scale: { min: -5, max: 5 },
  },
  'temp-actual': {
    key: 'temp-actual', domain: 'temp', isAnomaly: false,
    shortLabel: 'Temp actual', longLabel: 'Average temperature',
    unit: '°C', baseline: 'observed',
    legendGradient:
      'linear-gradient(to right, #1e3a8a, #2563eb, #60a5fa, #f8fafc, #fde68a, #fb923c, #ea580c, #b91c1c)',
    legendMin: '-30°C', legendMax: '+35°C',
    scale: { min: -30, max: 35 },
  },
  'precip-anomaly': {
    key: 'precip-anomaly', domain: 'precip', isAnomaly: true,
    shortLabel: 'Precip anomaly', longLabel: 'Rainfall anomaly',
    unit: 'mm', baseline: 'vs 1991–2020',
    // Brown→white→teal: drier than normal = brown, wetter = teal/blue
    legendGradient:
      'linear-gradient(to right, #78350f, #b45309, #d97706, #fde68a, #f8fafc, #99f6e4, #14b8a6, #0f766e, #134e4a)',
    legendMin: '-100 mm', legendMax: '+100 mm',
    scale: { min: -100, max: 100 },
  },
  'precip-actual': {
    key: 'precip-actual', domain: 'precip', isAnomaly: false,
    shortLabel: 'Precip actual', longLabel: 'Rainfall',
    unit: 'mm', baseline: 'observed',
    legendGradient:
      'linear-gradient(to right, #fef3c7, #fde68a, #bef264, #34d399, #14b8a6, #0ea5e9, #1d4ed8, #1e3a8a)',
    legendMin: '0 mm', legendMax: '300 mm',
    scale: { min: 0, max: 300 },
  },
  'sunshine-anomaly': {
    key: 'sunshine-anomaly', domain: 'sunshine', isAnomaly: true,
    shortLabel: 'Sunshine anomaly', longLabel: 'Sunshine anomaly',
    unit: 'hrs', baseline: 'vs 1991–2020',
    // Dim→bright: blue (cloudy) → white → amber (sunnier)
    legendGradient:
      'linear-gradient(to right, #1e3a8a, #3b82f6, #93c5fd, #f8fafc, #fde68a, #f59e0b, #b45309, #78350f)',
    legendMin: '-50 hrs', legendMax: '+50 hrs',
    scale: { min: -50, max: 50 },
  },
  'sunshine-actual': {
    key: 'sunshine-actual', domain: 'sunshine', isAnomaly: false,
    shortLabel: 'Sunshine actual', longLabel: 'Sunshine',
    unit: 'hrs', baseline: 'observed',
    legendGradient:
      'linear-gradient(to right, #1e293b, #475569, #cbd5e1, #fde68a, #f59e0b, #d97706)',
    legendMin: '0 hrs', legendMax: '300 hrs',
    scale: { min: 0, max: 300 },
  },
  'frost-anomaly': {
    key: 'frost-anomaly', domain: 'frost', isAnomaly: true,
    shortLabel: 'Frost anomaly', longLabel: 'Frost-day anomaly',
    unit: 'days', baseline: 'vs 1991–2020',
    // Diverging: more frost = blue, fewer frost = red (warming signal).
    legendGradient:
      'linear-gradient(to right, #b91c1c, #fb923c, #fef3c7, #f8fafc, #bae6fd, #60a5fa, #1e3a8a)',
    legendMin: '-15 days', legendMax: '+15 days',
    scale: { min: -15, max: 15 },
  },
  'frost-actual': {
    key: 'frost-actual', domain: 'frost', isAnomaly: false,
    shortLabel: 'Frost actual', longLabel: 'Frost days',
    unit: 'days', baseline: 'observed',
    legendGradient:
      'linear-gradient(to right, #f8fafc, #bae6fd, #60a5fa, #2563eb, #1e3a8a)',
    legendMin: '0 days', legendMax: '30 days',
    scale: { min: 0, max: 30 },
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
const RAMP_PRECIP_ACTUAL = ['#fef3c7', '#fde68a', '#bef264', '#34d399', '#14b8a6', '#0ea5e9', '#1d4ed8', '#1e3a8a'];
const RAMP_SUNSHINE_ACTUAL = ['#1e293b', '#475569', '#cbd5e1', '#fde68a', '#f59e0b', '#d97706'];
const RAMP_FROST_ACTUAL = ['#f8fafc', '#bae6fd', '#60a5fa', '#2563eb', '#1e3a8a'];
// Frost anomaly: red(fewer)→white→blue(more). We feed positive=more frost = blue.
const RAMP_FROST_ANOMALY = ['#b91c1c', '#fb923c', '#fef3c7', '#f8fafc', '#bae6fd', '#60a5fa', '#1e3a8a'];
const RAMP_PRECIP_ANOMALY = ['#78350f', '#b45309', '#d97706', '#fde68a', '#f8fafc', '#99f6e4', '#14b8a6', '#0f766e', '#134e4a'];
const RAMP_SUNSHINE_ANOMALY = ['#1e3a8a', '#3b82f6', '#93c5fd', '#f8fafc', '#fde68a', '#f59e0b', '#b45309', '#78350f'];

const NO_DATA = '#1f2937';

export function colorForMetric(metric: MetricKey, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return NO_DATA;
  const cfg = METRICS[metric];
  const { min, max } = cfg.scale;
  const t = (value - min) / (max - min);
  switch (metric) {
    case 'temp-anomaly':
      return colorFromAnomaly(value);
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
export const GLOBAL_METRICS: MetricKey[] = ['temp-anomaly', 'temp-actual'];

// US national page: NOAA tavg + pcp at state level.
export const USA_METRICS: MetricKey[] = ['temp-anomaly', 'temp-actual', 'precip-anomaly', 'precip-actual'];

// UK page: full Met Office menu.
export const UK_METRICS: MetricKey[] = [
  'temp-anomaly', 'temp-actual',
  'precip-anomaly', 'precip-actual',
  'sunshine-anomaly', 'sunshine-actual',
  'frost-anomaly', 'frost-actual',
];
