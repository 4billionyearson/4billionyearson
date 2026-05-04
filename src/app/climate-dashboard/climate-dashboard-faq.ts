import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

export const CLIMATE_DASHBOARD_FAQ: FAQItem[] = [
  {
    q: 'What can I do on the climate dashboard?',
    aText:
      'Search for any country, US state, UK nation or UK region (e.g. England, Scotland, the Midlands, ' +
      'the South East) to see how its temperature, rainfall, sea level and other climate indicators have ' +
      'changed since pre-industrial times. Each location shows a live data snapshot, monthly and annual ' +
      'time series, baseline anomalies and links to its full climate profile page.',
  },
  {
    q: 'Which regions and countries are supported?',
    aText:
      'All 195+ countries with full climate records, every US state, every UK home nation (England, ' +
      'Scotland, Wales, Northern Ireland) and every English region (e.g. South East, North West, ' +
      'Midlands, London). Continental groups (Europe, Africa, Asia, etc.) and US climate regions are also ' +
      'available.',
  },
  {
    q: 'How current is the data?',
    aText:
      'Most underlying datasets refresh monthly, with the dashboard cache rebuilt at the same cadence. ' +
      'Country temperatures come from Copernicus / Berkeley Earth, US state data from NOAA NCEI, and UK ' +
      'data from the Met Office HadUK-Grid.',
  },
  {
    q: 'What baseline is used to measure change?',
    aText:
      'Anomalies are calculated against the 1991–2020 climate normal where available, in line with WMO ' +
      'standard practice. Long-term comparisons against pre-industrial baselines (1850–1900) are shown ' +
      'where the source data supports it (e.g. global mean temperature).',
  },
  {
    q: 'Where can I see the full methodology?',
    aText:
      'See the methodology page at /climate/methodology for a full breakdown of data sources, baselines ' +
      'and refresh cadence for each dataset.',
  },
];
