import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRegionBySlug, getAllSlugs, CLIMATE_REGIONS } from '@/lib/climate/regions';
import ClimateProfile from './ClimateProfile';

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  if (!region) return {};

  const title = `${region.name} Climate Data — Temperature, Precipitation & Emissions`;

  return {
    title,
    description: region.description,
    keywords: region.keywords,
    openGraph: {
      title,
      description: region.description,
      type: 'website',
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
    name: `${region.name} Climate Data`,
    description: region.description,
    url: `https://4billionyearson.org/climate/${region.slug}`,
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
