import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

export const RANKINGS_FAQ: FAQItem[] = [
  {
    q: 'How are the climate rankings calculated?',
    aText:
      'Each region is scored by its temperature anomaly versus the 1961–1990 baseline for the same ' +
      'calendar period. The 1-month figure uses the most recent complete month; the 3-month figure uses ' +
      'a trailing 3-month mean; the 12-month figure uses a trailing 12-month mean. Higher positive ' +
      'anomalies indicate the region was warmer than its 1961–1990 average.',
  },
  {
    q: 'Why is the 1961–1990 baseline used?',
    aText:
      'The 1961–1990 baseline is widely used by the IPCC and national meteorological agencies for ' +
      'cross-region comparisons. NOAA datasets (which natively use 1901–2000) are re-baselined to ' +
      '1961–1990 so that countries, US states and UK regions can be compared on equal terms. The ' +
      'source-native figure is shown alongside for verification.',
  },
  {
    q: 'Which regions are included in the rankings?',
    aText:
      'Every country, US state, UK home nation, UK region, continent and US climate region for which we ' +
      'have a complete monthly time series. That is roughly 250 ranked entities each month.',
  },
  {
    q: 'How often do the rankings update?',
    aText:
      'Rankings refresh every 24 hours (a Vercel Cron job runs at 03:00 UTC) and pull in any new monthly ' +
      'data released by NOAA, the Met Office, Berkeley Earth and OWID since the previous run.',
  },
  {
    q: 'Where can I see the full methodology?',
    aText:
      'See the methodology page at /climate/methodology for the complete two-baseline model, source ' +
      'timeline and known caveats.',
  },
];
