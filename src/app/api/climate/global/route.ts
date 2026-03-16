import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const GLOBAL_BASELINE = 13.9; // NOAA 20th century average
const PRE_INDUSTRIAL_BASELINE = 13.5; // Approximate pre-industrial (1850-1900) absolute temp

export async function GET() {
  const cacheKey = 'climate:global';
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v2`;

  const cached = await getCached<any>(cacheKey);
  if (cached && cached.lastUpdated === currentMonthKey) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  try {
    const res = await fetch(
      'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/1/0/1950-2026.json',
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) throw new Error(`NOAA returned ${res.status}`);
    const json = await res.json();

    const monthlyData: { date: string; year: number; month: number; anomaly: number; absoluteTemp: number }[] = [];

    for (const [key, val] of Object.entries(json.data)) {
      const year = parseInt(key.substring(0, 4));
      const month = parseInt(key.substring(4, 6));
      const anomaly = parseFloat((val as any).anomaly ?? (val as any).value);
      if (isNaN(anomaly)) continue;

      monthlyData.push({
        date: `${year}-${String(month).padStart(2, '0')}`,
        year,
        month,
        anomaly: Math.round(anomaly * 100) / 100,
        absoluteTemp: Math.round((GLOBAL_BASELINE + anomaly) * 100) / 100,
      });
    }

    monthlyData.sort((a, b) => a.date.localeCompare(b.date));

    // Build yearly averages
    const byYear: Record<number, { anomalies: number[]; temps: number[] }> = {};
    for (const p of monthlyData) {
      if (!byYear[p.year]) byYear[p.year] = { anomalies: [], temps: [] };
      byYear[p.year].anomalies.push(p.anomaly);
      byYear[p.year].temps.push(p.absoluteTemp);
    }

    const yearlyData = Object.keys(byYear).map(Number).sort()
      .filter(y => byYear[y].anomalies.length >= 6)
      .map(y => {
        const anomalies = byYear[y].anomalies;
        const temps = byYear[y].temps;
        return {
          year: y,
          anomaly: Math.round((anomalies.reduce((a, b) => a + b, 0) / anomalies.length) * 100) / 100,
          absoluteTemp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 100) / 100,
        };
      });

    // Rolling average
    for (let i = 0; i < yearlyData.length; i++) {
      if (i >= 9) {
        const slice = yearlyData.slice(i - 9, i + 1);
        (yearlyData[i] as any).rollingAvg = Math.round(
          (slice.reduce((a, b) => a + b.absoluteTemp, 0) / slice.length) * 100
        ) / 100;
      }
    }

    // Monthly comparison: last 12 months vs 1961-1990 baseline
    const historicByMonth: Record<number, number[]> = {};
    for (const p of monthlyData) {
      if (p.year >= 1961 && p.year <= 1990) {
        if (!historicByMonth[p.month]) historicByMonth[p.month] = [];
        historicByMonth[p.month].push(p.absoluteTemp);
      }
    }

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const recent12: { month: number; year: number; temp: number | null }[] = [];
    for (let i = 1; i <= 12; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) { m += 12; y--; }
      const point = monthlyData.find(p => p.year === y && p.month === m);
      recent12.unshift({ month: m, year: y, temp: point ? point.absoluteTemp : null });
    }

    const monthlyComparison = recent12.map(({ month, year, temp }) => {
      const historic = historicByMonth[month];
      const historicAvg = historic && historic.length > 0
        ? Math.round((historic.reduce((a, b) => a + b, 0) / historic.length) * 100) / 100
        : null;
      const diff = temp !== null && historicAvg !== null ? Math.round((temp - historicAvg) * 100) / 100 : null;
      return { monthLabel: `${monthNames[month - 1]} ${year}`, month, year, recentTemp: temp, historicAvg, diff };
    });

    const result = {
      yearlyData,
      monthlyComparison,
      globalBaseline: GLOBAL_BASELINE,
      preIndustrialBaseline: PRE_INDUSTRIAL_BASELINE,
      keyThresholds: {
        plus1_5: PRE_INDUSTRIAL_BASELINE + 1.5,  // 15.0°C
        plus2_0: PRE_INDUSTRIAL_BASELINE + 2.0,  // 15.5°C
      },
      lastUpdated: currentMonthKey,
    };

    await setShortTerm(cacheKey, result);
    return NextResponse.json({ ...result, source: 'fresh' });
  } catch (err: any) {
    if (cached) {
      return NextResponse.json({ ...cached, source: 'stale-cache', warning: 'Using cached data' });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
