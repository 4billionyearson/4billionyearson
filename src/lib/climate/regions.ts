// Climate Profile region definitions
// Each region maps to an existing API route for data

export type RegionType = 'country' | 'us-state' | 'uk-region' | 'special';

export interface ClimateRegion {
  slug: string;
  name: string;
  type: RegionType;
  // Code used to call the existing API routes
  apiCode: string;
  // Short tagline for the index page card
  tagline: string;
  // SEO description
  description: string;
  // Emoji or icon hint
  emoji: string;
  // Data sources available for this region
  dataSources: string[];
  // SEO keywords
  keywords: string[];
}

export const CLIMATE_REGIONS: ClimateRegion[] = [
  // ─── Countries ─────────────────────────────────────────────────────────────
  {
    slug: 'uk',
    name: 'United Kingdom',
    type: 'country',
    apiCode: 'GBR',
    tagline: 'Temperature, rainfall, sunshine & frost data since 1884',
    description: 'UK climate profile with Met Office regional data, temperature trends, rainfall anomalies, and emissions tracking. Updated monthly.',
    emoji: '🇬🇧',
    dataSources: ['owid-temp', 'met-office', 'owid-emissions'],
    keywords: ['UK climate data', 'UK temperature trends', 'Met Office data', 'UK rainfall', 'UK net zero'],
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

  // ─── US States ─────────────────────────────────────────────────────────────
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

  // ─── UK Regions ────────────────────────────────────────────────────────────
  {
    slug: 'scotland',
    name: 'Scotland',
    type: 'uk-region',
    apiCode: 'uk-sco',
    tagline: 'Wind energy leader with distinct climate targets',
    description: 'Scotland climate profile with Met Office temperature, rainfall, sunshine, and frost data since 1884. Updated monthly.',
    emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    dataSources: ['met-office'],
    keywords: ['Scotland climate data', 'Scotland temperature', 'Scotland rainfall', 'Scotland wind energy', 'Scottish weather'],
  },
  {
    slug: 'london',
    name: 'London & South East',
    type: 'uk-region',
    apiCode: 'uk-sec',
    tagline: 'Urban heat island, air quality and flood risk',
    description: 'London and South East England climate profile with Met Office temperature, rainfall, and sunshine data. Updated monthly.',
    emoji: '🏙️',
    dataSources: ['met-office'],
    keywords: ['London climate data', 'London temperature', 'London heatwave', 'South East England weather', 'London air quality'],
  },
];

// Lookup helpers
export function getRegionBySlug(slug: string): ClimateRegion | undefined {
  return CLIMATE_REGIONS.find(r => r.slug === slug);
}

export function getAllSlugs(): string[] {
  return CLIMATE_REGIONS.map(r => r.slug);
}

/** Map a location ID (e.g. 'us-fl', 'c-gbr', 'uk-sco') or OWID code (e.g. 'GBR') to a profile slug, or null if no profile exists */
export function getProfileSlugForLocation(locationId: string, owidCode?: string): string | null {
  const region = CLIMATE_REGIONS.find(r =>
    r.apiCode === locationId ||
    (owidCode && r.apiCode === owidCode)
  );
  return region ? region.slug : null;
}
