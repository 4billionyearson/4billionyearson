"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Thermometer, CloudRain, Sun, Snowflake, Waves } from 'lucide-react';
import type { MonthlyPoint, SpaghettiMetric } from './monthly-spaghetti-chart';
import ShareBar from '@/app/climate/enso/_components/ShareBar';

/* ────────────────────────────────────────────────────────────────────────────
 * The 4BYO Climate Helix
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
  /** Show the ENSO HUD card. Defaults to false; only relevant for regions
   *  where ENSO has a clear teleconnection (e.g. UK, US, Australia, India). */
  showEnso?: boolean;
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
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ background: active ? color : 'transparent', border: `1px solid ${active ? color : '#4B5563'}` }}
      />
      <span className="leading-none whitespace-nowrap">{children}</span>
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
  temp: 'Temp',
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
export const METRIC_PALETTE: Record<SpaghettiMetric, MetricPalette> = {
  temp:     { high: '#DC2626', low: '#38BDF8', current: '#FBBF24',
              highTextClass: 'text-red-300',   lowTextClass: 'text-sky-300',   currentTextClass: 'text-amber-300',
              highWord: 'Warmest',  lowWord: 'Coldest' },
  precip:   { high: '#3B82F6', low: '#B45309', current: '#7DD3FC',
              highTextClass: 'text-blue-300',  lowTextClass: 'text-amber-300', currentTextClass: 'text-sky-200',
              highWord: 'Wettest',  lowWord: 'Driest' },
  sunshine: { high: '#F59E0B', low: '#64748B', current: '#FDE047',
              highTextClass: 'text-amber-300', lowTextClass: 'text-slate-400', currentTextClass: 'text-yellow-200',
              highWord: 'Sunniest', lowWord: 'Dullest' },
  frost:    { high: '#38BDF8', low: '#F97316', current: '#8cedbc',
              highTextClass: 'text-sky-300',   lowTextClass: 'text-orange-300',currentTextClass: 'text-[#8cedbc]',
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

export function buildYearMap(points: MonthlyPoint[] | undefined, provAfter: { year: number; month: number } | null) {
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

/* ── Preference persistence ──────────────────────────────────────────────
 * Saved to localStorage under this key so the user's last display settings
 * survive navigation and tab closes. Read once via lazy useState initialiser;
 * written back any time a persisted setting changes. */
const HELIX_PREFS_KEY = '4byo-helix-prefs';
function loadHelixPrefs(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(HELIX_PREFS_KEY) ?? '{}'); }
  catch { return {}; }
}

export default function ClimateSpiralCard({
  series,
  regionName,
  dataSource,
  provisionalAfterMonth = null,
  sectionId = 'climate-spiral',
  embedSlug,
  share,
  hideShare = false,
  showEnso = false,
}: Props) {
  const available = METRIC_ORDER.filter((m) => (series[m]?.length ?? 0) > 0);
  const fallback: SpaghettiMetric = available[0] ?? 'temp';
  const [metric, setMetric] = useState<SpaghettiMetric>(() => {
    const saved = loadHelixPrefs().metric as SpaghettiMetric | undefined;
    if (saved && available.includes(saved)) return saved;
    return fallback;
  });
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
  const [anomaly, setAnomaly] = useState(() => (loadHelixPrefs().anomaly as boolean) ?? false);
  const [showSeasons, setShowSeasons] = useState(() => (loadHelixPrefs().showSeasons as boolean) ?? true);
  const [highlightRecent, setHighlightRecent] = useState(() => (loadHelixPrefs().highlightRecent as boolean) ?? true);
  const [showParis, setShowParis] = useState(() => (loadHelixPrefs().showParis as boolean) ?? true);
  const [showShiftTrail, setShowShiftTrail] = useState(() => (loadHelixPrefs().showShiftTrail as boolean) ?? true);
  const [showRecordHigh, setShowRecordHigh] = useState(() => (loadHelixPrefs().showRecordHigh as boolean) ?? true);
  const [showRecordLow, setShowRecordLow] = useState(() => (loadHelixPrefs().showRecordLow as boolean) ?? true);
  const [showSpaghetti, setShowSpaghetti] = useState(() => (loadHelixPrefs().showSpaghetti as boolean) ?? true);
  /** User-adjustable "boost" on the year-spaghetti opacity. At 0 the
   *  lines render at their original baked-in alpha (subtle, lets the
   *  reference rings dominate); at 1.0 they ramp up to fully opaque,
   *  useful when sharing a still or pointing at a specific year. */
  const [lineAlpha, setLineAlpha] = useState(() => (loadHelixPrefs().lineAlpha as number) ?? 2);
  /** Convert the user-facing 0..1 boost into stroke-alpha multipliers
   *  for the background and recent-decade highlight passes. */
  const bgAlpha = Math.min(1, 0.32 + 0.68 * lineAlpha);
  const hiAlpha = Math.min(1, 0.85 + 0.15 * lineAlpha);
  // Once alpha saturates (boost ≥ 100%), further boost widens the
  // strokes so the user can keep amplifying spaghetti density.
  const bgWidth = 0.7 * Math.max(1, Math.min(3, lineAlpha * 0.8 + 0.2));
  const hiWidth = 1.4 * Math.max(1, Math.min(2.5, lineAlpha * 0.7 + 0.3));
  /** 3D mode — re-projects each year's loop onto a tilted plane and
   *  stacks them vertically so height encodes time. */
  const [view3D, setView3D] = useState(() => (loadHelixPrefs().view3D as boolean) ?? false);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const points = series[metric] ?? [];
  const { yearMap, prov, minYear, maxYear } = useMemo(
    () => buildYearMap(points, provisionalAfterMonth),
    [points, provisionalAfterMonth],
  );

  // Reset yearFrom when metric changes (different series may have different min).
  React.useEffect(() => {
    setYearFrom(null);
  }, [metric]);

  const effectiveFromYear = yearFrom ?? minYear;

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
  const [showHistoric, setShowHistoric] = useState(() => (loadHelixPrefs().showHistoric as boolean) ?? false);
  /** Show/hide the dashed baseline mean ring. Hidden automatically in
   *  anomaly mode (would be a zero-radius circle). */
  const [showBaselineRing, setShowBaselineRing] = useState(() => (loadHelixPrefs().showBaselineRing as boolean) ?? true);
  /** Show/hide the dashed modern mean ring. */
  const [showRecentRing, setShowRecentRing] = useState(() => (loadHelixPrefs().showRecentRing as boolean) ?? true);

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
        // Data arrives chronologically — keep the most recent season per year.
        for (const row of j.oni.history as Array<{ year: number; anom: number }>) {
          m.set(row.year, row.anom);
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
  const [playSpeed, setPlaySpeed] = useState(() => (loadHelixPrefs().playSpeed as number) ?? 8); // years per second

  // Persist display preferences whenever they change.
  // Must come after playSpeed is declared to avoid a TDZ reference error.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(HELIX_PREFS_KEY, JSON.stringify({
        metric, anomaly, showSeasons, highlightRecent, showParis, showShiftTrail,
        showRecordHigh, showRecordLow, showSpaghetti, lineAlpha, view3D,
        showHistoric, showBaselineRing, showRecentRing, playSpeed,
      }));
    } catch { /* storage unavailable */ }
  }, [metric, anomaly, showSeasons, highlightRecent, showParis, showShiftTrail,
      showRecordHigh, showRecordLow, showSpaghetti, lineAlpha, view3D,
      showHistoric, showBaselineRing, showRecentRing, playSpeed]);
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

  // Baseline used *only* for scale computation — never clamped by
  // playCutoff so the radial scale stays fixed throughout playback.
  const meanBaselineForScale = useMemo(
    () => monthlyMeanProfile(yearMap, baselineFrom, baselineTo),
    [yearMap, baselineFrom, baselineTo],
  );

  /* Hover state for chart tooltip: nearest year at the mouse position.
   *  `kind` distinguishes between an individual year line and one of the
   *  mean reference rings. For mean rings `year` is reused as a display
   *  caption (e.g. "1961–1990 mean"). */
  const [hover, setHover] = useState<
    | { kind: 'year' | 'mean'; year: number; label: string; monthIdx: number; value: number; r: number; sx: number; sy: number }
    | null
  >(null);

  /* Hover state for the seasonal-shift trail dots */
  const [seasonHover, setSeasonHover] = useState<
    | { kind: 'spring' | 'autumn'; decade: number; month: number; sx: number; sy: number }
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
        // Use the play-independent baseline so the scale never shifts
        // mid-playback as the clamped baseline accumulates more years.
        const adj = anomaly && Number.isFinite(meanBaselineForScale[mi]) ? v - meanBaselineForScale[mi] : v;
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
  }, [yearMap, effectiveFromYear, anomaly, meanBaselineForScale, metric]);

  /* Latest month index (0-11) for the current year that has actual,
   * Include provisional months so playback extends to the very latest
   * data point available (e.g. a provisional April while March is
   * confirmed). Provisional months render dashed already so the user
   * can see they are estimates. Falls back to 11 if all 12 are present. */
  const latestRealMonthIdx = useMemo(() => {
    const arr = yearMap.get(currentYear);
    if (!arr) return -1;
    let last = -1;
    for (let m = 0; m < 12; m++) {
      if (Number.isFinite(arr[m])) last = m;
    }
    return last;
  }, [yearMap, currentYear]);

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
    : metric === 'frost'  ? Math.max(rMax * 1.05, 12)
    : metric === 'precip' ? Math.max(rMax * 1.05, 105)
    : rMax * 1.05;

  function valueToR(v: number, monthIdx: number): number {
    // Use the play-independent baseline so spiral positions never shift
    // mid-playback as the clamped meanBaseline accumulates more years.
    const adj = anomaly && Number.isFinite(meanBaselineForScale[monthIdx]) ? v - meanBaselineForScale[monthIdx] : v;
    if (!Number.isFinite(adj)) return NaN;
    const t = (adj - scaleMin) / (scaleMax - scaleMin);
    // In 3D mode use the same radial cap as 2D so lines stay inside the month-label ring.
    const cap = R_OUTER;
    return Math.max(0, Math.min(cap, t * cap));
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
  // HUD mini-sparkline — used in the playback overlay row.
  // Defined here (outside IIFE) so it can be shared between the
  // chart year-overlay and the HUD info row below.
  const HudSparkline = ({
    data,
    current,
    color,
    mode = 'line',
  }: {
    data: { year: number; value: number }[];
    current: number;
    color: string;
    mode?: 'line' | 'bars';
  }) => {
    if (!data.length) return null;
    const w = 70, h = 22;
    const minY = data[0].year;
    const maxY = data[data.length - 1].year;
    const span = Math.max(1, maxY - minY);
    const xFor = (y: number) => ((y - minY) / span) * w;
    const visible = data.filter((d) => d.year <= current);
    if (visible.length < 1) return null;
    if (mode === 'bars') {
      const absMax = Math.max(...data.map((d) => Math.abs(d.value)), 1.2);
      const mid = h / 2;
      const last = visible[visible.length - 1];
      const lastX = (xFor(last.year) / w) * 100;
      const lastYRaw = mid - (last.value / absMax) * (mid * 0.95);
      const lastYPct = (lastYRaw / h) * 100;
      const lastDotColor = last.value > 0.5 ? '#fb7185' : last.value < -0.5 ? '#38bdf8' : '#cbd5e1';
      return (
        <div className="relative w-full" style={{ height: h }}>
          <svg viewBox="0 0 70 22" width="100%" height={h} preserveAspectRatio="none" className="overflow-visible absolute inset-0">
            <line x1={0} y1={mid} x2={w} y2={mid} stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />
            {visible.map((d, i) => {
              const x = xFor(d.year);
              const yTop = mid - (d.value / absMax) * (mid * 0.95);
              const c = d.value > 0.5 ? '#fb7185' : d.value < -0.5 ? '#38bdf8' : 'rgba(180,180,180,0.55)';
              return <line key={i} x1={x} y1={mid} x2={x} y2={yTop} stroke={c} strokeWidth={1.1} strokeLinecap="round" />;
            })}
          </svg>
          {/* Dot rendered as HTML so it stays circular regardless of SVG aspect ratio */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 5, height: 5, background: lastDotColor, left: `${lastX}%`, top: `${lastYPct}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      );
    }
    const lo = Math.min(...data.map((d) => d.value));
    const hi = Math.max(...data.map((d) => d.value));
    const range = hi - lo || 1;
    const yFor = (v: number) => h - ((v - lo) / range) * h;
    const pts = visible.map((d) => `${xFor(d.year).toFixed(1)},${yFor(d.value).toFixed(1)}`).join(' ');
    const last = visible[visible.length - 1];
    // Quadratic best-fit curve via polynomial regression over visible data
    const nv = visible.length;
    let trendPts: string | null = null;
    if (nv >= 5) {
      const yt0 = visible[0].year, yt1 = visible[nv - 1].year, ytspan = Math.max(1, yt1 - yt0);
      const tv = visible.map((d) => (d.year - yt0) / ytspan);
      const _s0 = nv;
      const _s1 = tv.reduce((a, v) => a + v, 0);
      const _s2 = tv.reduce((a, v) => a + v * v, 0);
      const _s3 = tv.reduce((a, v) => a + v * v * v, 0);
      const _s4 = tv.reduce((a, v) => a + v * v * v * v, 0);
      const _ry = visible.reduce((a, d) => a + d.value, 0);
      const _rty = visible.reduce((a, d, i) => a + tv[i] * d.value, 0);
      const _rt2y = visible.reduce((a, d, i) => a + tv[i] * tv[i] * d.value, 0);
      const M = [[_s0,_s1,_s2,_ry],[_s1,_s2,_s3,_rty],[_s2,_s3,_s4,_rt2y]];
      for (let r = 0; r < 3; r++) {
        let mx = r; for (let i = r+1; i < 3; i++) if (Math.abs(M[i][r]) > Math.abs(M[mx][r])) mx = i;
        [M[r], M[mx]] = [M[mx], M[r]];
        for (let i = r+1; i < 3; i++) { const f = M[i][r] / M[r][r]; for (let j = r; j <= 3; j++) M[i][j] -= f * M[r][j]; }
      }
      const c = [0, 0, 0];
      for (let i = 2; i >= 0; i--) { c[i] = M[i][3]; for (let j = i+1; j < 3; j++) c[i] -= M[i][j] * c[j]; c[i] /= M[i][i]; }
      if (c.every(Number.isFinite)) {
        trendPts = Array.from({ length: 24 }, (_, i) => {
          const ti = i / 23;
          const v = c[0] + c[1] * ti + c[2] * ti * ti;
          return `${xFor(yt0 + ti * ytspan).toFixed(1)},${yFor(v).toFixed(1)}`;
        }).join(' ');
      }
    }
    const lastDotX = (xFor(last.year) / w) * 100;
    const lastDotY = (yFor(last.value) / h) * 100;
    return (
      <div className="relative w-full" style={{ height: h }}>
        <svg viewBox="0 0 70 22" width="100%" height={h} preserveAspectRatio="none" className="overflow-visible absolute inset-0">
          <polyline fill="none" stroke={`${color}33`} strokeWidth={0.7} points={data.map((d) => `${xFor(d.year).toFixed(1)},${yFor(d.value).toFixed(1)}`).join(' ')} />
          <polyline fill="none" stroke={`${color}66`} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" points={pts} />
          {trendPts && <polyline fill="none" stroke={color} strokeWidth={2} opacity={0.95} strokeLinejoin="round" strokeLinecap="round" points={trendPts} />}
        </svg>
        {/* Dot rendered as HTML so it stays circular regardless of SVG aspect ratio */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 5, height: 5, background: color, left: `${lastDotX}%`, top: `${lastDotY}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
    );
  };

  return (
    <div id={share?.sectionId ?? sectionId} className="bg-[#0b0e16] p-2 sm:p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E] scroll-mt-24">
      <h3 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <span className="shrink-0 mt-0.5 text-[#D0A65E]">{HEADER_ICON[metric]}</span>
        <span className="min-w-0 flex-1">The 4BYO Climate Helix – {regionName}</span>
      </h3>

      {/* Metric tabs moved to the row below the playback bar */}

      <div className="flex flex-col gap-6">
        {/* ─── Section 1: Spiral chart (full width, large on desktop) ───── */}
        <div>
          {/* xl+: chart column left, sidebar right */}
          <div className="xl:flex xl:items-stretch xl:gap-4">
          {/* Chart column */}
          <div className="xl:flex-1 xl:min-w-0">
          {/* Series legend */}
          <div className="max-w-[920px] mx-auto mb-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-gray-400 rounded-md border border-gray-800/70 bg-gray-900/40 px-3 py-1.5 w-fit">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-5" style={{ background: `linear-gradient(90deg,#4B5563,${palette.high})` }} />
              {minYear}→{maxYear}
            </span>
            {!anomaly && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-5 border-t-2 border-dashed" style={{ borderColor: metric === 'temp' ? '#22D3EE' : metric === 'precip' ? '#A78BFA' : (metric === 'frost') ? '#C4B5FD' : '#92400E', borderTopWidth: '3px' }} />
                {baselineFrom}–{baselineTo} mean
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-5 border-t-2 border-dashed" style={{ borderColor: metric === 'temp' ? '#E5E7EB' : '#E8E8E8' }} />
              {recentFrom}–{recentTo}{anomaly ? ' Δ' : ' mean'}
            </span>
            {showHistoric && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-5 border-t-2 border-dashed" style={{ borderColor: '#E6B765' }} />
                {historicFrom}–{historicTo}{anomaly ? ' Δ' : ' mean'}
              </span>
            )}
            {showRecordHigh && recordYear > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-5" style={{ background: '#E8E8E8' }} />
                {palette.highWord} ({recordYear})
              </span>
            )}
            {showRecordLow && oppositeYear > 0 && oppositeYear !== recordYear && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-5" style={{ background: metric === 'precip' ? '#A78BFA' : (metric === 'frost') ? '#C4B5FD' : metric === 'sunshine' ? '#92400E' : palette.low }} />
                {palette.lowWord} ({oppositeYear})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-5" style={{ background: palette.current }} />
              {currentYear} so far
            </span>
          </div>
          <div className={`relative w-full ${view3D ? 'max-w-[920px]' : 'max-w-[820px]'} mx-auto sm:py-4`}>
            {/* Playback stats strip — when the playhead is active, replaces
                 the small year chip with a full HUD: prominent year,
                 anomaly/temp/rain/sun/frost mini-cards, ENSO state and a
                 flashing pill when this year is a record. Designed to
                 feel cinematic: dark glass card with a thin glowing
                 border in the metric accent colour. */}
            {(() => {
              const displayYear = playYear === currentYear && playMonth !== null
                ? currentYear
                : playYear !== null ? Math.max(effectiveFromYear, playYear) : currentYear;
              const monthIdx = playYear === currentYear && playMonth !== null ? playMonth : null;
              const inMonthPhase = monthIdx !== null;
              // Count steps since the record: each year = 1 step, each month = 1 step.
              // In year phase: steps = displayYear - recordYear.
              // In month phase: steps = (currentYear - recordYear) + monthIdx,
              // so the transition from year to month phase is seamless.
              const highSteps = inMonthPhase
                ? currentYear - recordYear + (monthIdx ?? 0)
                : displayYear - recordYear;
              const lowSteps = inMonthPhase
                ? currentYear - oppositeYear + (monthIdx ?? 0)
                : displayYear - oppositeYear;
              const showHigh = recordYear > 0 && highSteps >= 0 && highSteps < 10;
              const showLow = oppositeYear > 0 && oppositeYear !== recordYear && lowSteps >= 0 && lowSteps < 10;
              const pillIcon = (word: string, sm?: boolean) => {
                const cls = sm ? 'inline h-2.5 w-2.5' : 'inline h-2 w-2';
                if (word === 'Warmest' || word === 'Coldest' || word === 'Mildest') return <Thermometer className={cls} />;
                if (word === 'Wettest' || word === 'Dullest') return <CloudRain className={cls} />;
                if (word === 'Driest' || word === 'Sunniest') return <Sun className={cls} />;
                if (word === 'Frostiest') return <Snowflake className={cls} />;
                return <span>◆</span>;
              };
              return (
                <div className="absolute left-2 top-0 z-10 pointer-events-none flex flex-col items-start gap-1">
                  <div className="font-mono font-black tabular-nums text-2xl sm:text-6xl text-[#D0A65E] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                    {displayYear}
                    {monthIdx !== null && (
                      <span className="text-[#FFF5E7] text-base sm:text-4xl ml-1 leading-none inline-block align-baseline">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthIdx]}</span>
                    )}
                  </div>
                  {showHigh && (
                    <span
                      className={`inline-flex items-center rounded-full border px-1 sm:px-2 py-[2px] sm:py-0.5 leading-none text-[6px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.08em] ${highSteps === 0 ? 'animate-pulse' : ''}`}
                      style={{ borderColor: '#E8E8E8', color: '#E8E8E8', background: 'rgba(232,232,232,0.10)', boxShadow: '0 0 10px -3px rgba(232,232,232,0.6)' }}
                    >
                      <span className="sm:hidden inline-flex items-center gap-0.5">{pillIcon(palette.highWord)} {recordYear}</span>
                      <span className="hidden sm:inline-flex items-center gap-0.5">{pillIcon(palette.highWord, true)} {palette.highWord} on record · {recordYear}</span>
                    </span>
                  )}
                  {showLow && (
                    <span
                      className={`inline-flex items-center rounded-full border px-1 sm:px-2 py-[2px] sm:py-0.5 leading-none text-[6px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.08em] ${lowSteps === 0 ? 'animate-pulse' : ''}`}
                      style={metric === 'precip' ? { borderColor: '#A78BFA', color: '#A78BFA', background: 'rgba(167,139,250,0.10)', boxShadow: '0 0 10px -3px rgba(167,139,250,0.6)' } : metric === 'frost' ? { borderColor: '#C4B5FD', color: '#C4B5FD', background: 'rgba(196,181,253,0.10)', boxShadow: '0 0 10px -3px rgba(196,181,253,0.6)' } : { borderColor: palette.low, color: palette.low, background: `${palette.low}1a`, boxShadow: `0 0 10px -3px ${palette.low}99` }}
                    >
                      <span className="sm:hidden inline-flex items-center gap-0.5">{pillIcon(palette.lowWord)} {oppositeYear}</span>
                      <span className="hidden sm:inline-flex items-center gap-0.5">{pillIcon(palette.lowWord, true)} {palette.lowWord} on record · {oppositeYear}</span>
                    </span>
                  )}
                </div>
              );
            })()}
            <svg
              viewBox={view3D ? `68 10 664 620` : `68 100 664 600`}
              className="w-full h-auto select-none cursor-crosshair"
              onMouseMove={(e) => {
                const svg = e.currentTarget;
                const rect = svg.getBoundingClientRect();
                if (rect.width === 0) return;
                // Map mouse to the ACTUAL viewBox coordinates (not full 800-unit space)
                const mx = (e.clientX - rect.left) / rect.width;
                const my = (e.clientY - rect.top) / rect.height;
                const [vbX, vbY, vbW, vbH] = view3D ? [68, 10, 664, 620] : [68, 100, 664, 600];
                const sx = vbX + mx * vbW;
                const sy = vbY + my * vbH;
                // 2D radial gate. In 3D we can't bail early using this because
                // the rings are vertically squashed and z-stacked — the cursor
                // can be outside R_OUTER radially yet still on a tilted ring.
                if (!view3D) {
                  const dx2 = sx - CX;
                  const dy2 = sy - CY;
                  const r2 = Math.hypot(dx2, dy2);
                  if (r2 < 18 || r2 > R_OUTER + 44) {
                    setHover(null);
                    return;
                  }
                }
                // 3D projection constants (mirror project3D so we can invert it)
                const span3D = Math.max(1, maxYear - minYear);
                const dz3D = 220 / span3D;
                const cosTilt3D = 0.55;
                /** Invert project3D for a given year: recover the
                 *  pre-projection (x,y) the user is hovering over, given
                 *  the screen coords (sx,sy) and that year's z stack offset. */
                const unprojectFor = (year: number): [number, number] => {
                  if (!view3D) return [sx, sy];
                  const z = (year - minYear) * dz3D;
                  const yOrig = (sy + z - CY) / cosTilt3D + CY;
                  return [sx, yOrig];
                };
                /** Compute the polar (r, monthIdx) the cursor maps to for a
                 *  given candidate year, using that year's inverse projection. */
                const polarFor = (year: number): { r: number; monthIdx: number } | null => {
                  const [ux, uy] = unprojectFor(year);
                  const dx = ux - CX;
                  const dy = uy - CY;
                  const r = Math.hypot(dx, dy);
                  if (r < 6 || r > R_OUTER + 80) return null;
                  const ang = Math.atan2(dy, dx);
                  let monthFrac = ((ang + Math.PI / 2) / (Math.PI * 2)) * 12;
                  if (monthFrac < 0) monthFrac += 12;
                  const monthIdx = (Math.round(monthFrac) % 12 + 12) % 12;
                  return { r, monthIdx };
                };
                // Find nearest *visible* line. In 2D, polarFor returns the
                // same (r, monthIdx) for every year so this collapses to a
                // single radial sweep. In 3D, each year has its own polar
                // mapping because of its vertical z-offset, so we recompute
                // per-candidate and compare 2D screen distance to its
                // projected line point.
                type Best = { kind: 'year' | 'mean'; year: number; label: string; value: number; r: number; monthIdx: number; d: number };
                let best: Best | null = null;
                const consider = (kind: 'year' | 'mean', yearLabel: number, label: string, arr: number[] | null, anchorYear: number) => {
                  if (!arr) return;
                  const pf = polarFor(anchorYear);
                  if (!pf) return;
                  const { monthIdx } = pf;
                  const v = arr[monthIdx];
                  if (!Number.isFinite(v)) return;
                  const r = valueToR(v, monthIdx);
                  if (!Number.isFinite(r)) return;
                  let d: number;
                  if (view3D) {
                    const [px, py] = project3D([polar(r, monthAngle(monthIdx))], anchorYear)[0];
                    d = Math.hypot(px - sx, py - sy);
                  } else {
                    d = Math.abs(r - pf.r);
                  }
                  if (!best || d < best.d) best = { kind, year: yearLabel, label, value: v, r, monthIdx, d };
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
                  consider('year', y, String(y), arr, y);
                }
                // Mean rings: baseline (hidden in anomaly mode), recent
                // (always shown), historic (gated).
                if (!anomaly && meanBaseline.every(Number.isFinite)) {
                  consider('mean', 0, `${baselineFrom}–${baselineTo} mean`, meanBaseline, (baselineFrom + baselineTo) / 2);
                }
                if (meanRecent.every(Number.isFinite)) {
                  consider('mean', 0, `${recentFrom}–${recentTo} mean`, meanRecent, (recentFrom + recentTo) / 2);
                }
                if (showHistoric && meanHistoric.every(Number.isFinite)) {
                  consider('mean', 0, `${historicFrom}–${historicTo} mean`, meanHistoric, (historicFrom + historicTo) / 2);
                }
                if (best && (best as Best).d < 28) {
                  const b = best as Best;
                  // Anchor the tooltip to the *projected* line point so it
                  // pins to the actual on-screen line in 3D mode. In 2D this
                  // is identical to (sx, sy).
                  const anchorYear = b.kind === 'year' ? b.year :
                    b.label.startsWith(`${baselineFrom}–${baselineTo}`) ? (baselineFrom + baselineTo) / 2 :
                    b.label.startsWith(`${historicFrom}–${historicTo}`) ? (historicFrom + historicTo) / 2 :
                    (recentFrom + recentTo) / 2;
                  const [ax, ay] = project3D([polar(b.r, monthAngle(b.monthIdx))], anchorYear)[0];
                  setHover({ kind: b.kind, year: b.year, label: b.label, monthIdx: b.monthIdx, value: b.value, r: b.r, sx: ax, sy: ay });
                } else {
                  setHover(null);
                }
              }}
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                <filter id="record-glow" x="-80%" y="-80%" width="260%" height="260%" colorInterpolationFilters="sRGB">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
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
              {showSeasons && (() => {
                const r = R_OUTER + 4;
                const cosTilt = 0.55;
                const tilt3D = view3D
                  ? `matrix(1 0 0 ${cosTilt} 0 ${(CY * (1 - cosTilt)).toFixed(2)})`
                  : undefined;
                // One narrow wedge between two angles. Total span of all
                // wedges should equal 2π so the ring is complete.
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
                  const rr = Math.round(ar + (br - ar) * t);
                  const gg = Math.round(ag + (bg - ag) * t);
                  const bl = Math.round(ab + (bb - ab) * t);
                  return `rgb(${rr},${gg},${bl})`;
                };

                /** Anchors define the *peak* of each season — the angle
                 *  where its colour is at full saturation. The N narrow
                 *  wedges between them are coloured by smoothly blending
                 *  the two adjacent anchors, giving a continuous angular
                 *  gradient with no visible wedge edges. */
                type Anchor = { ang: number; color: string };

                /** Sample colour at any angle by finding the two nearest
                 *  anchors (handling wrap) and linearly interpolating. */
                const sampleColor = (ang: number, anchors: Anchor[]): string => {
                  const TWO_PI = Math.PI * 2;
                  const norm = (a: number) => ((a % TWO_PI) + TWO_PI) % TWO_PI;
                  const a = norm(ang);
                  const sorted = anchors.map((x) => ({ ...x, ang: norm(x.ang) })).sort((p, q) => p.ang - q.ang);
                  for (let i = 0; i < sorted.length; i++) {
                    const cur = sorted[i];
                    const nxt = sorted[(i + 1) % sorted.length];
                    let span = nxt.ang - cur.ang;
                    if (span <= 0) span += TWO_PI;
                    let off = a - cur.ang;
                    if (off < 0) off += TWO_PI;
                    if (off <= span) {
                      return lerpHex(cur.color, nxt.color, off / span);
                    }
                  }
                  return sorted[0].color;
                };

                const labelAngle = (a: number, b: number) => {
                  let span = b - a;
                  if (span <= 0) span += 12;
                  let mid = a + span / 2;
                  if (mid >= 12) mid -= 12;
                  return monthAngle(mid);
                };

                // Build the four season anchors. When we have decade
                // crossings we use the *modern* spring/autumn boundaries
                // so the gradient's green/brown peaks track the actual
                // growing-season shift. Otherwise we fall back to fixed
                // meteorological quarters.
                let anchors: Anchor[];
                let labels: { key: string; mid: number; color: string; text: string }[];
                if (crossingDecades.length >= 2) {
                  const last = crossingDecades[crossingDecades.length - 1];
                  const newSpring = last.spring;
                  const newAutumn = last.autumn;
                  const growSpan = Math.max(0.5, newAutumn - newSpring);
                  // Winter peak = month opposite the middle of summer.
                  const summerMid = newSpring + growSpan * 0.5;
                  const winterMidMonth = (summerMid + 6) % 12;
                  anchors = [
                    { ang: monthAngle(winterMidMonth - 0.75), color: '#7DD3FC' }, // winter plateau start
                    { ang: monthAngle(winterMidMonth),         color: '#7DD3FC' }, // winter peak
                    { ang: monthAngle(winterMidMonth + 0.75), color: '#7DD3FC' }, // winter plateau end
                    { ang: monthAngle(newSpring + growSpan * 0.16), color: '#86EFAC' }, // spring green
                    { ang: monthAngle(summerMid - 0.75), color: '#FACC15' }, // summer plateau start
                    { ang: monthAngle(summerMid),         color: '#FACC15' }, // summer peak
                    { ang: monthAngle(summerMid + 0.75), color: '#FACC15' }, // summer plateau end
                    { ang: monthAngle(newSpring + growSpan * 0.84), color: '#B45309' }, // autumn russet
                  ];
                  labels = [
                    { key: 'winter', mid: monthAngle(winterMidMonth), color: '#7DD3FC', text: 'Winter' },
                    { key: 'spring', mid: labelAngle(newSpring, newSpring + growSpan * 0.33), color: '#86EFAC', text: 'Spring' },
                    { key: 'summer', mid: labelAngle(newSpring + growSpan * 0.33, newSpring + growSpan * 0.66), color: '#FACC15', text: 'Summer' },
                    { key: 'autumn', mid: labelAngle(newSpring + growSpan * 0.66, newAutumn), color: '#FDBA74', text: 'Autumn' },
                  ];
                } else {
                  anchors = [
                    { ang: monthAngle(11.75), color: '#7DD3FC' }, // winter plateau start
                    { ang: monthAngle(0.5),   color: '#7DD3FC' }, // winter peak
                    { ang: monthAngle(1.25),  color: '#7DD3FC' }, // winter plateau end
                    { ang: monthAngle(3.5),   color: '#86EFAC' }, // spring peak
                    { ang: monthAngle(5.75),  color: '#FACC15' }, // summer plateau start
                    { ang: monthAngle(6.5),   color: '#FACC15' }, // summer peak
                    { ang: monthAngle(7.25),  color: '#FACC15' }, // summer plateau end
                    { ang: monthAngle(9.5),   color: '#B45309' }, // autumn peak
                  ];
                  labels = [
                    { key: 'winter', mid: monthAngle(0.5), color: '#7DD3FC', text: 'Winter' },
                    { key: 'spring', mid: monthAngle(3.5), color: '#86EFAC', text: 'Spring' },
                    { key: 'summer', mid: monthAngle(6.5), color: '#FACC15', text: 'Summer' },
                    { key: 'autumn', mid: monthAngle(9.5), color: '#FDBA74', text: 'Autumn' },
                  ];
                }

                // Render the gradient as N narrow wedges. Higher N =
                // smoother blend; 144 wedges gives 2.5° per wedge which
                // is well below the eye's discrimination threshold at
                // this radius.
                const N = 144;
                const step = (Math.PI * 2) / N;
                const a0 = -Math.PI / 2; // start at top (Jan)
                const wedges = Array.from({ length: N }, (_, i) => {
                  const a1 = a0 + i * step;
                  const a2 = a0 + (i + 1) * step;
                  const mid = (a1 + a2) / 2;
                  const col = sampleColor(mid, anchors);
                  return <path key={`gseg-${i}`} d={wedgePath(a1, a2)} fill={col} />;
                });

                const inner = (
                  <g>
                    <g opacity={0.42}>{wedges}</g>
                    {labels.map((l) => {
                      const [lx, ly] = polar(R_LABEL + R_LABEL_BAND_W / 2 + 5, l.mid);
                      const w = l.text.length * 7 + 18;
                      return (
                        <g key={`slab-${l.key}`}>
                          <rect
                            x={lx - w / 2}
                            y={ly - 10}
                            width={w}
                            height={20}
                            rx={10}
                            fill={`${l.color}22`}
                            stroke={l.color}
                            strokeWidth={1.2}
                          />
                          <text
                            x={lx} y={ly}
                            fontSize={11}
                            fontWeight={700}
                            fill={l.color}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontFamily="ui-monospace, monospace"
                            style={{ letterSpacing: '0.08em' }}
                          >
                            {l.text}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
                return <g transform={tilt3D}>{inner}</g>;
              })()}

              {/* Grid rings + tick labels — wrapped in the same oblique-
                   projection matrix as the month-label ring so in 3D
                   mode the radial scaffolding sits on the cylinder
                   floor (z=0) rather than floating flat behind it. */}
              {(() => {
                const cosTilt = 0.55;
                const tilt = view3D
                  ? `matrix(1 0 0 ${cosTilt} 0 ${(CY * (1 - cosTilt)).toFixed(2)})`
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
                const isNewYear = playing && y === playYear;
                return (
                  <path
                    key={`bg-${y}`}
                    d={smoothClosedPath(project3D(pts, y))}
                    fill="none"
                    stroke={yearColor(y, minYear, maxYear, bgAlpha, palette.high)}
                    strokeWidth={bgWidth}
                    style={isNewYear ? { animation: 'helix-year-in 180ms ease-out both' } : undefined}
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
                  const isNewYear = playing && y === playYear;
                  return (
                    <path
                      key={`hi-${y}`}
                      d={smoothClosedPath(project3D(pts, y))}
                      fill="none"
                      stroke={yearColor(y, minYear, maxYear, hiAlpha, palette.high)}
                      strokeWidth={hiWidth}
                      style={isNewYear ? { animation: 'helix-year-in 180ms ease-out both' } : undefined}
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
                const baselineStroke = metric === 'temp' ? '#22D3EE' : metric === 'precip' ? '#A78BFA' : metric === 'frost' ? '#C4B5FD' : '#92400E';
                return (
                  <path
                    d={smoothClosedPath(project3D(pts, baselineYear))}
                    fill="none"
                    stroke={baselineStroke}
                    strokeWidth={3.0}
                    strokeDasharray="4 8"
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

              {/* Recent decade ring — dashed. In temp mode the crimson would
                   blend with the warm-toned spaghetti gradient, so we swap to
                   a vivid cyan (the site's accent on the cool side of the
                   wheel) to keep maximum contrast against the year lines. */}
              {showRecentRing && meanRecent.every(Number.isFinite) && (() => {
                const pts: [number, number][] = meanRecent.map((v, m) => polar(valueToR(v, m), monthAngle(m)));
                const recentMid = (recentFrom + recentTo) / 2;
                const recentStroke = metric === 'temp' ? '#E5E7EB' : metric === 'precip' ? '#E8E8E8' : '#E8E8E8';
                return (
                  <path
                    d={smoothClosedPath(project3D(pts, recentMid))}
                    fill="none"
                    stroke={recentStroke}
                    strokeWidth={2.1}
                    strokeDasharray="5 2"
                  />
                );
              })()}

              {/* Record year — high extreme (warmest/wettest/etc.) */}
              {showRecordHigh && recordYear > 0 && recordYear <= playCutoff && yearMap.get(recordYear) && (() => {
                const arr = yearMap.get(recordYear)!;
                const pts = yearToPoints(arr);
                if (!pts) return null;
                const d = smoothClosedPath(project3D(pts, recordYear));
                // Use off-white (not pure white) so it pops without being blinding
                const hiCol = '#E8E8E8';
                return (
                  <g filter="url(#record-glow)">
                    {/* marching dashes layer */}
                    <path d={d} fill="none" stroke={hiCol} strokeWidth={1.6} strokeDasharray="10 6" opacity={0.5}>
                      <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="0.6s" repeatCount="indefinite" />
                    </path>
                    {/* solid line on top */}
                    <path d={d} fill="none" stroke={hiCol} strokeWidth={2.2} opacity={0.9} />
                  </g>
                );
              })()}

              {/* Record year — low extreme (coldest/driest/etc.) */}
              {showRecordLow && oppositeYear > 0 && oppositeYear !== recordYear && oppositeYear <= playCutoff && yearMap.get(oppositeYear) && (() => {
                const arr = yearMap.get(oppositeYear)!;
                const pts = yearToPoints(arr);
                if (!pts) return null;
                const d = smoothClosedPath(project3D(pts, oppositeYear));
                // Soft violet for precip/frost; dark amber-brown for sunshine; palette.low for others
                const loCol = metric === 'precip' ? '#A78BFA' : metric === 'frost' ? '#C4B5FD' : metric === 'sunshine' ? '#92400E' : palette.low;
                return (
                  <g filter="url(#record-glow)">
                    {/* marching dashes layer */}
                    <path d={d} fill="none" stroke={loCol} strokeWidth={1.6} strokeDasharray="10 6" opacity={0.5}>
                      <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="0.6s" repeatCount="indefinite" />
                    </path>
                    {/* solid line on top */}
                    <path d={d} fill="none" stroke={loCol} strokeWidth={2.2} opacity={0.9} />
                  </g>
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
                  <g filter="url(#record-glow)">
                    {/* marching dashes halo — same technique as record lines */}
                    {solidSegs.length >= 2 && (
                      <path
                        d={solidSegs.join(' ')}
                        fill="none"
                        stroke={palette.current}
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeDasharray="10 6"
                        opacity={0.5}
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="0.6s" repeatCount="indefinite" />
                      </path>
                    )}
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
                          fill={palette.current}
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
                // Anchor the month-label rim to the *floor* of the
                // year-stack (z=0, oldest year) so it reads as the base
                // of the spiral cylinder rather than floating above the
                // newest year. The grid rings + spokes below use the
                // same transform so they sit on the same plane.
                const cosTilt = 0.55;
                const tilt = view3D
                  ? `matrix(1 0 0 ${cosTilt} 0 ${(CY * (1 - cosTilt)).toFixed(2)})`
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
              {showSeasons && crossingDecades.length >= 2 && (() => {
                const cosTilt = 0.55;
                const tilt3D = view3D ? `matrix(1 0 0 ${cosTilt} 0 ${(CY * (1 - cosTilt)).toFixed(2)})` : undefined;
                const first = crossingDecades[0];
                const last = crossingDecades[crossingDecades.length - 1];
                // Arc sits on the outer edge of the colour ring for all metrics.
                const r10 = R_OUTER;
                if (r10 <= 0) return null;
                // All call-out furniture lives *outside* the month-label
                // band so it never overlaps month names or the spaghetti
                // lines. Dots stay on the 10°C ring; leaders cross the
                // chart radially without bending.
                const rDotOut = R_OUTER + 6;
                const rYear = R_LABEL + R_LABEL_BAND_W / 2 - 2;
                const rHeader = R_LABEL + R_LABEL_BAND_W / 2 + 12;

                /** One consolidated call-out group. Spring uses the
                 *  shifting-seasons spring-green, Autumn uses the
                 *  amber-brown — so the colour vocabulary matches the
                 *  season tints on the wheel and the legend dots. The
                 *  *older* decade gets a muted shade of the same hue;
                 *  the *newer* decade gets the saturated version. */
                const renderGroup = (
                  key: 'spring' | 'autumn',
                  header: string,
                  oldAng: number,
                  newAng: number,
                  shiftMonths: number,
                ) => {
                  const newCol = key === 'spring' ? '#86EFAC' : '#FDBA74';
                  const oldCol = key === 'spring' ? '#5DB585' : '#C47A35';
                  const days = Math.round(Math.abs(shiftMonths) * DAYS_PER_MONTH);
                  const direction = header === 'Spr Start'
                    ? (shiftMonths > 0 ? 'earlier' : 'later')
                    : (shiftMonths > 0 ? 'later' : 'earlier');
                  const signedDays = `${direction === 'earlier' ? '-' : '+'}${days} days`;
                  // Compute angular delta first — reused for arc and header placement
                  let delta = newAng - oldAng;
                  while (delta > Math.PI) delta -= 2 * Math.PI;
                  while (delta < -Math.PI) delta += 2 * Math.PI;
                  // Fix angular offset: measure from newAng to the *inner edge* of the header pill,
                  // not its centre. Compute boxW here so we can convert boxW/2 → angle at rHeader.
                  const boxW = Math.max(header.length, signedDays.length) * 6 + 16;
                  const edgeAngOffset = (boxW / 2) / rHeader; // radians from centre to inner edge
                  const totalOffset = 0.05 + edgeAngOffset;   // 0.05 rad gap + half-pill
                  const headerAng = newAng + (delta < 0 ? -totalOffset : totalOffset);
                  const [hx, hy] = polar(rHeader, headerAng);
                  const [ox0, oy0] = polar(r10, oldAng);
                  const [ox1, oy1] = polar(rDotOut, oldAng);
                  const [oxL, oyL] = polar(rYear, oldAng);
                  const [nx0, ny0] = polar(r10, newAng);
                  const [nx1, ny1] = polar(rDotOut, newAng);
                  const [nxL, nyL] = polar(rYear, newAng);

                  // Arc along the 10°C ring between old and new crossing
                  const arcLarge = Math.abs(delta) > Math.PI ? 1 : 0;
                  const arcSweep = delta > 0 ? 1 : 0;
                  // Slightly thicker halo arc then bright arc on top
                  const arcD = `M ${ox0} ${oy0} A ${r10} ${r10} 0 ${arcLarge} ${arcSweep} ${nx0} ${ny0}`;

                  return (
                    <g key={key}>
                      {/* radial lines from centre to dots — drawn first so everything else sits on top */}
                      <line x1={CX} y1={CY} x2={ox0} y2={oy0} stroke={oldCol} strokeWidth={2} strokeDasharray="4 4" opacity={0.8} />
                      <line x1={CX} y1={CY} x2={nx0} y2={ny0} stroke={newCol} strokeWidth={2} strokeDasharray="4 4" opacity={0.95} />
                      {/* shift arc along the 10°C ring — halo + coloured line */}
                      <path d={arcD} fill="none" stroke="#0b0e16" strokeWidth={6} strokeLinecap="round" />
                      <path d={arcD} fill="none" stroke={newCol} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
                      {/* leader dots on the 10°C ring */}
                      <circle cx={ox0} cy={oy0} r={4.5} fill={oldCol} stroke="#0b0e16" strokeWidth={1} opacity={0.8} />
                      <circle cx={nx0} cy={ny0} r={4.5} fill={newCol} stroke="#0b0e16" strokeWidth={1} />
                      {/* radial leaders out to the year-label pills */}
                      <line x1={ox1} y1={oy1} x2={oxL} y2={oyL} stroke={oldCol} strokeWidth={1.2} opacity={0.8} />
                      <line x1={nx1} y1={ny1} x2={nxL} y2={nyL} stroke={newCol} strokeWidth={1.2} opacity={0.95} />
                      {/* year-label pills */}
                      <rect x={oxL - 20} y={oyL - 9} width={40} height={18} rx={9} fill="rgba(10,14,22,0.85)" stroke={oldCol} strokeWidth={1} opacity={0.8} />
                      <text x={oxL} y={oyL + 4} fontSize={10} fontWeight={700} fill={oldCol} textAnchor="middle" fontFamily="ui-monospace, monospace" opacity={0.9}>
                        {first.decade}s
                      </text>
                      <rect x={nxL - 20} y={nyL - 9} width={40} height={18} rx={9} fill="rgba(10,14,22,0.85)" stroke={newCol} strokeWidth={1.2} />
                      <text x={nxL} y={nyL + 4} fontSize={10} fontWeight={700} fill={newCol} textAnchor="middle" fontFamily="ui-monospace, monospace">
                        {last.decade}s
                      </text>
                      {/* consolidated header pill — width fits the longer of the two text lines */}
                      <rect x={hx - boxW / 2} y={hy - 16} width={boxW} height={34} rx={6} fill="rgba(10,14,22,0.9)" stroke={newCol} strokeWidth={1} opacity={0.95} />
                      <text x={hx} y={hy - 3} fontSize={11} fontWeight={700} fill={newCol} textAnchor="middle" fontFamily="ui-monospace, monospace">
                        {header}
                      </text>
                      <text x={hx} y={hy + 11} fontSize={10} fill="rgba(220,225,235,0.85)" textAnchor="middle" fontFamily="ui-monospace, monospace">
                        {signedDays}
                      </text>
                    </g>
                  );
                };

                return (
                  <g transform={tilt3D} pointerEvents="none">
                    {renderGroup('spring', 'Spr Start', monthAngle(first.spring), monthAngle(last.spring), first.spring - last.spring)}
                    {renderGroup('autumn', 'Aut End',   monthAngle(first.autumn), monthAngle(last.autumn), last.autumn - first.autumn)}
                  </g>
                );
              })()}

              {/* Decadal seasonal-shift trail — rendered last so dots sit
                   on top of the callout arcs rather than under them. */}
              {showShiftTrail && crossingDecades.length >= 2 && (() => {
                const cosTilt = 0.55;
                const tilt3D = view3D ? `matrix(1 0 0 ${cosTilt} 0 ${(CY * (1 - cosTilt)).toFixed(2)})` : undefined;
                const r10 = R_OUTER;
                const SPRING_DARK = '#166534';
                const SPRING_LIGHT = '#86EFAC';
                const AUTUMN_DARK = '#7C2D12';
                const AUTUMN_LIGHT = '#FDBA74';
                const lerpPair = (a: string, b: string, t: number) => {
                  const ah = a.replace('#', ''); const bh = b.replace('#', '');
                  const ar = parseInt(ah.slice(0,2),16), ag = parseInt(ah.slice(2,4),16), ab = parseInt(ah.slice(4,6),16);
                  const br = parseInt(bh.slice(0,2),16), bg = parseInt(bh.slice(2,4),16), bb = parseInt(bh.slice(4,6),16);
                  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
                };
                const n = crossingDecades.length;
                const springPts: [number, number, number, number, number][] = crossingDecades.map((d, i) => {
                  const [x, y] = polar(r10, monthAngle(d.spring));
                  return [x, y, d.decade, n === 1 ? 1 : i / (n - 1), d.spring];
                });
                const autumnPts: [number, number, number, number, number][] = crossingDecades.map((d, i) => {
                  const [x, y] = polar(r10, monthAngle(d.autumn));
                  return [x, y, d.decade, n === 1 ? 1 : i / (n - 1), d.autumn];
                });
                const springPath = springPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
                const autumnPath = autumnPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
                return (
                  <g transform={tilt3D} pointerEvents="none">
                    {/* Ghost 10°C ring in temp-absolute mode */}
                    {metric === 'temp' && !anomaly && (() => { const r10real = valueToR(SHIFT_THRESHOLD, 3); return Number.isFinite(r10real) && r10real > 0 ? <circle cx={CX} cy={CY} r={r10real} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.7} strokeDasharray="2 6" /> : null; })()}
                    <path d={springPath} fill="none" stroke={SPRING_LIGHT} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
                    <path d={autumnPath} fill="none" stroke={AUTUMN_LIGHT} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
                    {springPts.map(([x, y, dec, t, month]) => (
                      <circle key={`sp-${dec}`} cx={x} cy={y} r={2.5 + t * 2} fill={lerpPair(SPRING_DARK, SPRING_LIGHT, t)} stroke="#0b0e16" strokeWidth={0.8}
                        pointerEvents="all" style={{ cursor: 'crosshair' }}
                        onMouseEnter={(e) => {
                          const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
                          const rect = svg.getBoundingClientRect();
                          setSeasonHover({ kind: 'spring', decade: dec as number, month: month as number, sx: (e.clientX - rect.left) / rect.width * 100, sy: (e.clientY - rect.top) / rect.height * 100 });
                        }}
                        onMouseLeave={() => setSeasonHover(null)}
                      />
                    ))}
                    {autumnPts.map(([x, y, dec, t, month]) => (
                      <circle key={`au-${dec}`} cx={x} cy={y} r={2.5 + t * 2} fill={lerpPair(AUTUMN_DARK, AUTUMN_LIGHT, t)} stroke="#0b0e16" strokeWidth={0.8}
                        pointerEvents="all" style={{ cursor: 'crosshair' }}
                        onMouseEnter={(e) => {
                          const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
                          const rect = svg.getBoundingClientRect();
                          setSeasonHover({ kind: 'autumn', decade: dec as number, month: month as number, sx: (e.clientX - rect.left) / rect.width * 100, sy: (e.clientY - rect.top) / rect.height * 100 });
                        }}
                        onMouseLeave={() => setSeasonHover(null)}
                      />
                    ))}
                  </g>
                );
              })()}
            </svg>

            {/* Hover tooltip — positioned in viewBox % so it tracks the SVG
                 regardless of responsive resize. */}
            {hover && (() => {
              // Reverse-map VB coords back to CSS % using the active viewBox
              const [vbX, vbY, vbW, vbH] = view3D ? [68, 10, 664, 620] : [68, 100, 664, 600];
              const pctX = (hover.sx - vbX) / vbW * 100;
              const pctY = (hover.sy - vbY) / vbH * 100;
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

            {/* Season-shift dot tooltip */}
            {seasonHover && (() => {
              const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const mi = Math.min(11, Math.max(0, Math.floor(seasonHover.month)));
              const day = Math.round((seasonHover.month % 1) * 30) + 1;
              const dateStr = `~${MONTH_SHORT[mi]} ${day}`;
              const color = seasonHover.kind === 'spring' ? '#86EFAC' : '#FDBA74';
              const label = seasonHover.kind === 'spring' ? 'Spring crossing' : 'Autumn crossing';
              // seasonHover.sx/sy are already CSS percentages
              const pctX = seasonHover.sx;
              const pctY = seasonHover.sy;
              const onLeft = pctX > 55;
              return (
                <div
                  className="absolute pointer-events-none z-20 rounded-md border bg-gray-950/95 px-2.5 py-1.5 text-[11px] font-mono shadow-lg whitespace-nowrap"
                  style={{
                    left: `${pctX}%`,
                    top: `${pctY}%`,
                    transform: `translate(${onLeft ? 'calc(-100% - 10px)' : '10px'}, -50%)`,
                    borderColor: `${color}66`,
                  }}
                >
                  <div className="font-semibold" style={{ color }}>{label}</div>
                  <div className="text-gray-400 text-[10px]">{seasonHover.decade}s decade</div>
                  <div className="tabular-nums" style={{ color }}>{dateStr}</div>
                </div>
              );
            })()}
          </div>
          </div>{/* end chart column */}

          {/* Sidebar: HUD + control panels */}
          <div className="w-full xl:w-[280px] xl:shrink-0 flex flex-col mt-4 xl:mt-0">
          {/* HUD info row */}
          {(() => {
            const displayYear = playYear === currentYear && playMonth !== null
              ? currentYear
              : playYear !== null ? Math.max(effectiveFromYear, playYear) : currentYear;
            const monthIdx = playYear === currentYear && playMonth !== null ? playMonth : null;
            const fmt = (v: number, dp = 1) => v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
            const enso = ensoForYear(displayYear);
            const liveOni = oniByYear.get(displayYear);
            const ensoAnom = liveOni !== undefined
              ? liveOni
              : (enso && enso.state !== 'Neutral' ? approxOniForStrength(enso.state, enso.strength) : null);
            const ensoCls = enso?.state === 'El Niño'
              ? 'border-rose-400/60 bg-rose-500/15 text-rose-200'
              : enso?.state === 'La Niña'
                ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                : 'border-gray-600 text-gray-300';
            const ensoIconColor = enso?.state === 'El Niño' ? '#fb7185' : enso?.state === 'La Niña' ? '#38bdf8' : '#94a3b8';
            const oniAnnual: { year: number; value: number }[] = oniByYear.size === 0
              ? []
              : [...oniByYear.entries()].sort((a, b) => a[0] - b[0]).map(([y, v]) => ({ year: y, value: v }));
            const metricValueFn = (m: SpaghettiMetric): number | null => {
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
            const activeVal = metricValueFn(metric);
            // Compute annual baseline average for any metric from annuals data
            const metricBaselineAvg = (m: SpaghettiMetric): number | null => {
              const arr = annuals[m];
              if (!arr) return null;
              const inBase = arr.filter((d) => d.year >= baselineFrom && d.year <= baselineTo);
              if (!inBase.length) return null;
              return inBase.reduce((a, b) => a + b.value, 0) / inBase.length;
            };
            const metricAnom = (m: SpaghettiMetric, v: number): number | null => {
              const base = metricBaselineAvg(m);
              return base !== null ? v - base : null;
            };
            const allOthers: { m: SpaghettiMetric; icon: React.ReactNode }[] = [
              { m: 'temp' as const, icon: <Thermometer className="h-3 w-3" /> },
              { m: 'precip' as const, icon: <CloudRain className="h-3 w-3" /> },
              { m: 'sunshine' as const, icon: <Sun className="h-3 w-3" /> },
              { m: 'frost' as const, icon: <Snowflake className="h-3 w-3" /> },
            ];
            return (
              // xl: vertical stack in sidebar; below xl: horizontal row (all metrics + ENSO on sm+, active+ENSO on mobile)
              <div className="mb-3">
                {/* All cards in one row (horizontal on mobile/tablet, vertical stack on xl) */}
                <div className="flex flex-row xl:flex-col gap-3">
                  {allOthers.filter((x) => available.includes(x.m)).map((o) => {
                    const isActive = o.m === metric;
                    const v = metricValueFn(o.m);
                    if (v === null) return null;
                    const c = METRIC_PALETTE[o.m].current;
                    const d = o.m === 'temp' ? 1 : 0;
                    const ann = annuals[o.m];
                    const anom = metricAnom(o.m, v);
                    const anomPositive = anom !== null && anom >= 0;
                    // for temp: warm=rose, cold=sky; for precip: more=sky, less=amber; for sunshine/frost: more=amber, less=sky
                    const anomColor = anom === null ? '' :
                      o.m === 'temp' ? (anomPositive ? 'text-rose-300' : 'text-sky-300') :
                      o.m === 'precip' ? (anomPositive ? 'text-sky-300' : 'text-amber-300') :
                      anomPositive ? 'text-amber-300' : 'text-sky-300';
                    const anomLabel = anom !== null
                      ? `${anom >= 0 ? '+' : ''}${fmt(anom, d)}${o.m === 'temp' ? '°' : ''} vs base`
                      : null;
                    if (isActive) {
                      // Active metric: full card with sparkline, always visible
                      return (
                        <div key={o.m}
                          className="rounded-lg border bg-[#0b0e16]/85 backdrop-blur-sm px-2.5 py-1.5 flex items-center gap-2.5 h-[72px] xl:w-full flex-1 basis-0 min-w-0 xl:flex-none"
                          style={{ borderColor: `${c}66`, boxShadow: `0 0 14px -6px ${c}` }}
                        >
                          <div className="flex flex-col leading-tight">
                            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-gray-400">
                              <span style={{ color: c }}>{METRIC_ICON[o.m]}</span>
                              {METRIC_LABEL[o.m]}
                            </div>
                            <div className="font-mono text-base font-bold tabular-nums" style={{ color: '#FFF5E7' }}>
                              {fmt(v, d)} <span className="text-[10px] opacity-70">{METRIC_UNIT[o.m]}</span>
                            </div>
                            {anomLabel && (
                              <div className="text-[9.5px] tabular-nums leading-tight">
                                <span className={anomColor}>{anomLabel}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">{ann && ann.length > 1 && <HudSparkline data={ann} current={displayYear} color={c} />}</div>
                        </div>
                      );
                    }
                    // Non-active metrics: full card with sparkline on sm+, hidden on mobile
                    return (
                      <div key={o.m}
                        className="hidden sm:flex rounded-lg border bg-[#0b0e16]/85 backdrop-blur-sm px-2.5 py-1.5 items-center gap-2.5 h-[72px] xl:w-full flex-1 basis-0 min-w-0 xl:flex-none"
                        style={{ borderColor: `${c}40` }}
                      >
                        <div className="flex flex-col leading-tight">
                          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-gray-400">
                            <span style={{ color: c }}>{METRIC_ICON[o.m]}</span>
                            {METRIC_LABEL[o.m]}
                          </div>
                          <div className="font-mono text-sm font-bold tabular-nums" style={{ color: '#FFF5E7' }}>
                            {fmt(v, d)} <span className="text-[10px] opacity-70">{METRIC_UNIT[o.m]}</span>
                          </div>
                          {anomLabel && (
                            <div className="text-[9.5px] tabular-nums leading-tight">
                              <span className={anomColor}>{anomLabel}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">{ann && ann.length > 1 && <HudSparkline data={ann} current={displayYear} color={c} />}</div>
                      </div>
                    );
                  })}
                  {/* ENSO — only shown for regions with a clear ENSO teleconnection */}
                  {showEnso && (
                  <div className={`rounded-lg border bg-[#0b0e16]/85 backdrop-blur-sm px-2 py-1.5 flex items-center gap-2 h-[72px] xl:w-full flex-1 basis-0 min-w-0 xl:flex-none ${ensoCls}`}>
                    <div className="flex flex-col leading-tight w-[58px] shrink-0">
                      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider whitespace-nowrap text-gray-400">
                        <span style={{ color: ensoIconColor }}><Waves className="h-3 w-3" /></span>
                        {enso?.state === 'El Niño' ? 'El Niño' : enso?.state === 'La Niña' ? 'La Niña' : 'ENSO'}
                      </div>
                      <div className="font-mono text-base font-bold tabular-nums" style={{ color: '#FFF5E7' }}>
                        {ensoAnom !== null ? `${ensoAnom >= 0 ? '+' : ''}${ensoAnom.toFixed(1)}°` : '—'}
                      </div>
                      <div className="text-[9.5px] tabular-nums leading-tight text-gray-400 whitespace-nowrap">
                        ONI 3-mo mean
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {oniAnnual.length > 0 && <HudSparkline data={oniAnnual} current={displayYear} color="#cbd5e1" mode="bars" />}
                    </div>
                  </div>
                  )}
                </div>
              </div>
            );
          })()}
          {/* Sidebar panels: 2-col on sm–lg, 1-col in xl sidebar */}
          <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
          {/* Playbar panel */}
          <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 px-3 py-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 shrink-0">Playback</span>
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
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
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
              className={`${TOGGLE_BASE} px-3 sm:px-4 font-semibold shrink-0 ${playing ? '' : ''}`}
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
              <span className="hidden sm:inline">{playing ? 'Pause' : 'Play'}</span>
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
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
              title="Step one year (or month, in the finale) forward"
              aria-label="Step forward"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5l11 7-11 7zM16 5h2v14h-2z"/></svg>
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setPlayYear(null); setPlayMonth(null); }}
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
              title="Stop playback and show the full chart"
              disabled={playYear === null && !playing}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
              <span className="hidden sm:inline">Reset</span>
            </button>
            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-gray-500">Speed</span>
              <input
                type="range"
                min={2}
                max={32}
                step={1}
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="accent-[#D0A65E] w-12 sm:w-16 min-w-0"
                aria-label="Playback speed (years per second)"
              />
              <span className="font-mono text-[10px] sm:text-[11px] text-[#FFF5E7] min-w-[2.5ch] sm:min-w-[3ch] shrink-0">{playSpeed}×</span>
            </div>{/* end speed div */}
            </div>{/* end playbar flex */}
          </div>{/* end Playbar panel */}

          {/* Mode panel */}
          <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">Mode</span>
              <ChipToggle active={anomaly} onChange={setAnomaly} color="#D0A65E">
                Anomaly <span className="text-[10px] text-gray-400">vs {baselineFrom}–{baselineTo}</span>
              </ChipToggle>
              <ChipToggle active={view3D} onChange={setView3D} color="#A78BFA">
                3D
              </ChipToggle>
              {/* Seasons + Trail — segmented pill group. When Seasons is on,
                  Trail appears as a nested segment sharing the same bordered
                  container (Linear/Vercel "split button" pattern), which
                  communicates the sub-option relationship through physical
                  containment rather than a separate connector. */}
              {showSeasons ? (
                <div
                  className="inline-flex h-7 items-center rounded-full border overflow-hidden"
                  style={{ borderColor: '#86EFAC8c', background: '#86EFAC1f' }}
                >
                  <button
                    type="button"
                    onClick={() => { setShowSeasons(false); setShowShiftTrail(false); }}
                    aria-pressed
                    className="inline-flex h-full items-center gap-1 px-2.5 text-[12px] font-medium text-[#FFF5E7] hover:bg-white/[0.04] transition-colors"
                  >
                    <span aria-hidden className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: '#86EFAC', border: '1px solid #86EFAC' }} />
                    <span className="leading-none whitespace-nowrap">Seasons</span>
                  </button>
                  <div aria-hidden className="h-3.5 w-px self-center" style={{ background: '#86EFAC55' }} />
                  <button
                    type="button"
                    onClick={() => setShowShiftTrail(!showShiftTrail)}
                    aria-pressed={showShiftTrail}
                    className="inline-flex h-full items-center gap-1 px-2.5 text-[12px] font-medium transition-colors hover:bg-white/[0.04]"
                    style={{ color: showShiftTrail ? '#FFF5E7' : '#9CA3AF' }}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ background: showShiftTrail ? '#86EFAC' : 'transparent', border: `1px solid ${showShiftTrail ? '#86EFAC' : '#4B5563'}` }}
                    />
                    <span className="leading-none whitespace-nowrap">Trail</span>
                  </button>
                </div>
              ) : (
                <ChipToggle active={false} onChange={(v) => { setShowSeasons(v); if (!v) setShowShiftTrail(false); }} color="#86EFAC">
                  Seasons
                </ChipToggle>
              )}
              {metric === 'temp' && (
                <ChipToggle active={showParis} onChange={setShowParis} color="#FBBF24">
                  Paris Rings
                </ChipToggle>
              )}
            </div>
          </div>{/* end Mode panel */}

          {/* Metric panel */}
          {available.length > 1 && (
          <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">Metric</span>
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
          </div>
          )}{/* end Metric panel */}

          {/* Presets panel */}
          <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">Presets</span>
              {(() => {
                const isShiftingSeasons = !anomaly && showShiftTrail && showSeasons && !showSpaghetti && !highlightRecent && !showRecordHigh && !showRecordLow && !showParis && !showHistoric;
                const isThenVsNow      = anomaly  && !showShiftTrail && !showSpaghetti && !highlightRecent && !showRecordHigh && !showRecordLow && !showParis && showHistoric;
                const isDefaultView    = !anomaly && !showShiftTrail && showSeasons && showSpaghetti && highlightRecent && showRecordHigh && showRecordLow && !showHistoric;
                return (
                  <>
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
                className={`${TOGGLE_BASE} ${isShiftingSeasons ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
                title="Configure the chart to highlight how growing-season length has shifted decade by decade"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
                Shifting Seasons
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
                className={`${TOGGLE_BASE} ${isThenVsNow ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
                title="Anomaly mode comparing the historic and modern windows against the baseline"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>
                Then vs Now
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
                className={`${TOGGLE_BASE} ${isDefaultView ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
                title="Restore the default overview"
              >
                Default View
              </button>
                  </>
                );
              })()}
            </div>{/* end presets flex */}
          </div>{/* end Presets panel */}
          </div>{/* end sidebar panels grid */}
          </div>{/* end sidebar column */}
          </div>{/* end xl flex row */}

          {/* View Controls + Compare — full-width 2-col grid below the chart+sidebar row */}
          <div className={`mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3 ${controlsOpen && compareOpen ? 'items-stretch' : 'items-start'}`}>
          {/* ── View Controls panel ── */}
          <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => setControlsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800/40 transition-colors"
            >
              <span className="text-[10px] uppercase tracking-wider text-gray-500">View controls</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-gray-500 transition-transform duration-200 ${controlsOpen ? 'rotate-180' : ''}`}
              ><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {controlsOpen && (
            <div className="px-3 pt-3 pb-3 space-y-3 border-t border-[#D0A65E]/30">
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
                  max={300}
                  step={5}
                  value={Math.round(lineAlpha * 100)}
                  onChange={(v) => setLineAlpha(v / 100)}
                  accent={palette.high}
                />
              </div>
              <span className="font-mono text-[#FFF5E7] min-w-[3ch] tabular-nums">+{Math.round(lineAlpha * 100)}%</span>
            </div>

            {/* Lines — per-year spaghetti + the highlighted recent decade
                 + the warmest/coldest year rings. */}
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <span className="uppercase tracking-wider text-[10px] text-gray-500 sm:mr-1 sm:w-12">Lines</span>
              <div className="flex flex-wrap items-center gap-2">
              <ChipToggle active={showSpaghetti} onChange={setShowSpaghetti} color={palette.high}>
                Year Spaghetti
              </ChipToggle>
              <ChipToggle active={highlightRecent} onChange={setHighlightRecent} color={palette.high}>
                Highlight {recentFrom}–{recentTo}
              </ChipToggle>
              <ChipToggle active={showRecordHigh} onChange={setShowRecordHigh} color={palette.high}>
                {palette.highWord} Year
              </ChipToggle>
              <ChipToggle active={showRecordLow} onChange={setShowRecordLow} color={palette.low}>
                {palette.lowWord} Year
              </ChipToggle>
              </div>
            </div>

            {/* Means — dashed reference rings. Baseline only meaningful
                 in absolute mode; modern always available. */}
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <span className="uppercase tracking-wider text-[10px] text-gray-500 sm:mr-1 sm:w-12">Means</span>
              <div className="flex flex-wrap items-center gap-2">
              {!anomaly && (
                <ChipToggle active={showBaselineRing} onChange={setShowBaselineRing} color={metric === 'temp' ? '#22D3EE' : metric === 'precip' ? '#A78BFA' : metric === 'frost' ? '#C4B5FD' : '#92400E'}>
                  Baseline Ring <span className="text-[10px] text-gray-400">{baselineFrom}–{baselineTo}</span>
                </ChipToggle>
              )}
              <ChipToggle active={showRecentRing} onChange={setShowRecentRing} color={metric === 'temp' ? '#E5E7EB' : '#E8E8E8'}>
                Modern Ring <span className="text-[10px] text-gray-400">{recentFrom}–{recentTo}</span>
              </ChipToggle>
              <ChipToggle active={showHistoric} onChange={setShowHistoric} color="#94A3B8">
                Historic Ring <span className="text-[10px] text-gray-400">{historicFrom}–{historicTo}</span>
              </ChipToggle>
              </div>
            </div>

            </div>)}
          </div>

          {/* ── Compare Periods panel ── */}
          <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => setCompareOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800/40 transition-colors"
            >
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Compare periods</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-gray-500 transition-transform duration-200 ${compareOpen ? 'rotate-180' : ''}`}
              ><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {compareOpen && (
            <div className="px-3 pt-3 pb-3 border-t border-[#D0A65E]/30">
            <div className="flex items-center justify-end mb-2">
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
                Reset to Defaults
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
                  accent={metric === 'temp' ? '#22D3EE' : '#EF4444'}
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
            )}
          </div>
          </div>

          {/* Series legend lives above the chart now — see top of section. */}
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
  // Quadratic best-fit curve via polynomial regression
  const n = data.length;
  let trendPolyline: string | null = null;
  if (n >= 5) {
    const tspan = Math.max(1, xmax - xmin);
    const tv = data.map((d) => (d.year - xmin) / tspan);
    const _s0 = n;
    const _s1 = tv.reduce((a, v) => a + v, 0);
    const _s2 = tv.reduce((a, v) => a + v * v, 0);
    const _s3 = tv.reduce((a, v) => a + v * v * v, 0);
    const _s4 = tv.reduce((a, v) => a + v * v * v * v, 0);
    const _ry = data.reduce((a, d) => a + d.value, 0);
    const _rty = data.reduce((a, d, i) => a + tv[i] * d.value, 0);
    const _rt2y = data.reduce((a, d, i) => a + tv[i] * tv[i] * d.value, 0);
    const M = [[_s0,_s1,_s2,_ry],[_s1,_s2,_s3,_rty],[_s2,_s3,_s4,_rt2y]];
    for (let r = 0; r < 3; r++) {
      let mx = r; for (let i = r+1; i < 3; i++) if (Math.abs(M[i][r]) > Math.abs(M[mx][r])) mx = i;
      [M[r], M[mx]] = [M[mx], M[r]];
      for (let i = r+1; i < 3; i++) { const f = M[i][r] / M[r][r]; for (let j = r; j <= 3; j++) M[i][j] -= f * M[r][j]; }
    }
    const c = [0, 0, 0];
    for (let i = 2; i >= 0; i--) { c[i] = M[i][3]; for (let j = i+1; j < 3; j++) c[i] -= M[i][j] * c[j]; c[i] /= M[i][i]; }
    if (c.every(Number.isFinite)) {
      trendPolyline = Array.from({ length: 30 }, (_, i) => {
        const ti = i / 29;
        const v = c[0] + c[1] * ti + c[2] * ti * ti;
        return `${px(xmin + ti * tspan).toFixed(2)},${py(v).toFixed(2)}`;
      }).join(' ');
    }
  }
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
        <path d={path} fill="none" stroke={`${color}66`} strokeWidth={1.4} />
        {trendPolyline && <polyline fill="none" stroke={color} strokeWidth={2.5} opacity={0.9} strokeLinejoin="round" strokeLinecap="round" points={trendPolyline} />}
        <circle cx={px(last.year)} cy={py(last.value)} r={2.2} fill={color} />
      </svg>
      <div className="flex justify-between text-[9.5px] text-gray-500 font-mono">
        <span>{xmin}</span>
        <span>{xmax}</span>
      </div>
    </button>
  );
}

