#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build pre-computed snapshots for NOAA's 9 US Climate Regions
 * (codes 101–109 in the NCEI Climate at a Glance API).
 *
 * Output: public/data/climate/us-climate-region/<slug>.json
 *
 * NOAA's regional endpoint returns the same JSON shape as the statewide
 * endpoint, so we reuse the state-snapshot helpers for consistency.
 *
 * Usage:
 *   node scripts/build-us-climate-regions.mjs
 *   node scripts/build-us-climate-regions.mjs --only=us-northeast
 *   node scripts/build-us-climate-regions.mjs --skip-existing
 */

import { writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  round2,
  MONTH_NAMES,
  fetchWithRetry,
  sleep,
  buildLatestMonthStats,
  buildLatestThreeMonthStats,
  latestDataMonth,
} from './_climate-common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'data', 'climate', 'us-climate-region');

// NOAA reports US climate regions against a 1901–2000 native baseline.
const NATIVE_BASELINE = '1901-2000';
const NATIVE_BASELINE_START = 1901;
const NATIVE_BASELINE_END = 2000;

const NOAA_PARAMS = ['tavg', 'pcp'];
const PARAM_LABELS = {
  tavg: 'Average Temperature',
  pcp: 'Precipitation',
};

const REGIONS = [
  { id: 'us-northeast', name: 'Northeast', noaaCode: 101, sourceUrlSlug: '101' },
  { id: 'us-upper-midwest', name: 'Upper Midwest', noaaCode: 102, sourceUrlSlug: '102' },
  { id: 'us-ohio-valley', name: 'Ohio Valley', noaaCode: 103, sourceUrlSlug: '103' },
  { id: 'us-southeast', name: 'Southeast', noaaCode: 104, sourceUrlSlug: '104' },
  { id: 'us-northern-rockies-plains', name: 'Northern Rockies and Plains', noaaCode: 105, sourceUrlSlug: '105' },
  { id: 'us-south', name: 'South', noaaCode: 106, sourceUrlSlug: '106' },
  { id: 'us-southwest', name: 'Southwest', noaaCode: 107, sourceUrlSlug: '107' },
  { id: 'us-northwest', name: 'Northwest', noaaCode: 108, sourceUrlSlug: '108' },
  { id: 'us-west', name: 'West', noaaCode: 109, sourceUrlSlug: '109' },
];

function parseArgs(argv) {
  const only = argv.find((a) => a.startsWith('--only='));
  const onlyList = only ? only.split('=')[1].split(',').map((s) => s.trim().toLowerCase()) : null;
  const skipExisting = argv.includes('--skip-existing');
  return { onlyList, skipExisting };
}

function fahrenheitToCelsius(f) {
  return Math.round(((f - 32) * 5 / 9) * 100) / 100;
}

function inchesToMm(inches) {
  return Math.round(inches * 25.4 * 100) / 100;
}

function parseNoaa(json, param) {
  const data = {};
  for (const [key, val] of Object.entries(json.data)) {
    const numVal = parseFloat(val.value);
    if (Number.isNaN(numVal) || numVal === -99) continue;
    data[key] = param === 'pcp' ? inchesToMm(numVal) : fahrenheitToCelsius(numVal);
  }
  return data;
}

function monthlyEntries(data) {
  return Object.entries(data)
    .map(([key, value]) => ({
      year: parseInt(key.substring(0, 4), 10),
      month: parseInt(key.substring(4, 6), 10),
      value,
    }))
    .filter((p) => !Number.isNaN(p.year) && !Number.isNaN(p.month))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));
}

function buildYearlyFromNoaa(data, param) {
  const byYear = {};
  for (const [key, val] of Object.entries(data)) {
    const year = parseInt(key.substring(0, 4), 10);
    if (Number.isNaN(year)) continue;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(val);
  }
  const currentYear = new Date().getFullYear();
  const yearly = Object.keys(byYear).map(Number).sort((a, b) => a - b)
    .filter((y) => y < currentYear && byYear[y].length >= 6)
    .map((y) => {
      const vals = byYear[y];
      const avg = param === 'pcp'
        ? round2(vals.reduce((a, b) => a + b, 0))
        : round2(vals.reduce((a, b) => a + b, 0) / vals.length);
      return { year: y, value: avg };
    });
  for (let i = 0; i < yearly.length; i++) {
    if (i >= 9) {
      const slice = yearly.slice(i - 9, i + 1);
      yearly[i].rollingAvg = round2(slice.reduce((a, b) => a + b.value, 0) / slice.length);
    }
  }
  return yearly;
}

function buildComparisonFromNoaa(data) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const historicByMonth = {};
  for (const [key, val] of Object.entries(data)) {
    const year = parseInt(key.substring(0, 4), 10);
    const month = parseInt(key.substring(4, 6), 10);
    if (year >= 1961 && year <= 1990) {
      if (!historicByMonth[month]) historicByMonth[month] = [];
      historicByMonth[month].push(val);
    }
  }
  const out = [];
  for (let i = 12; i >= 1; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) { m += 12; y--; }
    const key = `${y}${String(m).padStart(2, '0')}`;
    const recent = data[key];
    const historic = historicByMonth[m];
    const historicAvg = historic && historic.length > 0
      ? round2(historic.reduce((a, b) => a + b, 0) / historic.length)
      : null;
    out.push({
      monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
      month: m,
      year: y,
      recent: recent !== undefined ? recent : null,
      historicAvg,
      diff: recent !== undefined && historicAvg !== null ? round2(recent - historicAvg) : null,
    });
  }
  return out;
}

