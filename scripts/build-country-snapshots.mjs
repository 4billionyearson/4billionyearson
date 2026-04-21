#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build pre-computed per-country climate snapshots.
 *
 * Fetches OWID global temperature + precipitation indicators ONCE
 * (~10MB each), then slices the data by entity for every country in
 * COUNTRIES. Previously each country request downloaded both files in
 * full — this script reduces 80 × 20MB of redundant traffic into a
 * single pair of fetches.
 *
 * Output: public/data/climate/country/<APICODE>.json
 *
 * Usage:
 *   node scripts/build-country-snapshots.mjs            # all countries
 *   node scripts/build-country-snapshots.mjs --only=USA # single country
 *   node scripts/build-country-snapshots.mjs --only=USA,GBR,FRA
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  round2,
  fetchWithRetry,
  buildLatestMonthStats,
  buildLatestThreeMonthStats,
  buildYearlyFromMonthly,
  buildMonthlyComparison,
  currentMonthKey,
} from './_climate-common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'data', 'climate', 'country');

const OWID_TEMP_URL = 'https://api.ourworldindata.org/v1/indicators/1005195.data.json';
const OWID_PRECIP_URL = 'https://api.ourworldindata.org/v1/indicators/1005182.data.json';

// Mirror the COUNTRIES array from src/lib/climate/locations.ts. We can't
// import the TS file from a plain node script, but this list rarely
// changes and we validate counts at the end.
const COUNTRIES = [
  { owidEntityId: 1, owidCode: 'GBR', name: 'United Kingdom' },
  { owidEntityId: 3, owidCode: 'FRA', name: 'France' },
  { owidEntityId: 6, owidCode: 'DEU', name: 'Germany' },
  { owidEntityId: 13, owidCode: 'USA', name: 'United States' },
  { owidEntityId: 14, owidCode: 'JPN', name: 'Japan' },
  { owidEntityId: 21, owidCode: 'ARG', name: 'Argentina' },
  { owidEntityId: 23, owidCode: 'AUS', name: 'Australia' },
  { owidEntityId: 34, owidCode: 'BOL', name: 'Bolivia' },
  { owidEntityId: 37, owidCode: 'BRA', name: 'Brazil' },
  { owidEntityId: 82, owidCode: 'SOM', name: 'Somalia' },
  { owidEntityId: 97, owidCode: 'PER', name: 'Peru' },
  { owidEntityId: 101, owidCode: 'PAK', name: 'Pakistan' },
  { owidEntityId: 103, owidCode: 'NGA', name: 'Nigeria' },
  { owidEntityId: 105, owidCode: 'NIC', name: 'Nicaragua' },
  { owidEntityId: 110, owidCode: 'MAR', name: 'Morocco' },
  { owidEntityId: 116, owidCode: 'MYS', name: 'Malaysia' },
  { owidEntityId: 117, owidCode: 'MWI', name: 'Malawi' },
  { owidEntityId: 124, owidCode: 'LBN', name: 'Lebanon' },
  { owidEntityId: 127, owidCode: 'KOR', name: 'South Korea' },
  { owidEntityId: 128, owidCode: 'PRK', name: 'North Korea' },
  { owidEntityId: 129, owidCode: 'KEN', name: 'Kenya' },
  { owidEntityId: 133, owidCode: 'ISR', name: 'Israel' },
  { owidEntityId: 136, owidCode: 'IDN', name: 'Indonesia' },
  { owidEntityId: 137, owidCode: 'IND', name: 'India' },
  { owidEntityId: 140, owidCode: 'PSE', name: 'Palestine' },
  { owidEntityId: 146, owidCode: 'GUY', name: 'Guyana' },
  { owidEntityId: 158, owidCode: 'ETH', name: 'Ethiopia' },
  { owidEntityId: 163, owidCode: 'CYP', name: 'Cyprus' },
  { owidEntityId: 166, owidCode: 'CRI', name: 'Costa Rica' },
  { owidEntityId: 168, owidCode: 'COG', name: 'Congo' },
  { owidEntityId: 171, owidCode: 'CHN', name: 'China' },
  { owidEntityId: 172, owidCode: 'CHL', name: 'Chile' },
  { owidEntityId: 234, owidCode: 'SUR', name: 'Suriname' },
  { owidEntityId: 258, owidCode: 'SSD', name: 'South Sudan' },
  { owidEntityId: 8, owidCode: 'ITA', name: 'Italy' },
  { owidEntityId: 9, owidCode: 'ESP', name: 'Spain' },
  { owidEntityId: 44, owidCode: 'CAN', name: 'Canada' },
  { owidEntityId: 113, owidCode: 'MEX', name: 'Mexico' },
  { owidEntityId: 138, owidCode: 'RUS', name: 'Russia' },
  { owidEntityId: 172, owidCode: 'ZAF', name: 'South Africa' },
  { owidEntityId: 65, owidCode: 'EGY', name: 'Egypt' },
  { owidEntityId: 155, owidCode: 'TUR', name: 'Turkey' },
  { owidEntityId: 144, owidCode: 'THA', name: 'Thailand' },
  { owidEntityId: 84, owidCode: 'VNM', name: 'Vietnam' },
  { owidEntityId: 100, owidCode: 'PHL', name: 'Philippines' },
  { owidEntityId: 170, owidCode: 'COL', name: 'Colombia' },
  { owidEntityId: 11, owidCode: 'POL', name: 'Poland' },
  { owidEntityId: 5, owidCode: 'NLD', name: 'Netherlands' },
  { owidEntityId: 4, owidCode: 'BEL', name: 'Belgium' },
  { owidEntityId: 10, owidCode: 'SWE', name: 'Sweden' },
  { owidEntityId: 142, owidCode: 'NOR', name: 'Norway' },
  { owidEntityId: 161, owidCode: 'DNK', name: 'Denmark' },
  { owidEntityId: 156, owidCode: 'FIN', name: 'Finland' },
  { owidEntityId: 134, owidCode: 'IRL', name: 'Ireland' },
  { owidEntityId: 95, owidCode: 'PRT', name: 'Portugal' },
  { owidEntityId: 149, owidCode: 'GRC', name: 'Greece' },
  { owidEntityId: 24, owidCode: 'AUT', name: 'Austria' },
  { owidEntityId: 75, owidCode: 'CHE', name: 'Switzerland' },
  { owidEntityId: 106, owidCode: 'NZL', name: 'New Zealand' },
  { owidEntityId: 80, owidCode: 'SGP', name: 'Singapore' },
  { owidEntityId: 79, owidCode: 'SAU', name: 'Saudi Arabia' },
  { owidEntityId: 63, owidCode: 'ARE', name: 'United Arab Emirates' },
  { owidEntityId: 135, owidCode: 'IRQ', name: 'Iraq' },
  { owidEntityId: 136, owidCode: 'IRN', name: 'Iran' },
  { owidEntityId: 27, owidCode: 'BGD', name: 'Bangladesh' },
  { owidEntityId: 81, owidCode: 'LKA', name: 'Sri Lanka' },
  { owidEntityId: 119, owidCode: 'MMR', name: 'Myanmar' },
  { owidEntityId: 62, owidCode: 'UKR', name: 'Ukraine' },
  { owidEntityId: 96, owidCode: 'ROU', name: 'Romania' },
  { owidEntityId: 131, owidCode: 'HUN', name: 'Hungary' },
  { owidEntityId: 162, owidCode: 'CZE', name: 'Czechia' },
  { owidEntityId: 64, owidCode: 'TZA', name: 'Tanzania' },
  { owidEntityId: 148, owidCode: 'GHA', name: 'Ghana' },
  { owidEntityId: 61, owidCode: 'UGA', name: 'Uganda' },
  { owidEntityId: 169, owidCode: 'COD', name: 'DR Congo' },
  { owidEntityId: 20, owidCode: 'DZA', name: 'Algeria' },
  { owidEntityId: 77, owidCode: 'SYR', name: 'Syria' },
  { owidEntityId: 132, owidCode: 'JAM', name: 'Jamaica' },
  { owidEntityId: 130, owidCode: 'ISL', name: 'Iceland' },
];

