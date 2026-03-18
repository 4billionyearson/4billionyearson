import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'ai:dashboard:v6';
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
  dataCenterSpend: 1132529,     // Monthly US data center construction spend
  aiSystems: 1015499,           // Large-scale AI systems released per year
  aiSystemsByCountry: 1015497,  // Cumulative AI systems by country
  frontierMath: 1144186,        // FrontierMath benchmark scores (2025-2026)
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

/** Convert OWID day offset to a date, given a zeroDay like '2014-01-01' */
function owidDayToDate(dayOffset: number, zeroDay: string): Date {
  const [y, m, d] = zeroDay.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  return new Date(base.getTime() + dayOffset * 86400000);
}

/** Build time series for sub-annual (yearIsDay) data, converting day offsets to month labels */
function buildMonthTimeSeries(
  rows: OwidRow[],
  entityMap: Record<number, string>,
  zeroDay: string,
  selectedEntities?: string[],
): Record<string, any>[] {
  const byLabel = new Map<string, Record<string, any>>();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (const r of rows) {
    const name = entityMap[r.entityId];
    if (!name) continue;
    if (selectedEntities && !selectedEntities.includes(name)) continue;
    const date = owidDayToDate(r.year, zeroDay);
    const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    if (!byLabel.has(label)) byLabel.set(label, { year: label, _sort: r.year });
    byLabel.get(label)![name] = r.value;
  }
  return Array.from(byLabel.values())
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort, ...rest }) => rest);
}

/** Build date-labeled series for per-model benchmarks (FrontierMath etc.) */
function buildDatePointSeries(
  rows: OwidRow[],
  entityMap: Record<number, string>,
  zeroDay: string,
): { name: string; score: number; date: string }[] {
  return rows
    .map(r => {
      const name = entityMap[r.entityId];
      if (!name) return null;
      const d = owidDayToDate(r.year, zeroDay);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return { name, score: r.value, date: `${monthNames[d.getMonth()]} ${d.getFullYear()}` };
    })
    .filter((x): x is { name: string; score: number; date: string } => x !== null)
    .sort((a, b) => b.score - a.score);
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

/* ─── Epoch AI CSV — live notable model data ──────────────────────────────── */

const EPOCH_CSV_URL = 'https://epoch.ai/data/epochdb/notable_ai_models.csv';

async function fetchEpochModels(): Promise<{
  modelsByOrg: { name: string; value: number }[];
  modelsByYear: Record<string, number>[];
  totalModels2025: number;
}> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(EPOCH_CSV_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(id);
    if (!res.ok) return { modelsByOrg: [], modelsByYear: [], totalModels2025: 0 };
    const text = await res.text();
    const lines = text.split('\n');
    const headers = parseCSVLine(lines[0]);
    const dateIdx = headers.indexOf('Publication date');
    const orgIdx = headers.indexOf('Organization');
    if (dateIdx < 0) return { modelsByOrg: [], modelsByYear: [], totalModels2025: 0 };

    const orgCounts = new Map<string, number>();
    const yearCounts = new Map<number, number>();
    let total2025 = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const date = cols[dateIdx] || '';
      const year = parseInt(date.substring(0, 4), 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 2010 || year > currentYear + 1) continue;
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
      if (year >= 2025) {
        total2025++;
        const org = (cols[orgIdx] || 'Unknown').split(',')[0].trim();
        orgCounts.set(org, (orgCounts.get(org) || 0) + 1);
      }
    }

    const modelsByOrg = Array.from(orgCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const modelsByYear = Array.from(yearCounts.entries())
      .map(([year, count]) => ({ year, 'Notable Models': count }))
      .sort((a, b) => a.year - b.year);

    return { modelsByOrg, modelsByYear, totalModels2025: total2025 };
  } catch {
    return { modelsByOrg: [], modelsByYear: [], totalModels2025: 0 };
  }
}

/** Minimal CSV line parser handling quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/* ─── IM3 Data Center Atlas — US data center locations ─────────────────────── */

const IM3_CSV_URL = 'https://raw.githubusercontent.com/shawn15goh/Data-Center-Location-USA-Datasets/main/im3_open_source_data_center_atlas/im3_open_source_data_center_atlas.csv';

