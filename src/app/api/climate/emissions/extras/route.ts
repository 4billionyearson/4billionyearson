import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

export const maxDuration = 120;

const BULK_URL = 'https://nyc3.digitaloceanspaces.com/owid-public/data/co2/owid-co2-data.json';
const CACHE_KEY = 'climate:emissions:extras:v1';

// Fields we keep from each yearly row (in Mt unless noted)
const FIELDS = [
  'year',
  'co2',                    // Annual fossil+industry CO₂, Mt
  'co2_including_luc',      // Annual CO₂ incl. land-use, Mt
  'coal_co2',               // Mt
  'oil_co2',                // Mt
  'gas_co2',                // Mt
  'cement_co2',             // Mt
  'flaring_co2',            // Mt
  'land_use_change_co2',    // Mt (can be negative for sinks)
  'consumption_co2',        // Mt (trade-adjusted)
  'trade_co2',              // Mt (imports - exports)
  'methane',                // Mt CO₂e
  'nitrous_oxide',          // Mt CO₂e
  'total_ghg',              // Mt CO₂e (incl. LUCF)
  'co2_per_gdp',            // kg CO₂ per int-$ GDP
] as const;

// Limit to 1950+ to cut payload size
const MIN_YEAR = 1950;

// Entities we exclude from "countries" index (kept separately as aggregates)
const EXCLUDED_AGGREGATES = new Set([
  'Africa (GCP)', 'Asia (GCP)', 'Central America (GCP)', 'Europe (GCP)',
  'Middle East (GCP)', 'North America (GCP)', 'Oceania (GCP)', 'South America (GCP)',
  'OECD (GCP)', 'Non-OECD (GCP)',
  'International transport', 'International aviation', 'International shipping',
  'Kuwaiti Oil Fires',
  'Asia (excl. China and India)', 'Europe (excl. EU-27)', 'Europe (excl. EU-28)',
  'North America (excl. USA)',
]);

// Lightweight aggregate names we DO want to keep separately
const KEEP_AGGREGATES = new Set([
  'World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
  'European Union (27)', 'European Union (28)',
  'High-income countries', 'Upper-middle-income countries',
  'Lower-middle-income countries', 'Low-income countries',
]);

type YearlyCompact = { year: number } & Partial<Record<Exclude<(typeof FIELDS)[number], 'year'>, number>>;

interface CountrySlice {
  name: string;
  iso?: string;
  yearly: YearlyCompact[];
  latest: YearlyCompact | null;
}

interface ExtrasIndex {
  countries: Record<string, CountrySlice>;       // country-level only
  aggregates: Record<string, CountrySlice>;      // World, continents, income groups, EU
  fetchedAt: string;
}

async function fetchBulk(): Promise<ExtrasIndex> {
  const res = await fetch(BULK_URL, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`OWID bulk fetch failed: ${res.status}`);
  const raw = await res.json();

  const countries: Record<string, CountrySlice> = {};
  const aggregates: Record<string, CountrySlice> = {};

  for (const [name, entry] of Object.entries(raw as Record<string, any>)) {
    if (EXCLUDED_AGGREGATES.has(name)) continue;
    const data = entry?.data;
    if (!Array.isArray(data) || data.length === 0) continue;

    const yearly: YearlyCompact[] = [];
    for (const row of data) {
      const y = row.year;
      if (typeof y !== 'number' || y < MIN_YEAR) continue;
      const compact: YearlyCompact = { year: y };
      for (const f of FIELDS) {
        if (f === 'year') continue;
        const v = row[f];
        if (v != null && typeof v === 'number' && !Number.isNaN(v)) {
          (compact as any)[f] = Math.round(v * 100) / 100;
        }
      }
      yearly.push(compact);
    }
    if (yearly.length === 0) continue;

    // Find latest year with any CO₂ data
    let latest: YearlyCompact | null = null;
    for (let i = yearly.length - 1; i >= 0; i--) {
      if (yearly[i].co2 != null || yearly[i].methane != null || yearly[i].total_ghg != null) {
        latest = yearly[i];
        break;
      }
    }

    const slice: CountrySlice = {
      name,
      iso: entry.iso_code || undefined,
      yearly,
      latest,
    };

    if (KEEP_AGGREGATES.has(name)) aggregates[name] = slice;
    else if (slice.iso) countries[name] = slice; // only things with ISO codes are "countries"
  }

  return {
    countries,
    aggregates,
    fetchedAt: new Date().toISOString(),
  };
}

