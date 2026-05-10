import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  getRegionBySlug,
  CURATED_CLIMATE_REGIONS,
  CLIMATE_REGIONS,
  getClimateMetadataTitle,
  getClimateMetadataDescription,
  getClimatePageUrl,
  getClimateUpdateDateLabel,
  expandMonthLabel,
} from '@/lib/climate/regions';
import { getCached } from '@/lib/climate/redis';
import ClimateProfile from './ClimateProfile';
import ClimateGroupProfile from './ClimateGroupProfile';
import { pickPageSnapshotMonth } from '@/app/climate/_shared/overview-grid-types';

// Build curated pages eagerly; stub (auto-generated) pages render
// on-demand and are then cached, so builds stay fast.
export const dynamicParams = true;

// ISR: 24-hour safety net. Cache invalidation is event-driven via
// revalidatePath() inside the summary API route, so a fresh Gemini run
// surfaces in raw SSR HTML on the next request without waiting for ISR.
export const revalidate = 86400;

interface CachedSummary {
  summary: string | null;
  sources?: { title: string; uri: string }[];
}

async function readCachedSummary(slug: string): Promise<CachedSummary | null> {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const cacheMonth = dayOfMonth >= 21
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    : (() => {
        const prev = new Date(now);
        prev.setMonth(prev.getMonth() - 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      })();
  const cacheKey = `climate:summary:${slug}:${cacheMonth}-v27`;
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
 * Fire-and-forget warm-up: when the Gemini summary cache is empty for a
 * region, kick off the API route so it runs Gemini, writes the cache, and
 * calls revalidatePath. The current request still returns immediately -
 * we don't await. The next request to /climate/{slug} will SSR with the
 * fresh summary baked in.
 */
async function warmRegionSummary(slug: string): Promise<void> {
  try {
    const base = await getRequestBaseUrl();
    void fetch(`${base}/api/climate/summary/${slug}`, { cache: 'no-store' }).catch(() => {});
  } catch {
    // Swallow - warm-up is best-effort.
  }
}

export async function generateStaticParams() {
  return CURATED_CLIMATE_REGIONS.map(region => ({ slug: region.slug }));
}

async function getGlobalSnapshotLabel(): Promise<string | null> {
  try {
    const base = resolve(process.cwd(), 'public', 'data', 'climate');
    const d = JSON.parse(await readFile(resolve(base, 'global-history.json'), 'utf8'));
    return d?.noaaStats?.landOcean?.latestMonthStats?.label ?? null;
  } catch {
    return null;
  }
}

async function getRegionDataLabels(
  region: ReturnType<typeof getRegionBySlug>,
): Promise<{ raw: string | null; expanded: string }> {
  if (!region) return { raw: null, expanded: getClimateUpdateDateLabel() };
  try {
    const base = resolve(process.cwd(), 'public', 'data', 'climate');
    let filePath: string | null = null;
    if (region.type === 'country') filePath = resolve(base, 'country', `${region.apiCode}.json`);
    else if (region.type === 'us-state') filePath = resolve(base, 'us-state', `${region.apiCode}.json`);
    else if (region.type === 'uk-region') filePath = resolve(base, 'uk-region', `${region.apiCode}.json`);
    if (!filePath) return { raw: null, expanded: getClimateUpdateDateLabel() };
    const d = JSON.parse(await readFile(filePath, 'utf8'));
    let label: string | undefined;
    if (region.type === 'country') label = d?.latestMonthStats?.label;
    else if (region.type === 'us-state') label = d?.paramData?.tavg?.latestMonthStats?.label;
    else if (region.type === 'uk-region') label = d?.varData?.Tmean?.latestMonthStats?.label;
    if (label) {
      // Gate against NOAA global so metadata title matches the on-page title:
      // the page only flips to "April Update" once every cross-source row
      // (including Global) has caught up to that month.
      const globalLabel = await getGlobalSnapshotLabel();
      const pinned = pickPageSnapshotMonth([label, globalLabel]) ?? label;
      return { raw: pinned, expanded: expandMonthLabel(pinned) };
    }
  } catch { /* fall through */ }
  return { raw: null, expanded: getClimateUpdateDateLabel() };
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  if (!region) return {};

  const updateLabel = await getRegionDataLabels(region).then((l) => l.expanded);
  const title = getClimateMetadataTitle(region, updateLabel);
  const description = getClimateMetadataDescription(region, updateLabel);
  const canonicalUrl = getClimatePageUrl(region);

  return {
    title,
    description,
    keywords: region.keywords,
    alternates: {
      canonical: canonicalUrl,
    },
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

// JSON-LD schema for the dataset
function DatasetSchema({ region }: { region: typeof CLIMATE_REGIONS[number] }) {
  const sourceNames: Record<string, string> = {
    'owid-temp': 'Our World in Data (ERA5/HadCRUT5)',
    'owid-emissions': 'Our World in Data (Global Carbon Project)',
    'met-office': 'Met Office HadUK-Grid',
    'noaa-state': 'NOAA Climate at a Glance',
    'noaa-national': 'NOAA Climate at a Glance',
    'arctic-ice': 'global-warming.org',
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${region.name} Climate Update`,
    description: getClimateMetadataDescription(region),
    url: getClimatePageUrl(region),
    temporalCoverage: '1950/..',
    spatialCoverage: {
      '@type': 'Place',
      name: region.name,
    },
    creator: {
      '@type': 'Organization',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
    },
    distribution: region.dataSources.map(src => ({
      '@type': 'DataDownload',
      name: sourceNames[src] || src,
    })),
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

export default async function ClimateProfilePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  if (!region) notFound();

  const cached = await readCachedSummary(slug);
  const cacheMiss = !cached?.summary;

  // On cache miss, kick off Gemini in the background. Subsequent requests
  // to this slug will SSR with the fresh summary baked in.
  if (cacheMiss) {
    await warmRegionSummary(slug);
  }

  // Group/aggregate slugs (continents, US climate regions) get their own
  // server-rendered template that reads continent / region snapshots directly.
  if (region.type === 'group') {
    const { raw: rawLabel } = await getRegionDataLabels(region);
    return (
      <>
        <DatasetSchema region={region} />
        <ClimateGroupProfile
          region={region}
          initialSummary={cached?.summary ?? null}
          initialSources={cached?.sources ?? []}
          summaryCacheMiss={cacheMiss}
          latestDataLabel={rawLabel ?? undefined}
        />
      </>
    );
  }

  const { raw: rawLabel } = await getRegionDataLabels(region);
  return (
    <>
      <DatasetSchema region={region} />
      <ClimateProfile
        slug={slug}
        region={region}
        initialSummary={cached?.summary ?? null}
        initialSources={cached?.sources ?? []}
        summaryCacheMiss={cacheMiss}
        latestDataLabel={rawLabel ?? undefined}
      />
    </>
  );
}
