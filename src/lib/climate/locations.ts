// Static location data for climate dashboard
// Maps searchable names to data source identifiers

export interface LocationResult {
  id: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  // OWID entity ID for country-level temperature
  owidEntityId?: number;
  owidCode?: string;
  // NOAA state code (US only)
  noaaStateCode?: number;
  // Met Office region slug (UK only)
  metOfficeRegion?: string;
  // Parent country code for sub-national locations
  parentCountry?: string;
}

// NOAA US state codes (used in Climate at a Glance API)
export const US_STATES: LocationResult[] = [
  { id: 'us-al', name: 'Alabama', type: 'us-state', noaaStateCode: 1, parentCountry: 'USA' },
  { id: 'us-az', name: 'Arizona', type: 'us-state', noaaStateCode: 2, parentCountry: 'USA' },
  { id: 'us-ar', name: 'Arkansas', type: 'us-state', noaaStateCode: 3, parentCountry: 'USA' },
  { id: 'us-ca', name: 'California', type: 'us-state', noaaStateCode: 4, parentCountry: 'USA' },
  { id: 'us-co', name: 'Colorado', type: 'us-state', noaaStateCode: 5, parentCountry: 'USA' },
  { id: 'us-ct', name: 'Connecticut', type: 'us-state', noaaStateCode: 6, parentCountry: 'USA' },
  { id: 'us-de', name: 'Delaware', type: 'us-state', noaaStateCode: 7, parentCountry: 'USA' },
  { id: 'us-fl', name: 'Florida', type: 'us-state', noaaStateCode: 8, parentCountry: 'USA' },
  { id: 'us-ga', name: 'Georgia', type: 'us-state', noaaStateCode: 9, parentCountry: 'USA' },
  { id: 'us-id', name: 'Idaho', type: 'us-state', noaaStateCode: 10, parentCountry: 'USA' },
  { id: 'us-il', name: 'Illinois', type: 'us-state', noaaStateCode: 11, parentCountry: 'USA' },
  { id: 'us-in', name: 'Indiana', type: 'us-state', noaaStateCode: 12, parentCountry: 'USA' },
  { id: 'us-ia', name: 'Iowa', type: 'us-state', noaaStateCode: 13, parentCountry: 'USA' },
  { id: 'us-ks', name: 'Kansas', type: 'us-state', noaaStateCode: 14, parentCountry: 'USA' },
  { id: 'us-ky', name: 'Kentucky', type: 'us-state', noaaStateCode: 15, parentCountry: 'USA' },
  { id: 'us-la', name: 'Louisiana', type: 'us-state', noaaStateCode: 16, parentCountry: 'USA' },
  { id: 'us-me', name: 'Maine', type: 'us-state', noaaStateCode: 17, parentCountry: 'USA' },
  { id: 'us-md', name: 'Maryland', type: 'us-state', noaaStateCode: 18, parentCountry: 'USA' },
  { id: 'us-ma', name: 'Massachusetts', type: 'us-state', noaaStateCode: 19, parentCountry: 'USA' },
  { id: 'us-mi', name: 'Michigan', type: 'us-state', noaaStateCode: 20, parentCountry: 'USA' },
  { id: 'us-mn', name: 'Minnesota', type: 'us-state', noaaStateCode: 21, parentCountry: 'USA' },
  { id: 'us-ms', name: 'Mississippi', type: 'us-state', noaaStateCode: 22, parentCountry: 'USA' },
  { id: 'us-mo', name: 'Missouri', type: 'us-state', noaaStateCode: 23, parentCountry: 'USA' },
  { id: 'us-mt', name: 'Montana', type: 'us-state', noaaStateCode: 24, parentCountry: 'USA' },
  { id: 'us-ne', name: 'Nebraska', type: 'us-state', noaaStateCode: 25, parentCountry: 'USA' },
  { id: 'us-nv', name: 'Nevada', type: 'us-state', noaaStateCode: 26, parentCountry: 'USA' },
  { id: 'us-nh', name: 'New Hampshire', type: 'us-state', noaaStateCode: 27, parentCountry: 'USA' },
  { id: 'us-nj', name: 'New Jersey', type: 'us-state', noaaStateCode: 28, parentCountry: 'USA' },
  { id: 'us-nm', name: 'New Mexico', type: 'us-state', noaaStateCode: 29, parentCountry: 'USA' },
  { id: 'us-ny', name: 'New York', type: 'us-state', noaaStateCode: 30, parentCountry: 'USA' },
  { id: 'us-nc', name: 'North Carolina', type: 'us-state', noaaStateCode: 31, parentCountry: 'USA' },
  { id: 'us-nd', name: 'North Dakota', type: 'us-state', noaaStateCode: 32, parentCountry: 'USA' },
  { id: 'us-oh', name: 'Ohio', type: 'us-state', noaaStateCode: 33, parentCountry: 'USA' },
  { id: 'us-ok', name: 'Oklahoma', type: 'us-state', noaaStateCode: 34, parentCountry: 'USA' },
  { id: 'us-or', name: 'Oregon', type: 'us-state', noaaStateCode: 35, parentCountry: 'USA' },
  { id: 'us-pa', name: 'Pennsylvania', type: 'us-state', noaaStateCode: 36, parentCountry: 'USA' },
  { id: 'us-ri', name: 'Rhode Island', type: 'us-state', noaaStateCode: 37, parentCountry: 'USA' },
  { id: 'us-sc', name: 'South Carolina', type: 'us-state', noaaStateCode: 38, parentCountry: 'USA' },
  { id: 'us-sd', name: 'South Dakota', type: 'us-state', noaaStateCode: 39, parentCountry: 'USA' },
  { id: 'us-tn', name: 'Tennessee', type: 'us-state', noaaStateCode: 40, parentCountry: 'USA' },
  { id: 'us-tx', name: 'Texas', type: 'us-state', noaaStateCode: 41, parentCountry: 'USA' },
  { id: 'us-ut', name: 'Utah', type: 'us-state', noaaStateCode: 42, parentCountry: 'USA' },
  { id: 'us-vt', name: 'Vermont', type: 'us-state', noaaStateCode: 43, parentCountry: 'USA' },
  { id: 'us-va', name: 'Virginia', type: 'us-state', noaaStateCode: 44, parentCountry: 'USA' },
  { id: 'us-wa', name: 'Washington', type: 'us-state', noaaStateCode: 45, parentCountry: 'USA' },
  { id: 'us-wv', name: 'West Virginia', type: 'us-state', noaaStateCode: 46, parentCountry: 'USA' },
  { id: 'us-wi', name: 'Wisconsin', type: 'us-state', noaaStateCode: 47, parentCountry: 'USA' },
  { id: 'us-wy', name: 'Wyoming', type: 'us-state', noaaStateCode: 48, parentCountry: 'USA' },
  { id: 'us-ak', name: 'Alaska', type: 'us-state', noaaStateCode: 50, parentCountry: 'USA' },
  { id: 'us-hi', name: 'Hawaii', type: 'us-state', noaaStateCode: 51, parentCountry: 'USA' },
];

