export const maxDuration = 60;
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { getRegionBySlug } from '@/lib/climate/regions';

const SNAPSHOT_ROOT = resolve(process.cwd(), 'public', 'data', 'climate');

async function loadSnapshot(relativePath: string): Promise<any | null> {
  try {
    const raw = await readFile(resolve(SNAPSHOT_ROOT, relativePath), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
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
  const cacheKey = `climate:profile:${slug}:${cacheMonth}-v19`;

  // Check cache
  const cached = await getCached<any>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  try {
    let countryData = null;
    let countryPrecipData = null; // World Bank CKP monthly precip (CRU TS 4.08)
    let usStateData = null;
    let ukRegionData = null;
    let nationalData = null; // UK-wide or US-national for sub-national regions
    let owidCountryData = null; // OWID country data (for sub-national comparison)
    let globalData = null;

    // Always load global context
    const globalPromise = loadSnapshot('global-history.json');

    if (region.type === 'country') {
      const [cRes, pRes] = await Promise.all([
        loadSnapshot(`country/${region.apiCode}.json`),
        loadSnapshot(`country-precip/${region.apiCode}.json`),
      ]);
      countryData = cRes;
      countryPrecipData = pRes;
      // For UK/USA countries, also load national Met Office / NOAA data
      if (region.apiCode === 'GBR') {
        nationalData = await loadSnapshot('uk-region/uk-uk.json');
      } else if (region.apiCode === 'USA') {
        nationalData = await loadSnapshot('us-national.json');
      }
    } else if (region.type === 'us-state') {
      const [stateRes, countryRes, nationalRes] = await Promise.all([
        loadSnapshot(`us-state/${region.apiCode}.json`),
        loadSnapshot('country/USA.json'),
        loadSnapshot('us-national.json'),
      ]);
      usStateData = stateRes;
      owidCountryData = countryRes;
      nationalData = nationalRes;
    } else if (region.type === 'uk-region') {
      const [regionRes, countryRes, ukNationalRes] = await Promise.all([
        loadSnapshot(`uk-region/${region.apiCode}.json`),
        loadSnapshot('country/GBR.json'),
        loadSnapshot('uk-region/uk-uk.json'),
      ]);
      ukRegionData = regionRes;
      owidCountryData = countryRes;
      nationalData = ukNationalRes;
    }

    globalData = await globalPromise;

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
      countryPrecipData,
      usStateData,
      ukRegionData,
      nationalData,
      owidCountryData,
      globalData,
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
