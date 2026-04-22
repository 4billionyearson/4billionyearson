import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Globe2, Flag, Info } from 'lucide-react';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';
import UKRegionsBrowser from './uk-regions-browser';
import ClimateRegionsBrowser from './climate-regions-browser';
import StartHereStrip from './start-here-strip';
import ClimateHubSubNav from './climate-hub-sub-nav';

export const metadata: Metadata = {
  title: 'Climate Updates — Country, State & Region Climate Data',
  description:
    'Explore climate data profiles for countries, US states, and UK regions. Temperature trends, precipitation, emissions, and monthly summaries with data from OWID, NOAA, and the Met Office.',
  keywords: [
    'climate data by country',
    'US state climate data',
    'UK regional climate data',
    'temperature trends',
    'climate updates',
    'country emissions data',
  ],
  openGraph: {
    title: 'Climate Updates — Country, State & Region Climate Data',
    description:
      'Explore climate data profiles for countries, US states, and UK regions. Temperature trends, precipitation, emissions, and monthly summaries.',
    type: 'website',
  },
};

export default function ClimateProfilesIndex() {
  const countries = CLIMATE_REGIONS.filter(r => r.type === 'country' && r.slug !== 'ireland');
  const usStates = CLIMATE_REGIONS.filter(r => r.type === 'us-state');
  const ukAndIrelandRegions = CLIMATE_REGIONS.filter(r => r.type === 'uk-region' || r.slug === 'ireland');

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Sticky jump-to chips — above the hero so they're visible from the start */}
          <ClimateHubSubNav
            counts={{
              countries: countries.length,
              usStates: usStates.length,
              ukRegions: ukAndIrelandRegions.length,
            }}
          />

          {/* Hero + Start here — combined */}
          <StartHereStrip
            regions={CLIMATE_REGIONS}
            title="Climate Updates"
            description="Monthly climate updates for every country, US state and UK region we track — 144 regions in all. Temperature, rainfall and emissions trends drawn from OWID, NOAA and the Met Office, with AI-drafted narratives grounded in reputable news. Dive into a specific region below, or jump to the full league table and monthly movers."
          />

          {/* Countries */}
          <div id="countries" style={{ scrollMarginTop: '72px' }}>
            <ClimateRegionsBrowser
              title="Countries"
              icon={<Globe2 className="h-6 w-6" />}
              regions={countries}
              mode="country"
              intro="Climate profiles for every country we publish, grouped by continent. Data from Our World in Data and OWID-aggregated national sources."
            />
          </div>

          {/* US States */}
          <div id="us-states" style={{ scrollMarginTop: '72px' }}>
            <ClimateRegionsBrowser
              title="US States"
              icon={<Flag className="h-6 w-6" />}
              regions={usStates}
              mode="us-state"
              intro="NOAA Climate at a Glance temperature and precipitation data for every US state, grouped by Census Bureau region."
            />
          </div>

          <div id="uk-regions" style={{ scrollMarginTop: '72px' }}>
            <Suspense fallback={<UKRegionsFallback />}>
              <UKRegionsBrowser regions={ukAndIrelandRegions} />
            </Suspense>
          </div>

          {/* SEO content block */}
          <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="flex items-center gap-2 text-lg font-bold font-mono text-[#D0A65E] mb-3">
              <Info className="h-5 w-5" /> About Climate Updates
            </h2>
            <div className="text-sm text-gray-400 space-y-3 max-w-3xl">
              <p>
                Each climate update provides a data-driven snapshot of how climate change is affecting a specific region. Data is sourced from{' '}
                <a href="https://ourworldindata.org" className="text-[#D0A65E] hover:text-[#E8C97A]" target="_blank" rel="noopener noreferrer">Our World in Data</a>,{' '}
                <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/" className="text-[#D0A65E] hover:text-[#E8C97A]" target="_blank" rel="noopener noreferrer">NOAA Climate at a Glance</a>, and the{' '}
                <a href="https://www.metoffice.gov.uk/research/climate/maps-and-data" className="text-[#D0A65E] hover:text-[#E8C97A]" target="_blank" rel="noopener noreferrer">Met Office HadUK-Grid</a>.
              </p>
              <p>
                Profiles include annual temperature trends, monthly comparisons against historic baselines (1961–1990), precipitation data, and where available, CO₂ emissions trajectories. Data is refreshed monthly after source agencies publish their updates.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function UKRegionsFallback() {
  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <div className="flex items-start gap-2 mb-4">
        <span className="text-[#D0A65E] mt-1">⌖</span>
        <div>
          <h2 className="text-xl font-bold font-mono text-white">UK Regions & Ireland</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-3xl">Loading UK Regions & Ireland browser…</p>
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
