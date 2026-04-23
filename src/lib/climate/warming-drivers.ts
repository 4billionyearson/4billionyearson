/**
 * Warming drivers — the regional mechanisms that explain *why* some places
 * warm faster (or slower) than the global average.
 *
 * Single source of truth used by:
 *   1. Climate explainer page (`/climate-explained#<id>`)
 *   2. <Term> tooltip component across the site
 *   3. Gemini regional-update prompt (drivers passed into context so it can
 *      pick the 2–3 most relevant ones and name them verbatim)
 *
 * Citation sources prioritise authoritative, non-paywalled explainers from
 * the IPCC, NOAA, NASA, Copernicus, WMO and national meteorological
 * agencies — appropriate for a general / student audience.
 */

export type DriverId =
  | 'arctic-amplification'
  | 'albedo-feedback'
  | 'land-vs-ocean'
  | 'latitude-effect'
  | 'aerosol-reduction'
  | 'heat-domes'
  | 'jet-stream-shifts'
  | 'dry-soil-amplification'
  | 'permafrost-feedback'
  | 'urban-heat-island'
  | 'altitude-warming'
  | 'deforestation'
  | 'seasonal-shifts'
  | 'ocean-currents';

export interface WarmingDriver {
  id: DriverId;
  term: string;
  /** Alternate phrasings Gemini might use — matched case-insensitively for auto-linkifying. */
  aliases: string[];
  /** One-sentence tooltip (≤ ~180 chars ideally). */
  short: string;
  /** 2–4 sentence explainer used on /climate-explained. */
  long: string;
  /** Loose hints so Gemini (and, later, auto-tagging) can pick drivers that plausibly apply. */
  appliesTo: {
    latitudeAbove?: number;            // e.g. 50 for high-latitude drivers
    latitudeBelow?: number;            // e.g. 35 for low-latitude drivers
    regionTypes?: ('country' | 'us-state' | 'uk-region')[];
    climateHints?: string[];          // 'arid', 'coastal', 'mountainous', 'urban', 'forested', 'polar'
  };
  source: { name: string; url: string };
}

