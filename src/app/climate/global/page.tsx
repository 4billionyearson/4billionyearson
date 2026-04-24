import type { Metadata } from 'next';
import {
  getRegionBySlug,
  getClimateMetadataTitle,
  getClimateMetadataDescription,
  getClimatePageUrl,
} from '@/lib/climate/regions';
import GlobalProfile from './GlobalProfile';

// ISR: regenerate a few times a day so the month-updated title stays fresh
export const revalidate = 21600;

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
    temporalCoverage: '1950/..',
    spatialCoverage: {
      '@type': 'Place',
      name: 'Earth',
    },
    creator: {
      '@type': 'Organization',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
    },
    distribution: [
      { '@type': 'DataDownload', name: 'NOAA Climate at a Glance - Global Land+Ocean' },
      { '@type': 'DataDownload', name: 'Our World in Data / ERA5 - Global Land Surface Temperature' },
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

export default function ClimateGlobalPage() {
  return (
    <>
      <DatasetSchema />
      <GlobalProfile />
    </>
  );
}
