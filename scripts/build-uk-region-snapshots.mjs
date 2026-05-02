#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build pre-computed UK region climate snapshots from Met Office
 * statistical area datasets.
 *
 * 17 regions × 7 variables = 119 text-file fetches. Met Office serves
 * static text files so this is fast (~1–2 minutes with throttling).
 *
 * Output: public/data/climate/uk-region/<id>.json
 *
 * Usage:
 *   node scripts/build-uk-region-snapshots.mjs
 *   node scripts/build-uk-region-snapshots.mjs --only=uk-uk,uk-eng
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  round2,
  fetchWithRetry,
  sleep,
  buildLatestMonthStats,
  buildLatestThreeMonthStats,
  buildYearlyFromMonthly,
  buildMonthlyComparison,
  currentMonthKey,
} from './_climate-common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'data', 'climate', 'uk-region');

const MET_OFFICE_VARS = ['Tmean', 'Tmax', 'Tmin', 'Rainfall', 'Sunshine', 'AirFrost', 'Raindays1mm'];
const VAR_LABELS = {
  Tmean: 'Mean Temperature',
  Tmax: 'Maximum Temperature',
  Tmin: 'Minimum Temperature',
  Rainfall: 'Rainfall',
  Sunshine: 'Sunshine Hours',
  AirFrost: 'Air Frost Days',
  Raindays1mm: 'Rain Days (≥1mm)',
};
const VAR_UNITS = {
  Tmean: '°C', Tmax: '°C', Tmin: '°C',
  Rainfall: 'mm', Sunshine: 'hours',
  AirFrost: 'days', Raindays1mm: 'days',
};

const UK_REGIONS = [
  { id: 'uk-uk', name: 'United Kingdom', metOfficeRegion: 'UK' },
  { id: 'uk-eng', name: 'England', metOfficeRegion: 'England' },
  { id: 'uk-wal', name: 'Wales', metOfficeRegion: 'Wales' },
  { id: 'uk-sco', name: 'Scotland', metOfficeRegion: 'Scotland' },
  { id: 'uk-ni', name: 'Northern Ireland', metOfficeRegion: 'Northern_Ireland' },
  { id: 'uk-ew', name: 'England and Wales', metOfficeRegion: 'England_and_Wales' },
  { id: 'uk-en', name: 'England North', metOfficeRegion: 'England_N' },
  { id: 'uk-es', name: 'England South', metOfficeRegion: 'England_S' },
  { id: 'uk-se', name: 'Scotland East', metOfficeRegion: 'Scotland_E' },
  { id: 'uk-sn', name: 'Scotland North', metOfficeRegion: 'Scotland_N' },
  { id: 'uk-sw', name: 'Scotland West', metOfficeRegion: 'Scotland_W' },
  { id: 'uk-ene', name: 'England East & North East', metOfficeRegion: 'England_E_and_NE' },
  { id: 'uk-nww', name: 'England NW & North Wales', metOfficeRegion: 'England_NW_and_N_Wales' },
  { id: 'uk-mid', name: 'Midlands', metOfficeRegion: 'Midlands' },
  { id: 'uk-ea', name: 'East Anglia', metOfficeRegion: 'East_Anglia' },
  { id: 'uk-sws', name: 'England SW & South Wales', metOfficeRegion: 'England_SW_and_S_Wales' },
  { id: 'uk-sec', name: 'England SE & Central South', metOfficeRegion: 'England_SE_and_Central_S' },
];

function parseArgs(argv) {
  const only = argv.find((a) => a.startsWith('--only='));
  const onlyList = only ? only.split('=')[1].split(',').map((s) => s.trim().toLowerCase()) : null;
  return { onlyList };
}

// Mark the latest monthly data point as provisional. Met Office time-series
// .txt files publish each month's value within a few days of month-end, but
// those values stay "provisional" (subject to QC revision) for roughly one
// month before being treated as final. Flagging the last point lets the
// chart render it dashed and label it clearly.
function tagLatestProvisional(points) {
  if (!points.length) return points;
  const sorted = [...points].sort((a, b) => a.year - b.year || a.month - b.month);
  const last = sorted[sorted.length - 1];
  return sorted.map((p) =>
    p.year === last.year && p.month === last.month ? { ...p, provisional: true } : p,
  );
}