// Met Office UK regions
export const UK_REGIONS: LocationResult[] = [
  { id: 'uk-uk', name: 'United Kingdom', type: 'uk-region', metOfficeRegion: 'UK', parentCountry: 'GBR' },
  { id: 'uk-eng', name: 'England', type: 'uk-region', metOfficeRegion: 'England', parentCountry: 'GBR' },
  { id: 'uk-wal', name: 'Wales', type: 'uk-region', metOfficeRegion: 'Wales', parentCountry: 'GBR' },
  { id: 'uk-sco', name: 'Scotland', type: 'uk-region', metOfficeRegion: 'Scotland', parentCountry: 'GBR' },
  { id: 'uk-ni', name: 'Northern Ireland', type: 'uk-region', metOfficeRegion: 'Northern_Ireland', parentCountry: 'GBR' },
  { id: 'uk-ew', name: 'England and Wales', type: 'uk-region', metOfficeRegion: 'England_and_Wales', parentCountry: 'GBR' },
  { id: 'uk-en', name: 'England North', type: 'uk-region', metOfficeRegion: 'England_N', parentCountry: 'GBR' },
  { id: 'uk-es', name: 'England South', type: 'uk-region', metOfficeRegion: 'England_S', parentCountry: 'GBR' },
  { id: 'uk-se', name: 'Scotland East', type: 'uk-region', metOfficeRegion: 'Scotland_E', parentCountry: 'GBR' },
  { id: 'uk-sn', name: 'Scotland North', type: 'uk-region', metOfficeRegion: 'Scotland_N', parentCountry: 'GBR' },
  { id: 'uk-sw', name: 'Scotland West', type: 'uk-region', metOfficeRegion: 'Scotland_W', parentCountry: 'GBR' },
  { id: 'uk-ene', name: 'England East & North East', type: 'uk-region', metOfficeRegion: 'England_E_and_NE', parentCountry: 'GBR' },
  { id: 'uk-nww', name: 'England NW & North Wales', type: 'uk-region', metOfficeRegion: 'England_NW_and_N_Wales', parentCountry: 'GBR' },
  { id: 'uk-mid', name: 'Midlands', type: 'uk-region', metOfficeRegion: 'Midlands', parentCountry: 'GBR' },
  { id: 'uk-ea', name: 'East Anglia', type: 'uk-region', metOfficeRegion: 'East_Anglia', parentCountry: 'GBR' },
  { id: 'uk-sws', name: 'England SW & South Wales', type: 'uk-region', metOfficeRegion: 'England_SW_and_S_Wales', parentCountry: 'GBR' },
  { id: 'uk-sec', name: 'England SE & Central South', type: 'uk-region', metOfficeRegion: 'England_SE_and_Central_S', parentCountry: 'GBR' },
];

