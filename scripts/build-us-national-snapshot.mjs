#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build pre-computed US national (contiguous 48 states) climate
 * snapshot from NOAA Climate at a Glance national time series.
 *
 * Output: public/data/climate/us-national.json
 */

import { writeFile, mkdir } from 'node:fs/promises';
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
const OUT_PATH = resolve(__dirname, '..', 'public', 'data', 'climate', 'us-national.json');

const NOAA_PARAMS = ['tavg', 'tmax', 'tmin', 'pcp'];
const PARAM_LABELS = {
  tavg: 'Average Temperature',
  tmax: 'Maximum Temperature',
  tmin: 'Minimum Temperature',
  pcp: 'Precipitation',
};

const fahrenheitToCelsius = (f) => Math.round(((f - 32) * 5 / 9) * 100) / 100;
const inchesToMm = (inches) => Math.round(inches * 25.4 * 100) / 100;

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
      const v = param === 'pcp'
        ? round2(vals.reduce((a, b) => a + b, 0))
        : round2(vals.reduce((a, b) => a + b, 0) / vals.length);
      return { year: y, value: v };
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

async function fetchNationalParam(param) {
  const url = `https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/national/time-series/110/${param}/1/0/1950-2026.json`;
  const json = await fetchWithRetry(url, { label: `NOAA-national/${param}`, timeoutMs: 90_000 });
  return { data: parseNoaa(json, param), units: param === 'pcp' ? 'mm' : '°C' };
}

async function main() {
  console.log(`Build started ${new Date().toISOString()}`);
  await mkdir(dirname(OUT_PATH), { recursive: true });

  const paramResults = {};
  for (const param of NOAA_PARAMS) {
    paramResults[param] = await fetchNationalParam(param);
    await sleep(500);
  }

  const paramData = {};
  for (const param of NOAA_PARAMS) {
    const result = paramResults[param];
    const points = monthlyEntries(result.data);
    paramData[param] = {
      label: PARAM_LABELS[param],
      units: result.units,
      yearly: buildYearlyFromNoaa(result.data, param),
      monthlyComparison: buildComparisonFromNoaa(result.data),
      latestMonthStats: buildLatestMonthStats(points),
      latestThreeMonthStats: buildLatestThreeMonthStats(points),
      ...(['tavg', 'pcp'].includes(param) ? { monthlyAll: points } : {}),
    };
  }

  const tavgPoints = monthlyEntries(paramResults.tavg.data);
  const response = {
    state: 'United States',
    id: 'us-national',
    paramData,
    lastUpdated: latestDataMonth(tavgPoints),
    generatedAt: new Date().toISOString(),
  };

  await writeFile(OUT_PATH, JSON.stringify(response), 'utf8');
  console.log(`  ✓ us-national latest ${response.lastUpdated}`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
