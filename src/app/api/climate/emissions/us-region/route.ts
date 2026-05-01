import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { CLIMATE_REGIONS, type ClimateRegion } from '@/lib/climate/regions';

export const maxDuration = 60;

const CACHE_KEY = 'climate:emissions:us-region:v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const EIA_API_KEY = process.env.EIA_API_KEY || 'DEMO_KEY';

// Minimal series set: FFTCE = fossil-fuel CO₂ (Mt), TPOPP = population (thousands)
const EIA_SERIES = ['FFTCE', 'TPOPP'];

interface EIARow {
  period: string;
  seriesId: string;
  value: string | number | null;
  stateId: string;
}

interface YearlyAgg {
  year: number;
  ghgEmissions: number | null;   // Mt CO₂
  ghgPerCapita: number | null;   // tonnes / person
  population: number | null;     // total people
}

interface RegionAggregate {
  slug: string;
  name: string;
  yearly: YearlyAgg[];
  latest: YearlyAgg | null;
  annualRank: number | null;
  annualOf: number;
  perCapRank: number | null;
  perCapOf: number;
}

interface RegionIndex {
  regions: Record<string, RegionAggregate>;
  usa: { name: 'United States'; yearly: YearlyAgg[]; latest: YearlyAgg | null };
  fetchedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildEIAUrl(stateIds: string[]): string {
  const params = new URLSearchParams();
  params.set('api_key', EIA_API_KEY);
  params.set('frequency', 'annual');
  params.set('data[0]', 'value');
  params.set('start', '1970');
  params.set('length', '10000');
  params.set('sort[0][column]', 'period');
  params.set('sort[0][direction]', 'asc');
  for (const sid of EIA_SERIES) params.append('facets[seriesId][]', sid);
  for (const st of stateIds) params.append('facets[stateId][]', st);
  return `https://api.eia.gov/v2/seds/data/?${params.toString()}`;
}

function regionMemberStateCodes(region: ClimateRegion): string[] {
  if (!region.memberSlugs) return [];
  const codes: string[] = [];
  for (const slug of region.memberSlugs) {
    const member = CLIMATE_REGIONS.find((r) => r.slug === slug);
    if (!member || member.type !== 'us-state') continue;
    // apiCode is `us-xx` (lowercase)
    const m = member.apiCode.match(/^us-([a-z]{2})$/i);
    if (m) codes.push(m[1].toUpperCase());
  }
  return codes;
}

function aggregateRows(
  rows: EIARow[],
  filterStateIds: Set<string>,
): YearlyAgg[] {
  // year -> stateId -> { co2Mt, popThousand }
  const byYear = new Map<number, Map<string, { co2Mt: number | null; popThousand: number | null }>>();
  for (const row of rows) {
    if (!filterStateIds.has(row.stateId)) continue;
    const year = parseInt(row.period, 10);
    if (Number.isNaN(year)) continue;
    if (!byYear.has(year)) byYear.set(year, new Map());
    const stateMap = byYear.get(year)!;
    if (!stateMap.has(row.stateId)) stateMap.set(row.stateId, { co2Mt: null, popThousand: null });
    const cell = stateMap.get(row.stateId)!;
    const v = num(row.value);
    if (row.seriesId === 'FFTCE') cell.co2Mt = v;
    else if (row.seriesId === 'TPOPP') cell.popThousand = v;
  }

  const out: YearlyAgg[] = [];
  for (const [year, stateMap] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    let co2Sum = 0;
    let popSum = 0;
    let hasCo2 = false;
    let hasPop = false;
    for (const cell of stateMap.values()) {
      if (cell.co2Mt != null) { co2Sum += cell.co2Mt; hasCo2 = true; }
      if (cell.popThousand != null) { popSum += cell.popThousand; hasPop = true; }
    }
    const ghgEmissions = hasCo2 ? Number(co2Sum.toFixed(1)) : null;
    const population = hasPop ? Math.round(popSum * 1000) : null;
    const ghgPerCapita = (hasCo2 && hasPop && popSum > 0)
      ? Number(((co2Sum * 1e6) / (popSum * 1e3)).toFixed(2))
      : null;
    out.push({ year, ghgEmissions, ghgPerCapita, population });
  }
  // Drop a clearly partial trailing year (sometimes EIA trails one state behind)
  if (out.length >= 2) {
    const last = out[out.length - 1];
    const prev = out[out.length - 2];
    if (last.ghgEmissions != null && prev.ghgEmissions != null
        && last.ghgEmissions < prev.ghgEmissions * 0.8) {
      out.pop();
    }
  }
  return out;
}

async function buildIndex(): Promise<RegionIndex> {
  const usRegions = CLIMATE_REGIONS.filter(
    (r) => r.type === 'group' && r.groupKind === 'us-climate-region',
  );

  // Collect all unique state codes across regions + US.
  const allCodes = new Set<string>(['US']);
  const regionToCodes: Record<string, string[]> = {};
  for (const r of usRegions) {
    const codes = regionMemberStateCodes(r);
    regionToCodes[r.slug] = codes;
    for (const c of codes) allCodes.add(c);
  }

  const url = buildEIAUrl([...allCodes]);
  const res = await fetch(url, { signal: AbortSignal.timeout(50000) });
  if (!res.ok) throw new Error(`EIA fetch failed: ${res.status}`);
  const raw = await res.json();
  const rows: EIARow[] = raw?.response?.data ?? [];
  if (!rows.length) throw new Error('EIA returned no rows');

  const regions: Record<string, RegionAggregate> = {};
  for (const r of usRegions) {
    const codes = new Set(regionToCodes[r.slug]);
    const yearly = aggregateRows(rows, codes);
    const latest = yearly.length ? yearly[yearly.length - 1] : null;
    regions[r.slug] = {
      slug: r.slug,
      name: r.name,
      yearly,
      latest,
      annualRank: null,
      annualOf: 0,
      perCapRank: null,
      perCapOf: 0,
    };
  }

  // Within-group ranks (1 = highest of the 9 regions)
  const annualSorted = Object.values(regions)
    .filter((e) => e.latest?.ghgEmissions != null)
    .sort((a, b) => (b.latest!.ghgEmissions as number) - (a.latest!.ghgEmissions as number));
  annualSorted.forEach((e, i) => { regions[e.slug].annualRank = i + 1; });
  for (const slug of Object.keys(regions)) regions[slug].annualOf = annualSorted.length;

  const perCapSorted = Object.values(regions)
    .filter((e) => e.latest?.ghgPerCapita != null)
    .sort((a, b) => (b.latest!.ghgPerCapita as number) - (a.latest!.ghgPerCapita as number));
  perCapSorted.forEach((e, i) => { regions[e.slug].perCapRank = i + 1; });
  for (const slug of Object.keys(regions)) regions[slug].perCapOf = perCapSorted.length;

  // USA totals
  const usYearly = aggregateRows(rows, new Set(['US']));
  const usaLatest = usYearly.length ? usYearly[usYearly.length - 1] : null;

  return {
    regions,
    usa: { name: 'United States', yearly: usYearly, latest: usaLatest },
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'Missing required ?slug= parameter' }, { status: 400 });
  }

  let index = await getCached<RegionIndex>(CACHE_KEY);
  if (!index || (Date.now() - new Date(index.fetchedAt).getTime() > CACHE_TTL_MS)) {
    try {
      index = await buildIndex();
      await setShortTerm(CACHE_KEY, index);
    } catch (e: any) {
      if (!index) {
        return NextResponse.json({ error: e.message ?? 'Failed to build index' }, { status: 500 });
      }
      // serve stale on failure
    }
  }

  const region = index.regions[slug];
  if (!region) {
    return NextResponse.json({ error: `Unknown US climate region '${slug}'` }, { status: 404 });
  }

  // Reshape into the StateEnergyApiResponse-like shape so EmissionsCard can reuse USStateCard.
  return NextResponse.json({
    country: {
      name: 'United States',
      yearly: index.usa.yearly,
      latest: index.usa.latest ?? { year: 0, ghgEmissions: null, ghgPerCapita: null, population: null },
    },
    usState: {
      name: region.name,
      yearly: region.yearly,
      latest: region.latest ?? { year: 0, ghgEmissions: null, ghgPerCapita: null, population: null },
      annualRank: region.annualRank,
      annualOf: region.annualOf,
      perCapRank: region.perCapRank,
      perCapOf: region.perCapOf,
    },
    fetchedAt: index.fetchedAt,
  });
}
