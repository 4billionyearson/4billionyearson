import { NextResponse } from 'next/server';
import { getCached, setPermanent, setShortTerm } from '@/lib/climate/redis';
import { COUNTRIES } from '@/lib/climate/locations';

interface OwidDataResponse {
  values: number[];
  years: number[];
  entities: number[];
}

interface MonthlyPoint {
  date: string; // YYYY-MM
  year: number;
  month: number;
  temp: number;
}

function parseOwidData(data: OwidDataResponse, entityId: number): MonthlyPoint[] {
  const epoch = new Date(1950, 0, 1);
  const points: MonthlyPoint[] = [];

  // OWID data can include projected/modeled values into the future.
  // Exclude the current (incomplete) month and anything beyond it.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  for (let i = 0; i < data.years.length; i++) {
    if (data.entities[i] !== entityId) continue;
    const d = new Date(epoch.getTime() + data.years[i] * 86400000);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    // Skip current month (incomplete) and anything in the future
    if (year > currentYear || (year === currentYear && month >= currentMonth)) continue;

    points.push({
      date: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      temp: Math.round(data.values[i] * 100) / 100,
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function buildYearlyData(monthly: MonthlyPoint[]) {
  const byYear: Record<number, number[]> = {};
  for (const p of monthly) {
    if (!byYear[p.year]) byYear[p.year] = [];
    byYear[p.year].push(p.temp);
  }

  const years = Object.keys(byYear).map(Number).sort();
  const currentYear = new Date().getFullYear();
  const yearlyData = years
    .filter(y => y < currentYear && byYear[y].length >= 6) // exclude current (incomplete) year
    .map(y => {
      const temps = byYear[y];
      return {
        year: y,
        avgTemp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 100) / 100,
        rollingAvg: undefined as number | undefined,
      };
    });

  // Add rolling average
  for (let i = 0; i < yearlyData.length; i++) {
    if (i >= 9) {
      const slice = yearlyData.slice(i - 9, i + 1);
      yearlyData[i].rollingAvg = Math.round((slice.reduce((a, b) => a + b.avgTemp, 0) / slice.length) * 100) / 100;
    }
  }

  return yearlyData;
}

function buildMonthlyComparison(monthly: MonthlyPoint[]) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Historic average per month (1961-1990 baseline or whatever is available)
  const historicByMonth: Record<number, number[]> = {};
  for (const p of monthly) {
    if (p.year >= 1961 && p.year <= 1990) {
      if (!historicByMonth[p.month]) historicByMonth[p.month] = [];
      historicByMonth[p.month].push(p.temp);
    }
  }

  // Fallback: if not enough 1961-1990 data, use all data before 2000
  const hasBaseline = Object.keys(historicByMonth).length === 12;
  if (!hasBaseline) {
    for (const p of monthly) {
      if (p.year < 2000) {
        if (!historicByMonth[p.month]) historicByMonth[p.month] = [];
        historicByMonth[p.month].push(p.temp);
      }
    }
  }

  // Last 12 completed months (exclude current incomplete month)
  const recent12: { point: MonthlyPoint | null; month: number; year: number }[] = [];
  for (let i = 1; i <= 12; i++) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) { m += 12; y--; }
    const point = monthly.find(p => p.year === y && p.month === m) || null;
    recent12.unshift({ point, month: m, year: y });
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return recent12.map(({ point, month, year }) => {
    const historic = historicByMonth[month];
    const historicAvg = historic && historic.length > 0
      ? Math.round((historic.reduce((a, b) => a + b, 0) / historic.length) * 100) / 100
      : null;
    const recentTemp = point ? point.temp : null;
    const diff = recentTemp !== null && historicAvg !== null ? Math.round((recentTemp - historicAvg) * 100) / 100 : null;

    return {
      monthLabel: `${monthNames[month - 1]} ${year}`,
      month,
      year,
      recentTemp,
      historicAvg,
      diff,
    };
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Find country in our lookup
  const country = COUNTRIES.find(c => c.owidCode === upperCode);
  if (!country || !country.owidEntityId) {
    return NextResponse.json({ error: 'Country not found' }, { status: 404 });
  }

  const cacheKey = `climate:country:${upperCode}`;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v4`;

  // Check cache
  const cached = await getCached<any>(cacheKey);
  if (cached && cached.lastUpdated === currentMonthKey) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  try {
    // Fetch temperature and precipitation data from OWID in parallel
    const [tempRes, precipRes] = await Promise.all([
      fetch('https://api.ourworldindata.org/v1/indicators/1005195.data.json', { next: { revalidate: 86400 } }),
      fetch('https://api.ourworldindata.org/v1/indicators/1005182.data.json', { next: { revalidate: 86400 } }),
    ]);

    if (!tempRes.ok) throw new Error(`OWID API returned ${tempRes.status}`);
    const data: OwidDataResponse = await tempRes.json();

    const monthly = parseOwidData(data, country.owidEntityId);
    if (monthly.length === 0) {
      return NextResponse.json({ error: 'No data available for this country' }, { status: 404 });
    }

    const yearlyData = buildYearlyData(monthly);
    const monthlyComparison = buildMonthlyComparison(monthly);

    // Parse precipitation data (annual, years are actual year values not epoch-days)
    let precipYearly: { year: number; value: number; rollingAvg?: number }[] | null = null;
    if (precipRes.ok) {
      const precipData: OwidDataResponse = await precipRes.json();
      const precipPoints: { year: number; value: number }[] = [];
      for (let i = 0; i < precipData.years.length; i++) {
        if (precipData.entities[i] !== country.owidEntityId) continue;
        precipPoints.push({
          year: precipData.years[i],
          value: Math.round(precipData.values[i] * 10) / 10,
        });
      }
      precipPoints.sort((a, b) => a.year - b.year);

      if (precipPoints.length > 0) {
        precipYearly = precipPoints.map((p, i, arr) => {
          let rollingAvg: number | undefined;
          if (i >= 9) {
            const slice = arr.slice(i - 9, i + 1);
            rollingAvg = Math.round((slice.reduce((a, b) => a + b.value, 0) / slice.length) * 10) / 10;
          }
          return { ...p, rollingAvg };
        });
      }
    }

    const result = {
      country: country.name,
      code: upperCode,
      yearlyData,
      monthlyComparison,
      precipYearly,
      dataPoints: monthly.length,
      dateRange: `${monthly[0].date} to ${monthly[monthly.length - 1].date}`,
      lastUpdated: currentMonthKey,
    };

    // Cache: recent months get short TTL, historical data is permanent
    await setShortTerm(cacheKey, result);

    return NextResponse.json({ ...result, source: 'fresh' });
  } catch (err: any) {
    // If we have stale cache, return it with a warning
    if (cached) {
      return NextResponse.json({ ...cached, source: 'stale-cache', warning: 'Using cached data - live source unavailable' });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
