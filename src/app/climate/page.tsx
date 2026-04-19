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
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#D0A65E] via-[#E8C97A] to-[#D0A65E] bg-clip-text text-transparent">
            Climate Profiles
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Temperature trends, precipitation data, and emissions tracking for countries, US states, and UK regions — updated monthly from OWID, NOAA, and the Met Office.
          </p>
        </div>

        {/* Countries */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-sky-400">🌍</span> Countries
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {countries.map(region => (
              <RegionCard key={region.slug} region={region} />
            ))}
          </div>
        </section>

        {/* US States */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-amber-400">🇺🇸</span> US States
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {usStates.map(region => (
              <RegionCard key={region.slug} region={region} />
            ))}
          </div>
        </section>

        {/* UK Regions */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-emerald-400">🇬🇧</span> UK Regions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ukRegions.map(region => (
              <RegionCard key={region.slug} region={region} />
            ))}
          </div>
        </section>

        {/* SEO content block */}
        <section className="mt-16 border-t border-gray-800 pt-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-300">About Climate Profiles</h2>
          <div className="text-sm text-gray-500 space-y-3 max-w-3xl">
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
    </main>
  );
}

function RegionCard({ region }: { region: typeof CLIMATE_REGIONS[number] }) {
  return (
    <Link
      href={`/climate/${region.slug}`}
      className="group block rounded-xl border border-gray-800 bg-gray-900/60 p-5 hover:border-[#D0A65E]/50 hover:bg-gray-900 transition-all duration-200"
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
