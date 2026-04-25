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

export default function ClimateGlobalPage() {
  return (
    <>
      <DatasetSchema />
      <GlobalProfile />
    </>
  );
}
