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
import ClimateProfile from './ClimateProfile';

// Build curated pages eagerly; stub (auto-generated) pages render
// on-demand and are then cached, so builds stay fast.
export const dynamicParams = true;

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

  return (
    <>
      <DatasetSchema region={region} />
      <ClimateProfile slug={slug} region={region} />
    </>
  );
}
