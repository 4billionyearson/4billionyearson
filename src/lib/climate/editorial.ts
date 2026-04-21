// Editorial overlay & curation helpers for climate profiles.
//
// The site covers every location defined in `locations.ts`, but a
// hand-picked subset (see `EDITORS_PICKS`) gets richer copy and is
// promoted in the "Start here" strip on /climate.

/**
 * Slugs selected by the editors as good starting points for readers.
 * These are regions frequently cited in climate coverage — flagship
 * emitters, vulnerable geographies, and jurisdictions with notable
 * policy positions.
 *
 * Order here is the order they appear in the UI.
 */
export const EDITORS_PICKS: string[] = [
  // Planet first
  'global',
  // Countries — global emitters, debate shapers & vulnerable nations
  'usa',
  'china',
  'india',
  'brazil',
  'germany',
  'australia',
  'uk',
  'russia',
  'japan',
  'canada',
  // US states — extreme-weather hotspots
  'california',
  'texas',
  'florida',
  'us-alaska',
  // Anchors of the UK regional coverage
  'england',
  'scotland',
];

/**
 * Regions that should never appear in generated stubs because curated
 * entries already cover them (by slug) in CURATED_CLIMATE_REGIONS.
 */
export const CURATED_SLUGS = new Set<string>([
  'global',
  'uk',
  'usa',
  'india',
  'china',
  'germany',
  'ireland',
  'australia',
  'florida',
  'california',
  'texas',
  'england',
  'wales',
  'scotland',
  'northern-ireland',
  'england-and-wales',
  'england-north',
  'england-south',
  'scotland-east',
  'scotland-north',
  'scotland-west',
  'england-east-and-north-east',
  'england-nw-and-north-wales',
  'midlands',
  'east-anglia',
  'england-sw-and-south-wales',
  'england-se-central-south',
]);

/**
 * Location IDs in ALL_LOCATIONS that map to a curated slug. Used when
 * building stubs so we don't duplicate a curated region.
 */
export const CURATED_LOCATION_IDS = new Set<string>([
  'c-gbr',   // uk
  'c-usa',   // usa
  'c-ind',   // india
  'c-chn',   // china
  'c-deu',   // germany
  'c-irl',   // ireland
  'c-aus',   // australia
  'us-fl',   // florida
  'us-ca',   // california
  'us-tx',   // texas
  'uk-eng',  // england
  'uk-wal',  // wales
  'uk-sco',  // scotland
  'uk-ni',   // northern-ireland
  'uk-ew',   // england-and-wales
  'uk-en',   // england-north
  'uk-es',   // england-south
  'uk-se',   // scotland-east
  'uk-sn',   // scotland-north
  'uk-sw',   // scotland-west
  'uk-ene',  // england-east-and-north-east
  'uk-nww',  // england-nw-and-north-wales
  'uk-mid',  // midlands
  'uk-ea',   // east-anglia
  'uk-sws',  // england-sw-and-south-wales
  'uk-sec',  // england-se-central-south
  'uk-uk',   // covered by uk (country)
]);

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate the canonical slug for a location. Curated slugs (stable
 * SEO URLs) take precedence; otherwise we derive from the name.
 *
 * US states get a `us-` prefix for the generated slug to avoid
 * collisions with country names (e.g. Georgia).
 */
export function locationIdToSlug(
  locationId: string,
  name: string,
  type: 'country' | 'us-state' | 'uk-region',
): string {
  const curatedMap: Record<string, string> = {
    'c-gbr': 'uk',
    'c-usa': 'usa',
    'c-ind': 'india',
    'c-chn': 'china',
    'c-deu': 'germany',
    'c-irl': 'ireland',
    'c-aus': 'australia',
    'us-fl': 'florida',
    'us-ca': 'california',
    'us-tx': 'texas',
    'uk-eng': 'england',
    'uk-wal': 'wales',
    'uk-sco': 'scotland',
    'uk-ni': 'northern-ireland',
    'uk-ew': 'england-and-wales',
    'uk-en': 'england-north',
    'uk-es': 'england-south',
    'uk-se': 'scotland-east',
    'uk-sn': 'scotland-north',
    'uk-sw': 'scotland-west',
    'uk-ene': 'england-east-and-north-east',
    'uk-nww': 'england-nw-and-north-wales',
    'uk-mid': 'midlands',
    'uk-ea': 'east-anglia',
    'uk-sws': 'england-sw-and-south-wales',
    'uk-sec': 'england-se-central-south',
  };
  if (curatedMap[locationId]) return curatedMap[locationId];
  if (type === 'us-state') return `us-${nameToSlug(name)}`;
  return nameToSlug(name);
}

/**
 * Default tagline/description text used for auto-generated stub
 * entries (i.e. regions without hand-crafted editorial copy).
 */