async function fetchDataCenterLocations(): Promise<{
  byState: { name: string; value: number; sqft: number }[];
  byOperator: { name: string; value: number }[];
  totalFacilities: number;
}> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(IM3_CSV_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(id);
    if (!res.ok) return { byState: [], byOperator: [], totalFacilities: 0 };
    const text = await res.text();
    const lines = text.split('\n');
    const headers = parseCSVLine(lines[0]);
    const stateIdx = headers.indexOf('state');
    const operatorIdx = headers.indexOf('operator');
    const sqftIdx = headers.indexOf('sqft');
    if (stateIdx < 0) return { byState: [], byOperator: [], totalFacilities: 0 };

    const stateCounts = new Map<string, { count: number; sqft: number }>();
    const opCounts = new Map<string, number>();
    let totalFacilities = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const state = cols[stateIdx] || '';
      if (!state) continue;
      totalFacilities++;
      const entry = stateCounts.get(state) || { count: 0, sqft: 0 };
      entry.count++;
      const sqft = parseFloat(cols[sqftIdx] || '0');
      if (!isNaN(sqft)) entry.sqft += sqft;
      stateCounts.set(state, entry);

      const op = (cols[operatorIdx] || '').trim();
      if (op) opCounts.set(op, (opCounts.get(op) || 0) + 1);
    }

    const byState = Array.from(stateCounts.entries())
      .map(([name, d]) => ({ name, value: d.count, sqft: Math.round(d.sqft) }))
      .sort((a, b) => b.value - a.value);

    const byOperator = Array.from(opCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    return { byState, byOperator, totalFacilities };
  } catch {
    return { byState: [], byOperator: [], totalFacilities: 0 };
  }
}

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
    dcSpendData,
    systemsData, systemsMap,
    systemsCountryData, systemsCountryMap,
    frontierMathData, frontierMathMap,
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
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.dataCenterSpend}.data.json`),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiSystems}.data.json`),
    fetchEntityMap(INDICATORS.aiSystems),
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.aiSystemsByCountry}.data.json`),
    fetchEntityMap(INDICATORS.aiSystemsByCountry),
    // Fresh 2025-2026 indicators
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.frontierMath}.data.json`),
    fetchEntityMap(INDICATORS.frontierMath),
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

  // ─ Data center spend (sub-annual: yearIsDay, zeroDay=2014-01-01) ─
  const dcRows = parseOWID(dcSpendData);
  const dataCenterSpend = buildMonthTimeSeries(dcRows, investMap, '2014-01-01', ['United States']);

  // ─ AI systems per year ─
  const sysRows = parseOWID(systemsData);
  const aiSystemsPerYear = buildTimeSeries(sysRows, systemsMap);

  // ─ AI systems by country ─
  const sysCountryRows = parseOWID(systemsCountryData);
  const aiSystemsByCountry = buildTimeSeries(sysCountryRows, systemsCountryMap);

  // ─ FrontierMath benchmark (yearIsDay, zeroDay=2024-06-20, data through 2026) ─
  const fmRows = parseOWID(frontierMathData);
  const frontierMath = buildDatePointSeries(fmRows, frontierMathMap, '2024-06-20');

  // ─ Epoch AI live model data (2025-2026) ─
  const epochData = await fetchEpochModels();

  // ─ IM3 data center locations ─
  const dataCenters = await fetchDataCenterLocations();

  // ─ Stats ─
  const latestInvestWorld = investRows
    .filter(r => investMap[r.entityId] === 'World')
    .sort((a, b) => b.year - a.year)[0];
  const latestInvestUS = investRows
    .filter(r => investMap[r.entityId] === 'United States')
    .sort((a, b) => b.year - a.year)[0];

  // FrontierMath top score
  const fmTop = frontierMath.length > 0 ? frontierMath[0] : null;

  const stats = {
    latestYear: latestInvestWorld?.year ?? 0,
    globalInvestment: latestInvestWorld?.value ?? 0,
    usInvestment: latestInvestUS?.value ?? 0,
    totalModels2025: epochData.totalModels2025,
    fmTopModel: fmTop?.name ?? '',
    fmTopScore: fmTop?.score ?? 0,
  };

  return {
    investment,
    genAiInvestment,
    corporateDeals,
    newCompanies,
    companyAdoption,
    jobPostings,
    devsUsingAi,
    dataCenterSpend,
    aiSystemsPerYear,
    aiSystemsByCountry,
    frontierMath,
    epochModelsByOrg: epochData.modelsByOrg,
    epochModelsByYear: epochData.modelsByYear,
    dataCentersByState: dataCenters.byState,
    dataCentersByOperator: dataCenters.byOperator,
    stats: {
      ...stats,
      totalDataCenters: dataCenters.totalFacilities,
    },
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
