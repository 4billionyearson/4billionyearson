#!/usr/bin/env node
/**
 * Build per-region temperature & rainfall anomalies (annual, 1950–present)
 * for the ENSO Impact Tracker on /climate/enso.
 *
 * Output: public/data/climate/enso-impact.json
 *
 * Structure:
 * {
 *   baseline: [1961, 1990],
 *   years: [1950, 1951, ..., 2025],
 *   temp:   { country: { GBR: [Δ°C, Δ°C, ...], ... }, usState: {...}, ukRegion: {...} },
 *   precip: { country: { GBR: [Δ%,  Δ%,  ...], ... }, usState: {...}, ukRegion: {...} }
 * }
 *
 * Anomaly definition (locked by feature spec):
 *  - Temperature: annual mean (Jan–Dec) minus 1961–1990 annual mean, in °C.
 *  - Rainfall:    annual total minus 1961–1990 annual total, expressed as
 *                 a percentage of the baseline total. (Always defined.)
 *
 * Years with < 12 valid monthly values are skipped (set to null in the array).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/data/climate/enso-impact.json');

const BASELINE_FROM = 1961;
const BASELINE_TO = 1990;
const YEAR_FROM = 1950;
const YEAR_TO = new Date().getFullYear();
const YEARS = [];
for (let y = YEAR_FROM; y <= YEAR_TO; y++) YEARS.push(y);
const yearIdx = new Map(YEARS.map((y, i) => [y, i]));

/** Snapshot country name → world-countries.json `properties.name` value.
 *  Most snapshots match by exact name; this list patches the ~10 that don't. */
const NAME_TO_GEO = {
  'United States': 'United States of America',
  'DR Congo': 'Democratic Republic of the Congo',
  'Cote d\'Ivoire': 'Ivory Coast',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'Central African Republic': 'Central African Rep.',
  'Dominican Republic': 'Dominican Rep.',
  'Equatorial Guinea': 'Eq. Guinea',
  'Solomon Islands': 'Solomon Is.',
  'South Sudan': 'S. Sudan',
  'East Timor': 'Timor-Leste',
};

/** Aggregate a `monthlyAll` array into annual values for a chosen window.
 *  Returns Map<year, value>.
 *
 *  Window can be either:
 *   - 'annual'   → Jan–Dec, requires 12 finite values; or
 *   - one of the 12 standard 3-month overlapping windows used in NOAA CPC
 *     composites: DJF, JFM, FMA, MAM, AMJ, MJJ, JJA, JAS, ASO, SON, OND, NDJ.
 *     Each one is the average/sum of its three months. Wraparound windows
 *     (DJF, NDJ) attribute the value to the CALENDAR YEAR OF THE LATE
 *     MONTH — i.e. DJF(1998) means Dec 1997 + Jan 1998 + Feb 1998, which
 *     is the canonical NOAA convention.
 *
 *  - kind='mean' → average of the months (for °C)
 *  - kind='sum'  → sum of the months    (for mm)
 */
const SEASON_MONTHS = {
  DJF: [12, 1, 2], JFM: [1, 2, 3], FMA: [2, 3, 4],   MAM: [3, 4, 5],
  AMJ: [4, 5, 6], MJJ: [5, 6, 7], JJA: [6, 7, 8],   JAS: [7, 8, 9],
  ASO: [8, 9, 10], SON: [9, 10, 11], OND: [10, 11, 12], NDJ: [11, 12, 1],
};
// Windows whose first month is in the previous calendar year.
const WRAP_PREV = new Set(['DJF', 'NDJ']);

function toAnnual(monthlyAll, kind, window = 'annual') {
  if (!Array.isArray(monthlyAll)) return new Map();
  const months = window === 'annual' ? null : SEASON_MONTHS[window];
  if (window !== 'annual' && !months) return new Map();
  const required = window === 'annual' ? 12 : 3;
  // For a wraparound window, attribute the late-year value (e.g. DJF 1998
  // = Dec 1997 + Jan/Feb 1998 → attribute to 1998). Build a lookup keyed
  // by (effectiveYear, month) so the wraparound is handled cleanly.
  const byYear = new Map();
  for (const row of monthlyAll) {
    if (!row || typeof row.value !== 'number' || !Number.isFinite(row.value)) continue;
    if (typeof row.year !== 'number' || typeof row.month !== 'number') continue;
    let effectiveYear = row.year;
    if (window !== 'annual') {
      if (!months.includes(row.month)) continue;
      // For DJF: Dec belongs to next year's window. NDJ: Nov+Dec belong to
      // next year's window (since the window is centred on Dec, attributed
      // to the late month's year by convention).
      if (window === 'DJF' && row.month === 12) effectiveYear = row.year + 1;
      if (window === 'NDJ' && (row.month === 11 || row.month === 12)) effectiveYear = row.year + 1;
    }
    const arr = byYear.get(effectiveYear) ?? [];
    arr.push(row.value);
    byYear.set(effectiveYear, arr);
  }
  const out = new Map();
  for (const [y, arr] of byYear) {
    if (arr.length < required) continue;
    if (kind === 'sum') {
      out.set(y, arr.reduce((a, b) => a + b, 0));
    } else {
      out.set(y, arr.reduce((a, b) => a + b, 0) / arr.length);
    }
  }
  return out;
}

