import type { Metadata } from 'next';
import { headers } from 'next/headers';
import {
  getRegionBySlug,
  getClimateMetadataTitle,
  getClimateMetadataDescription,
  getClimatePageUrl,
} from '@/lib/climate/regions';
import { getCached } from '@/lib/climate/redis';
import GlobalProfile from './GlobalProfile';

// ISR: 24-hour safety net. Cache invalidation is event-driven via
// revalidatePath() inside the summary API route, so a fresh Gemini run
// surfaces in raw SSR HTML on the next request without waiting for ISR.
export const revalidate = 86400;

interface CachedSummary {
  summary: string | null;
  sources?: { title: string; uri: string }[];
}

async function readCachedGlobalSummary(): Promise<CachedSummary | null> {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const cacheMonth = dayOfMonth >= 21
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    : (() => {
        const prev = new Date(now);
        prev.setMonth(prev.getMonth() - 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      })();
  const cacheKey = `climate:summary:global:${cacheMonth}-v27`;
  try {
    return await getCached<CachedSummary>(cacheKey);
  } catch {
    return null;
  }
}

async function getRequestBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const h = await headers();
    const host = h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host) return `${proto}://${host}`;
  } catch {}
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/**
 * Fire-and-forget warm-up: when the Gemini summary cache is empty, kick
 * off the API route so it runs Gemini, writes the cache, and calls
 * revalidatePath. The current request still returns immediately - we
 * don't await. The very next request to /climate/global will SSR with
 * the fresh summary baked in.
 */
async function warmGlobalSummary(): Promise<void> {
  try {
    const base = await getRequestBaseUrl();
    // Fire-and-forget; do not await the response.
    void fetch(`${base}/api/climate/summary/global`, { cache: 'no-store' }).catch(() => {});
  } catch {
    // Swallow - warm-up is best-effort.
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const region = getRegionBySlug('global');
  if (!region) return {};

  const title = getClimateMetadataTitle(region);
  const description = getClimateMetadataDescription(region);
  const canonicalUrl = getClimatePageUrl(region);

  return {
    title,
    description,
    keywords: region.keywords,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function DatasetSchema() {
  const region = getRegionBySlug('global');
  if (!region) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${region.name} Climate Update`,
    description: getClimateMetadataDescription(region),
    url: getClimatePageUrl(region),
    temporalCoverage: '1850/..',
    spatialCoverage: {
      '@type': 'Place',
      name: 'Earth',
    },
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Global land+ocean temperature anomaly', unitText: '°C' },
      { '@type': 'PropertyValue', name: 'Global land surface temperature anomaly', unitText: '°C' },
      { '@type': 'PropertyValue', name: 'Paris Agreement progress (10-year mean vs 1.5°C / 2.0°C)', unitText: '°C' },
      { '@type': 'PropertyValue', name: 'ENSO state (Niño 3.4 anomaly)', unitText: '°C' },
      { '@type': 'PropertyValue', name: 'Atmospheric CO₂ concentration', unitText: 'ppm' },
      { '@type': 'PropertyValue', name: 'Atmospheric methane (CH₄) concentration', unitText: 'ppb' },
      { '@type': 'PropertyValue', name: 'Atmospheric nitrous oxide (N₂O) concentration', unitText: 'ppb' },
      { '@type': 'PropertyValue', name: 'Arctic sea-ice extent anomaly', unitText: 'million km²' },
      { '@type': 'PropertyValue', name: 'Antarctic sea-ice extent anomaly', unitText: 'million km²' },
      { '@type': 'PropertyValue', name: 'Continental temperature anomaly' },
      { '@type': 'PropertyValue', name: 'Country-level temperature anomaly (map)' },
      { '@type': 'PropertyValue', name: 'Seasonal timing shifts (spring/autumn, growing season, snow)' },
      { '@type': 'PropertyValue', name: 'Global CO₂ emissions' },
      { '@type': 'PropertyValue', name: 'Global electricity generation mix' },
    ],
    creator: {
      '@type': 'Organization',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
    },
    distribution: [
      { '@type': 'DataDownload', name: 'NOAA Climate at a Glance — Global Land+Ocean' },
      { '@type': 'DataDownload', name: 'Our World in Data / ERA5 — Global Land Surface Temperature' },
      { '@type': 'DataDownload', name: 'NOAA Global Monitoring Laboratory — CO₂ / CH₄ / N₂O' },
      { '@type': 'DataDownload', name: 'NSIDC — Sea Ice Index (Arctic / Antarctic extent)' },
      { '@type': 'DataDownload', name: 'NOAA CPC — ENSO (Niño 3.4)' },
      { '@type': 'DataDownload', name: 'Our World in Data — Global CO₂ emissions' },
      { '@type': 'DataDownload', name: 'Ember / Our World in Data — Global electricity mix' },
      { '@type': 'DataDownload', name: 'IPCC AR6 Synthesis — Paris Agreement 1.5°C / 2.0°C basis' },
    ],
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    keywords: region.keywords.join(', '),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function ClimateGlobalPage() {
  const cached = await readCachedGlobalSummary();
  const cacheMiss = !cached?.summary;

  // On cache miss, kick off Gemini in the background. Subsequent requests
  // will SSR with the fresh summary (revalidatePath fires inside the API
  // route once the cache is populated).
  if (cacheMiss) {
    await warmGlobalSummary();
  }

  return (
    <>
      <DatasetSchema />
      <GlobalProfile
        initialSummary={cached?.summary ?? null}
        initialSources={cached?.sources ?? []}
        summaryCacheMiss={cacheMiss}
      />
    </>
  );
}
