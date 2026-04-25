import type { Metadata } from 'next';

const URL = 'https://4billionyearson.org/climate/shifting-seasons';

export const metadata: Metadata = {
  title: 'Shifting Seasons — How Climate Change Is Moving Spring, Summer, Autumn and Winter',
  description:
    "Tracking how the timing of the seasons is shifting — from Kyoto's 1,200-year cherry-blossom record and US frost-free growing-season dates (EPA, since 1895) to Northern Hemisphere snow cover (Rutgers Global Snow Lab). Spring is arriving earlier, autumn later, snow seasons are shrinking, and the data is unambiguous.",
  keywords: [
    'shifting seasons',
    'phenology climate change',
    'Kyoto cherry blossom dates',
    'Northern Hemisphere snow cover',
    'Rutgers Global Snow Lab',
    'US frost-free growing season',
    'EPA climate indicators',
    'spring arriving earlier',
    'autumn arriving later',
    'growing season length',
    'climate change seasons',
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: 'Shifting Seasons — How Climate Change Is Moving the Calendar',
    description:
      "Kyoto's cherry blossoms now bloom ~11 days earlier than the pre-1850 average. Northern Hemisphere snow seasons are shrinking. US growing seasons are lengthening. The seasons are shifting — here's the data.",
    type: 'article',
    url: URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shifting Seasons — How Climate Change Is Moving the Calendar',
    description:
      "1,200 years of Kyoto cherry-blossom dates, US frost-free growing seasons, and Northern Hemisphere snow cover — the seasonal calendar is moving.",
  },
};

export default function ShiftingSeasonsLayout({ children }: { children: React.ReactNode }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Shifting Seasons — phenology and seasonal-timing indicators',
    description:
      'Long-record indicators of shifting season timing: Kyoto cherry-blossom peak-bloom dates (AD 812 onward), US frost-free growing-season length (EPA, 1895 onward) and Northern Hemisphere snow-cover extent (Rutgers Global Snow Lab).',
    url: URL,
    temporalCoverage: '0812/..',
    spatialCoverage: [
      { '@type': 'Place', name: 'Kyoto, Japan' },
      { '@type': 'Place', name: 'Contiguous United States' },
      { '@type': 'Place', name: 'Northern Hemisphere' },
    ],
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Kyoto cherry-blossom peak-bloom day-of-year' },
      { '@type': 'PropertyValue', name: 'US frost-free growing-season length (days)' },
      { '@type': 'PropertyValue', name: 'Northern Hemisphere snow-cover extent (million km²)' },
      { '@type': 'PropertyValue', name: 'Spring index onset by location' },
    ],
    creator: {
      '@type': 'Organization',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
    },
    distribution: [
      { '@type': 'DataDownload', name: 'Osaka Prefecture University — Kyoto cherry-blossom phenology' },
      { '@type': 'DataDownload', name: 'US EPA — Climate Change Indicators: Length of Growing Season' },
      { '@type': 'DataDownload', name: 'Rutgers Global Snow Lab — Northern Hemisphere snow-cover extent' },
      { '@type': 'DataDownload', name: 'USA-NPN — Extended Spring Indices' },
    ],
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      {children}
    </>
  );
}
