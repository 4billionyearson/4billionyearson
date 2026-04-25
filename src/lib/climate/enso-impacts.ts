/**
 * Structured ENSO impact data, derived from:
 *   - Met Office GPC ENSO impacts maps & Davey et al. (2013):
 *     https://www.metoffice.gov.uk/research/climate/seasonal-to-decadal/gpc-outlooks/el-nino-la-nina
 *   - NOAA CPC ENSO impacts and historical analyses
 *   - IPCC AR6 WGI Annex VI (ENSO regional teleconnections)
 *
 * Each region has separate El Niño and La Niña entries (some regions only
 * have a strong response in one phase). `prob` is the rough historical
 * probability that the impact is realised when the phase is active, taken
 * from Davey et al. and NOAA Climate.gov composites. These are typical
 * teleconnection patterns - any single event can deviate.
 */

export type ImpactPhase = 'el-nino' | 'la-nina';
export type TempImpact = 'warmer' | 'cooler' | null;
export type PrecipImpact = 'wetter' | 'drier' | null;

export interface RegionImpact {
  /** Stable id for React keys */
  id: string;
  /** Display name */
  region: string;
  /** Continent / ocean basin grouping */
  continent: 'Africa' | 'Asia' | 'Europe' | 'N. America' | 'C. America' | 'S. America' | 'Oceania' | 'Pacific Is.';
  /** Bounding-box style label, e.g. "Eastern Australia" */
  area: string;
  /** Per-phase impact summary */
  impacts: {
    'el-nino'?: PhaseImpact;
    'la-nina'?: PhaseImpact;
  };
}

export interface PhaseImpact {
  temp: TempImpact;
  precip: PrecipImpact;
  /** Three-letter month range, e.g. "DJF", "JJAS", "OND" */
  season: string;
  /** Approx historical probability of the impact (when phase is active) */
  prob: number;
  /** Plain-English real-world consequence summary */
  notes: string;
}

/* ─────────────────────────────────────────────────────────────────────── */

