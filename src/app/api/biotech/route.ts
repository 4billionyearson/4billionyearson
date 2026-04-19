import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'biotech:dashboard:v4';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/* ─── OWID indicator IDs ──────────────────────────────────────────────────── */

const INDICATORS = {
  genomeCost: 816712,           // Cost of sequencing a full human genome ($)
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

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

interface OwidRow { year: number; entityId: number; value: number }

function parseOWID(data: any): OwidRow[] {
  if (!data?.years) return [];
  const { years, entities, values } = data;
  const result: OwidRow[] = [];
  for (let i = 0; i < years.length; i++) {
    result.push({ year: years[i], entityId: entities[i], value: values[i] });
  }
  return result;
}

function buildTimeSeries(
  rows: OwidRow[],
  entityMap: Record<number, string>,
  selectedEntities?: string[],
): Record<string, number>[] {
  const byYear = new Map<number, Record<string, number>>();
  for (const r of rows) {
    const name = entityMap[r.entityId];
    if (!name) continue;
    if (selectedEntities && !selectedEntities.includes(name)) continue;
    if (!byYear.has(r.year)) byYear.set(r.year, { year: r.year });
    byYear.get(r.year)![name] = r.value;
  }
  return Array.from(byYear.values()).sort((a, b) => a["year"] - b["year"]);
}

/* ─── ClinicalTrials.gov v2 queries ──────────────────────────────────────── */

interface TrialCount { term: string; count: number }

async function fetchTrialCount(term: string): Promise<TrialCount> {
  const encoded = encodeURIComponent(term);
  const data = await fetchJSON(
    `https://clinicaltrials.gov/api/v2/studies?query.term=${encoded}&countTotal=true&pageSize=0`
  );
  return { term, count: data?.totalCount ?? 0 };
}

/* ─── PubMed publication counts ───────────────────────────────────────────── */

async function fetchPubmedCount(term: string): Promise<{ term: string; count: number }> {
  const encoded = encodeURIComponent(term);
  const data = await fetchJSON(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&rettype=count&retmode=json`
  );
  return { term, count: Number(data?.esearchresult?.count ?? 0) };
}

/* ─── WHO GHO immunization coverage ──────────────────────────────────────── */

const VACCINE_INDICATORS: { code: string; label: string }[] = [
  { code: 'WHS4_100', label: 'DTP3' },
  { code: 'WHS8_110', label: 'MCV1' },
  { code: 'WHS4_117', label: 'HepB3' },
  { code: 'WHS4_544', label: 'Polio' },
  { code: 'MCV2',     label: 'MCV2' },
  { code: 'PCV3',     label: 'PCV3' },
  { code: 'ROTAC',    label: 'Rotavirus' },
];

async function fetchImmunizationCoverage(): Promise<Record<string, number>[]> {
  try {
    const results = await Promise.all(
      VACCINE_INDICATORS.map(async ({ code, label }) => {
        const data = await fetchJSON(
          `https://ghoapi.azureedge.net/api/${code}?$filter=SpatialDim eq 'GLOBAL'&$orderby=TimeDim asc`,
          30000,
        );
        if (!data?.value) return [];
        return data.value
          .filter((r: any) => r.NumericValue != null && r.TimeDim)
          .map((r: any) => ({ year: Number(r.TimeDim), label, value: r.NumericValue }));
      }),
    );

    // Merge into { year, DTP3, MCV1, HepB3, … }
    const byYear = new Map<number, Record<string, number>>();
    for (const series of results) {
      for (const pt of series) {
        if (!byYear.has(pt.year)) byYear.set(pt.year, { year: pt.year });
        byYear.get(pt.year)![pt.label] = pt.value;
      }
    }
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  } catch {
    return [];
  }
}

/* ─── PubMed year-by-year publication counts ──────────────────────────────── */