// Lag (in years) applied at runtime when correlating each window with ONI.
// The pairing is window-year minus lag. Lags chosen so each season is paired
// with the *contemporary or preceding* ENSO peak that drives it:
//   - Windows in or immediately around the DJF peak       → lag 0
//   - Windows in the post-peak spring/early-summer decay  → lag 0 (same
//     calendar year as the peak since we attribute DJF to the late year)
//   - Windows in the year *before* the next DJF (JJA → NDJ) are pairing with
//     a developing/peaking event, so they remain lag 0 — the ONI for that
//     same calendar year captures the event onset.
// In practice, with the DJF-attributed-to-late-year convention above, every
// window can use lag 0 against same-year peak ONI. We still emit the map so
// the runtime documents the choice.
const SEASON_LAG = Object.fromEntries(Object.keys(SEASON_MONTHS).map((k) => [k, 0]));
SEASON_LAG.annual = 0;

/** Compute baseline mean of an annual Map across [BASELINE_FROM..BASELINE_TO].
 *  Returns null if fewer than 20 baseline years are present (too sparse). */
function baselineMean(annualMap) {
  let n = 0;
  let s = 0;
  for (let y = BASELINE_FROM; y <= BASELINE_TO; y++) {
    const v = annualMap.get(y);
    if (typeof v === 'number' && Number.isFinite(v)) {
      s += v;
      n++;
    }
  }
  if (n < 20) return null;
  return s / n;
}

/** Build a year-aligned anomaly array (length = YEARS.length).
 *  kind: 'temp' → absolute °C delta; 'precip' → % of baseline. */
function toAnomalyArray(annualMap, kind) {
  const base = baselineMean(annualMap);
  if (base === null) return null;
  const arr = new Array(YEARS.length).fill(null);
  for (const [y, v] of annualMap) {
    const i = yearIdx.get(y);
    if (i === undefined) continue;
    if (kind === 'precip') {
      if (base <= 0) continue;
      arr[i] = +(((v - base) / base) * 100).toFixed(1);
    } else {
      arr[i] = +(v - base).toFixed(2);
    }
  }
  return arr;
}

/** All windows we emit. Annual first, then 12 overlapping 3-month windows
 *  in calendar order so a season slider can sweep through them. */
const ALL_WINDOWS = ['annual', 'DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'];

/** Build a {window: {iso3: anomalyArray}} object from a monthlyAll series.
 *  kind controls the aggregation (mean for temp, sum for precip). */
function buildAllWindows(monthlyAll, kind, anomKind) {
  const out = {};
  for (const w of ALL_WINDOWS) {
    const arr = toAnomalyArray(toAnnual(monthlyAll, kind, w), anomKind);
    if (arr) out[w] = arr;
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  COUNTRIES — public/data/climate/country/{ISO3}.json (monthlyAll)
 *  and       public/data/climate/country-precip/{ISO3}.json (monthlyAll)
 * ───────────────────────────────────────────────────────────────────────── */
async function buildCountries() {
  const tempDir = path.join(ROOT, 'public/data/climate/country');
  const precipDir = path.join(ROOT, 'public/data/climate/country-precip');
  const tempFiles = await fs.readdir(tempDir).catch(() => []);
  const precipFiles = await fs.readdir(precipDir).catch(() => []);
  // temp[window][iso3] = anomaly array; precip[window][iso3] = anomaly array
  const temp = Object.fromEntries(ALL_WINDOWS.map((w) => [w, {}]));
  const precip = Object.fromEntries(ALL_WINDOWS.map((w) => [w, {}]));
  const names = {};
  for (const f of tempFiles) {
    if (!f.endsWith('.json')) continue;
    const iso3 = f.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(await fs.readFile(path.join(tempDir, f), 'utf8'));
      const byW = buildAllWindows(j.monthlyAll, 'mean', 'temp');
      for (const [w, arr] of Object.entries(byW)) temp[w][iso3] = arr;
      // Map ISO3 → name as it appears in public/data/world-countries.json so
      // the runtime can do straight feature-name lookups without a fuzzy match.
      if (j.country) names[iso3] = NAME_TO_GEO[j.country] || j.country;
    } catch { /* skip bad file */ }
  }
  for (const f of precipFiles) {
    if (!f.endsWith('.json')) continue;
    const iso3 = f.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(await fs.readFile(path.join(precipDir, f), 'utf8'));
      const byW = buildAllWindows(j.monthlyAll, 'sum', 'precip');
      for (const [w, arr] of Object.entries(byW)) precip[w][iso3] = arr;
    } catch { /* skip bad file */ }
  }
  return { temp, precip, names };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  US STATES — paramData.tavg.monthlyAll (°C) and paramData.pcp.monthlyAll
 *  Slug = filename stem (e.g. us-ca).
 * ───────────────────────────────────────────────────────────────────────── */
async function buildUsStates() {
  const dir = path.join(ROOT, 'public/data/climate/us-state');
  const files = await fs.readdir(dir).catch(() => []);
  const temp = Object.fromEntries(ALL_WINDOWS.map((w) => [w, {}]));
  const precip = Object.fromEntries(ALL_WINDOWS.map((w) => [w, {}]));
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const slug = f.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
      const tavg = j.paramData?.tavg?.monthlyAll;
      const pcp = j.paramData?.pcp?.monthlyAll;
      if (tavg) {
        const byW = buildAllWindows(tavg, 'mean', 'temp');
        for (const [w, arr] of Object.entries(byW)) temp[w][slug] = arr;
      }
      if (pcp) {
        const byW = buildAllWindows(pcp, 'sum', 'precip');
        for (const [w, arr] of Object.entries(byW)) precip[w][slug] = arr;
      }
    } catch { /* skip */ }
  }
  return { temp, precip };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  UK REGIONS — varData.Tmean.monthlyAll (°C) and varData.Rainfall.monthlyAll
 * ───────────────────────────────────────────────────────────────────────── */
