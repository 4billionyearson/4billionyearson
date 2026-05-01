import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import BaselineExplainer from '../_components/BaselineExplainer';
import DataSourceTimeline from './DataSourceTimeline';

const PAGE_URL = 'https://4billionyearson.org/climate/methodology';

export const metadata: Metadata = {
  title: 'Climate Data Methodology — Sources, Baselines & Timeline | 4 Billion Years On',
  description:
    'How 4 Billion Years On builds its climate dataset: full source inventory, native and comparison baselines, the two-baseline model, and a timeline of when each source\'s data starts.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Climate Data Methodology — Sources, Baselines & Timeline',
    description:
      'Full source inventory, baselines, and a timeline of data coverage from 1850 to today.',
    type: 'article',
    url: PAGE_URL,
  },
};

interface SourceRow {
  source: string;
  dataset: string;
  variable: string;
  start: number;
  baseline: string;
  url: string;
  family: 'temp' | 'precip' | 'co2' | 'ghg' | 'ice' | 'enso' | 'sea';
}

const SOURCES: SourceRow[] = [
  {
    source: 'NOAA NCEI',
    dataset: 'Global Land+Ocean (Climate at a Glance)',
    variable: 'Global temperature anomaly',
    start: 1850,
    baseline: '1901–2000',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series',
    family: 'temp',
  },
  {
    source: 'NOAA NCEI',
    dataset: 'Continental land series (Africa, Europe, Asia, Oceania)',
    variable: 'Continental land temperature anomaly',
    start: 1910,
    baseline: '1901–2000',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series',
    family: 'temp',
  },
  {
    source: 'NOAA NCEI',
    dataset: 'Hemispheric land series (NHem, SHem)',
    variable: 'Hemispheric land temperature anomaly',
    start: 1880,
    baseline: '1901–2000',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series',
    family: 'temp',
  },
  {
    source: 'NOAA NCEI',
    dataset: 'Statewide tavg / tmax / tmin / pcp',
    variable: 'US state temperature & precipitation',
    start: 1895,
    baseline: '1901–2000',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/statewide/time-series',
    family: 'temp',
  },
  {
    source: 'NOAA NCEI',
    dataset: 'US Climate Regions (codes 101–109)',
    variable: 'US climate-region temperature & precipitation',
    start: 1895,
    baseline: '1901–2000',
    url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/regional/time-series',
    family: 'temp',
  },
  {
    source: 'Our World in Data',
    dataset: 'Country temperature anomalies (HadCRUT5-derived)',
    variable: 'Country temperature anomaly',
    start: 1950,
    baseline: '1961–1990',
    url: 'https://ourworldindata.org/grapher/average-monthly-surface-temperature',
    family: 'temp',
  },
  {
    source: 'World Bank CCKP / CRU TS',
    dataset: 'Country precipitation',
    variable: 'Country precipitation',
    start: 1901,
    baseline: '1961–1990',
    url: 'https://climateknowledgeportal.worldbank.org/',
    family: 'precip',
  },
  {
    source: 'Met Office',
    dataset: 'HadUK-Grid Regional (Tmean, Tmax, Tmin, Rainfall)',
    variable: 'UK regional temperature & rainfall',
    start: 1884,
    baseline: '1991–2020',
    url: 'https://www.metoffice.gov.uk/hadobs/hadukp/',
    family: 'temp',
  },
  {
    source: 'NSIDC',
    dataset: 'Sea Ice Index',
    variable: 'Arctic / Antarctic sea ice extent',
    start: 1979,
    baseline: '1991–2020',
    url: 'https://nsidc.org/arcticseaicenews/',
    family: 'ice',
  },
  {
    source: 'NOAA GML',
    dataset: 'Mauna Loa CO₂',
    variable: 'Atmospheric CO₂',
    start: 1958,
    baseline: 'n/a',
    url: 'https://gml.noaa.gov/ccgg/trends/',
    family: 'co2',
  },
  {
    source: 'NOAA GML',
    dataset: 'Global CH₄ and N₂O',
    variable: 'Atmospheric CH₄, N₂O',
    start: 1983,
    baseline: 'n/a',
    url: 'https://gml.noaa.gov/ccgg/trends_ch4/',
    family: 'ghg',
  },
  {
    source: 'NOAA CPC',
    dataset: 'Oceanic Niño Index (ONI)',
    variable: 'ENSO state',
    start: 1950,
    baseline: '1991–2020',
    url: 'https://origin.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php',
    family: 'enso',
  },
];

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://4billionyearson.org/' },
    { '@type': 'ListItem', position: 2, name: 'Climate', item: 'https://4billionyearson.org/climate' },
    { '@type': 'ListItem', position: 3, name: 'Methodology', item: PAGE_URL },
  ],
};

