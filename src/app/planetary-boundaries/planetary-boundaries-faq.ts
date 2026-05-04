import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

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
    q: 'How many planetary boundaries have been crossed?',
    aText:
      'According to the 2025 Planetary Health Check, six of the nine planetary boundaries are now ' +
      'transgressed: climate change, biosphere integrity, biogeochemical flows, land system change, ' +
      'freshwater change and novel entities. Ocean acidification crossed its boundary in 2024 making ' +
      'it the seventh. Only stratospheric ozone (recovering) and atmospheric aerosols remain within ' +
      'safe limits, while ocean acidification is now in the high-risk zone.',
  },
  {
    q: 'Which boundary is most at risk?',
    aText:
      'Biosphere integrity (genetic diversity / extinction rate) and biogeochemical flows (nitrogen ' +
      'cycle disruption from synthetic fertilisers) are the two boundaries that are most deeply in the ' +
      'high-risk zone. Both are far beyond their proposed safe limits and continue to deteriorate.',
  },
  {
    q: 'Is crossing a planetary boundary the same as a tipping point?',
    aText:
      'No. A planetary boundary marks the edge of the "safe operating space" — beyond it, the risk of ' +
      'destabilising the Earth system rises. Tipping points are specific thresholds where a system ' +
      'undergoes abrupt, often irreversible change (e.g. ice sheet collapse, Amazon dieback). Crossing ' +
      'a boundary makes triggering tipping points more likely but does not in itself constitute one.',
  },
  {
    q: 'Where does the data on this page come from?',
    aText:
      'Live indicators (CO₂, methane, N₂O, Arctic sea ice, ocean heat content) come from NOAA, NSIDC and ' +
      'Copernicus. Boundary status assessments are from the Stockholm Resilience Centre and the Potsdam ' +
      'Institute for Climate Impact Research (Sakschewski et al., Planetary Health Check 2025).',
  },
];