async function buildUkRegions() {
  const dir = path.join(ROOT, 'public/data/climate/uk-region');
  const files = await fs.readdir(dir).catch(() => []);
  const temp = Object.fromEntries(ALL_WINDOWS.map((w) => [w, {}]));
  const precip = Object.fromEntries(ALL_WINDOWS.map((w) => [w, {}]));
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const slug = f.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
      const tmean = j.varData?.Tmean?.monthlyAll;
      const rain = j.varData?.Rainfall?.monthlyAll;
      if (tmean) {
        const byW = buildAllWindows(tmean, 'mean', 'temp');
        for (const [w, arr] of Object.entries(byW)) temp[w][slug] = arr;
      }
      if (rain) {
        const byW = buildAllWindows(rain, 'sum', 'precip');
        for (const [w, arr] of Object.entries(byW)) precip[w][slug] = arr;
      }
    } catch { /* skip */ }
  }
  return { temp, precip };
}

async function main() {
  console.log('Building ENSO impact dataset...');
  const [c, u, uk] = await Promise.all([buildCountries(), buildUsStates(), buildUkRegions()]);

  // Emit a single `seasonal` block keyed by window, each containing
  // {temp,precip} × {country,usState,ukRegion}. ALL_WINDOWS[0] is 'annual',
  // followed by the 12 NOAA-style overlapping 3-month windows.
  const seasonal = {};
  for (const w of ALL_WINDOWS) {
    seasonal[w] = {
      temp:   { country: c.temp[w]   || {}, usState: u.temp[w]   || {}, ukRegion: uk.temp[w]   || {} },
      precip: { country: c.precip[w] || {}, usState: u.precip[w] || {}, ukRegion: uk.precip[w] || {} },
    };
  }

  const out = {
    baseline: [BASELINE_FROM, BASELINE_TO],
    years: YEARS,
    // ISO3 → geojson `properties.name` so the client can look up a feature
    // by iso3 without fuzzy matching.
    countryNames: c.names,
    // List of windows in slider order. 'annual' first, then DJF…NDJ.
    windows: ALL_WINDOWS,
    // Per-window ONI lag (years) applied at runtime when computing
    // correlation / composite slopes. See SEASON_LAG comment.
    windowLag: SEASON_LAG,
    seasonal,
    // Back-compat aliases — the runtime currently reads `annual` and `mam`
    // directly. Keep these so an old client doesn't break mid-deploy.
    annual: seasonal.annual,
    mam:    seasonal.MAM,
    generatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out));
  const stat = await fs.stat(OUT);
  console.log(`✔ Wrote ${path.relative(ROOT, OUT)} (${(stat.size / 1024).toFixed(0)} KB)`);
  for (const w of ALL_WINDOWS) {
    const nC = Object.keys(seasonal[w].temp.country).length;
    const nP = Object.keys(seasonal[w].precip.country).length;
    console.log(`  ${w.padEnd(6)} countries: ${nC} temp, ${nP} precip`);
  }
  console.log(`  Years: ${YEARS[0]}–${YEARS[YEARS.length - 1]} (${YEARS.length})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
