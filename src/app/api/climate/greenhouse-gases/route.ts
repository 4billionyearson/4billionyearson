import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'climate:greenhouse-gases:v3';
const CACHE_TTL_HOURS = 12;

interface MonthlyPoint {
  date: string;   // "YYYY-MM"
  value: number;
  trend: number;
}

interface YearlyPoint {
  year: number;
  value: number;
}

interface GasData {
  current: { value: number; trend: number; date: string };
  monthly: MonthlyPoint[];
  yearly: YearlyPoint[];
  preindustrial: number;
  unit: string;
}

interface TempPoint {
  year: number;
  anomaly: number;
}

interface GHGData {
  co2: GasData | null;
  methane: GasData | null;
  n2o: GasData | null;
  temperature: { current: { anomaly: number; date: string }; yearly: TempPoint[] } | null;
  arcticIce: { current: { extent: number; anomaly: number; date: string }; yearly: YearlyPoint[] } | null;
  oceanWarming: { current: { anomaly: number; year: string }; yearly: YearlyPoint[] } | null;
  seaLevel: { current: { value: number; year: string }; rate: string; yearly: YearlyPoint[] } | null;
  fetchedAt: string;
}

async function fetchJSON(url: string, timeout = 15000) {
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

async function fetchText(url: string, timeout = 15000): Promise<string | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

function parseNOAACO2(text: string): { monthly: MonthlyPoint[]; yearly: YearlyPoint[] } | null {
  const monthly: MonthlyPoint[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) continue;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const avg = parseFloat(parts[3]);    // monthly mean
    const trend = parseFloat(parts[4]);  // seasonally adjusted
    if (isNaN(year) || isNaN(month) || isNaN(avg) || avg < 0) continue;
    const date = `${year}-${String(month).padStart(2, '0')}`;
    monthly.push({ date, value: avg, trend: isNaN(trend) || trend < 0 ? avg : trend });
  }
  if (monthly.length === 0) return null;

  const byYear: Record<number, number[]> = {};
  for (const m of monthly) {
    const yr = parseInt(m.date.split('-')[0], 10);
    if (!isNaN(yr)) (byYear[yr] ??= []).push(m.trend > 0 ? m.trend : m.value);
  }
  const yearly: YearlyPoint[] = Object.entries(byYear)
    .filter(([, vals]) => vals.length >= 6) // need at least 6 months for a meaningful yearly average
    .map(([y, vals]) => ({ year: Number(y), value: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => a.year - b.year);

  return { monthly, yearly };
}

function buildYearlyAverages(monthly: MonthlyPoint[]): YearlyPoint[] {
  const byYear: Record<number, number[]> = {};
  for (const m of monthly) {
    const yr = parseInt(m.date.split('-')[0], 10);
    if (!isNaN(yr)) (byYear[yr] ??= []).push(m.value);
  }
  return Object.entries(byYear)
    .map(([y, vals]) => ({ year: Number(y), value: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => a.year - b.year);
}

async function fetchGHGData(): Promise<GHGData> {
  const [co2Text, co2Raw, tempRaw, methaneRaw, n2oRaw, arcticRaw, oceanRaw, seaLevelText] = await Promise.all([
    fetchText('https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt'),
    fetchJSON('https://global-warming.org/api/co2-api'),       // fallback for current reading
    fetchJSON('https://global-warming.org/api/temperature-api'),
    fetchJSON('https://global-warming.org/api/methane-api'),
    fetchJSON('https://global-warming.org/api/nitrous-oxide-api'),
    fetchJSON('https://global-warming.org/api/arctic-api'),
    fetchJSON('https://global-warming.org/api/ocean-warming-api'),
    fetchText('https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_keep_all_66.csv'),
  ]);

  // ── CO₂ (NOAA Mauna Loa — 1958-present, fallback to global-warming.org) ──
  let co2: GHGData['co2'] = null;
  const noaaCO2 = co2Text ? parseNOAACO2(co2Text) : null;
  if (noaaCO2 && noaaCO2.monthly.length > 0) {
    const latest = noaaCO2.monthly[noaaCO2.monthly.length - 1];
    co2 = {
      current: { value: latest.value, trend: latest.trend, date: latest.date },
      monthly: noaaCO2.monthly,
      yearly: noaaCO2.yearly,
      preindustrial: 280,
      unit: 'ppm',
    };
  } else if (co2Raw?.co2?.length) {
    // Fallback to global-warming.org if NOAA is unavailable
    const monthly: MonthlyPoint[] = [];
    for (const e of co2Raw.co2) {
      const val = parseFloat(e.cycle);
      const trend = parseFloat(e.trend);
      if (isNaN(val)) continue;
      const date = `${e.year}-${String(e.month).padStart(2, '0')}`;
      monthly.push({ date, value: val, trend: isNaN(trend) ? val : trend });
    }
    const latest = co2Raw.co2[co2Raw.co2.length - 1];
    co2 = {
      current: {
        value: parseFloat(latest.cycle),
        trend: parseFloat(latest.trend),
        date: `${latest.year}-${String(latest.month).padStart(2, '0')}-${String(latest.day).padStart(2, '0')}`,
      },
      monthly,
      yearly: buildYearlyAverages(monthly),
      preindustrial: 280,
      unit: 'ppm',
    };
  }

  // ── Methane ──
  let methane: GHGData['methane'] = null;
  if (methaneRaw?.methane?.length) {
    const monthly: MonthlyPoint[] = [];
    for (const e of methaneRaw.methane) {
      const val = parseFloat(e.average);
      const trend = parseFloat(e.trend);
      if (isNaN(val)) continue;
      // date format from API: "YYYY.MM" or "YYYY.M"
      const parts = e.date.split('.');
      const date = `${parts[0]}-${parts[1]?.padStart(2, '0') || '01'}`;
      monthly.push({ date, value: val, trend: isNaN(trend) ? val : trend });
    }
    const latest = methaneRaw.methane[methaneRaw.methane.length - 1];
    methane = {
      current: {
        value: parseFloat(latest.average),
        trend: parseFloat(latest.trend),
        date: latest.date,
      },
      monthly,
      yearly: buildYearlyAverages(monthly),
      preindustrial: 722,
      unit: 'ppb',
    };
  }

  // ── N₂O ──
  let n2o: GHGData['n2o'] = null;
  if (n2oRaw?.nitrous?.length) {
    const monthly: MonthlyPoint[] = [];
    for (const e of n2oRaw.nitrous) {
      const val = parseFloat(e.average);
      const trend = parseFloat(e.trend);
      if (isNaN(val)) continue;
      const parts = e.date.split('.');
      const date = `${parts[0]}-${parts[1]?.padStart(2, '0') || '01'}`;
      monthly.push({ date, value: val, trend: isNaN(trend) ? val : trend });
    }
    const latest = n2oRaw.nitrous[n2oRaw.nitrous.length - 1];
    n2o = {
      current: {
        value: parseFloat(latest.average),
        trend: parseFloat(latest.trend),
        date: latest.date,
      },
      monthly,
      yearly: buildYearlyAverages(monthly),
      preindustrial: 270,
      unit: 'ppb',
    };
  }

  // ── Temperature ──
  let temperature: GHGData['temperature'] = null;
  if (tempRaw?.result?.length) {
    const latest = tempRaw.result[tempRaw.result.length - 1];
    const byYear: Record<number, number[]> = {};
    for (const r of tempRaw.result) {
      const yr = Math.floor(parseFloat(r.time));
      const val = parseFloat(r.station);
      if (!isNaN(yr) && !isNaN(val)) (byYear[yr] ??= []).push(val);
    }
    const yearly: TempPoint[] = Object.entries(byYear)
      .map(([y, vals]) => ({ year: Number(y), anomaly: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => a.year - b.year);
    temperature = {
      current: { anomaly: parseFloat(latest.station), date: latest.time },
      yearly,
    };
  }

  // ── Arctic Ice ──
  let arcticIce: GHGData['arcticIce'] = null;
  if (arcticRaw?.arcticData?.data) {
    const entries = Object.entries(arcticRaw.arcticData.data);
    const yearly: YearlyPoint[] = [];
    const byYear: Record<number, number[]> = {};
    for (const [key, val] of entries) {
      const v = val as any;
      if (v.value === -9999) continue;
      const yr = parseInt(key.substring(0, 4), 10);
      if (!isNaN(yr)) (byYear[yr] ??= []).push(v.value);
    }
    for (const [y, vals] of Object.entries(byYear)) {
      yearly.push({ year: Number(y), value: vals.reduce((a, b) => a + b, 0) / vals.length });
    }
    yearly.sort((a, b) => a.year - b.year);

    const keys = Object.keys(arcticRaw.arcticData.data);
    const lastKey = keys[keys.length - 1];
    const lastVal = arcticRaw.arcticData.data[lastKey];
    if (lastVal && lastVal.value !== -9999) {
      arcticIce = {
        current: { extent: lastVal.value, anomaly: lastVal.anom, date: lastKey },
        yearly,
      };
    }
  }

  // ── Ocean Warming ──
  let oceanWarming: GHGData['oceanWarming'] = null;
  if (oceanRaw?.result) {
    const yearly: YearlyPoint[] = [];
    for (const [y, val] of Object.entries(oceanRaw.result)) {
      const yr = parseInt(y, 10);
      const v = val as any;
      if (!isNaN(yr) && v.anomaly != null) {
        yearly.push({ year: yr, value: parseFloat(v.anomaly) });
      }
    }
    yearly.sort((a, b) => a.year - b.year);
    const years = Object.keys(oceanRaw.result);
    const lastYear = years[years.length - 1];
    oceanWarming = {
      current: { anomaly: parseFloat(oceanRaw.result[lastYear].anomaly), year: lastYear },
      yearly,
    };
  }

  // ── Sea Level (NOAA STAR satellite altimetry) ──
  let seaLevel: GHGData['seaLevel'] = null;
  if (seaLevelText) {
    // Extract rate from header comment
    let rate = '3.4';
    const rateMatch = seaLevelText.match(/#trend\s*=\s*([\d.]+)\s*mm\/year/);
    if (rateMatch) rate = rateMatch[1];

    // Parse CSV: columns are year, TOPEX/Poseidon, Jason-1, Jason-2, Jason-3, Sentinel-6MF
    const byYear: Record<number, number[]> = {};
    let lastValue = 0;
    let lastYearDecimal = 0;
    for (const line of seaLevelText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('year')) continue;
      const cols = trimmed.split(',');
      if (cols.length < 2) continue;
      const yearDecimal = parseFloat(cols[0]);
      if (isNaN(yearDecimal)) continue;
      // Take the first non-empty satellite value
      let val: number | null = null;
      for (let i = 1; i < cols.length; i++) {
        const v = parseFloat(cols[i]);
        if (!isNaN(v)) { val = v; break; }
      }
      if (val === null) continue;
      const yr = Math.floor(yearDecimal);
      (byYear[yr] ??= []).push(val);
      if (yearDecimal > lastYearDecimal) {
        lastYearDecimal = yearDecimal;
        lastValue = val;
      }
    }
    const yearly: YearlyPoint[] = Object.entries(byYear)
      .map(([y, vals]) => ({ year: Number(y), value: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => a.year - b.year);
    if (yearly.length > 0) {
      seaLevel = {
        current: { value: lastValue, year: Math.floor(lastYearDecimal).toString() },
        rate: `${rate} mm/year`,
        yearly,
      };
    }
  }

  return { co2, methane, n2o, temperature, arcticIce, oceanWarming, seaLevel, fetchedAt: new Date().toISOString() };
}

export async function GET() {
  try {
    const cached = await getCached<GHGData>(CACHE_KEY);
    if (cached) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL_HOURS * 60 * 60 * 1000) {
        return NextResponse.json(cached);
      }
    }

    const data = await fetchGHGData();
    await setShortTerm(CACHE_KEY, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Greenhouse gases API error:', error);
    // Fall back to stale cache
    const cached = await getCached<GHGData>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'stale-cache', warning: 'Using stale cached data' });
    }
    return NextResponse.json({ error: 'Failed to fetch greenhouse gas data' }, { status: 500 });
  }
}