// Native (NOAA 1901–2000) latest-month and 12-month rolling stats. The
// existing buildLatestMonthStats helper is hard-coded to 1961–1990, so we
// compute the source-native verification figures alongside it.
function buildNativeStats(points) {
  if (!points.length) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = points.filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth));
  if (!filtered.length) return null;
  const latest = filtered[filtered.length - 1];
  const sameMonthBaseline = filtered.filter(
    (p) => p.month === latest.month && p.year >= NATIVE_BASELINE_START && p.year <= NATIVE_BASELINE_END,
  );
  if (!sameMonthBaseline.length) return null;
  const baselineAvg = sameMonthBaseline.reduce((s, p) => s + p.value, 0) / sameMonthBaseline.length;
  const nativeDiff = round2(latest.value - baselineAvg);

  // 12-month native anomaly
  let nativeDiff12m = null;
  let label12m = null;
  if (filtered.length >= 12) {
    const last12 = filtered.slice(-12);
    const start = last12[0];
    const end = last12[last12.length - 1];
    const span = (end.year * 12 + end.month) - (start.year * 12 + start.month);
    if (span === 11) {
      const baselineByMonth = {};
      for (const p of filtered) {
        if (p.year < NATIVE_BASELINE_START || p.year > NATIVE_BASELINE_END) continue;
        (baselineByMonth[p.month] ||= []).push(p.value);
      }
      const baselineMeans = [];
      for (let m = 1; m <= 12; m++) {
        const arr = baselineByMonth[m];
        if (!arr?.length) { baselineMeans.length = 0; break; }
        baselineMeans.push(arr.reduce((a, b) => a + b, 0) / arr.length);
      }
      if (baselineMeans.length === 12) {
        const recentMean = last12.reduce((s, p) => s + p.value, 0) / 12;
        const baselineMean = baselineMeans.reduce((a, b) => a + b, 0) / 12;
        nativeDiff12m = round2(recentMean - baselineMean);
        label12m = `${MONTH_NAMES[start.month - 1]} ${start.year} – ${MONTH_NAMES[end.month - 1]} ${end.year}`;
      }
    }
  }
  return {
    label: `${MONTH_NAMES[latest.month - 1]} ${latest.year}`,
    baseline: NATIVE_BASELINE,
    nativeDiff,
    nativeDiff12m,
    label12m,
  };
}

async function fetchRegionParam(noaaCode, param) {
  const url = `https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/regional/time-series/${noaaCode}/${param}/1/0/1950-2026.json`;
  const json = await fetchWithRetry(url, { label: `NOAA region ${noaaCode}/${param}`, timeoutMs: 90_000, attempts: 4 });
  const data = parseNoaa(json, param);
  return {
    data,
    title: json.description?.title ?? '',
    units: param === 'pcp' ? 'mm' : '°C',
  };
}

async function fileExists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function main() {
  const { onlyList, skipExisting } = parseArgs(process.argv.slice(2));
  console.log(`Build started ${new Date().toISOString()}`);
  await mkdir(OUTPUT_DIR, { recursive: true });

  const regions = onlyList
    ? REGIONS.filter((r) => onlyList.includes(r.id))
    : REGIONS;

  console.log(`Processing ${regions.length} regions × ${NOAA_PARAMS.length} params`);
  let ok = 0;
  let failed = 0;

  for (const region of regions) {
    const outPath = resolve(OUTPUT_DIR, `${region.id}.json`);
    if (skipExisting && await fileExists(outPath)) {
      console.log(`  ⊙ ${region.id.padEnd(28)} skipped (already exists)`);
      continue;
    }

    try {
      const paramResults = {};
      for (const param of NOAA_PARAMS) {
        paramResults[param] = await fetchRegionParam(region.noaaCode, param);
        await sleep(500);
      }

      const paramData = {};
      for (const param of NOAA_PARAMS) {
        const result = paramResults[param];
        if (!result) continue;
        const points = monthlyEntries(result.data);
        paramData[param] = {
          label: PARAM_LABELS[param],
          units: result.units,
          yearly: buildYearlyFromNoaa(result.data, param),
          monthlyComparison: buildComparisonFromNoaa(result.data),
          latestMonthStats: buildLatestMonthStats(points),
          latestThreeMonthStats: buildLatestThreeMonthStats(points),
          nativeStats: param === 'tavg' ? buildNativeStats(points) : null,
          monthlyAll: points,
        };
      }

      const tavgPoints = monthlyEntries(paramResults.tavg?.data ?? {});
      const lastMonth = latestDataMonth(tavgPoints);

      const response = {
        region: region.name,
        id: region.id,
        noaaCode: region.noaaCode,
        sourceUrl: `https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/regional/time-series/${region.noaaCode}/tavg/1/0/1950-2026`,
        paramData,
        lastUpdated: lastMonth,
        generatedAt: new Date().toISOString(),
      };

      await writeFile(outPath, JSON.stringify(response), 'utf8');
      ok++;
      console.log(`  ✓ ${region.id.padEnd(28)} ${region.name.padEnd(28)} latest ${lastMonth}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${region.id} (${region.name}): ${err?.message ?? err}`);
    }
  }

  console.log(`\nDone: ${ok} snapshots written, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
