import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getRegionBySlug,
  CURATED_CLIMATE_REGIONS,
  CLIMATE_REGIONS,
  getClimateMetadataTitle,
  getClimateMetadataDescription,
  getClimatePageUrl,
} from '@/lib/climate/regions';
import { getCached } from '@/lib/climate/redis';
import ClimateProfile from './ClimateProfile';
import ClimateGroupProfile from './ClimateGroupProfile';

// Build curated pages eagerly; stub (auto-generated) pages render
// on-demand and are then cached, so builds stay fast.
export const dynamicParams = true;

// ISR: regenerate every 30 minutes so a freshly cached Gemini summary surfaces
// in raw SSR HTML soon after it is generated.
export const revalidate = 1800;

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

export async function generateStaticParams() {
  return CURATED_CLIMATE_REGIONS.map(region => ({ slug: region.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  if (!region) return {};

  const title = getClimateMetadataTitle(region);
  const description = getClimateMetadataDescription(region);
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

  // Group/aggregate slugs (continents, US climate regions) get their own
  // server-rendered template that reads continent / region snapshots directly.
  if (region.type === 'group') {
    return (
      <>
        <DatasetSchema region={region} />
        <ClimateGroupProfile region={region} />
      </>
    );
  }

  const cached = await readCachedSummary(slug);

  return (
    <>
      <DatasetSchema region={region} />
      <ClimateProfile
        slug={slug}
        region={region}
        initialSummary={cached?.summary ?? null}
        initialSources={cached?.sources ?? []}
      />
    </>
  );
}
