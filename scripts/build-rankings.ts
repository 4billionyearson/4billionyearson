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

interface RankingRow {
  slug: string;
  name: string;
  type: ClimateRegion['type'];
  emoji: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
  dataAsOf: string | null;
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

  const now = new Date();
  const cacheMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const response: RankingsResponse = {
    generatedAt: now.toISOString(),
    cacheMonth,
    count: rows.length,
    rows,
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
