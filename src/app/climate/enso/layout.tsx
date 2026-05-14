import type { Metadata } from 'next';
import { ENSO_FAQ } from './enso-faq';

const URL = 'https://4billionyearson.org/climate/enso';

export const metadata: Metadata = {
  title: 'El Niño / La Niña - ENSO Tracker, Global Impact Map & Forecast',
  description:
    "Interactive ENSO tracker: explore how El Niño and La Niña affect every country's temperature and rainfall since 1950. Live Niño 3.4 SST anomalies, NOAA ONI, MEI v2 and SOI indicators. Scrubbable world map showing ENSO's teleconnection footprint, Met Office plume forecasts, and how ENSO interacts with climate change.",
  keywords: [
    'El Niño',
    'La Niña',
    'ENSO',
    'ENSO global impact map',
    'ENSO footprint',
    'ENSO teleconnection',
    'El Niño world map',
    'La Niña world map',
    'ENSO country impacts',
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
    'ENSO correlation',
    'ENSO temperature anomaly',
    'ENSO rainfall anomaly',
    'ENSO and climate change',
    'NOAA CPC',
    'NOAA PSL',
    'Met Office GloSea',
    'Berkeley Earth temperature',
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: 'El Niño / La Niña - ENSO Global Impact Tracker',
    description:
      "Interactive map: where is El Niño / La Niña right now, and how does it affect every country's temperature and rainfall? Live Niño 3.4, ONI, MEI, SOI and NOAA forecast plume.",
    type: 'article',
    url: URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El Niño / La Niña - ENSO Global Impact Tracker',
    description:
      'Interactive world map of ENSO teleconnections since 1950. Live Niño 3.4, ONI 3-month, MEI v2, SOI and NOAA forecast probabilities.',
  },
};

export default function EnsoLayout({ children }: { children: React.ReactNode }) {
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'ENSO Global Impact Tracker — per-country temperature & rainfall anomalies 1950–present',
    description:
      'Interactive dataset of per-country temperature and rainfall anomalies relative to the 1961–1990 baseline for every year from 1950 to the present, linked to NOAA Oceanic Niño Index values. Includes ENSO teleconnection correlations (Pearson r vs ONI) and regression-based simulated impacts for hypothetical El Niño / La Niña strengths. Also includes live ENSO indicators: weekly Niño-region SST anomalies, the Oceanic Niño Index, MEI v2, and the Southern Oscillation Index.',
    url: `${URL}#impact`,
    temporalCoverage: '1950/..',
    spatialCoverage: { '@type': 'Place', name: 'Global' },
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Annual and Mar–May mean temperature anomaly vs 1961–1990 baseline (per country, °C)' },
      { '@type': 'PropertyValue', name: 'Annual and Mar–May mean precipitation anomaly vs 1961–1990 baseline (per country, %)' },
      { '@type': 'PropertyValue', name: 'Pearson r correlation of country temperature/rainfall with ONI (1950–present, detrended)' },
      { '@type': 'PropertyValue', name: 'Regression-based simulated anomaly per country for given ONI (°C or %)' },
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
        name: 'Berkeley Earth Land + Ocean Temperature (country-level annual)',
        url: 'https://berkeleyearth.org/data/',
      },
      {
        '@type': 'CreativeWork',
        name: 'World Bank Climate Knowledge Portal — precipitation (country-level annual)',
        url: 'https://climateknowledgeportal.worldbank.org/',
      },
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
    mainEntity: ENSO_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.aText },
    })),
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