// City-to-region mapping for UK searches
export const UK_CITY_REGION_MAP: Record<string, string> = {
  'london': 'uk-sec', 'brighton': 'uk-sec', 'southampton': 'uk-sec', 'portsmouth': 'uk-sec',
  'oxford': 'uk-sec', 'reading': 'uk-sec', 'guildford': 'uk-sec', 'canterbury': 'uk-sec',
  'dover': 'uk-sec', 'crawley': 'uk-sec', 'maidstone': 'uk-sec', 'winchester': 'uk-sec',
  'manchester': 'uk-nww', 'liverpool': 'uk-nww', 'preston': 'uk-nww', 'blackpool': 'uk-nww',
  'chester': 'uk-nww', 'warrington': 'uk-nww', 'wigan': 'uk-nww', 'bolton': 'uk-nww',
  'birmingham': 'uk-mid', 'coventry': 'uk-mid', 'nottingham': 'uk-mid', 'derby': 'uk-mid',
  'leicester': 'uk-mid', 'stoke': 'uk-mid', 'wolverhampton': 'uk-mid', 'worcester': 'uk-mid',
  'norwich': 'uk-ea', 'cambridge': 'uk-ea', 'ipswich': 'uk-ea', 'peterborough': 'uk-ea',
  'colchester': 'uk-ea', 'chelmsford': 'uk-ea', 'luton': 'uk-ea',
  'bristol': 'uk-sws', 'exeter': 'uk-sws', 'plymouth': 'uk-sws', 'bath': 'uk-sws',
  'cardiff': 'uk-sws', 'swansea': 'uk-sws', 'newport': 'uk-sws', 'gloucester': 'uk-sws',
  'bournemouth': 'uk-sws', 'taunton': 'uk-sws', 'truro': 'uk-sws', 'swindon': 'uk-sws',
  'leeds': 'uk-ene', 'sheffield': 'uk-ene', 'york': 'uk-ene', 'hull': 'uk-ene',
  'newcastle': 'uk-en', 'sunderland': 'uk-en', 'durham': 'uk-en', 'middlesbrough': 'uk-en',
  'carlisle': 'uk-en', 'darlington': 'uk-en', 'lincoln': 'uk-ene',
  'edinburgh': 'uk-se', 'dundee': 'uk-se', 'aberdeen': 'uk-se', 'perth': 'uk-se',
  'glasgow': 'uk-sw', 'stirling': 'uk-sw', 'ayr': 'uk-sw', 'greenock': 'uk-sw',
  'inverness': 'uk-sn', 'fort william': 'uk-sn', 'thurso': 'uk-sn', 'oban': 'uk-sn',
  'belfast': 'uk-ni', 'derry': 'uk-ni', 'lisburn': 'uk-ni', 'newry': 'uk-ni',
  'bangor': 'uk-nww', 'wrexham': 'uk-nww', 'aberystwyth': 'uk-sws', 'llanelli': 'uk-sws',
};

