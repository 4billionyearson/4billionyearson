#!/usr/bin/env tsx
/**
 * Build the global "Shifting Seasons" summary by running the shared
 * shift-analysis over every country, US state and UK region snapshot.
 *
 * Produces per-region records with:
 *   • warm-season length + spring/autumn crossings (warm-cold regions)
 *   • wet-season length + peak-rain-month + wet-season onset shift (wet-dry regions)
 *   • month-by-month warming (all regions)
 *   • an explicit seasonality classification so the UI can label each region.
 *
 * Writes public/data/seasons/shift-global.json.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  analyseRainfall,
  analyseTemperature,
  classifyKoppen,
  classifySeasonality,
  type KoppenResult,
  type MonthlyPoint,
  type RainShift,
  type SeasonalityKind,
  type TempShift,
} from '../src/lib/climate/shift-analysis';

const ROOT = path.resolve(process.cwd(), 'public/data/climate');
const PRECIP_ROOT = path.resolve(process.cwd(), 'public/data/climate/country-precip');
const OUT = path.resolve(process.cwd(), 'public/data/seasons/shift-global.json');

// Country display-name → geojson feature name for rows that differ
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  'DR Congo': 'Dem. Rep. Congo',
  'South Sudan': 'S. Sudan',
  'United States': 'United States of America',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'Central African Republic': 'Central African Rep.',
  "Cote d'Ivoire": "Côte d'Ivoire",
  'Dominican Republic': 'Dominican Rep.',
  'Equatorial Guinea': 'Eq. Guinea',
  'Solomon Islands': 'Solomon Is.',
  'East Timor': 'Timor-Leste',
  'Eswatini': 'eSwatini',
};

type ShiftRecord = {
  kind: 'country' | 'us-state' | 'uk-region';
  code?: string;
  slug?: string;
  id?: string;
  name: string;
  geojsonName?: string;
  seasonality: SeasonalityKind;
  koppen: KoppenResult | null;
  windows: {
    baselineStart: number;
    baselineEnd: number;
    recentStart: number;
    recentEnd: number;
  };
  yearsCoverage: number;
  temp: TempShift;
  rain: RainShift | null;
};

async function readJson<T = any>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function loadPrecip(code: string): Promise<MonthlyPoint[] | null> {
  try {
    const d = await readJson<{ monthlyAll: MonthlyPoint[] }>(path.join(PRECIP_ROOT, `${code}.json`));
    return d.monthlyAll ?? null;
  } catch {
    return null;
  }
}

async function analyseRegion(
  kind: ShiftRecord['kind'],
  name: string,
  tempMonthly: MonthlyPoint[] | undefined | null,
  rainMonthly: MonthlyPoint[] | undefined | null,
  extras: Partial<ShiftRecord>,
): Promise<ShiftRecord | null> {
  if (!tempMonthly?.length) return null;
  const res = analyseTemperature(tempMonthly);
  if (!res) return null;
  const rain = analyseRainfall(rainMonthly ?? null);
  const seasonality = classifySeasonality(res.temp, rain);
  const koppen = classifyKoppen(res.temp.baselineMonthly, rain?.baselineMonthly ?? null);

  return {
    kind,
    name,
    seasonality,
    koppen,
    windows: res.windows,
    yearsCoverage: res.yearsCoverage,
    temp: res.temp,
    rain,
    ...extras,
  };
}

async function main(): Promise<void> {
  const countries: ShiftRecord[] = [];
  const usStates: ShiftRecord[] = [];
  const ukRegions: ShiftRecord[] = [];

  // ── Countries ─────────────────────────────────────────────────────────
  const countryDir = path.join(ROOT, 'country');
  for (const f of (await fs.readdir(countryDir)).filter((x) => x.endsWith('.json'))) {
    const d = await readJson<any>(path.join(countryDir, f));
    const code: string = d.code;
    const precip = await loadPrecip(code);
    const rec = await analyseRegion('country', d.country, d.monthlyAll, precip, {
      code,
      slug: code,
      geojsonName: COUNTRY_NAME_ALIASES[d.country] || d.country,
    });
    if (rec) countries.push(rec);
  }

  // ── US states ────────────────────────────────────────────────────────
  const usDir = path.join(ROOT, 'us-state');
  for (const f of (await fs.readdir(usDir)).filter((x) => x.endsWith('.json'))) {
    const d = await readJson<any>(path.join(usDir, f));
    const rec = await analyseRegion(
      'us-state',
      d.state,
      d.paramData?.tavg?.monthlyAll,
      d.paramData?.pcp?.monthlyAll,
      { id: d.id },
    );
    if (rec) usStates.push(rec);
  }

  // ── UK regions ───────────────────────────────────────────────────────
  const ukDir = path.join(ROOT, 'uk-region');
  for (const f of (await fs.readdir(ukDir)).filter((x) => x.endsWith('.json'))) {
    const d = await readJson<any>(path.join(ukDir, f));
    const rec = await analyseRegion(
      'uk-region',
      d.region,
      d.varData?.Tmean?.monthlyAll,
      d.varData?.Rainfall?.monthlyAll,
      { id: d.id },
    );
    if (rec) ukRegions.push(rec);
  }

  const all = [...countries, ...usStates, ...ukRegions];

  // ── Aggregate headline stats ─────────────────────────────────────────
  const warmCold = all.filter((r) => r.seasonality === 'warm-cold' || r.seasonality === 'mixed');
  const wetDry = all.filter((r) => r.seasonality === 'wet-dry' || r.seasonality === 'mixed');
  const aseasonal = all.filter((r) => r.seasonality === 'aseasonal');

  const withCrossings = warmCold.filter(
    (r) => r.temp.springShiftDays !== null && r.temp.autumnShiftDays !== null,
  );
  const earlierSprings = withCrossings.filter((r) => (r.temp.springShiftDays ?? 0) < 0).length;
  const laterAutumns = withCrossings.filter((r) => (r.temp.autumnShiftDays ?? 0) > 0).length;

  const meanSpringShift = withCrossings.length
    ? withCrossings.reduce((a, b) => a + (b.temp.springShiftDays ?? 0), 0) / withCrossings.length
    : null;
  const meanAutumnShift = withCrossings.length
    ? withCrossings.reduce((a, b) => a + (b.temp.autumnShiftDays ?? 0), 0) / withCrossings.length
    : null;
  const meanNetShiftMonths = warmCold.length
    ? warmCold.reduce((a, b) => a + b.temp.netShiftMonths, 0) / warmCold.length
    : null;

  // Wet/dry aggregates: onset shifts, peak-month shifts (circular distance in months)
  const wetDryWithRain = wetDry.filter((r) => r.rain);
  const wetDryWithOnset = wetDryWithRain.filter((r) => r.rain?.wetSeasonOnsetShiftDays !== null);
  const meanWetOnsetShift = wetDryWithOnset.length
    ? wetDryWithOnset.reduce((a, b) => a + (b.rain!.wetSeasonOnsetShiftDays ?? 0), 0) / wetDryWithOnset.length
    : null;
  const wetSeasonsShorter = wetDryWithRain.filter((r) => (r.rain!.wetSeasonShiftMonths ?? 0) < 0).length;
  const wetSeasonsLonger = wetDryWithRain.filter((r) => (r.rain!.wetSeasonShiftMonths ?? 0) > 0).length;
  const meanAnnualRainShiftPct = wetDryWithRain.length
    ? wetDryWithRain.reduce((a, b) => a + (b.rain!.annualTotalShiftPct ?? 0), 0) / wetDryWithRain.length
    : null;

  const warmestMonthShifted = warmCold.filter((r) => r.temp.warmestMonthShiftIndex !== 0).length;

  // Köppen group tallies
  const koppenGroupCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const koppenCodeCounts: Record<string, number> = {};
  for (const r of all) {
    if (!r.koppen) continue;
    koppenGroupCounts[r.koppen.group] = (koppenGroupCounts[r.koppen.group] ?? 0) + 1;
    koppenCodeCounts[r.koppen.code] = (koppenCodeCounts[r.koppen.code] ?? 0) + 1;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    globalStats: {
      totalAnalysed: all.length,
      countriesAnalysed: countries.length,
      usStatesAnalysed: usStates.length,
      ukRegionsAnalysed: ukRegions.length,
      seasonalityCounts: {
        warmCold: all.filter((r) => r.seasonality === 'warm-cold').length,
        wetDry: all.filter((r) => r.seasonality === 'wet-dry').length,
        mixed: all.filter((r) => r.seasonality === 'mixed').length,
        aseasonal: aseasonal.length,
      },
      koppenGroupCounts,
      koppenCodeCounts,
      warmColdStats: {
        total: warmCold.length,
        withCrossings: withCrossings.length,
        earlierSprings,
        laterAutumns,
        meanSpringShift: meanSpringShift === null ? null : +meanSpringShift.toFixed(1),
        meanAutumnShift: meanAutumnShift === null ? null : +meanAutumnShift.toFixed(1),
        meanNetShiftMonths: meanNetShiftMonths === null ? null : +meanNetShiftMonths.toFixed(2),
        warmestMonthShifted,
      },
      wetDryStats: {
        total: wetDry.length,
        withRainData: wetDryWithRain.length,
        wetSeasonsShorter,
        wetSeasonsLonger,
        meanWetSeasonOnsetShiftDays: meanWetOnsetShift === null ? null : +meanWetOnsetShift.toFixed(1),
        meanAnnualRainfallShiftPct: meanAnnualRainShiftPct === null ? null : +meanAnnualRainShiftPct.toFixed(1),
      },
    },
    countries: countries.sort((a, b) => a.name.localeCompare(b.name)),
    usStates: usStates.sort((a, b) => a.name.localeCompare(b.name)),
    ukRegions: ukRegions.sort((a, b) => a.name.localeCompare(b.name)),
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(output));
  console.log(`✓ Wrote ${OUT}`);
  console.log(`  ${all.length} regions analysed`);
  console.log(`  Seasonality: warm-cold=${output.globalStats.seasonalityCounts.warmCold}, wet-dry=${output.globalStats.seasonalityCounts.wetDry}, mixed=${output.globalStats.seasonalityCounts.mixed}, aseasonal=${output.globalStats.seasonalityCounts.aseasonal}`);
  console.log(`  Köppen groups: A=${koppenGroupCounts.A} B=${koppenGroupCounts.B} C=${koppenGroupCounts.C} D=${koppenGroupCounts.D} E=${koppenGroupCounts.E}`);
  const topCodes = Object.entries(koppenCodeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`  Top codes: ${topCodes.map(([c, n]) => `${c}=${n}`).join(' ')}`);
  console.log(`  Warm/cold: ${earlierSprings}/${withCrossings.length} earlier springs, ${laterAutumns}/${withCrossings.length} later autumns`);
  console.log(`  Wet/dry: ${wetSeasonsLonger} longer / ${wetSeasonsShorter} shorter wet seasons; mean onset shift ${meanWetOnsetShift?.toFixed(1)} d; mean annual rainfall ${meanAnnualRainShiftPct?.toFixed(1)}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
