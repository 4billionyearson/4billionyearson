import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';
import type { HelixSeriesTab } from '../global/GlobalHelixCard';
import type { ClimateSpiralHudMetric } from '@/app/_components/climate-spiral-card';
import HelixClientSection from './HelixClientSection';

// ISR: revalidate every 24 h — same as other climate hub pages. The page
// reads searchParams only to customise metadata; the heavy climate data is
// loaded client-side via the profile API (which has its own 1 h CDN cache).
export const revalidate = 86400;

const HUB_URL = 'https://4billionyearson.org/climate/helix';
const OG_API = 'https://4billionyearson.org/api/og/helix';

const BASE_KEYWORDS = [
  'climate helix',
  'temperature spiral',
  'global warming visualization',
  'year on year temperature',
  'climate change chart',
  'climate spiral chart',
  'Paris agreement 1.5°C',
  'Paris agreement 2°C',
  'global temperature anomaly',
  'monthly temperature history',
  'climate data visualization',
  'animated temperature spiral',
  'Ed Hawkins climate spiral',
  'climate helix interactive',
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}): Promise<Metadata> {
  const { region: regionSlug } = await searchParams;

  const region = regionSlug ? CLIMATE_REGIONS.find((r) => r.slug === regionSlug) : null;
  const regionName = region?.name ?? null;

  const title = regionName
    ? `${regionName} – Climate Helix | 4 Billion Years On`
    : 'Climate Helix – Year-on-Year Temperature Spiral | 4 Billion Years On';

  const ogTitle = regionName
    ? `${regionName} – Climate Helix`
    : 'Climate Helix — Year-on-Year Temperature Spiral';

  const description = regionName
    ? `The Climate Helix for ${regionName}: every monthly temperature reading since records began, wound into a radial year-on-year spiral. Watch ${regionName}'s warming trend emerge.`
    : 'The Climate Helix is a radial year-on-year temperature dial: each loop is a year, the colour gradient is the long-term warming trend, and the global helix includes Paris 1.5°C and 2°C reference rings. Explore the global helix here, or open any country, US state or UK region to see its own.';

  const canonicalUrl = regionSlug ? `${HUB_URL}?region=${encodeURIComponent(regionSlug)}` : HUB_URL;

  const ogImageUrl = regionSlug
    ? `${OG_API}?slug=${encodeURIComponent(regionSlug)}&name=${encodeURIComponent(regionName ?? regionSlug)}`
    : OG_API;

  return {
    title,
    description,
    keywords: BASE_KEYWORDS,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: ogTitle,
      description: regionName
        ? `Radial year-on-year temperature spiral for ${regionName}, with Paris 1.5°C / 2°C reference rings.`
        : 'Radial year-on-year temperature dial with global Paris 1.5°C / 2°C reference rings, plus a region picker for every country, US state and UK region we track.',
      type: 'website',
      url: canonicalUrl,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: regionName
        ? `Year-on-year temperature spiral for ${regionName} — every monthly reading since records began.`
        : 'A radial year-on-year dial of every monthly temperature reading since records began.',
    },
  };
}

interface GlobalHistory {
  landOceanMonthlyAll?: { year: number; month: number; value: number }[];
  landMonthlyAll?: { year: number; month: number; value: number }[];
  preIndustrialBaseline?: number;
  ghgStats?: { co2?: { yearly?: { year: number; value: number }[] } };
  seaLevelStats?: { yearly?: { year: number; value: number }[] };
  seaIceStats?: { yearly?: { year: number; value: number }[] };
}

async function loadGlobalHistory(): Promise<GlobalHistory | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw) as GlobalHistory;
  } catch {
    return null;
  }
}

