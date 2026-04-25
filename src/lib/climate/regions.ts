// Climate Profile region definitions
// Each region maps to an existing API route for data

import { ALL_LOCATIONS, countryFlag } from './locations';
import {
  CURATED_LOCATION_IDS,
  buildStubCopy,
  locationIdToSlug,
  COUNTRY_TOP_CITIES,
  US_STATE_TOP_CITIES,
} from './editorial';

export type RegionType = 'country' | 'us-state' | 'uk-region' | 'special';

export interface ClimateRegion {
  slug: string;
  name: string;
  type: RegionType;
  apiCode: string;
  tagline: string;
  description: string;
  emoji: string;
  dataSources: string[];
  keywords: string[];
  coveragePlaces?: string[];
  /** true when the region uses auto-generated copy (not hand-curated). */
  isStub?: boolean;
}

const SITE_URL = 'https://4billionyearson.org';

function stripTrailingPeriod(value: string): string {
  return value.replace(/\.$/, '');
}

export function getClimateUpdateDateLabel(date = new Date()): string {
  const thresholdDate = new Date(date);
  if (thresholdDate.getDate() < 21) {
    thresholdDate.setMonth(thresholdDate.getMonth() - 1);
  }

  return thresholdDate.toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function getClimatePageUrl(region: ClimateRegion): string {
  return `${SITE_URL}/climate/${region.slug}`;
}

export function getClimateCoverageText(region: ClimateRegion): string | null {
  if (!region.coveragePlaces?.length) return null;
  if (region.coveragePlaces.length === 1) return region.coveragePlaces[0];
  if (region.coveragePlaces.length === 2) return `${region.coveragePlaces[0]} and ${region.coveragePlaces[1]}`;
  return `${region.coveragePlaces.slice(0, -1).join(', ')}, and ${region.coveragePlaces[region.coveragePlaces.length - 1]}`;
}

export function getClimateMetadataTitle(region: ClimateRegion, updateLabel = getClimateUpdateDateLabel()): string {
  const topicLabel = region.type === 'uk-region'
    ? 'Temperature, Rainfall, Sunshine & Frost'
    : region.type === 'us-state'
      ? 'Temperature & Precipitation'
      : region.type === 'special'
        ? 'Global Temperature, Paris 1.5°C Tracker & Seasonal Shifts'
        : 'Temperature, Rainfall, Seasonal Shifts & Emissions';

  return `${region.name} Climate Update, ${updateLabel} | ${topicLabel}`;
}

function featureSuffixForRegion(region: ClimateRegion): string {
  switch (region.type) {
    case 'special':
      return 'Covers land-and-ocean anomalies vs the 1961–1990 baseline, Paris 1.5°C and 2.0°C progress (10-year mean), ENSO state, atmospheric CO₂/methane/N₂O, sea-ice extent, continental comparison, seasonal timing shifts, and global emissions & energy outlook.';
    case 'uk-region':
      return 'Covers Met Office temperature, rainfall, rain-days, sunshine and air-frost series vs the 1961–1990 baseline, plus spring/autumn shift analysis.';
    case 'us-state':
      return 'Covers NOAA temperature and precipitation vs the 1961–1990 baseline, monthly rank-in-record, seasonal shifts, and state-level emissions and electricity generation mix where available.';
    case 'country':
    default:
      return 'Covers country-scale temperature, rainfall (CRU TS), warm/wet-season shifts, CO₂ emissions (Our World in Data) and electricity generation mix — each vs the 1961–1990 baseline and ranked in record.';
  }
}

export function getClimateMetadataDescription(region: ClimateRegion, updateLabel = getClimateUpdateDateLabel()): string {
  const baseDescription = stripTrailingPeriod(region.description.replace(/\s*Updated monthly\.?$/i, ''));
  const suffix = featureSuffixForRegion(region);
  return `${baseDescription}. ${suffix} Latest monthly climate update: ${updateLabel}.`;
}

export const CURATED_CLIMATE_REGIONS: ClimateRegion[] = [
  {
    slug: 'global',
    name: 'Global',
    type: 'special',
    apiCode: 'global',
    tagline: 'The whole-planet temperature record — how the world is warming',
    description: 'Global climate update with NOAA land-and-ocean temperature anomaly, ERA5 land surface temperature, Paris Agreement 1.5°C and 2.0°C progress (10-year mean), ENSO state, atmospheric CO₂, methane and N₂O, Arctic and Antarctic sea ice, continental temperature comparison, seasonal timing shifts and global emissions and electricity mix. Updated monthly.',
    emoji: '🌍',
    dataSources: ['noaa-global', 'owid-temp'],
    keywords: [
      'global temperature anomaly',
      'global warming data',
      'world climate update',
      '1.5 degree threshold',
      'Paris Agreement tracker',
      'global land ocean temperature',
      'NOAA global temperature',
      'ENSO state',
      'atmospheric CO2 methane N2O',
      'sea ice extent',
      'shifting seasons',
      'global emissions energy mix',
    ],
  },
  {
    slug: 'uk',
    name: 'United Kingdom',
    type: 'country',
    apiCode: 'GBR',
    tagline: 'Temperature, rainfall, sunshine & frost data since 1884',
    description: 'UK climate profile covering England, Scotland, Wales and Northern Ireland with Met Office temperature, rainfall, sunshine and frost data since 1884. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['owid-temp', 'met-office', 'owid-emissions'],
    keywords: ['UK climate data', 'UK temperature trends', 'Met Office data', 'UK rainfall', 'UK net zero'],
    coveragePlaces: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  },
  {
    slug: 'usa',
    name: 'United States',
    type: 'country',
    apiCode: 'USA',
    tagline: 'The world\'s second-largest emitter and energy transition leader',
    description: 'United States climate profile with NOAA temperature data, CO₂ emissions history, and energy transition tracking. Updated monthly.',
    emoji: '🇺🇸',
    dataSources: ['owid-temp', 'noaa-national', 'owid-emissions'],
    keywords: ['US climate data', 'US temperature trends', 'NOAA data', 'US emissions', 'US energy transition'],
    coveragePlaces: ['California', 'Texas', 'Florida', 'New York', 'Alaska'],
  },
  {
    slug: 'india',
    name: 'India',
    type: 'country',
    apiCode: 'IND',
    tagline: 'Extreme heat, monsoon shifts and the fastest-growing energy market',
    description: 'India climate profile with temperature anomalies, extreme heat trends, and emissions data. Updated monthly.',
    emoji: '🇮🇳',
    dataSources: ['owid-temp', 'owid-emissions'],
    keywords: ['India climate data', 'India heatwave', 'India monsoon', 'India emissions', 'India renewable energy'],
    coveragePlaces: ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'],
  },
  {
    slug: 'china',
    name: 'China',
    type: 'country',
    apiCode: 'CHN',
    tagline: 'The largest emitter and largest renewables builder',
    description: 'China climate profile with temperature trends, CO₂ emissions trajectory, and renewable energy growth. Updated monthly.',
    emoji: '🇨🇳',
    dataSources: ['owid-temp', 'owid-emissions'],
    keywords: ['China climate data', 'China emissions', 'China renewable energy', 'China coal', 'China solar'],
    coveragePlaces: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu'],
  },
  {
    slug: 'germany',
    name: 'Germany',
    type: 'country',
    apiCode: 'DEU',
    tagline: 'The Energiewende benchmark for industrial decarbonisation',
    description: 'Germany climate profile with temperature trends, emissions data, and Energiewende progress tracking. Updated monthly.',
    emoji: '🇩🇪',
    dataSources: ['owid-temp', 'owid-emissions'],
    keywords: ['Germany climate data', 'Energiewende', 'Germany emissions', 'Germany renewable energy'],
    coveragePlaces: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
  },
  {
    slug: 'ireland',
    name: 'Ireland',
    type: 'country',
    apiCode: 'IRL',
    tagline: 'Atlantic storms, shifting rainfall and rising temperatures across the island',
    description: 'Ireland climate profile with temperature trends, rainfall changes, and emissions data. Updated monthly.',
    emoji: '🇮🇪',
    dataSources: ['owid-temp', 'owid-emissions'],
    keywords: ['Ireland climate data', 'Ireland temperature trends', 'Ireland rainfall', 'Ireland emissions', 'Dublin climate'],
    coveragePlaces: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford'],
  },
  {
    slug: 'australia',
    name: 'Australia',
    type: 'country',
    apiCode: 'AUS',
    tagline: 'Bushfires, reef bleaching and record temperatures',
    description: 'Australia climate profile with temperature anomalies, extreme heat records, and emissions tracking. Updated monthly.',
    emoji: '🇦🇺',
    dataSources: ['owid-temp', 'owid-emissions'],
    keywords: ['Australia climate data', 'Australia bushfires', 'Great Barrier Reef', 'Australia heatwave', 'Australia emissions'],
    coveragePlaces: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  },
  {
    slug: 'florida',
    name: 'Florida',
    type: 'us-state',
    apiCode: 'us-fl',
    tagline: 'Sea-level rise, hurricanes and the insurance crisis',
    description: 'Florida climate profile with NOAA temperature and precipitation data, hurricane trends, and sea-level rise impacts. Updated monthly.',
    emoji: '🌴',
    dataSources: ['noaa-state'],
    keywords: ['Florida climate data', 'Florida hurricanes', 'Florida sea level rise', 'Florida temperature', 'Florida insurance'],
    coveragePlaces: ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Fort Lauderdale'],
  },
  {
    slug: 'california',
    name: 'California',
    type: 'us-state',
    apiCode: 'us-ca',
    tagline: 'Solar leader, drought cycles and wildfire seasons',
    description: 'California climate profile with NOAA temperature data, drought monitoring, and wildfire season tracking. Updated monthly.',
    emoji: '☀️',
    dataSources: ['noaa-state'],
    keywords: ['California climate data', 'California drought', 'California wildfire', 'California solar', 'California temperature'],
    coveragePlaces: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose'],
  },
  {
    slug: 'texas',
    name: 'Texas',
    type: 'us-state',
    apiCode: 'us-tx',
    tagline: 'Wind energy giant, grid stress and extreme heat',
    description: 'Texas climate profile with NOAA temperature data, wind energy production, and extreme heat tracking. Updated monthly.',
    emoji: '🤠',
    dataSources: ['noaa-state'],
    keywords: ['Texas climate data', 'Texas wind energy', 'Texas grid', 'Texas heatwave', 'Texas temperature'],
    coveragePlaces: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'El Paso'],
  },
  {
    slug: 'england',
    name: 'England',
    type: 'uk-region',
    apiCode: 'uk-eng',
    tagline: 'National England climate data from the Met Office regional series',
    description: 'England climate profile covering London, Birmingham, Manchester, Leeds, Bristol and Newcastle with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    dataSources: ['met-office'],
    keywords: ['England climate data', 'England temperature', 'England rainfall', 'England sunshine', 'Met Office England'],
    coveragePlaces: ['London', 'Birmingham', 'Manchester', 'Leeds', 'Bristol', 'Newcastle'],
  },
  {
    slug: 'wales',
    name: 'Wales',
    type: 'uk-region',
    apiCode: 'uk-wal',
    tagline: 'Welsh climate data spanning the south coast, valleys and west coast',
    description: 'Wales climate profile covering Cardiff, Swansea, Newport, Wrexham, Aberystwyth and Bangor with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    dataSources: ['met-office'],
    keywords: ['Wales climate data', 'Wales temperature', 'Wales rainfall', 'Wales sunshine', 'Met Office Wales'],
    coveragePlaces: ['Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Aberystwyth', 'Bangor'],
  },
  {
    slug: 'scotland',
    name: 'Scotland',
    type: 'uk-region',
    apiCode: 'uk-sco',
    tagline: 'Wind energy leader with distinct climate targets',
    description: 'Scotland climate profile covering Edinburgh, Glasgow, Aberdeen, Dundee and Inverness with Met Office temperature, rainfall, sunshine and frost data since 1884. Updated monthly.',
    emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    dataSources: ['met-office'],
    keywords: ['Scotland climate data', 'Scotland temperature', 'Scotland rainfall', 'Scotland wind energy', 'Scottish weather'],
    coveragePlaces: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness'],
  },
  {
    slug: 'northern-ireland',
    name: 'Northern Ireland',
    type: 'uk-region',
    apiCode: 'uk-ni',
    tagline: 'Northern Ireland climate data from Belfast to the north-west',
    description: 'Northern Ireland climate profile covering Belfast, Derry, Lisburn, Newry, Bangor and Armagh with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['Northern Ireland climate data', 'Northern Ireland temperature', 'Northern Ireland rainfall', 'Belfast weather', 'Met Office Northern Ireland'],
    coveragePlaces: ['Belfast', 'Derry', 'Lisburn', 'Newry', 'Bangor', 'Armagh'],
  },
  {
    slug: 'england-and-wales',
    name: 'England and Wales',
    type: 'uk-region',
    apiCode: 'uk-ew',
    tagline: 'Combined England and Wales climate data across major cities',
    description: 'England and Wales climate profile covering London, Birmingham, Cardiff, Manchester, Bristol and Leeds with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['England and Wales climate data', 'England and Wales temperature', 'England and Wales rainfall', 'Met Office regional climate data'],
    coveragePlaces: ['London', 'Birmingham', 'Cardiff', 'Manchester', 'Bristol', 'Leeds'],
  },
  {
    slug: 'england-north',
    name: 'England North',
    type: 'uk-region',
    apiCode: 'uk-en',
    tagline: 'Northern England climate data from Tyneside to Cumbria',
    description: 'England North climate profile covering Newcastle, Sunderland, Durham, Middlesbrough, Carlisle and Darlington with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['England North climate data', 'North of England weather', 'Newcastle climate data', 'Northern England rainfall'],
    coveragePlaces: ['Newcastle', 'Sunderland', 'Durham', 'Middlesbrough', 'Carlisle', 'Darlington'],
  },
  {
    slug: 'england-south',
    name: 'England South',
    type: 'uk-region',
    apiCode: 'uk-es',
    tagline: 'Southern England climate data across the south coast and inland south',
    description: 'England South climate profile covering London, Southampton, Portsmouth, Brighton, Oxford and Reading with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['England South climate data', 'Southern England weather', 'South coast climate data', 'Met Office England South'],
    coveragePlaces: ['London', 'Southampton', 'Portsmouth', 'Brighton', 'Oxford', 'Reading'],
  },
  {
    slug: 'scotland-east',
    name: 'Scotland East',
    type: 'uk-region',
    apiCode: 'uk-se',
    tagline: 'Eastern Scotland climate data from Edinburgh to Aberdeen',
    description: 'Scotland East climate profile covering Edinburgh, Dundee, Aberdeen, Perth and St Andrews with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['Scotland East climate data', 'Edinburgh climate data', 'Aberdeen weather', 'Eastern Scotland rainfall'],
    coveragePlaces: ['Edinburgh', 'Dundee', 'Aberdeen', 'Perth', 'St Andrews'],
  },
  {
    slug: 'scotland-north',
    name: 'Scotland North',
    type: 'uk-region',
    apiCode: 'uk-sn',
    tagline: 'Northern Highlands and west coast climate data',
    description: 'Scotland North climate profile covering Inverness, Fort William, Thurso, Oban and Wick with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['Scotland North climate data', 'Highlands climate data', 'Inverness weather', 'Northern Scotland rainfall'],
    coveragePlaces: ['Inverness', 'Fort William', 'Thurso', 'Oban', 'Wick'],
  },
  {
    slug: 'scotland-west',
    name: 'Scotland West',
    type: 'uk-region',
    apiCode: 'uk-sw',
    tagline: 'Western Scotland climate data centred on Glasgow and the Clyde',
    description: 'Scotland West climate profile covering Glasgow, Stirling, Ayr, Greenock and Paisley with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['Scotland West climate data', 'Glasgow climate data', 'Western Scotland rainfall', 'Clyde weather'],
    coveragePlaces: ['Glasgow', 'Stirling', 'Ayr', 'Greenock', 'Paisley'],
  },
  {
    slug: 'england-east-and-north-east',
    name: 'England East & North East',
    type: 'uk-region',
    apiCode: 'uk-ene',
    tagline: 'Climate data for Yorkshire, Humber and the east of England',
    description: 'England East and North East climate profile covering Leeds, Sheffield, York, Hull, Lincoln and Norwich with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['England East and North East climate', 'Yorkshire climate data', 'Leeds weather', 'East of England climate'],
    coveragePlaces: ['Leeds', 'Sheffield', 'York', 'Hull', 'Lincoln', 'Norwich'],
  },
  {
    slug: 'england-nw-and-north-wales',
    name: 'England NW & North Wales',
    type: 'uk-region',
    apiCode: 'uk-nww',
    tagline: 'North-west England and north Wales climate data',
    description: 'England NW and North Wales climate profile covering Manchester, Liverpool, Preston, Blackpool, Chester, Bangor and Wrexham with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['North West England climate data', 'North Wales climate data', 'Manchester weather', 'Liverpool rainfall'],
    coveragePlaces: ['Manchester', 'Liverpool', 'Preston', 'Blackpool', 'Chester', 'Bangor', 'Wrexham'],
  },
  {
    slug: 'midlands',
    name: 'Midlands',
    type: 'uk-region',
    apiCode: 'uk-mid',
    tagline: 'Midlands climate data from the West Midlands to the East Midlands',
    description: 'Midlands climate profile covering Birmingham, Coventry, Nottingham, Derby, Leicester, Stoke-on-Trent and Wolverhampton with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['Midlands climate data', 'Birmingham weather', 'East Midlands climate', 'West Midlands rainfall'],
    coveragePlaces: ['Birmingham', 'Coventry', 'Nottingham', 'Derby', 'Leicester', 'Stoke-on-Trent', 'Wolverhampton'],
  },
  {
    slug: 'east-anglia',
    name: 'East Anglia',
    type: 'uk-region',
    apiCode: 'uk-ea',
    tagline: 'East Anglia climate data across East Anglia and nearby eastern cities',
    description: 'East Anglia climate profile covering Norwich, Cambridge, Ipswich, Peterborough, Colchester and Chelmsford with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['East Anglia climate data', 'Norwich weather', 'Cambridge climate', 'East of England rainfall'],
    coveragePlaces: ['Norwich', 'Cambridge', 'Ipswich', 'Peterborough', 'Colchester', 'Chelmsford'],
  },
  {
    slug: 'england-sw-and-south-wales',
    name: 'England SW & South Wales',
    type: 'uk-region',
    apiCode: 'uk-sws',
    tagline: 'South-west England and south Wales climate data',
    description: 'England SW and South Wales climate profile covering Bristol, Exeter, Plymouth, Bath, Cardiff, Swansea, Newport and Bournemouth with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['South West England climate data', 'South Wales climate data', 'Bristol weather', 'Cardiff rainfall'],
    coveragePlaces: ['Bristol', 'Exeter', 'Plymouth', 'Bath', 'Cardiff', 'Swansea', 'Newport', 'Bournemouth'],
  },
  {
    slug: 'england-se-central-south',
    name: 'England SE & Central South',
    type: 'uk-region',
    apiCode: 'uk-sec',
    tagline: 'London, the South East and Central Southern England climate data',
    description: 'England SE and Central South climate profile covering London, Oxford, Reading, Southampton, Portsmouth and Brighton with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['met-office'],
    keywords: ['England SE and Central South climate', 'London climate data', 'South East England weather', 'Central Southern England climate', 'Met Office regional climate data'],
    coveragePlaces: ['London', 'Oxford', 'Reading', 'Southampton', 'Portsmouth', 'Brighton'],
  },
];

