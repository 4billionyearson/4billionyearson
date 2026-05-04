import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Database, Calendar, CalendarRange, Trophy, AlertTriangle, Scale } from 'lucide-react';
import BaselineExplainer from '../_components/BaselineExplainer';
import { StaticFAQPanel, FaqJsonLd } from '@/app/_components/seo/StaticFAQPanel';
import { METHODOLOGY_FAQ } from './methodology-faq';
import DataSourceTimeline, {
  MonthlyReleaseTimeline,
  AnnualReleaseTimeline,
  type MonthlyReleaseRow,
  type AnnualReleaseRow,
} from './DataSourceTimeline';

const PAGE_URL = 'https://4billionyearson.org/climate/methodology';

export const metadata: Metadata = {
  title: 'Climate Data Methodology - Sources, Baselines & Timeline | 4 Billion Years On',
  description:
    'How 4 Billion Years On builds its climate dataset: full source inventory, native and comparison baselines, the two-baseline model, and a timeline of when each source\'s data starts.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Climate Data Methodology - Sources, Baselines & Timeline',
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

// ─── Publication timing ─────────────────────────────────────────────────────
// Day-of-month each upstream source publishes the previous month's data,
// followed by our snapshot rebuild that aggregates them all. Day windows
// reflect typical observed lag in production.

const MONTHLY_RELEASES: MonthlyReleaseRow[] = [
  { source: 'NSIDC Sea Ice Index v4', release: '3rd–5th', startDay: 3, endDay: 5, variable: 'Arctic / Antarctic monthly extent', family: 'ice' },
  { source: 'Met Office HadUK-Grid Regional', release: '3rd–7th', startDay: 3, endDay: 7, variable: 'UK regional Tmean / Tmax / Tmin / rainfall / sunshine / frost', family: 'temp' },
  { source: 'NOAA CPC Oceanic Niño Index', release: '5th', startDay: 5, endDay: 6, variable: 'ENSO state (3-month running SST anomaly)', family: 'enso' },
  { source: 'NOAA GML Mauna Loa CO₂', release: '5th', startDay: 5, endDay: 6, variable: 'Atmospheric CO₂ monthly mean', family: 'co2' },
  { source: 'NOAA GML Global CH₄ / N₂O', release: '5th', startDay: 5, endDay: 7, variable: 'Atmospheric CH₄ and N₂O monthly mean', family: 'ghg' },
  { source: 'NOAA NCEI Climate at a Glance', release: '6th–10th', startDay: 6, endDay: 10, variable: 'Global / hemispheric / continental / statewide / climate-region temperature & precipitation', family: 'temp' },
  { source: 'OWID country temperature (HadCRUT5-derived)', release: '12th–18th', startDay: 12, endDay: 18, variable: 'Country-level temperature anomaly', family: 'temp' },
  { source: '4BYO snapshot rebuild', release: '12th–14th', startDay: 12, endDay: 14, variable: 'Aggregates all sources above into the public JSON snapshots', family: 'snapshot' },
];

// Annual datasets — month each is typically published, covering the previous calendar year.
const ANNUAL_RELEASES: AnnualReleaseRow[] = [
  { source: 'World Bank CCKP / CRU TS country precipitation', release: 'May–Sep', startMonth: 5, endMonth: 9, variable: 'Annual country precipitation back to 1901', family: 'precip' },
  { source: 'Ember / EIA country electricity mix', release: 'Mar–May', startMonth: 3, endMonth: 5, variable: 'Annual country electricity generation by fuel', family: 'temp' },
  { source: 'IEA World Energy Outlook & Statistics', release: 'Jun–Aug', startMonth: 6, endMonth: 8, variable: 'Annual energy demand, supply and emissions', family: 'temp' },
  { source: 'Our World in Data CO₂ emissions', release: 'Nov–Dec', startMonth: 11, endMonth: 12, variable: 'Country and global annual CO₂ emissions (Global Carbon Budget)', family: 'temp' },
  { source: 'NOAA NCEI Annual State of the Climate', release: 'Jan', startMonth: 1, endMonth: 1, variable: 'Annual global / continental / national rankings & analysis', family: 'temp' },
  { source: 'IPCC / WMO Assessment / State of Climate', release: 'Mar–May', startMonth: 3, endMonth: 5, variable: 'WMO State of the Global Climate report', family: 'temp' },
  { source: '4BYO annual rebuild', release: 'Q1', startMonth: 1, endMonth: 3, variable: 'Refresh annual aggregates and update editorial copy', family: 'snapshot' },
];

export default function MethodologyPage() {
  return (
    <main className="container mx-auto px-3 md:px-4 pt-2 pb-8 md:pt-4 md:pb-10 font-sans text-gray-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSONLD) }}
      />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Hero */}
        <div
          className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden"
          style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
        >
          <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
            <h1 className="text-2xl md:text-4xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
              Climate Data Methodology
            </h1>
          </div>
          <div className="bg-gray-950/90 backdrop-blur-md px-4 py-4 md:px-6 md:py-5">
            <p className="text-sm md:text-base text-gray-300 leading-relaxed">
              How this site builds its climate dataset, which baselines apply where, when each
              upstream source&apos;s record begins, and when fresh data lands each month and year.
            </p>
          </div>
        </div>

        {/* Baseline explainer (already styled) */}
        <BaselineExplainer />

        {/* Two-baseline model */}
        <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
            <Scale className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
            <span className="min-w-0 flex-1">The Two-Baseline Model</span>
          </h2>
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

        {/* Data source timeline (full record start years) */}
        <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
            <CalendarRange className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
            <span className="min-w-0 flex-1">Data Source Timeline (Record Start)</span>
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Each bar shows the year the upstream record begins through to the latest available
            month. Bars are colour-coded by data family. The vertical guideline marks the start
            of the 1961–1990 comparison window.
          </p>
          <DataSourceTimeline sources={SOURCES} />
        </section>

        {/* Monthly publication timeline */}
        <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
            <Calendar className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
            <span className="min-w-0 flex-1">When Monthly Data Lands</span>
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Each bar shows the calendar day of the month the upstream source publishes the
            previous month&apos;s data, and when 4BYO runs its snapshot rebuild. The snapshot is
            timed to fall <em>after</em> the slowest source has refreshed so every page is
            current as of the same reference month.
          </p>
          <MonthlyReleaseTimeline rows={MONTHLY_RELEASES} />
        </section>

        {/* Annual publication timeline */}
        <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
            <CalendarRange className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
            <span className="min-w-0 flex-1">When Annual Data Lands</span>
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Datasets that publish only once a year — country precipitation, electricity mix,
            CO₂ emissions, IEA energy outlook and the WMO/NOAA annual State-of-the-Climate
            reports. Bars show the typical month of release; data covers the previous calendar
            year.
          </p>
          <AnnualReleaseTimeline rows={ANNUAL_RELEASES} />
        </section>

        {/* Source inventory table */}
        <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
            <Database className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
            <span className="min-w-0 flex-1">Source Inventory</span>
          </h2>
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
                        className="text-teal-300 hover:text-teal-200 hover:underline transition-colors"
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

        {/* Rankings methodology */}
        <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
            <Trophy className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
            <span className="min-w-0 flex-1">How Rankings Are Computed</span>
          </h2>
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
              month&apos;s archived snapshot in <code className="text-[#E8C97A]">rankings-previous.json</code>.
            </li>
          </ul>
        </section>

        {/* Caveats */}
        <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
            <span className="min-w-0 flex-1">Cross-Source Caveats</span>
          </h2>
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

        {/* Footer / further reading */}
        <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
            <BookOpen className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
            <span className="min-w-0 flex-1">Further Reading</span>
          </h2>
          <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1.5">
            <li>
              <Link href="/climate/rankings" className="text-teal-300 hover:text-teal-200 hover:underline transition-colors">Climate rankings &amp; league table</Link> — every region we track, sortable by 1m / 3m / 12m anomaly.
            </li>
            <li>
              <Link href="/climate/global" className="text-teal-300 hover:text-teal-200 hover:underline transition-colors">Global climate update</Link> — Paris tracker, continental bars, ENSO state, GHG, sea ice.
            </li>
            <li>
              <Link href="/climate" className="text-teal-300 hover:text-teal-200 hover:underline transition-colors">Climate updates</Link> — country, US state and UK region detail pages.
            </li>
            <li>
              <Link href="/climate-explained" className="text-teal-300 hover:text-teal-200 hover:underline transition-colors">Climate, explained</Link> — plain-English guide to the science behind the data.
            </li>
          </ul>
        </section>

        {/* Frequently Asked Questions */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-[#D0A65E]/30 flex-1" />
          <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg [&>svg]:shrink-0">
            <BookOpen className="h-5 w-5" />
            <span>FAQs</span>
          </h2>
          <div className="h-px bg-[#D0A65E]/30 flex-1" />
        </div>
        <StaticFAQPanel headingId="methodology-faq-heading" qa={METHODOLOGY_FAQ} />
        <FaqJsonLd qa={METHODOLOGY_FAQ} />
      </div>
    </main>
  );
}
