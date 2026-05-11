"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Thermometer, CloudRain, Sun, Snowflake } from 'lucide-react';
import type { MonthlyPoint, SpaghettiMetric } from './monthly-spaghetti-chart';
import ShareBar from '@/app/climate/enso/_components/ShareBar';

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
  /** Slug used to build the embed URL: /climate/embed/spiral/<embedSlug>. */
  embedSlug?: string;
  /** Anchor + canonical URL for the ShareBar. When omitted ShareBar is hidden. */
  share?: { pageUrl: string; sectionId: string };
  /** Hide the ShareBar entirely (used by the embed route). */
  hideShare?: boolean;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Major ENSO events through history — coarse "year → state/strength"
 *  lookup used by the playback stats strip. For the modern era (2016→)
 *  the runtime fetch from `/data/climate/enso.json` overrides this with
 *  the most recent ONI value. State strings match the chips in the ENSO
 *  page so colour/styling stays consistent. */
const ENSO_HISTORY: { range: [number, number]; state: 'El Niño' | 'La Niña' | 'Neutral'; strength?: 'Very strong' | 'Strong' | 'Moderate' | 'Weak' }[] = [
  { range: [1957, 1958], state: 'El Niño', strength: 'Strong' },
  { range: [1963, 1963], state: 'El Niño', strength: 'Weak' },
  { range: [1965, 1966], state: 'El Niño', strength: 'Moderate' },
  { range: [1968, 1969], state: 'El Niño', strength: 'Moderate' },
  { range: [1972, 1973], state: 'El Niño', strength: 'Strong' },
  { range: [1973, 1976], state: 'La Niña', strength: 'Strong' },
  { range: [1977, 1978], state: 'El Niño', strength: 'Weak' },
  { range: [1982, 1983], state: 'El Niño', strength: 'Very strong' },
  { range: [1986, 1988], state: 'El Niño', strength: 'Moderate' },
  { range: [1988, 1989], state: 'La Niña', strength: 'Strong' },
  { range: [1991, 1992], state: 'El Niño', strength: 'Strong' },
  { range: [1994, 1995], state: 'El Niño', strength: 'Moderate' },
  { range: [1997, 1998], state: 'El Niño', strength: 'Very strong' },
  { range: [1998, 2001], state: 'La Niña', strength: 'Strong' },
  { range: [2002, 2003], state: 'El Niño', strength: 'Moderate' },
  { range: [2004, 2005], state: 'El Niño', strength: 'Weak' },
  { range: [2006, 2007], state: 'El Niño', strength: 'Weak' },
  { range: [2007, 2008], state: 'La Niña', strength: 'Strong' },
  { range: [2009, 2010], state: 'El Niño', strength: 'Moderate' },
  { range: [2010, 2012], state: 'La Niña', strength: 'Strong' },
  { range: [2014, 2016], state: 'El Niño', strength: 'Very strong' },
  { range: [2016, 2018], state: 'La Niña', strength: 'Weak' },
  { range: [2018, 2019], state: 'El Niño', strength: 'Weak' },
  { range: [2020, 2023], state: 'La Niña', strength: 'Strong' },
  { range: [2023, 2024], state: 'El Niño', strength: 'Strong' },
];

function ensoForYear(year: number): { state: string; strength?: string } | null {
  for (const e of ENSO_HISTORY) {
    if (year >= e.range[0] && year <= e.range[1]) return { state: e.state, strength: e.strength };
  }
  return { state: 'Neutral' };
}

/** Representative peak ONI anomaly for a strength bucket. Used as a
 *  fallback for years where we haven't loaded the live ONI history
 *  (i.e. anything pre-2016). Sign comes from the state. */
function approxOniForStrength(state: string, strength?: string): number {
  const sign = state === 'El Niño' ? 1 : state === 'La Niña' ? -1 : 0;
  const mag = strength === 'Very strong' ? 2.2
    : strength === 'Strong' ? 1.7
    : strength === 'Moderate' ? 1.2
    : strength === 'Weak' ? 0.7
    : 0;
  return sign * mag;
}

const TOGGLE_BASE = 'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors';
const TOGGLE_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]';
const TOGGLE_INACTIVE = 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';

/** Pill-style toggle that mirrors the metric-chip look. When `active` it
 *  picks up an outline + tinted fill in the supplied `color`, falling back
 *  to the shared inactive style otherwise. Lets us replace the noisy
 *  `<input type="checkbox">` controls with chips that wrap nicely on
 *  mobile and align with the metric switcher above the chart. */
function ChipToggle({
  active, onChange, color = '#D0A65E', children,
}: {
  active: boolean;
  onChange: (next: boolean) => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      aria-pressed={active}
      className={`${TOGGLE_BASE} ${active ? '' : TOGGLE_INACTIVE}`}
      style={active ? { borderColor: `${color}8c`, background: `${color}1f`, color: '#FFF5E7' } : undefined}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: active ? color : 'transparent', border: `1px solid ${active ? color : '#4B5563'}` }}
      />
      <span className="leading-none">{children}</span>
    </button>
  );
}

const METRIC_ICON: Record<SpaghettiMetric, React.ReactNode> = {
  temp: <Thermometer className="h-3.5 w-3.5" />,
  precip: <CloudRain className="h-3.5 w-3.5" />,
  sunshine: <Sun className="h-3.5 w-3.5" />,
  frost: <Snowflake className="h-3.5 w-3.5" />,
};

/** Larger version of the metric icon for the section heading — matches the
 *  size used on the monthly-spaghetti card so the two sections line up. */