// US city-to-state mapping for common cities
export const US_CITY_STATE_MAP: Record<string, string> = {
  'new york': 'us-ny', 'los angeles': 'us-ca', 'chicago': 'us-il', 'houston': 'us-tx',
  'phoenix': 'us-az', 'philadelphia': 'us-pa', 'san antonio': 'us-tx', 'san diego': 'us-ca',
  'dallas': 'us-tx', 'san jose': 'us-ca', 'austin': 'us-tx', 'jacksonville': 'us-fl',
  'san francisco': 'us-ca', 'columbus': 'us-oh', 'charlotte': 'us-nc', 'indianapolis': 'us-in',
  'seattle': 'us-wa', 'denver': 'us-co', 'boston': 'us-ma', 'nashville': 'us-tn',
  'detroit': 'us-mi', 'portland': 'us-or', 'las vegas': 'us-nv', 'miami': 'us-fl',
  'atlanta': 'us-ga', 'minneapolis': 'us-mn', 'tampa': 'us-fl', 'orlando': 'us-fl',
  'new orleans': 'us-la', 'cleveland': 'us-oh', 'pittsburgh': 'us-pa', 'st louis': 'us-mo',
  'baltimore': 'us-md', 'milwaukee': 'us-wi', 'sacramento': 'us-ca', 'kansas city': 'us-mo',
  'mesa': 'us-az', 'tucson': 'us-az', 'raleigh': 'us-nc', 'omaha': 'us-ne',
  'honolulu': 'us-hi', 'anchorage': 'us-ak', 'salt lake city': 'us-ut', 'boise': 'us-id',
  'washington': 'us-md', 'washington dc': 'us-md',
};

