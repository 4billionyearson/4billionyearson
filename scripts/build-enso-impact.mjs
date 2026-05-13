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
 *  - window='annual' → all 12 months (Jan–Dec); requires 12 finite values
 *  - window='mam'    → Mar/Apr/May; requires all 3 finite values.
 *                      MAM captures the lagged ENSO impact: the spring
 *                      following the DJF SST peak shows the cleanest signal
 *                      on global land temperature & rainfall.
 *
 *  - kind='mean' → average of the months (for °C)
 *  - kind='sum'  → sum of the months    (for mm)
 */
function toAnnual(monthlyAll, kind, window = 'annual') {
  if (!Array.isArray(monthlyAll)) return new Map();
  const mamMonths = new Set([3, 4, 5]);
  const byYear = new Map();
  for (const row of monthlyAll) {
    if (!row || typeof row.value !== 'number' || !Number.isFinite(row.value)) continue;
    if (typeof row.year !== 'number') continue;
    if (window === 'mam' && !mamMonths.has(row.month)) continue;
    const arr = byYear.get(row.year) ?? [];
    arr.push(row.value);
    byYear.set(row.year, arr);
  }
  const required = window === 'mam' ? 3 : 12;
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

/* ─────────────────────────────────────────────────────────────────────────
 *  COUNTRIES — public/data/climate/country/{ISO3}.json (monthlyAll)
 *  and       public/data/climate/country-precip/{ISO3}.json (monthlyAll)
 * ───────────────────────────────────────────────────────────────────────── */
async function buildCountries() {
  const tempDir = path.join(ROOT, 'public/data/climate/country');
  const precipDir = path.join(ROOT, 'public/data/climate/country-precip');
  const tempFiles = await fs.readdir(tempDir).catch(() => []);
  const precipFiles = await fs.readdir(precipDir).catch(() => []);
  const out = { tempAnnual: {}, tempMam: {}, precipAnnual: {}, precipMam: {}, names: {} };
  for (const f of tempFiles) {
    if (!f.endsWith('.json')) continue;
    const iso3 = f.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(await fs.readFile(path.join(tempDir, f), 'utf8'));
      const a = toAnomalyArray(toAnnual(j.monthlyAll, 'mean', 'annual'), 'temp');
      const m = toAnomalyArray(toAnnual(j.monthlyAll, 'mean', 'mam'), 'temp');
      if (a) out.tempAnnual[iso3] = a;
      if (m) out.tempMam[iso3] = m;
      // Map ISO3 → name as it appears in public/data/world-countries.json so
      // the runtime can do straight feature-name lookups without a fuzzy match.
      if (j.country) out.names[iso3] = NAME_TO_GEO[j.country] || j.country;
    } catch { /* skip bad file */ }
  }
  for (const f of precipFiles) {
    if (!f.endsWith('.json')) continue;
    const iso3 = f.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(await fs.readFile(path.join(precipDir, f), 'utf8'));
      const a = toAnomalyArray(toAnnual(j.monthlyAll, 'sum', 'annual'), 'precip');
      const m = toAnomalyArray(toAnnual(j.monthlyAll, 'sum', 'mam'), 'precip');
      if (a) out.precipAnnual[iso3] = a;
      if (m) out.precipMam[iso3] = m;
    } catch { /* skip bad file */ }
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  US STATES — paramData.tavg.monthlyAll (°C) and paramData.pcp.monthlyAll
 *  Slug = filename stem (e.g. us-ca).
 * ───────────────────────────────────────────────────────────────────────── */
async function buildUsStates() {
  const dir = path.join(ROOT, 'public/data/climate/us-state');
  const files = await fs.readdir(dir).catch(() => []);
  const out = { tempAnnual: {}, tempMam: {}, precipAnnual: {}, precipMam: {} };
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const slug = f.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
      const tavg = j.paramData?.tavg?.monthlyAll;
      const pcp = j.paramData?.pcp?.monthlyAll;
      if (tavg) {
        const a = toAnomalyArray(toAnnual(tavg, 'mean', 'annual'), 'temp');
        const m = toAnomalyArray(toAnnual(tavg, 'mean', 'mam'), 'temp');
        if (a) out.tempAnnual[slug] = a;
        if (m) out.tempMam[slug] = m;
      }
      if (pcp) {
        const a = toAnomalyArray(toAnnual(pcp, 'sum', 'annual'), 'precip');
        const m = toAnomalyArray(toAnnual(pcp, 'sum', 'mam'), 'precip');
        if (a) out.precipAnnual[slug] = a;
        if (m) out.precipMam[slug] = m;
      }
    } catch { /* skip */ }
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  UK REGIONS — varData.Tmean.monthlyAll (°C) and varData.Rainfall.monthlyAll
 * ───────────────────────────────────────────────────────────────────────── */
async function buildUkRegions() {
  const dir = path.join(ROOT, 'public/data/climate/uk-region');
  const files = await fs.readdir(dir).catch(() => []);
  const out = { tempAnnual: {}, tempMam: {}, precipAnnual: {}, precipMam: {} };
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const slug = f.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
      const tmean = j.varData?.Tmean?.monthlyAll;
      const rain = j.varData?.Rainfall?.monthlyAll;
      if (tmean) {
        const a = toAnomalyArray(toAnnual(tmean, 'mean', 'annual'), 'temp');
        const m = toAnomalyArray(toAnnual(tmean, 'mean', 'mam'), 'temp');
        if (a) out.tempAnnual[slug] = a;
        if (m) out.tempMam[slug] = m;
      }
      if (rain) {
        const a = toAnomalyArray(toAnnual(rain, 'sum', 'annual'), 'precip');
        const m = toAnomalyArray(toAnnual(rain, 'sum', 'mam'), 'precip');
        if (a) out.precipAnnual[slug] = a;
        if (m) out.precipMam[slug] = m;
      }
    } catch { /* skip */ }
  }
  return out;
}

