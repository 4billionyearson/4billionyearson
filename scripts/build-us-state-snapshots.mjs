#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build pre-computed per-state climate snapshots from NOAA Climate at
 * a Glance (statewide time series).
 *
 * Fetches 4 parameters (tavg, tmax, tmin, pcp) per state — so 50 states
 * × 4 = 200 NOAA requests total, run sequentially with a small delay to
 * stay polite. With NOAA's typical response time (30-60s per file
 * because they regenerate the JSON on demand), expect the full build
 * to take ~30 minutes.
 *
 * Output: public/data/climate/us-state/<id>.json
 *
 * Usage:
 *   node scripts/build-us-state-snapshots.mjs                # all states
 *   node scripts/build-us-state-snapshots.mjs --only=us-ca
 *   node scripts/build-us-state-snapshots.mjs --skip-existing
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
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'data', 'climate', 'us-state');

const NOAA_PARAMS = ['tavg', 'tmax', 'tmin', 'pcp'];
const PARAM_LABELS = {
  tavg: 'Average Temperature',
  tmax: 'Maximum Temperature',
  tmin: 'Minimum Temperature',
  pcp: 'Precipitation',
};

const US_STATES = [
  { id: 'us-al', name: 'Alabama', noaaStateCode: 1 },
  { id: 'us-az', name: 'Arizona', noaaStateCode: 2 },
  { id: 'us-ar', name: 'Arkansas', noaaStateCode: 3 },
  { id: 'us-ca', name: 'California', noaaStateCode: 4 },
  { id: 'us-co', name: 'Colorado', noaaStateCode: 5 },
  { id: 'us-ct', name: 'Connecticut', noaaStateCode: 6 },
  { id: 'us-de', name: 'Delaware', noaaStateCode: 7 },
  { id: 'us-fl', name: 'Florida', noaaStateCode: 8 },
  { id: 'us-ga', name: 'Georgia', noaaStateCode: 9 },
  { id: 'us-id', name: 'Idaho', noaaStateCode: 10 },
  { id: 'us-il', name: 'Illinois', noaaStateCode: 11 },
  { id: 'us-in', name: 'Indiana', noaaStateCode: 12 },
  { id: 'us-ia', name: 'Iowa', noaaStateCode: 13 },
  { id: 'us-ks', name: 'Kansas', noaaStateCode: 14 },
  { id: 'us-ky', name: 'Kentucky', noaaStateCode: 15 },
  { id: 'us-la', name: 'Louisiana', noaaStateCode: 16 },
  { id: 'us-me', name: 'Maine', noaaStateCode: 17 },
  { id: 'us-md', name: 'Maryland', noaaStateCode: 18 },
  { id: 'us-ma', name: 'Massachusetts', noaaStateCode: 19 },
  { id: 'us-mi', name: 'Michigan', noaaStateCode: 20 },
  { id: 'us-mn', name: 'Minnesota', noaaStateCode: 21 },
  { id: 'us-ms', name: 'Mississippi', noaaStateCode: 22 },
  { id: 'us-mo', name: 'Missouri', noaaStateCode: 23 },
  { id: 'us-mt', name: 'Montana', noaaStateCode: 24 },
  { id: 'us-ne', name: 'Nebraska', noaaStateCode: 25 },
  { id: 'us-nv', name: 'Nevada', noaaStateCode: 26 },
  { id: 'us-nh', name: 'New Hampshire', noaaStateCode: 27 },
  { id: 'us-nj', name: 'New Jersey', noaaStateCode: 28 },
  { id: 'us-nm', name: 'New Mexico', noaaStateCode: 29 },
  { id: 'us-ny', name: 'New York', noaaStateCode: 30 },
  { id: 'us-nc', name: 'North Carolina', noaaStateCode: 31 },
  { id: 'us-nd', name: 'North Dakota', noaaStateCode: 32 },
  { id: 'us-oh', name: 'Ohio', noaaStateCode: 33 },
  { id: 'us-ok', name: 'Oklahoma', noaaStateCode: 34 },
  { id: 'us-or', name: 'Oregon', noaaStateCode: 35 },
  { id: 'us-pa', name: 'Pennsylvania', noaaStateCode: 36 },
  { id: 'us-ri', name: 'Rhode Island', noaaStateCode: 37 },
  { id: 'us-sc', name: 'South Carolina', noaaStateCode: 38 },
  { id: 'us-sd', name: 'South Dakota', noaaStateCode: 39 },
  { id: 'us-tn', name: 'Tennessee', noaaStateCode: 40 },
  { id: 'us-tx', name: 'Texas', noaaStateCode: 41 },
  { id: 'us-ut', name: 'Utah', noaaStateCode: 42 },
  { id: 'us-vt', name: 'Vermont', noaaStateCode: 43 },
  { id: 'us-va', name: 'Virginia', noaaStateCode: 44 },
  { id: 'us-wa', name: 'Washington', noaaStateCode: 45 },
  { id: 'us-wv', name: 'West Virginia', noaaStateCode: 46 },
  { id: 'us-wi', name: 'Wisconsin', noaaStateCode: 47 },
  { id: 'us-wy', name: 'Wyoming', noaaStateCode: 48 },
  { id: 'us-ak', name: 'Alaska', noaaStateCode: 50 },
  { id: 'us-hi', name: 'Hawaii', noaaStateCode: 51 },
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

async function fetchStateParam(stateCode, param) {
  const url = `https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/statewide/time-series/${stateCode}/${param}/1/0/1950-2026.json`;
  const json = await fetchWithRetry(url, { label: `NOAA ${stateCode}/${param}`, timeoutMs: 90_000, attempts: 4 });
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

  const states = onlyList
    ? US_STATES.filter((s) => onlyList.includes(s.id))
    : US_STATES;

  console.log(`Processing ${states.length} states × ${NOAA_PARAMS.length} params (~${states.length * NOAA_PARAMS.length} NOAA requests)`);
  let ok = 0;
  let failed = 0;

  for (const state of states) {
    const outPath = resolve(OUTPUT_DIR, `${state.id}.json`);
    if (skipExisting && await fileExists(outPath)) {
      console.log(`  ⊙ ${state.id.padEnd(6)} ${state.name.padEnd(20)} skipped (already exists)`);
      continue;
    }

    try {
      const paramResults = {};
      for (const param of NOAA_PARAMS) {
        paramResults[param] = await fetchStateParam(state.noaaStateCode, param);
        // Be polite to NOAA between requests.
        await sleep(500);
      }

      const paramData = {};
      for (const param of NOAA_PARAMS) {
        const result = paramResults[param];
        if (!result) continue;
        const points = monthlyEntries(result.data);
        // Keep full monthlyAll for variables the SeasonalShiftCard can overlay
        // (temperature and precipitation). Drop for tmax/tmin to keep payload small.
        const keepMonthlyAll = ['tavg', 'pcp'].includes(param);

        paramData[param] = {
          label: PARAM_LABELS[param],
          units: result.units,
          yearly: buildYearlyFromNoaa(result.data, param),
          monthlyComparison: buildComparisonFromNoaa(result.data),
          latestMonthStats: buildLatestMonthStats(points),
          latestThreeMonthStats: buildLatestThreeMonthStats(points),
          ...(keepMonthlyAll ? { monthlyAll: points } : {}),
        };
      }

      const tavgPoints = monthlyEntries(paramResults.tavg?.data ?? {});
      const lastMonth = latestDataMonth(tavgPoints);

      const response = {
        state: state.name,
        id: state.id,
        paramData,
        lastUpdated: lastMonth,
        generatedAt: new Date().toISOString(),
      };

      await writeFile(outPath, JSON.stringify(response), 'utf8');
      ok++;
      console.log(`  ✓ ${state.id.padEnd(6)} ${state.name.padEnd(20)} latest ${lastMonth}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${state.id} (${state.name}): ${err?.message ?? err}`);
    }
  }

  console.log(`\nDone: ${ok} snapshots written, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