export default async function ClimateHelixPage() {
  const history = await loadGlobalHistory();
  const globalParisReference = Number.isFinite(history?.preIndustrialBaseline)
    ? {
        monthly: Array.from({ length: 12 }, () => history!.preIndustrialBaseline as number),
        label: `global 1850–1900 mean (${history!.preIndustrialBaseline!.toFixed(1)}°C)`,
      }
    : undefined;

  // Build supplemental HUD signals (CO2, sea level, sea ice) — same as GlobalProfile
  const worldViewSignals: ClimateSpiralHudMetric[] = [];
  if (history?.ghgStats?.co2?.yearly?.length) {
    worldViewSignals.push({
      key: 'co2',
      label: 'Atmospheric CO2',
      shortLabel: 'CO2',
      unit: 'ppm',
      color: '#D0A65E',
      icon: 'co2' as const,
      series: history.ghgStats.co2.yearly,
      decimals: 0,
      note: 'Annual mean',
    });
  }
  if (history?.seaLevelStats?.yearly?.length) {
    worldViewSignals.push({
      key: 'sea-level',
      label: 'Sea level',
      shortLabel: 'Sea level',
      unit: 'mm',
      color: '#14B8A6',
      icon: 'sea-level' as const,
      series: history.seaLevelStats.yearly,
      decimals: 0,
      note: 'Sat mean',
    });
  }
  if (history?.seaIceStats?.yearly?.length) {
    worldViewSignals.push({
      key: 'sea-ice',
      label: 'Sea ice',
      shortLabel: 'Sea ice',
      unit: 'Mkm²',
      color: '#7DD3FC',
      icon: 'sea-ice' as const,
      series: history.seaIceStats.yearly,
      decimals: 0,
      note: 'Global mean',
    });
  }
  const supplementalHudMetrics = worldViewSignals.length > 0 ? worldViewSignals : undefined;

  const tabs: HelixSeriesTab[] = [];
  if (history?.landOceanMonthlyAll?.length) {
    tabs.push({
      key: 'land-ocean',
      label: 'Land + Ocean',
      series: { temp: history.landOceanMonthlyAll },
      regionName: 'Global Land + Ocean',
      dataSource: 'NOAA Climate at a Glance — Global Land+Ocean',
      embedSlug: 'global-land-ocean',
      parisReference: globalParisReference,
      supplementalHudMetrics,
    });
  }
  if (history?.landMonthlyAll?.length) {
    tabs.push({
      key: 'land',
      label: 'Land',
      series: { temp: history.landMonthlyAll },
      regionName: 'Global Land',
      dataSource: 'Our World in Data / ERA5',
      embedSlug: 'global-land',
      supplementalHudMetrics,
    });
  }

  const globalRecordsSeries = history?.landOceanMonthlyAll?.length
    ? { temp: history.landOceanMonthlyAll }
    : history?.landMonthlyAll?.length
      ? { temp: history.landMonthlyAll }
      : null;
  const globalRecordsSource = history?.landOceanMonthlyAll?.length
    ? 'NOAA Climate at a Glance — Global Land+Ocean'
    : history?.landMonthlyAll?.length
      ? 'Our World in Data / ERA5'
      : null;

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                '@id': HUB_URL,
                url: HUB_URL,
                name: 'Climate Helix – Year-on-Year Temperature Spiral',
                description:
                  'An interactive radial temperature spiral showing monthly global and regional temperatures since records began, with Paris Agreement 1.5°C and 2°C reference rings on the global helix.',
                isPartOf: { '@id': 'https://4billionyearson.org' },
                about: {
                  '@type': 'Dataset',
                  name: 'Climate Helix Temperature Records',
                  description:
                    'Monthly global and regional surface temperature anomalies from 1850 to present, visualised as an animated radial spiral.',
                  url: HUB_URL,
                  temporalCoverage: '1850/..',
                  spatialCoverage: {
                    '@type': 'Place',
                    name: 'Earth',
                  },
                  variableMeasured: [
                    { '@type': 'PropertyValue', name: 'Global land+ocean temperature anomaly', unitText: '°C' },
                    { '@type': 'PropertyValue', name: 'Global land surface temperature anomaly', unitText: '°C' },
                    { '@type': 'PropertyValue', name: 'Regional monthly temperature anomaly', unitText: '°C' },
                    { '@type': 'PropertyValue', name: 'Paris Agreement progress vs 1.5°C limit', unitText: '°C' },
                    { '@type': 'PropertyValue', name: 'Paris Agreement progress vs 2.0°C limit', unitText: '°C' },
                  ],
                  creator: {
                    '@type': 'Organization',
                    name: '4 Billion Years On',
                    url: 'https://4billionyearson.org',
                  },
                  license: 'https://creativecommons.org/licenses/by/4.0/',
                },
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://4billionyearson.org' },
                  { '@type': 'ListItem', position: 2, name: 'Climate', item: 'https://4billionyearson.org/climate' },
                  { '@type': 'ListItem', position: 3, name: 'Climate Helix', item: HUB_URL },
                ],
              },
            ],
          }),
        }}
      />
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">
          <HelixClientSection
            regions={CLIMATE_REGIONS}
            globalTabs={tabs}
            globalRecordsSeries={globalRecordsSeries}
            globalRecordsSource={globalRecordsSource}
          />
        </div>
      </div>
    </main>
  );
}
