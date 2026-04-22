#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build a fully pre-computed snapshot of global climate history.
 *
 * Sources:
 *   - NOAA Climate at a Glance (global land+ocean anomalies, monthly)
 *   - Our World in Data / ERA5 (global land surface temperature, monthly)
 *
 * Output:
 *   public/data/climate/global-history.json
 *
 * Run manually:
 *   node scripts/build-global-snapshot.mjs
 *
 * Intended to be re-run monthly via GitHub Action so the committed
 * snapshot stays current without any runtime API calls.
 *
 * The output is the SAME shape as the old /api/climate/global response
 * so the API route can serve it verbatim and the client doesn't change.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'public', 'data', 'climate', 'global-history.json');

const GLOBAL_BASELINE = 13.9; // NOAA 20th-century mean global land+ocean (°C)
const GLOBAL_LAND_BASELINE = 8.6; // NOAA 20th-century mean global land only (°C)
const GLOBAL_OCEAN_BASELINE = 16.1; // NOAA 20th-century mean global ocean only (°C)
const PRE_INDUSTRIAL_BASELINE = 13.5; // ~1850–1900 reference (NOAA land+ocean)
const OWID_WORLD_ENTITY = 355;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const NOAA_LAND_OCEAN_URL = 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/1/0/1950-2026.json';
const NOAA_LAND_URL = 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land/1/0/1950-2026.json';
const NOAA_OCEAN_URL = 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/ocean/1/0/1950-2026.json';
const OWID_URL = 'https://api.ourworldindata.org/v1/indicators/1005195.data.json';

// ───────────────────────────────────────────────────────────────────────────
// Fetch helpers with retry + long timeout

async function fetchWithRetry(url, { attempts = 4, timeoutMs = 120_000, label } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log(`[${label}] attempt ${attempt}/${attempts} → ${url}`);
      const started = Date.now();
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': '4billionyearson-climate-snapshot/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log(`[${label}] ✓ ${Date.now() - started}ms`);
      return json;
    } catch (err) {
      lastErr = err;
      console.warn(`[${label}] attempt ${attempt} failed: ${err?.message ?? err}`);
      if (attempt < attempts) {
        const backoff = 2_000 * attempt;
        await new Promise((r) => setTimeout(r, backoff));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error(`[${label}] all attempts failed`);
}

// ───────────────────────────────────────────────────────────────────────────
// Stats builders (ported from the runtime route so behaviour stays identical)

const round2 = (v) => Math.round(v * 100) / 100;

function buildLatestMonthStats(points, now) {
  if (!points.length) return null;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = points.filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth));
  if (!filtered.length) return null;
  const latest = filtered[filtered.length - 1];
  const comparable = filtered.filter((p) => p.month === latest.month);
  const baseline = comparable.filter((p) => p.year >= 1961 && p.year <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((s, p) => s + p.temp, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => b.temp - a.temp);
  const rank = ranked.findIndex((p) => p.year === latest.year && p.month === latest.month) + 1;
  const record = ranked[0];
  return {
    label: `${MONTH_NAMES[latest.month - 1]} ${latest.year}`,
    value: latest.temp,
    diff: baselineAvg === null ? null : round2(latest.temp - baselineAvg),
    rank,
    total: ranked.length,
    recordLabel: `${MONTH_NAMES[record.month - 1]} ${record.year}`,
    recordValue: record.temp,
  };
}

