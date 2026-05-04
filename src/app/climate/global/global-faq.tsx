import Link from 'next/link';
import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only - never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const GLOBAL_CLIMATE_FAQ: FAQItem[] = [
  {
    q: 'What does this global climate update show?',
    aText:
      'A monthly snapshot of the global climate: surface temperature anomalies relative to ' +
      'pre-industrial levels, ocean and land warming, sea ice extent, atmospheric CO₂, methane and ' +
      'nitrous oxide concentrations, ENSO phase and the latest position against the 1.5°C and 2°C ' +
      'Paris Agreement targets. The current month\'s numbers are shown in the live data panels above.',
  },
  {
    q: 'Which baselines are used to measure global warming?',
    aText:
      'The headline figure compares the trailing 10-year mean to the 1850-1900 pre-industrial baseline, ' +
      'in line with the IPCC. Shorter-term anomalies are calculated against the 1991-2020 climate ' +
      'normal, the WMO standard. Both baselines are labelled directly on each chart.',
  },
  {
    q: 'Where does the global climate data come from?',
    aText:
      'Surface temperature: NOAA NCEI, NASA GISS and Hadley Centre HadCRUT5. Greenhouse gases: NOAA ' +
      'Global Monitoring Laboratory. Sea ice: NSIDC. Ocean heat content: Copernicus / NOAA. ENSO: ' +
      'NOAA Climate Prediction Center. Pre-industrial baselines and emission pathways: IPCC AR6.',
    a: (
      <>
        Surface temperature: NOAA NCEI, NASA GISS and Hadley Centre HadCRUT5. Greenhouse gases: NOAA
        Global Monitoring Laboratory. Sea ice: NSIDC. Ocean heat content: Copernicus / NOAA. ENSO:
        NOAA Climate Prediction Center. Pre-industrial baselines and emission pathways: IPCC AR6.
        Full source list at{' '}
        <Link href="/climate/methodology" className="text-teal-300 hover:text-teal-200 transition-colors">
          Methodology &amp; Sources
        </Link>.
      </>
    ),
  },
  {
    q: 'Has Earth already passed the 1.5°C warming limit?',
    aText:
      'The 1.5°C target in the Paris Agreement refers to a long-term mean - usually a 10- to 20-year ' +
      'average versus the 1850-1900 pre-industrial baseline. Individual years can briefly exceed ' +
      '1.5°C without the long-term threshold being crossed; 2024 was the first calendar year above ' +
      'that line. The Paris Tracker on this page shows the trailing 10-year mean (the official ' +
      'WMO/IPCC interpretation) and the 12-month running mean side-by-side, so you can read both ' +
      'figures at a glance and see how close the long-term mean now sits to 1.5°C.',
  },
  {
    q: 'When will Earth reach 2°C of warming above pre-industrial levels?',
    aText:
      'There is no fixed calendar date - it depends on the global emissions pathway over the next ' +
      'two decades. IPCC AR6 projects the trailing 20-year mean reaches 2°C in the early-to-mid ' +
      '2040s under intermediate emissions (SSP2-4.5) and could be delayed to the 2050s under deep ' +
      'mitigation (SSP1-2.6). The chart on this page extrapolates the current observed trend to ' +
      'flag the year the trailing 10-year mean is on track to cross 2°C if the present rate ' +
      'continues - a useful early-warning indicator, not a forecast.',
  },
  {
    q: 'What is the pre-industrial baseline and why 1850-1900?',
    aText:
      '1850-1900 is the earliest 50-year window with broad, reliable instrumental coverage of ' +
      'global temperature. Earlier periods rely on sparser proxy records. The IPCC and WMO ' +
      'standardised on this window so every assessment uses the same starting point when reporting ' +
      'how much the planet has warmed. All Paris-Agreement-relevant warming figures on 4 Billion ' +
      'Years On are quoted against 1850-1900.',
  },
  {
    q: 'How much have CO₂, methane and nitrous oxide concentrations changed?',
    aText:
      'CO₂ has risen from a pre-industrial ~280 ppm to a current monthly value shown live in the ' +
      'greenhouse-gas panel above (NOAA Mauna Loa series). Methane and nitrous oxide are tracked ' +
      'in the same panel using NOAA Global Monitoring Laboratory marine boundary-layer averages. ' +
      'Each tile shows the current monthly mean, the year-on-year change and the long-run growth ' +
      'rate - we deliberately do not bake the live numbers into this FAQ so the answer never goes ' +
      'stale.',
  },
  {
    q: 'How often is this page updated?',
    aText:
      'The live data panels refresh on each page request from a monthly cache that rebuilds within ' +
      'days of the underlying datasets being released (typically the first half of each month). The ' +
      'AI-written narrative summary refreshes on the same monthly cadence.',
  },
  {
    q: 'Where can I see country, regional or city-level climate data?',
    aText:
      'See the climate hub at /climate for every country, US state and UK region we track, the ' +
      'rankings page at /climate/rankings for sortable cross-region anomalies, and the methodology ' +
      'page at /climate/methodology for the complete data-source and baseline reference.',
    a: (
      <>
        See the{' '}
        <Link href="/climate" className="text-teal-300 hover:text-teal-200 transition-colors">
          Climate Hub
        </Link>{' '}
        for every country, US state and UK region we track, the{' '}
        <Link href="/climate/rankings" className="text-teal-300 hover:text-teal-200 transition-colors">
          Climate Rankings
        </Link>{' '}
        for sortable cross-region anomalies, and the{' '}
        <Link href="/climate/methodology" className="text-teal-300 hover:text-teal-200 transition-colors">
          Methodology &amp; Sources
        </Link>{' '}
        for the complete data-source and baseline reference.
      </>
    ),
  },
];
