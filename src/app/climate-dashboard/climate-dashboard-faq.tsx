import Link from 'next/link';
import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only - never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const CLIMATE_DASHBOARD_FAQ: FAQItem[] = [
  {
    q: 'What can I do on the climate dashboard?',
    aText:
      'Search for any country, US state, UK nation or UK region (e.g. England, Scotland, the Midlands, ' +
      'the South East) to see how its temperature, rainfall and other climate indicators have changed. ' +
      'Each location shows a live data snapshot, monthly and annual time series, baseline anomalies ' +
      'and a link to its full climate profile page.',
  },
  {
    q: 'Which regions and countries are supported?',
    aText:
      'Every country with full climate records, every US state, every UK home nation (England, ' +
      'Scotland, Wales, Northern Ireland) and every English region (e.g. South East, North West, ' +
      'Midlands, London). Continental groups (Europe, Africa, Asia and so on) and US climate regions ' +
      'are also available.',
  },
  {
    q: 'How current is the data?',
    aText:
      'The dashboard reads from the same monthly cache as the rest of the site, which rebuilds within ' +
      'days of the underlying datasets being released. Country temperatures come from Copernicus ' +
      'C3S / ERA5 and Berkeley Earth, US state data from NOAA NCEI nClimDiv, UK data from the Met ' +
      'Office HadUK-Grid.',
  },
  {
    q: 'What baseline is used to measure change?',
    aText:
      'Anomalies are calculated against the 1991-2020 climate normal where available, in line with ' +
      'WMO standard practice. Long-term comparisons against pre-industrial baselines (1850-1900) are ' +
      'shown where the source data supports it (for example, global mean temperature).',
  },
  {
    q: 'Where can I see the full methodology?',
    aText:
      'The methodology page at /climate/methodology gives the complete data-source, baseline and ' +
      'refresh-cadence reference for every dataset used on the site.',
    a: (
      <>
        The{' '}
        <Link href="/climate/methodology" className="text-teal-300 hover:text-teal-200 transition-colors">
          Methodology &amp; Sources
        </Link>{' '}
        gives the complete data-source, baseline and refresh-cadence reference for every dataset
        used on the site.
      </>
    ),
  },
];