// Top 100 countries with OWID entity IDs (sourced from OWID API metadata)
export const COUNTRIES: LocationResult[] = [
  { id: 'c-gbr', name: 'United Kingdom', type: 'country', owidEntityId: 1, owidCode: 'GBR' },
  { id: 'c-fra', name: 'France', type: 'country', owidEntityId: 3, owidCode: 'FRA' },
  { id: 'c-deu', name: 'Germany', type: 'country', owidEntityId: 6, owidCode: 'DEU' },
  { id: 'c-usa', name: 'United States', type: 'country', owidEntityId: 13, owidCode: 'USA' },
  { id: 'c-jpn', name: 'Japan', type: 'country', owidEntityId: 14, owidCode: 'JPN' },
  { id: 'c-arg', name: 'Argentina', type: 'country', owidEntityId: 21, owidCode: 'ARG' },
  { id: 'c-aus', name: 'Australia', type: 'country', owidEntityId: 23, owidCode: 'AUS' },
  { id: 'c-bol', name: 'Bolivia', type: 'country', owidEntityId: 34, owidCode: 'BOL' },
  { id: 'c-bra', name: 'Brazil', type: 'country', owidEntityId: 37, owidCode: 'BRA' },
  { id: 'c-som', name: 'Somalia', type: 'country', owidEntityId: 82, owidCode: 'SOM' },
  { id: 'c-per', name: 'Peru', type: 'country', owidEntityId: 97, owidCode: 'PER' },
  { id: 'c-pak', name: 'Pakistan', type: 'country', owidEntityId: 101, owidCode: 'PAK' },
  { id: 'c-nga', name: 'Nigeria', type: 'country', owidEntityId: 103, owidCode: 'NGA' },
  { id: 'c-nic', name: 'Nicaragua', type: 'country', owidEntityId: 105, owidCode: 'NIC' },
  { id: 'c-mar', name: 'Morocco', type: 'country', owidEntityId: 110, owidCode: 'MAR' },
  { id: 'c-mys', name: 'Malaysia', type: 'country', owidEntityId: 116, owidCode: 'MYS' },
  { id: 'c-mwi', name: 'Malawi', type: 'country', owidEntityId: 117, owidCode: 'MWI' },
  { id: 'c-lbn', name: 'Lebanon', type: 'country', owidEntityId: 124, owidCode: 'LBN' },
  { id: 'c-kor', name: 'South Korea', type: 'country', owidEntityId: 127, owidCode: 'KOR' },
  { id: 'c-prk', name: 'North Korea', type: 'country', owidEntityId: 128, owidCode: 'PRK' },
  { id: 'c-ken', name: 'Kenya', type: 'country', owidEntityId: 129, owidCode: 'KEN' },
  { id: 'c-isr', name: 'Israel', type: 'country', owidEntityId: 133, owidCode: 'ISR' },
  { id: 'c-idn', name: 'Indonesia', type: 'country', owidEntityId: 136, owidCode: 'IDN' },
  { id: 'c-ind', name: 'India', type: 'country', owidEntityId: 137, owidCode: 'IND' },
  { id: 'c-pse', name: 'Palestine', type: 'country', owidEntityId: 140, owidCode: 'PSE' },
  { id: 'c-guy', name: 'Guyana', type: 'country', owidEntityId: 146, owidCode: 'GUY' },
  { id: 'c-eth', name: 'Ethiopia', type: 'country', owidEntityId: 158, owidCode: 'ETH' },
  { id: 'c-cyp', name: 'Cyprus', type: 'country', owidEntityId: 163, owidCode: 'CYP' },
  { id: 'c-cri', name: 'Costa Rica', type: 'country', owidEntityId: 166, owidCode: 'CRI' },
  { id: 'c-cog', name: 'Congo', type: 'country', owidEntityId: 168, owidCode: 'COG' },
  { id: 'c-chn', name: 'China', type: 'country', owidEntityId: 171, owidCode: 'CHN' },
  { id: 'c-chl', name: 'Chile', type: 'country', owidEntityId: 172, owidCode: 'CHL' },
  { id: 'c-sur', name: 'Suriname', type: 'country', owidEntityId: 234, owidCode: 'SUR' },
  { id: 'c-ssd', name: 'South Sudan', type: 'country', owidEntityId: 258, owidCode: 'SSD' },
  { id: 'c-wld', name: 'World (Global Average)', type: 'country', owidEntityId: 355, owidCode: 'OWID_WRL' },
  // Additional major countries - IDs will be resolved dynamically from OWID metadata
  { id: 'c-ita', name: 'Italy', type: 'country', owidEntityId: 8, owidCode: 'ITA' },
  { id: 'c-esp', name: 'Spain', type: 'country', owidEntityId: 9, owidCode: 'ESP' },
  { id: 'c-can', name: 'Canada', type: 'country', owidEntityId: 44, owidCode: 'CAN' },
  { id: 'c-mex', name: 'Mexico', type: 'country', owidEntityId: 113, owidCode: 'MEX' },
  { id: 'c-rus', name: 'Russia', type: 'country', owidEntityId: 138, owidCode: 'RUS' },
  { id: 'c-zaf', name: 'South Africa', type: 'country', owidEntityId: 172, owidCode: 'ZAF' },
  { id: 'c-egy', name: 'Egypt', type: 'country', owidEntityId: 65, owidCode: 'EGY' },
  { id: 'c-tur', name: 'Turkey', type: 'country', owidEntityId: 155, owidCode: 'TUR' },
  { id: 'c-tha', name: 'Thailand', type: 'country', owidEntityId: 144, owidCode: 'THA' },
  { id: 'c-vnm', name: 'Vietnam', type: 'country', owidEntityId: 84, owidCode: 'VNM' },
  { id: 'c-phl', name: 'Philippines', type: 'country', owidEntityId: 100, owidCode: 'PHL' },
  { id: 'c-col', name: 'Colombia', type: 'country', owidEntityId: 170, owidCode: 'COL' },
  { id: 'c-pol', name: 'Poland', type: 'country', owidEntityId: 11, owidCode: 'POL' },
  { id: 'c-nld', name: 'Netherlands', type: 'country', owidEntityId: 5, owidCode: 'NLD' },
  { id: 'c-bel', name: 'Belgium', type: 'country', owidEntityId: 4, owidCode: 'BEL' },
  { id: 'c-swe', name: 'Sweden', type: 'country', owidEntityId: 10, owidCode: 'SWE' },
  { id: 'c-nor', name: 'Norway', type: 'country', owidEntityId: 142, owidCode: 'NOR' },
  { id: 'c-dnk', name: 'Denmark', type: 'country', owidEntityId: 161, owidCode: 'DNK' },
  { id: 'c-fin', name: 'Finland', type: 'country', owidEntityId: 156, owidCode: 'FIN' },
  { id: 'c-irl', name: 'Ireland', type: 'country', owidEntityId: 134, owidCode: 'IRL' },
  { id: 'c-prt', name: 'Portugal', type: 'country', owidEntityId: 95, owidCode: 'PRT' },
  { id: 'c-grc', name: 'Greece', type: 'country', owidEntityId: 149, owidCode: 'GRC' },
  { id: 'c-aut', name: 'Austria', type: 'country', owidEntityId: 24, owidCode: 'AUT' },
  { id: 'c-che', name: 'Switzerland', type: 'country', owidEntityId: 75, owidCode: 'CHE' },
  { id: 'c-nzl', name: 'New Zealand', type: 'country', owidEntityId: 106, owidCode: 'NZL' },
  { id: 'c-sgp', name: 'Singapore', type: 'country', owidEntityId: 80, owidCode: 'SGP' },
  { id: 'c-sau', name: 'Saudi Arabia', type: 'country', owidEntityId: 79, owidCode: 'SAU' },
  { id: 'c-are', name: 'United Arab Emirates', type: 'country', owidEntityId: 63, owidCode: 'ARE' },
  { id: 'c-irq', name: 'Iraq', type: 'country', owidEntityId: 135, owidCode: 'IRQ' },
  { id: 'c-irn', name: 'Iran', type: 'country', owidEntityId: 136, owidCode: 'IRN' },
  { id: 'c-bgd', name: 'Bangladesh', type: 'country', owidEntityId: 27, owidCode: 'BGD' },
  { id: 'c-lka', name: 'Sri Lanka', type: 'country', owidEntityId: 81, owidCode: 'LKA' },
  { id: 'c-mmr', name: 'Myanmar', type: 'country', owidEntityId: 119, owidCode: 'MMR' },
  { id: 'c-ukr', name: 'Ukraine', type: 'country', owidEntityId: 62, owidCode: 'UKR' },
  { id: 'c-rou', name: 'Romania', type: 'country', owidEntityId: 96, owidCode: 'ROU' },
  { id: 'c-hun', name: 'Hungary', type: 'country', owidEntityId: 131, owidCode: 'HUN' },
  { id: 'c-cze', name: 'Czechia', type: 'country', owidEntityId: 162, owidCode: 'CZE' },
  { id: 'c-tza', name: 'Tanzania', type: 'country', owidEntityId: 64, owidCode: 'TZA' },
  { id: 'c-gha', name: 'Ghana', type: 'country', owidEntityId: 148, owidCode: 'GHA' },
  { id: 'c-uga', name: 'Uganda', type: 'country', owidEntityId: 61, owidCode: 'UGA' },
  { id: 'c-cod', name: 'DR Congo', type: 'country', owidEntityId: 169, owidCode: 'COD' },
  { id: 'c-dza', name: 'Algeria', type: 'country', owidEntityId: 20, owidCode: 'DZA' },
  { id: 'c-syr', name: 'Syria', type: 'country', owidEntityId: 77, owidCode: 'SYR' },
  { id: 'c-jam', name: 'Jamaica', type: 'country', owidEntityId: 132, owidCode: 'JAM' },
  { id: 'c-isl', name: 'Iceland', type: 'country', owidEntityId: 130, owidCode: 'ISL' },
];

