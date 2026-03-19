import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'ai:dashboard:v17';
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
  dataCenterSpend: 1132529,     // Monthly US data center construction spend (unused, kept for reference)
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
  latestModels: { name: string; org: string; date: string; domain: string }[];
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
    if (!res.ok) return { modelsByOrg: [], modelsByYear: [], latestModels: [], totalModels2025: 0 };
    const text = await res.text();
    const rows = parseCSVRecords(text);
    if (rows.length < 2) return { modelsByOrg: [], modelsByYear: [], latestModels: [], totalModels2025: 0 };
    const headers = rows[0];
    const dateIdx = headers.indexOf('Publication date');
    const orgIdx = headers.indexOf('Organization');
    const nameIdx = headers.indexOf('Model');
    const domainIdx = headers.indexOf('Domain');
    if (dateIdx < 0) return { modelsByOrg: [], modelsByYear: [], latestModels: [], totalModels2025: 0 };

    const orgCounts = new Map<string, number>();
    const yearCounts = new Map<number, number>();
    const allRecent: { name: string; org: string; date: string; domain: string; sortDate: string }[] = [];
    let total2025 = 0;

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (cols.length <= dateIdx) continue;
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
      if (year >= 2024) {
        const modelName = nameIdx >= 0 ? (cols[nameIdx] || '').trim() : '';
        const org = orgIdx >= 0 ? (cols[orgIdx] || '').split(',')[0].trim() : '';
        const domain = domainIdx >= 0 ? (cols[domainIdx] || '').split(',')[0].trim() : '';
        if (modelName) {
          allRecent.push({ name: modelName, org, date: date.substring(0, 10), domain, sortDate: date });
        }
      }
    }

    const modelsByOrg = Array.from(orgCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const modelsByYear = Array.from(yearCounts.entries())
      .map(([year, count]) => ({ year, 'Notable Models': count }))
      .sort((a, b) => a.year - b.year);

    const latestModels = allRecent
      .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
      .slice(0, 15)
      .map(({ sortDate, ...rest }) => rest);

    return { modelsByOrg, modelsByYear, latestModels, totalModels2025: total2025 };
  } catch {
    return { modelsByOrg: [], modelsByYear: [], latestModels: [], totalModels2025: 0 };
  }
}

/** RFC 4180 CSV parser handling quoted fields with embedded newlines, commas, and escaped quotes */
function parseCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++;
        current.push(field.trim());
        if (current.some(f => f !== '')) records.push(current);
        current = [];
        field = '';
      } else if (ch === '\r') {
        current.push(field.trim());
        if (current.some(f => f !== '')) records.push(current);
        current = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length > 0) {
    current.push(field.trim());
    if (current.some(f => f !== '')) records.push(current);
  }
  return records;
}

/* ─── Epoch AI Frontier Data Centers ───────────────────────────────────────── */

const EPOCH_DC_CSV = 'https://epoch.ai/data/data_centers/data_centers.csv';
const EPOCH_DC_TIMELINE_CSV = 'https://epoch.ai/data/data_centers/data_center_timelines.csv';

interface FrontierDC {
  name: string;
  owner: string;
  users: string;
  powerMW: number;
  h100Equiv: number;
  costBillions: number;
  country: string;
  lat: number;
  lon: number;
}

