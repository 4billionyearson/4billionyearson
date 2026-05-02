/**
 * build-scotland-subregions.mjs
 *
 * Downloads Scottish council-area (LAD) boundaries from the ONS Open Geography
 * Portal and dissolves them into the three Met Office climate sub-regions:
 *   scotland-north   (Highlands, Western Isles, Orkney, Shetland)
 *   scotland-east    (east/central belt)
 *   scotland-west    (west / south-west)
 *
 * Then rewrites public/data/uk-regions.json, replacing the single "Scotland"
 * polygon with the three sub-region polygons.
 *
 * Run with:  node scripts/build-scotland-subregions.mjs
 * Requires:  Node ≥ 18 (native fetch)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../public/data/uk-regions.json');

// ─── Met Office region → Set of ONS LAD23NM values ───────────────────────────
// Source: Met Office climate districts documentation
// https://www.metoffice.gov.uk/research/climate/maps-and-data/uk-climate-averages

const REGION_MAP = {
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
  'scotland-north': 'Scotland North',
  'scotland-east': 'Scotland East',
  'scotland-west': 'Scotland West',
};

// ONS Open Geography Portal – Scottish Council Areas (December 2023, simplified 500m)
// BNG-projected shapefiles converted to WGS84 GeoJSON via the portal's query API.
// We request all Scottish LADs (country code S) via the FeatureServer.
const ONS_URL =
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2023_Boundaries_UK_BSC/FeatureServer/0/query?where=LAD23CD+LIKE+%27S%25%27&outFields=LAD23CD,LAD23NM&outSR=4326&f=geojson&returnGeometry=true&geometryPrecision=4';

// ─── Simple polygon union via coordinate collection ───────────────────────────
// We don't have turf, so we collect all polygon coordinate rings from all
// features in a group and emit a MultiPolygon. This isn't a true topological
// dissolve but it works fine for rendering purposes (Leaflet handles
// MultiPolygon fills correctly, internal shared edges don't visually matter).

function featureToRings(feature) {
  const geom = feature.geometry;
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
    const rings = featureToRings(f);
    // Each ring becomes its own Polygon entry in the MultiPolygon
    for (const ring of rings) coords.push([ring]);
  }
  return { type: 'MultiPolygon', coordinates: coords };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching Scottish council area boundaries from ONS…');
  const res = await fetch(ONS_URL, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`ONS fetch failed: ${res.status} ${res.statusText}`);
  const data = await res.json();

  const features = data.features;
  if (!features?.length) throw new Error('No features returned from ONS');

  console.log(`  Got ${features.length} Scottish council area features`);

  // Group features by Met Office sub-region
  const groups = { 'scotland-north': [], 'scotland-east': [], 'scotland-west': [] };
  const unmatched = [];

  for (const f of features) {
    const nm = f.properties.LAD23NM;
    let matched = false;
    for (const [slug, nameSet] of Object.entries(REGION_MAP)) {
      if (nameSet.has(nm)) {
        groups[slug].push(f);
        matched = true;
        break;
      }
    }
    if (!matched) unmatched.push(nm);
  }

  if (unmatched.length > 0) {
    console.warn('  ⚠ Unmatched council areas (not assigned to any sub-region):', unmatched);
  }

  for (const [slug, feats] of Object.entries(groups)) {
    console.log(`  ${REGION_NAMES[slug]}: ${feats.length} council areas`);
  }

  // Build new sub-region GeoJSON features
  const newScotlandFeatures = Object.entries(groups).map(([slug, feats]) => ({
    type: 'Feature',
    properties: { slug, name: REGION_NAMES[slug] },
    geometry: buildMultiPolygon(feats),
  }));

  // Load existing uk-regions.json and replace the single Scotland entry
  console.log('\nUpdating uk-regions.json…');
  const existing = JSON.parse(await readFile(OUT_PATH, 'utf8'));

  // Remove any existing Scotland or sub-region features, keep everything else
  const SCOTLAND_SLUGS = new Set(['scotland', 'scotland-north', 'scotland-east', 'scotland-west']);
  const otherFeatures = existing.features.filter(
    (f) => !SCOTLAND_SLUGS.has(f.properties?.slug),
  );

  const updated = {
    ...existing,
    features: [...otherFeatures, ...newScotlandFeatures],
  };

  await writeFile(OUT_PATH, JSON.stringify(updated));
  console.log(`✅ Written ${updated.features.length} features to ${OUT_PATH}`);
  console.log('   Features:');
  for (const f of updated.features) {
    console.log(`   - ${f.properties.slug} (${f.properties.name})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
