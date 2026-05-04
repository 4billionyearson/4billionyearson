import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only — never include concrete numbers, percentages or
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
      'The headline figure compares the trailing 10-year mean to the 1850–1900 pre-industrial baseline, ' +
      'in line with the IPCC. Shorter-term anomalies are calculated against the 1991–2020 climate ' +
      'normal, the WMO standard. Both baselines are labelled directly on each chart.',
  },
  {
    q: 'Where does the global climate data come from?',
    aText:
      'Surface temperature: NOAA NCEI, NASA GISS and Hadley Centre HadCRUT5. Greenhouse gases: NOAA ' +
      'Global Monitoring Laboratory. Sea ice: NSIDC. Ocean heat content: Copernicus / NOAA. ENSO: ' +
      'NOAA Climate Prediction Center. Pre-industrial baselines and emission pathways: IPCC AR6.',
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
  },
];
