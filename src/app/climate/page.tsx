import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Globe2, Flag } from 'lucide-react';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';
import UKRegionsBrowser from './uk-regions-browser';
import ClimateRegionsBrowser from './climate-regions-browser';
import { ClimateTabsProvider, ClimateTabsBar, ClimateTabsPanels } from './climate-hub-tabs';
import EditorsPicksPanel from './editors-picks-panel';
import ClimateRankingsPanel from './climate-rankings-panel';

export const metadata: Metadata = {
  title: 'Climate Updates - Country, State & Region Climate Data',
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
    title: 'Climate Updates - Country, State & Region Climate Data',
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

          <ClimateTabsProvider
            counts={{
              countries: countries.length,
              usStates: usStates.length,
              ukRegions: ukAndIrelandRegions.length,
            }}
            panels={{
              'editors-picks': <EditorsPicksPanel regions={CLIMATE_REGIONS} />,
              countries: (
                <ClimateRegionsBrowser
                  title="Countries"
                  icon={<Globe2 className="h-6 w-6" />}
                  regions={countries}
                  mode="country"
                  headless
                />
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
              'uk-regions': (
                <Suspense fallback={<UKRegionsFallback />}>
                  <UKRegionsBrowser regions={ukAndIrelandRegions} headless />
                </Suspense>
              ),
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
                  Monthly climate updates for every country, US state and UK region we track - 144 regions in all. Temperature, rainfall and emissions trends drawn from OWID, NOAA and the Met Office, with AI-drafted narratives grounded in reputable news.
                </p>
              </div>
              <div className="sticky top-0 z-30 bg-gray-950 px-4 pt-2 pb-1 md:px-6">
                <ClimateTabsBar />
              </div>
              <div className="bg-gray-950">
                <ClimateTabsPanels />
              </div>
            </section>
          </ClimateTabsProvider>
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
