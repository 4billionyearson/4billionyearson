import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Suspense } from 'react';
import { Globe2, Flag, BookOpen } from 'lucide-react';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';
import UKRegionsBrowser from './uk-regions-browser';
import ClimateRegionsBrowser from './climate-regions-browser';
import GroupsBrowserPanel from './groups-browser-panel';
import { ClimateTabsProvider, ClimateHubControls, ClimateTabsPanels } from './climate-hub-tabs';
import type { CountryAnomalyRow } from './global/ClimateMapCard';
import EditorsPicksPanel from './editors-picks-panel';
import ClimateRankingsPanel from './climate-rankings-panel';
import { StaticFAQPanel, FaqJsonLd } from '@/app/_components/seo/StaticFAQPanel';
import { CLIMATE_HUB_FAQ } from './climate-hub-faq';

const REGION_COUNT = CLIMATE_REGIONS.length;
const HUB_URL = 'https://4billionyearson.org/climate';

export const metadata: Metadata = {
  title: `Climate Data Hub – ${REGION_COUNT} Countries, US States & UK Regions | 4 Billion Years On`,
  description: `Monthly climate updates for ${REGION_COUNT} regions worldwide: temperature anomalies, rainfall, spring/autumn timing shifts, CO₂ emissions and electricity mix. Plus the Global Climate Tracker (Paris 1.5°C / 2°C progress), country rankings, the Shifting Seasons analysis and the live El Niño / La Niña (ENSO) tracker. Data from NOAA, Met Office, OWID, CRU TS and the World Bank, all vs the 1961–1990 baseline.`,
  keywords: [
    'climate data by country',
    'US state climate data',
    'UK regional climate data',
    'temperature anomaly by country',
    'Paris Agreement 1.5 tracker',
    'shifting seasons climate',
    'El Niño tracker',
    'La Niña tracker',
    'ENSO state',
    'climate league table',
    'country emissions data',
    'electricity generation mix',
    'monthly climate update',
  ],
  alternates: { canonical: HUB_URL },
  openGraph: {
    title: `Climate Data Hub – ${REGION_COUNT} Countries, US States & UK Regions`,
    description: `Monthly climate updates for ${REGION_COUNT} regions: temperature, rainfall, seasonal shifts, emissions and electricity mix. With the Global Climate Tracker (Paris 1.5°C), Climate Rankings, Shifting Seasons and the live El Niño / La Niña (ENSO) tracker.`,
    type: 'website',
    url: HUB_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: `Climate Data Hub – ${REGION_COUNT} Regions`,
    description: 'Temperature, rainfall, seasonal shifts, emissions and electricity mix for every country, US state and UK region we track. Plus the Paris 1.5°C tracker.',
  },
};

function HubSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Climate Data Hub — ${REGION_COUNT} Regions`,
    description: `Monthly climate profiles for ${REGION_COUNT} countries, US states and UK regions, plus a global tracker and rankings.`,
    url: HUB_URL,
    isPartOf: {
      '@type': 'WebSite',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
    },
    about: [
      { '@type': 'Thing', name: 'Climate change' },
      { '@type': 'Thing', name: 'Global temperature anomaly' },
      { '@type': 'Thing', name: 'Paris Agreement (1.5°C and 2°C)' },
      { '@type': 'Thing', name: 'Rainfall and seasonal shifts' },
      { '@type': 'Thing', name: 'CO₂ emissions' },
      { '@type': 'Thing', name: 'Electricity generation mix' },
    ],
    numberOfItems: REGION_COUNT,
    inLanguage: 'en-GB',
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export default async function ClimateProfilesIndex() {
  const countries = CLIMATE_REGIONS.filter(r => r.type === 'country' && r.slug !== 'ireland');
  const usStates = CLIMATE_REGIONS.filter(r => r.type === 'us-state');
  const UK_NATION_API_CODES = new Set(['uk-eng', 'uk-wal', 'uk-sco', 'uk-ni']);
  const ukCountriesNations = CLIMATE_REGIONS.filter(r =>
    (r.type === 'uk-region' && UK_NATION_API_CODES.has(r.apiCode)) || r.slug === 'ireland'
  );
  const ukSubRegions = CLIMATE_REGIONS.filter(r =>
    r.type === 'uk-region' && !UK_NATION_API_CODES.has(r.apiCode)
  );
  const groups = CLIMATE_REGIONS.filter(r => r.type === 'group');
  const continentsGroup = groups.filter(g => g.groupKind === 'continent');
  const usClimateRegions = groups.filter(g => g.groupKind === 'us-climate-region');

  let countryAnomalies: CountryAnomalyRow[] = [];
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const raw = await readFile(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.countryAnomalies)) countryAnomalies = parsed.countryAnomalies;
  } catch {
    /* map view will simply not render until data is available */
  }

  return (
    <main>
      <HubSchema />
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          <ClimateTabsProvider
            regions={CLIMATE_REGIONS}
            countryAnomalies={countryAnomalies}
            counts={{
              countries: countries.length,
              usStates: usStates.length,
              ukCountries: ukCountriesNations.length,
              ukRegions: ukSubRegions.length,
              continents: continentsGroup.length,
              usClimateRegions: usClimateRegions.length,
            }}
            panels={{
              'editors-picks': <EditorsPicksPanel regions={CLIMATE_REGIONS} />,
              continents: <GroupsBrowserPanel groups={continentsGroup} kind="continent" />,
              countries: (
                <ClimateRegionsBrowser
                  title="Countries"
                  icon={<Globe2 className="h-6 w-6" />}
                  regions={countries}
                  mode="country"
                  headless
                />
              ),
              'uk-countries': (
                <Suspense fallback={<UKRegionsFallback />}>
                  <UKRegionsBrowser regions={ukCountriesNations} headless hideFilter />
                </Suspense>
              ),
              'uk-regions': (
                <Suspense fallback={<UKRegionsFallback />}>
                  <UKRegionsBrowser regions={ukSubRegions} headless />
                </Suspense>
              ),
              'us-states': (
                <ClimateRegionsBrowser
                  title="US States"
                  icon={<Flag className="h-6 w-6" />}
                  regions={usStates}
                  mode="us-state"
                  headless
                />
              ),
              'us-climate-regions': <GroupsBrowserPanel groups={usClimateRegions} kind="us-climate-region" />,
              rankings: <ClimateRankingsPanel />,
            }}
          >
            {/* Single unified card: gold header → description → tab bar → divider → active panel.
                One container, no floating gap, so the tab menu reads as the section's sub-nav. */}
            <section
              className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden"
              style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
            >
              <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
                <h1
                  className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight"
                  style={{ color: '#FFF5E7' }}
                >
                  Climate Updates
                </h1>
              </div>
              <div className="bg-gray-950 px-4 py-3 md:px-6 md:py-4">
                <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                  Monthly climate updates for {REGION_COUNT} continents, climate regions, countries, US states and UK regions –
                  temperature, rainfall and emissions trends from NOAA, OWID, the Met Office and CRU TS.
                </p>
              </div>
              <div className="sticky top-0 z-30 bg-gray-950 px-4 pt-3 pb-3 md:px-6 md:pt-4 md:pb-3 border-b border-gray-800/60">
                <ClimateHubControls />
              </div>
              <div className="bg-gray-950">
                <ClimateTabsPanels />
              </div>
            </section>
          </ClimateTabsProvider>

          {/* Frequently Asked Questions */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
            <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg [&>svg]:shrink-0">
              <BookOpen className="h-5 w-5" />
              <span>FAQs</span>
            </h2>
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
          </div>
          <StaticFAQPanel headingId="climate-hub-faq-heading" qa={CLIMATE_HUB_FAQ} />
          <FaqJsonLd qa={CLIMATE_HUB_FAQ} />
        </div>
      </div>
    </main>
  );
}

function UKRegionsFallback() {
  return (
    <section className="rounded-2xl border-2 border-[#D0A65E]/80 bg-gray-950/90 backdrop-blur-md p-4 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
      <div className="flex items-start gap-2 mb-4">
        <span className="text-[#D0A65E] mt-1">⌖</span>
        <div>
          <h2 className="text-xl font-bold font-mono text-white">UK Regions</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-3xl">Loading UK Regions browser…</p>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 animate-pulse">
            <div className="h-5 w-36 bg-gray-800 rounded" />
            <div className="mt-3 h-4 w-52 bg-gray-800 rounded" />
            <div className="mt-2 h-4 w-44 bg-gray-900 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