function buildLatestThreeMonthStats(points, now) {
  if (points.length < 3) return null;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = points.filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth));
  if (filtered.length < 3) return null;
  const windows = [];
  for (let i = 2; i < filtered.length; i++) {
    const a = filtered[i - 2];
    const b = filtered[i - 1];
    const c = filtered[i];
    const contiguous = (a.year * 12 + a.month + 1 === b.year * 12 + b.month)
      && (b.year * 12 + b.month + 1 === c.year * 12 + c.month);
    if (!contiguous) continue;
    windows.push({
      endMonth: c.month,
      endYear: c.year,
      label: `${MONTH_NAMES[a.month - 1]}–${MONTH_NAMES[c.month - 1]} ${c.year}`,
      value: round2((a.temp + b.temp + c.temp) / 3),
    });
  }
  if (!windows.length) return null;
  const latest = windows[windows.length - 1];
  const comparable = windows.filter((w) => w.endMonth === latest.endMonth);
  const baseline = comparable.filter((w) => w.endYear >= 1961 && w.endYear <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((s, w) => s + w.value, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => b.value - a.value);
  const rank = ranked.findIndex((w) => w.label === latest.label) + 1;
  const record = ranked[0];
  return {
    label: latest.label,
    value: latest.value,
    diff: baselineAvg === null ? null : round2(latest.value - baselineAvg),
    rank,
    total: ranked.length,
    recordLabel: record.label,
    recordValue: record.value,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// NOAA → monthly land+ocean

function parseNoaa(json, baseline) {
  const monthly = [];
  for (const [key, val] of Object.entries(json.data)) {
    const year = parseInt(key.substring(0, 4), 10);
    const month = parseInt(key.substring(4, 6), 10);
    const anomaly = parseFloat(val.anomaly ?? val.value);
    if (Number.isNaN(anomaly)) continue;
    monthly.push({
      date: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      anomaly: round2(anomaly),
      absoluteTemp: round2(baseline + anomaly),
    });
  }
  monthly.sort((a, b) => a.date.localeCompare(b.date));
  return monthly;
}

// ───────────────────────────────────────────────────────────────────────────
// OWID → monthly land

function parseOwid(owidData, now) {
  const epoch = new Date(1950, 0, 1);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthly = [];
  for (let i = 0; i < owidData.years.length; i++) {
    if (owidData.entities[i] !== OWID_WORLD_ENTITY) continue;
    const d = new Date(epoch.getTime() + owidData.years[i] * 86_400_000);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    // Skip current month (incomplete) and future
    if (year > currentYear || (year === currentYear && month >= currentMonth)) continue;
    monthly.push({
      date: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      temp: round2(owidData.values[i]),
    });
  }
  monthly.sort((a, b) => a.date.localeCompare(b.date));
  return monthly;
}

// ───────────────────────────────────────────────────────────────────────────
// Derived series (yearly, rolling, monthly comparison, land-vs-ocean)

function buildYearlyNoaa(monthly) {
  const byYear = {};
  for (const p of monthly) {
    if (!byYear[p.year]) byYear[p.year] = { anomalies: [], temps: [] };
    byYear[p.year].anomalies.push(p.anomaly);
    byYear[p.year].temps.push(p.absoluteTemp);
  }
  const yearly = Object.keys(byYear).map(Number).sort((a, b) => a - b)
    .filter((y) => byYear[y].anomalies.length >= 6)
    .map((y) => {
      const anomalies = byYear[y].anomalies;
      const temps = byYear[y].temps;
      return {
        year: y,
        anomaly: round2(anomalies.reduce((a, b) => a + b, 0) / anomalies.length),
        absoluteTemp: round2(temps.reduce((a, b) => a + b, 0) / temps.length),
      };
    });
  for (let i = 0; i < yearly.length; i++) {
    if (i >= 9) {
      const slice = yearly.slice(i - 9, i + 1);
      yearly[i].rollingAvg = round2(slice.reduce((a, b) => a + b.absoluteTemp, 0) / slice.length);
    }
  }
  return yearly;
}

function buildYearlyLand(monthly, now) {
  const currentYear = now.getFullYear();
  const byYear = {};
  for (const p of monthly) {
    if (!byYear[p.year]) byYear[p.year] = [];
    byYear[p.year].push(p.temp);
  }
  const yearly = Object.keys(byYear).map(Number).sort((a, b) => a - b)
    .filter((y) => y < currentYear && byYear[y].length >= 6)
    .map((y) => {
      const temps = byYear[y];
      return { year: y, avgTemp: round2(temps.reduce((a, b) => a + b, 0) / temps.length) };
    });
  for (let i = 0; i < yearly.length; i++) {
    if (i >= 9) {
      const slice = yearly.slice(i - 9, i + 1);
      yearly[i].rollingAvg = round2(slice.reduce((a, b) => a + b.avgTemp, 0) / slice.length);
    }
  }
  return yearly;
}

function buildMonthlyComparison(monthly, tempKey, now) {
  const historicByMonth = {};
  for (const p of monthly) {
    if (p.year >= 1961 && p.year <= 1990) {
      if (!historicByMonth[p.month]) historicByMonth[p.month] = [];
      historicByMonth[p.month].push(p[tempKey]);
    }
  }
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const recent12 = [];
  for (let i = 1; i <= 12; i++) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) { m += 12; y--; }
    const point = monthly.find((p) => p.year === y && p.month === m);
    recent12.unshift({ month: m, year: y, temp: point ? point[tempKey] : null });
  }
  return recent12.map(({ month, year, temp }) => {
    const historic = historicByMonth[month];
    const historicAvg = historic && historic.length > 0
      ? round2(historic.reduce((a, b) => a + b, 0) / historic.length)
      : null;
    const diff = temp !== null && historicAvg !== null ? round2(temp - historicAvg) : null;
    return {
      monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      month,
      year,
      recentTemp: temp,
      historicAvg,
      diff,
    };
  });
}