function parseArgs(argv) {
  const only = argv.find((a) => a.startsWith('--only='));
  const onlyList = only ? only.split('=')[1].split(',').map((s) => s.trim().toUpperCase()) : null;
  return { onlyList };
}

function parseOwid(data, entityId, currentYear, currentMonth, isMonthly = true) {
  const epoch = new Date(1950, 0, 1);
  const points = [];
  for (let i = 0; i < data.years.length; i++) {
    if (data.entities[i] !== entityId) continue;
    if (isMonthly) {
      const d = new Date(epoch.getTime() + data.years[i] * 86_400_000);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      if (year > currentYear || (year === currentYear && month >= currentMonth)) continue;
      points.push({
        date: `${year}-${String(month).padStart(2, '0')}`,
        year,
        month,
        value: round2(data.values[i]),
      });
    } else {
      // Annual indicator (precipitation): years are actual year numbers, not epoch days
      points.push({
        year: data.years[i],
        value: Math.round(data.values[i] * 10) / 10,
      });
    }
  }
  if (isMonthly) return points.sort((a, b) => a.date.localeCompare(b.date));
  return points.sort((a, b) => a.year - b.year);
}

async function main() {
  const { onlyList } = parseArgs(process.argv.slice(2));
  console.log(`Build started ${new Date().toISOString()}`);

  const [tempData, precipData] = await Promise.all([
    fetchWithRetry(OWID_TEMP_URL, { label: 'OWID-temp', timeoutMs: 180_000 }),
    fetchWithRetry(OWID_PRECIP_URL, { label: 'OWID-precip', timeoutMs: 180_000 }),
  ]);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const cacheKey = currentMonthKey('v8');

  const countries = onlyList
    ? COUNTRIES.filter((c) => onlyList.includes(c.owidCode))
    : COUNTRIES;

  console.log(`Processing ${countries.length} countries`);
  let ok = 0;
  let failed = 0;

  for (const country of countries) {
    try {
      const monthly = parseOwid(tempData, country.owidEntityId, currentYear, currentMonth, true);
      if (!monthly.length) {
        console.warn(`  ⚠ ${country.owidCode} (${country.name}): no monthly data`);
        failed++;
        continue;
      }

      const statsPoints = monthly.map((p) => ({ year: p.year, month: p.month, value: p.value }));
      const yearlyData = buildYearlyFromMonthly(statsPoints).map((p) => ({
        year: p.year,
        avgTemp: p.value,
        rollingAvg: p.rollingAvg,
      }));
      const monthlyComparison = buildMonthlyComparison(statsPoints).map((p) => ({
        monthLabel: p.monthLabel,
        month: p.month,
        year: p.year,
        recentTemp: p.recent,
        historicAvg: p.historicAvg,
        diff: p.diff,
      }));

      const precipPoints = parseOwid(precipData, country.owidEntityId, currentYear, currentMonth, false);
      let precipYearly = null;
      if (precipPoints.length > 0) {
        precipYearly = precipPoints.map((p, i, arr) => {
          let rollingAvg;
          if (i >= 9) {
            const slice = arr.slice(i - 9, i + 1);
            rollingAvg = Math.round((slice.reduce((a, b) => a + b.value, 0) / slice.length) * 10) / 10;
          }
          return { year: p.year, value: p.value, rollingAvg };
        });
      }

      const result = {
        country: country.name,
        code: country.owidCode,
        yearlyData,
        monthlyComparison,
        latestMonthStats: buildLatestMonthStats(statsPoints),
        latestThreeMonthStats: buildLatestThreeMonthStats(statsPoints),
        monthlyAll: monthly.map((p) => ({ year: p.year, month: p.month, value: p.value })),
        precipYearly,
        dataPoints: monthly.length,
        dateRange: `${monthly[0].date} to ${monthly[monthly.length - 1].date}`,
        lastUpdated: cacheKey,
        generatedAt: new Date().toISOString(),
      };

      const outPath = resolve(OUTPUT_DIR, `${country.owidCode}.json`);
      await writeFile(outPath, JSON.stringify(result), 'utf8');
      ok++;
      console.log(`  ✓ ${country.owidCode.padEnd(3)} ${country.name.padEnd(22)} ${monthly.length.toString().padStart(4)} months · latest ${monthly[monthly.length - 1].date}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${country.owidCode} (${country.name}): ${err?.message ?? err}`);
    }
  }

  console.log(`\nDone: ${ok} snapshots written, ${failed} failed. Cache key: ${cacheKey}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