export function buildStubCopy(name: string, type: 'country' | 'us-state' | 'uk-region') {
  if (type === 'country') {
    return {
      tagline: `Temperature, rainfall and emissions data for ${name}`,
      description: `${name} climate profile with temperature trends, rainfall data where available, and CO₂ emissions tracking. Updated monthly.`,
      keywords: [
        `${name} climate data`,
        `${name} temperature trends`,
        `${name} emissions`,
        `${name} climate change`,
      ],
    };
  }
  if (type === 'us-state') {
    return {
      tagline: `${name} climate data from NOAA Climate at a Glance`,
      description: `${name} climate profile with NOAA temperature and precipitation data, baselines and monthly anomalies. Updated monthly.`,
      keywords: [
        `${name} climate data`,
        `${name} temperature`,
        `${name} precipitation`,
        `NOAA ${name}`,
      ],
    };
  }
  return {
    tagline: `${name} climate data from the Met Office regional series`,
    description: `${name} climate profile with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.`,
    keywords: [
      `${name} climate data`,
      `${name} temperature`,
      `${name} rainfall`,
    ],
  };
}

// ─── Groupings used by the regions browser filters ──────────────────────────

export type Continent = 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';

/** Country ISO alpha-3 → continent. Covers every country in locations.ts. */
export const CONTINENT_BY_ISO: Record<string, Continent> = {
  // Europe
  GBR: 'Europe', FRA: 'Europe', DEU: 'Europe', ITA: 'Europe', ESP: 'Europe',
  POL: 'Europe', NLD: 'Europe', BEL: 'Europe', SWE: 'Europe', NOR: 'Europe',
  DNK: 'Europe', FIN: 'Europe', IRL: 'Europe', PRT: 'Europe', GRC: 'Europe',
  AUT: 'Europe', CHE: 'Europe', UKR: 'Europe', ROU: 'Europe', HUN: 'Europe',
  CZE: 'Europe', CYP: 'Europe', ISL: 'Europe',
  // Americas
  USA: 'Americas', CAN: 'Americas', MEX: 'Americas', BRA: 'Americas',
  ARG: 'Americas', CHL: 'Americas', COL: 'Americas', PER: 'Americas',
  BOL: 'Americas', CRI: 'Americas', GUY: 'Americas', NIC: 'Americas',
  SUR: 'Americas', JAM: 'Americas',
  // Asia
  JPN: 'Asia', KOR: 'Asia', PRK: 'Asia', IND: 'Asia', CHN: 'Asia',
  IDN: 'Asia', MYS: 'Asia', PHL: 'Asia', THA: 'Asia', VNM: 'Asia',
  PAK: 'Asia', BGD: 'Asia', LKA: 'Asia', MMR: 'Asia', IRN: 'Asia',
  IRQ: 'Asia', ISR: 'Asia', LBN: 'Asia', PSE: 'Asia', SAU: 'Asia',
  ARE: 'Asia', SYR: 'Asia', TUR: 'Asia', SGP: 'Asia',
  // Africa
  EGY: 'Africa', NGA: 'Africa', KEN: 'Africa', ETH: 'Africa', GHA: 'Africa',
  UGA: 'Africa', TZA: 'Africa', MAR: 'Africa', DZA: 'Africa', ZAF: 'Africa',
  MWI: 'Africa', SOM: 'Africa', COG: 'Africa', COD: 'Africa', SSD: 'Africa',
  // Oceania
  AUS: 'Oceania', NZL: 'Oceania',
};

export type USRegion = 'Northeast' | 'Midwest' | 'South' | 'West';

/** US Census Bureau regional groupings, keyed by location ID (us-xx). */
export const US_REGION_BY_ID: Record<string, USRegion> = {
  // Northeast
  'us-ct': 'Northeast', 'us-me': 'Northeast', 'us-ma': 'Northeast',
  'us-nh': 'Northeast', 'us-ri': 'Northeast', 'us-vt': 'Northeast',
  'us-nj': 'Northeast', 'us-ny': 'Northeast', 'us-pa': 'Northeast',
  // Midwest
  'us-il': 'Midwest', 'us-in': 'Midwest', 'us-mi': 'Midwest',
  'us-oh': 'Midwest', 'us-wi': 'Midwest', 'us-ia': 'Midwest',
  'us-ks': 'Midwest', 'us-mn': 'Midwest', 'us-mo': 'Midwest',
  'us-ne': 'Midwest', 'us-nd': 'Midwest', 'us-sd': 'Midwest',
  // South
  'us-de': 'South', 'us-fl': 'South', 'us-ga': 'South',
  'us-md': 'South', 'us-nc': 'South', 'us-sc': 'South',
  'us-va': 'South', 'us-wv': 'South', 'us-al': 'South',
  'us-ky': 'South', 'us-ms': 'South', 'us-tn': 'South',
  'us-ar': 'South', 'us-la': 'South', 'us-ok': 'South',
  'us-tx': 'South',
  // West
  'us-az': 'West', 'us-co': 'West', 'us-id': 'West',
  'us-mt': 'West', 'us-nv': 'West', 'us-nm': 'West',
  'us-ut': 'West', 'us-wy': 'West', 'us-ak': 'West',
  'us-ca': 'West', 'us-hi': 'West', 'us-or': 'West',
  'us-wa': 'West',
};

/**
 * Reverse lookup: apiCode (for countries this is the owid ISO code; for
 * US states this is the us-xx id) to continent / us-region.
 */
export function continentForCountryApiCode(apiCode: string): Continent | null {
  return CONTINENT_BY_ISO[apiCode] ?? null;
}

export function usRegionForStateApiCode(apiCode: string): USRegion | null {
  return US_REGION_BY_ID[apiCode] ?? null;
}
