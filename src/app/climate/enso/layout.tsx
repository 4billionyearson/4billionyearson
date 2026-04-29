import type { Metadata } from 'next';

const URL = 'https://4billionyearson.org/climate/enso';

export const metadata: Metadata = {
  title: 'El Niño / La Niña - ENSO Tracker, Regional Impacts & Forecast',
  description:
    "Weekly ENSO tracker: Niño 3.4 SST anomalies, NOAA ONI, MEI v2 and SOI. Global impact maps showing which regions get warmer, cooler, wetter or drier under each phase. Met Office plume forecasts, past major events from 1982 to 2024, and how ENSO interacts with climate change.",
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
    'ENSO impacts',
    'El Niño regional impacts',
    'La Niña regional impacts',
    'ENSO and climate change',
    'NOAA CPC',
    'NOAA PSL',
    'Met Office GloSea',
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: 'El Niño / La Niña - ENSO Tracker',
    description:
      'Where in the El Niño / La Niña cycle is the Pacific right now? Weekly Niño 3.4 SST anomalies, ONI, MEI, SOI and the live NOAA forecast plume.',
    type: 'article',
    url: URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El Niño / La Niña - ENSO Tracker',
    description:
      'Live ENSO indicators: weekly Niño 3.4, ONI 3-month, MEI v2, SOI and NOAA forecast probabilities.',
  },
};

export default function EnsoLayout({ children }: { children: React.ReactNode }) {
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'El Niño / La Niña - live ENSO indicators',
    description:
      'Live indicators of the El Niño-Southern Oscillation cycle, combining weekly Niño-region SST anomalies, the Oceanic Niño Index, the Multivariate ENSO Index v2 and the Southern Oscillation Index. Pacific tropical SST maps and the CPC probability forecast are embedded as live NOAA images.',
    url: URL,
    temporalCoverage: '1950/..',
    spatialCoverage: { '@type': 'Place', name: 'Equatorial Pacific Ocean' },
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Niño 3.4 sea-surface temperature anomaly (weekly)' },
      { '@type': 'PropertyValue', name: 'Oceanic Niño Index - 3-month running mean of Niño 3.4 SST' },
      { '@type': 'PropertyValue', name: 'Multivariate ENSO Index v2 (bi-monthly)' },
      { '@type': 'PropertyValue', name: 'Southern Oscillation Index - Tahiti–Darwin standardised SLP (monthly)' },
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
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://4billionyearson.org' },
      { '@type': 'ListItem', position: 2, name: 'Climate', item: 'https://4billionyearson.org/climate' },
      { '@type': 'ListItem', position: 3, name: 'El Niño / La Niña', item: URL },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'El Niño / La Niña - ENSO Tracker',
    url: URL,
    description:
      'Live ENSO tracker: current state, weekly Niño 3.4 SST anomaly, NOAA ONI / MEI v2 / SOI, official NOAA CPC probability forecast, regional impact maps and past major events from 1982 to today.',
    isPartOf: {
      '@type': 'WebSite',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
    },
    primaryImageOfPage: { '@type': 'ImageObject', url: `${URL}/opengraph-image` },
    inLanguage: 'en-GB',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is El Niño or La Niña active right now?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The current ENSO state is shown live at the top of this page, derived from the NOAA Climate Prediction Center Oceanic Niño Index (ONI). El Niño is declared when the 3-month running mean of the Niño 3.4 SST anomaly stays at or above +0.5 °C for five overlapping seasons; La Niña uses the mirror threshold of −0.5 °C. Otherwise the Pacific is classed as Neutral.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the Niño 3.4 region?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Niño 3.4 is a box across the central tropical Pacific (5°N–5°S, 170°W–120°W). Its sea-surface temperature anomaly is the standard index used by NOAA, WMO and most climate agencies to define ENSO state. Niño 1+2 (off Peru), Niño 3 (eastern Pacific) and Niño 4 (western/central Pacific) are also tracked here for context.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is ENSO different from climate change?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ENSO is a natural redistribution of heat between the tropical Pacific Ocean and the atmosphere on a 2–7 year cycle. It can boost or suppress global temperatures by 0.1–0.3 °C for a year or two. Climate change is the long-term warming trend driven by greenhouse gases. Record-warm years (2016, 2023, 2024) typically combine a strong El Niño on top of the long-term trend.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where does the data come from?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Indicators are pulled directly from NOAA: the CPC Oceanic Niño Index (ONI), CPC weekly Niño-region SSTs, NOAA Physical Sciences Lab MEI v2 and CPC Southern Oscillation Index (SOI). The probability forecast is the NOAA CPC official outlook. Regional teleconnection patterns are based on Met Office GPC composites and Davey et al. (2013).',
        },
      },
      {
        '@type': 'Question',
        name: 'How often is the tracker updated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Weekly. The Niño-region SST anomalies update every Monday on NOAA CPC. The ONI 3-month index updates monthly, the MEI v2 every two months. We rebuild the snapshot used by this page once a week.',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {children}
    </>
  );
}
