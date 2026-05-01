import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

export const maxDuration = 60;

const BY_COUNTRY_CACHE_KEY = 'climate:emissions:byCountry:v1';

const INDICATORS = {
  annual: 1119906,       // Annual CO₂ emissions (tonnes)
  perCapita: 1119914,    // Annual CO₂ per capita (t/person)
  cumulative: 1119881,   // Cumulative CO₂ (tonnes)
};

// Aggregates / non-country entities to exclude from per-country data
const EXCLUDE_NAMES = new Set([
  'World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
  'European Union (27)', 'European Union (28)', 'High-income countries',
  'Upper-middle-income countries', 'Lower-middle-income countries', 'Low-income countries',
  'Asia (excl. China and India)', 'Europe (excl. EU-27)', 'Europe (excl. EU-28)',
  'North America (excl. USA)', 'International transport', 'International aviation',
  'International shipping', 'Kuwaiti Oil Fires',
]);

// OWID continent aggregate names — NOT excluded when requested via ?continent=
const CONTINENT_AGGREGATE_NAMES = new Set([
  'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
]);

interface YearPoint { year: number; value: number }

interface ByCountryEntry {
  annual: YearPoint[];
  perCapita: YearPoint[];
  cumulative: YearPoint[];
  latestYear: number;
  latestAnnual: number | null;
  latestPerCapita: number | null;
  latestCumulative: number | null;
  annualRank: number | null;
  annualOf: number;
  perCapRank: number | null;
  perCapOf: number;
}

interface ByCountryIndex {
  countries: Record<string, ByCountryEntry>;
  continents: Record<string, ByCountryEntry>;
  worldAnnualLatest: number;
  worldAnnualLatestYear: number;
  fetchedAt: string;
}

