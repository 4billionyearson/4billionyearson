import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'ai:dashboard:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/* ─── OWID indicator IDs ──────────────────────────────────────────────────── */

const INDICATORS = {
  privateInvestment: 1026151,   // Private AI investment (>$1.5M), constant 2021 US$
  genAiInvestment: 1025676,     // Generative AI investment
  corporateDeals: 1025674,      // Corporate AI deals by type
  newCompanies: 1025678,        // Newly-funded AI companies
  companyAdoption: 1025671,     // Share of companies using AI
  aiJobPostings: 1025677,       // AI job postings share
  devsUsingAi: 1146598,         // Software devs using AI tools
  nvidiaRevenue: 1119964,       // NVIDIA quarterly revenue by segment
  dataCenterSpend: 1132529,     // Monthly US data center construction spend
  aiSystems: 1015499,           // Large-scale AI systems released per year
  aiSystemsByCountry: 1015497,  // Cumulative AI systems by country
  aiPublications: 1119074,      // AI scholarly publications
  aiPatents: 1119050,           // AI patent applications by country
  aiBills: 1025672,             // AI bills passed into law
  aiTestScores: 852592,         // AI test scores vs human performance
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
  // Group by year and entity name
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

/* ─── Regions/aggregates to exclude from country rankings ─────────────────── */

const EXCLUDE_AGGREGATES = new Set([
  'World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
  'European Union (27)', 'European Union (28)', 'High-income countries',
  'Upper-middle-income countries', 'Lower-middle-income countries', 'Low-income countries',
  'All geographies', 'Developing markets', 'Greater China', 'Asia-Pacific',
  'All large-scale AI systems',
]);

/* ─── Main data fetch ─────────────────────────────────────────────────────── */

async function fetchAIDashboardData() {
  // Fetch all indicators in parallel
  const [
    investData, investMap,
    genAiData,
    dealsData, dealsMap,
    companiesData, companiesMap,
    adoptionData, adoptionMap,
    jobsData, jobsMap,
    devsData,
    nvidiaData, nvidiaMap,
    dcSpendData,
    systemsData, systemsMap,
    systemsCountryData, systemsCountryMap,
    pubsData, pubsMap,
    patentsData, patentsMap,
    billsData, billsMap,
    testScoresData, testScoresMap,
  ] = await Promise.all([
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.privateInvestment}.data.json`),
    fetchEntityMap(INDICATORS.privateInvestment),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.genAiInvestment}.data.json`),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.corporateDeals}.data.json`),
    fetchEntityMap(INDICATORS.corporateDeals),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.newCompanies}.data.json`),
    fetchEntityMap(INDICATORS.newCompanies),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.companyAdoption}.data.json`),
    fetchEntityMap(INDICATORS.companyAdoption),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiJobPostings}.data.json`),
    fetchEntityMap(INDICATORS.aiJobPostings),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.devsUsingAi}.data.json`),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.nvidiaRevenue}.data.json`),
    fetchEntityMap(INDICATORS.nvidiaRevenue),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.dataCenterSpend}.data.json`),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiSystems}.data.json`),
    fetchEntityMap(INDICATORS.aiSystems),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiSystemsByCountry}.data.json`),
    fetchEntityMap(INDICATORS.aiSystemsByCountry),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiPublications}.data.json`),
    fetchEntityMap(INDICATORS.aiPublications),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiPatents}.data.json`),
    fetchEntityMap(INDICATORS.aiPatents),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiBills}.data.json`),
    fetchEntityMap(INDICATORS.aiBills),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiTestScores}.data.json`),
    fetchEntityMap(INDICATORS.aiTestScores),
  ]);

  // ─ Investment ─
  const investRows = parseOWID(investData);
  const investment = buildTimeSeries(investRows, investMap, ['World', 'United States', 'Europe', 'China']);

  const genAiRows = parseOWID(genAiData);
  const genAiMap = investMap; // same entity set
  const genAiInvestment = buildTimeSeries(genAiRows, genAiMap, ['World']);

  // ─ Corporate deals ─
  const dealRows = parseOWID(dealsData);
  const corporateDeals = buildTimeSeries(dealRows, dealsMap);

  // ─ New companies ─
  const compRows = parseOWID(companiesData);
  const newCompanies = buildTimeSeries(compRows, companiesMap, ['World', 'United States', 'China', 'Europe']);

  // ─ Adoption ─
  const adoptRows = parseOWID(adoptionData);
  const companyAdoption = buildTimeSeries(adoptRows, adoptionMap);

  // ─ AI job postings ─
  const jobRows = parseOWID(jobsData);
  const jobPostings = buildTimeSeries(jobRows, jobsMap);

  // ─ Developers using AI ─
  const devRows = parseOWID(devsData);
  const devsUsingAi = buildTimeSeries(devRows, investMap, ['World']);

  // ─ NVIDIA revenue ─
  const nvRows = parseOWID(nvidiaData);
  const nvidiaRevenue = buildTimeSeries(nvRows, nvidiaMap);

  // ─ Data center spend ─
  const dcRows = parseOWID(dcSpendData);
  const dataCenterSpend = buildTimeSeries(dcRows, investMap, ['United States']);

  // ─ AI systems per year ─
  const sysRows = parseOWID(systemsData);
  const aiSystemsPerYear = buildTimeSeries(sysRows, systemsMap);

  // ─ AI systems by country ─
  const sysCountryRows = parseOWID(systemsCountryData);
  const aiSystemsByCountry = buildTimeSeries(sysCountryRows, systemsCountryMap);

  // ─ Publications ─
  const pubRows = parseOWID(pubsData);
  const publications = buildTimeSeries(pubRows, pubsMap, ['World', 'United States', 'China', 'United Kingdom', 'Germany']);

  // ─ Patents ─
  const patentRows = parseOWID(patentsData);
  const topPatents = getLatestByEntity(patentRows, patentsMap, EXCLUDE_AGGREGATES)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Patent map data for choropleth
  const patentMapData: Record<string, number> = {};
  for (const entry of getLatestByEntity(patentRows, patentsMap, EXCLUDE_AGGREGATES)) {
    patentMapData[entry.name] = entry.value;
  }

  // ─ AI regulation ─
  const billRows = parseOWID(billsData);
  const aiBills = buildTimeSeries(billRows, billsMap);
  const topBills = getLatestByEntity(billRows, billsMap, EXCLUDE_AGGREGATES)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // ─ AI test scores vs human ─
  const testRows = parseOWID(testScoresData);
  const testScores = buildTimeSeries(testRows, testScoresMap);

  // ─ Stats ─
  const latestInvestWorld = investRows
    .filter(r => investMap[r.entityId] === 'World')
    .sort((a, b) => b.year - a.year)[0];
  const latestInvestUS = investRows
    .filter(r => investMap[r.entityId] === 'United States')
    .sort((a, b) => b.year - a.year)[0];

  const stats = {
    latestYear: latestInvestWorld?.year ?? 0,
    globalInvestment: latestInvestWorld?.value ?? 0,
    usInvestment: latestInvestUS?.value ?? 0,
    topPatentCountry: topPatents[0]?.name ?? '',
    topPatentCount: topPatents[0]?.value ?? 0,
  };

  return {
    investment,
    genAiInvestment,
    corporateDeals,
    newCompanies,
    companyAdoption,
    jobPostings,
    devsUsingAi,
    nvidiaRevenue,
    dataCenterSpend,
    aiSystemsPerYear,
    aiSystemsByCountry,
    publications,
    topPatents,
    patentMapData,
    aiBills,
    topBills,
    testScores,
    stats,
    fetchedAt: new Date().toISOString(),
  };
}

/* ─── Route handler ───────────────────────────────────────────────────────── */

export async function GET() {
  try {
    const cached = await getCached<any>(CACHE_KEY);
    if (cached) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached, source: 'cache' });
      }
    }

    const data = await fetchAIDashboardData();
    await setShortTerm(CACHE_KEY, data);
    return NextResponse.json({ ...data, source: 'fresh' });
  } catch (err: any) {
    const stale = await getCached<any>(CACHE_KEY);
    if (stale) return NextResponse.json({ ...stale, source: 'stale-cache' });
    return NextResponse.json({ error: err.message || 'Failed to fetch AI data' }, { status: 500 });
  }
}
