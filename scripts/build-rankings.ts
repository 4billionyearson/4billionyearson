#!/usr/bin/env -S npx tsx
/* eslint-disable no-console */
/**
 * Build a pre-computed climate rankings snapshot.
 *
 * Reads every per-region snapshot under public/data/climate/{country,us-state,uk-region}/
 * and writes public/data/climate/rankings.json — the same shape that
 * /api/climate/rankings used to compute at request time.
 *
 * Why: on Vercel, the live /api/climate/rankings can time out on cold
 * start (144 file reads + Redis + 60s cap), which makes the "Biggest
 * shift" tab hang forever. Serving a static file is instant.
 *
 * Run manually:
 *   npx tsx scripts/build-rankings.ts
 *
 * Intended to be re-run after the per-region build-* scripts, so the
 * committed snapshot stays current.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLIMATE_REGIONS, type ClimateRegion } from '../src/lib/climate/regions';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_ROOT = resolve(__dirname, '..', 'public', 'data', 'climate');
const OUTPUT_PATH = resolve(SNAPSHOT_ROOT, 'rankings.json');
const PREVIOUS_PATH = resolve(SNAPSHOT_ROOT, 'rankings-previous.json');

interface MonthlyPoint {
  year: number;
  month: number;
  value?: number;
  temp?: number;
}

interface MetricWindow {
  actual1m: number | null;
  actual3m: number | null;
  actual12m: number | null;
  anom1m: number | null;
  anom3m: number | null;
  anom12m: number | null;
  label1m: string | null;
  label3m: string | null;
  label12m: string | null;
}

interface RankingRow {
  slug: string;
  name: string;
  type: ClimateRegion['type'];
  emoji: string;
  // Temperature anomaly (kept at top level for backward compatibility with
  // existing rankings panel consumers).
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
  dataAsOf: string | null;
  // Multi-metric block consumed by the Climate Map. Optional per region:
  // - temp: countries / us-states / uk-regions (anomaly + actual)
  // - precip: us-states / uk-regions (no current global country precip)
  // - sunshine / frost: UK regions only
  metrics?: {
    temp?: MetricWindow;
    precip?: MetricWindow;
    sunshine?: MetricWindow;
    frost?: MetricWindow;
  };
}

interface GroupRow {
  key: string;
  slug: string;
  label: string;
  kind: 'continent' | 'us-climate-region';
  memberCount: number | null;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
  // NOAA-native (source-native) anomalies for verification
  nativeAnomaly1m: number | null;
  nativeAnomaly12m: number | null;
  nativeBaseline: string | null;
  sourceUrl: string | null;
  note: string | null;
  aggregate: boolean;
}

interface RankingsGroups {
  continents: GroupRow[];
  usClimateRegions: GroupRow[];
}

interface RankingsResponse {
  generatedAt: string;
  cacheMonth: string;
  count: number;
  rows: RankingRow[];
  groups?: RankingsGroups;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function loadSnapshot(region: ClimateRegion): Promise<any | null> {
  let relativePath: string | null = null;
  if (region.type === 'country') relativePath = `country/${region.apiCode}.json`;
  else if (region.type === 'us-state') relativePath = `us-state/${region.apiCode}.json`;
  else if (region.type === 'uk-region') relativePath = `uk-region/${region.apiCode}.json`;
  if (!relativePath) return null;

  try {
    const raw = await readFile(resolve(SNAPSHOT_ROOT, relativePath), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function compute12MonthAnomaly(points: MonthlyPoint[]): number | null {
  return compute12mAnom(points, 1961, 1990);
}

// Generalised: returns { recentAvg, baselineAvg } over the last full 12 months
// (excluding any in-progress current month) using `bStart`–`bEnd` as the
// monthly climatology baseline. Returns null if any input month is missing.
function compute12m(
  points: MonthlyPoint[],
  bStart: number,
  bEnd: number,
): { recentAvg: number; baselineAvg: number } | null {
  if (points.length < 12) return null;
  const now = new Date();
  const yNow = now.getFullYear();
  const mNow = now.getMonth() + 1;
  const filtered = points.filter((p) => p.year < yNow || (p.year === yNow && p.month < mNow));
  if (filtered.length < 12) return null;
  const sorted = [...filtered].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  const last12 = sorted.slice(-12);
  const end = last12[last12.length - 1];
  const start = last12[0];
  const span = (end.year * 12 + end.month) - (start.year * 12 + start.month);
  if (span !== 11) return null;
  const toVal = (p: MonthlyPoint) => (p.value ?? p.temp);
  const recentAvg = last12.reduce((sum, p) => sum + (toVal(p) ?? 0), 0) / 12;
  const baselineByMonth: Record<number, number[]> = {};
  for (const p of sorted) {
    if (p.year < bStart || p.year > bEnd) continue;
    const v = toVal(p);
    if (v == null) continue;
    (baselineByMonth[p.month] ||= []).push(v);
  }
  const baselineMonthAvgs: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const arr = baselineByMonth[m];
    if (!arr || !arr.length) return null;
    baselineMonthAvgs.push(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  const baselineAvg = baselineMonthAvgs.reduce((a, b) => a + b, 0) / 12;
  return { recentAvg, baselineAvg };
}

function compute12mAnom(points: MonthlyPoint[], bStart: number, bEnd: number): number | null {
  const r = compute12m(points, bStart, bEnd);
  return r ? round2(r.recentAvg - r.baselineAvg) : null;
}

function compute12mActual(points: MonthlyPoint[]): number | null {
  const r = compute12m(points, 1961, 1990);
  return r ? round2(r.recentAvg) : null;
}

function compute12mLabel(points: MonthlyPoint[]): string | null {
  if (points.length < 12) return null;
  const now = new Date();
  const yNow = now.getFullYear();
  const mNow = now.getMonth() + 1;
  const filtered = points
    .filter((p) => p.year < yNow || (p.year === yNow && p.month < mNow))
    .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  if (filtered.length < 12) return null;
  const last12 = filtered.slice(-12);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const s = last12[0];
  const e = last12[last12.length - 1];
  return `${months[s.month - 1]} ${s.year}–${months[e.month - 1]} ${e.year}`;
}

// Pull the actual/anomaly for the latest 1m / 3m / 12m windows from a metric
// node that follows the standard {latestMonthStats,latestThreeMonthStats,monthlyAll}
// shape used by the country/us-state/uk-region snapshots.
function buildMetricWindow(node: any, baselineStart: number, baselineEnd: number): MetricWindow | null {
  if (!node) return null;
  const latest1m = node.latestMonthStats ?? null;
  const latest3m = node.latestThreeMonthStats ?? null;
  const monthlyAll: MonthlyPoint[] = Array.isArray(node.monthlyAll) ? node.monthlyAll : [];

  const actual1m = numOrNull(latest1m?.recent ?? latest1m?.recentTemp ?? latest1m?.value);
  const actual3m = numOrNull(latest3m?.recent ?? latest3m?.recentTemp ?? latest3m?.value);
  const anom1m = numOrNull(latest1m?.diff);
  const anom3m = numOrNull(latest3m?.diff);
  const label1m = latest1m?.label ?? null;
  const label3m = latest3m?.label ?? null;

  const actual12mFromMonthly = monthlyAll.length ? compute12mActual(monthlyAll) : null;
  const anom12mFromMonthly = monthlyAll.length ? compute12mAnom(monthlyAll, baselineStart, baselineEnd) : null;
  const label12mFromMonthly = monthlyAll.length ? compute12mLabel(monthlyAll) : null;

  // Fallback: some snapshot vars (e.g. Met Office AirFrost) only publish a
  // `yearly` series, not month-by-month. In that case use the latest full
  // calendar year as the "12-month" window vs the annual mean over the
  // baseline range.
  let actual12m = actual12mFromMonthly;
  let anom12m = anom12mFromMonthly;
  let label12m = label12mFromMonthly;
  if ((actual12m == null || anom12m == null) && Array.isArray(node.yearly) && node.yearly.length) {
    const yNow = new Date().getFullYear();
    const yearly: { year: number; value: number }[] = node.yearly
      .map((p: any) => ({ year: p.year, value: numOrNull(p.value ?? p.avgTemp ?? p.temp) }))
      .filter((p: any) => p.year < yNow && p.value != null);
    if (yearly.length) {
      const latest = yearly[yearly.length - 1];
      const baseline = yearly.filter((p) => p.year >= baselineStart && p.year <= baselineEnd);
      if (actual12m == null) actual12m = round2(latest.value);
      if (label12m == null) label12m = String(latest.year);
      if (anom12m == null && baseline.length >= 20) {
        const bMean = baseline.reduce((s, p) => s + p.value, 0) / baseline.length;
        anom12m = round2(latest.value - bMean);
      }
    }
  }

  // If no window has any data we drop the metric entirely.
  if (
    actual1m == null && actual3m == null && actual12m == null &&
    anom1m == null && anom3m == null && anom12m == null
  ) {
    return null;
  }

  return {
    actual1m: actual1m == null ? null : round2(actual1m),
    actual3m: actual3m == null ? null : round2(actual3m),
    actual12m,
    anom1m: anom1m == null ? null : round2(anom1m),
    anom3m: anom3m == null ? null : round2(anom3m),
    anom12m,
    label1m,
    label3m,
    label12m,
  };
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function extractRow(region: ClimateRegion, data: any): RankingRow | null {
  if (!data) return null;
  let latestMonthStats: any = null;
  let latestThreeMonthStats: any = null;
  let monthlyAll: MonthlyPoint[] | null = null;

  // Per-metric source nodes (each follows the standard
  // {latestMonthStats,latestThreeMonthStats,monthlyAll} shape).
  let tempNode: any = null;
  let precipNode: any = null;
  let sunshineNode: any = null;
  let frostNode: any = null;

  if (region.type === 'country') {
    latestMonthStats = data.latestMonthStats;
    latestThreeMonthStats = data.latestThreeMonthStats;
    monthlyAll = Array.isArray(data.monthlyAll) ? data.monthlyAll : null;
    // Country snapshots ARE the temperature node (top-level fields).
    tempNode = {
      latestMonthStats: data.latestMonthStats,
      latestThreeMonthStats: data.latestThreeMonthStats,
      monthlyAll: data.monthlyAll,
    };
    // Country precip data lives in country-precip/ but the World Bank CKP
    // series ends in 2023 - too stale for a "this month" map view, so we
    // intentionally skip it here.
  } else if (region.type === 'us-state') {
    const tavg = data?.paramData?.tavg;
    latestMonthStats = tavg?.latestMonthStats;
    latestThreeMonthStats = tavg?.latestThreeMonthStats;
    monthlyAll = Array.isArray(tavg?.monthlyAll) ? tavg.monthlyAll : null;
    tempNode = tavg ?? null;
    precipNode = data?.paramData?.pcp ?? null;
  } else if (region.type === 'uk-region') {
    const tmean = data?.varData?.Tmean;
    latestMonthStats = tmean?.latestMonthStats;
    latestThreeMonthStats = tmean?.latestThreeMonthStats;
    monthlyAll = Array.isArray(tmean?.monthlyAll) ? tmean.monthlyAll : null;
    tempNode = tmean ?? null;
    precipNode = data?.varData?.Rainfall ?? null;
    sunshineNode = data?.varData?.Sunshine ?? null;
    frostNode = data?.varData?.AirFrost ?? null;
  }

  const anomaly1m = typeof latestMonthStats?.diff === 'number' ? round2(latestMonthStats.diff) : null;
  const anomaly3m = typeof latestThreeMonthStats?.diff === 'number' ? round2(latestThreeMonthStats.diff) : null;
  const anomaly12m = monthlyAll ? compute12MonthAnomaly(monthlyAll) : null;

  const latestLabel = latestMonthStats?.label ?? null;
  let dataAsOf: string | null = null;
  if (monthlyAll?.length) {
    const now = new Date();
    const yNow = now.getFullYear();
    const mNow = now.getMonth() + 1;
    const before = monthlyAll.filter((p) => p.year < yNow || (p.year === yNow && p.month < mNow));
    if (before.length) {
      const last = before.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month)).slice(-1)[0];
      dataAsOf = `${last.year}-${String(last.month).padStart(2, '0')}`;
    }
  }

  if (anomaly1m == null && anomaly3m == null && anomaly12m == null) return null;

  // Build per-metric windows. Temp uses the 1961-1990 baseline; precip,
  // sunshine and frost use 1991-2020 (Met Office / WMO standard climate
  // normal). For temp we already have anomaly1m/3m/12m at the top level so
  // the temp window mainly contributes the absolute values.
  const tempW = buildMetricWindow(tempNode, 1961, 1990);
  const precipW = buildMetricWindow(precipNode, 1991, 2020);
  const sunshineW = buildMetricWindow(sunshineNode, 1991, 2020);
  const frostW = buildMetricWindow(frostNode, 1991, 2020);

  const metrics: NonNullable<RankingRow['metrics']> = {};
  if (tempW) metrics.temp = tempW;
  if (precipW) metrics.precip = precipW;
  if (sunshineW) metrics.sunshine = sunshineW;
  if (frostW) metrics.frost = frostW;

  return {
    slug: region.slug,
    name: region.name,
    type: region.type,
    emoji: region.emoji,
    anomaly1m,
    anomaly3m,
    anomaly12m,
    latestLabel,
    dataAsOf,
    ...(Object.keys(metrics).length ? { metrics } : {}),
  };
}

// ----------------------------------------------------------------------
// Groups (NOAA continents + NOAA US climate regions). These come from
// global-history.json (continents) and the per-region us-climate-region
// snapshots produced by build-us-climate-regions.mjs.
// ----------------------------------------------------------------------

const CONTINENT_DISPLAY_ORDER = [
  'North America',
  'South America',
  'Europe',
  'Asia',
  'Africa',
  'Oceania',
  'Antarctica',
];

const US_CLIMATE_REGION_FILES: Array<{ slug: string; label: string }> = [
  { slug: 'us-northeast', label: 'Northeast' },
  { slug: 'us-upper-midwest', label: 'Upper Midwest' },
  { slug: 'us-ohio-valley', label: 'Ohio Valley' },
  { slug: 'us-southeast', label: 'Southeast' },
  { slug: 'us-northern-rockies-plains', label: 'Northern Rockies and Plains' },
  { slug: 'us-south', label: 'South' },
  { slug: 'us-southwest', label: 'Southwest' },
  { slug: 'us-northwest', label: 'Northwest' },
  { slug: 'us-west', label: 'West' },
];

async function buildContinentGroups(): Promise<GroupRow[]> {
  let global: any = null;
  try {
    const raw = await readFile(resolve(SNAPSHOT_ROOT, 'global-history.json'), 'utf8');
    global = JSON.parse(raw);
  } catch {
    return [];
  }
  const continentStats: any[] = Array.isArray(global?.continentStats) ? global.continentStats : [];
  const aggregated: any[] = Array.isArray(global?.aggregatedContinents) ? global.aggregatedContinents : [];

  const rows: GroupRow[] = [];

  for (const c of continentStats) {
    if (!c?.label) continue;
    // Skip hemispheres (we want continents only in this group panel).
    if (c.key === 'northernHemisphere' || c.key === 'southernHemisphere') continue;
    rows.push({
      key: c.key ?? c.label,
      slug: c.key ?? String(c.label).toLowerCase().replace(/\s+/g, '-'),
      label: c.label,
      kind: 'continent',
      memberCount: null,
      anomaly1m: typeof c.anomaly1m === 'number' ? round2(c.anomaly1m) : null,
      anomaly3m: typeof c.anomaly3m === 'number' ? round2(c.anomaly3m) : null,
      anomaly12m: typeof c.anomaly12m === 'number' ? round2(c.anomaly12m) : null,
      latestLabel: c.label1m ?? c.latestMonth ?? null,
      nativeAnomaly1m: typeof c.nativeAnomaly1m === 'number' ? round2(c.nativeAnomaly1m) : null,
      nativeAnomaly12m: typeof c.nativeAnomaly12m === 'number' ? round2(c.nativeAnomaly12m) : null,
      nativeBaseline: c.nativeBaseline ?? '1901-2000',
      sourceUrl: c.sourceUrl ?? null,
      note: null,
      aggregate: false,
    });
  }

  for (const c of aggregated) {
    if (!c?.label) continue;
    rows.push({
      key: c.key ?? c.label,
      slug: c.key ?? String(c.label).toLowerCase().replace(/\s+/g, '-'),
      label: c.label,
      kind: 'continent',
      memberCount: typeof c.memberCount === 'number' ? c.memberCount : null,
      anomaly1m: typeof c.anomaly1m === 'number' ? round2(c.anomaly1m) : null,
      anomaly3m: typeof c.anomaly3m === 'number' ? round2(c.anomaly3m) : null,
      anomaly12m: typeof c.anomaly12m === 'number' ? round2(c.anomaly12m) : null,
      latestLabel: c.label1m ?? c.latestMonth ?? null,
      nativeAnomaly1m: typeof c.nativeAnomaly1m === 'number' ? round2(c.nativeAnomaly1m) : null,
      nativeAnomaly12m: typeof c.nativeAnomaly12m === 'number' ? round2(c.nativeAnomaly12m) : null,
      nativeBaseline: null,
      sourceUrl: null,
      note: c.note ?? '4BYO aggregate (NOAA does not publish a standalone continental land series for this region)',
      aggregate: true,
    });
  }

  rows.sort((a, b) => CONTINENT_DISPLAY_ORDER.indexOf(a.label) - CONTINENT_DISPLAY_ORDER.indexOf(b.label));
  return rows;
}

function toMonthlyPoints(arr: any): MonthlyPoint[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((p) => p && typeof p.year === 'number' && typeof p.month === 'number');
}

async function buildUsClimateRegionGroups(): Promise<GroupRow[]> {
  const out: GroupRow[] = [];
  for (const r of US_CLIMATE_REGION_FILES) {
    let snap: any = null;
    try {
      const raw = await readFile(resolve(SNAPSHOT_ROOT, 'us-climate-region', `${r.slug}.json`), 'utf8');
      snap = JSON.parse(raw);
    } catch {
      continue;
    }
    const tavg = snap?.paramData?.tavg;
    if (!tavg) continue;
    const points = toMonthlyPoints(tavg.monthlyAll);
    const anomaly1m = typeof tavg.latestMonthStats?.diff === 'number' ? round2(tavg.latestMonthStats.diff) : null;
    const anomaly3m = typeof tavg.latestThreeMonthStats?.diff === 'number' ? round2(tavg.latestThreeMonthStats.diff) : null;
    const anomaly12m = compute12MonthAnomaly(points);
    out.push({
      key: r.slug,
      slug: r.slug,
      label: r.label,
      kind: 'us-climate-region',
      memberCount: null,
      anomaly1m,
      anomaly3m,
      anomaly12m,
      latestLabel: tavg.latestMonthStats?.label ?? null,
      nativeAnomaly1m: typeof tavg.nativeStats?.nativeDiff === 'number' ? round2(tavg.nativeStats.nativeDiff) : null,
      nativeAnomaly12m: typeof tavg.nativeStats?.nativeDiff12m === 'number' ? round2(tavg.nativeStats.nativeDiff12m) : null,
      nativeBaseline: tavg.nativeStats?.baseline ?? '1901-2000',
      sourceUrl: snap?.sourceUrl ?? null,
      note: null,
      aggregate: false,
    });
  }
  return out;
}

async function buildGroups(): Promise<RankingsGroups> {
  const [continents, usClimateRegions] = await Promise.all([
    buildContinentGroups(),
    buildUsClimateRegionGroups(),
  ]);
  return { continents, usClimateRegions };
}

async function main() {
  const regions = CLIMATE_REGIONS.filter((r) => r.type !== 'special');
  console.log(`Building rankings for ${regions.length} regions…`);

  const results = await Promise.all(
    regions.map(async (region) => ({ region, row: extractRow(region, await loadSnapshot(region)) })),
  );

  const rows: RankingRow[] = [];
  let missing = 0;
  for (const { region, row } of results) {
    if (row) rows.push(row);
    else missing++;
  }

  const groups = await buildGroups();

  const now = new Date();
  const cacheMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const response: RankingsResponse = {
    generatedAt: now.toISOString(),
    cacheMonth,
    count: rows.length,
    rows,
    groups,
  };

  // Preserve the previous snapshot so the "biggest movers" card can compute
  // month-over-month rank deltas. Only archive when the cacheMonth differs,
  // so re-running the script mid-month doesn't overwrite an older baseline.
  try {
    const existingRaw = await readFile(OUTPUT_PATH, 'utf8');
    const existing = JSON.parse(existingRaw) as RankingsResponse | null;
    if (existing?.cacheMonth && existing.cacheMonth !== cacheMonth) {
      await writeFile(PREVIOUS_PATH, existingRaw, 'utf8');
      console.log(`  Archived previous snapshot (${existing.cacheMonth}) → rankings-previous.json`);
    }
  } catch {
    // no existing snapshot yet
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(response, null, 2) + '\n', 'utf8');
  console.log(`✓ Wrote ${rows.length} rows → ${OUTPUT_PATH}`);
  if (missing) console.log(`  (${missing} regions had no snapshot data)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
