import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const GLOBAL_BASELINE = 13.9; // NOAA 20th century average
const PRE_INDUSTRIAL_BASELINE = 13.5; // Approximate pre-industrial (1850-1900) absolute temp

export async function GET() {
  const cacheKey = 'climate:global';
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

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

    const result = {
      yearlyData,
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
