import { NextResponse } from 'next/server';
import { getCached, setShortTerm, setDailyTerm } from '@/lib/climate/redis';
import { US_STATES } from '@/lib/climate/locations';

interface NoaaDataPoint {
  value: string;
  anomaly?: string;
}

interface NoaaResponse {
  description: { title: string; units: string };
  data: Record<string, NoaaDataPoint>;
}

const NOAA_PARAMS = ['tavg', 'tmax', 'tmin', 'pcp'] as const;
const PARAM_LABELS: Record<string, string> = {
  tavg: 'Average Temperature',
  tmax: 'Maximum Temperature',
  tmin: 'Minimum Temperature',
  pcp: 'Precipitation',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthlyEntries(monthlyData: Record<string, number>) {
  return Object.entries(monthlyData)
    .map(([key, value]) => ({ year: parseInt(key.substring(0, 4)), month: parseInt(key.substring(4, 6)), value }))
    .filter((point) => !Number.isNaN(point.year) && !Number.isNaN(point.month))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));
}

function buildLatestMonthStats(monthlyData: Record<string, number>) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const points = monthlyEntries(monthlyData)
    .filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth));
  if (!points.length) return null;
  const latest = points[points.length - 1];
  const comparable = points.filter((point) => point.month === latest.month);
  const baseline = comparable.filter((point) => point.year >= 1961 && point.year <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((sum, point) => sum + point.value, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => b.value - a.value);
  const rank = ranked.findIndex((point) => point.year === latest.year && point.month === latest.month) + 1;
  const record = ranked[0];

  return {
    label: `${MONTH_NAMES[latest.month - 1]} ${latest.year}`,
    value: latest.value,
    diff: baselineAvg === null ? null : round2(latest.value - baselineAvg),
    rank,
    total: ranked.length,
    recordLabel: `${MONTH_NAMES[record.month - 1]} ${record.year}`,
    recordValue: record.value,
  };
}

function buildLatestThreeMonthStats(monthlyData: Record<string, number>) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const points = monthlyEntries(monthlyData)
    .filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth));
  if (points.length < 3) return null;
  const windows: Array<{ endMonth: number; endYear: number; label: string; value: number }> = [];
  for (let index = 2; index < points.length; index++) {
    const a = points[index - 2];
    const b = points[index - 1];
    const c = points[index];
    const isContiguous = (a.year * 12 + a.month + 1 === b.year * 12 + b.month)
      && (b.year * 12 + b.month + 1 === c.year * 12 + c.month);
    if (!isContiguous) continue;
    windows.push({
      endMonth: c.month,
      endYear: c.year,
      label: `${MONTH_NAMES[a.month - 1]}–${MONTH_NAMES[c.month - 1]} ${c.year}`,
      value: round2((a.value + b.value + c.value) / 3),
    });
  }
  if (!windows.length) return null;
  const latest = windows[windows.length - 1];
  const comparable = windows.filter((window) => window.endMonth === latest.endMonth);
  const baseline = comparable.filter((window) => window.endYear >= 1961 && window.endYear <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((sum, window) => sum + window.value, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => b.value - a.value);
  const rank = ranked.findIndex((window) => window.label === latest.label) + 1;
  const record = ranked[0];

  return {
    label: latest.label,
    value: latest.value,
    diff: baselineAvg === null ? null : round2(latest.value - baselineAvg),
    rank,
    total: ranked.length,
    recordLabel: record.label,
    recordValue: record.value,
  };
}

function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5 / 9) * 100) / 100;
}

function inchesToMm(inches: number): number {
  return Math.round(inches * 25.4 * 100) / 100;
}

async function fetchNoaaParam(stateCode: number, param: string): Promise<{ data: Record<string, number>; title: string; units: string } | null> {
  const url = `https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/statewide/time-series/${stateCode}/${param}/1/0/1950-2026.json`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json: NoaaResponse = await res.json();

    const data: Record<string, number> = {};
    for (const [key, val] of Object.entries(json.data)) {
      const numVal = parseFloat(val.value);
      if (isNaN(numVal) || numVal === -99) continue;

      if (param === 'pcp') {
        data[key] = inchesToMm(numVal);
      } else {
        data[key] = fahrenheitToCelsius(numVal);
      }
    }

    return {
      data,
      title: json.description.title,
      units: param === 'pcp' ? 'mm' : '°C',
    };
  } catch {
    return null;
  }
}