// ─── Auto-generated stubs for every remaining location ────────────────────────
// We publish a profile for every country, US state and UK region defined in
// `locations.ts`. Entries above are the hand-crafted set; everything else
// gets a stub with generated copy so the page still exists and is indexed.

function buildStubs(): ClimateRegion[] {
  const stubs: ClimateRegion[] = [];
  for (const loc of ALL_LOCATIONS) {
    if (CURATED_LOCATION_IDS.has(loc.id)) continue;
    const slug = locationIdToSlug(loc.id, loc.name, loc.type);
    let apiCode = '';
    let emoji = '🌍';
    const dataSources: string[] = [];
    let cities: string[] | undefined;
    if (loc.type === 'country' && loc.owidCode) {
      apiCode = loc.owidCode;
      emoji = countryFlag(loc.owidCode);
      dataSources.push('owid-temp', 'owid-emissions');
      cities = COUNTRY_TOP_CITIES[loc.owidCode];
    } else if (loc.type === 'us-state') {
      apiCode = loc.id; // e.g. us-ny
      emoji = '🇺🇸';
      dataSources.push('noaa-state');
      cities = US_STATE_TOP_CITIES[loc.name];
    } else if (loc.type === 'uk-region') {
      apiCode = loc.id; // e.g. uk-eng
      emoji = '🏴';
      dataSources.push('met-office');
    }
    if (!apiCode) continue;
    const copy = buildStubCopy(loc.name, loc.type, cities);
    stubs.push({
      slug,
      name: loc.name,
      type: loc.type,
      apiCode,
      tagline: copy.tagline,
      description: copy.description,
      emoji,
      dataSources,
      keywords: copy.keywords,
      coveragePlaces: cities,
      isStub: true,
    });
  }
  return stubs;
}

export const STUB_CLIMATE_REGIONS: ClimateRegion[] = buildStubs();

/**
 * The full catalogue: curated entries first, auto-generated stubs
 * second. Anywhere you used to read `CLIMATE_REGIONS` still works.
 */
export const CLIMATE_REGIONS: ClimateRegion[] = [
  ...CURATED_CLIMATE_REGIONS,
  ...STUB_CLIMATE_REGIONS,
];

export function getRegionBySlug(slug: string): ClimateRegion | undefined {
  return CLIMATE_REGIONS.find((region) => region.slug === slug);
}

export function getAllSlugs(): string[] {
  return CLIMATE_REGIONS.map((region) => region.slug);
}

export function getProfileSlugForLocation(locationId: string, owidCode?: string): string | null {
  // UK "whole" pseudo-region from the dashboard maps to the UK country profile.
  if (locationId === 'uk-uk') return 'uk';
  const region = CLIMATE_REGIONS.find(
    (entry) => entry.apiCode === locationId || (owidCode && entry.apiCode === owidCode),
  );
  return region ? region.slug : null;
}
