import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { UK_REGIONS } from '@/lib/climate/locations';

const MET_OFFICE_VARS = ['Tmean', 'Tmax', 'Tmin', 'Rainfall', 'Sunshine', 'AirFrost', 'Raindays1mm'] as const;
const VAR_LABELS: Record<string, string> = {
  Tmean: 'Mean Temperature',
  Tmax: 'Maximum Temperature',
  Tmin: 'Minimum Temperature',
  Rainfall: 'Rainfall',
  Sunshine: 'Sunshine Hours',
  AirFrost: 'Air Frost Days',
  Raindays1mm: 'Rain Days (≥1mm)',
};
const VAR_UNITS: Record<string, string> = {
  Tmean: '°C', Tmax: '°C', Tmin: '°C',
  Rainfall: 'mm', Sunshine: 'hours',
  AirFrost: 'days', Raindays1mm: 'days',
};

interface MonthlyDataPoint {
  year: number;
  month: number;
  value: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildLatestMonthStats(points: MonthlyDataPoint[], lowerIsBetter = false) {
  if (!points.length) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const sortedPoints = [...points]
    .filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));
  if (!sortedPoints.length) return null;
  const latest = sortedPoints[sortedPoints.length - 1];
  const comparable = sortedPoints.filter((point) => point.month === latest.month);
  const baseline = comparable.filter((point) => point.year >= 1961 && point.year <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((sum, point) => sum + point.value, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
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

function buildLatestThreeMonthStats(points: MonthlyDataPoint[], lowerIsBetter = false, isSum = false) {
  if (points.length < 3) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const sortedPoints = [...points]
    .filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));
  const windows: Array<{ endMonth: number; endYear: number; label: string; value: number }> = [];

  for (let index = 2; index < sortedPoints.length; index++) {
    const a = sortedPoints[index - 2];
    const b = sortedPoints[index - 1];
    const c = sortedPoints[index];
    const isContiguous = (a.year * 12 + a.month + 1 === b.year * 12 + b.month)
      && (b.year * 12 + b.month + 1 === c.year * 12 + c.month);
    if (!isContiguous) continue;
    windows.push({
      endMonth: c.month,
      endYear: c.year,
      label: `${MONTH_NAMES[a.month - 1]}–${MONTH_NAMES[c.month - 1]} ${c.year}`,
      value: isSum
        ? round2(a.value + b.value + c.value)
        : round2((a.value + b.value + c.value) / 3),
    });
  }

  if (!windows.length) return null;
  const latest = windows[windows.length - 1];
  const comparable = windows.filter((window) => window.endMonth === latest.endMonth);
  const baseline = comparable.filter((window) => window.endYear >= 1961 && window.endYear <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((sum, window) => sum + window.value, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
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

function parseMetOfficeText(text: string): MonthlyDataPoint[] {
  const lines = text.split('\n');
  const points: MonthlyDataPoint[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip header lines and empty lines
    if (!trimmed || trimmed.startsWith('Month') || trimmed.startsWith('Year') || trimmed.includes('---')) continue;

    // Split by whitespace - format is: Year Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec Win Spr Sum Aut Ann
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;

    const year = parseInt(parts[0]);
    if (isNaN(year) || year < 1900) continue;

    for (let m = 0; m < 12; m++) {
      const val = parseFloat(parts[m + 1]);
      if (!isNaN(val)) {
        points.push({ year, month: m + 1, value: Math.round(val * 100) / 100 });
      }
    }
  }

  return points;
}

async function fetchMetOfficeVar(region: string, variable: string): Promise<MonthlyDataPoint[]> {
  const url = `https://www.metoffice.gov.uk/pub/data/weather/uk/climate/datasets/${variable}/date/${region}.txt`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const text = await res.text();
    return parseMetOfficeText(text);
  } catch {
    return [];
  }
}

function buildYearly(points: MonthlyDataPoint[], isSum: boolean) {
  const byYear: Record<number, number[]> = {};
  for (const p of points) {
    if (!byYear[p.year]) byYear[p.year] = [];
    byYear[p.year].push(p.value);
  }

  const years = Object.keys(byYear).map(Number).sort();
  const currentYear = new Date().getFullYear();
  const yearly = years
    .filter(y => y < currentYear && byYear[y].length >= 6)
    .map(y => {
      const vals = byYear[y];
      const agg = isSum
        ? Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100
        : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
      return { year: y, value: agg };
    });

  for (let i = 0; i < yearly.length; i++) {
    if (i >= 9) {
      const slice = yearly.slice(i - 9, i + 1);
      (yearly[i] as any).rollingAvg = Math.round((slice.reduce((a, b) => a + b.value, 0) / slice.length) * 100) / 100;
    }
  }

  return yearly;
}

function buildComparison(points: MonthlyDataPoint[]) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const historicByMonth: Record<number, number[]> = {};
  for (const p of points) {
    if (p.year >= 1961 && p.year <= 1990) {
      if (!historicByMonth[p.month]) historicByMonth[p.month] = [];
      historicByMonth[p.month].push(p.value);
    }
  }

  const comparison = [];
  for (let i = 12; i >= 1; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) { m += 12; y--; }

    const point = points.find(p => p.year === y && p.month === m);

    const historic = historicByMonth[m];
    const historicAvg = historic && historic.length > 0
      ? Math.round((historic.reduce((a, b) => a + b, 0) / historic.length) * 100) / 100
      : null;

    comparison.push({
      monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
      month: m,
      year: y,
      recent: point ? point.value : null,
      historicAvg,
      diff: point && historicAvg !== null ? Math.round((point.value - historicAvg) * 100) / 100 : null,
    });
  }

  return comparison;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const regionId = code.toLowerCase();

  const region = UK_REGIONS.find(r => r.id === regionId);
  if (!region || !region.metOfficeRegion) {
    return NextResponse.json({ error: 'UK region not found' }, { status: 404 });
  }

  const cacheKey = `climate:ukregion:${regionId}`;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v7`;

  const cached = await getCached<any>(cacheKey);
  if (cached && cached.lastUpdated === currentMonthKey) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  try {
    // Fetch all variables in parallel
    const results = await Promise.all(
      MET_OFFICE_VARS.map(v => fetchMetOfficeVar(region.metOfficeRegion!, v))
    );

    const varData: Record<string, any> = {};
    for (let i = 0; i < MET_OFFICE_VARS.length; i++) {
      const varName = MET_OFFICE_VARS[i];
      const points = results[i];
      if (points.length === 0) continue;

      const isSum = ['Rainfall', 'Sunshine', 'AirFrost', 'Raindays1mm'].includes(varName);
      const lowerIsBetter = varName === 'AirFrost';

      varData[varName] = {
        label: VAR_LABELS[varName],
        units: VAR_UNITS[varName],
        yearly: buildYearly(points, isSum),
        monthlyComparison: buildComparison(points),
        latestMonthStats: buildLatestMonthStats(points, lowerIsBetter),
        latestThreeMonthStats: buildLatestThreeMonthStats(points, lowerIsBetter, isSum),
      };
    }

    const response = {
      region: region.name,
      id: regionId,
      metOfficeRegion: region.metOfficeRegion,
      varData,
      lastUpdated: currentMonthKey,
      attribution: 'Contains Met Office data © Crown copyright',
    };

    await setShortTerm(cacheKey, response);
    return NextResponse.json({ ...response, source: 'fresh' });
  } catch (err: any) {
    if (cached) {
      return NextResponse.json({ ...cached, source: 'stale-cache', warning: 'Using cached data' });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
