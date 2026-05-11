"use client";

import React, { useMemo, useState } from 'react';
import { Thermometer, CloudRain, Sun, Snowflake } from 'lucide-react';
import type { MonthlyPoint, SpaghettiMetric } from './monthly-spaghetti-chart';

/* ────────────────────────────────────────────────────────────────────────────
 * The 4BYO Climate Spiral
 *
 * A radial / polar take on the year-on-year monthly chart. Each year is a
 * closed loop running Jan→Dec→Jan, with radius encoding the month's value.
 * Colour grades blue → red across the years. Two reference rings show the
 * 1961–90 baseline mean and the most recent decade mean. Paris +1.5/+2°C
 * rings (vs UK CET 1850–1900) appear in temperature mode.
 *
 * Companion panel (right, stacked on mobile) shows four small sparklines
 * for annual mean temperature / total rainfall / total sunshine / total
 * frost days, plus a compact records table.
 *
 * V1 scope: only rendered on /climate/uk for development & polish before
 * we generalise to other regions.
 * ──────────────────────────────────────────────────────────────────────── */

export type SeriesMap = Partial<Record<SpaghettiMetric, MonthlyPoint[]>>;

interface Props {
  series: SeriesMap;
  regionName: string;
  dataSource?: string;
  /** Months strictly later than this are provisional (dashed in spiral). */
  provisionalAfterMonth?: { year: number; month: number } | null;
  /** Anchor id for deep links. */
  sectionId?: string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TOGGLE_BASE = 'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors';
const TOGGLE_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]';
const TOGGLE_INACTIVE = 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';

const METRIC_ICON: Record<SpaghettiMetric, React.ReactNode> = {
  temp: <Thermometer className="h-3.5 w-3.5" />,
  precip: <CloudRain className="h-3.5 w-3.5" />,
  sunshine: <Sun className="h-3.5 w-3.5" />,
  frost: <Snowflake className="h-3.5 w-3.5" />,
};

const METRIC_LABEL: Record<SpaghettiMetric, string> = {
  temp: 'Temperature',
  precip: 'Rainfall',
  sunshine: 'Sunshine',
  frost: 'Frost',
};

const METRIC_UNIT: Record<SpaghettiMetric, string> = {
  temp: '°C',
  precip: 'mm',
  sunshine: 'hrs',
  frost: 'days',
};

const METRIC_DECIMALS: Record<SpaghettiMetric, number> = {
  temp: 1,
  precip: 0,
  sunshine: 0,
  frost: 1,
};

/** Aggregator used per metric for annual sparklines & record-year picking. */
const METRIC_AGG: Record<SpaghettiMetric, 'mean' | 'sum'> = {
  temp: 'mean',
  precip: 'sum',
  sunshine: 'sum',
  frost: 'sum',
};

const METRIC_ORDER: SpaghettiMetric[] = ['temp', 'precip', 'sunshine', 'frost'];

/* CET 1850–1900 monthly means (HadCET). Used only for Paris-ring placement
 * in UK temperature mode. */
const UK_PREINDUSTRIAL_MONTHLY: number[] = [
  3.3, 3.5, 5.0, 7.4, 10.3, 13.3, 15.1, 14.8, 12.7, 9.2, 5.5, 4.0,
];
const UK_PREINDUSTRIAL_ANNUAL = UK_PREINDUSTRIAL_MONTHLY.reduce((a, b) => a + b, 0) / 12;

/* ────────────────────────────────────────────────────────────────────────────
 * Colour helpers
 * ──────────────────────────────────────────────────────────────────────── */

function yearColor(year: number, minYear: number, maxYear: number, alpha = 1) {
  const t = maxYear === minYear ? 1 : (year - minYear) / (maxYear - minYear);
  let r: number, g: number, b: number;
  if (t < 0.4) {
    const u = t / 0.4;
    r = 42 + u * 30; g = 94 + u * 60; b = 184 - u * 60;
  } else if (t < 0.7) {
    const u = (t - 0.4) / 0.3;
    r = 72 + u * 168; g = 154 - u * 90; b = 124 - u * 84;
  } else {
    const u = (t - 0.7) / 0.3;
    r = 240 + u * 15; g = 64 - u * 40; b = 40 - u * 25;
  }
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
}

