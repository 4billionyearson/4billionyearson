/**
 * build-uk-regions.mjs
 *
 * Rebuilds public/data/uk-regions.json from ONS Open Geography Portal data.
 * Produces 10 Met Office climate district polygons matching the reference map at
 * https://www.metoffice.gov.uk/research/climate/maps-and-data/uk-climate-averages
 *
 *  England:         9 ONS Regions → merged into 6 Met Office districts
 *  Wales:           22 ONS LADs   → split into North Wales (→ england-nw-and-north-wales)
 *                                          and South Wales (→ england-sw-and-south-wales)
 *  Northern Ireland: all NI LADs  → 1 region (northern-ireland)
 *  Scotland:        32 ONS LADs   → 3 sub-regions (scotland-north/east/west)
 *
 * All geometries come from ONS BGC (500 m generalised, clipped to coastline).
 *
 * Run with:  node scripts/build-uk-regions.mjs
 * Requires:  Node ≥ 18 (native fetch)
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../public/data/uk-regions.json');

// ─── ONS Region codes → Met Office climate district ──────────────────────────
// ONS Regions 2023 (England only, 9 regions)
const ONS_REGION_TO_METOFFICE = {
  'E12000001': 'england-east-and-north-east',  // North East England
  'E12000002': 'england-nw-and-north-wales',   // North West England
  'E12000003': 'england-east-and-north-east',  // Yorkshire and The Humber
  'E12000004': 'midlands',                      // East Midlands
  'E12000005': 'midlands',                      // West Midlands
  'E12000006': 'east-anglia',                   // East of England
  'E12000007': 'england-se-central-south',      // London
  'E12000008': 'england-se-central-south',      // South East England
  'E12000009': 'england-sw-and-south-wales',    // South West England
};

// Wales LAD codes for North Wales (→ england-nw-and-north-wales)
// The 6 northernmost Welsh unitary authorities align with the Met Office N Wales boundary
const NORTH_WALES_LAD_CODES = new Set([
  'W06000001', // Isle of Anglesey
  'W06000002', // Gwynedd
  'W06000003', // Conwy
  'W06000004', // Denbighshire
  'W06000005', // Flintshire
  'W06000006', // Wrexham
]);
// All other Welsh LADs (W06000007–W06000024) → england-sw-and-south-wales

// Scotland: Met Office sub-region → Set of ONS LAD23NM values
const SCOTLAND_REGION_MAP = {
  'scotland-north': new Set([
    'Highland',
    'Na h-Eileanan Siar',
    'Orkney Islands',
    'Shetland Islands',
  ]),
  'scotland-east': new Set([
    'Aberdeen City',
    'Aberdeenshire',
    'Angus',
    'City of Edinburgh',
    'Clackmannanshire',
    'Dundee City',
    'East Lothian',
    'Falkirk',
    'Fife',
    'Midlothian',
    'Moray',
    'Perth and Kinross',
    'Scottish Borders',
    'Stirling',
    'West Lothian',
  ]),
  'scotland-west': new Set([
    'Argyll and Bute',
    'Dumfries and Galloway',
    'East Ayrshire',
    'East Dunbartonshire',
    'East Renfrewshire',
    'Glasgow City',
    'Inverclyde',
    'North Ayrshire',
    'North Lanarkshire',
    'Renfrewshire',
    'South Ayrshire',
    'South Lanarkshire',
    'West Dunbartonshire',
  ]),
};

const REGION_NAMES = {
  'england-east-and-north-east': 'England East & North East',
  'england-nw-and-north-wales':  'England NW & North Wales',
  'midlands':                    'Midlands',
  'east-anglia':                 'East Anglia',
  'england-se-central-south':    'England SE & Central South',
  'england-sw-and-south-wales':  'England SW & South Wales',
  'northern-ireland':            'Northern Ireland',
  'scotland-north':              'Scotland North',
  'scotland-east':               'Scotland East',
  'scotland-west':               'Scotland West',
};

// ─── ONS Open Geography Portal endpoints ─────────────────────────────────────
// All use BGC (500 m generalised, clipped to coastline), WGS84, GeoJSON
const BASE = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const PRECISION = 'geometryPrecision=4';

const ENGLAND_REGIONS_URL =
  `${BASE}/Regions_December_2023_Boundaries_EN_BGC/FeatureServer/0/query` +
  `?where=1%3D1&outFields=RGN23CD,RGN23NM&returnGeometry=true&outSR=4326&f=geojson&${PRECISION}`;

const UK_LADS_URL = (countryPrefix) =>
  `${BASE}/Local_Authority_Districts_December_2023_Boundaries_UK_BSC/FeatureServer/0/query` +
  `?where=LAD23CD+LIKE+%27${countryPrefix}%25%27&outFields=LAD23CD,LAD23NM&returnGeometry=true&outSR=4326&f=geojson&${PRECISION}`;

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function featureToRings(feature) {
  const geom = feature.geometry;
  if (!geom) return [];
  const rings = [];
  if (geom.type === 'Polygon') {
    rings.push(...geom.coordinates);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) rings.push(...poly);
  }
  return rings;
}

function buildMultiPolygon(features) {
  const coords = [];
  for (const f of features) {
    for (const ring of featureToRings(f)) {
      coords.push([ring]);
    }
  }
  if (coords.length === 0) {
    throw new Error('buildMultiPolygon called with no geometry');
  }
  return { type: 'MultiPolygon', coordinates: coords };
}

function makeFeature(slug, features) {
  return {
    type: 'Feature',
    properties: { slug, name: REGION_NAMES[slug] },
    geometry: buildMultiPolygon(features),
  };
}

// Append rings from additional features into an existing MultiPolygon feature
function appendRings(existingFeature, additionalFeatures) {
  for (const f of additionalFeatures) {
    for (const ring of featureToRings(f)) {
      existingFeature.geometry.coordinates.push([ring]);
    }
  }
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────
async function fetchONS(url, label) {
  console.log(`  Fetching ${label}…`);
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`ONS fetch failed for ${label}: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!data.features?.length) throw new Error(`No features returned for ${label}`);
  console.log(`    ✓ ${data.features.length} features`);
  return data.features;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Building UK Met Office climate region GeoJSON from ONS data…\n');

  // ── 1. England: ONS Regions → 6 Met Office districts ──────────────────────
  console.log('England regions:');
  const englandFeatures = await fetchONS(ENGLAND_REGIONS_URL, 'England ONS Regions');

  // Group by Met Office slug and build MultiPolygon features
  const englandGroups = {};
  for (const f of englandFeatures) {
    const code = f.properties.RGN23CD;
    const slug = ONS_REGION_TO_METOFFICE[code];
    if (!slug) {
      console.warn(`  ⚠ Unmatched England region code: ${code} (${f.properties.RGN23NM})`);
      continue;
    }
    if (!englandGroups[slug]) englandGroups[slug] = [];
    englandGroups[slug].push(f);
  }

  // Build England features (North Wales and South Wales will be appended later)
  const englandResultFeatures = {};
  for (const [slug, feats] of Object.entries(englandGroups)) {
    console.log(`    ${REGION_NAMES[slug]}: ${feats.length} ONS region(s)`);
    englandResultFeatures[slug] = makeFeature(slug, feats);
  }

  // ── 2. Wales: LADs split into North / South ────────────────────────────────
  console.log('\nWales LADs:');
  const walesFeatures = await fetchONS(UK_LADS_URL('W'), 'Wales LADs');

  const northWalesLADs = walesFeatures.filter(f => NORTH_WALES_LAD_CODES.has(f.properties.LAD23CD));
  const southWalesLADs = walesFeatures.filter(f => !NORTH_WALES_LAD_CODES.has(f.properties.LAD23CD));
  console.log(`    North Wales (→ NW & N Wales): ${northWalesLADs.length} LADs`);
  console.log(`    South Wales (→ SW & S Wales): ${southWalesLADs.length} LADs`);

  // Append Wales rings into the relevant England features
  appendRings(englandResultFeatures['england-nw-and-north-wales'], northWalesLADs);
  appendRings(englandResultFeatures['england-sw-and-south-wales'], southWalesLADs);

  // ── 3. Northern Ireland: all NI LADs merged ────────────────────────────────
  console.log('\nNorthern Ireland:');
  const niFeatures = await fetchONS(UK_LADS_URL('N'), 'Northern Ireland LADs');
  const niResultFeature = makeFeature('northern-ireland', niFeatures);
  console.log(`    Northern Ireland: ${niFeatures.length} LADs`);

  // ── 4. Scotland: LADs dissolved into N/E/W sub-regions ────────────────────
  console.log('\nScotland sub-regions:');
  const scotlandFeatures = await fetchONS(UK_LADS_URL('S'), 'Scotland LADs');

  const scotGroups = { 'scotland-north': [], 'scotland-east': [], 'scotland-west': [] };
  const unmatched = [];
  for (const f of scotlandFeatures) {
    const nm = f.properties.LAD23NM;
    let matched = false;
    for (const [slug, nameSet] of Object.entries(SCOTLAND_REGION_MAP)) {
      if (nameSet.has(nm)) { scotGroups[slug].push(f); matched = true; break; }
    }
    if (!matched) unmatched.push(nm);
  }
  if (unmatched.length > 0) {
    console.warn('  ⚠ Unmatched Scottish council areas:', unmatched);
  }
  const scotlandResultFeatures = {};
  for (const [slug, feats] of Object.entries(scotGroups)) {
    console.log(`    ${REGION_NAMES[slug]}: ${feats.length} council areas`);
    scotlandResultFeatures[slug] = makeFeature(slug, feats);
  }

  // ── 5. Assemble in display order ───────────────────────────────────────────
  const allFeatures = [
    englandResultFeatures['england-east-and-north-east'],
    englandResultFeatures['england-nw-and-north-wales'],
    englandResultFeatures['midlands'],
    englandResultFeatures['east-anglia'],
    englandResultFeatures['england-se-central-south'],
    englandResultFeatures['england-sw-and-south-wales'],
    niResultFeature,
    scotlandResultFeatures['scotland-north'],
    scotlandResultFeatures['scotland-east'],
    scotlandResultFeatures['scotland-west'],
  ].filter(Boolean);

  const geojson = { type: 'FeatureCollection', features: allFeatures };
  await writeFile(OUT_PATH, JSON.stringify(geojson));

  console.log(`\n✅ Written ${allFeatures.length} features to ${OUT_PATH}`);
  for (const f of allFeatures) {
    const rings = f.geometry.coordinates.length;
    console.log(`   - ${f.properties.slug} (${f.properties.name}) — ${rings} polygon(s)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
