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
import { readFile } from 'node:fs/promises';
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
const CCKP_PRECIP_DIR = resolve(__dirname, '..', 'public', 'data', 'climate', 'country-precip');

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
  { owidEntityId: 12, owidCode: 'RUS', name: 'Russia' },
  { owidEntityId: 81, owidCode: 'ZAF', name: 'South Africa' },
  { owidEntityId: 65, owidCode: 'EGY', name: 'Egypt' },
  { owidEntityId: 70, owidCode: 'TUR', name: 'Turkey' },
  { owidEntityId: 75, owidCode: 'THA', name: 'Thailand' },
  { owidEntityId: 84, owidCode: 'VNM', name: 'Vietnam' },
  { owidEntityId: 96, owidCode: 'PHL', name: 'Philippines' },
  { owidEntityId: 170, owidCode: 'COL', name: 'Colombia' },
  { owidEntityId: 11, owidCode: 'POL', name: 'Poland' },
  { owidEntityId: 5, owidCode: 'NLD', name: 'Netherlands' },
  { owidEntityId: 4, owidCode: 'BEL', name: 'Belgium' },
  { owidEntityId: 10, owidCode: 'SWE', name: 'Sweden' },
  { owidEntityId: 102, owidCode: 'NOR', name: 'Norway' },
  { owidEntityId: 161, owidCode: 'DNK', name: 'Denmark' },
  { owidEntityId: 155, owidCode: 'FIN', name: 'Finland' },
  { owidEntityId: 2, owidCode: 'IRL', name: 'Ireland' },
  { owidEntityId: 95, owidCode: 'PRT', name: 'Portugal' },
  { owidEntityId: 149, owidCode: 'GRC', name: 'Greece' },
  { owidEntityId: 24, owidCode: 'AUT', name: 'Austria' },
  { owidEntityId: 7, owidCode: 'CHE', name: 'Switzerland' },
  { owidEntityId: 106, owidCode: 'NZL', name: 'New Zealand' },
  { owidEntityId: 90, owidCode: 'SAU', name: 'Saudi Arabia' },
  { owidEntityId: 72, owidCode: 'ARE', name: 'United Arab Emirates' },
  { owidEntityId: 134, owidCode: 'IRQ', name: 'Iraq' },
  { owidEntityId: 135, owidCode: 'IRN', name: 'Iran' },
  { owidEntityId: 28, owidCode: 'BGD', name: 'Bangladesh' },
  { owidEntityId: 141, owidCode: 'LKA', name: 'Sri Lanka' },
  { owidEntityId: 142, owidCode: 'MMR', name: 'Myanmar' },
  { owidEntityId: 67, owidCode: 'UKR', name: 'Ukraine' },
  { owidEntityId: 92, owidCode: 'ROU', name: 'Romania' },
  { owidEntityId: 138, owidCode: 'HUN', name: 'Hungary' },
  { owidEntityId: 162, owidCode: 'CZE', name: 'Czechia' },
  { owidEntityId: 64, owidCode: 'TZA', name: 'Tanzania' },
  { owidEntityId: 150, owidCode: 'GHA', name: 'Ghana' },
  { owidEntityId: 68, owidCode: 'UGA', name: 'Uganda' },
  { owidEntityId: 167, owidCode: 'COD', name: 'DR Congo' },
  { owidEntityId: 17, owidCode: 'DZA', name: 'Algeria' },
  { owidEntityId: 77, owidCode: 'SYR', name: 'Syria' },
  { owidEntityId: 132, owidCode: 'JAM', name: 'Jamaica' },
  { owidEntityId: 207, owidCode: 'ISL', name: 'Iceland' },
  // ── Phase 2 coverage expansion: +91 countries from OWID CCKP ────────────
  { owidEntityId: 15, owidCode: 'AFG', name: 'Afghanistan' },
  { owidEntityId: 16, owidCode: 'ALB', name: 'Albania' },
  { owidEntityId: 19, owidCode: 'AGO', name: 'Angola' },
  { owidEntityId: 22, owidCode: 'ARM', name: 'Armenia' },
  { owidEntityId: 25, owidCode: 'AZE', name: 'Azerbaijan' },
  { owidEntityId: 26, owidCode: 'BHS', name: 'Bahamas' },
  { owidEntityId: 30, owidCode: 'BLR', name: 'Belarus' },
  { owidEntityId: 31, owidCode: 'BLZ', name: 'Belize' },
  { owidEntityId: 32, owidCode: 'BEN', name: 'Benin' },
  { owidEntityId: 33, owidCode: 'BTN', name: 'Bhutan' },
  { owidEntityId: 35, owidCode: 'BIH', name: 'Bosnia and Herzegovina' },
  { owidEntityId: 36, owidCode: 'BWA', name: 'Botswana' },
  { owidEntityId: 38, owidCode: 'BRN', name: 'Brunei' },
  { owidEntityId: 39, owidCode: 'BGR', name: 'Bulgaria' },
  { owidEntityId: 40, owidCode: 'BFA', name: 'Burkina Faso' },
  { owidEntityId: 41, owidCode: 'BDI', name: 'Burundi' },
  { owidEntityId: 42, owidCode: 'KHM', name: 'Cambodia' },
  { owidEntityId: 43, owidCode: 'CMR', name: 'Cameroon' },
  { owidEntityId: 174, owidCode: 'CAF', name: 'Central African Republic' },
  { owidEntityId: 173, owidCode: 'TCD', name: 'Chad' },
  { owidEntityId: 165, owidCode: 'HRV', name: 'Croatia' },
  { owidEntityId: 164, owidCode: 'CUB', name: 'Cuba' },
  { owidEntityId: 143, owidCode: 'CIV', name: 'Cote d\'Ivoire' },
  { owidEntityId: 154, owidCode: 'DJI', name: 'Djibouti' },
  { owidEntityId: 160, owidCode: 'DOM', name: 'Dominican Republic' },
  { owidEntityId: 201, owidCode: 'ECU', name: 'Ecuador' },
  { owidEntityId: 259, owidCode: 'SLV', name: 'El Salvador' },
  { owidEntityId: 159, owidCode: 'GNQ', name: 'Equatorial Guinea' },
  { owidEntityId: 157, owidCode: 'ERI', name: 'Eritrea' },
  { owidEntityId: 156, owidCode: 'EST', name: 'Estonia' },
  { owidEntityId: 202, owidCode: 'FJI', name: 'Fiji' },
  { owidEntityId: 153, owidCode: 'GAB', name: 'Gabon' },
  { owidEntityId: 151, owidCode: 'GMB', name: 'Gambia' },
  { owidEntityId: 152, owidCode: 'GEO', name: 'Georgia' },
  { owidEntityId: 205, owidCode: 'GRL', name: 'Greenland' },
  { owidEntityId: 148, owidCode: 'GTM', name: 'Guatemala' },
  { owidEntityId: 147, owidCode: 'GIN', name: 'Guinea' },
  { owidEntityId: 94, owidCode: 'GNB', name: 'Guinea-Bissau' },
  { owidEntityId: 145, owidCode: 'HTI', name: 'Haiti' },
  { owidEntityId: 139, owidCode: 'HND', name: 'Honduras' },
  { owidEntityId: 130, owidCode: 'JOR', name: 'Jordan' },
  { owidEntityId: 131, owidCode: 'KAZ', name: 'Kazakhstan' },
  { owidEntityId: 379, owidCode: 'XKX', name: 'Kosovo' },
  { owidEntityId: 208, owidCode: 'KWT', name: 'Kuwait' },
  { owidEntityId: 126, owidCode: 'KGZ', name: 'Kyrgyzstan' },
  { owidEntityId: 125, owidCode: 'LAO', name: 'Laos' },
  { owidEntityId: 122, owidCode: 'LVA', name: 'Latvia' },
  { owidEntityId: 123, owidCode: 'LSO', name: 'Lesotho' },
  { owidEntityId: 121, owidCode: 'LBR', name: 'Liberia' },
  { owidEntityId: 120, owidCode: 'LBY', name: 'Libya' },
  { owidEntityId: 119, owidCode: 'LTU', name: 'Lithuania' },
  { owidEntityId: 210, owidCode: 'LUX', name: 'Luxembourg' },
  { owidEntityId: 118, owidCode: 'MDG', name: 'Madagascar' },
  { owidEntityId: 115, owidCode: 'MLI', name: 'Mali' },
  { owidEntityId: 114, owidCode: 'MRT', name: 'Mauritania' },
  { owidEntityId: 111, owidCode: 'MDA', name: 'Moldova' },
  { owidEntityId: 112, owidCode: 'MNG', name: 'Mongolia' },
  { owidEntityId: 215, owidCode: 'MNE', name: 'Montenegro' },
  { owidEntityId: 109, owidCode: 'MOZ', name: 'Mozambique' },
  { owidEntityId: 108, owidCode: 'NAM', name: 'Namibia' },
  { owidEntityId: 107, owidCode: 'NPL', name: 'Nepal' },
  { owidEntityId: 220, owidCode: 'NCL', name: 'New Caledonia' },
  { owidEntityId: 104, owidCode: 'NER', name: 'Niger' },
  { owidEntityId: 217, owidCode: 'OMN', name: 'Oman' },
  { owidEntityId: 100, owidCode: 'PAN', name: 'Panama' },
  { owidEntityId: 99, owidCode: 'PNG', name: 'Papua New Guinea' },
  { owidEntityId: 98, owidCode: 'PRY', name: 'Paraguay' },
  { owidEntityId: 93, owidCode: 'PRI', name: 'Puerto Rico' },
  { owidEntityId: 226, owidCode: 'QAT', name: 'Qatar' },
  { owidEntityId: 91, owidCode: 'RWA', name: 'Rwanda' },
  { owidEntityId: 89, owidCode: 'SEN', name: 'Senegal' },
  { owidEntityId: 88, owidCode: 'SRB', name: 'Serbia' },
  { owidEntityId: 87, owidCode: 'SLE', name: 'Sierra Leone' },
  { owidEntityId: 85, owidCode: 'SVK', name: 'Slovakia' },
  { owidEntityId: 83, owidCode: 'SVN', name: 'Slovenia' },
  { owidEntityId: 195, owidCode: 'SLB', name: 'Solomon Islands' },
  { owidEntityId: 79, owidCode: 'SDN', name: 'Sudan' },
  { owidEntityId: 76, owidCode: 'TJK', name: 'Tajikistan' },
  { owidEntityId: 225, owidCode: 'TLS', name: 'East Timor' },
  { owidEntityId: 74, owidCode: 'TGO', name: 'Togo' },
  { owidEntityId: 73, owidCode: 'TTO', name: 'Trinidad and Tobago' },
  { owidEntityId: 71, owidCode: 'TUN', name: 'Tunisia' },
  { owidEntityId: 69, owidCode: 'TKM', name: 'Turkmenistan' },
  { owidEntityId: 63, owidCode: 'URY', name: 'Uruguay' },
  { owidEntityId: 62, owidCode: 'UZB', name: 'Uzbekistan' },
  { owidEntityId: 221, owidCode: 'VUT', name: 'Vanuatu' },
  { owidEntityId: 238, owidCode: 'VEN', name: 'Venezuela' },
  { owidEntityId: 61, owidCode: 'YEM', name: 'Yemen' },
  { owidEntityId: 60, owidCode: 'ZMB', name: 'Zambia' },
  { owidEntityId: 80, owidCode: 'ZWE', name: 'Zimbabwe' },
  { owidEntityId: 78, owidCode: 'SWZ', name: 'Eswatini' },
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

      // ── Monthly precipitation (from World Bank CCKP / CRU TS) ────────
      // The aggregated CCKP file at public/data/climate/country-precip/<CODE>.json
      // carries ~123 years × 12 months of precip. When present, derive the
      // same pre-computed structure US states use (yearly / monthlyComparison /
      // latestMonthStats / latestThreeMonthStats) so the dashboard and profile
      // pages can render a recent-vs-historic monthly comparison chart for
      // countries — previously only US states / UK regions had this.
      let precipMonthly = null;
      try {
        const raw = await readFile(resolve(CCKP_PRECIP_DIR, `${country.owidCode}.json`), 'utf8');
        const cckp = JSON.parse(raw);
        const pts = Array.isArray(cckp?.monthlyAll) ? cckp.monthlyAll : [];
        if (pts.length >= 24) {
          precipMonthly = {
            source: cckp.source || 'World Bank CKP (CRU TS 4.08)',
            sourceUrl: cckp.sourceUrl || 'https://climateknowledgeportal.worldbank.org/',
            units: 'mm',
            yearRange: cckp.yearRange || [pts[0].year, pts[pts.length - 1].year],
            yearly: buildYearlyFromMonthly(pts, { isSum: true }),
            monthlyComparison: buildMonthlyComparison(pts),
            latestMonthStats: buildLatestMonthStats(pts),
            latestThreeMonthStats: buildLatestThreeMonthStats(pts),
          };
        }
      } catch {
        // Country missing from CCKP cache — leave precipMonthly null. The
        // dashboard still renders the OWID precipYearly chart below.
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
        precipMonthly,
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