/* Season palette matching the shifting-seasons page. */
const SEASON_COLORS = {
  winter: '#BAE6FD', // ice-blue
  spring: '#86EFAC', // green
  summer: '#FDE68A', // warm gold
  autumn: '#FDBA74', // amber
};
function seasonForMonth(m: number): keyof typeof SEASON_COLORS {
  // 0-indexed month
  if (m <= 1 || m === 11) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

/* ────────────────────────────────────────────────────────────────────────────
 * Polar geometry helpers
 * ──────────────────────────────────────────────────────────────────────── */

const VB = 600;        // viewBox size
const CX = VB / 2;
const CY = VB / 2;
const R_OUTER = 240;   // outermost data ring
const R_LABEL = 268;   // month label radius

function monthAngle(m: number): number {
  // m 0..11, Jan at top, clockwise
  return (m / 12) * Math.PI * 2 - Math.PI / 2;
}

function polar(r: number, ang: number): [number, number] {
  return [CX + Math.cos(ang) * r, CY + Math.sin(ang) * r];
}

/* Closed Catmull-Rom-ish smooth path through 12 monthly points.
 * Each point is [x, y]. Wraps Dec → Jan. */
function smoothClosedPath(points: [number, number][]): string {
  const n = points.length;
  if (n === 0) return '';
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d + ' Z';
}

/* ────────────────────────────────────────────────────────────────────────────
 * Data shaping
 * ──────────────────────────────────────────────────────────────────────── */

type YearMap = Map<number, number[]>; // year → 12-length array (nulls become NaN)
type Provisional = Map<number, Set<number>>; // year → set of provisional months

function buildYearMap(points: MonthlyPoint[] | undefined, provAfter: { year: number; month: number } | null) {
  const out: YearMap = new Map();
  const prov: Provisional = new Map();
  if (!points?.length) return { yearMap: out, prov, minYear: 0, maxYear: 0 };
  for (const p of points) {
    if (!out.has(p.year)) out.set(p.year, Array(12).fill(NaN));
    out.get(p.year)![p.month - 1] = p.value;
    const isPastSnap = provAfter
      ? p.year > provAfter.year || (p.year === provAfter.year && p.month > provAfter.month)
      : false;
    if (p.provisional || isPastSnap) {
      if (!prov.has(p.year)) prov.set(p.year, new Set());
      prov.get(p.year)!.add(p.month - 1);
    }
  }
  const years = [...out.keys()].sort((a, b) => a - b);
  return { yearMap: out, prov, minYear: years[0] ?? 0, maxYear: years[years.length - 1] ?? 0 };
}

/* Compute mean monthly profile across a year-range (inclusive). */
function monthlyMeanProfile(yearMap: YearMap, yFrom: number, yTo: number): number[] {
  const result: number[] = [];
  for (let m = 0; m < 12; m++) {
    let s = 0; let n = 0;
    for (let y = yFrom; y <= yTo; y++) {
      const arr = yearMap.get(y);
      if (!arr) continue;
      const v = arr[m];
      if (Number.isFinite(v)) { s += v; n++; }
    }
    result.push(n > 0 ? s / n : NaN);
  }
  return result;
}

/* Annual aggregate per year (mean or sum across 12 months; needs full year). */
function annualAggregate(yearMap: YearMap, agg: 'mean' | 'sum'): Map<number, number> {
  const out = new Map<number, number>();
  for (const [y, arr] of yearMap.entries()) {
    if (arr.some((v) => !Number.isFinite(v))) continue;
    const s = arr.reduce((a, b) => a + b, 0);
    out.set(y, agg === 'mean' ? s / 12 : s);
  }
  return out;
}

/* Per-year fractional month at which temperature first rises through the
 * threshold (spring crossing) and first falls back below it (autumn crossing).
 * Returns NaN when the threshold isn't crossed (anomalously cold/warm year).
 * Northern-hemisphere only — fine for UK; if we extend to tropical regions
 * later this needs the wrap-around logic from shift-analysis.ts. */
function computeYearCrossings(
  yearMap: YearMap,
  threshold: number,
): Map<number, { spring: number; autumn: number }> {
  const out = new Map<number, { spring: number; autumn: number }>();
  for (const [y, arr] of yearMap.entries()) {
    if (arr.some((v) => !Number.isFinite(v))) continue;
    let spring = NaN; let autumn = NaN;
    for (let m = 1; m <= 6; m++) {
      if (arr[m - 1] < threshold && arr[m] >= threshold) {
        const frac = (threshold - arr[m - 1]) / (arr[m] - arr[m - 1]);
        spring = (m - 1) + frac;
        break;
      }
    }
    for (let m = 7; m <= 11; m++) {
      if (arr[m - 1] >= threshold && arr[m] < threshold) {
        const frac = (arr[m - 1] - threshold) / (arr[m - 1] - arr[m]);
        autumn = (m - 1) + frac;
        break;
      }
    }
    if (Number.isFinite(spring) && Number.isFinite(autumn)) {
      out.set(y, { spring, autumn });
    }
  }
  return out;
}

/* Group crossings into 10-year buckets and return their mean position. */
function decadalCrossings(
  crossings: Map<number, { spring: number; autumn: number }>,
): Array<{ decade: number; spring: number; autumn: number; count: number }> {
  const buckets = new Map<number, { sp: number[]; au: number[] }>();
  for (const [y, c] of crossings.entries()) {
    const d = Math.floor(y / 10) * 10;
    if (!buckets.has(d)) buckets.set(d, { sp: [], au: [] });
    buckets.get(d)!.sp.push(c.spring);
    buckets.get(d)!.au.push(c.autumn);
  }
  return [...buckets.entries()]
    .filter(([, b]) => b.sp.length >= 3)
    .sort((a, b) => a[0] - b[0])
    .map(([d, b]) => ({
      decade: d,
      spring: b.sp.reduce((a, c) => a + c, 0) / b.sp.length,
      autumn: b.au.reduce((a, c) => a + c, 0) / b.au.length,
      count: b.sp.length,
    }));
}

/* Per-year seasonal aggregate. Winter = DJF (uses Dec from year y-1, Jan+Feb of y). */
function seasonalAggregate(
  yearMap: YearMap,
  season: 'DJF' | 'MAM' | 'JJA' | 'SON',
  agg: 'mean' | 'sum',
): Map<number, number> {
  const out = new Map<number, number>();
  if (season === 'DJF') {
    for (const [y, arr] of yearMap.entries()) {
      const prev = yearMap.get(y - 1);
      if (!prev) continue;
      const vals = [prev[11], arr[0], arr[1]];
      if (!vals.every(Number.isFinite)) continue;
      const s = vals[0] + vals[1] + vals[2];
      out.set(y, agg === 'mean' ? s / 3 : s);
    }
  } else {
    const months = season === 'MAM' ? [2, 3, 4] : season === 'JJA' ? [5, 6, 7] : [8, 9, 10];
    for (const [y, arr] of yearMap.entries()) {
      const vals = months.map((m) => arr[m]);
      if (!vals.every(Number.isFinite)) continue;
      const s = vals.reduce((a, b) => a + b, 0);
      out.set(y, agg === 'mean' ? s / 3 : s);
    }
  }
  return out;
}

/* Per-year value for a single month (0-indexed). */
function monthlySeries(yearMap: YearMap, monthIdx: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const [y, arr] of yearMap.entries()) {
    if (Number.isFinite(arr[monthIdx])) out.set(y, arr[monthIdx]);
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Main component
 * ──────────────────────────────────────────────────────────────────────── */

export default function ClimateSpiralCard({
  series,
  regionName,
  dataSource,
  provisionalAfterMonth = null,
  sectionId = 'climate-spiral',
}: Props) {
  const available = METRIC_ORDER.filter((m) => (series[m]?.length ?? 0) > 0);
  const fallback: SpaghettiMetric = available[0] ?? 'temp';
  const [metric, setMetric] = useState<SpaghettiMetric>(fallback);
  const [anomaly, setAnomaly] = useState(false);
  const [showSeasons, setShowSeasons] = useState(true);
  const [highlightRecent, setHighlightRecent] = useState(true);
  const [showParis, setShowParis] = useState(true);
  const [showShiftTrail, setShowShiftTrail] = useState(true);
  const [yearFrom, setYearFrom] = useState<number | null>(null);

  const points = series[metric] ?? [];
  const { yearMap, prov, minYear, maxYear } = useMemo(
    () => buildYearMap(points, provisionalAfterMonth),
    [points, provisionalAfterMonth],
  );

  // Reset yearFrom when metric changes (different series may have different min).
  React.useEffect(() => {
    setYearFrom(null);
  }, [metric]);

  const effectiveFromYear = yearFrom ?? Math.max(minYear, 1950);

  /* Reference periods */
  const baselineFrom = 1961;
  const baselineTo = 1990;
  const recentTo = Math.min(maxYear, new Date().getFullYear() - 1);
  const recentFrom = Math.max(recentTo - 9, minYear);

  const meanBaseline = useMemo(
    () => monthlyMeanProfile(yearMap, baselineFrom, baselineTo),
    [yearMap],
  );
  const meanRecent = useMemo(
    () => monthlyMeanProfile(yearMap, recentFrom, recentTo),
    [yearMap, recentFrom, recentTo],
  );

  /* Value→radius scale: derive from data extent across all years to be drawn. */
  const { rMin, rMax, currentYear, recordYear } = useMemo(() => {
    if (!yearMap.size) return { rMin: 0, rMax: 1, currentYear: 0, recordYear: 0 };
    const calYear = new Date().getFullYear();
    const calMonth = new Date().getMonth() + 1;
    let lo = Infinity, hi = -Infinity;
    for (const [y, arr] of yearMap.entries()) {
      if (y < effectiveFromYear) continue;
      arr.forEach((v, mi) => {
        if (!Number.isFinite(v)) return;
        // Skip provisional future months of the current year for scaling.
        if (y === calYear && mi + 1 >= calMonth && !arr[mi]) return;
        const adj = anomaly && Number.isFinite(meanBaseline[mi]) ? v - meanBaseline[mi] : v;
        if (adj < lo) lo = adj;
        if (adj > hi) hi = adj;
      });
    }
    // Pick record year by metric's aggregate
    const annual = annualAggregate(yearMap, METRIC_AGG[metric]);
    let best = -Infinity; let bestY = 0;
    for (const [y, v] of annual.entries()) {
      if (y === calYear) continue;
      if (v > best) { best = v; bestY = y; }
    }
    return {
      rMin: lo === Infinity ? 0 : lo,
      rMax: hi === -Infinity ? 1 : hi,
      currentYear: calYear,
      recordYear: bestY,
    };
  }, [yearMap, effectiveFromYear, anomaly, meanBaseline, metric]);

  /* For temp+absolute, anchor scale at sensible bounds so 0°C reads naturally. */
  const scaleMin = anomaly
    ? Math.min(rMin - 0.5, -2)
    : metric === 'temp'
      ? Math.min(rMin - 0.5, -1)
      : 0;
  const scaleMax = anomaly
    ? Math.max(rMax + 0.5, 2.5)
    : rMax * 1.05;

  function valueToR(v: number, monthIdx: number): number {
    const adj = anomaly && Number.isFinite(meanBaseline[monthIdx]) ? v - meanBaseline[monthIdx] : v;
    if (!Number.isFinite(adj)) return NaN;
    const t = (adj - scaleMin) / (scaleMax - scaleMin);
    return Math.max(0, Math.min(R_OUTER, t * R_OUTER));
  }

  /* Build the polyline points for a given year's 12 monthly values. */
  function yearToPoints(arr: number[]): [number, number][] | null {
    const pts: [number, number][] = [];
    for (let m = 0; m < 12; m++) {
      const v = arr[m];
      if (!Number.isFinite(v)) return null;
      const r = valueToR(v, m);
      pts.push(polar(r, monthAngle(m)));
    }
    return pts;
  }

  /* Decide which years to render in background vs highlight. */
  const renderYears = useMemo(() => {
    const out: number[] = [];
    for (const y of yearMap.keys()) {
      if (y < effectiveFromYear) continue;
      out.push(y);
    }
    out.sort((a, b) => a - b);
    return out;
  }, [yearMap, effectiveFromYear]);

  /* Gridlines */
  const gridTicks = useMemo(() => {
    const ticks: number[] = [];
    const range = scaleMax - scaleMin;
    if (range <= 0) return ticks;
    let step: number;
    if (metric === 'temp') step = anomaly ? 1 : 5;
    else if (metric === 'precip') step = 50;
    else if (metric === 'sunshine') step = 50;
    else step = 5; // frost days
    const first = Math.ceil(scaleMin / step) * step;
    for (let v = first; v <= scaleMax; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [scaleMin, scaleMax, metric, anomaly]);

  function tickToR(v: number): number {
    const t = (v - scaleMin) / (scaleMax - scaleMin);
    return Math.max(0, Math.min(R_OUTER, t * R_OUTER));
  }

  /* Paris rings (UK temp only). */
  const parisRings = useMemo(() => {
    if (metric !== 'temp' || !showParis) return [];
    if (anomaly) {
      // Offset between 1961-90 mean and 1850-1900 mean (UK CET annual):
      const baselineAnnual = meanBaseline.reduce((a, b) => a + b, 0) / 12;
      const offset = baselineAnnual - UK_PREINDUSTRIAL_ANNUAL; // ~0.7°C for UK
      return [
        { label: 'Paris +1.5°C', anomaly: 1.5 - offset },
        { label: 'Paris +2°C', anomaly: 2.0 - offset },
      ];
    }
    // Absolute mode: rings at constant annual temps relative to pre-industrial.
    return [
      { label: 'Paris +1.5°C', absolute: UK_PREINDUSTRIAL_ANNUAL + 1.5 },
      { label: 'Paris +2°C', absolute: UK_PREINDUSTRIAL_ANNUAL + 2.0 },
    ];
  }, [metric, showParis, anomaly, meanBaseline]);

  /* Decadal seasonal-shift trail (temp + absolute mode only).
   * For each year, find when the monthly temperature first crosses the 10°C
   * growing-season threshold upward (spring) and back downward (autumn).
   * Aggregate into decades and plot on the 10°C ring. */
  const SHIFT_THRESHOLD = 10;
  const shiftDecades = useMemo(() => {
    if (metric !== 'temp' || anomaly || !showShiftTrail) return [];
    const crossings = computeYearCrossings(yearMap, SHIFT_THRESHOLD);
    return decadalCrossings(crossings);
  }, [metric, anomaly, showShiftTrail, yearMap]);

  /* ───────────── Sparklines + records (right panel) ───────────── */
  const annuals = useMemo(() => {
    const out: Partial<Record<SpaghettiMetric, { year: number; value: number }[]>> = {};
    for (const m of available) {
      const map = buildYearMap(series[m]!, provisionalAfterMonth).yearMap;
      const annual = annualAggregate(map, METRIC_AGG[m]);
      const arr = [...annual.entries()].sort((a, b) => a[0] - b[0]).map(([y, v]) => ({ year: y, value: v }));
      out[m] = arr;
    }
    return out;
  }, [series, available, provisionalAfterMonth]);

  /* ───────────────── Render ───────────────── */
  return (
    <div id={sectionId} className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E] scroll-mt-24">
      <h3 className="text-xl font-bold font-mono text-white mb-1 flex items-start gap-2">
        <span className="shrink-0 mt-1 text-[#D0A65E]">{METRIC_ICON[metric]}</span>
        <span className="min-w-0 flex-1">{regionName} – The 4BYO Climate Spiral</span>
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Every year is a closed loop running Jan→Dec, with the radius set by that month&apos;s value.
        Blue years are older, red years more recent. The 1961–90 baseline mean ring sits inside the
        most recent decade&apos;s ring, so any gap between them <em>is</em> climate change. On the
        temperature view, the optional season-shift trail traces how the 10°C growing-season
        threshold has crept earlier in spring and later in autumn, decade by decade.
      </p>

      {/* Metric tabs */}
      {available.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mr-1">Metric</span>
          {available.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              aria-pressed={metric === m}
              className={`${TOGGLE_BASE} ${metric === m ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
            >
              {METRIC_ICON[m]}
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
        {/* ─── Left: Spiral chart ───────────────────────────────────────── */}
        <div>
          <div className="w-full max-w-[600px] mx-auto">
            <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-auto select-none">
              {/* Season-wedge background */}
              {showSeasons && (
                <g opacity={0.18}>
                  {Array.from({ length: 12 }, (_, m) => {
                    const a1 = monthAngle(m) - Math.PI / 12;
                    const a2 = monthAngle(m) + Math.PI / 12;
                    const r = R_OUTER + 4;
                    const [x1, y1] = polar(r, a1);
                    const [x2, y2] = polar(r, a2);
                    const fill = SEASON_COLORS[seasonForMonth(m)];
                    return (
                      <path
                        key={`wedge-${m}`}
                        d={`M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`}
                        fill={fill}
                      />
                    );
                  })}
                </g>
              )}

              {/* Grid rings + tick labels */}
              {gridTicks.map((t) => {
                const r = tickToR(t);
                const isZero = anomaly && t === 0;
                return (
                  <g key={`ring-${t}`}>
                    <circle
                      cx={CX} cy={CY} r={r}
                      fill="none"
                      stroke={isZero ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.09)'}
                      strokeWidth={isZero ? 1 : 0.5}
                      strokeDasharray={isZero ? '0' : '3 5'}
                    />
                    <text
                      x={CX + r + 4} y={CY - 3}
                      fontSize={9} fill="rgba(255,255,255,0.32)"
                      fontFamily="ui-monospace, monospace"
                    >
                      {anomaly && t > 0 ? '+' : ''}{t}{metric === 'temp' ? '°' : ''}
                    </text>
                  </g>
                );
              })}

              {/* Month spokes */}
              {Array.from({ length: 12 }, (_, m) => {
                const ang = monthAngle(m);
                const [x1, y1] = polar(0, ang);
                const [x2, y2] = polar(R_OUTER + 5, ang);
                return (
                  <line
                    key={`spoke-${m}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(255,255,255,0.07)" strokeWidth={0.5}
                  />
                );
              })}

              {/* Paris rings — labels offset to upper-left diagonal to avoid the
                   Jan label, right-side tick labels, and other Paris ring. */}
              {parisRings.map((ring, i) => {
                const r = anomaly
                  ? tickToR((ring as { anomaly: number }).anomaly)
                  : tickToR((ring as { absolute: number }).absolute);
                if (!Number.isFinite(r) || r <= 0 || r > R_OUTER) return null;
                const color = i === 0 ? '#FBBF24' : '#EF4444';
                // i=0 → upper-left at 10 o'clock, i=1 → 8 o'clock (further down/left)
                const labelAng = i === 0 ? -Math.PI * 0.75 : -Math.PI * 0.82;
                const [lx, ly] = polar(r, labelAng);
                return (
                  <g key={`paris-${i}`}>
                    <circle cx={CX} cy={CY} r={r} fill="none" stroke={color} strokeWidth={1.1} strokeDasharray="2 4" opacity={0.75} />
                    <text
                      x={lx - 6} y={ly - 4}
                      fontSize={9} fill={color}
                      textAnchor="end"
                      fontFamily="ui-monospace, monospace"
                    >
                      {ring.label}
                    </text>
                  </g>
                );
              })}

              {/* Background year-spaghetti */}
              {renderYears.map((y) => {
                if (y === recordYear || y === currentYear) return null;
                if (highlightRecent && y >= recentFrom) return null;
                const arr = yearMap.get(y)!;
                const pts = yearToPoints(arr);
                if (!pts) return null;
                return (
                  <path
                    key={`bg-${y}`}
                    d={smoothClosedPath(pts)}
                    fill="none"
                    stroke={yearColor(y, minYear, maxYear, 0.32)}
                    strokeWidth={0.7}
                  />
                );
              })}

              {/* Recent-decade highlight */}
              {highlightRecent && renderYears
                .filter((y) => y >= recentFrom && y !== recordYear && y !== currentYear)
                .map((y) => {
                  const arr = yearMap.get(y)!;
                  const pts = yearToPoints(arr);
                  if (!pts) return null;
                  return (
                    <path
                      key={`hi-${y}`}
                      d={smoothClosedPath(pts)}
                      fill="none"
                      stroke={yearColor(y, minYear, maxYear, 0.85)}
                      strokeWidth={1.4}
                    />
                  );
                })}

              {/* Baseline 1961–90 ring */}
              {meanBaseline.every(Number.isFinite) && (() => {
                const pts: [number, number][] = meanBaseline.map((v, m) => polar(valueToR(v, m), monthAngle(m)));
                return (
                  <path
                    d={smoothClosedPath(pts)}
                    fill="none"
                    stroke="rgba(200,210,225,0.85)"
                    strokeWidth={1.6}
                    strokeDasharray="5 4"
                  />
                );
              })()}

              {/* Recent decade ring */}
              {meanRecent.every(Number.isFinite) && (() => {
                const pts: [number, number][] = meanRecent.map((v, m) => polar(valueToR(v, m), monthAngle(m)));
                return (
                  <path
                    d={smoothClosedPath(pts)}
                    fill="none"
                    stroke="#FCA5A5"
                    strokeWidth={1.6}
                    strokeDasharray="5 4"
                  />
                );
              })()}

              {/* Decadal seasonal-shift trail (temp + absolute only).
                   Each decade contributes a spring-crossing and autumn-crossing
                   dot, sitting on the 10°C ring. Connected by a coloured curve. */}
              {shiftDecades.length >= 2 && (() => {
                const r10 = valueToR(SHIFT_THRESHOLD, 3); // m=3 (April) representative; valueToR ignores m in absolute mode
                if (!Number.isFinite(r10) || r10 <= 0) return null;
                const springPts: [number, number, number][] = shiftDecades.map((d) => {
                  const [x, y] = polar(r10, monthAngle(d.spring));
                  return [x, y, d.decade];
                });
                const autumnPts: [number, number, number][] = shiftDecades.map((d) => {
                  const [x, y] = polar(r10, monthAngle(d.autumn));
                  return [x, y, d.decade];
                });
                const minD = shiftDecades[0].decade;
                const maxD = shiftDecades[shiftDecades.length - 1].decade;
                // Build polyline path (each segment colourable; using a single
                // path with averaged colour keeps SVG light).
                const springPath = springPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
                const autumnPath = autumnPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
                return (
                  <g>
                    {/* Ghost 10°C ring */}
                    <circle cx={CX} cy={CY} r={r10} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.6} strokeDasharray="2 6" />
                    <text x={CX + r10 - 4} y={CY - 4} fontSize={8.5} fill="rgba(180,210,200,0.65)" textAnchor="end" fontFamily="ui-monospace, monospace">10°C threshold</text>
                    {/* Spring trail */}
                    <path d={springPath} fill="none" stroke="rgba(160,180,210,0.55)" strokeWidth={1.2} strokeLinecap="round" />
                    {/* Autumn trail */}
                    <path d={autumnPath} fill="none" stroke="rgba(160,180,210,0.55)" strokeWidth={1.2} strokeLinecap="round" />
                    {/* Per-decade dots, year-coloured */}
                    {springPts.map(([x, y, dec], i) => (
                      <circle key={`sp-${dec}`} cx={x} cy={y} r={i === 0 || i === springPts.length - 1 ? 3.6 : 2.6} fill={yearColor(dec + 5, minD, maxD, 0.95)} stroke="#0b0e16" strokeWidth={0.6} />
                    ))}
                    {autumnPts.map(([x, y, dec], i) => (
                      <circle key={`au-${dec}`} cx={x} cy={y} r={i === 0 || i === autumnPts.length - 1 ? 3.6 : 2.6} fill={yearColor(dec + 5, minD, maxD, 0.95)} stroke="#0b0e16" strokeWidth={0.6} />
                    ))}
                    {/* Endpoint labels: oldest & newest decade */}
                    {(() => {
                      const first = shiftDecades[0];
                      const last = shiftDecades[shiftDecades.length - 1];
                      const [sx0, sy0] = polar(r10 - 14, monthAngle(first.spring));
                      const [sx1, sy1] = polar(r10 - 14, monthAngle(last.spring));
                      const [ax0, ay0] = polar(r10 - 14, monthAngle(first.autumn));
                      const [ax1, ay1] = polar(r10 - 14, monthAngle(last.autumn));
                      return (
                        <g fontFamily="ui-monospace, monospace" fontSize={8.5}>
                          <text x={sx0} y={sy0} fill={yearColor(first.decade + 5, minD, maxD, 0.95)} textAnchor="middle">{first.decade}s</text>
                          <text x={sx1} y={sy1} fill={yearColor(last.decade + 5, minD, maxD, 0.95)} textAnchor="middle">{last.decade}s</text>
                          <text x={ax0} y={ay0} fill={yearColor(first.decade + 5, minD, maxD, 0.95)} textAnchor="middle">{first.decade}s</text>
                          <text x={ax1} y={ay1} fill={yearColor(last.decade + 5, minD, maxD, 0.95)} textAnchor="middle">{last.decade}s</text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })()}

              {/* Record year (warmest/wettest etc.) */}
              {recordYear > 0 && yearMap.get(recordYear) && (() => {
                const arr = yearMap.get(recordYear)!;
                const pts = yearToPoints(arr);
                if (!pts) return null;
                return (
                  <path
                    d={smoothClosedPath(pts)}
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth={2.4}
                    opacity={0.95}
                  />
                );
              })()}

              {/* Current year (Jan→latest completed month, open path) */}
              {yearMap.get(currentYear) && (() => {
                const arr = yearMap.get(currentYear)!;
                const provSet = prov.get(currentYear) ?? new Set();
                const provPts: { m: number; r: number; provisional: boolean }[] = [];
                for (let m = 0; m < 12; m++) {
                  const v = arr[m];
                  if (!Number.isFinite(v)) break;
                  provPts.push({ m, r: valueToR(v, m), provisional: provSet.has(m) });
                }
                if (provPts.length < 2) return null;
                const segs: string[] = [];
                let prev: { x: number; y: number } | null = null;
                for (const p of provPts) {
                  const [x, y] = polar(p.r, monthAngle(p.m));
                  if (prev) segs.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
                  else segs.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
                  prev = { x, y };
                }
                return (
                  <g>
                    <path
                      d={segs.join(' ')}
                      fill="none"
                      stroke="#F97316"
                      strokeWidth={2.6}
                      strokeLinecap="round"
                    />
                    {provPts.map((p) => {
                      const [x, y] = polar(p.r, monthAngle(p.m));
                      return (
                        <circle
                          key={`cur-${p.m}`}
                          cx={x} cy={y} r={p.provisional ? 3 : 2.5}
                          fill={p.provisional ? '#FED7AA' : '#F97316'}
                          stroke="#7C2D12" strokeWidth={0.5}
                        />
                      );
                    })}
                  </g>
                );
              })()}

              {/* Month labels (outside the rings) */}
              {Array.from({ length: 12 }, (_, m) => {
                const ang = monthAngle(m);
                const [x, y] = polar(R_LABEL, ang);
                return (
                  <text
                    key={`mlab-${m}`}
                    x={x} y={y}
                    fontSize={13}
                    fontWeight={600}
                    fill="rgba(220,225,235,0.85)"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="ui-monospace, monospace"
                  >
                    {MONTH_LABELS[m]}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Controls under the chart */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-gray-300">
            <label className="inline-flex items-center gap-2">
              <span className="uppercase tracking-wider text-[10px] text-gray-500">From</span>
              <input
                type="range"
                min={minYear}
                max={Math.max(minYear, maxYear - 10)}
                step={5}
                value={effectiveFromYear}
                onChange={(e) => setYearFrom(Number(e.target.value))}
                className="accent-[#D0A65E] w-24"
              />
              <span className="font-mono text-[#FFF5E7] min-w-[3ch]">{effectiveFromYear}</span>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={anomaly} onChange={(e) => setAnomaly(e.target.checked)} className="accent-[#D0A65E]" />
              Anomaly (vs 1961–90)
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={highlightRecent} onChange={(e) => setHighlightRecent(e.target.checked)} className="accent-[#D0A65E]" />
              Highlight {recentFrom}–{recentTo}
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={showSeasons} onChange={(e) => setShowSeasons(e.target.checked)} className="accent-[#D0A65E]" />
              Season tints
            </label>
            {metric === 'temp' && (
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={showParis} onChange={(e) => setShowParis(e.target.checked)} className="accent-[#D0A65E]" />
                Paris rings
              </label>
            )}
            {metric === 'temp' && !anomaly && (
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={showShiftTrail} onChange={(e) => setShowShiftTrail(e.target.checked)} className="accent-[#D0A65E]" />
                Season-shift trail
              </label>
            )}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-6" style={{ background: 'linear-gradient(90deg,#2a5eb8,#e8440a)' }} />
              {minYear} → {maxYear}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-6 border-t border-dashed" style={{ borderColor: 'rgba(200,210,225,0.85)' }} />
              1961–90 mean
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-6 border-t border-dashed" style={{ borderColor: '#FCA5A5' }} />
              {recentFrom}–{recentTo} mean
            </span>
            {recordYear > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-6" style={{ background: '#DC2626' }} />
                Record year ({recordYear})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-6" style={{ background: '#F97316' }} />
              {currentYear} so far
            </span>
            {shiftDecades.length >= 2 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#94A3B8' }} />
                10°C crossing per decade
              </span>
            )}
          </div>
        </div>

        {/* ─── Right: Sparklines + records ──────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {METRIC_ORDER.filter((m) => annuals[m]?.length).map((m) => (
              <Sparkline
                key={m}
                title={METRIC_LABEL[m]}
                data={annuals[m]!}
                color={m === 'temp' ? '#F97316' : m === 'precip' ? '#38BDF8' : m === 'sunshine' ? '#FBBF24' : '#A5F3FC'}
                unit={METRIC_UNIT[m]}
                decimals={METRIC_DECIMALS[m]}
                active={metric === m}
                onSelect={() => setMetric(m)}
              />
            ))}
          </div>
          <RecordsTable
            metric={metric}
            yearMap={yearMap}
            currentYear={currentYear}
          />
        </div>
      </div>

      {dataSource && (
        <p className="text-[11px] text-gray-500 mt-4">{dataSource} · Paris rings vs UK CET 1850–1900 baseline.</p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Sparkline (annual aggregate)
 * ──────────────────────────────────────────────────────────────────────── */

function Sparkline({
  title, data, color, unit, decimals, active, onSelect,
}: {
  title: string;
  data: { year: number; value: number }[];
  color: string;
  unit: string;
  decimals: number;
  active: boolean;
  onSelect: () => void;
}) {
  const w = 200; const h = 64; const pad = 6;
  if (data.length < 2) {
    return (
      <button type="button" onClick={onSelect} className={`text-left rounded-lg border p-2 ${active ? 'border-[#D0A65E]/55 bg-[#D0A65E]/12' : 'border-gray-800 bg-gray-900/40 hover:border-[#D0A65E]/30'}`}>
        <div className="text-[10px] uppercase tracking-wider text-gray-500">{title}</div>
        <div className="text-xs text-gray-500 mt-2">No annual series</div>
      </button>
    );
  }
  const vals = data.map((d) => d.value);
  const ymin = Math.min(...vals); const ymax = Math.max(...vals);
  const ys = data.map((d) => d.year);
  const xmin = Math.min(...ys); const xmax = Math.max(...ys);
  const px = (yr: number) => pad + ((yr - xmin) / Math.max(1, xmax - xmin)) * (w - 2 * pad);
  const py = (v: number) => h - pad - ((v - ymin) / Math.max(1e-9, ymax - ymin)) * (h - 2 * pad);

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(d.year).toFixed(2)} ${py(d.value).toFixed(2)}`).join(' ');
  const last = data[data.length - 1];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-lg border p-2 transition-colors ${active ? 'border-[#D0A65E]/55 bg-[#D0A65E]/12' : 'border-gray-800 bg-gray-900/40 hover:border-[#D0A65E]/30 hover:bg-white/[0.03]'}`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-500">{title}</span>
        <span className="text-[10px] text-gray-400 font-mono">{last.value.toFixed(decimals)} {unit}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12 mt-1">
        <path d={path} fill="none" stroke={color} strokeWidth={1.4} />
        <circle cx={px(last.year)} cy={py(last.value)} r={2.2} fill={color} />
      </svg>
      <div className="flex justify-between text-[9.5px] text-gray-500 font-mono">
        <span>{xmin}</span>
        <span>{xmax}</span>
      </div>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Records table
 * ──────────────────────────────────────────────────────────────────────── */

function RecordsTable({
  metric, yearMap, currentYear,
}: {
  metric: SpaghettiMetric;
  yearMap: YearMap;
  currentYear: number;
}) {
  const agg = METRIC_AGG[metric];
  const unit = METRIC_UNIT[metric];
  const dec = METRIC_DECIMALS[metric];
  const [view, setView] = useState<'year' | 'seasons' | 'months'>('year');

  const highLabel = metric === 'temp' ? 'Warmest' : metric === 'precip' ? 'Wettest' : metric === 'sunshine' ? 'Sunniest' : 'Frostiest';
  const lowLabel = metric === 'temp' ? 'Coldest' : metric === 'precip' ? 'Driest' : metric === 'sunshine' ? 'Dullest' : 'Mildest';

  /* ── Year-view ─────────────────────────────────────────────────────── */
  const yearRows = useMemo(() => {
    const annual = annualAggregate(yearMap, agg);
    const entries = [...annual.entries()];
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const high = sorted[0];
    const low = sorted[sorted.length - 1];
    const curArr = yearMap.get(currentYear);
    let ytdRank: { rank: number; total: number; value: number } | null = null;
    if (curArr) {
      const ytdMonths: number[] = [];
      curArr.forEach((v) => { if (Number.isFinite(v)) ytdMonths.push(v); });
      if (ytdMonths.length >= 2) {
        const ytdValue = agg === 'mean'
          ? ytdMonths.reduce((a, b) => a + b, 0) / ytdMonths.length
          : ytdMonths.reduce((a, b) => a + b, 0);
        const N = ytdMonths.length;
        const scores: { year: number; v: number }[] = [];
        for (const [y, arr] of yearMap.entries()) {
          if (y === currentYear) continue;
          const slice = arr.slice(0, N);
          if (slice.some((v) => !Number.isFinite(v))) continue;
          const s = agg === 'mean' ? slice.reduce((a, b) => a + b, 0) / N : slice.reduce((a, b) => a + b, 0);
          scores.push({ year: y, v: s });
        }
        scores.sort((a, b) => b.v - a.v);
        const rank = scores.filter((s) => s.v > ytdValue).length + 1;
        ytdRank = { rank, total: scores.length + 1, value: ytdValue };
      }
    }
    return { high, low, ytdRank };
  }, [yearMap, agg, currentYear]);

  /* ── Seasons-view ──────────────────────────────────────────────────── */
  const seasonRows = useMemo(() => {
    const seasons: Array<{ key: 'DJF' | 'MAM' | 'JJA' | 'SON'; label: string }> = [
      { key: 'DJF', label: 'Winter' },
      { key: 'MAM', label: 'Spring' },
      { key: 'JJA', label: 'Summer' },
      { key: 'SON', label: 'Autumn' },
    ];
    return seasons.map((s) => {
      const map = seasonalAggregate(yearMap, s.key, agg);
      const entries = [...map.entries()];
      if (entries.length === 0) return { ...s, high: null as null | [number, number], low: null as null | [number, number] };
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      return { ...s, high: sorted[0], low: sorted[sorted.length - 1] };
    });
  }, [yearMap, agg]);

  /* ── Months-view ───────────────────────────────────────────────────── */
  const monthRows = useMemo(() => {
    return MONTH_LABELS.map((label, m) => {
      const map = monthlySeries(yearMap, m);
      const entries = [...map.entries()];
      if (entries.length === 0) return { label, high: null as null | [number, number], low: null as null | [number, number] };
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      return { label, high: sorted[0], low: sorted[sorted.length - 1] };
    });
  }, [yearMap]);

  if (!yearRows) return null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h4 className="text-[10px] uppercase tracking-wider text-gray-500">
          {METRIC_LABEL[metric]} Records
        </h4>
        <div className="inline-flex rounded-md border border-gray-700 overflow-hidden text-[10px]">
          {(['year', 'seasons', 'months'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-2 py-0.5 transition-colors ${view === v ? 'bg-[#D0A65E]/15 text-[#FFF5E7]' : 'text-gray-400 hover:bg-white/[0.04]'}`}
            >
              {v === 'year' ? 'Year' : v === 'seasons' ? 'Seasons' : 'Months'}
            </button>
          ))}
        </div>
      </div>

      {view === 'year' && (
        <table className="w-full text-xs">
          <tbody className="font-mono">
            <tr className="border-b border-gray-800/60">
              <td className="py-1 text-gray-400">{highLabel} year</td>
              <td className="py-1 text-right text-red-300">{yearRows.high[0]}</td>
              <td className="py-1 text-right text-gray-300 tabular-nums">{yearRows.high[1].toFixed(dec)} {unit}</td>
            </tr>
            <tr className="border-b border-gray-800/60">
              <td className="py-1 text-gray-400">{lowLabel} year</td>
              <td className="py-1 text-right text-sky-300">{yearRows.low[0]}</td>
              <td className="py-1 text-right text-gray-300 tabular-nums">{yearRows.low[1].toFixed(dec)} {unit}</td>
            </tr>
            {yearRows.ytdRank && (
              <tr>
                <td className="py-1 text-gray-400">{currentYear} so far</td>
                <td className="py-1 text-right text-orange-300">#{yearRows.ytdRank.rank}<span className="text-gray-500"> of {yearRows.ytdRank.total}</span></td>
                <td className="py-1 text-right text-gray-300 tabular-nums">{yearRows.ytdRank.value.toFixed(dec)} {unit}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {view === 'seasons' && (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-gray-500 text-[9.5px] uppercase tracking-wider">
              <th className="text-left font-medium pb-1">Season</th>
              <th className="text-right font-medium pb-1">{highLabel}</th>
              <th className="text-right font-medium pb-1">{lowLabel}</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {seasonRows.map((s) => (
              <tr key={s.key} className="border-t border-gray-800/60">
                <td className="py-1 text-gray-400">{s.label}</td>
                <td className="py-1 text-right">
                  {s.high ? (
                    <span className="text-red-300">{s.high[0]}</span>
                  ) : <span className="text-gray-600">—</span>}
                  {s.high && <span className="text-gray-500 ml-1 tabular-nums">{s.high[1].toFixed(dec)}{METRIC_UNIT[metric] === '°C' ? '°' : ''}</span>}
                </td>
                <td className="py-1 text-right">
                  {s.low ? (
                    <span className="text-sky-300">{s.low[0]}</span>
                  ) : <span className="text-gray-600">—</span>}
                  {s.low && <span className="text-gray-500 ml-1 tabular-nums">{s.low[1].toFixed(dec)}{METRIC_UNIT[metric] === '°C' ? '°' : ''}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'months' && (
        <div className="max-h-64 overflow-y-auto -mx-1 px-1 [scrollbar-width:thin]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur">
              <tr className="text-gray-500 text-[9.5px] uppercase tracking-wider">
                <th className="text-left font-medium pb-1">Month</th>
                <th className="text-right font-medium pb-1">{highLabel}</th>
                <th className="text-right font-medium pb-1">{lowLabel}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {monthRows.map((m) => (
                <tr key={m.label} className="border-t border-gray-800/60">
                  <td className="py-1 text-gray-400">{m.label}</td>
                  <td className="py-1 text-right">
                    {m.high ? (
                      <span className="text-red-300">{m.high[0]}</span>
                    ) : <span className="text-gray-600">—</span>}
                    {m.high && <span className="text-gray-500 ml-1 tabular-nums">{m.high[1].toFixed(dec)}{METRIC_UNIT[metric] === '°C' ? '°' : ''}</span>}
                  </td>
                  <td className="py-1 text-right">
                    {m.low ? (
                      <span className="text-sky-300">{m.low[0]}</span>
                    ) : <span className="text-gray-600">—</span>}
                    {m.low && <span className="text-gray-500 ml-1 tabular-nums">{m.low[1].toFixed(dec)}{METRIC_UNIT[metric] === '°C' ? '°' : ''}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
