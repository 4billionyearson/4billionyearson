import Link from 'next/link';
import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only — never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const CLIMATE_HUB_FAQ: FAQItem[] = [
  {
    q: 'What is on the climate updates page?',
    aText:
      'A monthly climate update for every continent, climate region, country, US state and UK region ' +
      'we track. Each location has its own profile page with temperature, rainfall, emissions and ' +
      '(where applicable) sea level and ice indicators, all benchmarked against a long-term baseline.',
  },
  {
    q: 'Which regions are covered?',
    aText:
      'Every country with full climate records, every US state, every UK home nation (England, ' +
      'Scotland, Wales, Northern Ireland) and every English region (South East, North West, Midlands, ' +
      'London and the rest). Continental groups (Europe, Africa, Asia, North America, South America, ' +
      'Oceania) and the US climate regions are also covered.',
  },
  {
    q: 'Where does the data come from?',
    aText:
      'Country-level temperatures: Berkeley Earth and Copernicus C3S / ERA5. Global mean temperature: ' +
      'NOAA, NASA GISS and Hadley Centre HadCRUT5. US state data: NOAA NCEI nClimDiv. UK data: Met ' +
      'Office HadUK-Grid. Emissions: Global Carbon Project via Our World in Data. Sea ice: NSIDC.',
  },
  {
    q: 'How often is it updated?',
    aText:
      'Most underlying datasets refresh on a monthly cadence, and the climate hub refreshes at the ' +
      'same cadence — typically within days of the previous month\'s figures being released. Live ' +
      'indicators (CO₂, methane, sea ice, ENSO state) update more frequently from their source APIs.',
  },
  {
    q: 'Where can I see the rankings or methodology?',
    aText:
      'The full league table is at /climate/rankings (sortable 1-month, 3-month and 12-month anomaly ' +
      'for every region we track). The methodology page at /climate/methodology details every data ' +
      'source, baseline and refresh cadence used on the site.',
    a: (
      <>
        The full league table is on the{' '}
        <Link href="/climate/rankings" className="text-teal-300 hover:text-teal-200 transition-colors">
          Climate Rankings
        </Link>{' '}
        (sortable 1-month, 3-month and 12-month anomaly for every region we track). The{' '}
        <Link href="/climate/methodology" className="text-teal-300 hover:text-teal-200 transition-colors">
          Methodology &amp; Sources
        </Link>{' '}
        details every data source, baseline and refresh cadence used on the site.
      </>
    ),
  },
];
