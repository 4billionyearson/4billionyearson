export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { getRegionBySlug } from '@/lib/climate/regions';

// Internal base URL for calling our own API routes
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function fetchJSON(url: string, timeout = 30000): Promise<any | null> {
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);

  if (!region) {
    return NextResponse.json({ error: 'Region not found' }, { status: 404 });
  }

  const now = new Date();
  const dayOfMonth = now.getDate();
  // Use current month key after 21st (when most sources have published), else previous month
  const cacheMonth = dayOfMonth >= 21
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    : (() => {
        const prev = new Date(now);
        prev.setMonth(prev.getMonth() - 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      })();
  const cacheKey = `climate:profile:${slug}:${cacheMonth}-v2`;

  // Check cache
  const cached = await getCached<any>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  const base = getBaseUrl();

  try {
    let countryData = null;
    let usStateData = null;
    let ukRegionData = null;

    // Fetch data from the appropriate existing API based on region type
    if (region.type === 'country') {
      countryData = await fetchJSON(`${base}/api/climate/country/${region.apiCode}`);
    } else if (region.type === 'us-state') {
      usStateData = await fetchJSON(`${base}/api/climate/us-state/${region.apiCode}`);
    } else if (region.type === 'uk-region') {
      ukRegionData = await fetchJSON(`${base}/api/climate/uk-region/${region.apiCode}`);
    }

    // Build key stats for the crawlable summary
    const keyStats = buildKeyStats(region.type, countryData, usStateData, ukRegionData);

    const result = {
      slug: region.slug,
      name: region.name,
      type: region.type,
      tagline: region.tagline,
      emoji: region.emoji,
      dataSources: region.dataSources,
      countryData,
      usStateData,
      ukRegionData,
      keyStats,
      lastUpdated: cacheMonth,
    };

    await setShortTerm(cacheKey, result);
    return NextResponse.json({ ...result, source: 'fresh' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

interface KeyStats {
  latestTemp?: string;
  tempTrend?: string;
  warmestYear?: string;
  dataRange?: string;
  latestPrecip?: string;
}

function buildKeyStats(
  type: string,
  countryData: any,
  usStateData: any,
  ukRegionData: any,
): KeyStats {
  const stats: KeyStats = {};

  if (type === 'country' && countryData) {
    const yearly = countryData.yearlyData;
    if (yearly?.length > 0) {
      const latest = yearly[yearly.length - 1];
      stats.latestTemp = `${latest.avgTemp}°C (${latest.year})`;
      stats.dataRange = `${yearly[0].year}–${latest.year}`;

      // Find warmest year
      const warmest = yearly.reduce((a: any, b: any) => a.avgTemp > b.avgTemp ? a : b);
      stats.warmestYear = `${warmest.year} (${warmest.avgTemp}°C)`;

      // Trend: compare last decade average to 1961-1990 baseline
      const baseline = yearly.filter((y: any) => y.year >= 1961 && y.year <= 1990);
      const recent = yearly.filter((y: any) => y.year >= latest.year - 9);
      if (baseline.length > 0 && recent.length > 0) {
        const baseAvg = baseline.reduce((a: number, b: any) => a + b.avgTemp, 0) / baseline.length;
        const recentAvg = recent.reduce((a: number, b: any) => a + b.avgTemp, 0) / recent.length;
        const diff = recentAvg - baseAvg;
        stats.tempTrend = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}°C vs 1961–1990 baseline`;
      }
    }
    if (countryData.precipYearly?.length > 0) {
      const latestPrecip = countryData.precipYearly[countryData.precipYearly.length - 1];
      stats.latestPrecip = `${latestPrecip.value}mm (${latestPrecip.year})`;
    }
  }

  if (type === 'us-state' && usStateData?.paramData?.tavg) {
    const yearly = usStateData.paramData.tavg.yearly;
    if (yearly?.length > 0) {
      const latest = yearly[yearly.length - 1];
      stats.latestTemp = `${latest.value}°C (${latest.year})`;
      stats.dataRange = `${yearly[0].year}–${latest.year}`;
      const warmest = yearly.reduce((a: any, b: any) => a.value > b.value ? a : b);
      stats.warmestYear = `${warmest.year} (${warmest.value}°C)`;

      const baseline = yearly.filter((y: any) => y.year >= 1961 && y.year <= 1990);
      const recent = yearly.filter((y: any) => y.year >= latest.year - 9);
      if (baseline.length > 0 && recent.length > 0) {
        const baseAvg = baseline.reduce((a: number, b: any) => a + b.value, 0) / baseline.length;
        const recentAvg = recent.reduce((a: number, b: any) => a + b.value, 0) / recent.length;
        const diff = recentAvg - baseAvg;
        stats.tempTrend = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}°C vs 1961–1990 baseline`;
      }
    }
    if (usStateData.paramData?.pcp?.yearly?.length > 0) {
      const pcpYearly = usStateData.paramData.pcp.yearly;
      const latestPrecip = pcpYearly[pcpYearly.length - 1];
      stats.latestPrecip = `${latestPrecip.value}mm (${latestPrecip.year})`;
    }
  }

  if (type === 'uk-region' && ukRegionData?.varData?.Tmean) {
    const yearly = ukRegionData.varData.Tmean.yearly;
    if (yearly?.length > 0) {
      const latest = yearly[yearly.length - 1];
      stats.latestTemp = `${latest.value}°C (${latest.year})`;
      stats.dataRange = `${yearly[0].year}–${latest.year}`;
      const warmest = yearly.reduce((a: any, b: any) => a.value > b.value ? a : b);
      stats.warmestYear = `${warmest.year} (${warmest.value}°C)`;

      const baseline = yearly.filter((y: any) => y.year >= 1961 && y.year <= 1990);
      const recent = yearly.filter((y: any) => y.year >= latest.year - 9);
      if (baseline.length > 0 && recent.length > 0) {
        const baseAvg = baseline.reduce((a: number, b: any) => a + b.value, 0) / baseline.length;
        const recentAvg = recent.reduce((a: number, b: any) => a + b.value, 0) / recent.length;
        const diff = recentAvg - baseAvg;
        stats.tempTrend = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}°C vs 1961–1990 baseline`;
      }
    }
    if (ukRegionData.varData?.Rainfall?.yearly?.length > 0) {
      const rainYearly = ukRegionData.varData.Rainfall.yearly;
      const latestRain = rainYearly[rainYearly.length - 1];
      stats.latestPrecip = `${latestRain.value}mm (${latestRain.year})`;
    }
  }

  return stats;
}
