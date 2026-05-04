import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

export const METHODOLOGY_FAQ: FAQItem[] = [
  {
    q: 'Where does the temperature data on this site come from?',
    aText:
      'Country-level temperatures come from Berkeley Earth and the Copernicus Climate Change Service ' +
      '(C3S / ERA5). Global mean surface temperature comes from NOAA NCEI, NASA GISS and Hadley Centre ' +
      '(HadCRUT5). US state temperatures come from NOAA NCEI nClimDiv. UK temperatures come from the ' +
      'Met Office HadUK-Grid dataset.',
  },
  {
    q: 'How is the climate baseline calculated?',
    aText:
      'Anomalies are calculated against the 1991–2020 climate normal where available, in line with WMO ' +
      'standard practice. Pre-industrial comparisons (1850–1900) are used for global mean temperature ' +
      'where the source data supports it. The exact baseline used is shown alongside each chart.',
  },
  {
    q: 'How often is the data updated?',
    aText:
      'Most underlying datasets refresh on a monthly cadence, and the site is rebuilt on the same ' +
      'cadence (around the 5th–10th of each month, once the previous month\'s figures are released). ' +
      'Live indicators (CO₂, methane, sea ice, ENSO state) refresh more frequently from their source APIs.',
  },
  {
    q: 'How are countries ranked?',
    aText:
      'The /climate/rankings page sorts every supported country, US state, UK nation and UK region by ' +
      'their 1-month, 3-month or 12-month temperature anomaly versus the 1991–2020 baseline. Tie-breaks ' +
      'use the longer time horizon.',
  },
  {
    q: 'Are the live data feeds reliable?',
    aText:
      'Yes — all live feeds come from official scientific sources (NOAA, NASA, Copernicus, Met Office, ' +
      'NSIDC, WMO, IPCC). When a feed is delayed or returns no data, charts fall back to the most ' +
      'recent cached value and the page surfaces a freshness indicator.',
  },
];
