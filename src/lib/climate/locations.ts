// Static location data for climate dashboard
// Maps searchable names to data source identifiers

// Convert ISO 3166-1 alpha-3 to flag emoji via alpha-2
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  GBR: 'GB', FRA: 'FR', DEU: 'DE', USA: 'US', JPN: 'JP', ARG: 'AR', AUS: 'AU',
  BOL: 'BO', BRA: 'BR', SOM: 'SO', PER: 'PE', PAK: 'PK', NGA: 'NG', NIC: 'NI',
  MAR: 'MA', MYS: 'MY', MWI: 'MW', LBN: 'LB', KOR: 'KR', PRK: 'KP', KEN: 'KE',
  ISR: 'IL', IDN: 'ID', IND: 'IN', PSE: 'PS', GUY: 'GY', ETH: 'ET', CYP: 'CY',
  CRI: 'CR', COG: 'CG', CHN: 'CN', CHL: 'CL', SUR: 'SR', SSD: 'SS',
  ITA: 'IT', ESP: 'ES', CAN: 'CA', MEX: 'MX', RUS: 'RU', ZAF: 'ZA', EGY: 'EG',
  TUR: 'TR', THA: 'TH', VNM: 'VN', PHL: 'PH', COL: 'CO', POL: 'PL', NLD: 'NL',
  BEL: 'BE', SWE: 'SE', NOR: 'NO', DNK: 'DK', FIN: 'FI', IRL: 'IE', PRT: 'PT',
  GRC: 'GR', AUT: 'AT', CHE: 'CH', NZL: 'NZ', SGP: 'SG', SAU: 'SA', ARE: 'AE',
  IRQ: 'IQ', IRN: 'IR', BGD: 'BD', LKA: 'LK', MMR: 'MM', UKR: 'UA', ROU: 'RO',
  HUN: 'HU', CZE: 'CZ', TZA: 'TZ', GHA: 'GH', UGA: 'UG', COD: 'CD', DZA: 'DZ',
  SYR: 'SY', JAM: 'JM', ISL: 'IS',
  // Additional codes for leaderboard coverage
  BTN: 'BT', NPL: 'NP', AFG: 'AF', KHM: 'KH', LAO: 'LA', MNG: 'MN', KAZ: 'KZ',
  UZB: 'UZ', TKM: 'TM', TJK: 'TJ', KGZ: 'KG', AZE: 'AZ', GEO: 'GE', ARM: 'AM',
  YEM: 'YE', OMN: 'OM', KWT: 'KW', BHR: 'BH', QAT: 'QA', JOR: 'JO', LBY: 'LY',
  TUN: 'TN', SDN: 'SD', TCD: 'TD', NER: 'NE', MLI: 'ML', SEN: 'SN', MRT: 'MR',
  BFA: 'BF', GIN: 'GN', GNB: 'GW', SLE: 'SL', LBR: 'LR', CIV: 'CI', TGO: 'TG',
  BEN: 'BJ', CMR: 'CM', CAF: 'CF', GAB: 'GA', GNQ: 'GQ', AGO: 'AO', ZMB: 'ZM',
  ZWE: 'ZW', BWA: 'BW', NAM: 'NA', LSO: 'LS', SWZ: 'SZ', MOZ: 'MZ', MDG: 'MG',
  RWA: 'RW', BDI: 'BI', DJI: 'DJ', ERI: 'ER', BGR: 'BG', SRB: 'RS',
  HRV: 'HR', SVK: 'SK', SVN: 'SI', LTU: 'LT', LVA: 'LV', EST: 'EE', ALB: 'AL',
  MKD: 'MK', MLT: 'MT', LUX: 'LU', BLR: 'BY', MDA: 'MD', MNE: 'ME', BIH: 'BA',
  BHS: 'BS', DOM: 'DO', HTI: 'HT', CUB: 'CU', PRI: 'PR', TTO: 'TT', BLZ: 'BZ',
  HND: 'HN', SLV: 'SV', GTM: 'GT', PAN: 'PA', ECU: 'EC', VEN: 'VE', URY: 'UY',
  PRY: 'PY', PNG: 'PG', FJI: 'FJ', TLS: 'TL', BRN: 'BN',
};

