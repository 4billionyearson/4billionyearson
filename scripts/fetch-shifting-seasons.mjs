#!/usr/bin/env node
/**
 * Fetches source data for the Shifting Seasons page.
 *
 * Outputs:
 *   public/data/seasons/kyoto-cherry-blossom.json
 *   public/data/seasons/nh-snow-cover.json
 *
 * Sources:
 *   - Kyoto full-flowering dates 812–2015 CE (Aono, published via NOAA NCEI Paleoclimatology)
 *   - Northern Hemisphere monthly snow cover 1966–present (Rutgers Global Snow Lab)
 *
 * Usage: node scripts/fetch-shifting-seasons.mjs
 * Safe to re-run; overwrites output JSON.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'data', 'seasons');

const KYOTO_URL =
  'https://www.ncei.noaa.gov/pub/data/paleo/historical/phenology/japan/kyoto2010flower.txt';
// The LatestVersion XLS runs to 2015 but is binary XLS. We use the text file
// (812–2010) and extend with the values Aono published 2011–2015 in the XLS.
// Recent years sourced from published JMA sakura observation records (Kyoto
// station, full-bloom 満開 date day-of-year).
const KYOTO_RECENT = {
  // From NOAA NCEI LatestVersion/KyotoFullFlower7.xls
  2011: 99,
  2012: 101,
  2013: 93,
  2014: 94,
  2015: 93,
  // From JMA Kyoto station full-bloom records (public)
  2016: 95,
  2017: 98,
  2018: 89,
  2019: 94,
  2020: 91,
  2021: 85, // earliest on record in 1,200 years
  2022: 91,
  2023: 86,
  2024: 95,
  2025: 93,
};

const RUTGERS_URL =
  'https://climate.rutgers.edu/snowcover/files/moncov.nhland.txt';

const CLIMATOLOGY_START = 1981;
const CLIMATOLOGY_END = 2010;

async function fetchText(url) {
  // Use curl: the URLs we need are reliable with curl and avoid TLS/ipv6 oddities.
  const buf = execSync(`curl -sL --fail "${url}"`, { maxBuffer: 20 * 1024 * 1024 });
  return buf.toString('utf8');
}

/* ─── Kyoto cherry blossom ────────────────────────────────────────────────── */

function parseKyoto(raw) {
  const lines = raw.split(/\r?\n/);
  // Data lines: tab-delimited; year, DOY, MDD, source, ref — blank DOY means gap.
  const points = [];
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('age_CE')) continue;
    const parts = line.split(/\t/);
    if (parts.length < 2) continue;
    const year = Number(parts[0]);
    const doyRaw = (parts[1] || '').trim();
    if (!Number.isFinite(year) || year < 800) continue;
    if (!doyRaw || !/^\d+$/.test(doyRaw)) continue;
    const doy = Number(doyRaw);
    if (!Number.isFinite(doy) || doy < 50 || doy > 160) continue;
    points.push({ year, doy });
  }
  // Append recent years (overwrites any duplicates; XLS values preferred).
  const byYear = new Map(points.map((p) => [p.year, p.doy]));
  for (const [y, d] of Object.entries(KYOTO_RECENT)) {
    byYear.set(Number(y), d);
  }
  return [...byYear.entries()]
    .map(([year, doy]) => ({ year, doy }))
    .sort((a, b) => a.year - b.year);
}

function doyToDate(doy, year = 2001) {
  // Non-leap reference year so Mar/Apr labels line up.
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCDate(d.getUTCDate() + doy - 1);
  return `${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}`;
}

/* ─── Rutgers NH snow cover ──────────────────────────────────────────────── */

function parseRutgers(raw) {
  const lines = raw.split(/\r?\n/);
  // Whitespace-delimited: year month areaKm2
  const rows = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split(/\s+/);
    if (parts.length < 3) continue;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const areaKm2 = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(areaKm2)) continue;
    if (year < 1966 || month < 1 || month > 12) continue;
    rows.push({ year, month, areaKm2 });
  }
  return rows;
}

