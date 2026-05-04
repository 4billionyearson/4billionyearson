import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

export const GLOBAL_CLIMATE_FAQ: FAQItem[] = [
  {
    q: 'How warm is the Earth right now compared to pre-industrial times?',
    aText:
      'The 10-year running mean global temperature is currently around 1.3 °C above the 1850–1900 ' +
      'pre-industrial baseline, the figure used to track the Paris Agreement targets. Single calendar ' +
      'years now regularly cross 1.5 °C above pre-industrial — 2024 was the first to do so for an entire ' +
      'year — but the long-term Paris benchmark is the 10- or 20-year average, not any single year.',
  },
  {
    q: 'Are we on track for the 1.5 °C and 2 °C Paris Agreement targets?',
    aText:
      'On the 10-year mean used by the IPCC and the Paris Agreement, the world is closing in on the ' +
      '1.5 °C threshold and is currently on track to cross it in the late 2020s or early 2030s. The 2 °C ' +
      'target is still avoidable but only with rapid, sustained reductions in greenhouse-gas emissions. ' +
      'Current policies place us on a trajectory closer to 2.5–2.8 °C of warming by 2100.',
  },
  {
    q: 'When will global warming pass 1.5 °C?',
    aText:
      'Single years have already crossed 1.5 °C — 2024 was the first calendar year fully above 1.5 °C, ' +
      'helped by a strong El Niño on top of the long-term warming trend. The Paris-relevant 20-year ' +
      'average is projected to cross 1.5 °C in the early 2030s on current emissions, and possibly ' +
      'earlier under continued high emissions.',
  },
  {
    q: 'What is the climate baseline used on this page?',
    aText:
      'Anomalies are shown against three baselines depending on the dataset: the 1850–1900 pre-industrial ' +
      'baseline used for Paris-Agreement targets and IPCC reporting; the 1961–1990 baseline used by the ' +
      'Met Office, NOAA Climate at a Glance and most national climate services; and the 1991–2020 ' +
      'baseline used by the WMO for current weather context. The page labels each panel with its ' +
      'baseline.',
  },
  {
    q: 'Where does the global climate data on this page come from?',
    aText:
      'Temperature data comes from NOAA Climate at a Glance (Global Land+Ocean) and the HadCRUT5 / ' +
      'Copernicus ERA5 reanalyses via Our World in Data. Greenhouse-gas concentrations come from the ' +
      'NOAA Global Monitoring Laboratory. Sea-ice extent comes from NSIDC. ENSO indicators come from ' +
      'NOAA Climate Prediction Center. CO₂ emissions come from the Global Carbon Project via Our World ' +
      'in Data, and the global electricity mix from Ember. The page is refreshed monthly when the ' +
      'upstream providers publish their updates.',
  },
  {
    q: 'How often is the global climate update refreshed?',
    aText:
      'The global climate update on this page is refreshed every month, typically a few days after the ' +
      'previous month closes and NOAA, the Met Office, NOAA GML, NSIDC and the Global Carbon Project ' +
      'have published their monthly updates.',
  },
];
