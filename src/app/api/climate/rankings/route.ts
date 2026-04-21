// Aggregated climate rankings across every region we publish.
//
// For each country / US state / UK region, we extract three anomaly
// figures (1-month, 3-month, 12-month rolling) against the 1961–1990
// baseline, then cache the whole table in Redis under a monthly key so
// it rolls over automatically. A nightly cron warms this endpoint.

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CLIMATE_REGIONS, type ClimateRegion } from '@/lib/climate/regions';
import { getCached, setShortTerm } from '@/lib/climate/redis';

interface MonthlyPoint {
  year: number;
  month: number;
  value?: number;
  temp?: number;
}

interface RankingRow {
  slug: string;
  name: string;
  type: ClimateRegion['type'];
  emoji: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null; // e.g. "Mar 2026" — label of the most recent month
  dataAsOf: string | null;     // YYYY-MM of latest month available
}

interface RankingsResponse {
  generatedAt: string;
  cacheMonth: string;
  count: number;
  rows: RankingRow[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const SNAPSHOT_ROOT = resolve(process.cwd(), 'public', 'data', 'climate');

/**
 * Load a region's snapshot directly from disk. Snapshots are bundled
 * into the serverless function via `outputFileTracingIncludes` in
 * next.config.ts, so this is purely a local file read — no HTTP hop.
 */
async function loadSnapshot(region: ClimateRegion): Promise<any | null> {
  let relativePath: string | null = null;
  if (region.type === 'country') {
    relativePath = `country/${region.apiCode}.json`;
  } else if (region.type === 'us-state') {
    relativePath = `us-state/${region.apiCode}.json`;
  } else if (region.type === 'uk-region') {
    relativePath = `uk-region/${region.apiCode}.json`;
  }
  if (!relativePath) return null;

  const fullPath = resolve(SNAPSHOT_ROOT, relativePath);
  try {
    const raw = await readFile(fullPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Compute a rolling 12-month anomaly against the 1961-1990 baseline
 * using the latest complete 12-month window. Baseline is the average of
 * all 1961-1990 values across the same 12 calendar months.
 */
function compute12MonthAnomaly(points: MonthlyPoint[]): number | null {
  if (points.length < 12) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = points.filter((p) =>
    p.year < currentYear || (p.year === currentYear && p.month < currentMonth)
  );
  if (filtered.length < 12) return null;
  const sorted = [...filtered].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  const last12 = sorted.slice(-12);

  // Require the 12 months to be contiguous, ending at the latest.
  const end = last12[last12.length - 1];
  const start = last12[0];
  const span = (end.year * 12 + end.month) - (start.year * 12 + start.month);
  if (span !== 11) return null;

  const toVal = (p: MonthlyPoint) => (p.value ?? p.temp);
  const recentAvg = last12.reduce((sum, p) => sum + (toVal(p) ?? 0), 0) / 12;

  // Baseline: same 12 calendar months averaged across 1961-1990.
  const baselineByMonth: Record<number, number[]> = {};
  for (const p of sorted) {
    if (p.year < 1961 || p.year > 1990) continue;
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
  return round2(recentAvg - baselineAvg);
}

/**
 * Extract a unified ranking row from the source API response for a region.
 */
function extractRow(region: ClimateRegion, data: any): RankingRow | null {
  if (!data) return null;

  let latestMonthStats: any = null;
  let latestThreeMonthStats: any = null;
  let monthlyAll: MonthlyPoint[] | null = null;

  if (region.type === 'country') {
    latestMonthStats = data.latestMonthStats;
    latestThreeMonthStats = data.latestThreeMonthStats;
    monthlyAll = Array.isArray(data.monthlyAll) ? data.monthlyAll : null;
  } else if (region.type === 'us-state') {
    const tavg = data?.paramData?.tavg;
    latestMonthStats = tavg?.latestMonthStats;
    latestThreeMonthStats = tavg?.latestThreeMonthStats;
    monthlyAll = Array.isArray(tavg?.monthlyAll) ? tavg.monthlyAll : null;
  } else if (region.type === 'uk-region') {
    const tmean = data?.varData?.Tmean;
    latestMonthStats = tmean?.latestMonthStats;
    latestThreeMonthStats = tmean?.latestThreeMonthStats;
    monthlyAll = Array.isArray(tmean?.monthlyAll) ? tmean.monthlyAll : null;
  }

  const anomaly1m =
    typeof latestMonthStats?.diff === 'number' ? round2(latestMonthStats.diff) : null;
  const anomaly3m =
    typeof latestThreeMonthStats?.diff === 'number' ? round2(latestThreeMonthStats.diff) : null;
  const anomaly12m = monthlyAll ? compute12MonthAnomaly(monthlyAll) : null;

  const latestLabel = latestMonthStats?.label ?? null;
  let dataAsOf: string | null = null;
  if (monthlyAll?.length) {
    // Find the latest pre-current-month entry
    const now = new Date();
    const yNow = now.getFullYear();
    const mNow = now.getMonth() + 1;
    const before = monthlyAll.filter((p) => p.year < yNow || (p.year === yNow && p.month < mNow));
    if (before.length) {
      const last = before.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month)).slice(-1)[0];
      dataAsOf = `${last.year}-${String(last.month).padStart(2, '0')}`;
    }
  }

  // If we've got no figures at all, drop the region from the response
  if (anomaly1m == null && anomaly3m == null && anomaly12m == null) return null;

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
  };
}

async function computeRankings(): Promise<RankingsResponse> {
  const rows: RankingRow[] = [];
  const regions = CLIMATE_REGIONS.filter((r) => r.type !== 'special');

  // Snapshots are local JSON files bundled into the function, so we can
  // comfortably load all ~150 regions in parallel without touching the
  // network at all.
  const results = await Promise.all(
    regions.map(async (region) => {
      const data = await loadSnapshot(region);
      return extractRow(region, data);
    }),
  );
  for (const row of results) {
    if (row) rows.push(row);
  }

  const now = new Date();
  const cacheMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return {
    generatedAt: now.toISOString(),
    cacheMonth,
    count: rows.length,
    rows,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get('refresh') === '1';

  const now = new Date();
  const dayOfMonth = now.getDate();
  // Same cutover logic as the profile route: after the 21st, assume current
  // month's data is available; else fall back to previous month.
  const cacheMonth = dayOfMonth >= 21
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    : (() => {
        const prev = new Date(now);
        prev.setMonth(prev.getMonth() - 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      })();
  const cacheKey = `climate:rankings:${cacheMonth}-v2`;

  if (!force) {
    const cached = await getCached<RankingsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }
  }

  const result = await computeRankings();
  await setShortTerm(cacheKey, result);
  return NextResponse.json({ ...result, source: 'fresh' });
}
