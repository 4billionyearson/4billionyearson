import Link from 'next/link';
import type { ClimateRegion } from '@/lib/climate/regions';
import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

/**
 * Build a 5-question Q&A set tailored to a climate region. Used by the
 * /climate/[slug] template (countries, US states, UK nations & regions,
 * continents and US climate regions).
 *
 * Plain-text answers (aText) drive the FAQPage JSON-LD; the optional `a`
 * field carries an enriched JSX answer with internal links for the
 * visible HTML.
 */
export function buildRegionFAQ(region: ClimateRegion): FAQItem[] {
  const name = region.name;
  const places = region.coveragePlaces?.length
    ? region.coveragePlaces.slice(0, 4).join(', ')
    : null;

  const dataSourceText = describeDataSources(region);
  const baselineText = '1961–1990';
  const updateLabel = 'every month, when the upstream temperature and rainfall data are refreshed.';

  const qa: FAQItem[] = [
    {
      q: `How is the climate in ${name} changing?`,
      aText:
        `${name} is warming in line with the rest of the world. The page above shows the latest monthly ` +
        `temperature anomaly versus the ${baselineText} baseline, the long-term annual trend, and the ` +
        `region's rank in the historical record. The trend rate is shown as °C per decade in the headline ` +
        `panel; you can also see the warmest and coolest years on file.`,
    },
    {
      q: `Where does the climate data for ${name} come from?`,
      aText: `Climate data for ${name} comes from ${dataSourceText} ${updateLabel}`,
    },
    {
      q: `What is the climate baseline used on this page?`,
      aText:
        `Anomalies on this page are calculated against the ${baselineText} climatological baseline, ` +
        `which is the standard reference period used by the Met Office, NOAA, IPCC and most national ` +
        `climate services. Some panels also show the source-native 1901–2000 (NOAA) or 1991–2020 (WMO) ` +
        `baselines for verification. Full methodology at /climate/methodology.`,
      a: (
        <>
          Anomalies on this page are calculated against the {baselineText} climatological baseline,
          which is the standard reference period used by the Met Office, NOAA, IPCC and most
          national climate services. Some panels also show the source-native 1901–2000 (NOAA) or
          1991–2020 (WMO) baselines for verification. See{' '}
          <Link href="/climate/methodology" className="text-teal-300 hover:text-teal-200 transition-colors">
            Methodology &amp; Sources
          </Link>{' '}
          for the full reference.
        </>
      ),
    },
    {
      q: `Which areas does the ${name} climate data cover?`,
      aText: places
        ? `The ${name} climate profile covers ${places} and surrounding areas. ${region.tagline}`
        : `${region.tagline} ${region.description.replace(/\s*Updated monthly\.?$/i, '')}.`,
    },
    {
      q: `How often is the ${name} climate update refreshed?`,
      aText:
        `The ${name} climate update is refreshed monthly, typically a few days after the previous ` +
        `month closes and the upstream provider (Met Office HadUK-Grid, NOAA Climate at a Glance, ` +
        `Copernicus ERA5 or the Global Carbon Project) publishes its update. See ` +
        `/climate/rankings for cross-region comparisons.`,
      a: (
        <>
          The {name} climate update is refreshed monthly, typically a few days after the previous
          month closes and the upstream provider (Met Office HadUK-Grid, NOAA Climate at a Glance,
          Copernicus ERA5 or the Global Carbon Project) publishes its update. See the{' '}
          <Link href="/climate/rankings" className="text-teal-300 hover:text-teal-200 transition-colors">
            Climate Rankings
          </Link>{' '}
          for cross-region comparisons.
        </>
      ),
    },
  ];

  return qa;
}

function describeDataSources(region: ClimateRegion): string {
  const sources = region.dataSources;
  const parts: string[] = [];
  if (sources.includes('met-office')) {
    parts.push('the UK Met Office HadUK-Grid (temperature, rainfall, sunshine, air frost)');
  }
  if (sources.includes('noaa-state') || sources.includes('noaa-national')) {
    parts.push('NOAA Climate at a Glance (temperature and precipitation)');
  }
  if (sources.includes('owid-temp')) {
    parts.push('Our World in Data, sourcing Copernicus ERA5 and HadCRUT5 (national temperature anomaly)');
  }
  if (sources.includes('owid-emissions')) {
    parts.push('the Global Carbon Project via Our World in Data (CO₂ emissions)');
  }
  if (sources.includes('arctic-ice')) {
    parts.push('global-warming.org (Arctic / Antarctic sea-ice extent)');
  }
  if (parts.length === 0) {
    return 'authoritative climate datasets including national meteorological services and peer-reviewed reanalyses, refreshed';
  }
  if (parts.length === 1) return parts[0] + ', refreshed';
  if (parts.length === 2) return parts.join(' and ') + ', refreshed';
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] + ', refreshed';
}
