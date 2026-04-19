import type { Metadata } from 'next';
import Link from 'next/link';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';

export const metadata: Metadata = {
  title: 'Climate Profiles — Country, State & Region Climate Data',
  description:
    'Explore climate data profiles for countries, US states, and UK regions. Temperature trends, precipitation, emissions, and monthly summaries with data from OWID, NOAA, and the Met Office.',
  keywords: [
    'climate data by country',
    'US state climate data',
    'UK regional climate data',
    'temperature trends',
    'climate profiles',
    'country emissions data',
  ],
  openGraph: {
    title: 'Climate Profiles — Country, State & Region Climate Data',
    description:
      'Explore climate data profiles for countries, US states, and UK regions. Temperature trends, precipitation, emissions, and monthly summaries.',
    type: 'website',
  },
};

const TYPE_LABELS: Record<string, string> = {
  country: 'Country',
  'us-state': 'US State',
  'uk-region': 'UK Region',
  special: 'Special',
};

const TYPE_COLORS: Record<string, string> = {
  country: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  'us-state': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'uk-region': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  special: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

export default function ClimateProfilesIndex() {
  const countries = CLIMATE_REGIONS.filter(r => r.type === 'country');
  const usStates = CLIMATE_REGIONS.filter(r => r.type === 'us-state');
  const ukRegions = CLIMATE_REGIONS.filter(r => r.type === 'uk-region');

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Hero */}
          <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
                Climate Profiles
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Temperature trends, precipitation data, and emissions tracking for countries, US states, and UK regions — updated monthly from OWID, NOAA, and the Met Office.
              </p>
            </div>
          </div>

          {/* Countries */}
          <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-center gap-2">
              <span>🌍</span> Countries
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {countries.map(region => (
                <RegionCard key={region.slug} region={region} />
              ))}
            </div>
          </section>

          {/* US States */}
          <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-center gap-2">
              <span>🇺🇸</span> US States
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {usStates.map(region => (
                <RegionCard key={region.slug} region={region} />
              ))}
            </div>
          </section>

          {/* UK Regions */}
          <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-center gap-2">
              <span>🇬🇧</span> UK Regions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ukRegions.map(region => (
                <RegionCard key={region.slug} region={region} />
              ))}
            </div>
          </section>

          {/* SEO content block */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-lg font-bold font-mono text-white mb-3">About Climate Profiles</h2>
            <div className="text-sm text-gray-400 space-y-3 max-w-3xl">
              <p>
                Each climate profile provides a data-driven snapshot of how climate change is affecting a specific region. Data is sourced from{' '}
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

function RegionCard({ region }: { region: typeof CLIMATE_REGIONS[number] }) {
  return (
    <Link
      href={`/climate/${region.slug}`}
      className="group block rounded-xl border border-gray-700/50 bg-gray-900/60 p-4 hover:border-[#D0A65E]/50 hover:bg-gray-900 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{region.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-100 group-hover:text-white truncate">
              {region.name}
            </h3>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_COLORS[region.type]}`}>
              {TYPE_LABELS[region.type]}
            </span>
          </div>
          <p className="text-sm text-gray-400 line-clamp-2">{region.tagline}</p>
        </div>
      </div>
    </Link>
  );
}
