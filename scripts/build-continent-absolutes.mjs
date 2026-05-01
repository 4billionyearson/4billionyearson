#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build aggregate absolute monthly temperature series for each continent
 * (NOAA 7-continent split, the same one CONTINENT_BY_ISO uses).
 *
 * For each continent, reads the `monthlyAll` array (year/month/value
 * absolute °C) from every member country snapshot
 * (public/data/climate/country/{ISO}.json) and computes a simple mean
 * across the members that have data for each (year, month).
 *
 * This is what powers the spaghetti chart and seasonal-shift card on
 * /climate/{africa,asia,europe,oceania,north-america,south-america}.
 *
 * Output: public/data/climate/continent-absolutes/{slug}.json
 *
 * Usage:
 *   node scripts/build-continent-absolutes.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTRY_DIR = resolve(__dirname, '..', 'public', 'data', 'climate', 'country');
const OUT_DIR = resolve(__dirname, '..', 'public', 'data', 'climate', 'continent-absolutes');

// NOAA 7-continent split. Mirror of CONTINENT_BY_ISO in
// src/lib/climate/editorial.ts. Antarctica intentionally excluded.
const CONTINENT_BY_ISO = {
  // Europe
  GBR: 'europe', FRA: 'europe', DEU: 'europe', ITA: 'europe', ESP: 'europe',
  POL: 'europe', NLD: 'europe', BEL: 'europe', SWE: 'europe', NOR: 'europe',
  DNK: 'europe', FIN: 'europe', IRL: 'europe', PRT: 'europe', GRC: 'europe',
  AUT: 'europe', CHE: 'europe', UKR: 'europe', ROU: 'europe', HUN: 'europe',
  CZE: 'europe', CYP: 'europe', ISL: 'europe',
  // North America (incl. Central America & the Caribbean)
  USA: 'north-america', CAN: 'north-america', MEX: 'north-america',
  CRI: 'north-america', NIC: 'north-america', JAM: 'north-america',
  // South America
  BRA: 'south-america', ARG: 'south-america', CHL: 'south-america',
  COL: 'south-america', PER: 'south-america', BOL: 'south-america',
  GUY: 'south-america', SUR: 'south-america',
  // Asia
  JPN: 'asia', KOR: 'asia', PRK: 'asia', IND: 'asia', CHN: 'asia',
  IDN: 'asia', MYS: 'asia', PHL: 'asia', THA: 'asia', VNM: 'asia',
  PAK: 'asia', BGD: 'asia', LKA: 'asia', MMR: 'asia', IRN: 'asia',
  IRQ: 'asia', ISR: 'asia', LBN: 'asia', PSE: 'asia', SAU: 'asia',
  ARE: 'asia', SYR: 'asia', TUR: 'asia', SGP: 'asia',
  // Africa
  EGY: 'africa', NGA: 'africa', KEN: 'africa', ETH: 'africa', GHA: 'africa',
  UGA: 'africa', TZA: 'africa', MAR: 'africa', DZA: 'africa', ZAF: 'africa',
  MWI: 'africa', SOM: 'africa', COG: 'africa', COD: 'africa', SSD: 'africa',
  // Oceania
  AUS: 'oceania', NZL: 'oceania',
};

const CONTINENTS = ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania'];

const NAME_BY_SLUG = {
  africa: 'Africa', asia: 'Asia', europe: 'Europe', oceania: 'Oceania',
  'north-america': 'North America', 'south-america': 'South America',
};

async function loadCountry(iso) {
  try {
    const raw = await readFile(resolve(COUNTRY_DIR, `${iso}.json`), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Group ISOs by continent
  const isosByContinent = {};
  for (const slug of CONTINENTS) isosByContinent[slug] = [];
  for (const [iso, slug] of Object.entries(CONTINENT_BY_ISO)) {
    isosByContinent[slug].push(iso);
  }

  for (const slug of CONTINENTS) {
    const isos = isosByContinent[slug];
    const memberData = [];
    for (const iso of isos) {
      const d = await loadCountry(iso);
      if (d?.monthlyAll?.length) memberData.push({ iso, monthlyAll: d.monthlyAll });
    }
    if (!memberData.length) {
      console.log(`[${slug}] no member country snapshots — skipping`);
      continue;
    }

    // Build (year,month) -> [values]
    const buckets = new Map();
    for (const m of memberData) {
      for (const p of m.monthlyAll) {
        if (typeof p?.value !== 'number' || !Number.isFinite(p.value)) continue;
        const key = `${p.year}-${p.month}`;
        const arr = buckets.get(key);
        if (arr) arr.push(p.value);
        else buckets.set(key, [p.value]);
      }
    }

    // Require at least half the members to have data for the month, and at
    // least 3 members. Otherwise the early years (when only one country
    // reports) produce a wildly unrepresentative continental mean.
    const minMembers = Math.max(2, Math.ceil(memberData.length * 0.5));

    const monthlyAll = [];
    for (const [key, vals] of buckets) {
      if (vals.length < minMembers) continue;
      const [year, month] = key.split('-').map(Number);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      monthlyAll.push({ year, month, value: Math.round(mean * 100) / 100 });
    }
    monthlyAll.sort((a, b) => (a.year - b.year) || (a.month - b.month));

    const out = {
      slug,
      name: NAME_BY_SLUG[slug],
      memberIsos: memberData.map((m) => m.iso),
      memberCount: memberData.length,
      minMembersPerMonth: minMembers,
      monthlyAll,
      method: 'Equal-weight mean of OWID/CRU country monthly absolute temperatures across members reporting in a given month.',
      note: 'Aggregate built by 4BYO from country snapshots; not a direct continental product. Use as an indicative continental absolute series.',
      generatedAt: new Date().toISOString(),
    };

    const outPath = resolve(OUT_DIR, `${slug}.json`);
    await writeFile(outPath, JSON.stringify(out, null, 2));
    const first = monthlyAll[0];
    const last = monthlyAll[monthlyAll.length - 1];
    console.log(`[${slug}] ${memberData.length} members, ${monthlyAll.length} months  (${first?.year}-${String(first?.month).padStart(2, '0')} → ${last?.year}-${String(last?.month).padStart(2, '0')})`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