// All locations combined for search
export const ALL_LOCATIONS = [...COUNTRIES, ...US_STATES, ...UK_REGIONS];

// Search function with fuzzy matching
export function searchLocations(query: string, limit = 10): LocationResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Check city mappings first
  const ukRegionId = UK_CITY_REGION_MAP[q];
  const usStateId = US_CITY_STATE_MAP[q];

  const results: LocationResult[] = [];
  const seen = new Set<string>();

  // If a UK city matches, add the region
  if (ukRegionId) {
    const region = UK_REGIONS.find(r => r.id === ukRegionId);
    if (region) {
      results.push({ ...region, name: `${query} → ${region.name} (Met Office region)` });
      seen.add(region.id);
    }
  }

  // If a US city matches, add the state
  if (usStateId) {
    const state = US_STATES.find(s => s.id === usStateId);
    if (state) {
      results.push({ ...state, name: `${query} → ${state.name} (US state)` });
      seen.add(state.id);
    }
  }

  // Exact prefix matches first
  for (const loc of ALL_LOCATIONS) {
    if (seen.has(loc.id)) continue;
    if (loc.name.toLowerCase().startsWith(q)) {
      results.push(loc);
      seen.add(loc.id);
    }
  }

  // Then partial matches
  for (const loc of ALL_LOCATIONS) {
    if (seen.has(loc.id)) continue;
    if (loc.name.toLowerCase().includes(q)) {
      results.push(loc);
      seen.add(loc.id);
    }
  }

  return results.slice(0, limit);
}