/** Convert DMS string like `40°04'05"N` or `82°45'00"W` to decimal degrees. */
function parseDMS(dms: string): number {
  if (!dms) return 0;
  const n = parseFloat(dms);
  // If it's already a plain decimal number (no °), just return it
  if (!dms.includes('°')) return isNaN(n) ? 0 : n;
  const m = dms.match(/(\d+)[°]\s*(\d+)[′']\s*(\d+(?:\.\d+)?)[″"]?\s*([NSEW])?/i);
  if (!m) return isNaN(n) ? 0 : n;
  const deg = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseFloat(m[3]);
  const dir = (m[4] || '').toUpperCase();
  let dd = deg + min / 60 + sec / 3600;
  if (dir === 'S' || dir === 'W') dd = -dd;
  return dd;
}

async function fetchFrontierDataCenters(): Promise<{
  sites: FrontierDC[];
  timeline: { date: string; totalPowerMW: number; totalH100e: number; totalCostB: number }[];
  totalPowerMW: number;
  totalCostB: number;
  totalH100e: number;
}> {
  const empty = { sites: [], timeline: [], totalPowerMW: 0, totalCostB: 0, totalH100e: 0 };
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000);
    const [dcRes, tlRes] = await Promise.all([
      fetch(EPOCH_DC_CSV, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch(EPOCH_DC_TIMELINE_CSV, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }),
    ]);
    clearTimeout(id);

    if (!dcRes.ok) return empty;

    // Parse main data centers CSV
    const dcText = await dcRes.text();
    const dcRows = parseCSVRecords(dcText);
    if (dcRows.length < 2) return empty;
    const h = dcRows[0];
    const idx = (col: string) => h.indexOf(col);
    const nameI = idx('Name');
    const ownerI = idx('Owner');
    const usersI = idx('Users');
    const powerI = idx('Current power (MW)');
    const h100I = idx('Current H100 equivalents');
    const costI = idx('Current total capital cost (2025 USD billions)');
    const countryI = idx('Country');
    const latI = idx('Latitude');
    const lonI = idx('Longitude');

    if (nameI < 0) return empty;

    const sites: FrontierDC[] = [];
    let totalPowerMW = 0;
    let totalCostB = 0;
    let totalH100e = 0;

    for (let i = 1; i < dcRows.length; i++) {
      const r = dcRows[i];
      const get = (ci: number) => ci >= 0 && ci < r.length ? r[ci] : '';
      const cleanTag = (s: string) => s.replace(/#\w+/g, '').trim();
      const power = parseFloat(get(powerI)) || 0;
      const h100 = parseFloat(get(h100I)) || 0;
      const cost = parseFloat(get(costI)) || 0;
      totalPowerMW += power;
      totalCostB += cost;
      totalH100e += h100;
      sites.push({
        name: get(nameI),
        owner: cleanTag(get(ownerI)),
        users: cleanTag(get(usersI)),
        powerMW: Math.round(power),
        h100Equiv: Math.round(h100),
        costBillions: Math.round(cost * 10) / 10,
        country: get(countryI),
        lat: parseDMS(get(latI)),
        lon: parseDMS(get(lonI)),
      });
    }

    // Sort by power descending
    sites.sort((a, b) => b.powerMW - a.powerMW);

    // Parse timeline CSV — aggregate total power/compute over time
    let timeline: { date: string; totalPowerMW: number; totalH100e: number; totalCostB: number }[] = [];
    if (tlRes.ok) {
      const tlText = await tlRes.text();
      const tlRows = parseCSVRecords(tlText);
      if (tlRows.length > 1) {
        const th = tlRows[0];
        const dateI = th.indexOf('Date');
        const tPowerI = th.indexOf('Power (MW)');
        const tH100I = th.indexOf('H100 equivalents');
        const tCostI = th.indexOf('Total capital cost (2025 USD billions)');
        const dcNameI = th.indexOf('Data center');

        if (dateI >= 0 && tPowerI >= 0) {
          // Aggregate by month: sum power across all DCs for each month
          const monthAgg = new Map<string, { power: number; h100: number; cost: number }>();

          for (let i = 1; i < tlRows.length; i++) {
            const r = tlRows[i];
            const date = r[dateI] || '';
            const month = date.substring(0, 7); // YYYY-MM
            if (!month || month.length < 7) continue;
            const power = parseFloat(r[tPowerI] || '0') || 0;
            const h100 = parseFloat(r[tH100I] || '0') || 0;
            const cost = parseFloat(r[tCostI] || '0') || 0;
            const entry = monthAgg.get(month) || { power: 0, h100: 0, cost: 0 };
            // For each DC that has multiple timeline entries in the same month,
            // keep the latest (highest) values - so we take max per DC per month
            // Simple approach: just sum all, then we'll use the latest date's cumulative
            entry.power += power;
            entry.h100 += h100;
            entry.cost += cost;
            monthAgg.set(month, entry);
          }

          // Build a cumulative timeline by tracking latest state per DC
          // Better approach: For each unique date, sum latest power across all DCs
          const dcLatest = new Map<string, { date: string; power: number; h100: number; cost: number }>();
          const dateEntries: { date: string; dc: string; power: number; h100: number; cost: number }[] = [];

          for (let i = 1; i < tlRows.length; i++) {
            const r = tlRows[i];
            const date = r[dateI] || '';
            const dc = dcNameI >= 0 ? r[dcNameI] || '' : '';
            const power = parseFloat(r[tPowerI] || '0') || 0;
            const h100 = parseFloat(r[tH100I] || '0') || 0;
            const cost = parseFloat(r[tCostI] || '0') || 0;
            if (date) dateEntries.push({ date, dc, power, h100, cost });
          }

          dateEntries.sort((a, b) => a.date.localeCompare(b.date));

          const uniqueDates = [...new Set(dateEntries.map(e => e.date))].sort();
          const quarterDates: string[] = [];

          // Sample quarterly to keep data manageable
          for (const date of uniqueDates) {
            // Update DC states
            for (const e of dateEntries.filter(x => x.date === date)) {
              dcLatest.set(e.dc, { date: e.date, power: e.power, h100: e.h100, cost: e.cost });
            }
          }

          // Rebuild: step through all dates and snapshot state every quarter
          const dcState = new Map<string, { power: number; h100: number; cost: number }>();
          let lastQuarter = '';
          for (const date of uniqueDates) {
            for (const e of dateEntries.filter(x => x.date === date)) {
              dcState.set(e.dc, { power: e.power, h100: e.h100, cost: e.cost });
            }
            const q = date.substring(0, 7);
            if (q !== lastQuarter) {
              lastQuarter = q;
              let tPower = 0, tH100 = 0, tCost = 0;
              for (const v of dcState.values()) {
                tPower += v.power;
                tH100 += v.h100;
                tCost += v.cost;
              }
              timeline.push({
                date: date.substring(0, 7),
                totalPowerMW: Math.round(tPower),
                totalH100e: Math.round(tH100),
                totalCostB: Math.round(tCost * 10) / 10,
              });
            }
          }
        }
      }
    }

    return {
      sites,
      timeline,
      totalPowerMW: Math.round(totalPowerMW),
      totalCostB: Math.round(totalCostB * 10) / 10,
      totalH100e: Math.round(totalH100e),
    };
  } catch {
    return empty;
  }
}

/* ─── Main data fetch ─────────────────────────────────────────────────────── */

async function fetchWorldElectricityTWh(): Promise<number | null> {
  const data = await fetchJSON('https://owid-public.owid.io/data/energy/owid-energy-data.json', 30000);
  if (!data?.World) return null;
  const worldYears: { year: number; electricity_generation?: number }[] = data.World.data ?? [];
  for (let i = worldYears.length - 1; i >= 0; i--) {
    if (worldYears[i].electricity_generation != null) return worldYears[i].electricity_generation!;
  }
  return null;
}

async function fetchAIDashboardData() {
  // Fetch all indicators in parallel
  const [
    investData, investMap,
    systemsData, systemsMap,
    systemsCountryData, systemsCountryMap,
    frontierMathData, frontierMathMap,
  ] = await Promise.all([
    fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.privateInvestment}.data.json`),
    fetchEntityMap(INDICATORS.privateInvestment),
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
  const [epochData, frontierDC, worldElecTWh] = await Promise.all([
    fetchEpochModels(),
    fetchFrontierDataCenters(),
    fetchWorldElectricityTWh(),
  ]);

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
    aiSystemsPerYear,
    aiSystemsByCountry,
    frontierMath,
    epochModelsByOrg: epochData.modelsByOrg,
    epochModelsByYear: epochData.modelsByYear,
    latestModels: epochData.latestModels,
    frontierDataCenters: frontierDC.sites,
    frontierDCTimeline: frontierDC.timeline,
    stats: {
      ...stats,
      frontierTotalPowerMW: frontierDC.totalPowerMW,
      frontierTotalCostB: frontierDC.totalCostB,
      frontierTotalH100e: frontierDC.totalH100e,
      frontierCount: frontierDC.sites.length,
      worldElectricityTWh: worldElecTWh,
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
