// maxDuration: Redis cache hits complete in < 200 ms. A full cold build
// (reading several JSON snapshot files) takes 1–3 s. 15 s gives ample
// headroom without opting into Fluid CPU billing for every request.
export const maxDuration = 15;
// CDN-cache the response for 24 h. The data only changes when a new snapshot
// is deployed (monthly), at which point Vercel automatically purges the CDN
// cache as part of the deployment. The Redis cache is self-busting via a
// data-versioned key (includes generatedAt stamp), so old entries become
// unreachable as soon as the snapshot advances — the 30-day TTL is just
// a safety net for cleanup. Together these mean: CDN serves 100% of repeat
// requests between deployments at zero function cost, and the very first
// request after a new deployment hits Redis (fast) or disk (1–3 s) once
// per region before being cached again for the next 24 h.
export const revalidate = 86400;
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { getRegionBySlug } from '@/lib/climate/regions';
import { pickPageSnapshotMonth } from '@/app/climate/_shared/overview-grid-types';

const SNAPSHOT_ROOT = resolve(process.cwd(), 'public', 'data', 'climate');

async function loadSnapshot(relativePath: string): Promise<any | null> {
  try {
    const raw = await readFile(resolve(SNAPSHOT_ROOT, relativePath), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildSnapshotToken(name: string, label: string | null | undefined, generatedAt: string | null | undefined): string | null {
  if (!label && !generatedAt) return null;
  return `${name}:${label ?? 'na'}@${generatedAt ?? 'na'}`;
}

function preferTemperatureLabelFromSnapshot(snap: any): string | null {
  if (!snap) return null;
  // Common explicit locations
  const t1 = snap?.varData?.Tmean?.latestMonthStats?.label;
  if (t1) return t1;
  const t2 = snap?.paramData?.tavg?.latestMonthStats?.label;
  if (t2) return t2;
  // Root-level temperature block (many country snapshots expose monthlyComparison + latestMonthStats)
  if (snap?.monthlyComparison && snap?.latestMonthStats?.label) return snap.latestMonthStats.label;

  // Fallback: scan for any child object whose key hints at temperature and has latestMonthStats
  const keys = Object.keys(snap || {});
  for (const k of keys) {
    const v = snap[k];
    if (v && typeof v === 'object') {
      if (/tmean|tavg|temp|monthlyComparison/i.test(k) && v.latestMonthStats?.label) return v.latestMonthStats.label;
      if (v.varData?.Tmean?.latestMonthStats?.label) return v.varData.Tmean.latestMonthStats.label;
      if (v.paramData?.tavg?.latestMonthStats?.label) return v.paramData.tavg.latestMonthStats.label;
    }
  }

  return null;
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

  // Load all snapshots needed for this region upfront — once. The loaded
  // objects are used both to build the data-versioned cache key AND (on a
  // cache miss) to construct the full response. This avoids reading the
  // same files twice on every uncached request.
  const globalSnap0 = await loadSnapshot('global-history.json');
  const globalMonth = globalSnap0?.noaaStats?.landOcean?.latestMonthStats?.label ?? null;
  const globalGeneratedAt = globalSnap0?.generatedAt ?? null;

  // Pre-loaded snapshots (reused below if cache misses)
  let preCountry: any = null;
  let prePrecip: any = null;
  let preNational: any = null;
  let preSupport: any = null;
  let prePrimary: any = null; // continent-absolutes or us-climate-region
  let preContinentPrecip: any = null;

  let primaryMonth: string | null = null;
  let primaryGeneratedAt: string | null = null;
  let nationalMonth: string | null = null;
  let nationalGeneratedAt: string | null = null;
  let supportMonth: string | null = null;
  let supportGeneratedAt: string | null = null;
  let precipMonth: string | null = null;
  let precipGeneratedAt: string | null = null;

  if (region.type === 'country') {
    [preCountry, prePrecip] = await Promise.all([
      loadSnapshot(`country/${region.apiCode}.json`),
      loadSnapshot(`country-precip/${region.apiCode}.json`),
    ]);
    primaryMonth = preferTemperatureLabelFromSnapshot(preCountry) ?? preCountry?.latestMonthStats?.label ?? null;
    primaryGeneratedAt = preCountry?.generatedAt ?? null;
    precipMonth = prePrecip?.latestMonthStats?.label ?? null;
    precipGeneratedAt = prePrecip?.generatedAt ?? null;

    if (region.apiCode === 'GBR') {
      preNational = await loadSnapshot('uk-region/uk-uk.json');
      nationalMonth = preNational?.varData?.Tmean?.latestMonthStats?.label ?? null;
      nationalGeneratedAt = preNational?.generatedAt ?? null;
    } else if (region.apiCode === 'USA') {
      preNational = await loadSnapshot('us-national.json');
      nationalMonth = preNational?.paramData?.tavg?.latestMonthStats?.label ?? null;
      nationalGeneratedAt = preNational?.generatedAt ?? null;
    }
  } else if (region.type === 'us-state') {
    [prePrimary, preSupport, preNational] = await Promise.all([
      loadSnapshot(`us-state/${region.apiCode}.json`),
      loadSnapshot('country/USA.json'),
      loadSnapshot('us-national.json'),
    ]);
    primaryMonth = prePrimary?.paramData?.tavg?.latestMonthStats?.label ?? null;
    primaryGeneratedAt = prePrimary?.generatedAt ?? null;
    supportMonth = preferTemperatureLabelFromSnapshot(preSupport) ?? preSupport?.latestMonthStats?.label ?? null;
    supportGeneratedAt = preSupport?.generatedAt ?? null;
    nationalMonth = preNational?.paramData?.tavg?.latestMonthStats?.label ?? null;
    nationalGeneratedAt = preNational?.generatedAt ?? null;
  } else if (region.type === 'uk-region') {
    [prePrimary, preSupport, preNational] = await Promise.all([
      loadSnapshot(`uk-region/${region.apiCode}.json`),
      loadSnapshot('country/GBR.json'),
      loadSnapshot('uk-region/uk-uk.json'),
    ]);
    primaryMonth = prePrimary?.varData?.Tmean?.latestMonthStats?.label ?? null;
    primaryGeneratedAt = prePrimary?.generatedAt ?? null;
    supportMonth = preferTemperatureLabelFromSnapshot(preSupport) ?? preSupport?.latestMonthStats?.label ?? null;
    supportGeneratedAt = preSupport?.generatedAt ?? null;
    nationalMonth = preNational?.varData?.Tmean?.latestMonthStats?.label ?? null;
    nationalGeneratedAt = preNational?.generatedAt ?? null;
  } else if (region.type === 'group' && region.groupKind === 'us-climate-region') {
    [prePrimary, preNational] = await Promise.all([
      loadSnapshot(`us-climate-region/${region.slug}.json`),
      loadSnapshot('us-national.json'),
    ]);
    primaryMonth = prePrimary?.paramData?.tavg?.latestMonthStats?.label ?? null;
    primaryGeneratedAt = prePrimary?.generatedAt ?? null;
    nationalMonth = preNational?.paramData?.tavg?.latestMonthStats?.label ?? null;
    nationalGeneratedAt = preNational?.generatedAt ?? null;
  } else if (region.type === 'group' && region.groupKind === 'continent') {
    [prePrimary, preContinentPrecip] = await Promise.all([
      loadSnapshot(`continent-absolutes/${region.slug}.json`),
      loadSnapshot(`continent-precip/${region.slug}.json`),
    ]);
    primaryGeneratedAt = prePrimary?.generatedAt ?? null;
  }

  const dataCacheKeyParts = [
    buildSnapshotToken('primary', primaryMonth, primaryGeneratedAt),
    buildSnapshotToken('global', globalMonth, globalGeneratedAt),
    buildSnapshotToken('national', nationalMonth, nationalGeneratedAt),
    buildSnapshotToken('support', supportMonth, supportGeneratedAt),
    buildSnapshotToken('precip', precipMonth, precipGeneratedAt),
  ].filter((part): part is string => Boolean(part));

  const dataCacheKey = dataCacheKeyParts.length
    ? dataCacheKeyParts.join('|')
    : (() => {
        const now = new Date();
        const prev = new Date(now);
        if (now.getDate() < 21) prev.setMonth(prev.getMonth() - 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      })();
  const cacheKey = `climate:profile:${slug}:${dataCacheKey}-v25`;

  // Check cache. Pass `_t=<anything>` in the URL to bypass the cache.
  const url = new URL(request.url);
  const bypassCache = Boolean(url.searchParams.get('_t'));
  if (!bypassCache) {
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }
  }

  try {
    // Reuse already-loaded snapshots — no second filesystem reads needed.
    let countryData: any = preCountry;
    let countryPrecipData: any = prePrecip;
    let continentData: any = region.type === 'group' && region.groupKind === 'continent' ? prePrimary : null;
    let continentPrecipData: any = preContinentPrecip;
    let usStateData: any = region.type === 'us-state' ? prePrimary : null;
    let usClimateRegionData: any = region.type === 'group' && region.groupKind === 'us-climate-region' ? prePrimary : null;
    let ukRegionData: any = region.type === 'uk-region' ? prePrimary : null;
    let nationalData: any = preNational;
    let owidCountryData: any = preSupport;
    let globalData: any = globalSnap0;

    if (region.type === 'country') {
      // For UK/USA countries, nationalData may need a continent-precip load (not pre-loaded above).
      // All other data is already in preCountry / prePrecip / preNational.
    }

    // Build key stats for the crawlable summary
    const keyStats = buildKeyStats(region.type, countryData, usStateData, usClimateRegionData, ukRegionData);

    const result = {
      slug: region.slug,
      name: region.name,
      type: region.type,
      tagline: region.tagline,
      emoji: region.emoji,
      dataSources: region.dataSources,
      countryData,
      countryPrecipData,
      continentData,
      continentPrecipData,
      usStateData,
      usClimateRegionData,
      ukRegionData,
      nationalData,
      owidCountryData,
      globalData,
      keyStats,
      lastUpdated: dataCacheKey,
    };

    // Compute a server-side page snapshot month (prefer temperature series)
    try {
      const serverLocal = countryData ? preferTemperatureLabelFromSnapshot(countryData) : (
        usStateData ? preferTemperatureLabelFromSnapshot(usStateData) : (
          ukRegionData ? preferTemperatureLabelFromSnapshot(ukRegionData) : null
        )
      );
      const serverNational = preferTemperatureLabelFromSnapshot(nationalData) ?? null;
      const serverGlobal = globalData?.noaaStats?.landOcean?.latestMonthStats?.label ?? globalData?.landLatestMonthStats?.label ?? null;
      const serverPageSnapshot = pickPageSnapshotMonth([serverLocal, serverNational, serverGlobal]);
      // attach to payload so client can use it for SSR-consistent cutoff
      (result as any).pageSnapshotMonth = serverPageSnapshot;
    } catch (e) {
      // ignore - non-critical
    }

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
  usClimateRegionData: any,
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

  if (type === 'group' && usClimateRegionData?.paramData?.tavg) {
    const yearly = usClimateRegionData.paramData.tavg.yearly;
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
    if (usClimateRegionData.paramData?.pcp?.yearly?.length > 0) {
      const pcpYearly = usClimateRegionData.paramData.pcp.yearly;
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