function buildLandVsOcean(landMonthly, noaaMonthly, now) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const out = [];
  for (let i = 12; i >= 1; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) { m += 12; y--; }
    const landPt = landMonthly.find((p) => p.year === y && p.month === m);
    const noaaPt = noaaMonthly.find((p) => p.year === y && p.month === m);
    out.push({
      monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
      landTemp: landPt?.temp ?? null,
      landOceanTemp: noaaPt?.absoluteTemp ?? null,
    });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Main

async function main() {
  const now = new Date();
  console.log(`Build started at ${now.toISOString()}`);

  // Fetch all sources in parallel. OWID gets a generous timeout because its
  // response is ~10MB. The three NOAA series are small.
  const [noaaLoJson, noaaLandJson, noaaOceanJson, owidJson] = await Promise.all([
    fetchWithRetry(NOAA_LAND_OCEAN_URL, { label: 'NOAA land+ocean', timeoutMs: 60_000, attempts: 4 }),
    fetchWithRetry(NOAA_LAND_URL, { label: 'NOAA land', timeoutMs: 60_000, attempts: 4 }),
    fetchWithRetry(NOAA_OCEAN_URL, { label: 'NOAA ocean', timeoutMs: 60_000, attempts: 4 }),
    fetchWithRetry(OWID_URL, { label: 'OWID', timeoutMs: 180_000, attempts: 4 }),
  ]);

  const noaaMonthly = parseNoaa(noaaLoJson, GLOBAL_BASELINE);
  const noaaLandMonthly = parseNoaa(noaaLandJson, GLOBAL_LAND_BASELINE);
  const noaaOceanMonthly = parseNoaa(noaaOceanJson, GLOBAL_OCEAN_BASELINE);
  const landMonthly = parseOwid(owidJson, now);
  console.log(`NOAA land+ocean monthly points: ${noaaMonthly.length}`);
  console.log(`NOAA land-only monthly points:  ${noaaLandMonthly.length}`);
  console.log(`NOAA ocean-only monthly points: ${noaaOceanMonthly.length}`);
  console.log(`OWID/ERA5 land monthly points:  ${landMonthly.length}`);

  if (!noaaMonthly.length) throw new Error('NOAA land+ocean parse yielded zero points');
  if (!landMonthly.length) console.warn('⚠ OWID parse yielded zero points — continuing with NOAA only');

  const yearlyData = buildYearlyNoaa(noaaMonthly);
  const monthlyComparison = buildMonthlyComparison(noaaMonthly, 'absoluteTemp', now);

  const landYearlyData = landMonthly.length ? buildYearlyLand(landMonthly, now) : null;
  const landMonthlyComparison = landMonthly.length ? buildMonthlyComparison(landMonthly, 'temp', now) : null;
  const landVsOceanMonthly = landMonthly.length ? buildLandVsOcean(landMonthly, noaaMonthly, now) : null;

  const landPointsForStats = landMonthly.map((p) => ({ year: p.year, month: p.month, temp: p.temp }));

  // NOAA per-series ranked stats — same shape as `landLatestMonthStats`
  // so the UI can render Land / Ocean / Land+Ocean rows identically.
  // Ranking uses the absolute temp (equivalent to ranking by anomaly).
  const toStatPoints = (arr) => arr.map((p) => ({ year: p.year, month: p.month, temp: p.absoluteTemp }));
  const noaaStats = {
    landOcean: {
      yearly: buildYearlyNoaa(noaaMonthly).map((y) => ({ year: y.year, avgTemp: y.absoluteTemp, rollingAvg: y.rollingAvg })),
      latestMonthStats: buildLatestMonthStats(toStatPoints(noaaMonthly), now),
      latestThreeMonthStats: buildLatestThreeMonthStats(toStatPoints(noaaMonthly), now),
    },
    land: {
      yearly: buildYearlyNoaa(noaaLandMonthly).map((y) => ({ year: y.year, avgTemp: y.absoluteTemp, rollingAvg: y.rollingAvg })),
      latestMonthStats: buildLatestMonthStats(toStatPoints(noaaLandMonthly), now),
      latestThreeMonthStats: buildLatestThreeMonthStats(toStatPoints(noaaLandMonthly), now),
    },
    ocean: {
      yearly: buildYearlyNoaa(noaaOceanMonthly).map((y) => ({ year: y.year, avgTemp: y.absoluteTemp, rollingAvg: y.rollingAvg })),
      latestMonthStats: buildLatestMonthStats(toStatPoints(noaaOceanMonthly), now),
      latestThreeMonthStats: buildLatestThreeMonthStats(toStatPoints(noaaOceanMonthly), now),
    },
  };

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v8`;

  const result = {
    yearlyData,
    monthlyComparison,
    landYearlyData,
    landMonthlyComparison,
    landMonthlyAll: landMonthly.map((p) => ({ year: p.year, month: p.month, value: p.temp })),
    landOceanMonthlyAll: noaaMonthly.map((p) => ({ year: p.year, month: p.month, value: p.absoluteTemp })),
    landLatestMonthStats: landMonthly.length ? buildLatestMonthStats(landPointsForStats, now) : null,
    landLatestThreeMonthStats: landMonthly.length ? buildLatestThreeMonthStats(landPointsForStats, now) : null,
    landVsOceanMonthly,
    noaaStats,
    globalBaseline: GLOBAL_BASELINE,
    globalLandBaseline: GLOBAL_LAND_BASELINE,
    globalOceanBaseline: GLOBAL_OCEAN_BASELINE,
    preIndustrialBaseline: PRE_INDUSTRIAL_BASELINE,
    keyThresholds: {
      plus1_5: PRE_INDUSTRIAL_BASELINE + 1.5,
      plus2_0: PRE_INDUSTRIAL_BASELINE + 2.0,
    },
    lastUpdated: currentMonthKey,
    generatedAt: now.toISOString(),
    sources: [
      {
        label: 'NOAA Climate at a Glance — Global Land+Ocean',
        url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global',
      },
      {
        label: 'NOAA Climate at a Glance — Global Land',
        url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global',
      },
      {
        label: 'NOAA Climate at a Glance — Global Ocean',
        url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global',
      },
      {
        label: 'Our World in Data / ERA5 — Global Land Surface Temperature',
        url: 'https://ourworldindata.org/grapher/monthly-average-surface-temperatures-by-year',
      },
    ],
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');
  const latestYear = yearlyData[yearlyData.length - 1]?.year;
  const latestLandMonth = landMonthly[landMonthly.length - 1];
  console.log(`✓ Wrote ${OUTPUT_PATH}`);
  console.log(`  NOAA last year: ${latestYear}`);
  if (latestLandMonth) console.log(`  OWID last month: ${MONTH_NAMES[latestLandMonth.month - 1]} ${latestLandMonth.year}`);
  console.log(`  cache key: ${currentMonthKey}`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
