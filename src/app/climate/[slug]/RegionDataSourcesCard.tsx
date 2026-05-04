import Link from 'next/link';
import { Database, ArrowUpRight } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';

type SourceEntry = {
  id: string;
  label: string;
  desc: string;
  url: string;
};

const SOURCE_REGISTRY: Record<string, SourceEntry> = {
  'noaa-continent': {
    id: 'noaa-continent',
    label: 'NOAA Climate at a Glance — Continental',
    desc: 'Continental land temperature anomaly. NOAA NCEI national & continental time series.',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series',
  },
  'noaa-region': {
    id: 'noaa-region',
    label: 'NOAA Climate at a Glance — US Climate Regions',
    desc: 'US 9-region temperature and precipitation series (1895–present).',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/regional/time-series',
  },
  'noaa-state': {
    id: 'noaa-state',
    label: 'NOAA Climate at a Glance — US Statewide',
    desc: 'Statewide monthly temperature and precipitation (nClimDiv).',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/statewide/time-series',
  },
  'noaa-national': {
    id: 'noaa-national',
    label: 'NOAA Climate at a Glance — National',
    desc: 'Contiguous-US national temperature and precipitation series.',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/national/time-series',
  },
  'noaa-global': {
    id: 'noaa-global',
    label: 'NOAA Climate at a Glance — Global',
    desc: 'Global land + ocean temperature anomaly (NOAAGlobalTemp v6).',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series',
  },
  'owid-temp': {
    id: 'owid-temp',
    label: 'Our World in Data — Country Temperature',
    desc: 'Country-level temperature anomaly, sourced from Copernicus ERA5 and Hadley HadCRUT5.',
    url: 'https://ourworldindata.org/temperature-anomaly',
  },
  'owid-emissions': {
    id: 'owid-emissions',
    label: 'Our World in Data — CO₂ Emissions',
    desc: 'Annual country and global CO₂ emissions, from the Global Carbon Project.',
    url: 'https://ourworldindata.org/co2-emissions',
  },
  'met-office': {
    id: 'met-office',
    label: 'UK Met Office HadUK-Grid',
    desc: 'UK Tmean / Tmax / Tmin, rainfall, rain-days, sunshine and air-frost series. © Crown copyright.',
    url: 'https://www.metoffice.gov.uk/research/climate/maps-and-data/data/haduk-grid/haduk-grid',
  },
  'arctic-ice': {
    id: 'arctic-ice',
    label: 'NSIDC Sea Ice Index',
    desc: 'Arctic and Antarctic monthly sea-ice extent.',
    url: 'https://nsidc.org/sea-ice-today/sea-ice-tools/sea-ice-index',
  },
};

export function RegionDataSourcesCard({ region }: { region: ClimateRegion }) {
  // De-duplicate while preserving order, and ignore unknown ids.
  const seen = new Set<string>();
  const entries: SourceEntry[] = [];
  for (const id of region.dataSources) {
    const entry = SOURCE_REGISTRY[id];
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push(entry);
  }
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="region-data-sources-heading"
      className="bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]"
    >
      <h2
        id="region-data-sources-heading"
        className="text-xl font-bold font-mono text-white mb-1 flex items-start gap-2"
      >
        <Database className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
        <span className="min-w-0 flex-1">Data Sources for {region.name}</span>
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Every figure on this page is sourced from official, openly published climate datasets.
        Anomalies are calculated against the 1961–1990 baseline (temperature) and 1991–2020
        (rainfall, sunshine, frost) — see the{' '}
        <Link href="/climate/methodology" className="text-teal-300 hover:text-teal-200 transition-colors">
          Methodology &amp; Sources
        </Link>{' '}
        page for the complete dataset list and update calendar.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {entries.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-gray-700/50 bg-gray-900/60 hover:bg-gray-800/80 hover:border-[#D0A65E]/45 p-3.5 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm font-semibold text-[#FFF5E7] flex-1 leading-tight">
                {s.label}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-teal-300 opacity-70 group-hover:opacity-100" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