function parseMetOfficeText(text) {
  // Met Office monthly time-series files are column-aligned (fixed-width):
  //   Year (cols 0-3)  +  12 monthly columns (7 chars each, right-aligned)
  //   +  4 seasonal columns (Win/Spr/Sum/Aut) + Annual.
  // We MUST NOT split on whitespace - if a recent month is missing
  // (e.g. April 2026 not yet published), runs of spaces collapse and
  // the seasonal "Win" total bleeds into the April slot.
  const points = [];
  for (const rawLine of text.split('\n')) {
    if (!rawLine.trim()) continue;
    if (/^\s*(Year|Month|---)/i.test(rawLine)) continue;
    const yearStr = rawLine.slice(0, 4).trim();
    const year = parseInt(yearStr, 10);
    if (Number.isNaN(year) || year < 1900 || year > 2200) continue;
    for (let m = 0; m < 12; m++) {
      const start = 4 + m * 7;
      const cell = rawLine.slice(start, start + 7).trim();
      if (!cell) continue;
      const val = parseFloat(cell);
      if (!Number.isNaN(val)) {
        points.push({ year, month: m + 1, value: round2(val) });
      }
    }
  }
  return points;
}

async function fetchMetOfficeVar(region, variable) {
  const url = `https://www.metoffice.gov.uk/pub/data/weather/uk/climate/datasets/${variable}/date/${region}.txt`;
  try {
    const text = await fetchWithRetry(url, {
      label: `MetOffice ${region}/${variable}`,
      timeoutMs: 30_000,
      kind: 'text',
      attempts: 3,
    });
    return parseMetOfficeText(text);
  } catch (err) {
    console.warn(`    parse failed for ${region}/${variable}: ${err?.message ?? err}`);
    return [];
  }
}

async function main() {
  const { onlyList } = parseArgs(process.argv.slice(2));
  console.log(`Build started ${new Date().toISOString()}`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const regions = onlyList ? UK_REGIONS.filter((r) => onlyList.includes(r.id)) : UK_REGIONS;
  const cacheKey = currentMonthKey('v9');

  console.log(`Processing ${regions.length} regions × ${MET_OFFICE_VARS.length} vars`);
  let ok = 0;
  let failed = 0;

  for (const region of regions) {
    try {
      const varData = {};
      for (const varName of MET_OFFICE_VARS) {
        const points = await fetchMetOfficeVar(region.metOfficeRegion, varName);
        await sleep(200);
        if (!points.length) continue;

        const isSum = ['Rainfall', 'Sunshine', 'AirFrost', 'Raindays1mm'].includes(varName);
        const lowerIsBetter = varName === 'AirFrost';

        // Keep full monthlyAll for variables the SeasonalShiftCard / spaghetti
        // chart can plot (temperature, rainfall, sunshine, frost). Drop for the
        // others to keep the payload reasonable.
        const keepMonthlyAll = ['Tmean', 'Rainfall', 'Sunshine', 'AirFrost'].includes(varName);

        varData[varName] = {
          label: VAR_LABELS[varName],
          units: VAR_UNITS[varName],
          yearly: buildYearlyFromMonthly(points, { isSum }),
          monthlyComparison: buildMonthlyComparison(points),
          latestMonthStats: buildLatestMonthStats(points, { lowerIsBetter }),
          latestThreeMonthStats: buildLatestThreeMonthStats(points, { lowerIsBetter, isSum }),
          ...(keepMonthlyAll ? { monthlyAll: tagLatestProvisional(points.map((p) => ({ year: p.year, month: p.month, value: p.value }))) } : {}),
        };
      }

      if (!Object.keys(varData).length) {
        console.warn(`  ⚠ ${region.id.padEnd(8)} ${region.name}: no data`);
        failed++;
        continue;
      }

      const response = {
        region: region.name,
        id: region.id,
        metOfficeRegion: region.metOfficeRegion,
        varData,
        lastUpdated: cacheKey,
        attribution: 'Contains Met Office data © Crown copyright',
        generatedAt: new Date().toISOString(),
      };

      const outPath = resolve(OUTPUT_DIR, `${region.id}.json`);
      await writeFile(outPath, JSON.stringify(response), 'utf8');
      ok++;
      console.log(`  ✓ ${region.id.padEnd(8)} ${region.name.padEnd(32)} ${Object.keys(varData).length} vars`);
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
