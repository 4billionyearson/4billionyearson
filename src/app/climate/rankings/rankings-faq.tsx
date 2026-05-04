import Link from 'next/link';
import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only — never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const RANKINGS_FAQ: FAQItem[] = [
  {
    q: 'How are the climate rankings calculated?',
    aText:
      'Each region is scored by its temperature anomaly versus the 1961–1990 baseline for the same ' +
      'calendar period. The 1-month figure uses the most recent complete month; the 3-month figure ' +
      'uses a trailing 3-month mean; the 12-month figure uses a trailing 12-month mean. A higher ' +
      'positive anomaly means the region was warmer than its 1961–1990 average for that period.',
  },
  {
    q: 'Why is the 1961–1990 baseline used?',
    aText:
      'The 1961–1990 baseline is widely used by the IPCC and national meteorological agencies for ' +
      'cross-region comparisons. NOAA datasets that natively use 1901–2000 are re-baselined to ' +
      '1961–1990 so countries, US states and UK regions can be compared on equal terms; the ' +
      'source-native figure is shown alongside for verification.',
  },
  {
    q: 'Which regions are included in the rankings?',
    aText:
      'Every country, US state, UK home nation, UK region, continent and US climate region for which ' +
      'a complete monthly time series is available. The current count is shown on the rankings page.',
  },
  {
    q: 'How often do the rankings update?',
    aText:
      'Rankings refresh every 24 hours via a Vercel Cron job that runs at 03:00 UTC and pulls in any ' +
      'new monthly data released by NOAA, the Met Office, Berkeley Earth and OWID since the previous ' +
      'run.',
  },
  {
    q: 'Where can I see the full methodology?',
    aText:
      'The methodology page at /climate/methodology gives the complete two-baseline model, source ' +
      'timeline and known caveats.',
    a: (
      <>
        The{' '}
        <Link href="/climate/methodology" className="text-teal-300 hover:text-teal-200 transition-colors">
          Methodology &amp; Sources
        </Link>{' '}
        gives the complete two-baseline model, source timeline and known caveats.
      </>
    ),
  },
];
