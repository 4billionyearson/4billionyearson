import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'biotech:dashboard:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/* ─── OWID indicator IDs ──────────────────────────────────────────────────── */

const INDICATORS = {
  genomeCost: 816712,           // Cost of sequencing a full human genome ($)
  lifeExpectancy: 1118466,      // Life expectancy at birth (UN WPP)
  cancerPrevalence: 1188335,    // Share of population with cancer (IHME)
  cancerDeathRate: 1165250,     // Death rate from cancer (IHME)
  dtp3Vaccination: 1077436,     // DTP3 immunization coverage (WHO)
  healthcareSpending: 1045260,  // Healthcare spending as % of GDP (WHO)
  antibioticUse: 772629,        // Antibiotic use in livestock
  childMortality: 1027772,      // Under-5 mortality rate (UN IGME)
  hivPrevalence: 1178467,       // People living with HIV (UNAIDS)
  malariaDeathRate: 1165115,    // Death rate from malaria (IHME)
  dalys: 1163226,               // DALYs rate (all causes, IHME)
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

function getLatestByEntity(
  rows: OwidRow[],
  entityMap: Record<number, string>,
  excludeNames?: Set<string>,
): { name: string; value: number; year: number }[] {
  const latest = new Map<string, { value: number; year: number }>();
  for (const r of rows) {
    const name = entityMap[r.entityId];
    if (!name || excludeNames?.has(name)) continue;
    const prev = latest.get(name);
    if (!prev || r.year > prev.year) {
      latest.set(name, { value: r.value, year: r.year });
    }
  }
  return Array.from(latest.entries())
    .map(([name, d]) => ({ name, value: d.value, year: d.year }));
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

/* ─── PubMed year-by-year publication counts ──────────────────────────────── */

async function fetchPubmedYearSeries(term: string, startYear: number, endYear: number): Promise<{ year: number; count: number }[]> {
  const results: { year: number; count: number }[] = [];
  const encoded = encodeURIComponent(term);
  // Fetch counts for each year in parallel (batches of 5)
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  for (let b = 0; b < years.length; b += 5) {
    const batch = years.slice(b, b + 5);
    const counts = await Promise.all(
      batch.map(async yr => {
        const data = await fetchJSON(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&mindate=${yr}&maxdate=${yr}&datetype=pdat&rettype=count&retmode=json`
        );
        return { year: yr, count: Number(data?.esearchresult?.count ?? 0) };
      })
    );
    results.push(...counts);
  }
  return results;
}

/* ─── Regions/aggregates to exclude from country rankings ─────────────────── */

const EXCLUDE_AGGREGATES = new Set([
  'World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
  'European Union (27)', 'European Union (28)', 'High-income countries',
  'Upper-middle-income countries', 'Lower-middle-income countries', 'Low-income countries',
]);

const KEY_COUNTRIES = ['World', 'United States', 'China', 'United Kingdom', 'Germany', 'Japan', 'India', 'Brazil'];

/* ─── Main data fetch ─────────────────────────────────────────────────────── */

async function fetchBiotechDashboardData() {
  // Fetch all OWID indicators + external APIs in parallel
  const [
    genomeData, genomeMap,
    lifeExpData, lifeExpMap,
    cancerPrevData, cancerPrevMap,
    cancerDeathData, cancerDeathMap,
    dtp3Data, dtp3Map,
    healthSpendData, healthSpendMap,
    childMortData, childMortMap,
    hivData, hivMap,
    malariaData, malariaMap,
    // ClinicalTrials.gov counts
    crisprTrials,
    geneTherapyTrials,
    mrnaTrials,
    carTTrials,
    immunotherapyTrials,
    // PubMed total counts
    crisprPubs,
    geneTherapyPubs,
    mrnaPubs,
    genomicsPubs,
  ] = await Promise.all([
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.genomeCost}.data.json`),
    fetchEntityMap(INDICATORS.genomeCost),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.lifeExpectancy}.data.json`),
    fetchEntityMap(INDICATORS.lifeExpectancy),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.cancerPrevalence}.data.json`),
    fetchEntityMap(INDICATORS.cancerPrevalence),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.cancerDeathRate}.data.json`),
    fetchEntityMap(INDICATORS.cancerDeathRate),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.dtp3Vaccination}.data.json`),
    fetchEntityMap(INDICATORS.dtp3Vaccination),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.healthcareSpending}.data.json`),
    fetchEntityMap(INDICATORS.healthcareSpending),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.childMortality}.data.json`),
    fetchEntityMap(INDICATORS.childMortality),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.hivPrevalence}.data.json`),
    fetchEntityMap(INDICATORS.hivPrevalence),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.malariaDeathRate}.data.json`),
    fetchEntityMap(INDICATORS.malariaDeathRate),
    // ClinicalTrials.gov
    fetchTrialCount('CRISPR'),
    fetchTrialCount('"gene therapy"'),
    fetchTrialCount('mRNA'),
    fetchTrialCount('"CAR-T"'),
    fetchTrialCount('immunotherapy'),
    // PubMed
    fetchPubmedCount('CRISPR'),
    fetchPubmedCount('"gene therapy"'),
    fetchPubmedCount('"mRNA vaccine"'),
    fetchPubmedCount('genomics'),
  ]);

  // ─ Genome sequencing cost ─
  const genomeRows = parseOWID(genomeData);
  const genomeCost = buildTimeSeries(genomeRows, genomeMap);

  // ─ Life expectancy ─
  const lifeExpRows = parseOWID(lifeExpData);
  const lifeExpectancy = buildTimeSeries(lifeExpRows, lifeExpMap, KEY_COUNTRIES);

  // ─ Cancer prevalence ─
  const cancerPrevRows = parseOWID(cancerPrevData);
  const cancerPrevalence = buildTimeSeries(cancerPrevRows, cancerPrevMap, KEY_COUNTRIES);

  // ─ Cancer death rate ─
  const cancerDeathRows = parseOWID(cancerDeathData);
  const cancerDeathRate = buildTimeSeries(cancerDeathRows, cancerDeathMap, KEY_COUNTRIES);

  // ─ DTP3 vaccination ─
  const dtp3Rows = parseOWID(dtp3Data);
  const dtp3Vaccination = buildTimeSeries(dtp3Rows, dtp3Map, ['World', 'United States', 'India', 'China', 'Brazil']);

  // ─ Healthcare spending ─
  const healthRows = parseOWID(healthSpendData);
  const healthcareSpending = buildTimeSeries(healthRows, healthSpendMap, KEY_COUNTRIES);

  // ─ Top healthcare spenders ─
  const topHealthSpenders = getLatestByEntity(healthRows, healthSpendMap, EXCLUDE_AGGREGATES)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // ─ Child mortality ─
  const childMortRows = parseOWID(childMortData);
  const childMortality = buildTimeSeries(childMortRows, childMortMap, ['World', 'United States', 'India', 'China', 'Brazil', 'Nigeria']);

  // ─ HIV ─
  const hivRows = parseOWID(hivData);
  const hivPrevalence = buildTimeSeries(hivRows, hivMap, ['World']);

  // ─ Malaria death rate ─
  const malariaRows = parseOWID(malariaData);
  const malariaDeathRate = buildTimeSeries(malariaRows, malariaMap, ['World', 'India', 'Nigeria']);

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

  // ─ Stats ─
  const latestGenomeCost = genomeRows.sort((a, b) => b.year - a.year)[0];
  const latestLifeExp = lifeExpRows
    .filter(r => lifeExpMap[r.entityId] === 'World')
    .sort((a, b) => b.year - a.year)[0];

  const stats = {
    latestYear: latestLifeExp?.year ?? 0,
    genomeCost: latestGenomeCost?.value ?? 0,
    genomeCostYear: latestGenomeCost?.year ?? 0,
    globalLifeExpectancy: latestLifeExp?.value ?? 0,
    totalCrisprTrials: crisprTrials.count,
    totalGeneTherapyTrials: geneTherapyTrials.count,
  };

  return {
    genomeCost,
    lifeExpectancy,
    cancerPrevalence,
    cancerDeathRate,
    dtp3Vaccination,
    healthcareSpending,
    topHealthSpenders,
    childMortality,
    hivPrevalence,
    malariaDeathRate,
    clinicalTrials,
    pubmedCounts,
    crisprYearTrend,
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