// Build a climatology (mean per month, 1981–2010) and anomaly (% of climatology per month).
function buildSnowSeries(rows) {
  const climByMonth = new Map(); // month -> [areas]
  for (const r of rows) {
    if (r.year < CLIMATOLOGY_START || r.year > CLIMATOLOGY_END) continue;
    if (!climByMonth.has(r.month)) climByMonth.set(r.month, []);
    climByMonth.get(r.month).push(r.areaKm2);
  }
  const climMean = new Map();
  for (const [m, arr] of climByMonth) {
    climMean.set(m, arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  // Anomaly: (value - clim) / clim * 100
  const withAnomaly = rows.map((r) => {
    const clim = climMean.get(r.month);
    const anomPct = clim ? ((r.areaKm2 - clim) / clim) * 100 : null;
    return { ...r, anomPct };
  });

  // Annual winter (Dec–Feb) and spring (Mar–May) averages for cleaner trend chart.
  const byYear = new Map();
  for (const r of withAnomaly) byYear.set(`${r.year}-${r.month}`, r);

  const seasonalAnoms = [];
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  for (const y of years) {
    // Winter (Dec y-1 + Jan y + Feb y)
    const dec = byYear.get(`${y - 1}-12`);
    const jan = byYear.get(`${y}-1`);
    const feb = byYear.get(`${y}-2`);
    if (dec && jan && feb && dec.anomPct != null && jan.anomPct != null && feb.anomPct != null) {
      seasonalAnoms.push({
        year: y,
        season: 'winter',
        anomPct: (dec.anomPct + jan.anomPct + feb.anomPct) / 3,
      });
    }
    // Spring (Mar + Apr + May)
    const mar = byYear.get(`${y}-3`);
    const apr = byYear.get(`${y}-4`);
    const may = byYear.get(`${y}-5`);
    if (mar && apr && may && mar.anomPct != null && apr.anomPct != null && may.anomPct != null) {
      seasonalAnoms.push({
        year: y,
        season: 'spring',
        anomPct: (mar.anomPct + apr.anomPct + may.anomPct) / 3,
      });
    }
  }

  return {
    monthly: withAnomaly.map((r) => ({
      year: r.year,
      month: r.month,
      areaKm2: r.areaKm2,
      anomPct: r.anomPct == null ? null : Number(r.anomPct.toFixed(2)),
    })),
    climatology: [...climMean.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([month, mean]) => ({ month, meanKm2: Math.round(mean) })),
    seasonalAnomaly: seasonalAnoms.map((s) => ({
      year: s.year,
      season: s.season,
      anomPct: Number(s.anomPct.toFixed(2)),
    })),
  };
}

/* ─── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log('Fetching Kyoto cherry-blossom data…');
  const kyotoRaw = await fetchText(KYOTO_URL);
  const kyotoPoints = parseKyoto(kyotoRaw);
  const firstYear = kyotoPoints[0]?.year;
  const lastYear = kyotoPoints[kyotoPoints.length - 1]?.year;
  // 30-year trailing mean on last point (for callout)
  const recent30 = kyotoPoints.filter((p) => p.year >= lastYear - 29 && p.year <= lastYear);
  const pre1850 = kyotoPoints.filter((p) => p.year < 1850);
  const recent30Mean = recent30.reduce((s, p) => s + p.doy, 0) / recent30.length;
  const pre1850Mean = pre1850.reduce((s, p) => s + p.doy, 0) / pre1850.length;

  const kyotoOut = {
    source: 'Aono & Kazui (2008); Aono & Saito (2010); extended to 2015 via NOAA NCEI; 2016–2025 from JMA Kyoto station records.',
    sourceUrl:
      'https://www.ncei.noaa.gov/access/paleo-search/study/26430',
    description:
      'Day of year of full-flowering (満開) of Prunus jamasakura at Kyoto, Japan. One of the longest continuous biological records of climate in the world.',
    climatologyPre1850Mean: Number(pre1850Mean.toFixed(1)),
    recent30YearMean: Number(recent30Mean.toFixed(1)),
    shiftDays: Number((recent30Mean - pre1850Mean).toFixed(1)),
    earliestYear: kyotoPoints.reduce((min, p) => (p.doy < min.doy ? p : min)).year,
    earliestDoy: kyotoPoints.reduce((min, p) => (p.doy < min.doy ? p : min)).doy,
    firstYear,
    lastYear,
    count: kyotoPoints.length,
    points: kyotoPoints.map((p) => ({ year: p.year, doy: p.doy, label: doyToDate(p.doy) })),
  };
  await fs.writeFile(
    path.join(OUT_DIR, 'kyoto-cherry-blossom.json'),
    JSON.stringify(kyotoOut, null, 2),
  );
  console.log(
    `  → ${kyotoPoints.length} records, ${firstYear}–${lastYear}; pre-1850 mean DOY ${pre1850Mean.toFixed(1)}, recent mean ${recent30Mean.toFixed(1)}`,
  );

  console.log('Fetching Rutgers Global Snow Lab NH snow cover…');
  const snowRaw = await fetchText(RUTGERS_URL);
  const snowRows = parseRutgers(snowRaw);
  const snowSeries = buildSnowSeries(snowRows);
  const latestMonth = snowRows[snowRows.length - 1];
  const snowOut = {
    source: 'Rutgers University Global Snow Lab — Northern Hemisphere monthly snow-covered area (land)',
    sourceUrl: 'https://climate.rutgers.edu/snowcover/',
    description:
      'Total area of Northern Hemisphere land covered by snow each month, from weekly NOAA NESDIS satellite analyses. Anomalies are expressed as % difference from the 1981–2010 monthly climatology.',
    climatologyBaseline: `${CLIMATOLOGY_START}–${CLIMATOLOGY_END}`,
    latest: latestMonth
      ? {
          year: latestMonth.year,
          month: latestMonth.month,
          areaKm2: latestMonth.areaKm2,
        }
      : null,
    ...snowSeries,
  };
  await fs.writeFile(
    path.join(OUT_DIR, 'nh-snow-cover.json'),
    JSON.stringify(snowOut, null, 2),
  );
  console.log(
    `  → ${snowRows.length} monthly records, through ${latestMonth?.year}-${String(latestMonth?.month).padStart(2, '0')}`,
  );

  // Manifest for the API route
  const manifest = {
    updatedAt: new Date().toISOString(),
    datasets: [
      {
        id: 'kyoto-cherry-blossom',
        title: 'Kyoto cherry-blossom full-bloom dates (812–present)',
        file: 'kyoto-cherry-blossom.json',
      },
      {
        id: 'nh-snow-cover',
        title: 'Northern Hemisphere snow cover (1966–present)',
        file: 'nh-snow-cover.json',
      },
    ],
  };
  await fs.writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
