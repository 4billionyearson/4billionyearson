import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Globe2, Flag } from 'lucide-react';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';
import UKRegionsBrowser from './uk-regions-browser';
import ClimateRegionsBrowser from './climate-regions-browser';
import StartHereStrip from './start-here-strip';

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

          {/* Hero */}
          <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
                Climate Updates
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Temperature trends, precipitation data, and emissions tracking for countries, US states, and UK regions — updated monthly from OWID, NOAA, and the Met Office.
              </p>
            </div>
          </div>

          {/* Start here — curated picks + biggest shift */}
          <StartHereStrip regions={CLIMATE_REGIONS} />

          {/* Countries */}
          <ClimateRegionsBrowser
            title="Countries"
            icon={<Globe2 className="h-6 w-6" />}
            regions={countries}
            mode="country"
            intro="Climate profiles for every country we publish, grouped by continent. Data from Our World in Data and OWID-aggregated national sources."
          />

          {/* US States */}
          <ClimateRegionsBrowser
            title="US States"
            icon={<Flag className="h-6 w-6" />}
            regions={usStates}
            mode="us-state"
            intro="NOAA Climate at a Glance temperature and precipitation data for every US state, grouped by Census Bureau region."
          />

          <Suspense fallback={<UKRegionsFallback />}> 
            <UKRegionsBrowser regions={ukAndIrelandRegions} />
          </Suspense>

          {/* SEO content block */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-lg font-bold font-mono text-white mb-3">About Climate Updates</h2>
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
          <h2 className="text-xl font-bold font-mono text-white">UK and Ireland</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-3xl">Loading UK and Ireland browser…</p>
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
