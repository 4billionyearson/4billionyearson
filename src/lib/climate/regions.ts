// Climate Profile region definitions
// Each region maps to an existing API route for data

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
      : 'Temperature, Rainfall & Emissions';

  return `${region.name} Climate Update, ${updateLabel} | ${topicLabel}`;
}

export function getClimateMetadataDescription(region: ClimateRegion, updateLabel = getClimateUpdateDateLabel()): string {
  const baseDescription = stripTrailingPeriod(region.description.replace(/\s*Updated monthly\.?$/i, ''));
  return `${baseDescription}. Latest monthly climate update: ${updateLabel}.`;
}

export const CLIMATE_REGIONS: ClimateRegion[] = [
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
  },
  {
    slug: 'scotland',
    name: 'Scotland',
    type: 'uk-region',
    apiCode: 'uk-sco',
    tagline: 'Wind energy leader with distinct climate targets',
    description: 'Scotland climate profile covering Edinburgh, Glasgow, Aberdeen, Dundee and Inverness with Met Office temperature, rainfall, sunshine and frost data since 1884. Updated monthly.',
    emoji: '🏴',
    dataSources: ['met-office'],
    keywords: ['Scotland climate data', 'Scotland temperature', 'Scotland rainfall', 'Scotland wind energy', 'Scottish weather'],
    coveragePlaces: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness'],
  },
  {
    slug: 'england-se-central-south',
    name: 'England SE & Central South',
    type: 'uk-region',
    apiCode: 'uk-sec',
    tagline: 'London, the South East and Central Southern England climate data',
    description: 'England SE and Central South climate profile covering London, Oxford, Reading, Southampton, Portsmouth and Brighton with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.',
    emoji: '🏙️',
    dataSources: ['met-office'],
    keywords: ['England SE and Central South climate', 'London climate data', 'South East England weather', 'Central Southern England climate', 'Met Office regional climate data'],
    coveragePlaces: ['London', 'Oxford', 'Reading', 'Southampton', 'Portsmouth', 'Brighton'],
  },
];

export function getRegionBySlug(slug: string): ClimateRegion | undefined {
  return CLIMATE_REGIONS.find((region) => region.slug === slug);
}

export function getAllSlugs(): string[] {
  return CLIMATE_REGIONS.map((region) => region.slug);
}

export function getProfileSlugForLocation(locationId: string, owidCode?: string): string | null {
  const region = CLIMATE_REGIONS.find(
    (entry) => entry.apiCode === locationId || (owidCode && entry.apiCode === owidCode),
  );
  return region ? region.slug : null;
}