export const REGION_IMPACTS: RegionImpact[] = [
  /* ─── South America ─── */
  {
    id: 'peru-ecuador',
    region: 'Peru & Ecuador (coastal)',
    continent: 'S. America',
    area: 'Western coast of equatorial S. America',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'wetter', season: 'JFM', prob: 0.8, notes: 'Severe coastal flooding, fisheries collapse (anchovy stocks crash as upwelling weakens). 1982-83 and 1997-98 events caused widespread infrastructure damage.' },
      'la-nina': { temp: 'cooler', precip: 'drier', season: 'JFM', prob: 0.55, notes: 'Cooler-than-normal coastal SSTs, strong upwelling and anchovy boom; drier coast.' },
    },
  },
  {
    id: 'ne-brazil',
    region: 'NE Brazil',
    continent: 'S. America',
    area: 'Sertão & northeastern coast',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'JJA-DJF', prob: 0.7, notes: 'Major drought risk during the rainy season (Feb-May). Severe in 2015-16; agricultural and water-supply crises.' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'FMA', prob: 0.5, notes: 'Above-average rainfall in the sertão; flooding risk along the São Francisco basin.' },
    },
  },
  {
    id: 's-brazil-arg',
    region: 'S. Brazil, Uruguay & N. Argentina',
    continent: 'S. America',
    area: 'La Plata basin',
    impacts: {
      'el-nino': { temp: null, precip: 'wetter', season: 'NDJ', prob: 0.65, notes: 'Wetter-than-average spring/summer; flooding along the Paraná/Uruguay rivers (e.g. 1997-98 floods).' },
      'la-nina': { temp: 'warmer', precip: 'drier', season: 'NDJ', prob: 0.6, notes: 'Drought risk for soybean/maize harvests; 2020-22 triple-dip La Niña drove major Argentine crop losses.' },
    },
  },
  {
    id: 'amazonia',
    region: 'Amazon basin',
    continent: 'S. America',
    area: 'Northern & central Amazonia',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'JJA-OND', prob: 0.6, notes: 'Drought stress, lower river levels, larger fire seasons. 2023-24 El Niño produced record-low Rio Negro levels at Manaus.' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'DJF', prob: 0.45, notes: 'Wetter Amazon rainy season; increased flood risk on tributaries.' },
    },
  },
  /* ─── North America ─── */
  {
    id: 'sw-us',
    region: 'Southwest USA',
    continent: 'N. America',
    area: 'California, Arizona, NM, S. Nevada',
    impacts: {
      'el-nino': { temp: null, precip: 'wetter', season: 'DJF', prob: 0.6, notes: 'Wetter winter; helps replenish reservoirs and snowpack. Strong El Niños have produced major California floods.' },
      'la-nina': { temp: 'warmer', precip: 'drier', season: 'DJF', prob: 0.65, notes: 'Drier winter, deepens drought. The 2020-23 megadrought was reinforced by a triple-dip La Niña.' },
    },
  },
  {
    id: 'nw-us-canada',
    region: 'Pacific NW USA & W. Canada',
    continent: 'N. America',
    area: 'Washington, Oregon, BC, Alberta',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'DJF', prob: 0.55, notes: 'Mild, dry winter; lower mountain snowpack. Knock-on summer wildfire risk.' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'DJF', prob: 0.6, notes: 'Wetter, snowier winter; lower wildfire risk the following summer.' },
    },
  },
  {
    id: 'se-us',
    region: 'Southeast USA',
    continent: 'N. America',
    area: 'Florida & Gulf Coast states',
    impacts: {
      'el-nino': { temp: 'cooler', precip: 'wetter', season: 'DJF', prob: 0.55, notes: 'Wetter, cooler winter; stronger subtropical jet brings more storms.' },
      'la-nina': { temp: 'warmer', precip: 'drier', season: 'DJF', prob: 0.55, notes: 'Drier, warmer winter; favours larger Atlantic hurricane seasons (less wind shear).' },
    },
  },
  {
    id: 'ne-us-canada',
    region: 'NE USA & E. Canada',
    continent: 'N. America',
    area: 'Northeast US states & Maritime Canada',
    impacts: {
      'el-nino': { temp: 'warmer', precip: null, season: 'DJF', prob: 0.5, notes: 'Milder-than-average winter; reduced heating demand.' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'DJF', prob: 0.45, notes: 'More frequent cold-air outbreaks; higher snowstorm risk.' },
    },
  },
  /* ─── Central America & Caribbean ─── */
  {
    id: 'central-america',
    region: 'Mexico & Central America',
    continent: 'C. America',
    area: 'From northern Mexico to Panama',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'JJA-SON', prob: 0.65, notes: 'Drought risk during the rainy season (May-Oct); crop and water-supply stress, especially in the Central American Dry Corridor.' },
      'la-nina': { temp: null, precip: 'wetter', season: 'JJA-OND', prob: 0.55, notes: 'Wetter rainy season; more landslides; favours active Atlantic hurricane season.' },
    },
  },
  {
    id: 'caribbean',
    region: 'Caribbean & Atlantic basin',
    continent: 'C. America',
    area: 'Caribbean Sea, Gulf of Mexico, tropical Atlantic',
    impacts: {
      'el-nino': { temp: null, precip: 'drier', season: 'JJA-SON', prob: 0.6, notes: 'Suppresses Atlantic hurricane activity (more wind shear, drier mid-troposphere).' },
      'la-nina': { temp: null, precip: 'wetter', season: 'JJA-SON', prob: 0.6, notes: 'Boosts Atlantic hurricane activity. The 2020 record-breaking 30-storm season ran on a developing La Niña.' },
    },
  },
  /* ─── Europe ─── */
  {
    id: 'n-europe',
    region: 'N. Europe (Baltic & UK)',
    continent: 'Europe',
    area: 'British Isles, Scandinavia, Baltic',
    impacts: {
      'el-nino': { temp: 'cooler', precip: null, season: 'DJF', prob: 0.45, notes: 'Tendency for cooler late winters; very strong El Niños (1997-98, 1982-83) flipped the sign and gave warm winters.' },
      'la-nina': { temp: null, precip: 'drier', season: 'DJF', prob: 0.4, notes: 'Tendency for stronger northern blocking; more variable winters.' },
    },
  },
  {
    id: 's-europe',
    region: 'Mediterranean',
    continent: 'Europe',
    area: 'Iberia, Italy, Balkans, N. Africa',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'JJA', prob: 0.45, notes: 'Hotter, drier summers; heatwave and wildfire risk amplified, especially in the Iberian Peninsula.' },
      'la-nina': { temp: null, precip: null, season: '-', prob: 0.3, notes: 'Weaker, less consistent teleconnection.' },
    },
  },
  /* ─── Africa ─── */
  {
    id: 'east-africa',
    region: 'East Africa (Horn)',
    continent: 'Africa',
    area: 'Kenya, Ethiopia, Somalia, S. Sudan',
    impacts: {
      'el-nino': { temp: null, precip: 'wetter', season: 'OND', prob: 0.7, notes: '"Short rains" (Oct-Dec) much wetter; flooding & locust outbreaks. 1997-98 floods displaced millions.' },
      'la-nina': { temp: 'warmer', precip: 'drier', season: 'OND', prob: 0.7, notes: 'Severe short-rains failure; the 2020-23 triple-dip La Niña caused the worst Horn-of-Africa drought in 40 years (~20M people food-insecure).' },
    },
  },
  {
    id: 'southern-africa',
    region: 'Southern Africa',
    continent: 'Africa',
    area: 'S. Africa, Zimbabwe, Mozambique, Botswana',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'DJF', prob: 0.7, notes: 'Major maize-belt drought; 2015-16 El Niño caused the worst SADC drought in decades. 2023-24 again triggered widespread food insecurity.' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'DJF', prob: 0.55, notes: 'Above-average summer rainfall; flood risk. Cyclones often track further inland.' },
    },
  },
  {
    id: 'sahel',
    region: 'Sahel',
    continent: 'Africa',
    area: 'From Senegal east to Sudan',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'JAS', prob: 0.5, notes: 'Drier West African monsoon; reduced cereal yields.' },
      'la-nina': { temp: null, precip: 'wetter', season: 'JAS', prob: 0.5, notes: 'Stronger monsoon rainfall; flood risk along the Niger and Senegal rivers.' },
    },
  },
  /* ─── Asia ─── */
  {
    id: 'india',
    region: 'India',
    continent: 'Asia',
    area: 'Indian subcontinent',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'JJAS', prob: 0.6, notes: 'Weaker SW summer monsoon; ~60 % of all-India droughts since 1900 occurred in El Niño years (e.g. 2002, 2009, 2015).' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'JJAS', prob: 0.55, notes: 'Stronger monsoon; flood risk. 2022 floods in Pakistan & India ran on a triple-dip La Niña.' },
    },
  },
  {
    id: 'sea-maritime',
    region: 'Maritime SE Asia',
    continent: 'Asia',
    area: 'Indonesia, Malaysia, Philippines, PNG',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'JJA-DJF', prob: 0.8, notes: 'Severe drought; major peatland & forest fires (Indonesia 1997, 2015). One of the most reliable ENSO teleconnections worldwide.' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'JJA-DJF', prob: 0.7, notes: 'Above-average rainfall; flood risk. Cooler regional SSTs reduce coral bleaching.' },
    },
  },
  {
    id: 'east-asia',
    region: 'E. Asia (China, Korea, Japan)',
    continent: 'Asia',
    area: 'NE China, Korea, Japan',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'wetter', season: 'DJF', prob: 0.5, notes: 'Mild winter; increased rainfall over central/E China (Yangtze flooding risk in following summer).' },
      'la-nina': { temp: 'cooler', precip: null, season: 'DJF', prob: 0.55, notes: 'Cold air outbreaks; harsher winters in N. China and Korea.' },
    },
  },
  /* ─── Oceania ─── */
  {
    id: 'e-australia',
    region: 'Eastern Australia',
    continent: 'Oceania',
    area: 'NSW, Queensland, Victoria',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'JJA-DJF', prob: 0.75, notes: 'Drought, heatwaves and severe bushfire seasons. Black Summer (2019-20) ran on a positive Indian Ocean Dipole + weak El Niño.' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'JJA-DJF', prob: 0.75, notes: 'Major flooding (Brisbane 2011, NSW/QLD 2022). One of the strongest ENSO signals globally.' },
    },
  },
  {
    id: 'n-australia',
    region: 'Northern Australia',
    continent: 'Oceania',
    area: 'Top End, Cape York',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'DJF', prob: 0.65, notes: 'Late, weaker monsoon; drought risk for cattle stations.' },
      'la-nina': { temp: null, precip: 'wetter', season: 'DJF', prob: 0.65, notes: 'Stronger, earlier monsoon; more tropical cyclones tracking onto the coast.' },
    },
  },
  /* ─── Pacific Islands ─── */
  {
    id: 'tropical-pacific-is',
    region: 'Central Tropical Pacific Is.',
    continent: 'Pacific Is.',
    area: 'Kiribati, Tuvalu, Tokelau, etc.',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'wetter', season: 'DJF', prob: 0.75, notes: 'Migration of the rain belt eastwards; severe coral bleaching during strong events (1998, 2016, 2024).' },
      'la-nina': { temp: 'cooler', precip: 'drier', season: 'DJF', prob: 0.7, notes: 'Severe droughts on equatorial atolls; freshwater rationing common (e.g. Tuvalu 2011).' },
    },
  },
  {
    id: 'sw-pacific',
    region: 'SW Pacific (Fiji, Vanuatu, NC)',
    continent: 'Pacific Is.',
    area: 'Fiji, Vanuatu, Samoa, New Caledonia',
    impacts: {
      'el-nino': { temp: 'warmer', precip: 'drier', season: 'DJF', prob: 0.6, notes: 'Drought; tropical cyclones shift further east toward French Polynesia.' },
      'la-nina': { temp: 'cooler', precip: 'wetter', season: 'DJF', prob: 0.6, notes: 'More tropical cyclones close to Fiji/Vanuatu; flooding & landslide risk.' },
    },
  },
];

