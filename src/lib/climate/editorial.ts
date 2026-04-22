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
 * Top cities per country (ISO-3) — used to populate the "Top 5 Cities:"
 * coverage pill on auto-generated stub profiles, and to surface city
 * names in the page description/keywords for SEO and LLM search.
 */
export const COUNTRY_TOP_CITIES: Record<string, string[]> = {
  // Europe
  FRA: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice'],
  ITA: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo'],
  ESP: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza'],
  POL: ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań'],
  NLD: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  BEL: ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège'],
  SWE: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås'],
  NOR: ['Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen'],
  DNK: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg'],
  FIN: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu'],
  PRT: ['Lisbon', 'Porto', 'Braga', 'Coimbra', 'Funchal'],
  GRC: ['Athens', 'Thessaloniki', 'Patras', 'Piraeus', 'Larissa'],
  AUT: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck'],
  CHE: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne'],
  UKR: ['Kyiv', 'Kharkiv', 'Odesa', 'Dnipro', 'Lviv'],
  ROU: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța'],
  HUN: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs'],
  CZE: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec'],
  CYP: ['Nicosia', 'Limassol', 'Larnaca', 'Famagusta', 'Paphos'],
  ISL: ['Reykjavík', 'Kópavogur', 'Hafnarfjörður', 'Akureyri', 'Reykjanesbær'],
  // Americas
  CAN: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa'],
  MEX: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana'],
  BRA: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza'],
  ARG: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata'],
  CHL: ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta'],
  COL: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena'],
  PER: ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Cusco'],
  BOL: ['La Paz', 'Santa Cruz de la Sierra', 'Cochabamba', 'Sucre', 'El Alto'],
  CRI: ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Liberia'],
  GUY: ['Georgetown', 'Linden', 'New Amsterdam', 'Anna Regina', 'Bartica'],
  NIC: ['Managua', 'León', 'Masaya', 'Matagalpa', 'Chinandega'],
  SUR: ['Paramaribo', 'Lelydorp', 'Nieuw Nickerie', 'Moengo', 'Albina'],
  JAM: ['Kingston', 'Montego Bay', 'Spanish Town', 'Portmore', 'Mandeville'],
  // Asia
  JPN: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo'],
  KOR: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon'],
  PRK: ['Pyongyang', 'Hamhung', 'Chongjin', 'Nampo', 'Wonsan'],
  IDN: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang'],
  MYS: ['Kuala Lumpur', 'Johor Bahru', 'Ipoh', 'Kuching', 'George Town'],
  THA: ['Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket', 'Nonthaburi'],
  VNM: ['Hanoi', 'Ho Chi Minh City', 'Hai Phong', 'Da Nang', 'Can Tho'],
  PHL: ['Manila', 'Quezon City', 'Davao', 'Cebu', 'Caloocan'],
  SGP: ['Singapore', 'Jurong', 'Woodlands', 'Tampines', 'Bedok'],
  PAK: ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Rawalpindi'],
  BGD: ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet'],
  LKA: ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo'],
  MMR: ['Yangon', 'Mandalay', 'Naypyidaw', 'Mawlamyine', 'Bago'],
  // Middle East
  SAU: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'],
  ARE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman'],
  IRQ: ['Baghdad', 'Basra', 'Mosul', 'Erbil', 'Sulaymaniyah'],
  IRN: ['Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Shiraz'],
  ISR: ['Jerusalem', 'Tel Aviv', 'Haifa', 'Rishon LeZion', 'Petah Tikva'],
  PSE: ['Gaza', 'Hebron', 'Nablus', 'Ramallah', 'Bethlehem'],
  LBN: ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Zahlé'],
  SYR: ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Hama'],
  TUR: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'],
  // Africa
  EGY: ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said'],
  DZA: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida'],
  MAR: ['Casablanca', 'Rabat', 'Fes', 'Marrakesh', 'Tangier'],
  NGA: ['Lagos', 'Kano', 'Ibadan', 'Abuja', 'Port Harcourt'],
  KEN: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
  ETH: ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Adama', 'Gondar'],
  SOM: ['Mogadishu', 'Hargeisa', 'Bosaso', 'Kismayo', 'Baidoa'],
  SSD: ['Juba', 'Wau', 'Malakal', 'Yei', 'Aweil'],
  TZA: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Zanzibar City'],
  UGA: ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja'],
  GHA: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast'],
  COD: ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Goma'],
  COG: ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Owando'],
  MWI: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Karonga'],
  ZAF: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'],
  // Oceania
  NZL: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga'],
  // Russia
  RUS: ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan'],
};

