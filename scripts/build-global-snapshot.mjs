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

// NOAA CPC ONI index (monthly 3-month-running SST anomaly in Niño 3.4)
const NOAA_ONI_URL = 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt';

// NOAA GML CO2 monthly Mauna Loa
const NOAA_CO2_URL = 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt';
// NOAA GML CH4 + N2O global means
const NOAA_CH4_URL = 'https://gml.noaa.gov/webdata/ccgg/trends/ch4/ch4_mm_gl.txt';
const NOAA_N2O_URL = 'https://gml.noaa.gov/webdata/ccgg/trends/n2o/n2o_mm_gl.txt';

// NSIDC sea-ice monthly extent (via global-warming.org aggregator — same source
// already used elsewhere on the site. Returns *global* sea-ice extent,
// anomaly vs 1991–2020, and the climatological monthly mean.)
const GLOBAL_SEA_ICE_URL = 'https://global-warming.org/api/arctic-api';

// NOAA continental / hemispheric anomalies (file-slug matches NOAA's own URL
// scheme: full region names, not ISO codes).
const NOAA_CONTINENTS = [
  { key: 'northernHemisphere', label: 'Northern Hemisphere', url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/nhem/land/1/0/1950-2026.json' },
  { key: 'southernHemisphere', label: 'Southern Hemisphere', url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/shem/land/1/0/1950-2026.json' },
  { key: 'europe', label: 'Europe', url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/europe/land/1/0/1950-2026.json' },
  { key: 'asia', label: 'Asia', url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/asia/land/1/0/1950-2026.json' },
  { key: 'africa', label: 'Africa', url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/africa/land/1/0/1950-2026.json' },
];

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

// Same retry logic but for plain-text endpoints (NOAA GML, NSIDC, CPC ONI)
async function fetchTextWithRetry(url, { attempts = 3, timeoutMs = 60_000, label } = {}) {
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
      const text = await res.text();
      console.log(`[${label}] ✓ ${Date.now() - started}ms`);
      return text;
    } catch (err) {
      lastErr = err;
      console.warn(`[${label}] attempt ${attempt} failed: ${err?.message ?? err}`);
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, 2_000 * attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error(`[${label}] all attempts failed`);
}

// Attempt a fetch but return null on failure — for optional data sources
async function tryFetchText(url, opts) {
  try { return await fetchTextWithRetry(url, opts); } catch (e) { console.warn(`⚠ [${opts?.label}] giving up: ${e?.message ?? e}`); return null; }
}
async function tryFetchJson(url, opts) {
  try { return await fetchWithRetry(url, opts); } catch (e) { console.warn(`⚠ [${opts?.label}] giving up: ${e?.message ?? e}`); return null; }
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
      absoluteTemp: baseline != null ? round2(baseline + anomaly) : null,
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
// ENSO (NOAA CPC Oceanic Niño Index)
// Columns: SEAS  YR  TOTAL  ANOM. 3-month overlapping seasons (DJF, JFM, FMA, …).
function parseOni(text) {
  if (!text) return null;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = lines.slice(1).map((l) => l.split(/\s+/)).filter((p) => p.length >= 4 && /^\d{4}$/.test(p[1]));
  if (!rows.length) return null;
  const parsed = rows
    .map((p) => ({ season: p[0], year: Number(p[1]), anom: Number(p[3]) }))
    .filter((p) => Number.isFinite(p.anom));
  if (!parsed.length) return null;
  const last = parsed[parsed.length - 1];
  // Single-season classification: ≥ +0.5°C warm, ≤ -0.5°C cool.
  let state = 'Neutral';
  if (last.anom >= 0.5) state = 'El Niño';
  else if (last.anom <= -0.5) state = 'La Niña';
  let strength = '';
  const a = Math.abs(last.anom);
  if (a >= 2.0) strength = 'very strong';
  else if (a >= 1.5) strength = 'strong';
  else if (a >= 1.0) strength = 'moderate';
  else if (a >= 0.5) strength = 'weak';
  return {
    state,
    strength,
    anomaly: round2(last.anom),
    season: last.season,
    seasonYear: last.year,
    history: parsed.slice(-36).map((p) => ({ season: p.season, year: p.year, anom: round2(p.anom) })),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// NOAA GML greenhouse gas files (CO2 / CH4 / N2O monthly)
// CO2 columns:  year  month  decimal  average  deseasonalized  #days  stdev  unc
// CH4/N2O cols: year  month  decimal  average  average_unc  trend  trend_unc
function parseGmlMonthly(text) {
  if (!text) return null;
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const rows = lines
    .map((l) => l.split(/\s+/).map(Number))
    .filter((cols) => cols.length >= 4 && Number.isFinite(cols[0]) && Number.isFinite(cols[1]) && Number.isFinite(cols[3]) && cols[3] > 0);
  if (!rows.length) return null;
  const monthly = rows.map((cols) => ({ year: cols[0], month: cols[1], value: cols[3] }));
  return monthly;
}

function buildGhgStats(monthly, label, unit, preindustrial) {
  if (!monthly?.length) return null;
  const latest = monthly[monthly.length - 1];
  // Year-ago for YoY
  const yearAgo = monthly.find((p) => p.year === latest.year - 1 && p.month === latest.month);
  const yoy = yearAgo ? round2(latest.value - yearAgo.value) : null;
  // Decade-ago for 10-yr change
  const decadeAgo = monthly.find((p) => p.year === latest.year - 10 && p.month === latest.month);
  const tenYr = decadeAgo ? round2(latest.value - decadeAgo.value) : null;
  // Simple monthly series trimmed to last 60 months for compact JSON
  const sparkline = monthly.slice(-60).map((p) => ({ year: p.year, month: p.month, value: Math.round(p.value * 100) / 100 }));
  const vsPreindustrial = preindustrial ? round2(((latest.value - preindustrial) / preindustrial) * 100) : null;
  return {
    label,
    unit,
    latest: { year: latest.year, month: latest.month, value: Math.round(latest.value * 100) / 100 },
    yoy,
    tenYr,
    preindustrial,
    vsPreindustrialPct: vsPreindustrial,
    sparkline,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Global sea-ice (Arctic + Antarctic combined) from global-warming.org aggregator.
// Response includes `value` (extent, Mkm²), `anom` (anomaly vs 1991–2020) and
// `monthlyMean` (climatological mean for that calendar month).
function parseGlobalSeaIce(json) {
  if (!json?.arcticData?.data) return null;
  const data = json.arcticData.data;
  const monthly = Object.entries(data)
    .map(([key, v]) => ({
      year: Number(key.substring(0, 4)),
      month: Number(key.substring(4, 6)),
      extent: Number(v.value),
      climatology: Number(v.monthlyMean),
      anomaly: Number(v.anom),
    }))
    .filter((p) => Number.isFinite(p.extent) && p.extent > 0)
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));
  if (!monthly.length) return null;
  const latest = monthly[monthly.length - 1];
  const sameMonth = monthly.filter((p) => p.month === latest.month);
  const ranked = [...sameMonth].sort((a, b) => a.extent - b.extent);
  const rankLow = ranked.findIndex((p) => p.year === latest.year && p.month === latest.month) + 1;
  const anomalyPct = latest.climatology ? round2((latest.anomaly / latest.climatology) * 100) : null;
  return {
    label: 'Global sea ice (Arctic + Antarctic)',
    baseline: '1991–2020',
    unit: 'million km²',
    latest: { year: latest.year, month: latest.month, extent: round2(latest.extent) },
    climatology: round2(latest.climatology),
    anomaly: round2(latest.anomaly),
    anomalyPct,
    rankLowestOfSameMonth: rankLow,
    totalYearsInMonth: sameMonth.length,
    recent60: monthly.slice(-60).map((p) => ({ year: p.year, month: p.month, extent: Math.round(p.extent * 100) / 100 })),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Continental anomalies — reuse parseNoaa from the existing builder
// (defined earlier in the file) and return a compact ranking block.

function buildContinentStats(parsedMonthly, label, key) {
  if (!parsedMonthly?.length) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = parsedMonthly.filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth));
  if (!filtered.length) return null;
  const latest = filtered[filtered.length - 1];
  const comparable = filtered.filter((p) => p.month === latest.month);
  // NOAA continental files are anomaly-only (no true absolute baseline available here),
  // so rank by anomaly. Higher anomaly = warmer relative to this continent's own climatology.
  const ranked = [...comparable].sort((a, b) => b.anomaly - a.anomaly);
  const rank = ranked.findIndex((p) => p.year === latest.year && p.month === latest.month) + 1;
  return {
    key,
    label,
    latestMonth: { year: latest.year, month: latest.month, anomaly: round2(latest.anomaly) },
    rank,
    total: ranked.length,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Country anomalies — read per-country snapshots already on disk and extract
// each country's latest-month anomaly so the /climate/global map stays in
// sync with the individual country pages.
async function buildCountryAnomalies() {
  const { readdir, readFile } = await import('node:fs/promises');
  const { resolve: pathResolve } = await import('node:path');
  const dir = pathResolve(process.cwd(), 'public', 'data', 'climate', 'country');
  let files = [];
  try { files = await readdir(dir); } catch { return []; }
  const results = [];
  for (const name of files) {
    if (!name.endsWith('.json')) continue;
    try {
      const raw = await readFile(pathResolve(dir, name), 'utf8');
      const snap = JSON.parse(raw);
      const iso3 = snap.code || name.replace(/\.json$/, '');
      const country = snap.country || iso3;
      const latest = snap.latestMonthStats;
      if (!latest || !Number.isFinite(latest.diff)) continue;
      results.push({
        iso3,
        name: country,
        anomaly: Math.round(latest.diff * 100) / 100,
        value: Math.round(latest.value * 100) / 100,
        monthLabel: latest.label,
        rank: latest.rank,
        total: latest.total,
      });
    } catch {
      // skip unreadable file
    }
  }
  return results;
}

// ───────────────────────────────────────────────────────────────────────────
// Main

async function main() {
  const now = new Date();
  console.log(`Build started at ${now.toISOString()}`);

  // Fetch all sources in parallel. OWID gets a generous timeout because its
  // response is ~10MB. The three NOAA series are small.
  // Optional sources (ENSO, GHG, sea-ice, continents) are wrapped in tryFetch
  // so a single upstream outage doesn't break the headline build.
  const continentPromises = NOAA_CONTINENTS.map((c) =>
    tryFetchJson(c.url, { label: `NOAA ${c.label}`, timeoutMs: 60_000, attempts: 3 })
  );
  const [
    noaaLoJson, noaaLandJson, noaaOceanJson, owidJson,
    oniText, co2Text, ch4Text, n2oText,
    globalIceJson, _unused,
    ...continentJsons
  ] = await Promise.all([
    fetchWithRetry(NOAA_LAND_OCEAN_URL, { label: 'NOAA land+ocean', timeoutMs: 60_000, attempts: 4 }),
    fetchWithRetry(NOAA_LAND_URL, { label: 'NOAA land', timeoutMs: 60_000, attempts: 4 }),
    fetchWithRetry(NOAA_OCEAN_URL, { label: 'NOAA ocean', timeoutMs: 60_000, attempts: 4 }),
    fetchWithRetry(OWID_URL, { label: 'OWID', timeoutMs: 180_000, attempts: 4 }),
    tryFetchText(NOAA_ONI_URL, { label: 'NOAA ONI (ENSO)', timeoutMs: 30_000, attempts: 3 }),
    tryFetchText(NOAA_CO2_URL, { label: 'NOAA GML CO2', timeoutMs: 30_000, attempts: 3 }),
    tryFetchText(NOAA_CH4_URL, { label: 'NOAA GML CH4', timeoutMs: 30_000, attempts: 3 }),
    tryFetchText(NOAA_N2O_URL, { label: 'NOAA GML N2O', timeoutMs: 30_000, attempts: 3 }),
    tryFetchJson(GLOBAL_SEA_ICE_URL, { label: 'Global sea ice', timeoutMs: 30_000, attempts: 3 }),
    null,
    ...continentPromises,
  ]);

  const noaaMonthly = parseNoaa(noaaLoJson, GLOBAL_BASELINE);
  const noaaLandMonthly = parseNoaa(noaaLandJson, GLOBAL_BASELINE);
  const noaaOceanMonthly = parseNoaa(noaaOceanJson, GLOBAL_BASELINE);
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

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v9`;

  // Build "previous month" snapshot for the what-changed-since-last-month diff.
  // We do this by re-running the same stats builders but against the month
  // prior to the current reference time.
  const lastMonthRef = new Date(now);
  lastMonthRef.setMonth(lastMonthRef.getMonth() - 1);
  const previousLatestMonthStats = {
    landOcean: buildLatestMonthStats(toStatPoints(noaaMonthly), lastMonthRef),
    land: buildLatestMonthStats(toStatPoints(noaaLandMonthly), lastMonthRef),
    ocean: buildLatestMonthStats(toStatPoints(noaaOceanMonthly), lastMonthRef),
  };

  // Build ENSO, GHG, ice, continents blocks. Each is nullable.
  const enso = parseOni(oniText);
  const co2Monthly = parseGmlMonthly(co2Text);
  const ch4Monthly = parseGmlMonthly(ch4Text);
  const n2oMonthly = parseGmlMonthly(n2oText);
  const arcticMonthly = null;
  const antarcticMonthly = null;
  void arcticMonthly; void antarcticMonthly; // legacy — now using combined global series

  const ghgStats = {
    co2: buildGhgStats(co2Monthly, 'Carbon dioxide', 'ppm', 280),
    ch4: buildGhgStats(ch4Monthly, 'Methane', 'ppb', 722),
    n2o: buildGhgStats(n2oMonthly, 'Nitrous oxide', 'ppb', 270),
  };
  const seaIceStats = parseGlobalSeaIce(globalIceJson);
  const continentStats = continentJsons
    .map((json, i) => {
      if (!json) return null;
      const parsed = parseNoaa(json, null);
      return buildContinentStats(parsed, NOAA_CONTINENTS[i].label, NOAA_CONTINENTS[i].key);
    })
    .filter(Boolean);

  console.log(`ENSO state: ${enso ? `${enso.state} (${enso.anomaly}°C, ${enso.season} ${enso.seasonYear})` : '⚠ unavailable'}`);
  console.log(`GHG — CO2 latest: ${ghgStats.co2?.latest.value ?? '—'}ppm, CH4: ${ghgStats.ch4?.latest.value ?? '—'}ppb, N2O: ${ghgStats.n2o?.latest.value ?? '—'}ppb`);
  console.log(`Sea ice — ${seaIceStats ? `${seaIceStats.latest.extent}Mkm² (${seaIceStats.latest.year}-${String(seaIceStats.latest.month).padStart(2,'0')}, ${seaIceStats.anomaly > 0 ? '+' : ''}${seaIceStats.anomaly} vs 1991–2020)` : '⚠ unavailable'}`);
  console.log(`Continents parsed: ${continentStats.length}/${NOAA_CONTINENTS.length}`);

  // Country-level anomalies — gathered from the already-built per-country
  // snapshots so the world map is always in sync with the country pages.
  const countryAnomalies = await buildCountryAnomalies();
  console.log(`Country anomalies: ${countryAnomalies.length} countries`);

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
    previousLatestMonthStats,
    enso,
    ghgStats,
    seaIceStats,
    continentStats,
    countryAnomalies,
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
      {
        label: 'NOAA CPC — Oceanic Niño Index (ONI)',
        url: 'https://origin.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php',
      },
      {
        label: 'NOAA GML — Mauna Loa CO₂ monthly',
        url: 'https://gml.noaa.gov/ccgg/trends/data.html',
      },
      {
        label: 'NOAA GML — Global CH₄ and N₂O monthly means',
        url: 'https://gml.noaa.gov/ccgg/trends_ch4/',
      },
      {
        label: 'NSIDC — Monthly sea-ice extent (Arctic + Antarctic)',
        url: 'https://nsidc.org/data/seaice_index',
      },
      {
        label: 'NOAA Climate at a Glance — Continental land temperatures',
        url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global',
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
