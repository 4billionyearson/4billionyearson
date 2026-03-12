import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'climate:planetary-boundaries';
const CACHE_TTL_HOURS = 12;

interface TempHistoryPoint {
  year: number;
  anomaly: number;
}

interface LiveData {
  co2: { value: number; trend: number; date: string } | null;
  temperature: { anomaly: number; date: string; history: TempHistoryPoint[] } | null;
  methane: { value: number; trend: number; date: string } | null;
  n2o: { value: number; trend: number; date: string } | null;
  arcticIce: { extent: number; anomaly: number; date: string } | null;
  oceanWarming: { anomaly: number; year: string } | null;
  fetchedAt: string;
}

async function fetchJSON(url: string, timeout = 10000) {
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

async function fetchLiveData(): Promise<LiveData> {
  const [co2Raw, tempRaw, methaneRaw, n2oRaw, arcticRaw, oceanRaw] = await Promise.all([
    fetchJSON('https://global-warming.org/api/co2-api'),
    fetchJSON('https://global-warming.org/api/temperature-api'),
    fetchJSON('https://global-warming.org/api/methane-api'),
    fetchJSON('https://global-warming.org/api/nitrous-oxide-api'),
    fetchJSON('https://global-warming.org/api/arctic-api'),
    fetchJSON('https://global-warming.org/api/ocean-warming-api'),
  ]);

  let co2: LiveData['co2'] = null;
  if (co2Raw?.co2?.length) {
    const latest = co2Raw.co2[co2Raw.co2.length - 1];
    co2 = {
      value: parseFloat(latest.cycle),
      trend: parseFloat(latest.trend),
      date: `${latest.year}-${String(latest.month).padStart(2, '0')}-${String(latest.day).padStart(2, '0')}`,
    };
  }

  let temperature: LiveData['temperature'] = null;
  if (tempRaw?.result?.length) {
    const latest = tempRaw.result[tempRaw.result.length - 1];
    // Build annual history: average anomalies by year (last 50 years)
    const byYear: Record<number, number[]> = {};
    for (const r of tempRaw.result) {
      const yr = Math.floor(parseFloat(r.time));
      const val = parseFloat(r.station);
      if (!isNaN(yr) && !isNaN(val) && yr >= 1975) {
        (byYear[yr] ??= []).push(val);
      }
    }
    const history: TempHistoryPoint[] = Object.entries(byYear)
      .map(([y, vals]) => ({ year: Number(y), anomaly: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => a.year - b.year);
    temperature = {
      anomaly: parseFloat(latest.station),
      date: latest.time,
      history,
    };
  }

  let methane: LiveData['methane'] = null;
  if (methaneRaw?.methane?.length) {
    const latest = methaneRaw.methane[methaneRaw.methane.length - 1];
    methane = {
      value: parseFloat(latest.average),
      trend: parseFloat(latest.trend),
      date: latest.date,
    };
  }

  let n2o: LiveData['n2o'] = null;
  if (n2oRaw?.nitrous?.length) {
    const latest = n2oRaw.nitrous[n2oRaw.nitrous.length - 1];
    n2o = {
      value: parseFloat(latest.average),
      trend: parseFloat(latest.trend),
      date: latest.date,
    };
  }

  let arcticIce: LiveData['arcticIce'] = null;
  if (arcticRaw?.arcticData?.data) {
    const keys = Object.keys(arcticRaw.arcticData.data);
    const lastKey = keys[keys.length - 1];
    const latest = arcticRaw.arcticData.data[lastKey];
    if (latest && latest.value !== -9999) {
      arcticIce = {
        extent: latest.value,
        anomaly: latest.anom,
        date: lastKey,
      };
    }
  }

  let oceanWarming: LiveData['oceanWarming'] = null;
  if (oceanRaw?.result) {
    const years = Object.keys(oceanRaw.result);
    const lastYear = years[years.length - 1];
    oceanWarming = {
      anomaly: oceanRaw.result[lastYear].anomaly,
      year: lastYear,
    };
  }

  return {
    co2,
    temperature,
    methane,
    n2o,
    arcticIce,
    oceanWarming,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    // Check cache first
    const cached = await getCached<LiveData>(CACHE_KEY);
    if (cached) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL_HOURS * 60 * 60 * 1000) {
        return NextResponse.json(cached);
      }
    }

    const data = await fetchLiveData();
    await setShortTerm(CACHE_KEY, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Planetary boundaries API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planetary boundary data' },
      { status: 500 }
    );
  }
}
