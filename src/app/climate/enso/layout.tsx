import type { Metadata } from 'next';

const URL = 'https://4billionyearson.org/climate/enso';

export const metadata: Metadata = {
  title: 'El Niño / La Niña — Live ENSO Tracker (Niño 3.4, ONI, MEI, SOI)',
  description:
    "Live tracker for the El Niño-Southern Oscillation (ENSO). Weekly Niño 3.4 SST anomalies, the NOAA Oceanic Niño Index (ONI), Multivariate ENSO Index (MEI v2), Southern Oscillation Index (SOI), live tropical Pacific SST anomaly maps and the official CPC probability forecast. Updated monthly from NOAA CPC and PSL.",
  keywords: [
    'El Niño',
    'La Niña',
    'ENSO',
    'Niño 3.4',
    'Oceanic Niño Index',
    'ONI',
    'Multivariate ENSO Index',
    'MEI v2',
    'Southern Oscillation Index',
    'SOI',
    'Pacific Ocean SST',
    'ENSO forecast',
    'NOAA CPC',
    'NOAA PSL',
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: 'El Niño / La Niña — Live ENSO Tracker',
    description:
      'Where in the El Niño / La Niña cycle is the Pacific right now? Weekly Niño 3.4 SST anomalies, ONI, MEI, SOI and the live NOAA forecast plume.',
    type: 'article',
    url: URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El Niño / La Niña — Live ENSO Tracker',
    description:
      'Live ENSO indicators: weekly Niño 3.4, ONI 3-month, MEI v2, SOI and NOAA forecast probabilities.',
  },
};

export default function EnsoLayout({ children }: { children: React.ReactNode }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'El Niño / La Niña — live ENSO indicators',
    description:
      'Live indicators of the El Niño-Southern Oscillation cycle, combining weekly Niño-region SST anomalies, the Oceanic Niño Index, the Multivariate ENSO Index v2 and the Southern Oscillation Index. Pacific tropical SST maps and the CPC probability forecast are embedded as live NOAA images.',
    url: URL,
    temporalCoverage: '1950/..',
    spatialCoverage: { '@type': 'Place', name: 'Equatorial Pacific Ocean' },
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Niño 3.4 sea-surface temperature anomaly (weekly)' },
      { '@type': 'PropertyValue', name: 'Oceanic Niño Index — 3-month running mean of Niño 3.4 SST' },
      { '@type': 'PropertyValue', name: 'Multivariate ENSO Index v2 (bi-monthly)' },
      { '@type': 'PropertyValue', name: 'Southern Oscillation Index — Tahiti–Darwin standardised SLP (monthly)' },
    ],
    creator: {
      '@type': 'Organization',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
    },
    publisher: {
      '@type': 'Organization',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
    },
    isBasedOn: [
      {
        '@type': 'CreativeWork',
        name: 'NOAA CPC Oceanic Niño Index (ONI)',
        url: 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt',
      },
      {
        '@type': 'CreativeWork',
        name: 'NOAA CPC weekly Niño-region SST anomalies',
        url: 'https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for',
      },
      {
        '@type': 'CreativeWork',
        name: 'NOAA PSL Multivariate ENSO Index v2 (MEI v2)',
        url: 'https://psl.noaa.gov/enso/mei/data/meiv2.data',
      },
      {
        '@type': 'CreativeWork',
        name: 'NOAA CPC Southern Oscillation Index (SOI)',
        url: 'https://www.cpc.ncep.noaa.gov/data/indices/soi',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {children}
    </>
  );
}