async function getIndex(): Promise<ExtrasIndex> {
  const cached = await getCached<ExtrasIndex>(CACHE_KEY);
  if (cached) return cached;
  const fresh = await fetchBulk();
  await setShortTerm(CACHE_KEY, fresh);
  return fresh;
}

function findCountry(index: ExtrasIndex, name: string): CountrySlice | null {
  if (index.aggregates[name]) return index.aggregates[name];
  if (index.countries[name]) return index.countries[name];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(index.countries)) {
    if (k.toLowerCase() === lower) return v;
  }
  for (const [k, v] of Object.entries(index.aggregates)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function buildRankings(index: ExtrasIndex): {
  consumption: { name: string; value: number; year: number }[];
  methane: { name: string; value: number; year: number }[];
  nitrous_oxide: { name: string; value: number; year: number }[];
  total_ghg: { name: string; value: number; year: number }[];
  co2_per_gdp: { name: string; value: number; year: number }[];
  netImporters: { name: string; value: number; year: number; production: number; consumption: number }[];
  netExporters: { name: string; value: number; year: number; production: number; consumption: number }[];
} {
  const rank = (field: keyof YearlyCompact) => {
    const rows: { name: string; value: number; year: number }[] = [];
    for (const [name, c] of Object.entries(index.countries)) {
      const v = c.latest?.[field];
      if (typeof v === 'number' && c.latest) {
        rows.push({ name, value: v, year: c.latest.year });
      }
    }
    rows.sort((a, b) => b.value - a.value);
    return rows.slice(0, 15);
  };

  // Trade rankings: trade_co2 = consumption - production (positive = net importer)
  const tradeRows: { name: string; value: number; year: number; production: number; consumption: number }[] = [];
  for (const [name, c] of Object.entries(index.countries)) {
    const t = c.latest?.trade_co2;
    const prod = c.latest?.co2;
    const cons = c.latest?.consumption_co2;
    if (typeof t === 'number' && typeof prod === 'number' && typeof cons === 'number' && c.latest) {
      tradeRows.push({ name, value: t, year: c.latest.year, production: prod, consumption: cons });
    }
  }
  // Filter tiny absolute values to avoid noise (< 5 Mt)
  const significant = tradeRows.filter(r => Math.abs(r.value) >= 5);
  const netImporters = [...significant].sort((a, b) => b.value - a.value).slice(0, 10);
  const netExporters = [...significant].sort((a, b) => a.value - b.value).slice(0, 10);

  return {
    consumption: rank('consumption_co2'),
    methane: rank('methane'),
    nitrous_oxide: rank('nitrous_oxide'),
    total_ghg: rank('total_ghg'),
    co2_per_gdp: rank('co2_per_gdp').reverse().slice(-15).reverse(), // descending
    netImporters,
    netExporters,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const view = url.searchParams.get('view') ?? 'global';
  const name = url.searchParams.get('name');

  let index: ExtrasIndex;
  try {
    index = await getIndex();
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load bulk data' }, { status: 500 });
  }

  if (view === 'country') {
    if (!name) return NextResponse.json({ error: 'Missing ?name=' }, { status: 400 });
    const found = findCountry(index, name);
    if (!found) return NextResponse.json({ error: `Country '${name}' not found` }, { status: 404 });
    return NextResponse.json({
      country: found,
      fetchedAt: index.fetchedAt,
    });
  }

  // view=global - return world series + rankings of extras
  const world = index.aggregates['World'];
  if (!world) return NextResponse.json({ error: 'World aggregate missing' }, { status: 500 });

  return NextResponse.json({
    world,
    aggregates: {
      // include continent-level for context (slim)
      africa: index.aggregates['Africa']?.latest ?? null,
      asia: index.aggregates['Asia']?.latest ?? null,
      europe: index.aggregates['Europe']?.latest ?? null,
      north_america: index.aggregates['North America']?.latest ?? null,
      south_america: index.aggregates['South America']?.latest ?? null,
      oceania: index.aggregates['Oceania']?.latest ?? null,
    },
    rankings: buildRankings(index),
    fetchedAt: index.fetchedAt,
  });
}
