import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

export const CLIMATE_HUB_FAQ: FAQItem[] = [
  {
    q: 'What is on the climate updates page?',
    aText:
      'A monthly climate update for every continent, climate region, country, US state and UK region we ' +
      'track — over 250 locations in total. Each location has its own profile page with temperature, ' +
      'rainfall, emissions and (where applicable) sea level and ice indicators, all benchmarked against ' +
      'a long-term baseline.',
  },
  {
    q: 'Which regions are covered?',
    aText:
      'All 195+ countries with full climate records, every US state, every UK home nation (England, ' +
      'Scotland, Wales, Northern Ireland) and every English region (South East, North West, Midlands, ' +
      'London and the rest). Continental groups (Europe, Africa, Asia, North America, South America, ' +
      'Oceania) and the nine US climate regions are also covered.',
  },
  {
    q: 'Where does the data come from?',
    aText:
      'Country-level temperatures from Berkeley Earth and Copernicus C3S / ERA5; global mean temperature ' +
      'from NOAA, NASA GISS and Hadley Centre HadCRUT5; US state data from NOAA NCEI nClimDiv; UK data ' +
      'from the Met Office HadUK-Grid; emissions from the Global Carbon Project via Our World in Data; ' +
      'sea ice from NSIDC.',
  },
  {
    q: 'How often is it updated?',
    aText:
      'Most underlying datasets refresh on a monthly cadence, and the climate hub refreshes at the same ' +
      'cadence (typically the 5th–10th of each month). Live indicators (CO₂, methane, sea ice, ENSO ' +
      'state) update more frequently from their source APIs.',
  },
  {
    q: 'Where can I see the rankings or methodology?',
    aText:
      'The full league table is at /climate/rankings (sortable 1m / 3m / 12m anomaly for every region we ' +
      'track). The methodology page at /climate/methodology details every data source, baseline and ' +
      'refresh cadence used on the site.',
  },
];