const HEADER_ICON: Record<SpaghettiMetric, React.ReactNode> = {
  temp: <Thermometer className="h-5 w-5" />,
  precip: <CloudRain className="h-5 w-5" />,
  sunshine: <Sun className="h-5 w-5" />,
  frost: <Snowflake className="h-5 w-5" />,
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

/** Per-metric colour palette — matches `monthly-spaghetti-chart` so the two
 * panels read as one set, and uses intuitive extremes for each variable:
 *  - temp: red = warmest, sky = coldest
 *  - precip: deep blue = wettest, amber/brown = driest
 *  - sunshine: amber = sunniest, slate = dullest
 *  - frost: icy blue = frostiest, orange = mildest
 */
type MetricPalette = {
  high: string; low: string; current: string;
  highTextClass: string; lowTextClass: string; currentTextClass: string;
  highWord: string; lowWord: string;
};
const METRIC_PALETTE: Record<SpaghettiMetric, MetricPalette> = {
  temp:     { high: '#DC2626', low: '#38BDF8', current: '#F97316',
              highTextClass: 'text-red-300',   lowTextClass: 'text-sky-300',   currentTextClass: 'text-orange-300',
              highWord: 'Warmest',  lowWord: 'Coldest' },
  precip:   { high: '#3B82F6', low: '#B45309', current: '#7DD3FC',
              highTextClass: 'text-blue-300',  lowTextClass: 'text-amber-300', currentTextClass: 'text-sky-200',
              highWord: 'Wettest',  lowWord: 'Driest' },
  sunshine: { high: '#F59E0B', low: '#64748B', current: '#FDE047',
              highTextClass: 'text-amber-300', lowTextClass: 'text-slate-400', currentTextClass: 'text-yellow-200',
              highWord: 'Sunniest', lowWord: 'Dullest' },
  frost:    { high: '#38BDF8', low: '#F97316', current: '#A5F3FC',
              highTextClass: 'text-sky-300',   lowTextClass: 'text-orange-300',currentTextClass: 'text-cyan-200',
              highWord: 'Frostiest', lowWord: 'Mildest' },
};

/* CET 1850–1900 monthly means (HadCET). Used only for Paris-ring placement
 * in UK temperature mode. */
const UK_PREINDUSTRIAL_MONTHLY: number[] = [
  3.3, 3.5, 5.0, 7.4, 10.3, 13.3, 15.1, 14.8, 12.7, 9.2, 5.5, 4.0,
];
const UK_PREINDUSTRIAL_ANNUAL = UK_PREINDUSTRIAL_MONTHLY.reduce((a, b) => a + b, 0) / 12;

/* ────────────────────────────────────────────────────────────────────────────
 * Colour helpers
 * ──────────────────────────────────────────────────────────────────────── */

/** Background spaghetti year colour. Ramps from a cool slate-grey (oldest
 *  years) up to the metric's "current/highlight" colour (newest years), so
 *  each metric tab carries its own visual identity in line with the monthly
 *  spaghetti chart above. */
function yearColor(year: number, minYear: number, maxYear: number, alpha = 1, end: string = '#F97316') {
  const t = maxYear === minYear ? 1 : (year - minYear) / (maxYear - minYear);
  // Cool slate (#4B5563) at t=0 → palette end colour at t=1.
  const startR = 75,  startG = 85,  startB = 99;
  const eh = end.replace('#', '');
  const er = parseInt(eh.slice(0, 2), 16);
  const eg = parseInt(eh.slice(2, 4), 16);
  const eb = parseInt(eh.slice(4, 6), 16);
  const r = Math.round(startR + (er - startR) * t);
  const g = Math.round(startG + (eg - startG) * t);
  const b = Math.round(startB + (eb - startB) * t);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* Four-season palette — mirrors the icons & accent colours used on the
 * shifting-seasons page so the visual language stays consistent across the
 * site:
 *   winter = ice blue (cyan-300, matches the Snowflake accent)
 *   spring = fresh green (emerald-300, Flower2 accent)
 *   summer = warm yellow (yellow-300)
 *   autumn = chestnut brown (amber-700, Leaf-of-autumn)
 */
const SEASON_COLORS = {
  winter: '#7DD3FC',
  spring: '#86EFAC',
  summer: '#FACC15',
  autumn: '#B45309',
};
const SEASON_LABEL: Record<keyof typeof SEASON_COLORS, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
};

/* ────────────────────────────────────────────────────────────────────────────
 * Polar geometry helpers
 * ──────────────────────────────────────────────────────────────────────── */

const VB = 800;        // viewBox size — padded to fit season-crossing
                       // call-out label pills outside the month-label ring
const CX = VB / 2;
const CY = VB / 2;
const R_OUTER = 240;   // outermost data ring
const R_LABEL = 272;   // month label radius
const R_LABEL_BAND_W = 26; // visual width of the month-label "track" ring

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
  embedSlug,
  share,
  hideShare = false,
}: Props) {
  const available = METRIC_ORDER.filter((m) => (series[m]?.length ?? 0) > 0);
  const fallback: SpaghettiMetric = available[0] ?? 'temp';
  const [metric, setMetric] = useState<SpaghettiMetric>(fallback);
  const palette = METRIC_PALETTE[metric];

  // Scroll-to-anchor when the URL hash matches our section id but the card
  // mounted later (async profile pages).
  useEffect(() => {
    if (!share?.sectionId) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#' + share.sectionId) return;
    const el = document.getElementById(share.sectionId);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [share?.sectionId]);
  const [anomaly, setAnomaly] = useState(false);
  const [showSeasons, setShowSeasons] = useState(true);
  const [highlightRecent, setHighlightRecent] = useState(true);
  const [showParis, setShowParis] = useState(true);
  const [showShiftTrail, setShowShiftTrail] = useState(true);
  const [showRecordHigh, setShowRecordHigh] = useState(true);
  const [showRecordLow, setShowRecordLow] = useState(true);
  const [showSpaghetti, setShowSpaghetti] = useState(true);
  /** User-adjustable "boost" on the year-spaghetti opacity. At 0 the
   *  lines render at their original baked-in alpha (subtle, lets the
   *  reference rings dominate); at 1.0 they ramp up to fully opaque,
   *  useful when sharing a still or pointing at a specific year. */
  const [lineAlpha, setLineAlpha] = useState(0);
  /** Convert the user-facing 0..1 boost into stroke-alpha multipliers
   *  for the background and recent-decade highlight passes. */
  const bgAlpha = Math.min(1, 0.32 + 0.68 * lineAlpha);
  const hiAlpha = Math.min(1, 0.85 + 0.15 * lineAlpha);
  /** 3D mode — re-projects each year's loop onto a tilted plane and
   *  stacks them vertically so height encodes time. */
  const [view3D, setView3D] = useState(false);
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

  /* Reference periods — user-adjustable.
   * Defaults: WMO-standard 1961–1990 baseline + historic-window (oldest 30y)
   * + most-recent 10 completed years. All three ranges are clamped to
   * [minYear, maxYear]. */
  const defaultBaselineRange: [number, number] = useMemo(() => {
    const from = Math.max(minYear, 1961);
    const to = Math.min(maxYear, 1990);
    return from < to ? [from, to] : [minYear, Math.min(maxYear, minYear + 29)];
  }, [minYear, maxYear]);
  const defaultHistoricRange: [number, number] = useMemo(() => {
    const from = minYear;
    const to = Math.min(maxYear, minYear + 29);
    return [from, to];
  }, [minYear, maxYear]);
  const defaultRecentRange: [number, number] = useMemo(() => {
    const calYear = new Date().getFullYear();
    const to = Math.min(maxYear, calYear - 1);
    const from = Math.max(minYear, to - 9);
    return [from, to];
  }, [minYear, maxYear]);

  const [baselineRange, setBaselineRange] = useState<[number, number]>(defaultBaselineRange);
  const [historicRange, setHistoricRange] = useState<[number, number]>(defaultHistoricRange);
  const [recentRange, setRecentRange] = useState<[number, number]>(defaultRecentRange);
  const [baselineFrom, baselineTo] = baselineRange;
  const [historicFrom, historicTo] = historicRange;
  const [recentFrom, recentTo] = recentRange;
  const [showHistoric, setShowHistoric] = useState(false);
  /** Show/hide the dashed baseline mean ring. Hidden automatically in
   *  anomaly mode (would be a zero-radius circle). */
  const [showBaselineRing, setShowBaselineRing] = useState(true);
  /** Show/hide the dashed modern mean ring. */
  const [showRecentRing, setShowRecentRing] = useState(true);

  /** Live ONI history → map of year → peak |ONI| anomaly (signed).
   *  Populated lazily once from `/data/climate/enso.json` so the HUD
   *  can show the actual anomaly for the modern era. Older years fall
   *  back to the strength-bucket approximation in `approxOniForStrength`. */
  const [oniByYear, setOniByYear] = useState<Map<number, number>>(new Map());
  React.useEffect(() => {
    let cancelled = false;
    fetch('/data/climate/enso.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.oni?.history) return;
        const m = new Map<number, number>();
        for (const row of j.oni.history as Array<{ year: number; anom: number }>) {
          const cur = m.get(row.year);
          // Keep the peak absolute anomaly per year (signed).
          if (cur === undefined || Math.abs(row.anom) > Math.abs(cur)) m.set(row.year, row.anom);
        }
        setOniByYear(m);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  /* Playback state — see below for the RAF/interval effect that advances
   * the playhead. Declared here so the controls below can read it. */
  const [playYear, setPlayYear] = useState<number | null>(null);
  const [playMonth, setPlayMonth] = useState<number | null>(null); // current-year finale phase
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(8); // years per second
  const playCutoff = playYear ?? Number.POSITIVE_INFINITY;

  const meanBaseline = useMemo(
    () => monthlyMeanProfile(yearMap, baselineFrom, Math.min(baselineTo, playCutoff)),
    [yearMap, baselineFrom, baselineTo, playCutoff],
  );
  const meanHistoric = useMemo(
    () => monthlyMeanProfile(yearMap, historicFrom, Math.min(historicTo, playCutoff)),
    [yearMap, historicFrom, historicTo, playCutoff],
  );
  const meanRecent = useMemo(
    () => monthlyMeanProfile(yearMap, recentFrom, Math.min(recentTo, playCutoff)),
    [yearMap, recentFrom, recentTo, playCutoff],
  );

  /* Hover state for chart tooltip: nearest year at the mouse position.
   *  `kind` distinguishes between an individual year line and one of the
   *  mean reference rings. For mean rings `year` is reused as a display
   *  caption (e.g. "1961–1990 mean"). */
  const [hover, setHover] = useState<
    | { kind: 'year' | 'mean'; year: number; label: string; monthIdx: number; value: number; r: number; sx: number; sy: number }
    | null
  >(null);

  /* Value→radius scale: derive from data extent across all years to be drawn. */
  const { rMin, rMax, currentYear, recordYear, oppositeYear } = useMemo(() => {
    if (!yearMap.size) return { rMin: 0, rMax: 1, currentYear: 0, recordYear: 0, oppositeYear: 0 };
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
    // Pick record-high and record-low year by metric's annual aggregate.
    const annual = annualAggregate(yearMap, METRIC_AGG[metric]);
    let best = -Infinity; let bestY = 0;
    let worst = Infinity; let worstY = 0;
    for (const [y, v] of annual.entries()) {
      if (y === calYear) continue;
      if (v > best) { best = v; bestY = y; }
      if (v < worst) { worst = v; worstY = y; }
    }
    return {
      rMin: lo === Infinity ? 0 : lo,
      rMax: hi === -Infinity ? 1 : hi,
      currentYear: calYear,
      recordYear: bestY,
      oppositeYear: worstY,
    };
  }, [yearMap, effectiveFromYear, anomaly, meanBaseline, metric]);

  /* Latest month index (0-11) for the current year that has actual,
   * non-provisional data. Drives where the month-by-month finale stops:
   * we only animate as far as the real data goes, not all the way to
   * Dec on years where we're mid-year. Falls back to 11 if the current
   * year has all 12 months. */
  const latestRealMonthIdx = useMemo(() => {
    const arr = yearMap.get(currentYear);
    if (!arr) return -1;
    const provSet = prov.get(currentYear) ?? new Set<number>();
    let last = -1;
    for (let m = 0; m < 12; m++) {
      if (Number.isFinite(arr[m]) && !provSet.has(m)) last = m;
    }
    return last;
  }, [yearMap, prov, currentYear]);

  /* Playback advancement — runs an interval that ticks the playhead one
   * year per `1000/playSpeed`ms while moving through the historical
   * window, then switches to a deliberately slower month-by-month finale
   * once the playhead reaches the current year. */
  React.useEffect(() => {
    if (!playing) return;
    // Finale: month-by-month at a fixed slow rate (~2 months/sec) so the
    // climax of "everything you've seen, all the way up to NOW" lands
    // visibly rather than flashing past. Stops at the latest real
    // (non-provisional) month so we don't pretend we have data we don't.
    const finaleEnd = latestRealMonthIdx >= 0 ? latestRealMonthIdx : 11;
    if (playYear === currentYear && playMonth !== null) {
      const id = window.setInterval(() => {
        setPlayMonth((prev) => {
          if (prev === null) return 0;
          if (prev >= finaleEnd) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 450);
      return () => window.clearInterval(id);
    }
    // Year-by-year phase.
    const intervalMs = Math.max(20, 1000 / playSpeed);
    const id = window.setInterval(() => {
      setPlayYear((prev) => {
        const cur = prev ?? (effectiveFromYear - 1);
        if (cur >= currentYear - 1) {
          // Hand off to the month-by-month finale on the next tick.
          setPlayMonth(0);
          return currentYear;
        }
        return cur + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, playSpeed, effectiveFromYear, currentYear, playYear, playMonth, latestRealMonthIdx]);
  // Stop + reset playback whenever the metric or start-year changes.
  React.useEffect(() => {
    setPlayYear(null);
    setPlayMonth(null);
    setPlaying(false);
  }, [metric, effectiveFromYear]);

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

  /* 3D oblique projection helper. Each year is lifted by `dz * (year-minYear)`
   * along the screen-y axis (so older years sit lower, newer years sit
   * higher) and the chart is squashed by `cosTilt` to give the illusion
   * the spiral is being viewed from above-and-in-front. Pure SVG, no
   * extra library. Returns the same array shape so callers downstream
   * (smoothClosedPath etc.) can stay agnostic. */
  function project3D(pts: [number, number][], year: number): [number, number][] {
    if (!view3D || !Number.isFinite(year)) return pts;
    const span = Math.max(1, maxYear - minYear);
    const dz = 220 / span; // total vertical stack ~ 220 svg units
    const cosTilt = 0.55;
    const z = (year - minYear) * dz;
    return pts.map(([x, y]) => [x, CY + (y - CY) * cosTilt - z]);
  }

  /* Decide which years to render in background vs highlight. Playback
   * (when active) clamps to `playCutoff`. */
  const renderYears = useMemo(() => {
    const out: number[] = [];
    for (const y of yearMap.keys()) {
      if (y < effectiveFromYear) continue;
      if (y > playCutoff) continue;
      out.push(y);
    }
    out.sort((a, b) => a - b);
    return out;
  }, [yearMap, effectiveFromYear, playCutoff]);

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

  /* Decadal 10°C growing-season crossings.
   * Always computed from the *temperature* series so the season-tint
   * crescents work on every metric tab (the climatic shift itself is
   * temperature-driven; rainfall / sunshine / frost charts still
   * benefit from seeing the same shifted-season backdrop). */
  const SHIFT_THRESHOLD = 10;
  const crossingDecades = useMemo(() => {
    // Shift wedges are derived from temperature only and are independent
    // of whether the user is viewing anomalies — the seasonal cycle is
    // the same physical phenomenon either way, so don't gate on `anomaly`.
    const tempPoints = series.temp;
    if (!tempPoints?.length) return [];
    const tempYearMap = buildYearMap(tempPoints, provisionalAfterMonth).yearMap;
    // Clamp to the playhead so shift-tints/trails build up year-by-year
    // during animated playback.
    const clamped: typeof tempYearMap = new Map();
    for (const [y, arr] of tempYearMap) {
      if (y > playCutoff) continue;
      clamped.set(y, arr);
    }
    const crossings = computeYearCrossings(clamped, SHIFT_THRESHOLD);
    return decadalCrossings(crossings);
  }, [series, provisionalAfterMonth, playCutoff]);
  /** Approx days per month for shift-day computation. */
  const DAYS_PER_MONTH = 30.44;

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
    <div id={share?.sectionId ?? sectionId} className="bg-[#0b0e16] p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E] scroll-mt-24">
      <h3 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <span className="shrink-0 mt-0.5 text-[#D0A65E]">{HEADER_ICON[metric]}</span>
        <span className="min-w-0 flex-1">The 4BYO Climate Spiral – {regionName}</span>
      </h3>

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

      <div className="flex flex-col gap-6">
        {/* ─── Section 1: Spiral chart (full width, large on desktop) ───── */}
        <div>
          {/* Series legend — placed *above* the chart and centered so it
               doubles as a key while scrolling the controls below. */}
          <div className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10.5px] text-gray-400 max-w-[760px] mx-auto">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-6" style={{ background: `linear-gradient(90deg,#4B5563,${palette.high})` }} />
              {minYear} → {maxYear}
            </span>
            {!anomaly && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-6 border-t-2 border-dotted" style={{ borderColor: '#CBD5E1' }} />
                {baselineFrom}–{baselineTo} mean
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-6 border-t-2 border-dashed" style={{ borderColor: '#EF4444' }} />
              {recentFrom}–{recentTo} mean{anomaly ? ' (anomaly)' : ''}
            </span>
            {showHistoric && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-6 border-t-2 border-dashed" style={{ borderColor: '#E6B765' }} />
                {historicFrom}–{historicTo} mean{anomaly ? ' (anomaly)' : ''}
              </span>
            )}
            {showRecordHigh && recordYear > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-6" style={{ background: palette.high }} />
                {palette.highWord} ({recordYear})
              </span>
            )}
            {showRecordLow && oppositeYear > 0 && oppositeYear !== recordYear && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-6" style={{ background: palette.low }} />
                {palette.lowWord} ({oppositeYear})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-6" style={{ background: palette.current }} />
              {currentYear} so far
            </span>
            {showShiftTrail && crossingDecades.length >= 2 && metric === 'temp' && !anomaly && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#86EFAC' }} />
                  Spring 10°C crossing
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#FDBA74' }} />
                  Autumn 10°C crossing
                </span>
              </>
            )}
          </div>
          <div className="relative w-full max-w-[920px] mx-auto">
            {/* Playback stats strip — when the playhead is active, replaces
                 the small year chip with a full HUD: prominent year,
                 anomaly/temp/rain/sun/frost mini-cards, ENSO state and a
                 flashing pill when this year is a record. Designed to
                 feel cinematic: dark glass card with a thin glowing
                 border in the metric accent colour. */}
            {playYear !== null && (() => {
              const displayYear = playYear === currentYear && playMonth !== null
                ? currentYear
                : Math.max(effectiveFromYear, playYear);
              const monthIdx = playYear === currentYear && playMonth !== null ? playMonth : null;
              // Compute per-metric value for displayYear. For partial
              // current-year playback, sum/mean over months 0..monthIdx.
              const metricValue = (m: SpaghettiMetric): number | null => {
                const pts = series[m];
                if (!pts) return null;
                const map = buildYearMap(pts, provisionalAfterMonth).yearMap;
                const arr = map.get(displayYear);
                if (!arr) return null;
                const slice = monthIdx !== null && displayYear === currentYear
                  ? arr.slice(0, monthIdx + 1)
                  : arr.filter(Number.isFinite);
                const valid = slice.filter(Number.isFinite);
                if (!valid.length) return null;
                if (METRIC_AGG[m] === 'mean') return valid.reduce((a, b) => a + b, 0) / valid.length;
                return valid.reduce((a, b) => a + b, 0);
              };
              const tempVal = metricValue('temp');
              // Anomaly vs the user's chosen baseline. For partial
              // current-year, use the baseline mean of the same months.
              const tempAnom = tempVal !== null && meanBaseline.every(Number.isFinite)
                ? (() => {
                    if (monthIdx !== null) {
                      const base = meanBaseline.slice(0, monthIdx + 1);
                      const bm = base.reduce((a, b) => a + b, 0) / Math.max(1, base.length);
                      return tempVal - bm;
                    }
                    const bm = meanBaseline.reduce((a, b) => a + b, 0) / 12;
                    return tempVal - bm;
                  })()
                : null;
              const enso = ensoForYear(displayYear);
              // Prefer live ONI for the displayed year; fall back to the
              // strength-bucket approximation for older years where we
              // don't have monthly ONI data baked in.
              const liveOni = oniByYear.get(displayYear);
              const ensoAnom = liveOni !== undefined
                ? liveOni
                : (enso && enso.state !== 'Neutral' ? approxOniForStrength(enso.state, enso.strength) : null);
              const isRecord = displayYear === recordYear || displayYear === oppositeYear;
              const recordLabel = displayYear === recordYear ? palette.highWord : palette.lowWord;
              const recordColor = displayYear === recordYear ? palette.high : palette.low;
              const ensoCls = enso?.state === 'El Niño'
                ? 'border-rose-400/60 bg-rose-500/15 text-rose-200'
                : enso?.state === 'La Niña'
                  ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                  : 'border-gray-600 bg-gray-800/50 text-gray-300';
              const fmt = (v: number, dp = 1) => v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
              const StatCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode; color: string }) => (
                <div className="relative rounded-lg border bg-gray-950/85 backdrop-blur-sm px-2.5 py-1.5 min-w-[88px]" style={{ borderColor: `${color}66`, boxShadow: `inset 0 0 0 1px ${color}11, 0 0 12px -6px ${color}88` }}>
                  <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-gray-400">
                    <span style={{ color }}>{icon}</span>
                    {label}
                  </div>
                  <div className="font-mono text-sm sm:text-base font-bold tabular-nums" style={{ color: '#FFF5E7' }}>{value}</div>
                  {sub && <div className="text-[9.5px] tabular-nums leading-tight">{sub}</div>}
                </div>
              );
              return (
                <div className="absolute left-1/2 -translate-x-1/2 top-0 z-10 pointer-events-none w-[calc(100%-0.5rem)] max-w-[920px]">
                  <div className="rounded-xl border border-[#D0A65E]/45 bg-[#0b0e16]/90 px-3 py-2 shadow-2xl">
                    <div className="flex items-baseline gap-3">
                      <div className="font-mono font-black tabular-nums text-2xl sm:text-3xl text-[#D0A65E] leading-none drop-shadow">
                        {displayYear}
                        {monthIdx !== null && (
                          <span className="text-[#FFF5E7] text-base sm:text-xl ml-1.5">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthIdx]}</span>
                        )}
                      </div>
                      {isRecord && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider animate-pulse"
                          style={{ borderColor: recordColor, color: recordColor, background: `${recordColor}22`, boxShadow: `0 0 12px -2px ${recordColor}` }}
                        >
                          ◆ {recordLabel} on record
                        </span>
                      )}
                      {enso && enso.state !== 'Neutral' && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ensoCls}`}>
                          {enso.state}{enso.strength ? ` · ${enso.strength}` : ''}{ensoAnom !== null ? ` · ONI ${ensoAnom >= 0 ? '+' : ''}${ensoAnom.toFixed(1)}°C` : ''}
                        </span>
                      )}
                      {enso && enso.state === 'Neutral' && (
                        <span className="rounded-full border border-gray-700 bg-gray-900/40 px-2 py-0.5 text-[10px] text-gray-400">
                          ENSO neutral{liveOni !== undefined ? ` · ONI ${liveOni >= 0 ? '+' : ''}${liveOni.toFixed(1)}°C` : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {tempVal !== null && (
                        <StatCard
                          icon={<Thermometer className="h-3 w-3" />}
                          label="Temp"
                          value={`${fmt(tempVal, 1)}°C`}
                          color={METRIC_PALETTE.temp.current}
                          sub={tempAnom !== null ? (
                            <span className={tempAnom >= 0 ? 'text-rose-300' : 'text-sky-300'}>
                              {tempAnom >= 0 ? '+' : ''}{fmt(tempAnom, 2)}°C vs baseline
                            </span>
                          ) : null}
                        />
                      )}
                      {(() => { const v = metricValue('precip'); return v !== null && (
                        <StatCard icon={<CloudRain className="h-3 w-3" />} label="Rain" value={`${fmt(v, 0)} mm`} color={METRIC_PALETTE.precip.current} />
                      ); })()}
                      {(() => { const v = metricValue('sunshine'); return v !== null && (
                        <StatCard icon={<Sun className="h-3 w-3" />} label="Sun" value={`${fmt(v, 0)} h`} color={METRIC_PALETTE.sunshine.current} />
                      ); })()}
                      {(() => { const v = metricValue('frost'); return v !== null && (
                        <StatCard icon={<Snowflake className="h-3 w-3" />} label="Frost" value={`${fmt(v, 0)} d`} color={METRIC_PALETTE.frost.current} />
                      ); })()}
                    </div>
                  </div>
                </div>
              );
            })()}
            <svg
              viewBox={view3D ? `0 -260 ${VB} ${VB + 260}` : `0 0 ${VB} ${VB}`}
              className="w-full h-auto select-none cursor-crosshair"
              onMouseMove={(e) => {
                const svg = e.currentTarget;
                const rect = svg.getBoundingClientRect();
                if (rect.width === 0) return;
                const sx = ((e.clientX - rect.left) / rect.width) * VB;
                const sy = ((e.clientY - rect.top) / rect.height) * VB;
                const dx = sx - CX;
                const dy = sy - CY;
                const rMouse = Math.hypot(dx, dy);
                if (rMouse < 18 || rMouse > R_OUTER + 10) {
                  setHover(null);
                  return;
                }
                const ang = Math.atan2(dy, dx); // atan2 returns [-π, π], 0 = +x axis
                // monthAngle(m) = (m/12)*2π - π/2. Inverse: m = ((ang + π/2)/(2π))*12
                let monthFrac = ((ang + Math.PI / 2) / (Math.PI * 2)) * 12;
                if (monthFrac < 0) monthFrac += 12;
                const monthIdx = (Math.round(monthFrac) % 12 + 12) % 12;
                // Find nearest *visible* line at this month. Skip years
                // whose lines are toggled off so the tooltip never picks up
                // invisible data. Also consider the three mean rings as
                // hover targets.
                type Best = { kind: 'year' | 'mean'; year: number; label: string; value: number; r: number; d: number };
                let best: Best | null = null;
                const consider = (kind: 'year' | 'mean', year: number, label: string, value: number, r: number) => {
                  if (!Number.isFinite(r) || !Number.isFinite(value)) return;
                  const d = Math.abs(r - rMouse);
                  if (!best || d < best.d) best = { kind, year, label, value, r, d };
                };
                for (const y of renderYears) {
                  // Hide individual year lines when overall spaghetti is off,
                  // unless this year is itself separately shown (record/current).
                  const isRecordHi = y === recordYear && showRecordHigh;
                  const isRecordLo = y === oppositeYear && showRecordLow && oppositeYear !== recordYear;
                  const isCurrent = y === currentYear;
                  const inRecent = y >= recentFrom && y <= recentTo;
                  const inSpaghetti = showSpaghetti && (inRecent ? highlightRecent : true);
                  if (!isRecordHi && !isRecordLo && !isCurrent && !inSpaghetti) continue;
                  if (y === recordYear && !showRecordHigh && !inSpaghetti) continue;
                  if (y === oppositeYear && !showRecordLow && !inSpaghetti) continue;
                  const arr = yearMap.get(y);
                  if (!arr) continue;
                  const v = arr[monthIdx];
                  if (!Number.isFinite(v)) continue;
                  consider('year', y, String(y), v, valueToR(v, monthIdx));
                }
                // Mean rings: baseline (hidden in anomaly mode), recent
                // (always shown), historic (gated).
                if (!anomaly && meanBaseline.every(Number.isFinite)) {
                  consider('mean', 0, `${baselineFrom}–${baselineTo} mean`, meanBaseline[monthIdx], valueToR(meanBaseline[monthIdx], monthIdx));
                }
                if (meanRecent.every(Number.isFinite)) {
                  consider('mean', 0, `${recentFrom}–${recentTo} mean`, meanRecent[monthIdx], valueToR(meanRecent[monthIdx], monthIdx));
                }
                if (showHistoric && meanHistoric.every(Number.isFinite)) {
                  consider('mean', 0, `${historicFrom}–${historicTo} mean`, meanHistoric[monthIdx], valueToR(meanHistoric[monthIdx], monthIdx));
                }
                if (best && (best as Best).d < 28) {
                  const b = best as Best;
                  setHover({ kind: b.kind, year: b.year, label: b.label, monthIdx, value: b.value, r: b.r, sx, sy });
                } else {
                  setHover(null);
                }
              }}
              onMouseLeave={() => setHover(null)}
            >
              {/* Season-wedge background.
                   When the seasonal-shift trail is on (temp + absolute mode
                   only), we replace the fixed astronomical tints with two
                   data-driven pie wedges representing the growing seasons of
                   the oldest and newest decades — so the user can see at a
                   glance how the season has expanded. */}
              {/* Season-tint background.
               *
               * When we have temp data + 10°C crossings for at least two
               * decades, we render a full-year, four-season ring that
               * encodes the shift directly in the tints themselves:
               *
               *   • Winter   — ice blue, wrapping through Dec/Jan,
               *                from the latest decade's autumn end round
               *                to the latest decade's spring start.
               *   • Pale-green crescent — months that *used to be winter*
               *                but in the latest decade are spring (i.e.
               *                between newest and oldest spring start).
               *   • Growing-season core — oldest spring start → oldest
               *                autumn end, filled with a smooth gradient
               *                from spring-green through summer-yellow to
               *                autumn-brown so summer sits in the warm
               *                middle without needing a summer-boundary
               *                crossing (which we don't have data for).
               *   • Pale-amber crescent — months that *used to be winter*
               *                but in the latest decade are autumn
               *                (oldest autumn end → newest autumn end).
               *
               * For non-temperate climates or non-temp metrics we fall
               * back to fixed meteorological quarters using the same
               * four-season palette. */}
              {!view3D && showSeasons && (() => {
                const r = R_OUTER + 4;
                const wedgePath = (a1: number, a2: number) => {
                  let span = a2 - a1;
                  while (span <= 0) span += Math.PI * 2;
                  const large = span > Math.PI ? 1 : 0;
                  const [x1, y1] = polar(r, a1);
                  const [x2, y2] = polar(r, a2);
                  return `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
                };

                // Simple HEX interpolation between stops; t in [0..1].
                const lerpHex = (a: string, b: string, t: number) => {
                  const ah = a.replace('#', '');
                  const bh = b.replace('#', '');
                  const ar = parseInt(ah.slice(0, 2), 16);
                  const ag = parseInt(ah.slice(2, 4), 16);
                  const ab = parseInt(ah.slice(4, 6), 16);
                  const br = parseInt(bh.slice(0, 2), 16);
                  const bg = parseInt(bh.slice(2, 4), 16);
                  const bb = parseInt(bh.slice(4, 6), 16);
                  const r = Math.round(ar + (br - ar) * t);
                  const g = Math.round(ag + (bg - ag) * t);
                  const bl = Math.round(ab + (bb - ab) * t);
                  return `rgb(${r},${g},${bl})`;
                };
                const growingColor = (t: number) => {
                  // 0 = spring green, 0.5 = summer yellow, 1 = autumn brown.
                  if (t <= 0.5) return lerpHex('#4ADE80', '#FACC15', t / 0.5);
                  return lerpHex('#FACC15', '#B45309', (t - 0.5) / 0.5);
                };

                const haveCrossings = crossingDecades.length >= 2;
                const labelAngle = (a: number, b: number) => {
                  let span = b - a;
                  if (span <= 0) span += 12;
                  let mid = a + span / 2;
                  if (mid >= 12) mid -= 12;
                  return monthAngle(mid);
                };

                if (haveCrossings) {
                  const first = crossingDecades[0];
                  const last = crossingDecades[crossingDecades.length - 1];
                  // Guard against odd ordering.
                  const newSpring = last.spring;
                  const oldSpring = first.spring;
                  const oldAutumn = first.autumn;
                  const newAutumn = last.autumn;
                  // Directional sanity: the crescent fills should only
                  // render when the boundary has moved in the *expected*
                  // warming direction (spring earlier, autumn later). If
                  // an intermediate playback frame has the new boundary
                  // on the wrong side of the old one, draw the opposite
                  // wedge in cool-blue to indicate winter encroachment
                  // instead of letting `wedgePath` sweep the long way
                  // around (which fills almost the whole year with the
                  // crescent colour and looks like a bug).
                  const springWarming = newSpring < oldSpring;
                  const autumnWarming = newAutumn > oldAutumn;
                  // The growing-season gradient is meant to span the
                  // *historic* growing window, oldSpring → oldAutumn.
                  // If those happen to be reversed (e.g. only one decade
                  // pair, or noisy early data) collapse the gradient to
                  // zero rather than fill the whole circle.
                  const N = 28;
                  const growSpan = Math.max(0, oldAutumn - oldSpring);
                  const gradWedges = Array.from({ length: N }, (_, i) => {
                    const t0 = i / N;
                    const t1 = (i + 1) / N;
                    const m0 = oldSpring + growSpan * t0;
                    const m1 = oldSpring + growSpan * t1;
                    const col = growingColor((t0 + t1) / 2);
                    return (
                      <path
                        key={`grow-${i}`}
                        d={wedgePath(monthAngle(m0), monthAngle(m1))}
                        fill={col}
                      />
                    );
                  });

                  // Three "named" zones used purely for label placement.
                  const labels = [
                    { key: 'spring', mid: labelAngle(newSpring, oldSpring + (oldAutumn - oldSpring) * 0.33), color: '#4ADE80', text: 'Spring' },
                    { key: 'summer', mid: labelAngle(oldSpring + (oldAutumn - oldSpring) * 0.33, oldSpring + (oldAutumn - oldSpring) * 0.66), color: '#FACC15', text: 'Summer' },
                    { key: 'autumn', mid: labelAngle(oldSpring + (oldAutumn - oldSpring) * 0.66, newAutumn), color: '#B45309', text: 'Autumn' },
                    { key: 'winter', mid: labelAngle(newAutumn, newSpring), color: '#7DD3FC', text: 'Winter' },
                  ];

                  return (
                    <g>
                      <g opacity={0.38}>
                        {/* Winter (always-cold half) — gradient sub-wedges
                             so the middle of winter reads as the coldest
                             point, easing back to the boundary tone at
                             either end. Coldest = deep navy #1e3a8a. */}
                        {(() => {
                          let span = monthAngle(newSpring) - monthAngle(newAutumn);
                          while (span <= 0) span += Math.PI * 2;
                          const aStart = monthAngle(newAutumn);
                          const N = 18;
                          const winterMid = '#1e3a8a';
                          const winterEdge = '#7DD3FC';
                          return Array.from({ length: N }, (_, i) => {
                            const t0 = i / N;
                            const t1 = (i + 1) / N;
                            const tMid = (t0 + t1) / 2;
                            // 0 at middle of winter (tMid=0.5), 1 at the edges
                            const distFromMid = Math.abs(tMid - 0.5) * 2;
                            const col = lerpHex(winterMid, winterEdge, distFromMid);
                            const a1 = aStart + span * t0;
                            const a2 = aStart + span * t1;
                            return <path key={`win-${i}`} d={wedgePath(a1, a2)} fill={col} />;
                          });
                        })()}
                        {/* Crescent: months that used to be winter, now spring.
                             Light fresh green — same family as the spring
                             marker dots, lighter than the gradient core.
                             Only rendered when the warming-direction holds;
                             otherwise we draw the *opposite* wedge in the
                             winter blue to show that spring arrived later
                             this decade than in the baseline pair. */}
                        {springWarming ? (
                          <path d={wedgePath(monthAngle(newSpring), monthAngle(oldSpring))} fill="#BBF7D0" />
                        ) : newSpring > oldSpring ? (
                          <path d={wedgePath(monthAngle(oldSpring), monthAngle(newSpring))} fill="#7DD3FC" opacity={0.7} />
                        ) : null}
                        {/* Growing-season gradient core (only meaningful when
                             oldAutumn > oldSpring). */}
                        {growSpan > 0 && gradWedges}
                        {/* Crescent: months that used to be winter, now autumn.
                             Saturated chestnut brown — matches the autumn
                             marker dots, browner than the gradient tail.
                             Same direction-guard as spring. */}
                        {autumnWarming ? (
                          <path d={wedgePath(monthAngle(oldAutumn), monthAngle(newAutumn))} fill="#92400E" />
                        ) : newAutumn < oldAutumn ? (
                          <path d={wedgePath(monthAngle(newAutumn), monthAngle(oldAutumn))} fill="#7DD3FC" opacity={0.7} />
                        ) : null}
                      </g>
                      {/* Season labels — bright and bold so they stay
                          legible over the tinted wedges. */}
                      {labels.map((l) => {
                        const [lx, ly] = polar(R_LABEL + R_LABEL_BAND_W / 2 + 22, l.mid);
                        return (
                          <text
                            key={`slab-${l.key}`}
                            x={lx} y={ly}
                            fontSize={13}
                            fontWeight={700}
                            fill={l.color}
                            opacity={0.95}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontFamily="ui-monospace, monospace"
                            style={{ letterSpacing: '0.08em', textShadow: '0 0 4px rgba(0,0,0,0.85)' }}
                          >
                            {l.text}
                          </text>
                        );
                      })}
                    </g>
                  );
                }

                // Fallback — fixed meteorological quarters.
                const bounds: Array<{ season: keyof typeof SEASON_COLORS; start: number; end: number }> = [
                  { season: 'spring', start: 2, end: 5 },
                  { season: 'summer', start: 5, end: 8 },
                  { season: 'autumn', start: 8, end: 11 },
                  { season: 'winter', start: 11, end: 2 },
                ];
                return (
                  <g>
                    <g opacity={0.28}>
                      {bounds.map((s) => (
                        <path key={`wedge-${s.season}`} d={wedgePath(monthAngle(s.start), monthAngle(s.end))} fill={SEASON_COLORS[s.season]} />
                      ))}
                    </g>
                    {bounds.map((s) => {
                      const ang = labelAngle(s.start, s.end);
                      const [lx, ly] = polar(R_LABEL + R_LABEL_BAND_W / 2 + 22, ang);
                      return (
                        <text
                          key={`slab-${s.season}`}
                          x={lx} y={ly}
                          fontSize={13}
                          fontWeight={700}
                          fill={SEASON_COLORS[s.season]}
                          opacity={0.95}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontFamily="ui-monospace, monospace"
                          style={{ letterSpacing: '0.08em', textShadow: '0 0 4px rgba(0,0,0,0.85)' }}
                        >
                          {SEASON_LABEL[s.season]}
                        </text>
                      );
                    })}
                  </g>
                );
              })()}

              {/* Grid rings + tick labels — wrapped in the same oblique-
                   projection matrix as the month-label ring so in 3D
                   mode the radial scaffolding tilts with the spiral
                   rather than floating flat behind it. */}
              {(() => {
                const cosTilt = 0.55;
                const dz = 220 / Math.max(1, maxYear - minYear);
                const zTop = (maxYear - minYear) * dz;
                const tilt = view3D
                  ? `matrix(1 0 0 ${cosTilt} 0 ${(CY * (1 - cosTilt) - zTop).toFixed(2)})`
                  : undefined;
                return (
                  <g transform={tilt}>
                    {gridTicks.map((t, i) => {
                      const r = tickToR(t);
                      const isZero = anomaly && t === 0;
                      const labelEvery = anomaly ? 2 : 1;
                      const showLabel = isZero || i % labelEvery === 0;
                      return (
                        <g key={`ring-${t}`}>
                          <circle
                            cx={CX} cy={CY} r={r}
                            fill="none"
                            stroke={isZero ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.16)'}
                            strokeWidth={isZero ? 1 : 0.6}
                            strokeDasharray={isZero ? '0' : '3 5'}
                          />
                          {showLabel && (
                            <text
                              x={CX + r + 4} y={CY - 3}
                              fontSize={9} fill="rgba(255,255,255,0.45)"
                              fontFamily="ui-monospace, monospace"
                              paintOrder="stroke fill"
                              stroke="rgba(11,14,22,0.85)"
                              strokeWidth={2.5}
                            >
                              {anomaly && t > 0 ? '+' : ''}{t}{metric === 'temp' ? '°' : ''}
                            </text>
                          )}
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
                          stroke="rgba(255,255,255,0.14)" strokeWidth={0.6}
                        />
                      );
                    })}
                  </g>
                );
              })()}

              {/* Paris rings — labels offset to upper-left diagonal to avoid the
                   Jan label, right-side tick labels, and other Paris ring. Flat
                   circles, hidden in 3D mode where they'd float at the base. */}
              {!view3D && parisRings.map((ring, i) => {
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
              {showSpaghetti && renderYears.map((y) => {
                if (y === recordYear || y === oppositeYear || y === currentYear) return null;
                if (highlightRecent && y >= recentFrom) return null;
                const arr = yearMap.get(y)!;
                const pts = yearToPoints(arr);
                if (!pts) return null;
                return (
                  <path
                    key={`bg-${y}`}
                    d={smoothClosedPath(project3D(pts, y))}
                    fill="none"
                    stroke={yearColor(y, minYear, maxYear, bgAlpha, palette.high)}
                    strokeWidth={0.7}
                  />
                );
              })}

              {/* Recent-decade highlight */}
              {showSpaghetti && highlightRecent && renderYears
                .filter((y) => y >= recentFrom && y !== recordYear && y !== oppositeYear && y !== currentYear)
                .map((y) => {
                  const arr = yearMap.get(y)!;
                  const pts = yearToPoints(arr);
                  if (!pts) return null;
                  return (
                    <path
                      key={`hi-${y}`}
                      d={smoothClosedPath(project3D(pts, y))}
                      fill="none"
                      stroke={yearColor(y, minYear, maxYear, hiAlpha, palette.high)}
                      strokeWidth={1.4}
                    />
                  );
                })}

              {/* Baseline mean ring — hidden in anomaly mode, where it is
                   redundant with the 0° tick circle drawn earlier. Drawing it
                   anyway would imply “the baseline shape changes” which is
                   misleading (it can’t — it’s being subtracted from itself). */}
              {!anomaly && showBaselineRing && meanBaseline.every(Number.isFinite) && (() => {
                const pts: [number, number][] = meanBaseline.map((v, m) => polar(valueToR(v, m), monthAngle(m)));
                // Baseline ring sits at z corresponding to the midpoint of
                // its window, so in 3D it floats at the right height.
                const baselineYear = (baselineFrom + baselineTo) / 2;
                return (
                  <path
                    d={smoothClosedPath(project3D(pts, baselineYear))}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={2.1}
                    strokeDasharray="5 2"
                    strokeLinecap="round"
                    opacity={0.95}
                  />
                );
              })()}

              {/* Historic-period ring (user-chosen). Long warm-gold dashes —
                   the most ornamental of the three so it reads as the
                   "looking back" period. */}
              {showHistoric && meanHistoric.every(Number.isFinite) && (() => {
                const pts: [number, number][] = meanHistoric.map((v, m) => polar(valueToR(v, m), monthAngle(m)));
                const histYear = (historicFrom + historicTo) / 2;
                return (
                  <path
                    d={smoothClosedPath(project3D(pts, histYear))}
                    fill="none"
                    stroke="#E6B765"
                    strokeWidth={1.8}
                    strokeDasharray="10 4"
                  />
                );
              })()}

              {/* Recent decade ring — vivid crimson, tight dash. Heaviest
                   of the three so it dominates "now". */}
              {showRecentRing && meanRecent.every(Number.isFinite) && (() => {
                const pts: [number, number][] = meanRecent.map((v, m) => polar(valueToR(v, m), monthAngle(m)));
                const recentMid = (recentFrom + recentTo) / 2;
                return (
                  <path
                    d={smoothClosedPath(project3D(pts, recentMid))}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={2.1}
                    strokeDasharray="5 2"
                  />
                );
              })()}

              {/* Decadal seasonal-shift trail (temp + absolute only).
                   Each decade contributes a spring-crossing and autumn-crossing
                   dot, sitting on the 10°C ring. Connected by a coloured curve.
                   Spring dots are coloured in the spring-green family, autumn
                   in the autumn-brown family — so the colour itself encodes
                   which boundary you're looking at. Size grows from oldest
                   decade (small) to newest (large) so the direction of travel
                   is unmistakable. */}
              {!view3D && showShiftTrail && crossingDecades.length >= 2 && metric === 'temp' && !anomaly && (() => {
                const r10 = valueToR(SHIFT_THRESHOLD, 3); // m=3 (April) representative; valueToR ignores m in absolute mode
                if (!Number.isFinite(r10) || r10 <= 0) return null;
                const SPRING_DARK = '#166534'; // emerald-800
                const SPRING_LIGHT = '#86EFAC'; // emerald-300
                const AUTUMN_DARK = '#7C2D12'; // brown-900
                const AUTUMN_LIGHT = '#FDBA74'; // amber-300
                const lerpPair = (a: string, b: string, t: number) => {
                  const ah = a.replace('#', ''); const bh = b.replace('#', '');
                  const ar = parseInt(ah.slice(0,2),16), ag = parseInt(ah.slice(2,4),16), ab = parseInt(ah.slice(4,6),16);
                  const br = parseInt(bh.slice(0,2),16), bg = parseInt(bh.slice(2,4),16), bb = parseInt(bh.slice(4,6),16);
                  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
                };
                const n = crossingDecades.length;
                const springPts: [number, number, number, number][] = crossingDecades.map((d, i) => {
                  const [x, y] = polar(r10, monthAngle(d.spring));
                  return [x, y, d.decade, n === 1 ? 1 : i / (n - 1)];
                });
                const autumnPts: [number, number, number, number][] = crossingDecades.map((d, i) => {
                  const [x, y] = polar(r10, monthAngle(d.autumn));
                  return [x, y, d.decade, n === 1 ? 1 : i / (n - 1)];
                });
                const springPath = springPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
                const autumnPath = autumnPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
                return (
                  <g>
                    {/* Ghost 10°C ring (no text label — the season tints
                         and call-outs already explain what this is). */}
                    <circle cx={CX} cy={CY} r={r10} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.7} strokeDasharray="2 6" />
                    {/* Spring trail (light-green) */}
                    <path d={springPath} fill="none" stroke={SPRING_LIGHT} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
                    {/* Autumn trail (light-amber) */}
                    <path d={autumnPath} fill="none" stroke={AUTUMN_LIGHT} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
                    {/* Spring dots — dark→light green, small→large */}
                    {springPts.map(([x, y, dec, t]) => (
                      <circle key={`sp-${dec}`} cx={x} cy={y} r={2.5 + t * 2} fill={lerpPair(SPRING_DARK, SPRING_LIGHT, t)} stroke="#0b0e16" strokeWidth={0.8} />
                    ))}
                    {/* Autumn dots — dark→light brown, small→large */}
                    {autumnPts.map(([x, y, dec, t]) => (
                      <circle key={`au-${dec}`} cx={x} cy={y} r={2.5 + t * 2} fill={lerpPair(AUTUMN_DARK, AUTUMN_LIGHT, t)} stroke="#0b0e16" strokeWidth={0.8} />
                    ))}
                  </g>
                );
              })()}

              {/* Record year — high extreme (warmest/wettest/etc.) */}
              {showRecordHigh && recordYear > 0 && recordYear <= playCutoff && yearMap.get(recordYear) && (() => {
                const arr = yearMap.get(recordYear)!;
                const pts = yearToPoints(arr);
                if (!pts) return null;
                return (
                  <path
                    d={smoothClosedPath(project3D(pts, recordYear))}
                    fill="none"
                    stroke={palette.high}
                    strokeWidth={2.4}
                    opacity={0.95}
                  />
                );
              })()}

              {/* Record year — low extreme (coldest/driest/etc.) */}
              {showRecordLow && oppositeYear > 0 && oppositeYear !== recordYear && oppositeYear <= playCutoff && yearMap.get(oppositeYear) && (() => {
                const arr = yearMap.get(oppositeYear)!;
                const pts = yearToPoints(arr);
                if (!pts) return null;
                return (
                  <path
                    d={smoothClosedPath(project3D(pts, oppositeYear))}
                    fill="none"
                    stroke={palette.low}
                    strokeWidth={2.4}
                    opacity={0.95}
                  />
                );
              })()}

              {/* Current year (Jan→latest completed month, open path).
                   Segments between provisional months are dashed so the
                   provisional tail visually advertises itself as "still
                   subject to revision" — same convention as the spaghetti
                   chart above. */}
              {currentYear <= playCutoff && yearMap.get(currentYear) && (() => {
                const arr = yearMap.get(currentYear)!;
                const provSet = prov.get(currentYear) ?? new Set();
                const provPts: { m: number; r: number; provisional: boolean }[] = [];
                // Month-by-month finale: when playback enters the
                // current-year phase, draw only Jan..playMonth inclusive
                // so the user sees the latest year unfold one month at a
                // time.
                const monthLimit = playMonth !== null ? playMonth + 1 : 12;
                for (let m = 0; m < Math.min(12, monthLimit); m++) {
                  const v = arr[m];
                  if (!Number.isFinite(v)) break;
                  provPts.push({ m, r: valueToR(v, m), provisional: provSet.has(m) });
                }
                if (provPts.length < 2) return null;
                // Build two separate paths: a solid path for the confirmed
                // tail, and a dashed path for the provisional tail. The
                // dashed path picks up from the *last confirmed point* so
                // the user sees a continuous line.
                const solidSegs: string[] = [];
                const dashSegs: string[] = [];
                let firstProvIdx = provPts.findIndex((p) => p.provisional);
                if (firstProvIdx === -1) firstProvIdx = provPts.length;
                const solidPts = provPts.slice(0, firstProvIdx);
                const dashPts = firstProvIdx > 0
                  ? provPts.slice(firstProvIdx - 1) // include last confirmed point
                  : provPts;
                const proj = (x: number, y: number): [number, number] =>
                  project3D([[x, y]], currentYear)[0];
                solidPts.forEach((p, i) => {
                  const [x, y] = polar(p.r, monthAngle(p.m));
                  const [px, py] = proj(x, y);
                  solidSegs.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`);
                });
                dashPts.forEach((p, i) => {
                  const [x, y] = polar(p.r, monthAngle(p.m));
                  const [px, py] = proj(x, y);
                  dashSegs.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`);
                });
                return (
                  <g>
                    {solidSegs.length >= 2 && (
                      <path
                        d={solidSegs.join(' ')}
                        fill="none"
                        stroke={palette.current}
                        strokeWidth={2.6}
                        strokeLinecap="round"
                      />
                    )}
                    {dashSegs.length >= 2 && (
                      <path
                        d={dashSegs.join(' ')}
                        fill="none"
                        stroke={palette.current}
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        strokeDasharray="0 6"
                        opacity={0.95}
                      />
                    )}
                    {provPts.map((p) => {
                      const [x, y] = polar(p.r, monthAngle(p.m));
                      const [px, py] = proj(x, y);
                      return (
                        <circle
                          key={`cur-${p.m}`}
                          cx={px} cy={py} r={p.provisional ? 3 : 2.5}
                          fill={p.provisional ? '#FED7AA' : palette.current}
                          stroke="#7C2D12" strokeWidth={0.5}
                        />
                      );
                    })}
                    {/* Pulsing month-marker — only during the month-by-
                         month finale of playback. Anchored at the latest
                         drawn point so the eye is led to where the spiral
                         is currently extending. */}
                    {playYear === currentYear && playMonth !== null && provPts.length > 0 && (() => {
                      const last = provPts[provPts.length - 1];
                      const [x, y] = polar(last.r, monthAngle(last.m));
                      const [px, py] = proj(x, y);
                      return (
                        <g key="play-marker" pointerEvents="none">
                          <circle cx={px} cy={py} r={11} fill={palette.current} opacity={0.18}>
                            <animate attributeName="r" values="11;18;11" dur="1.2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.35;0.05;0.35" dur="1.2s" repeatCount="indefinite" />
                          </circle>
                          <circle cx={px} cy={py} r={6} fill={palette.current} stroke="#FFF5E7" strokeWidth={1.4} />
                        </g>
                      );
                    })()}
                  </g>
                );
              })()}

              {/* Hovered line: full ring highlight + marker dot. Sits above
                   the spaghetti but below the month labels. Works for both
                   individual year lines and the mean reference rings. */}
              {hover && (() => {
                const arr = hover.kind === 'year' ? yearMap.get(hover.year) : (
                  hover.label.startsWith(`${baselineFrom}–${baselineTo}`) ? meanBaseline :
                  hover.label.startsWith(`${historicFrom}–${historicTo}`) ? meanHistoric :
                  meanRecent
                );
                if (!arr) return null;
                const hoverYear = hover.kind === 'year' ? hover.year : (
                  hover.label.startsWith(`${baselineFrom}–${baselineTo}`) ? (baselineFrom + baselineTo) / 2 :
                  hover.label.startsWith(`${historicFrom}–${historicTo}`) ? (historicFrom + historicTo) / 2 :
                  (recentFrom + recentTo) / 2
                );
                const ptsRaw = arr.every(Number.isFinite) ? yearToPoints(arr) : null;
                const pts = ptsRaw ? project3D(ptsRaw, hoverYear) : null;
                const [mx, my] = project3D([polar(hover.r, monthAngle(hover.monthIdx))], hoverYear)[0];
                return (
                  <g pointerEvents="none">
                    {pts && (
                      <path
                        d={smoothClosedPath(pts)}
                        fill="none"
                        stroke="#FDE68A"
                        strokeWidth={2.2}
                        opacity={0.95}
                      />
                    )}
                    <circle cx={mx} cy={my} r={5} fill="#FDE68A" stroke="#0b0e16" strokeWidth={1.2} />
                  </g>
                );
              })()}

              {/* Month-label background "track" — a faint band giving the
                   month names a visible home so they no longer float in
                   space. In 3D mode we tilt the whole label group with
                   the same oblique projection as the spaghetti so the
                   month ring still reads as the rim of the chart. */}
              {(() => {
                // Match `project3D` constants so the labels line up with
                // the top of the year-stack (current year is at the top
                // of the spiral in 3D mode).
                const cosTilt = 0.55;
                const dz = 220 / Math.max(1, maxYear - minYear);
                const zTop = (maxYear - minYear) * dz;
                const tilt = view3D
                  ? `matrix(1 0 0 ${cosTilt} 0 ${(CY * (1 - cosTilt) - zTop).toFixed(2)})`
                  : undefined;
                return (
                  <g transform={tilt}>
                    <circle
                      cx={CX} cy={CY} r={R_LABEL}
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth={R_LABEL_BAND_W}
                    />
                    <circle
                      cx={CX} cy={CY} r={R_LABEL - R_LABEL_BAND_W / 2}
                      fill="none"
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth={0.6}
                    />
                    <circle
                      cx={CX} cy={CY} r={R_LABEL + R_LABEL_BAND_W / 2}
                      fill="none"
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth={0.6}
                    />

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
                          fill="rgba(220,225,235,0.92)"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontFamily="ui-monospace, monospace"
                        >
                          {MONTH_LABELS[m]}
                        </text>
                      );
                    })}
                  </g>
                );
              })()}

              {/* Season-crossing call-outs.
                   Two consolidated groups: "Spring starts" and "Autumn ends",
                   each anchored at the angular midpoint between the oldest
                   and newest decade crossing, with two coloured year sub-
                   labels at the leader endpoints and a "+N days earlier /
                   later" annotation. This replaces the previous four
                   separate stacked labels that were overlapping. Shown
                   whenever Season tints are on (so the user always sees
                   *where* spring/autumn have moved to), independently of
                   the per-decade trail toggle. */}
              {!view3D && showSeasons && crossingDecades.length >= 2 && (() => {
                const first = crossingDecades[0];
                const last = crossingDecades[crossingDecades.length - 1];
                const r10 = valueToR(SHIFT_THRESHOLD, 3);
                if (!Number.isFinite(r10) || r10 <= 0) return null;
                // Match the shifting-seasons map palette: cool blue
                // (#2166ac) for the older decade, warm red (#b2182b)
                // for the newer decade. Same diverging stops as the
                // global-shift-map so the two views speak one language.
                const oldCol = '#2166ac';
                const newCol = '#b2182b';
                // All call-out furniture lives *outside* the month-label
                // band so it never overlaps month names or the spaghetti
                // lines. Dots stay on the 10°C ring; leaders cross the
                // chart radially without bending.
                const rDotOut = R_OUTER + 6;
                const rYear = R_LABEL + R_LABEL_BAND_W / 2 + 22;
                const rHeader = R_LABEL + R_LABEL_BAND_W / 2 + 52;

                /** One consolidated call-out group. */
                const renderGroup = (
                  key: string,
                  header: string,
                  oldAng: number,
                  newAng: number,
                  shiftMonths: number,
                ) => {
                  const days = Math.round(Math.abs(shiftMonths) * DAYS_PER_MONTH);
                  const direction = header === 'Spring starts'
                    ? (shiftMonths > 0 ? 'earlier' : 'later')
                    : (shiftMonths > 0 ? 'later' : 'earlier');
                  const midAng = (oldAng + newAng) / 2;
                  const [hx, hy] = polar(rHeader, midAng);
                  const [ox0, oy0] = polar(r10, oldAng);
                  const [ox1, oy1] = polar(rDotOut, oldAng);
                  const [oxL, oyL] = polar(rYear, oldAng);
                  const [nx0, ny0] = polar(r10, newAng);
                  const [nx1, ny1] = polar(rDotOut, newAng);
                  const [nxL, nyL] = polar(rYear, newAng);
                  return (
                    <g key={key}>
                      {/* leader dots on the 10°C ring */}
                      <circle cx={ox0} cy={oy0} r={3} fill={oldCol} stroke="#0b0e16" strokeWidth={0.8} />
                      <circle cx={nx0} cy={ny0} r={3} fill={newCol} stroke="#0b0e16" strokeWidth={0.8} />
                      {/* radial leaders out to the year-label pills */}
                      <line x1={ox1} y1={oy1} x2={oxL} y2={oyL} stroke={oldCol} strokeWidth={1} opacity={0.85} />
                      <line x1={nx1} y1={ny1} x2={nxL} y2={nyL} stroke={newCol} strokeWidth={1} opacity={0.85} />
                      {/* year-label pills — dark rounded backdrops so the
                           text never fights with the spaghetti behind it. */}
                      <rect x={oxL - 18} y={oyL - 8} width={36} height={15} rx={7.5} fill="rgba(10,14,22,0.85)" stroke={oldCol} strokeWidth={0.8} />
                      <text x={oxL} y={oyL + 3} fontSize={10} fontWeight={700} fill={oldCol} textAnchor="middle" fontFamily="ui-monospace, monospace">
                        {first.decade}s
                      </text>
                      <rect x={nxL - 18} y={nyL - 8} width={36} height={15} rx={7.5} fill="rgba(10,14,22,0.85)" stroke={newCol} strokeWidth={0.8} />
                      <text x={nxL} y={nyL + 3} fontSize={10} fontWeight={700} fill={newCol} textAnchor="middle" fontFamily="ui-monospace, monospace">
                        {last.decade}s
                      </text>
                      {/* consolidated header pill — "Spring starts" with
                           shift in days. Positioned even further out so it
                           doesn't fight with the year pills. */}
                      <rect x={hx - 48} y={hy - 13} width={96} height={28} rx={6} fill="rgba(10,14,22,0.88)" stroke="rgba(255,255,255,0.18)" strokeWidth={0.8} />
                      <text x={hx} y={hy - 2} fontSize={11} fontWeight={700} fill="rgba(245,245,245,0.95)" textAnchor="middle" fontFamily="ui-monospace, monospace">
                        {header}
                      </text>
                      <text x={hx} y={hy + 10} fontSize={10} fill="rgba(220,225,235,0.85)" textAnchor="middle" fontFamily="ui-monospace, monospace">
                        {days} days {direction}
                      </text>
                    </g>
                  );
                };

                return (
                  <g pointerEvents="none">
                    {renderGroup('spring', 'Spring starts', monthAngle(first.spring), monthAngle(last.spring), first.spring - last.spring)}
                    {renderGroup('autumn', 'Autumn ends',   monthAngle(first.autumn), monthAngle(last.autumn), last.autumn - first.autumn)}
                  </g>
                );
              })()}
            </svg>

            {/* Hover tooltip — positioned in viewBox % so it tracks the SVG
                 regardless of responsive resize. */}
            {hover && (() => {
              const pctX = (hover.sx / VB) * 100;
              const pctY = (hover.sy / VB) * 100;
              const onLeft = pctX > 55;
              const anomalyVal = anomaly && Number.isFinite(meanBaseline[hover.monthIdx])
                ? hover.value - meanBaseline[hover.monthIdx]
                : null;
              const dec = METRIC_DECIMALS[metric];
              // Annotate the hovered line with context the user can't get
              // from the value alone: is this a record year? how does it
              // sit relative to the baseline?
              const baselineMonthly = Number.isFinite(meanBaseline[hover.monthIdx]) ? meanBaseline[hover.monthIdx] : null;
              const recentMonthly = Number.isFinite(meanRecent[hover.monthIdx]) ? meanRecent[hover.monthIdx] : null;
              // Top-level record callout (above the value). Uses the
              // metric-aware vocabulary from the palette ("Warmest",
              // "Dullest", etc.) and the matching accent colour so the
              // user immediately spots that the line they're hovering is
              // a record-holder. Falls back to chip-style tags for the
              // softer "in baseline window" / "in modern window" bits.
              const recordCallout = hover.kind === 'year'
                ? (hover.year === recordYear
                    ? { word: palette.highWord, color: palette.high }
                    : (hover.year === oppositeYear && oppositeYear !== recordYear
                        ? { word: palette.lowWord, color: palette.low }
                        : null))
                : null;
              const tags: { label: string; cls: string }[] = [];
              if (hover.kind === 'year') {
                if (hover.year === currentYear) tags.push({ label: 'This year (in progress)', cls: 'text-amber-300 border-amber-400/60' });
                if (hover.year >= recentFrom && hover.year <= recentTo) tags.push({ label: 'Modern window', cls: 'text-rose-200 border-rose-400/40' });
                if (hover.year >= baselineFrom && hover.year <= baselineTo) tags.push({ label: 'Baseline window', cls: 'text-gray-200 border-gray-400/40' });
                if (showHistoric && hover.year >= historicFrom && hover.year <= historicTo) tags.push({ label: 'Historic window', cls: 'text-amber-200 border-amber-300/40' });
              }
              return (
                <div
                  className="absolute pointer-events-none z-10 rounded-md border border-gray-700 bg-gray-950/95 px-2.5 py-1.5 text-[11px] font-mono shadow-lg whitespace-nowrap"
                  style={{
                    left: `${pctX}%`,
                    top: `${pctY}%`,
                    transform: `translate(${onLeft ? 'calc(-100% - 10px)' : '10px'}, -50%)`,
                  }}
                >
                  <div className="text-[#FFF5E7] font-semibold">{hover.label}</div>
                  <div className="text-gray-400 text-[10px]">{MONTH_LABELS[hover.monthIdx]}</div>
                  {recordCallout && (
                    <div
                      className="mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: recordCallout.color, borderColor: `${recordCallout.color}99`, background: `${recordCallout.color}22` }}
                    >
                      ◆ {recordCallout.word} on record
                    </div>
                  )}
                  <div className="text-gray-200 tabular-nums">
                    {hover.value.toFixed(dec)} {METRIC_UNIT[metric]}
                  </div>
                  {anomalyVal !== null && (
                    <div className={`tabular-nums ${anomalyVal >= 0 ? 'text-rose-300' : 'text-sky-300'}`}>
                      {anomalyVal >= 0 ? '+' : ''}{anomalyVal.toFixed(dec)} vs baseline
                    </div>
                  )}
                  {!anomaly && baselineMonthly !== null && hover.kind === 'year' && (
                    <div className="tabular-nums text-gray-400 text-[10px]">
                      Δ baseline: {(hover.value - baselineMonthly >= 0 ? '+' : '')}{(hover.value - baselineMonthly).toFixed(dec)} {METRIC_UNIT[metric]}
                    </div>
                  )}
                  {!anomaly && recentMonthly !== null && hover.kind === 'year' && hover.year < recentFrom && (
                    <div className="tabular-nums text-gray-400 text-[10px]">
                      Δ modern: {(hover.value - recentMonthly >= 0 ? '+' : '')}{(hover.value - recentMonthly).toFixed(dec)} {METRIC_UNIT[metric]}
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span key={t.label} className={`inline-flex items-center rounded-full border px-1.5 py-px text-[9px] ${t.cls}`}>
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Playback bar — sits *directly below* the chart so it reads
               as a media-player control attached to the visualisation
               (rather than buried inside the View-controls panel). Step
               buttons let the user scrub year-by-year (or month-by-month
               in the finale window) without restarting the animation. */}
          <div className="mt-3 rounded-xl border border-[#D0A65E]/40 bg-[#0b0e16] p-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                // In the month-by-month finale, step a month back; otherwise step a year.
                if (playYear === currentYear && playMonth !== null) {
                  if (playMonth > 0) setPlayMonth(playMonth - 1);
                  else { setPlayMonth(null); setPlayYear(currentYear - 1); }
                } else {
                  const cur = playYear ?? effectiveFromYear;
                  setPlayYear(Math.max(effectiveFromYear, cur - 1));
                  setPlayMonth(null);
                }
              }}
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} h-9 px-3`}
              title="Step one year (or month, in the finale) back"
              aria-label="Step back"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5L9 12l11 7V5z"/></svg>
            </button>
            <button
              type="button"
              onClick={() => {
                if (playing) { setPlaying(false); return; }
                if (playYear === null || (playYear >= currentYear && playMonth !== null && playMonth >= (latestRealMonthIdx >= 0 ? latestRealMonthIdx : 11))) {
                  setPlayYear(effectiveFromYear - 1);
                  setPlayMonth(null);
                }
                setPlaying(true);
              }}
              className={`${TOGGLE_BASE} h-9 px-4 font-semibold ${playing ? '' : ''}`}
              style={playing
                ? { borderColor: '#D0A65E', background: '#D0A65E22', color: '#FFF5E7' }
                : { borderColor: '#D0A65E', background: '#D0A65E', color: '#0b0e16' }}
              aria-label={playing ? 'Pause animation' : 'Play animation'}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7-11-7z"/></svg>
              )}
              {playing ? 'Pause' : (playYear !== null && playYear < currentYear ? 'Resume' : 'Play')}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                // In the month-by-month finale, step a month forward; otherwise step a year.
                if (playYear === currentYear && playMonth !== null) {
                  const lastM = latestRealMonthIdx >= 0 ? latestRealMonthIdx : 11;
                  if (playMonth < lastM) setPlayMonth(playMonth + 1);
                } else {
                  const cur = playYear ?? (effectiveFromYear - 1);
                  if (cur >= currentYear - 1) { setPlayYear(currentYear); setPlayMonth(0); }
                  else { setPlayYear(cur + 1); setPlayMonth(null); }
                }
              }}
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} h-9 px-3`}
              title="Step one year (or month, in the finale) forward"
              aria-label="Step forward"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5l11 7-11 7zM16 5h2v14h-2z"/></svg>
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setPlayYear(null); setPlayMonth(null); }}
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} h-9 px-3`}
              title="Stop playback and show the full chart"
              disabled={playYear === null && !playing}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
              Reset
            </button>
            <div className="flex items-center gap-2 ml-1">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Speed</span>
              <input
                type="range"
                min={2}
                max={32}
                step={1}
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="accent-[#D0A65E] w-24"
                aria-label="Playback speed (years per second)"
              />
              <span className="font-mono text-[11px] text-[#FFF5E7] min-w-[3ch]">{playSpeed}×</span>
            </div>
            {playYear !== null && (
              <span className="font-mono text-[12px] text-[#D0A65E] ml-auto tabular-nums">
                {Math.max(effectiveFromYear, playYear)}{playYear === currentYear && playMonth !== null ? `-${String(playMonth + 1).padStart(2, '0')}` : ''} / {currentYear}
              </span>
            )}
          </div>

          {/* Controls — view toggles grouped into clear sections (Lines /
               Means / Seasons / Mode) so the chip soup is easier to
               scan. The From-year + Spaghetti-boost sliders live at the
               top of the panel; Presets sit beneath the toggle groups. */}
          <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-gray-300">
              <span className="uppercase tracking-wider text-[10px] text-gray-500">From</span>
              <div className="w-28 sm:w-36">
                <SingleRangeSlider
                  min={minYear}
                  max={Math.max(minYear, maxYear - 10)}
                  step={5}
                  value={effectiveFromYear}
                  onChange={setYearFrom}
                  accent="#D0A65E"
                />
              </div>
              <span className="font-mono text-[#FFF5E7] min-w-[3ch]">{effectiveFromYear}</span>
              <span className="uppercase tracking-wider text-[10px] text-gray-500 ml-2">Spaghetti boost</span>
              <div className="w-24 sm:w-28">
                <SingleRangeSlider
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(lineAlpha * 100)}
                  onChange={(v) => setLineAlpha(v / 100)}
                  accent={palette.high}
                />
              </div>
              <span className="font-mono text-[#FFF5E7] min-w-[3ch] tabular-nums">+{Math.round(lineAlpha * 100)}%</span>
            </div>

            {/* Mode — anomaly toggle + 3D promotion. Sits at the top of
                 the toggle stack so the user finds 3D immediately. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="uppercase tracking-wider text-[10px] text-gray-500 mr-1 w-12">Mode</span>
              <ChipToggle active={anomaly} onChange={setAnomaly} color="#D0A65E">
                Anomaly <span className="text-[10px] text-gray-400">vs {baselineFrom}–{baselineTo}</span>
              </ChipToggle>
              <ChipToggle active={view3D} onChange={setView3D} color="#A78BFA">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg>
                3D <span className="text-[10px] text-gray-400">height = time</span>
              </ChipToggle>
            </div>

            {/* Lines — per-year spaghetti + the highlighted recent decade
                 + the warmest/coldest year rings. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="uppercase tracking-wider text-[10px] text-gray-500 mr-1 w-12">Lines</span>
              <ChipToggle active={showSpaghetti} onChange={setShowSpaghetti} color={palette.high}>
                Year spaghetti
              </ChipToggle>
              <ChipToggle active={highlightRecent} onChange={setHighlightRecent} color={palette.high}>
                Highlight {recentFrom}–{recentTo}
              </ChipToggle>
              <ChipToggle active={showRecordHigh} onChange={setShowRecordHigh} color={palette.high}>
                {palette.highWord} year
              </ChipToggle>
              <ChipToggle active={showRecordLow} onChange={setShowRecordLow} color={palette.low}>
                {palette.lowWord} year
              </ChipToggle>
            </div>

            {/* Means — dashed reference rings. Baseline only meaningful
                 in absolute mode; modern always available. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="uppercase tracking-wider text-[10px] text-gray-500 mr-1 w-12">Means</span>
              {!anomaly && (
                <ChipToggle active={showBaselineRing} onChange={setShowBaselineRing} color="#9CA3AF">
                  Baseline ring <span className="text-[10px] text-gray-400">{baselineFrom}–{baselineTo}</span>
                </ChipToggle>
              )}
              <ChipToggle active={showRecentRing} onChange={setShowRecentRing} color={palette.current}>
                Modern ring <span className="text-[10px] text-gray-400">{recentFrom}–{recentTo}</span>
              </ChipToggle>
              <ChipToggle active={showHistoric} onChange={setShowHistoric} color="#94A3B8">
                Historic ring <span className="text-[10px] text-gray-400">{historicFrom}–{historicTo}</span>
              </ChipToggle>
            </div>

            {/* Seasons — tints, shift trail, Paris rings. Hidden cleanly
                 when the relevant metric/mode doesn't support them. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="uppercase tracking-wider text-[10px] text-gray-500 mr-1 w-12">Seasons</span>
              <ChipToggle active={showSeasons} onChange={setShowSeasons} color="#86EFAC">
                Season tints
              </ChipToggle>
              {metric === 'temp' && (
                <ChipToggle active={showParis} onChange={setShowParis} color="#FBBF24">
                  Paris rings
                </ChipToggle>
              )}
              {metric === 'temp' && !anomaly && (
                <ChipToggle active={showShiftTrail} onChange={setShowShiftTrail} color="#86EFAC">
                  Season-shift trail
                </ChipToggle>
              )}
              {metric === 'temp' && anomaly && (
                <span className="text-[10px] text-gray-500 italic self-center">Season-shift trail only shown in absolute mode</span>
              )}
            </div>

            {/* Presets — one-click chart configurations to tell a specific story */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-800/70">
              <span className="uppercase tracking-wider text-[10px] text-gray-500 mr-1 w-12">Presets</span>
              <button
                type="button"
                onClick={() => {
                  if (available.includes('temp')) setMetric('temp');
                  setAnomaly(false);
                  setShowShiftTrail(true);
                  setShowSeasons(true);
                  setShowSpaghetti(false);
                  setHighlightRecent(false);
                  setShowRecordHigh(false);
                  setShowRecordLow(false);
                  setShowParis(false);
                  setShowHistoric(false);
                }}
                className={`${TOGGLE_BASE} border-emerald-700/60 bg-emerald-900/20 text-emerald-200 hover:bg-emerald-800/40 hover:border-emerald-500`}
                title="Configure the chart to highlight how growing-season length has shifted decade by decade"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
                Shifting seasons
              </button>
              <button
                type="button"
                onClick={() => {
                  if (available.includes('temp')) setMetric('temp');
                  setAnomaly(true);
                  setShowShiftTrail(false);
                  setShowSpaghetti(false);
                  setHighlightRecent(false);
                  setShowRecordHigh(false);
                  setShowRecordLow(false);
                  setShowParis(false);
                  setShowHistoric(true);
                }}
                className={`${TOGGLE_BASE} border-rose-700/60 bg-rose-900/20 text-rose-200 hover:bg-rose-800/40 hover:border-rose-500`}
                title="Anomaly mode comparing the historic and modern windows against the baseline"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>
                Then vs now
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnomaly(false);
                  setShowShiftTrail(false);
                  setShowSeasons(true);
                  setShowSpaghetti(true);
                  setHighlightRecent(true);
                  setShowRecordHigh(true);
                  setShowRecordLow(true);
                  setShowParis(metric === 'temp');
                  setShowHistoric(false);
                  setShowBaselineRing(true);
                  setShowRecentRing(true);
                  setBaselineRange(defaultBaselineRange);
                  setRecentRange(defaultRecentRange);
                  setHistoricRange(defaultHistoricRange);
                }}
                className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE}`}
                title="Restore the default overview"
              >
                Default view
              </button>
            </div>
          </div>

          {/* Compare periods — user-adjustable baseline & comparison windows */}
          <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900/40 p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h4 className="text-[10px] uppercase tracking-wider text-gray-500">Compare periods</h4>
              <button
                type="button"
                onClick={() => {
                  setBaselineRange(defaultBaselineRange);
                  setHistoricRange(defaultHistoricRange);
                  setRecentRange(defaultRecentRange);
                  setShowHistoric(false);
                }}
                className="inline-flex items-center gap-1 rounded border border-gray-700 bg-gray-800/60 px-2 py-0.5 text-[10px] text-gray-300 hover:bg-[#D0A65E]/20 hover:border-[#D0A65E]/60 hover:text-[#FFF5E7] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">Baseline</span>
                  <span className="font-mono text-[11px] text-[#FFF5E7] tabular-nums">
                    {baselineFrom}–{baselineTo}
                    <span className="text-gray-500"> ({baselineTo - baselineFrom + 1}y)</span>
                  </span>
                </div>
                <DualRangeSlider
                  min={minYear}
                  max={maxYear}
                  value={baselineRange}
                  onChange={setBaselineRange}
                  accent="#CBD5E1"
                  minGap={4}
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">Modern</span>
                  <span className="font-mono text-[11px] text-[#FFF5E7] tabular-nums">
                    {recentFrom}–{recentTo}
                    <span className="text-gray-500"> ({recentTo - recentFrom + 1}y)</span>
                  </span>
                </div>
                <DualRangeSlider
                  min={minYear}
                  max={maxYear}
                  value={recentRange}
                  onChange={setRecentRange}
                  accent="#EF4444"
                  minGap={1}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-baseline justify-between mb-1">
                  <label className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHistoric}
                      onChange={(e) => setShowHistoric(e.target.checked)}
                      className="accent-[#D0A65E]"
                    />
                    Historic (add 3rd ring)
                  </label>
                  <span className={`font-mono text-[11px] tabular-nums ${showHistoric ? 'text-[#FFF5E7]' : 'text-gray-600'}`}>
                    {historicFrom}–{historicTo}
                    <span className={showHistoric ? 'text-gray-500' : 'text-gray-700'}> ({historicTo - historicFrom + 1}y)</span>
                  </span>
                </div>
                <div className={showHistoric ? '' : 'opacity-40 pointer-events-none'}>
                  <DualRangeSlider
                    min={minYear}
                    max={maxYear}
                    value={historicRange}
                    onChange={setHistoricRange}
                    accent="#E6B765"
                    minGap={4}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10.5px] text-gray-500 leading-snug">
              {anomaly ? (
                <>
                  In <span className="text-gray-300">anomaly mode</span> every value is
                  shown as a delta from your baseline window, so the baseline ring would be
                  zero at every month — a perfect circle providing no information — and is
                  therefore hidden. The <span className="text-rose-300">modern ring</span>
                  {showHistoric && <> and <span className="text-[#D0A65E]">historic ring</span></>}
                  &nbsp;trace, month by month, how much warmer (or colder) each window is
                  versus your baseline. Bulges where the warming is biggest, pinches where
                  it&apos;s smallest.
                </>
              ) : (
                <>
                  The grey ring is the mean of your <span className="text-gray-300">baseline</span> years.
                  The red ring is the mean of your <span className="text-rose-300">modern</span> years.
                  {showHistoric && <> The gold ring is your <span className="text-[#D0A65E]">historic</span> period.</>}
                  &nbsp;Slide any window to test how much of the gap is climate change vs. baseline choice.
                  Slide either window to test how much of the gap is climate change vs. baseline choice.
                </>
              )}
            </p>
          </div>

          {/* Series legend lives above the chart now — see top of section. */}
        </div>

        {/* ─── Section 2: Annual records & trends ────────────────────────
             On desktop, sparklines occupy a 2×2 grid on the left while the
             records table sits on the right. On mobile they stack. */}
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3 pb-1 border-b border-white/10">
            Annual records &amp; trends
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="grid grid-cols-2 gap-3 content-start">
              {METRIC_ORDER.filter((m) => annuals[m]?.length).map((m) => (
                <Sparkline
                  key={m}
                  title={METRIC_LABEL[m]}
                  data={annuals[m]!}
                  color={METRIC_PALETTE[m].current}
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
              palette={palette}
            />
          </div>
        </div>
      </div>

      {dataSource && (
        <p className="text-[11px] text-gray-500 mt-4">{dataSource} · Paris rings vs UK CET 1850–1900 baseline.</p>
      )}

      {share && !hideShare && (() => {
        const embedUrl = embedSlug
          ? `https://4billionyearson.org/climate/embed/spiral/${encodeURIComponent(embedSlug)}?metric=${metric}`
          : undefined;
        const title = `${regionName} – Climate Spiral`;
        const embedCode = embedUrl
          ? `<iframe\n  src="${embedUrl}"\n  width="100%" height="900"\n  style="border:none;"\n  title="${title} - 4 Billion Years On"\n></iframe>`
          : undefined;
        return (
          <ShareBar
            pageUrl={`${share.pageUrl}#${share.sectionId}`}
            shareText={encodeURIComponent(`${title} - live data on 4 Billion Years On`)}
            emailSubject={`${title} - 4 Billion Years On`}
            embedUrl={embedUrl}
            embedCode={embedCode}
          />
        );
      })()}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * DualRangeSlider — two overlapping range inputs forming a [lo, hi] selector.
 *   - Track + active range bar rendered as absolutely-positioned divs.
 *   - Native thumbs styled via Tailwind arbitrary variants
 *     (no globals.css change required).
 *   - minGap keeps the handles from crossing.
 * ──────────────────────────────────────────────────────────────────────── */

function DualRangeSlider({
  min, max, value, onChange, accent = '#D0A65E', minGap = 1,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  accent?: string;
  minGap?: number;
}) {
  const [lo, hi] = value;
  const pct = (n: number) => max === min ? 0 : ((n - min) / (max - min)) * 100;
  const thumbStyles =
    'pointer-events-none absolute inset-y-0 left-2 right-2 appearance-none bg-transparent ' +
    '[&::-webkit-slider-runnable-track]:bg-transparent ' +
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none ' +
    '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 ' +
    '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 ' +
    '[&::-webkit-slider-thumb]:border-gray-900 [&::-webkit-slider-thumb]:cursor-pointer ' +
    '[&::-webkit-slider-thumb]:shadow ' +
    '[&::-moz-range-track]:bg-transparent ' +
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none ' +
    '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 ' +
    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 ' +
    '[&::-moz-range-thumb]:border-gray-900 [&::-moz-range-thumb]:cursor-pointer';
  // Map a value 0..100% to a left position inside the 16px-padded track,
  // so the visual track + active-range bars stay inside the parent box and
  // the thumbs (≈14px wide) never poke past the edge.
  const trackPos = (n: number) => `calc(8px + (100% - 16px) * ${pct(n) / 100})`;
  return (
    <div className="relative h-5 w-full select-none">
      {/* base track — inset by 8px each side to make room for the thumbs */}
      <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gray-700" />
      {/* active range */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
        style={{ left: trackPos(lo), width: `calc(${trackPos(hi)} - ${trackPos(lo)})`, background: accent }}
      />
      <input
        type="range" min={min} max={max} value={lo} aria-label="Range start"
        onChange={(e) => {
          const n = Math.min(Number(e.target.value), hi - minGap);
          if (Number.isFinite(n)) onChange([Math.max(min, n), hi]);
        }}
        className={thumbStyles}
        style={{ ['--thumb-bg' as string]: accent, accentColor: 'transparent' } as React.CSSProperties}
      />
      <input
        type="range" min={min} max={max} value={hi} aria-label="Range end"
        onChange={(e) => {
          const n = Math.max(Number(e.target.value), lo + minGap);
          if (Number.isFinite(n)) onChange([lo, Math.min(max, n)]);
        }}
        className={thumbStyles}
        style={{ ['--thumb-bg' as string]: accent, accentColor: 'transparent' } as React.CSSProperties}
      />
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb { background: ${accent}; }
        input[type='range']::-moz-range-thumb { background: ${accent}; }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SingleRangeSlider — a single-thumb slider with the same custom track +
 * thumb visuals as DualRangeSlider, so the "From" and "Spaghetti opacity"
 * controls live in the same visual family as the Compare-periods sliders
 * below.
 * ──────────────────────────────────────────────────────────────────────── */

function SingleRangeSlider({
  min, max, step = 1, value, onChange, accent = '#D0A65E',
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const trackPos = `calc(8px + (100% - 16px) * ${pct / 100})`;
  const thumbStyles =
    'absolute inset-y-0 left-2 right-2 appearance-none bg-transparent w-[calc(100%-16px)] ' +
    '[&::-webkit-slider-runnable-track]:bg-transparent ' +
    '[&::-webkit-slider-thumb]:appearance-none ' +
    '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 ' +
    '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 ' +
    '[&::-webkit-slider-thumb]:border-gray-900 [&::-webkit-slider-thumb]:cursor-pointer ' +
    '[&::-webkit-slider-thumb]:shadow ' +
    '[&::-moz-range-track]:bg-transparent ' +
    '[&::-moz-range-thumb]:appearance-none ' +
    '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 ' +
    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 ' +
    '[&::-moz-range-thumb]:border-gray-900 [&::-moz-range-thumb]:cursor-pointer';
  return (
    <div className="relative h-5 w-full select-none">
      <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gray-700" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
        style={{ left: '8px', width: `calc(${trackPos} - 8px)`, background: accent }}
      />
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={thumbStyles}
        style={{ accentColor: 'transparent' } as React.CSSProperties}
      />
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb { background: ${accent}; }
        input[type='range']::-moz-range-thumb { background: ${accent}; }
      `}</style>
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
  metric, yearMap, currentYear, palette,
}: {
  metric: SpaghettiMetric;
  yearMap: YearMap;
  currentYear: number;
  palette: MetricPalette;
}) {
  const agg = METRIC_AGG[metric];
  const unit = METRIC_UNIT[metric];
  const dec = METRIC_DECIMALS[metric];
  const [view, setView] = useState<'year' | 'seasons' | 'months'>('year');

  const highLabel = palette.highWord;
  const lowLabel = palette.lowWord;

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
              <td className={`py-1 text-right ${palette.highTextClass}`}>{yearRows.high[0]}</td>
              <td className="py-1 text-right text-gray-300 tabular-nums">{yearRows.high[1].toFixed(dec)} {unit}</td>
            </tr>
            <tr className="border-b border-gray-800/60">
              <td className="py-1 text-gray-400">{lowLabel} year</td>
              <td className={`py-1 text-right ${palette.lowTextClass}`}>{yearRows.low[0]}</td>
              <td className="py-1 text-right text-gray-300 tabular-nums">{yearRows.low[1].toFixed(dec)} {unit}</td>
            </tr>
            {yearRows.ytdRank && (
              <tr>
                <td className="py-1 text-gray-400">{currentYear} so far</td>
                <td className={`py-1 text-right ${palette.currentTextClass}`}>#{yearRows.ytdRank.rank}<span className="text-gray-500"> of {yearRows.ytdRank.total}</span></td>
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
                    <span className={palette.highTextClass}>{s.high[0]}</span>
                  ) : <span className="text-gray-600">—</span>}
                  {s.high && <span className="text-gray-500 ml-1 tabular-nums">{s.high[1].toFixed(dec)}{METRIC_UNIT[metric] === '°C' ? '°' : ''}</span>}
                </td>
                <td className="py-1 text-right">
                  {s.low ? (
                    <span className={palette.lowTextClass}>{s.low[0]}</span>
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
                      <span className={palette.highTextClass}>{m.high[0]}</span>
                    ) : <span className="text-gray-600">—</span>}
                    {m.high && <span className="text-gray-500 ml-1 tabular-nums">{m.high[1].toFixed(dec)}{METRIC_UNIT[metric] === '°C' ? '°' : ''}</span>}
                  </td>
                  <td className="py-1 text-right">
                    {m.low ? (
                      <span className={palette.lowTextClass}>{m.low[0]}</span>
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
