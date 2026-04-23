#!/usr/bin/env node
/**
 * Build the global "Shifting Seasons" summary by computing warm-season-length
 * and spring/autumn crossing-date shifts for every country, US state and UK
 * region we have monthly temperature data for, and writing a single compact
 * summary to public/data/seasons/shift-global.json.
 *
 * Source files are the profile snapshots already built by
 * build-country-snapshots, build-us-state-snapshots and build-uk-region-snapshots.
 *
 * Output shape:
 * {
 *   generatedAt, countries: [...], usStates: [...], ukRegions: [...],
 *   globalStats: { totalAnalysed, earlierSprings, laterAutumns, ... }
 * }
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'public/data/climate');
const OUT = path.resolve(process.cwd(), 'public/data/seasons/shift-global.json');

const MID_MONTH_DOY = [15, 46, 75, 106, 136, 167, 197, 228, 259, 289, 320, 350];

// Country display-name → geojson feature name for the four rows that differ
const COUNTRY_NAME_ALIASES = {
  'DR Congo': 'Dem. Rep. Congo',
  'South Sudan': 'S. Sudan',
  'United States': 'United States of America',
};

function buildCompleteYears(monthlyAll) {
  const byYear = new Map();
  for (const p of monthlyAll) {
    if (!byYear.has(p.year)) byYear.set(p.year, new Map());
    byYear.get(p.year).set(p.month, p.value);
  }
  return [...byYear.entries()]
    .filter(([, m]) => m.size === 12)
    .map(([year, m]) => ({ year, months: Array.from({ length: 12 }, (_, i) => m.get(i + 1)) }))
    .sort((a, b) => a.year - b.year);
}

function findCrossings(monthly, threshold) {
  const above = monthly.map(v => v > threshold);
  if (above.every(Boolean) || !above.some(Boolean)) return null;

  const firstWarm = above.indexOf(true);
  const lastWarm = above.lastIndexOf(true);

  let spring;
  if (firstWarm === 0) {
    spring = 1;
  } else {
    const v0 = monthly[firstWarm - 1];
    const v1 = monthly[firstWarm];
    const frac = (threshold - v0) / (v1 - v0);
    spring = MID_MONTH_DOY[firstWarm - 1] + frac * (MID_MONTH_DOY[firstWarm] - MID_MONTH_DOY[firstWarm - 1]);
  }

  let autumn;
  if (lastWarm === 11) {
    autumn = 365;
  } else {
    const v0 = monthly[lastWarm];
    const v1 = monthly[lastWarm + 1];
    const frac = (v0 - threshold) / (v0 - v1);
    autumn = MID_MONTH_DOY[lastWarm] + frac * (MID_MONTH_DOY[lastWarm + 1] - MID_MONTH_DOY[lastWarm]);
  }

  return { spring, autumn };
}

function computeShift(monthlyAll) {
  if (!monthlyAll?.length) return null;
  const completeYears = buildCompleteYears(monthlyAll);
  if (completeYears.length < 30) return null;

  const baseline = completeYears.slice(0, 30);
  const recent = completeYears.slice(-10);

  let sum = 0, count = 0;
  for (const y of baseline) for (const v of y.months) { sum += v; count += 1; }
  const baselineAnnualMean = sum / count;

  const baselineMonthly = Array.from({ length: 12 }, (_, m) => {
    let s = 0; for (const y of baseline) s += y.months[m]; return s / baseline.length;
  });
  const recentMonthly = Array.from({ length: 12 }, (_, m) => {
    let s = 0; for (const y of recent) s += y.months[m]; return s / recent.length;
  });

  const lengthSeries = completeYears.map(y => y.months.filter(v => v > baselineAnnualMean).length);
  const baselineLen = lengthSeries.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
  const recentLen = lengthSeries.slice(-10).reduce((a, b) => a + b, 0) / 10;

  const baselineCrossings = findCrossings(baselineMonthly, baselineAnnualMean);
  const recentCrossings = findCrossings(recentMonthly, baselineAnnualMean);

  let springShiftDays = null, autumnShiftDays = null;
  if (baselineCrossings && recentCrossings) {
    springShiftDays = recentCrossings.spring - baselineCrossings.spring;
    autumnShiftDays = recentCrossings.autumn - baselineCrossings.autumn;
  }

  // Month with biggest warming
  const diffs = recentMonthly.map((v, i) => v - baselineMonthly[i]);
  const biggestIdx = diffs.reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);

  return {
    baselineStart: baseline[0].year,
    baselineEnd: baseline[baseline.length - 1].year,
    recentStart: recent[0].year,
    recentEnd: recent[recent.length - 1].year,
    baselineAnnualMean: +baselineAnnualMean.toFixed(2),
    baselineLen: +baselineLen.toFixed(2),
    recentLen: +recentLen.toFixed(2),
    netShiftMonths: +(recentLen - baselineLen).toFixed(2),
    springShiftDays: springShiftDays === null ? null : +springShiftDays.toFixed(1),
    autumnShiftDays: autumnShiftDays === null ? null : +autumnShiftDays.toFixed(1),
    biggestMonth: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][biggestIdx],
    biggestMonthWarming: +diffs[biggestIdx].toFixed(2),
    yearsCoverage: completeYears.length,
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function main() {
  const countries = [];
  const usStates = [];
  const ukRegions = [];

  // ── Countries ──────────────────────────────────────────────────────────
  const countryDir = path.join(ROOT, 'country');
  const countryFiles = (await fs.readdir(countryDir)).filter(f => f.endsWith('.json'));
  for (const f of countryFiles) {
    const d = await readJson(path.join(countryDir, f));
    const shift = computeShift(d.monthlyAll);
    if (!shift) continue;
    const name = d.country;
    countries.push({
      code: d.code,
      slug: d.code,
      name,
      geojsonName: COUNTRY_NAME_ALIASES[name] || name,
      ...shift,
    });
  }

  // ── US states ─────────────────────────────────────────────────────────
  const usDir = path.join(ROOT, 'us-state');
  const usFiles = (await fs.readdir(usDir)).filter(f => f.endsWith('.json'));
  for (const f of usFiles) {
    const d = await readJson(path.join(usDir, f));
    const shift = computeShift(d.paramData?.tavg?.monthlyAll);
    if (!shift) continue;
    usStates.push({
      id: d.id,
      name: d.state,
      ...shift,
    });
  }

  // ── UK regions ────────────────────────────────────────────────────────
  const ukDir = path.join(ROOT, 'uk-region');
  const ukFiles = (await fs.readdir(ukDir)).filter(f => f.endsWith('.json'));
  for (const f of ukFiles) {
    const d = await readJson(path.join(ukDir, f));
    const shift = computeShift(d.varData?.Tmean?.monthlyAll);
    if (!shift) continue;
    ukRegions.push({
      id: d.id,
      name: d.region,
      ...shift,
    });
  }

  // ── Aggregate headline stats ──────────────────────────────────────────
  const all = [...countries, ...usStates, ...ukRegions];
  const withCrossings = all.filter(r => r.springShiftDays !== null && r.autumnShiftDays !== null);
  const earlierSprings = withCrossings.filter(r => r.springShiftDays < 0).length;
  const laterAutumns = withCrossings.filter(r => r.autumnShiftDays > 0).length;
  const longerWarmSeasons = all.filter(r => r.netShiftMonths > 0).length;

  const meanSpringShift = withCrossings.length
    ? withCrossings.reduce((a, b) => a + b.springShiftDays, 0) / withCrossings.length
    : null;
  const meanAutumnShift = withCrossings.length
    ? withCrossings.reduce((a, b) => a + b.autumnShiftDays, 0) / withCrossings.length
    : null;
  const meanNetShift = all.length ? all.reduce((a, b) => a + b.netShiftMonths, 0) / all.length : null;

  const output = {
    generatedAt: new Date().toISOString(),
    globalStats: {
      totalAnalysed: all.length,
      countriesAnalysed: countries.length,
      usStatesAnalysed: usStates.length,
      ukRegionsAnalysed: ukRegions.length,
      withSeasonalCrossings: withCrossings.length,
      earlierSprings,
      laterAutumns,
      longerWarmSeasons,
      meanSpringShift: meanSpringShift === null ? null : +meanSpringShift.toFixed(1),
      meanAutumnShift: meanAutumnShift === null ? null : +meanAutumnShift.toFixed(1),
      meanNetShiftMonths: meanNetShift === null ? null : +meanNetShift.toFixed(2),
    },
    countries: countries.sort((a, b) => a.name.localeCompare(b.name)),
    usStates: usStates.sort((a, b) => a.name.localeCompare(b.name)),
    ukRegions: ukRegions.sort((a, b) => a.name.localeCompare(b.name)),
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(output));
  console.log(`✓ Wrote ${OUT}`);
  console.log(`  ${all.length} regions analysed (${countries.length} countries, ${usStates.length} US states, ${ukRegions.length} UK regions)`);
  console.log(`  ${earlierSprings}/${withCrossings.length} now have earlier springs`);
  console.log(`  ${laterAutumns}/${withCrossings.length} now have later autumns`);
  console.log(`  Mean spring shift: ${meanSpringShift?.toFixed(1)} d, mean autumn: ${meanAutumnShift?.toFixed(1)} d`);
}

main().catch(e => { console.error(e); process.exit(1); });