async function main() {
  console.log('Building ENSO impact dataset...');
  const [c, u, uk] = await Promise.all([buildCountries(), buildUsStates(), buildUkRegions()]);

  const out = {
    baseline: [BASELINE_FROM, BASELINE_TO],
    years: YEARS,
    // ISO3 → geojson `properties.name` so the client can look up a feature
    // by iso3 without fuzzy matching.
    countryNames: c.names,
    // Annual: Jan–Dec mean / sum vs baseline.
    annual: {
      temp:   { country: c.tempAnnual,   usState: u.tempAnnual,   ukRegion: uk.tempAnnual },
      precip: { country: c.precipAnnual, usState: u.precipAnnual, ukRegion: uk.precipAnnual },
    },
    // MAM (Mar–May): captures the lagged spring response after a DJF ENSO
    // peak, the cleanest land-impact window for global teleconnections.
    mam: {
      temp:   { country: c.tempMam,   usState: u.tempMam,   ukRegion: uk.tempMam },
      precip: { country: c.precipMam, usState: u.precipMam, ukRegion: uk.precipMam },
    },
    generatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out));
  const stat = await fs.stat(OUT);
  console.log(`✔ Wrote ${path.relative(ROOT, OUT)} (${(stat.size / 1024).toFixed(0)} KB)`);
  console.log(`  Annual countries:  ${Object.keys(c.tempAnnual).length} temp, ${Object.keys(c.precipAnnual).length} precip`);
  console.log(`  MAM    countries:  ${Object.keys(c.tempMam).length} temp, ${Object.keys(c.precipMam).length} precip`);
  console.log(`  US states (ann):   ${Object.keys(u.tempAnnual).length} temp, ${Object.keys(u.precipAnnual).length} precip`);
  console.log(`  UK regions (ann):  ${Object.keys(uk.tempAnnual).length} temp, ${Object.keys(uk.precipAnnual).length} precip`);
  console.log(`  Years: ${YEARS[0]}–${YEARS[YEARS.length - 1]} (${YEARS.length})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