/* ─── Past major events ───────────────────────────────────────────── */

export interface PastEvent {
  start: string;
  end: string;
  phase: ImpactPhase;
  strength: 'weak' | 'moderate' | 'strong' | 'very strong';
  peakOni: number;
  /** 2-3 sentence summary of documented impacts */
  summary: string;
  /** Most-cited specific impacts */
  highlights: string[];
}

export const PAST_EVENTS: PastEvent[] = [
  {
    start: '1982-04', end: '1983-06', phase: 'el-nino', strength: 'very strong', peakOni: 2.2,
    summary: 'A textbook East-Pacific El Niño that arrived almost without forecast. Caused the largest ENSO-related humanitarian crisis to that date.',
    highlights: ['Severe Australian drought (one of worst on record)', 'Indonesian forest fires & food shortages', 'Catastrophic floods Peru/Ecuador', 'US$13bn (1983 USD) damage worldwide'],
  },
  {
    start: '1988-05', end: '1989-05', phase: 'la-nina', strength: 'strong', peakOni: -1.9,
    summary: 'Strong La Niña following the 1986-87 El Niño. Reinforced the 1988 US Midwest drought and helped seed an active North Atlantic hurricane season.',
    highlights: ['1988 US Midwest drought (US$80bn+ damages)', 'Severe Sudan/Bangladesh floods', 'Strong Indian monsoon recovery'],
  },
  {
    start: '1997-04', end: '1998-05', phase: 'el-nino', strength: 'very strong', peakOni: 2.4,
    summary: 'The most extreme El Niño of the 20th century. Briefly pushed global temperatures to a new record and caused widespread climate dislocation.',
    highlights: ['Indonesian peatland fires & haze (~1Gt CO₂ emitted)', 'East African short-rains floods (millions displaced)', 'California floods & ice storms in NE US/Canada', 'Coral bleaching across the Indo-Pacific'],
  },
  {
    start: '1998-07', end: '2001-02', phase: 'la-nina', strength: 'strong', peakOni: -1.7,
    summary: 'A multi-year ("triple-dip-style") La Niña following the 1997-98 El Niño. Hyperactive Atlantic hurricane seasons.',
    highlights: ['1998 Hurricane Mitch (~11,000 dead in C. America)', 'Sahel & Horn-of-Africa drought', 'Strong Indian monsoon years'],
  },
  {
    start: '2010-06', end: '2011-05', phase: 'la-nina', strength: 'strong', peakOni: -1.6,
    summary: 'Co-incident with the strongest negative Southern Oscillation Index since 1917. Drove some of the most extreme rainfall events on record.',
    highlights: ['QLD & Brisbane floods (Jan 2011)', 'Pakistan floods (mid-2010, 20M affected)', '2010 Russian heatwave (linked indirectly)', 'Horn of Africa drought (2010-12)'],
  },
  {
    start: '2014-10', end: '2016-05', phase: 'el-nino', strength: 'very strong', peakOni: 2.6,
    summary: 'A "Godzilla" El Niño - peak ONI on par with 1997-98. Pushed global temperature ~0.2 °C above the long-term trend at peak.',
    highlights: ['2015 & 2016 set successive global temperature records', 'Ethiopia & Southern Africa drought (~60M people food-insecure)', 'Indonesia fires (worst since 1997)', 'Global mass coral bleaching #3 (2014-17)'],
  },
  {
    start: '2020-08', end: '2023-02', phase: 'la-nina', strength: 'moderate', peakOni: -1.3,
    summary: 'A rare triple-dip La Niña (3 successive winters). Cumulative impacts much larger than any single moderate event.',
    highlights: ['Horn of Africa drought - worst in 40 years (~20M food-insecure)', 'Hyperactive 2020 Atlantic hurricane season (30 named storms)', '2022 Pakistan floods (~33M displaced)', 'Reinforced US SW megadrought'],
  },
  {
    start: '2023-05', end: '2024-05', phase: 'el-nino', strength: 'strong', peakOni: 2.0,
    summary: 'Peaked DJF 2023-24. Combined with the long-term warming trend, helped make 2023 and then 2024 the two hottest years on record by clear margins.',
    highlights: ['2024: first calendar year >1.5 °C above pre-industrial (Copernicus)', 'Record Amazon drought (lowest Rio Negro at Manaus)', 'Mediterranean & North Atlantic marine heatwaves', 'Global mass coral bleaching #4 (declared April 2024)'],
  },
];
