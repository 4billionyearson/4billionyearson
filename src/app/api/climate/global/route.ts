import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const GLOBAL_BASELINE = 13.9; // NOAA 20th century average
const PRE_INDUSTRIAL_BASELINE = 13.5; // Approximate pre-industrial (1850-1900) absolute temp
const OWID_WORLD_ENTITY = 355; // OWID entity ID for World
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildLatestMonthStats(points: Array<{ year: number; month: number; temp: number }>) {
  if (!points.length) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = points.filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth));
  if (!filtered.length) return null;
  const latest = filtered[filtered.length - 1];
  const comparable = filtered.filter((point) => point.month === latest.month);
  const baseline = comparable.filter((point) => point.year >= 1961 && point.year <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((sum, point) => sum + point.temp, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => b.temp - a.temp);
  const rank = ranked.findIndex((point) => point.year === latest.year && point.month === latest.month) + 1;
  const record = ranked[0];

  return {
    label: `${MONTH_NAMES[latest.month - 1]} ${latest.year}`,
    value: latest.temp,
    diff: baselineAvg === null ? null : round2(latest.temp - baselineAvg),
    rank,
    total: ranked.length,
    recordLabel: `${MONTH_NAMES[record.month - 1]} ${record.year}`,
    recordValue: record.temp,
  };
}

function buildLatestThreeMonthStats(points: Array<{ year: number; month: number; temp: number }>) {
  if (points.length < 3) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = points.filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth));
  if (filtered.length < 3) return null;
  const windows: Array<{ endMonth: number; endYear: number; label: string; value: number }> = [];
  for (let index = 2; index < filtered.length; index++) {
    const a = filtered[index - 2];
    const b = filtered[index - 1];
    const c = filtered[index];
    const isContiguous = (a.year * 12 + a.month + 1 === b.year * 12 + b.month)
      && (b.year * 12 + b.month + 1 === c.year * 12 + c.month);
    if (!isContiguous) continue;
    windows.push({
      endMonth: c.month,
      endYear: c.year,
      label: `${MONTH_NAMES[a.month - 1]}–${MONTH_NAMES[c.month - 1]} ${c.year}`,
      value: round2((a.temp + b.temp + c.temp) / 3),
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

export async function GET() {
  const cacheKey = 'climate:global';
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v5`;

  const cached = await getCached<any>(cacheKey);
  if (cached && cached.lastUpdated === currentMonthKey) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  try {
    // Fetch NOAA (land+ocean) and OWID/ERA5 (land) in parallel
    const [noaaRes, owidRes] = await Promise.all([
      fetch(
        'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/1/0/1950-2026.json',
        { next: { revalidate: 86400 } }
      ),
      fetch(
        'https://api.ourworldindata.org/v1/indicators/1005195.data.json',
        { next: { revalidate: 86400 } }
      ),
    ]);

    if (!noaaRes.ok) throw new Error(`NOAA returned ${noaaRes.status}`);
    const json = await noaaRes.json();

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
      return { monthLabel: `${MONTH_NAMES[month - 1]} ${year}`, month, year, recentTemp: temp, historicAvg, diff };
    });

    // ─── OWID / ERA5 global land surface temperature ──────────────────
    let landYearlyData: any[] | null = null;
    let landMonthlyComparison: any[] | null = null;
    let landVsOceanMonthly: any[] | null = null;
    let landMonthlyData: { year: number; month: number; temp: number }[] = [];

    if (owidRes.ok) {
      try {
        const owidData = await owidRes.json();
        const epoch = new Date(1950, 0, 1);
        const landMonthly: { date: string; year: number; month: number; temp: number }[] = [];

        for (let i = 0; i < owidData.years.length; i++) {
          if (owidData.entities[i] !== OWID_WORLD_ENTITY) continue;
          const d = new Date(epoch.getTime() + owidData.years[i] * 86400000);
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          // Skip current month (incomplete) and future
          if (year > currentYear || (year === currentYear && month >= currentMonth)) continue;
          landMonthly.push({
            date: `${year}-${String(month).padStart(2, '0')}`,
            year, month,
            temp: Math.round(owidData.values[i] * 100) / 100,
          });
        }
        landMonthly.sort((a, b) => a.date.localeCompare(b.date));
        landMonthlyData = landMonthly.map((point) => ({ year: point.year, month: point.month, temp: point.temp }));

        // Yearly averages
        const landByYear: Record<number, number[]> = {};
        for (const p of landMonthly) {
          if (!landByYear[p.year]) landByYear[p.year] = [];
          landByYear[p.year].push(p.temp);
        }
        landYearlyData = Object.keys(landByYear).map(Number).sort()
          .filter(y => y < currentYear && landByYear[y].length >= 6)
          .map(y => {
            const temps = landByYear[y];
            const avgTemp = Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 100) / 100;
            return { year: y, avgTemp, rollingAvg: undefined as number | undefined };
          });
        for (let i = 0; i < landYearlyData.length; i++) {
          if (i >= 9) {
            const slice = landYearlyData.slice(i - 9, i + 1);
            landYearlyData[i].rollingAvg = Math.round(
              (slice.reduce((a: number, b: any) => a + b.avgTemp, 0) / slice.length) * 100
            ) / 100;
          }
        }

        // Monthly comparison (land): last 12 months vs 1961-1990 baseline
        const landHistoricByMonth: Record<number, number[]> = {};
        for (const p of landMonthly) {
          if (p.year >= 1961 && p.year <= 1990) {
            if (!landHistoricByMonth[p.month]) landHistoricByMonth[p.month] = [];
            landHistoricByMonth[p.month].push(p.temp);
          }
        }

        const landRecent12: { month: number; year: number; temp: number | null }[] = [];
        for (let i = 1; i <= 12; i++) {
          let m = currentMonth - i;
          let y = currentYear;
          if (m <= 0) { m += 12; y--; }
          const point = landMonthly.find(p => p.year === y && p.month === m);
          landRecent12.unshift({ month: m, year: y, temp: point ? point.temp : null });
        }

        landMonthlyComparison = landRecent12.map(({ month, year, temp }) => {
          const historic = landHistoricByMonth[month];
          const historicAvg = historic && historic.length > 0
            ? Math.round((historic.reduce((a, b) => a + b, 0) / historic.length) * 100) / 100
            : null;
          const diff = temp !== null && historicAvg !== null ? Math.round((temp - historicAvg) * 100) / 100 : null;
          return { monthLabel: `${MONTH_NAMES[month - 1]} ${year}`, month, year, recentTemp: temp, historicAvg, diff };
        });

        // Land vs Land+Ocean – merged monthly comparison for the last 12 months
        landVsOceanMonthly = landRecent12.map(({ month, year, temp: landTemp }) => {
          const noaaPoint = recent12.find(r => r.month === month && r.year === year);
          return {
            monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
            landTemp,
            landOceanTemp: noaaPoint?.temp ?? null,
          };
        });
      } catch { /* OWID parsing failed – continue without land data */ }
    }

    const result = {
      yearlyData,
      monthlyComparison,
      landYearlyData,
      landMonthlyComparison,
      landLatestMonthStats: landMonthlyData.length ? buildLatestMonthStats(landMonthlyData) : null,
      landLatestThreeMonthStats: landMonthlyData.length ? buildLatestThreeMonthStats(landMonthlyData) : null,
      landVsOceanMonthly,
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