export default function MethodologyPage() {
  return (
    <main className="container mx-auto px-3 md:px-4 pt-2 pb-8 md:pt-4 md:pb-12 max-w-5xl font-sans text-gray-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }}
      />

      <nav className="mb-4 text-xs text-gray-400">
        <Link href="/climate" className="inline-flex items-center gap-1 hover:text-[#E8C97A]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Climate hub
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="font-mono text-2xl md:text-3xl font-bold text-white flex items-start gap-2">
          <FileText className="h-6 w-6 shrink-0 text-[#D0A65E] mt-1" />
          <span>Climate Data Methodology</span>
        </h1>
        <p className="mt-2 text-sm text-gray-400 max-w-3xl leading-relaxed">
          How this site builds its climate dataset, which baselines apply where, and when each
          upstream source&apos;s record begins. Everything below is reproducible from the public
          data files in <code className="text-gray-300">/public/data/climate/</code> and the
          build scripts in <code className="text-gray-300">/scripts/</code>.
        </p>
      </header>

      <div className="space-y-6">
        <BaselineExplainer />

        <section className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 md:p-5">
          <h2 className="font-mono text-lg font-bold text-white mb-2">The two-baseline model</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Climate normals are arbitrary. Different agencies use different 30-year reference
            periods, and switching baseline only shifts every value by a constant — the trend is
            identical. To make the site both internally consistent <em>and</em> easy to verify
            against upstream sources, we publish two figures wherever they differ:
          </p>
          <ol className="mt-3 list-decimal pl-5 text-sm text-gray-300 space-y-1.5">
            <li>
              A <strong className="text-white">comparison baseline of 1961–1990</strong> on
              maps, rankings, and roll-ups. This is the WMO standard normal and the same
              baseline OWID, the Met Office Hadley Centre, and most academic literature use, so
              numbers are directly comparable across regions.
            </li>
            <li>
              The <strong className="text-white">source-native baseline</strong> shown alongside
              for verification. NOAA US states, climate regions, and continents use 1901–2000;
              the Met Office UK pages use 1991–2020; sea-ice extent uses NSIDC&apos;s 1991–2020
              climatology; the Paris 1.5 °C / 2 °C tracker uses 1850–1900 pre-industrial.
            </li>
          </ol>
          <p className="mt-3 text-sm text-gray-300 leading-relaxed">
            Re-baselining is a deterministic linear shift: we take each calendar month&apos;s
            mean over 1961–1990, subtract it from the source-native anomaly, and the result is
            the same observation re-expressed against the comparison period. No smoothing,
            interpolation, or homogenisation is added on our side.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 md:p-5">
          <h2 className="font-mono text-lg font-bold text-white mb-3">Data source timeline</h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Each bar shows the year the upstream record begins through to the latest available
            month. Bars are colour-coded by data family. The vertical guideline marks the start
            of the 1961–1990 comparison window.
          </p>
          <DataSourceTimeline sources={SOURCES} />
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 md:p-5">
          <h2 className="font-mono text-lg font-bold text-white mb-3">Source inventory</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Source</th>
                  <th className="px-3 py-2 text-left font-semibold">Dataset</th>
                  <th className="px-3 py-2 text-left font-semibold">Variable</th>
                  <th className="px-3 py-2 text-right font-semibold">Start</th>
                  <th className="px-3 py-2 text-left font-semibold">Native baseline</th>
                  <th className="px-3 py-2 text-left font-semibold">Link</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s, i) => (
                  <tr
                    key={`${s.source}-${s.dataset}`}
                    className={`border-t border-gray-800 ${i % 2 === 0 ? 'bg-gray-950/40' : ''}`}
                  >
                    <td className="px-3 py-2 text-gray-200">{s.source}</td>
                    <td className="px-3 py-2 text-gray-300">{s.dataset}</td>
                    <td className="px-3 py-2 text-gray-400">{s.variable}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-300">{s.start}</td>
                    <td className="px-3 py-2 text-gray-400">{s.baseline}</td>
                    <td className="px-3 py-2 text-xs">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#E8C97A] hover:underline"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 md:p-5">
          <h2 className="font-mono text-lg font-bold text-white mb-2">How rankings are computed</h2>
          <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1.5">
            <li>
              For each region we read the latest complete month from the per-region snapshot
              and compute the 1-month, 3-month rolling, and 12-month rolling anomaly against
              1961–1990.
            </li>
            <li>
              Rows are sorted globally; the rank shown in the table is the position across all
              regions of the selected sort window, not within the active filter.
            </li>
            <li>
              Roll-ups by group use NOAA-authoritative continent and 9-region US series where
              they exist. North and South America are 4BYO aggregates from country snapshots
              because NOAA does not publish standalone land series for them — these rows are
              flagged <em>“agg”</em>.
            </li>
            <li>
              Movers (climbers / fallers) compare the current snapshot against the previous
              month&apos;s archived snapshot in <code>rankings-previous.json</code>.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 md:p-5">
          <h2 className="font-mono text-lg font-bold text-white mb-2">Cross-source caveats</h2>
          <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1.5">
            <li>
              Country and US-state series come from different upstream pipelines (OWID/HadCRUT5
              versus NOAA statewide). Their absolute anomalies are not directly comparable to
              the kelvin, but trends are.
            </li>
            <li>
              UK regions use Met Office HadUK-Grid (1991–2020 native), so the league table
              re-baselines to 1961–1990 for cross-region comparison; UK detail pages still
              quote both figures.
            </li>
            <li>
              The Paris Agreement 1.5 °C / 2 °C tracker is intentionally global-only.
              Pre-industrial (1850–1900) regional baselines are not robust because most regions
              lack reliable instrumental coverage that far back.
            </li>
            <li>
              Subnational series outside the US (Canadian provinces, Australian states, etc.)
              are not published by NOAA. They are deferred to a Phase 2 build that will pull
              from each national meteorological service (ECCC, BoM, DWD, JMA, …).
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