function buildYearlyFromMonthly(monthlyData: Record<string, number>, param: string) {
  const byYear: Record<number, number[]> = {};

  for (const [key, val] of Object.entries(monthlyData)) {
    const year = parseInt(key.substring(0, 4));
    const month = parseInt(key.substring(4, 6));
    if (isNaN(year) || isNaN(month)) continue;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(val);
  }

  const years = Object.keys(byYear).map(Number).sort();
  const currentYear = new Date().getFullYear();
  const yearly = years
    .filter(y => y < currentYear && byYear[y].length >= 6)
    .map(y => {
      const vals = byYear[y];
      const avg = param === 'pcp'
        ? Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100 // Sum for precipitation
        : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100; // Average for temp
      return { year: y, value: avg };
    });

  // Rolling average
  for (let i = 0; i < yearly.length; i++) {
    if (i >= 9) {
      const slice = yearly.slice(i - 9, i + 1);
      (yearly[i] as any).rollingAvg = Math.round((slice.reduce((a, b) => a + b.value, 0) / slice.length) * 100) / 100;
    }
  }

  return yearly;
}

function buildMonthlyComparison(monthlyData: Record<string, number>, param: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // Historic baseline (1961-1990)
  const historicByMonth: Record<number, number[]> = {};
  for (const [key, val] of Object.entries(monthlyData)) {
    const year = parseInt(key.substring(0, 4));
    const month = parseInt(key.substring(4, 6));
    if (year >= 1961 && year <= 1990) {
      if (!historicByMonth[month]) historicByMonth[month] = [];
      historicByMonth[month].push(val);
    }
  }

  const comparison = [];
  for (let i = 12; i >= 1; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) { m += 12; y--; }
    const key = `${y}${String(m).padStart(2, '0')}`;
    const recent = monthlyData[key];
    const historic = historicByMonth[m];
    const historicAvg = historic && historic.length > 0
      ? Math.round((historic.reduce((a, b) => a + b, 0) / historic.length) * 100) / 100
      : null;

    comparison.push({
      monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
      month: m,
      year: y,
      recent: recent !== undefined ? recent : null,
      historicAvg,
      diff: recent !== undefined && historicAvg !== null ? Math.round((recent - historicAvg) * 100) / 100 : null,
    });
  }

  return comparison;
}

function getPrevMonthKey(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLatestDataMonth(data: Record<string, number>): string {
  const keys = Object.keys(data).sort();
  if (keys.length === 0) return '';
  const latest = keys[keys.length - 1];
  return `${latest.substring(0, 4)}-${latest.substring(4, 6)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const stateId = code.toLowerCase();

  const state = US_STATES.find(s => s.id === stateId);
  if (!state || !state.noaaStateCode) {
    return NextResponse.json({ error: 'US state not found' }, { status: 404 });
  }

  const cacheKey = `climate:usstate:${stateId}-v4`;
  const prevMonthKey = getPrevMonthKey();

  const cached = await getCached<any>(cacheKey);
  if (cached && cached.lastUpdated >= prevMonthKey) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  try {
    // Fetch all params in parallel
    const results = await Promise.all(
      NOAA_PARAMS.map(p => fetchNoaaParam(state.noaaStateCode!, p))
    );

    const paramData: Record<string, any> = {};
    for (let i = 0; i < NOAA_PARAMS.length; i++) {
      const param = NOAA_PARAMS[i];
      const result = results[i];
      if (!result) continue;

      paramData[param] = {
        label: PARAM_LABELS[param],
        units: result.units,
        yearly: buildYearlyFromMonthly(result.data, param),
        monthlyComparison: buildMonthlyComparison(result.data, param),
        latestMonthStats: buildLatestMonthStats(result.data),
        latestThreeMonthStats: buildLatestThreeMonthStats(result.data),
        ...(param === 'tavg' ? { monthlyAll: monthlyEntries(result.data) } : {}),
      };
    }

    const tavgData = results[0]?.data ?? {};
    const latestDataMonth = getLatestDataMonth(tavgData);

    const response = {
      state: state.name,
      id: stateId,
      paramData,
      lastUpdated: latestDataMonth,
    };

    if (latestDataMonth >= prevMonthKey) {
      await setShortTerm(cacheKey, response);
    } else {
      await setDailyTerm(cacheKey, response);
    }
    return NextResponse.json({ ...response, source: 'fresh' });
  } catch (err: any) {
    if (cached) {
      return NextResponse.json({ ...cached, source: 'stale-cache', warning: 'Using cached data' });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