async function fetchJSON(url: string, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

async function fetchEntityMap(indicatorId: number): Promise<Record<number, string>> {
  const data = await fetchJSON(`https://api.ourworldindata.org/v1/indicators/${indicatorId}.metadata.json`);
  if (!data?.dimensions?.entities?.values) return {};
  const map: Record<number, string> = {};
  for (const e of data.dimensions.entities.values) map[e.id] = e.name;
  return map;
}

function parseOWID(data: any): { year: number; entityId: number; value: number }[] {
  if (!data?.years) return [];
  const { years, entities, values } = data;
  const result: { year: number; entityId: number; value: number }[] = [];
  for (let i = 0; i < years.length; i++) {
    result.push({ year: years[i], entityId: entities[i], value: values[i] });
  }
  return result;
}

function isCountry(name: string): boolean {
  if (EXCLUDE_NAMES.has(name)) return false;
  if (name.includes('(GCP)')) return false;
  if (name.includes('(excl.')) return false;
  return true;
}

function groupByCountry(
  rows: { year: number; entityId: number; value: number }[],
  entityMap: Record<number, string>,
): Record<string, YearPoint[]> {
  const out: Record<string, YearPoint[]> = {};
  for (const r of rows) {
    const name = entityMap[r.entityId];
    if (!name || !isCountry(name)) continue;
    if (!out[name]) out[name] = [];
    out[name].push({ year: r.year, value: r.value });
  }
  for (const name of Object.keys(out)) {
    out[name].sort((a, b) => a.year - b.year);
  }
  return out;
}

function groupByContinent(
  rows: { year: number; entityId: number; value: number }[],
  entityMap: Record<number, string>,
): Record<string, YearPoint[]> {
  const out: Record<string, YearPoint[]> = {};
  for (const r of rows) {
    const name = entityMap[r.entityId];
    if (!name || !CONTINENT_AGGREGATE_NAMES.has(name)) continue;
    if (!out[name]) out[name] = [];
    out[name].push({ year: r.year, value: r.value });
  }
  for (const name of Object.keys(out)) {
    out[name].sort((a, b) => a.year - b.year);
  }
  return out;
}

function getWorldSeries(
  rows: { year: number; entityId: number; value: number }[],
  entityMap: Record<number, string>,
): YearPoint[] {
  const worldId = Object.entries(entityMap).find(([, n]) => n === 'World')?.[0];
  if (!worldId) return [];
  return rows
    .filter((r) => r.entityId === Number(worldId))
    .map((r) => ({ year: r.year, value: r.value }))
    .sort((a, b) => a.year - b.year);
}

async function buildIndex(): Promise<ByCountryIndex> {
  const [annualData, perCapData, cumulData, entityMap] = await Promise.all([
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.annual}.data.json`),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.perCapita}.data.json`),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.cumulative}.data.json`),
    fetchEntityMap(INDICATORS.annual),
  ]);

  if (!annualData || !perCapData || !cumulData || !entityMap || Object.keys(entityMap).length === 0) {
    throw new Error('OWID fetch failed');
  }

  const annualRows = parseOWID(annualData);
  const perCapRows = parseOWID(perCapData);
  const cumulRows = parseOWID(cumulData);

  const annualBy = groupByCountry(annualRows, entityMap);
  const perCapBy = groupByCountry(perCapRows, entityMap);
  const cumulBy = groupByCountry(cumulRows, entityMap);

  const annualByCont = groupByContinent(annualRows, entityMap);
  const perCapByCont = groupByContinent(perCapRows, entityMap);
  const cumulByCont = groupByContinent(cumulRows, entityMap);

  // World totals (latest)
  const worldAnnual = getWorldSeries(annualRows, entityMap);
  const worldLatest = worldAnnual[worldAnnual.length - 1];

  // Build entries
  const allNames = new Set<string>([
    ...Object.keys(annualBy),
    ...Object.keys(perCapBy),
    ...Object.keys(cumulBy),
  ]);

  const entries: Record<string, ByCountryEntry> = {};
  for (const name of allNames) {
    const annual = annualBy[name] ?? [];
    const perCapita = perCapBy[name] ?? [];
    const cumulative = cumulBy[name] ?? [];
    const latestAnnualPoint = annual[annual.length - 1];
    const latestPerCapPoint = perCapita[perCapita.length - 1];
    const latestCumulPoint = cumulative[cumulative.length - 1];
    entries[name] = {
      annual,
      perCapita,
      cumulative,
      latestYear: latestAnnualPoint?.year ?? latestPerCapPoint?.year ?? 0,
      latestAnnual: latestAnnualPoint?.value ?? null,
      latestPerCapita: latestPerCapPoint?.value ?? null,
      latestCumulative: latestCumulPoint?.value ?? null,
      annualRank: null,
      annualOf: 0,
      perCapRank: null,
      perCapOf: 0,
    };
  }

  // Rank by latest annual + latest per-capita
  const annualSortable = Object.entries(entries)
    .filter(([, e]) => e.latestAnnual != null)
    .sort((a, b) => (b[1].latestAnnual as number) - (a[1].latestAnnual as number));
  annualSortable.forEach(([n], i) => {
    entries[n].annualRank = i + 1;
  });
  for (const n of Object.keys(entries)) entries[n].annualOf = annualSortable.length;

  const perCapSortable = Object.entries(entries)
    .filter(([, e]) => e.latestPerCapita != null)
    .sort((a, b) => (b[1].latestPerCapita as number) - (a[1].latestPerCapita as number));
  perCapSortable.forEach(([n], i) => {
    entries[n].perCapRank = i + 1;
  });
  for (const n of Object.keys(entries)) entries[n].perCapOf = perCapSortable.length;

  // Continent aggregates from OWID — no rank, just the series.
  const continentEntries: Record<string, ByCountryEntry> = {};
  const allContNames = new Set<string>([
    ...Object.keys(annualByCont),
    ...Object.keys(perCapByCont),
    ...Object.keys(cumulByCont),
  ]);
  for (const name of allContNames) {
    const annual = annualByCont[name] ?? [];
    const perCapita = perCapByCont[name] ?? [];
    const cumulative = cumulByCont[name] ?? [];
    const a = annual[annual.length - 1];
    const p = perCapita[perCapita.length - 1];
    const c = cumulative[cumulative.length - 1];
    continentEntries[name] = {
      annual,
      perCapita,
      cumulative,
      latestYear: a?.year ?? p?.year ?? 0,
      latestAnnual: a?.value ?? null,
      latestPerCapita: p?.value ?? null,
      latestCumulative: c?.value ?? null,
      annualRank: null,
      annualOf: 0,
      perCapRank: null,
      perCapOf: 0,
    };
  }

  return {
    countries: entries,
    continents: continentEntries,
    worldAnnualLatest: worldLatest?.value ?? 0,
    worldAnnualLatestYear: worldLatest?.year ?? 0,
    fetchedAt: new Date().toISOString(),
  };
}

function findCountry(index: ByCountryIndex, name: string): { key: string; entry: ByCountryEntry } | null {
  const direct = index.countries[name];
  if (direct) return { key: name, entry: direct };
  const lower = name.toLowerCase();
  const matchKey = Object.keys(index.countries).find((k) => k.toLowerCase() === lower);
  if (matchKey) return { key: matchKey, entry: index.countries[matchKey] };
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  const continent = url.searchParams.get('continent');
  if (!name && !continent) {
    return NextResponse.json({ error: 'Missing required ?name= or ?continent= parameter' }, { status: 400 });
  }

  let index = await getCached<ByCountryIndex>(BY_COUNTRY_CACHE_KEY);
  if (!index || !index.continents) {
    try {
      index = await buildIndex();
      await setShortTerm(BY_COUNTRY_CACHE_KEY, index);
    } catch (e: any) {
      return NextResponse.json({ error: e.message ?? 'Failed to build emissions index' }, { status: 500 });
    }
  }

  if (continent) {
    const entry = index.continents[continent];
    if (!entry) {
      return NextResponse.json({ error: `Continent '${continent}' not found in OWID aggregates` }, { status: 404 });
    }
    const globalSharePct = entry.latestAnnual != null && index.worldAnnualLatest > 0
      ? (entry.latestAnnual / index.worldAnnualLatest) * 100
      : null;
    return NextResponse.json({
      country: { name: continent, ...entry, globalSharePct },
      world: { annualLatest: index.worldAnnualLatest, annualLatestYear: index.worldAnnualLatestYear },
      fetchedAt: index.fetchedAt,
    });
  }

  const found = findCountry(index, name as string);
  if (!found) {
    return NextResponse.json({ error: `Country '${name}' not found` }, { status: 404 });
  }

  const { key, entry } = found;
  const globalSharePct = entry.latestAnnual != null && index.worldAnnualLatest > 0
    ? (entry.latestAnnual / index.worldAnnualLatest) * 100
    : null;

  return NextResponse.json({
    country: {
      name: key,
      ...entry,
      globalSharePct,
    },
    world: {
      annualLatest: index.worldAnnualLatest,
      annualLatestYear: index.worldAnnualLatestYear,
    },
    fetchedAt: index.fetchedAt,
  });
}