export function countryFlag(owidCode?: string): string {
  if (!owidCode) return '🌍';
  const alpha2 = ALPHA3_TO_ALPHA2[owidCode];
  if (!alpha2) return '🌍';
  return String.fromCodePoint(...[...alpha2].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

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
  // Additional major countries - IDs will be resolved dynamically from OWID metadata
  { id: 'c-ita', name: 'Italy', type: 'country', owidEntityId: 8, owidCode: 'ITA' },
  { id: 'c-esp', name: 'Spain', type: 'country', owidEntityId: 9, owidCode: 'ESP' },
  { id: 'c-can', name: 'Canada', type: 'country', owidEntityId: 44, owidCode: 'CAN' },
  { id: 'c-mex', name: 'Mexico', type: 'country', owidEntityId: 113, owidCode: 'MEX' },
  { id: 'c-rus', name: 'Russia', type: 'country', owidEntityId: 12, owidCode: 'RUS' },
  { id: 'c-zaf', name: 'South Africa', type: 'country', owidEntityId: 81, owidCode: 'ZAF' },
  { id: 'c-egy', name: 'Egypt', type: 'country', owidEntityId: 65, owidCode: 'EGY' },
  { id: 'c-tur', name: 'Turkey', type: 'country', owidEntityId: 70, owidCode: 'TUR' },
  { id: 'c-tha', name: 'Thailand', type: 'country', owidEntityId: 75, owidCode: 'THA' },
  { id: 'c-vnm', name: 'Vietnam', type: 'country', owidEntityId: 84, owidCode: 'VNM' },
  { id: 'c-phl', name: 'Philippines', type: 'country', owidEntityId: 96, owidCode: 'PHL' },
  { id: 'c-col', name: 'Colombia', type: 'country', owidEntityId: 170, owidCode: 'COL' },
  { id: 'c-pol', name: 'Poland', type: 'country', owidEntityId: 11, owidCode: 'POL' },
  { id: 'c-nld', name: 'Netherlands', type: 'country', owidEntityId: 5, owidCode: 'NLD' },
  { id: 'c-bel', name: 'Belgium', type: 'country', owidEntityId: 4, owidCode: 'BEL' },
  { id: 'c-swe', name: 'Sweden', type: 'country', owidEntityId: 10, owidCode: 'SWE' },
  { id: 'c-nor', name: 'Norway', type: 'country', owidEntityId: 102, owidCode: 'NOR' },
  { id: 'c-dnk', name: 'Denmark', type: 'country', owidEntityId: 161, owidCode: 'DNK' },
  { id: 'c-fin', name: 'Finland', type: 'country', owidEntityId: 155, owidCode: 'FIN' },
  { id: 'c-irl', name: 'Ireland', type: 'country', owidEntityId: 2, owidCode: 'IRL' },
  { id: 'c-prt', name: 'Portugal', type: 'country', owidEntityId: 95, owidCode: 'PRT' },
  { id: 'c-grc', name: 'Greece', type: 'country', owidEntityId: 149, owidCode: 'GRC' },
  { id: 'c-aut', name: 'Austria', type: 'country', owidEntityId: 24, owidCode: 'AUT' },
  { id: 'c-che', name: 'Switzerland', type: 'country', owidEntityId: 7, owidCode: 'CHE' },
  { id: 'c-nzl', name: 'New Zealand', type: 'country', owidEntityId: 106, owidCode: 'NZL' },
  // Singapore removed — not present in OWID climate indicators (CRU TS land-based dataset)
  { id: 'c-sau', name: 'Saudi Arabia', type: 'country', owidEntityId: 90, owidCode: 'SAU' },
  { id: 'c-are', name: 'United Arab Emirates', type: 'country', owidEntityId: 72, owidCode: 'ARE' },
  { id: 'c-irq', name: 'Iraq', type: 'country', owidEntityId: 134, owidCode: 'IRQ' },
  { id: 'c-irn', name: 'Iran', type: 'country', owidEntityId: 135, owidCode: 'IRN' },
  { id: 'c-bgd', name: 'Bangladesh', type: 'country', owidEntityId: 28, owidCode: 'BGD' },
  { id: 'c-lka', name: 'Sri Lanka', type: 'country', owidEntityId: 141, owidCode: 'LKA' },
  { id: 'c-mmr', name: 'Myanmar', type: 'country', owidEntityId: 142, owidCode: 'MMR' },
  { id: 'c-ukr', name: 'Ukraine', type: 'country', owidEntityId: 67, owidCode: 'UKR' },
  { id: 'c-rou', name: 'Romania', type: 'country', owidEntityId: 92, owidCode: 'ROU' },
  { id: 'c-hun', name: 'Hungary', type: 'country', owidEntityId: 138, owidCode: 'HUN' },
  { id: 'c-cze', name: 'Czechia', type: 'country', owidEntityId: 162, owidCode: 'CZE' },
  { id: 'c-tza', name: 'Tanzania', type: 'country', owidEntityId: 64, owidCode: 'TZA' },
  { id: 'c-gha', name: 'Ghana', type: 'country', owidEntityId: 150, owidCode: 'GHA' },
  { id: 'c-uga', name: 'Uganda', type: 'country', owidEntityId: 68, owidCode: 'UGA' },
  { id: 'c-cod', name: 'DR Congo', type: 'country', owidEntityId: 167, owidCode: 'COD' },
  { id: 'c-dza', name: 'Algeria', type: 'country', owidEntityId: 17, owidCode: 'DZA' },
  { id: 'c-syr', name: 'Syria', type: 'country', owidEntityId: 77, owidCode: 'SYR' },
  { id: 'c-jam', name: 'Jamaica', type: 'country', owidEntityId: 132, owidCode: 'JAM' },
  { id: 'c-isl', name: 'Iceland', type: 'country', owidEntityId: 207, owidCode: 'ISL' },
  // Phase 2 coverage expansion: +91 OWID CCKP countries
  { id: 'c-afg', name: 'Afghanistan', type: 'country', owidEntityId: 15, owidCode: 'AFG' },
  { id: 'c-alb', name: 'Albania', type: 'country', owidEntityId: 16, owidCode: 'ALB' },
  { id: 'c-ago', name: 'Angola', type: 'country', owidEntityId: 19, owidCode: 'AGO' },
  { id: 'c-arm', name: 'Armenia', type: 'country', owidEntityId: 22, owidCode: 'ARM' },
  { id: 'c-aze', name: 'Azerbaijan', type: 'country', owidEntityId: 25, owidCode: 'AZE' },
  { id: 'c-bhs', name: 'Bahamas', type: 'country', owidEntityId: 26, owidCode: 'BHS' },
  { id: 'c-blr', name: 'Belarus', type: 'country', owidEntityId: 30, owidCode: 'BLR' },
  { id: 'c-blz', name: 'Belize', type: 'country', owidEntityId: 31, owidCode: 'BLZ' },
  { id: 'c-ben', name: 'Benin', type: 'country', owidEntityId: 32, owidCode: 'BEN' },
  { id: 'c-btn', name: 'Bhutan', type: 'country', owidEntityId: 33, owidCode: 'BTN' },
  { id: 'c-bih', name: 'Bosnia and Herzegovina', type: 'country', owidEntityId: 35, owidCode: 'BIH' },
  { id: 'c-bwa', name: 'Botswana', type: 'country', owidEntityId: 36, owidCode: 'BWA' },
  { id: 'c-brn', name: 'Brunei', type: 'country', owidEntityId: 38, owidCode: 'BRN' },
  { id: 'c-bgr', name: 'Bulgaria', type: 'country', owidEntityId: 39, owidCode: 'BGR' },
  { id: 'c-bfa', name: 'Burkina Faso', type: 'country', owidEntityId: 40, owidCode: 'BFA' },
  { id: 'c-bdi', name: 'Burundi', type: 'country', owidEntityId: 41, owidCode: 'BDI' },
  { id: 'c-khm', name: 'Cambodia', type: 'country', owidEntityId: 42, owidCode: 'KHM' },
  { id: 'c-cmr', name: 'Cameroon', type: 'country', owidEntityId: 43, owidCode: 'CMR' },
  { id: 'c-caf', name: 'Central African Republic', type: 'country', owidEntityId: 174, owidCode: 'CAF' },
  { id: 'c-tcd', name: 'Chad', type: 'country', owidEntityId: 173, owidCode: 'TCD' },
  { id: 'c-hrv', name: 'Croatia', type: 'country', owidEntityId: 165, owidCode: 'HRV' },
  { id: 'c-cub', name: 'Cuba', type: 'country', owidEntityId: 164, owidCode: 'CUB' },
  { id: 'c-civ', name: 'Cote d\'Ivoire', type: 'country', owidEntityId: 143, owidCode: 'CIV' },
  { id: 'c-dji', name: 'Djibouti', type: 'country', owidEntityId: 154, owidCode: 'DJI' },
  { id: 'c-dom', name: 'Dominican Republic', type: 'country', owidEntityId: 160, owidCode: 'DOM' },
  { id: 'c-ecu', name: 'Ecuador', type: 'country', owidEntityId: 201, owidCode: 'ECU' },
  { id: 'c-slv', name: 'El Salvador', type: 'country', owidEntityId: 259, owidCode: 'SLV' },
  { id: 'c-gnq', name: 'Equatorial Guinea', type: 'country', owidEntityId: 159, owidCode: 'GNQ' },
  { id: 'c-eri', name: 'Eritrea', type: 'country', owidEntityId: 157, owidCode: 'ERI' },
  { id: 'c-est', name: 'Estonia', type: 'country', owidEntityId: 156, owidCode: 'EST' },
  { id: 'c-fji', name: 'Fiji', type: 'country', owidEntityId: 202, owidCode: 'FJI' },
  { id: 'c-gab', name: 'Gabon', type: 'country', owidEntityId: 153, owidCode: 'GAB' },
  { id: 'c-gmb', name: 'Gambia', type: 'country', owidEntityId: 151, owidCode: 'GMB' },
  { id: 'c-geo', name: 'Georgia', type: 'country', owidEntityId: 152, owidCode: 'GEO' },
  { id: 'c-grl', name: 'Greenland', type: 'country', owidEntityId: 205, owidCode: 'GRL' },
  { id: 'c-gtm', name: 'Guatemala', type: 'country', owidEntityId: 148, owidCode: 'GTM' },
  { id: 'c-gin', name: 'Guinea', type: 'country', owidEntityId: 147, owidCode: 'GIN' },
  { id: 'c-gnb', name: 'Guinea-Bissau', type: 'country', owidEntityId: 94, owidCode: 'GNB' },
  { id: 'c-hti', name: 'Haiti', type: 'country', owidEntityId: 145, owidCode: 'HTI' },
  { id: 'c-hnd', name: 'Honduras', type: 'country', owidEntityId: 139, owidCode: 'HND' },
  { id: 'c-jor', name: 'Jordan', type: 'country', owidEntityId: 130, owidCode: 'JOR' },
  { id: 'c-kaz', name: 'Kazakhstan', type: 'country', owidEntityId: 131, owidCode: 'KAZ' },
  { id: 'c-xkx', name: 'Kosovo', type: 'country', owidEntityId: 379, owidCode: 'XKX' },
  { id: 'c-kwt', name: 'Kuwait', type: 'country', owidEntityId: 208, owidCode: 'KWT' },
  { id: 'c-kgz', name: 'Kyrgyzstan', type: 'country', owidEntityId: 126, owidCode: 'KGZ' },
  { id: 'c-lao', name: 'Laos', type: 'country', owidEntityId: 125, owidCode: 'LAO' },
  { id: 'c-lva', name: 'Latvia', type: 'country', owidEntityId: 122, owidCode: 'LVA' },
  { id: 'c-lso', name: 'Lesotho', type: 'country', owidEntityId: 123, owidCode: 'LSO' },
  { id: 'c-lbr', name: 'Liberia', type: 'country', owidEntityId: 121, owidCode: 'LBR' },
  { id: 'c-lby', name: 'Libya', type: 'country', owidEntityId: 120, owidCode: 'LBY' },
  { id: 'c-ltu', name: 'Lithuania', type: 'country', owidEntityId: 119, owidCode: 'LTU' },
  { id: 'c-lux', name: 'Luxembourg', type: 'country', owidEntityId: 210, owidCode: 'LUX' },
  { id: 'c-mdg', name: 'Madagascar', type: 'country', owidEntityId: 118, owidCode: 'MDG' },
  { id: 'c-mli', name: 'Mali', type: 'country', owidEntityId: 115, owidCode: 'MLI' },
  { id: 'c-mrt', name: 'Mauritania', type: 'country', owidEntityId: 114, owidCode: 'MRT' },
  { id: 'c-mda', name: 'Moldova', type: 'country', owidEntityId: 111, owidCode: 'MDA' },
  { id: 'c-mng', name: 'Mongolia', type: 'country', owidEntityId: 112, owidCode: 'MNG' },
  { id: 'c-mne', name: 'Montenegro', type: 'country', owidEntityId: 215, owidCode: 'MNE' },
  { id: 'c-moz', name: 'Mozambique', type: 'country', owidEntityId: 109, owidCode: 'MOZ' },
  { id: 'c-nam', name: 'Namibia', type: 'country', owidEntityId: 108, owidCode: 'NAM' },
  { id: 'c-npl', name: 'Nepal', type: 'country', owidEntityId: 107, owidCode: 'NPL' },
  { id: 'c-ncl', name: 'New Caledonia', type: 'country', owidEntityId: 220, owidCode: 'NCL' },
  { id: 'c-ner', name: 'Niger', type: 'country', owidEntityId: 104, owidCode: 'NER' },
  { id: 'c-omn', name: 'Oman', type: 'country', owidEntityId: 217, owidCode: 'OMN' },
  { id: 'c-pan', name: 'Panama', type: 'country', owidEntityId: 100, owidCode: 'PAN' },
  { id: 'c-png', name: 'Papua New Guinea', type: 'country', owidEntityId: 99, owidCode: 'PNG' },
  { id: 'c-pry', name: 'Paraguay', type: 'country', owidEntityId: 98, owidCode: 'PRY' },
  { id: 'c-pri', name: 'Puerto Rico', type: 'country', owidEntityId: 93, owidCode: 'PRI' },
  { id: 'c-qat', name: 'Qatar', type: 'country', owidEntityId: 226, owidCode: 'QAT' },
  { id: 'c-rwa', name: 'Rwanda', type: 'country', owidEntityId: 91, owidCode: 'RWA' },
  { id: 'c-sen', name: 'Senegal', type: 'country', owidEntityId: 89, owidCode: 'SEN' },
  { id: 'c-srb', name: 'Serbia', type: 'country', owidEntityId: 88, owidCode: 'SRB' },
  { id: 'c-sle', name: 'Sierra Leone', type: 'country', owidEntityId: 87, owidCode: 'SLE' },
  { id: 'c-svk', name: 'Slovakia', type: 'country', owidEntityId: 85, owidCode: 'SVK' },
  { id: 'c-svn', name: 'Slovenia', type: 'country', owidEntityId: 83, owidCode: 'SVN' },
  { id: 'c-slb', name: 'Solomon Islands', type: 'country', owidEntityId: 195, owidCode: 'SLB' },
  { id: 'c-sdn', name: 'Sudan', type: 'country', owidEntityId: 79, owidCode: 'SDN' },
  { id: 'c-tjk', name: 'Tajikistan', type: 'country', owidEntityId: 76, owidCode: 'TJK' },
  { id: 'c-tls', name: 'East Timor', type: 'country', owidEntityId: 225, owidCode: 'TLS' },
  { id: 'c-tgo', name: 'Togo', type: 'country', owidEntityId: 74, owidCode: 'TGO' },
  { id: 'c-tto', name: 'Trinidad and Tobago', type: 'country', owidEntityId: 73, owidCode: 'TTO' },
  { id: 'c-tun', name: 'Tunisia', type: 'country', owidEntityId: 71, owidCode: 'TUN' },
  { id: 'c-tkm', name: 'Turkmenistan', type: 'country', owidEntityId: 69, owidCode: 'TKM' },
  { id: 'c-ury', name: 'Uruguay', type: 'country', owidEntityId: 63, owidCode: 'URY' },
  { id: 'c-uzb', name: 'Uzbekistan', type: 'country', owidEntityId: 62, owidCode: 'UZB' },
  { id: 'c-vut', name: 'Vanuatu', type: 'country', owidEntityId: 221, owidCode: 'VUT' },
  { id: 'c-ven', name: 'Venezuela', type: 'country', owidEntityId: 238, owidCode: 'VEN' },
  { id: 'c-yem', name: 'Yemen', type: 'country', owidEntityId: 61, owidCode: 'YEM' },
  { id: 'c-zmb', name: 'Zambia', type: 'country', owidEntityId: 60, owidCode: 'ZMB' },
  { id: 'c-zwe', name: 'Zimbabwe', type: 'country', owidEntityId: 80, owidCode: 'ZWE' },
  { id: 'c-swz', name: 'Eswatini', type: 'country', owidEntityId: 78, owidCode: 'SWZ' },
];

// All locations combined for search (sub-national first so they take priority over same-name countries)
export const ALL_LOCATIONS = [...UK_REGIONS, ...US_STATES, ...COUNTRIES];

// Search function with fuzzy matching
export function searchLocations(query: string, limit = 10): LocationResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Check city mappings - exact and partial matches
  const ukCityExact = UK_CITY_REGION_MAP[q];
  const usCityExact = US_CITY_STATE_MAP[q];

  // Also check partial city name matches
  const partialUkCities = q.length >= 2
    ? Object.entries(UK_CITY_REGION_MAP).filter(([city]) => city.startsWith(q) && city !== q)
    : [];
  const partialUsCities = q.length >= 2
    ? Object.entries(US_CITY_STATE_MAP).filter(([city]) => city.startsWith(q) && city !== q)
    : [];

  const results: LocationResult[] = [];
  const seen = new Set<string>();
  const seenNames = new Set<string>();

  // If a UK city matches exactly, add the region
  if (ukCityExact) {
    const region = UK_REGIONS.find(r => r.id === ukCityExact);
    if (region) {
      results.push({ ...region, name: `${query} → ${region.name}` });
      seen.add(region.id);
    }
  }

  // If a US city matches exactly, add the state
  if (usCityExact) {
    const state = US_STATES.find(s => s.id === usCityExact);
    if (state) {
      results.push({ ...state, name: `${query} → ${state.name}` });
      seen.add(state.id);
    }
  }

  // Partial UK city matches
  for (const [city, regionId] of partialUkCities) {
    if (seen.has(`city-${city}`)) continue;
    const region = UK_REGIONS.find(r => r.id === regionId);
    if (region && !seen.has(region.id)) {
      results.push({ ...region, name: `${city.charAt(0).toUpperCase() + city.slice(1)} → ${region.name}` });
      seen.add(region.id);
      seen.add(`city-${city}`);
    }
  }

  // Partial US city matches
  for (const [city, stateId] of partialUsCities) {
    if (seen.has(`city-${city}`)) continue;
    const state = US_STATES.find(s => s.id === stateId);
    if (state && !seen.has(state.id)) {
      results.push({ ...state, name: `${city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} → ${state.name}` });
      seen.add(state.id);
      seen.add(`city-${city}`);
    }
  }

  // Exact prefix matches first
  for (const loc of ALL_LOCATIONS) {
    if (seen.has(loc.id)) continue;
    const normalizedName = loc.name.toLowerCase();
    if (seenNames.has(normalizedName)) continue;
    if (normalizedName.startsWith(q)) {
      results.push(loc);
      seen.add(loc.id);
      seenNames.add(normalizedName);
    }
  }

  // Then partial matches
  for (const loc of ALL_LOCATIONS) {
    if (seen.has(loc.id)) continue;
    const normalizedName = loc.name.toLowerCase();
    if (seenNames.has(normalizedName)) continue;
    if (normalizedName.includes(q)) {
      results.push(loc);
      seen.add(loc.id);
      seenNames.add(normalizedName);
    }
  }

  return results.slice(0, limit);
}