export const WARMING_DRIVERS: WarmingDriver[] = [
  {
    id: 'arctic-amplification',
    term: 'Arctic amplification',
    aliases: ['polar amplification', 'arctic-amplified warming'],
    short:
      'High northern latitudes are warming three to four times faster than the global average as sea ice and snow retreat.',
    long:
      'The Arctic has warmed roughly 3–4× the global mean rate since 1979 — the fastest-warming region on Earth. As sea ice and snow disappear, dark ocean and land are exposed, absorbing more sunlight. Warmer, moister air masses now penetrate further north, and changes in atmospheric and ocean circulation trap extra heat at high latitudes. The effect is strongest in winter and autumn.',
    appliesTo: { latitudeAbove: 55, climateHints: ['polar'] },
    source: {
      name: 'NOAA Arctic Report Card 2024',
      url: 'https://arctic.noaa.gov/report-card/',
    },
  },
  {
    id: 'albedo-feedback',
    term: 'Albedo feedback',
    aliases: ['albedo effect', 'ice-albedo feedback', 'snow-albedo feedback'],
    short:
      'When reflective snow or ice melts, it exposes darker surfaces that absorb more sunlight — which melts more snow and ice.',
    long:
      'Fresh snow reflects up to 80% of incoming sunlight; bare soil and open ocean reflect less than 15%. When warming shrinks snow or ice cover, the newly exposed dark surface absorbs far more solar energy, driving further warming and further melt. This positive feedback amplifies warming wherever seasonal or permanent ice is retreating — the Arctic, mountain ranges, Scandinavia, Canada, and even mid-latitude regions losing their winter snowpack.',
    appliesTo: { climateHints: ['polar', 'mountainous'] },
    source: {
      name: 'NASA — Arctic Sea Ice & Albedo',
      url: 'https://climate.nasa.gov/news/2954/new-study-shows-three-abrupt-pulse-of-co2-after-last-ice-age/',
    },
  },
  {
    id: 'land-vs-ocean',
    term: 'Land warms faster than ocean',
    aliases: ['land–ocean contrast', 'continental warming', 'land-ocean contrast'],
    short:
      'Land heats up roughly 1.5× faster than the oceans because water needs far more energy to warm and redistributes heat downwards.',
    long:
      'Oceans absorb most of the excess heat from greenhouse gases, but water has an enormous heat capacity and mixes heat into the deep. Land has a much lower heat capacity and dries out when warmed, losing its evaporative cooling. As a result, global land-surface temperatures have risen about 1.6°C since pre-industrial times, while ocean surface temperatures have risen about 0.9°C. Large continental interiors — central Asia, central North America, the Sahel — warm fastest.',
    appliesTo: { regionTypes: ['country', 'us-state', 'uk-region'] },
    source: {
      name: 'IPCC AR6 WGI — Chapter 2',
      url: 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-2/',
    },
  },
  {
    id: 'latitude-effect',
    term: 'Latitude effect',
    aliases: ['proximity to the equator', 'proximity to the poles', 'high-latitude warming'],
    short:
      'Higher-latitude regions warm faster than the tropics, but tropical regions already sit close to the limits of human heat tolerance.',
    long:
      'Warming is not evenly distributed. Polar and sub-polar regions warm much faster than the tropics because of Arctic amplification, snow-albedo feedback, and dry winter air. The tropics warm more slowly — around 0.8× the global rate — but even small increases push temperatures into ranges that are dangerous for health, agriculture and ecosystems, because tropical life is adapted to a narrow temperature band.',
    appliesTo: {},
    source: {
      name: 'Copernicus Climate Change Service — Global Climate Highlights',
      url: 'https://climate.copernicus.eu/global-climate-highlights-2024',
    },
  },
  {
    id: 'aerosol-reduction',
    term: 'Aerosol reduction',
    aliases: ['clean-air warming', 'unmasking of warming', 'sulphate aerosol decline'],
    short:
      'As air-quality laws cut sulphate pollution, less sunlight is reflected back to space — unmasking underlying greenhouse warming.',
    long:
      'Sulphate and other pollution aerosols have a cooling effect: they scatter incoming sunlight and seed brighter, more reflective clouds. Since the 1980s, clean-air legislation has dramatically cut aerosol emissions across Europe, North America and (more recently) East Asia and global shipping. The result is excellent for human health but accelerates the warming that was previously masked. Europe, in particular, is now the fastest-warming continent partly because of this effect.',
    appliesTo: {
      latitudeAbove: 30,
      regionTypes: ['country', 'us-state', 'uk-region'],
      climateHints: ['urban'],
    },
    source: {
      name: 'Copernicus — European State of the Climate',
      url: 'https://climate.copernicus.eu/esotc',
    },
  },
  {
    id: 'heat-domes',
    term: 'Heat domes',
    aliases: ['blocking high', 'atmospheric blocking', 'persistent high pressure'],
    short:
      'Stalled high-pressure systems trap hot air for days or weeks, causing extreme summer heatwaves.',
    long:
      'A heat dome is a persistent, slow-moving ridge of high pressure that compresses the air beneath it, prevents clouds from forming and pins hot, dry air in place. Recent summers have seen record-breaking heat domes over western Canada and the US Pacific Northwest (2021), Europe (2022, 2023) and India (2024). A wavier, more sluggish jet stream appears to make these blocking patterns both more frequent and longer-lasting.',
    appliesTo: { latitudeAbove: 30 },
    source: {
      name: 'World Meteorological Organization — State of the Climate',
      url: 'https://wmo.int/publication-series/state-of-global-climate',
    },
  },
  {
    id: 'jet-stream-shifts',
    term: 'Jet-stream shifts',
    aliases: ['wavy jet stream', 'jet stream weakening', 'atmospheric circulation change'],
    short:
      'A weaker, wavier jet stream lets weather systems stall in place — bringing longer heatwaves, droughts, cold snaps and floods.',
    long:
      'The mid-latitude jet stream is driven by the temperature contrast between the tropics and the poles. As Arctic amplification weakens that contrast, the jet becomes slower and more meandering, forming large stationary waves. This allows heat domes, cold outbreaks and stalled rainfall patterns to persist much longer over the same region, making weather extremes — rather than the average warming itself — the most acute impact in many mid-latitude countries.',
    appliesTo: { latitudeAbove: 30, latitudeBelow: 70 },
    source: {
      name: 'Royal Meteorological Society — Jet Stream Primer',
      url: 'https://www.rmets.org/metmatters/jet-stream-explained',
    },
  },
  {
    id: 'dry-soil-amplification',
    term: 'Dry-soil amplification',
    aliases: ['soil moisture feedback', 'drought amplification', 'evaporative cooling loss'],
    short:
      'Dry soils can’t cool themselves through evaporation, so arid regions warm faster and droughts turn into heatwaves.',
    long:
      'Moist soil cools itself (and the air above it) as water evaporates. When soil dries out — through drought, deforestation or extended heat — that evaporative brake is lost, and nearly all the incoming solar energy goes into heating the surface and air. The Mediterranean, the western US, the Sahel and the Middle East are particularly vulnerable; heatwaves and droughts now frequently reinforce each other in a feedback known as compound drought-heat events.',
    appliesTo: { climateHints: ['arid'] },
    source: {
      name: 'IPCC AR6 WGI — Chapter 11 (Weather Extremes)',
      url: 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-11/',
    },
  },
  {
    id: 'permafrost-feedback',
    term: 'Permafrost thaw',
    aliases: ['thawing permafrost', 'permafrost carbon feedback'],
    short:
      'Frozen northern soils are thawing, releasing stored CO₂ and methane that add further to global warming.',
    long:
      'Arctic permafrost holds roughly twice as much carbon as currently sits in the atmosphere, locked up in frozen organic matter. As it thaws, microbes decompose that carbon and release CO₂ and methane — a self-reinforcing loop often called the permafrost carbon feedback. Parts of northern Canada, Alaska, Siberia and Scandinavia are already transitioning from carbon sinks to carbon sources.',
    appliesTo: { latitudeAbove: 55, climateHints: ['polar'] },
    source: {
      name: 'NOAA Arctic Report Card — Permafrost',
      url: 'https://arctic.noaa.gov/report-card/report-card-2023/permafrost-2023/',
    },
  },
  {
    id: 'urban-heat-island',
    term: 'Urban heat island',
    aliases: ['urban heat', 'city heat island'],
    short:
      'Concrete, asphalt and low vegetation make cities several degrees warmer than their rural surroundings, especially at night.',
    long:
      'Dense built surfaces absorb sunlight during the day and release it slowly overnight, while reduced vegetation means less evaporative cooling and shade. Large cities can run 3–7°C hotter than nearby countryside, and that baseline magnifies the health impact of every heatwave. The effect is strongest in rapidly urbanising regions of the Middle East, South Asia and Africa where summer temperatures already exceed 40°C.',
    appliesTo: { climateHints: ['urban'] },
    source: {
      name: 'EPA — Learn About Heat Islands',
      url: 'https://www.epa.gov/heatislands/learn-about-heat-islands',
    },
  },
  {
    id: 'altitude-warming',
    term: 'Elevation-dependent warming',
    aliases: ['altitude warming', 'mountain warming', 'high-altitude warming'],
    short:
      'Mountains are warming faster than lowlands as snow retreats and the atmosphere above them thins and dries.',
    long:
      'Peer-reviewed syntheses show mountain regions — the Alps, the Rockies, the Andes, the Himalayas — warming roughly 1.5–2× faster than nearby lowlands. The same snow-albedo feedback as the Arctic is at work: as the snowline retreats uphill, bare rock absorbs more solar energy. Glacier loss and changes in cloud cover amplify the effect. Switzerland, for example, has already warmed more than 2.8°C since pre-industrial times.',
    appliesTo: { climateHints: ['mountainous'] },
    source: {
      name: 'IPCC — Special Report on the Ocean & Cryosphere, Chapter 2',
      url: 'https://www.ipcc.ch/srocc/chapter/chapter-2/',
    },
  },
  {
    id: 'deforestation',
    term: 'Deforestation',
    aliases: ['forest loss', 'land-use change'],
    short:
      'Clearing forests removes their cooling effect and releases stored carbon, warming the local and global climate.',
    long:
      'Mature forests cool the land through shade and by pumping water into the air (transpiration), which forms clouds and rainfall. When forests are cleared, the exposed land heats up, rainfall patterns shift, and decades of stored carbon are released as CO₂. The Amazon, Congo Basin and South-East Asia show the starkest local effects, and Amazon deforestation now contributes measurable regional warming above the global-average signal.',
    appliesTo: { climateHints: ['forested'] },
    source: {
      name: 'MIT Climate Portal — Deforestation',
      url: 'https://climate.mit.edu/explainers/deforestation',
    },
  },
  {
    id: 'seasonal-shifts',
    term: 'Seasonal shifts',
    aliases: ['earlier spring', 'winter warming', 'shifting seasons', 'longer growing season'],
    short:
      'Winters are warming faster than summers at high latitudes, and spring is arriving earlier almost everywhere.',
    long:
      'In the Northern Hemisphere, winter average temperatures are rising 1.5–2× faster than summer averages because snow and sea-ice loss unlock the albedo feedback most strongly in the cold season. Spring is arriving roughly 2 weeks earlier than in the 1950s across much of Europe and North America, and autumn is running later. These shifts disrupt wildlife, agriculture and water supply, and mean a region’s annual-average warming can hide much bigger seasonal extremes.',
    appliesTo: { latitudeAbove: 40 },
    source: {
      name: 'EU Copernicus — European State of the Climate, Seasons',
      url: 'https://climate.copernicus.eu/esotc',
    },
  },
  {
    id: 'ocean-currents',
    term: 'Ocean-current changes',
    aliases: ['AMOC weakening', 'Gulf Stream slowdown', 'ocean circulation change'],
    short:
      'Shifting currents like the AMOC redistribute heat around the planet — a weakening can cool some regions while warming others.',
    long:
      'Ocean circulation moves vast quantities of heat around the globe. The Atlantic Meridional Overturning Circulation (AMOC) carries warm surface water north and returns cold deep water south, making north-west Europe unusually mild for its latitude. Freshwater from Greenland ice melt is slowing this circulation, and many studies find a multi-decadal weakening trend. Weakening could bring cooler, wetter UK/Ireland winters but hotter European summers, and raise sea levels along the US East Coast.',
    appliesTo: {
      regionTypes: ['country', 'us-state', 'uk-region'],
      climateHints: ['coastal'],
    },
    source: {
      name: 'Met Office — AMOC Explainer',
      url: 'https://www.metoffice.gov.uk/weather/climate-change/what-is-climate-change/amoc',
    },
  },
];

export const DRIVERS_BY_ID: Record<DriverId, WarmingDriver> = Object.fromEntries(
  WARMING_DRIVERS.map((d) => [d.id, d]),
) as Record<DriverId, WarmingDriver>;

export function findDriverByTerm(term: string): WarmingDriver | undefined {
  const t = term.trim().toLowerCase();
  return WARMING_DRIVERS.find(
    (d) => d.term.toLowerCase() === t || d.aliases.some((a) => a.toLowerCase() === t),
  );
}
