import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only — never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const PLANETARY_BOUNDARIES_FAQ: FAQItem[] = [
  {
    q: 'What are the planetary boundaries?',
    aText:
      'The planetary boundaries framework, first published by Johan Rockström and colleagues in 2009 ' +
      'and updated by the Stockholm Resilience Centre and the Potsdam Institute for Climate Impact ' +
      'Research, identifies nine processes that regulate the stability and resilience of the Earth ' +
      'system: climate change, biosphere integrity, biogeochemical flows (nitrogen and phosphorus), ' +
      'land system change, freshwater change, ocean acidification, atmospheric aerosol loading, ' +
      'stratospheric ozone depletion and novel entities (e.g. plastics, synthetic chemicals).',
  },
  {
    q: 'How is the status of each boundary judged?',
    aText:
      'Each boundary has a "safe operating space" defined by one or more measurable indicators. The ' +
      'Stockholm Resilience Centre and the Potsdam Institute for Climate Impact Research jointly ' +
      'publish an annual Planetary Health Check that classifies every boundary as safe, increasing ' +
      'risk or high risk. The current status of each boundary is shown in the live panels above.',
  },
  {
    q: 'Is crossing a planetary boundary the same as a tipping point?',
    aText:
      'No. A planetary boundary marks the edge of the safe operating space — beyond it, the risk of ' +
      'destabilising the Earth system rises. Tipping points are specific thresholds where a system ' +
      'undergoes abrupt, often irreversible change (for example, ice-sheet collapse or Amazon ' +
      'dieback). Crossing a boundary makes triggering tipping points more likely but does not in ' +
      'itself constitute one.',
  },
  {
    q: 'Where does the data on this page come from?',
    aText:
      'Live indicators (CO₂, methane, N₂O, Arctic sea ice, ocean heat content) come from NOAA, NSIDC ' +
      'and Copernicus. Boundary status assessments are from the Stockholm Resilience Centre and the ' +
      'Potsdam Institute for Climate Impact Research (Sakschewski et al., Planetary Health Check).',
  },
  {
    q: 'How often is this page updated?',
    aText:
      'Live indicator feeds refresh on the same monthly cadence as the rest of the site. The ' +
      'boundary status assessments refresh once a year when the Planetary Health Check is published, ' +
      'typically in autumn.',
  },
];