/**
 * Top cities per US state — used to populate the "Top 5 Cities:" pill
 * and SEO metadata on auto-generated US-state stubs.
 */
export const US_STATE_TOP_CITIES: Record<string, string[]> = {
  'Alabama': ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa'],
  'Alaska': ['Anchorage', 'Fairbanks', 'Juneau', 'Wasilla', 'Sitka'],
  'Arizona': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale'],
  'Arkansas': ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro'],
  'Colorado': ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood'],
  'Connecticut': ['Bridgeport', 'New Haven', 'Stamford', 'Hartford', 'Waterbury'],
  'Delaware': ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna'],
  'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah'],
  'Hawaii': ['Honolulu', 'Hilo', 'Kailua', 'Pearl City', 'Waipahu'],
  'Idaho': ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello'],
  'Illinois': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville'],
  'Indiana': ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel'],
  'Iowa': ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City'],
  'Kansas': ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Olathe'],
  'Kentucky': ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington'],
  'Louisiana': ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles'],
  'Maine': ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn'],
  'Maryland': ['Baltimore', 'Columbia', 'Germantown', 'Silver Spring', 'Waldorf'],
  'Massachusetts': ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell'],
  'Michigan': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor'],
  'Minnesota': ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington'],
  'Mississippi': ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi'],
  'Missouri': ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence'],
  'Montana': ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte'],
  'Nebraska': ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney'],
  'Nevada': ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks'],
  'New Hampshire': ['Manchester', 'Nashua', 'Concord', 'Dover', 'Rochester'],
  'New Jersey': ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison'],
  'New Mexico': ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse'],
  'North Carolina': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem'],
  'North Dakota': ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo'],
  'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
  'Oklahoma': ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond'],
  'Oregon': ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro'],
  'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'],
  'Rhode Island': ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence'],
  'South Carolina': ['Charleston', 'Columbia', 'North Charleston', 'Mount Pleasant', 'Rock Hill'],
  'South Dakota': ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown'],
  'Tennessee': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville'],
  'Utah': ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem'],
  'Vermont': ['Burlington', 'Essex', 'South Burlington', 'Colchester', 'Rutland'],
  'Virginia': ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News'],
  'Washington': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue'],
  'West Virginia': ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling'],
  'Wisconsin': ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine'],
  'Wyoming': ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs'],
};

/**
 * Default tagline/description text used for auto-generated stub
 * entries (i.e. regions without hand-crafted editorial copy).
 *
 * `cities` — if provided — are woven into the description and keywords
 * so the page ranks for city-name searches and surfaces cleanly in
 * LLM-generated answers.
 */
export function buildStubCopy(
  name: string,
  type: 'country' | 'us-state' | 'uk-region',
  cities?: string[],
) {
  const cityList = cities && cities.length ? cities.slice(0, 5) : null;
  const cityPhrase = cityList ? ` covering ${cityList.join(', ')}` : '';
  const cityKeywords = cityList ? cityList.map((c) => `${c} climate`) : [];

  if (type === 'country') {
    return {
      tagline: `Temperature, rainfall and emissions data for ${name}`,
      description: `${name} climate profile${cityPhrase} with temperature trends, rainfall data where available, and CO₂ emissions tracking. Updated monthly.`,
      keywords: [
        `${name} climate data`,
        `${name} temperature trends`,
        `${name} emissions`,
        `${name} climate change`,
        ...cityKeywords,
      ],
    };
  }
  if (type === 'us-state') {
    return {
      tagline: `${name} climate data from NOAA Climate at a Glance`,
      description: `${name} climate profile${cityPhrase} with NOAA temperature and precipitation data, baselines and monthly anomalies. Updated monthly.`,
      keywords: [
        `${name} climate data`,
        `${name} temperature`,
        `${name} precipitation`,
        `NOAA ${name}`,
        ...cityKeywords,
      ],
    };
  }
  return {
    tagline: `${name} climate data from the Met Office regional series`,
    description: `${name} climate profile${cityPhrase} with Met Office temperature, rainfall, sunshine and frost data. Updated monthly.`,
    keywords: [
      `${name} climate data`,
      `${name} temperature`,
      `${name} rainfall`,
      ...cityKeywords,
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