async function fetchPubmedYearSeries(term: string, startYear: number, endYear: number): Promise<{ year: number; count: number }[]> {
  const results: { year: number; count: number }[] = [];
  const encoded = encodeURIComponent(term);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  // Fully sequential — one request at a time with 400ms gap to stay under NCBI 3 req/sec
  for (const yr of years) {
    await new Promise(r => setTimeout(r, 400));
    const data = await fetchJSON(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&mindate=${yr}/01/01&maxdate=${yr}/12/31&datetype=pdat&rettype=count&retmode=json`
    );
    results.push({ year: yr, count: Number(data?.esearchresult?.count ?? 0) });
  }
  return results;
}

/* ─── Main data fetch ─────────────────────────────────────────────────────── */

async function fetchBiotechDashboardData() {
  // Fetch all OWID indicators + external APIs in parallel
  const [
    genomeData, genomeMap,
    // ClinicalTrials.gov counts
    crisprTrials,
    geneTherapyTrials,
    mrnaTrials,
    carTTrials,
    immunotherapyTrials,
  ] = await Promise.all([
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.genomeCost}.data.json`),
    fetchEntityMap(INDICATORS.genomeCost),
    // ClinicalTrials.gov
    fetchTrialCount('CRISPR'),
    fetchTrialCount('"gene therapy"'),
    fetchTrialCount('mRNA'),
    fetchTrialCount('"CAR-T"'),
    fetchTrialCount('immunotherapy'),
  ]);

  // PubMed total counts — sequential with delays to respect NCBI 3 req/sec limit
  const crisprPubs = await fetchPubmedCount('CRISPR');
  await new Promise(r => setTimeout(r, 400));
  const geneTherapyPubs = await fetchPubmedCount('"gene therapy"');
  await new Promise(r => setTimeout(r, 400));
  const mrnaPubs = await fetchPubmedCount('"mRNA vaccine"');
  await new Promise(r => setTimeout(r, 400));
  const genomicsPubs = await fetchPubmedCount('genomics');
  await new Promise(r => setTimeout(r, 400));

  // ─ Genome sequencing cost ─
  const genomeRows = parseOWID(genomeData);
  const genomeCost = buildTimeSeries(genomeRows, genomeMap);

  // ─ Clinical trials summary ─
  const clinicalTrials = [
    { category: 'Gene Therapy', count: geneTherapyTrials.count },
    { category: 'Immunotherapy', count: immunotherapyTrials.count },
    { category: 'CRISPR', count: crisprTrials.count },
    { category: 'mRNA', count: mrnaTrials.count },
    { category: 'CAR-T', count: carTTrials.count },
  ];

  // ─ PubMed publications summary ─
  const pubmedCounts = [
    { category: 'Gene Therapy', count: geneTherapyPubs.count },
    { category: 'CRISPR', count: crisprPubs.count },
    { category: 'Genomics', count: genomicsPubs.count },
    { category: 'mRNA Vaccine', count: mrnaPubs.count },
  ];

  // ─ PubMed year trends for CRISPR ─
  const crisprYearTrend = await fetchPubmedYearSeries('CRISPR', 2012, 2025);

  // ─ WHO immunization coverage ─
  const immunizationCoverage = await fetchImmunizationCoverage();

  // ─ Stats ─
  const latestGenomeCost = genomeRows.sort((a, b) => b.year - a.year)[0];

  const stats = {
    genomeCost: latestGenomeCost?.value ?? 0,
    genomeCostYear: latestGenomeCost?.year ?? 0,
    totalCrisprTrials: crisprTrials.count,
    totalGeneTherapyTrials: geneTherapyTrials.count,
  };

  return {
    genomeCost,
    clinicalTrials,
    pubmedCounts,
    crisprYearTrend,
    immunizationCoverage,
    stats,
    fetchedAt: new Date().toISOString(),
  };
}

/* ─── Route handler ───────────────────────────────────────────────────────── */

export async function GET() {
  try {
    // Check cache
    const cached = await getCached(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    }

    const data = await fetchBiotechDashboardData();

    // Cache result
    setShortTerm(CACHE_KEY, data).catch(() => {});

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err: any) {
    console.error('Biotech dashboard API error:', err);
    // Try stale cache
    const stale = await getCached(CACHE_KEY).catch(() => null);
    if (stale) {
      return NextResponse.json(stale, {
        headers: { 'X-Cache': 'STALE', 'Cache-Control': 'public, s-maxage=60' },
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch biotech data', message: err.message },
      { status: 500 }
    );
  }
}
