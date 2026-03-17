import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'climate:emissions:v2';

// OWID indicator IDs (Global Carbon Project via OWID)
const INDICATORS = {
  annual: 1119906,       // Annual CO₂ emissions (tonnes)
  perCapita: 1119914,    // Annual CO₂ per capita (t/person)
  cumulative: 1119881,   // Cumulative CO₂ (tonnes)
};

// Major countries / regions to include (entity IDs from OWID)
// We'll dynamically build the map from metadata rather than hard-coding

async function fetchJSON(url: string, timeout = 20000) {
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

// Fetch entity metadata (ID → name mapping)
async function fetchEntityMap(indicatorId: number): Promise<Record<number, string>> {
  const data = await fetchJSON(
    `https://api.ourworldindata.org/v1/indicators/${indicatorId}.metadata.json`
  );
  if (!data?.dimensions?.entities?.values) return {};
  const map: Record<number, string> = {};
  for (const e of data.dimensions.entities.values) {
    map[e.id] = e.name;
  }
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

// Regions/groupings to exclude from country-level rankings
const EXCLUDE_NAMES = new Set([
  'World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
  'European Union (27)', 'European Union (28)', 'High-income countries',
  'Upper-middle-income countries', 'Lower-middle-income countries', 'Low-income countries',
  'Asia (excl. China and India)', 'Europe (excl. EU-27)', 'Europe (excl. EU-28)',
  'North America (excl. USA)', 'International transport', 'International aviation',
  'International shipping', 'Kuwaiti Oil Fires',
  'Africa (GCP)', 'Asia (GCP)', 'Central America (GCP)', 'Europe (GCP)',
  'Middle East (GCP)', 'North America (GCP)', 'Oceania (GCP)', 'South America (GCP)',
  'OECD (GCP)', 'Non-OECD (GCP)',
]);

interface CountryYearly {
  year: number;
  value: number;
}

interface CountryData {
  name: string;
  latestValue: number;
  latestYear: number;
  yearly: CountryYearly[];
}

function buildCountryData(
  rows: { year: number; entityId: number; value: number }[],
  entityMap: Record<number, string>
): CountryData[] {
  const byEntity = new Map<number, { year: number; value: number }[]>();
  for (const r of rows) {
    if (!entityMap[r.entityId]) continue;
    const name = entityMap[r.entityId];
    if (EXCLUDE_NAMES.has(name) || name.includes('(GCP)') || name.includes('(excl.')) continue;
    if (!byEntity.has(r.entityId)) byEntity.set(r.entityId, []);
    byEntity.get(r.entityId)!.push({ year: r.year, value: r.value });
  }

  const result: CountryData[] = [];
  for (const [eid, points] of byEntity) {
    points.sort((a, b) => a.year - b.year);
    const latest = points[points.length - 1];
    result.push({
      name: entityMap[eid],
      latestValue: latest.value,
      latestYear: latest.year,
      yearly: points,
    });
  }
  return result;
}

// Global totals from the "World" entity
function getWorldTimeSeries(
  rows: { year: number; entityId: number; value: number }[],
  entityMap: Record<number, string>
): CountryYearly[] {
  const worldId = Object.entries(entityMap).find(([, n]) => n === 'World')?.[0];
  if (!worldId) return [];
  return rows
    .filter((r) => r.entityId === Number(worldId))
    .map((r) => ({ year: r.year, value: r.value }))
    .sort((a, b) => a.year - b.year);
}

export async function GET() {
  const cached = await getCached<any>(CACHE_KEY);
  if (cached) return NextResponse.json({ ...cached, source: 'cache' });

  try {
    // Fetch data and metadata in parallel
    const [annualData, perCapData, cumulData, entityMap] = await Promise.all([
      fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.annual}.data.json`),
      fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.perCapita}.data.json`),
      fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.cumulative}.data.json`),
      fetchEntityMap(INDICATORS.annual),
    ]);

    const annualRows = parseOWID(annualData);
    const perCapRows = parseOWID(perCapData);
    const cumulRows = parseOWID(cumulData);

    // Build country-level data
    const annualByCountry = buildCountryData(annualRows, entityMap);
    const perCapByCountry = buildCountryData(perCapRows, entityMap);
    const cumulByCountry = buildCountryData(cumulRows, entityMap);

    // Top 10 rankings (by latest available year)
    const top10Annual = [...annualByCountry]
      .sort((a, b) => b.latestValue - a.latestValue)
      .slice(0, 10)
      .map((c) => ({ name: c.name, value: c.latestValue, year: c.latestYear }));

    const top10PerCapita = [...perCapByCountry]
      .sort((a, b) => b.latestValue - a.latestValue)
      .slice(0, 10)
      .map((c) => ({ name: c.name, value: c.latestValue, year: c.latestYear }));

    const top10Cumulative = [...cumulByCountry]
      .sort((a, b) => b.latestValue - a.latestValue)
      .slice(0, 10)
      .map((c) => ({ name: c.name, value: c.latestValue, year: c.latestYear }));

    // Global totals time series
    const worldAnnual = getWorldTimeSeries(annualRows, entityMap);
    const worldCumulative = getWorldTimeSeries(cumulRows, entityMap);

    // Historic comparison: top 5 annual emitters over time
    const top5Names = top10Annual.slice(0, 5).map((c) => c.name);
    const top5HistoryMap = new Map<string, Map<number, number>>();
    for (const name of top5Names) {
      top5HistoryMap.set(name, new Map());
    }
    for (const c of annualByCountry) {
      if (top5Names.includes(c.name)) {
        for (const p of c.yearly) {
          top5HistoryMap.get(c.name)!.set(p.year, p.value);
        }
      }
    }

    // Build combined time series for top 5 (from 1950 onwards)
    const allYears = new Set<number>();
    for (const [, m] of top5HistoryMap) {
      for (const y of m.keys()) { if (y >= 1950) allYears.add(y); }
    }
    const sortedYears = [...allYears].sort((a, b) => a - b);
    const top5History = sortedYears.map((year) => {
      const row: Record<string, number> = { year };
      for (const name of top5Names) {
        row[name] = top5HistoryMap.get(name)?.get(year) || 0;
      }
      return row;
    });

    // World total for stat card
    const latestWorld = worldAnnual[worldAnnual.length - 1];
    const latestCumul = worldCumulative[worldCumulative.length - 1];

    const result = {
      top10Annual,
      top10PerCapita,
      top10Cumulative,
      worldAnnual,
      worldCumulative,
      top5History,
      top5Names,
      stats: {
        latestAnnual: latestWorld?.value ?? 0,
        latestAnnualYear: latestWorld?.year ?? 0,
        latestCumulative: latestCumul?.value ?? 0,
        latestCumulativeYear: latestCumul?.year ?? 0,
        topEmitter: top10Annual[0]?.name ?? '',
        topEmitterValue: top10Annual[0]?.value ?? 0,
        topPerCapita: top10PerCapita[0]?.name ?? '',
        topPerCapitaValue: top10PerCapita[0]?.value ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };

    await setShortTerm(CACHE_KEY, result);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Emissions API error:', err);
    return NextResponse.json({ error: 'Failed to fetch emissions data' }, { status: 500 });
  }
}
