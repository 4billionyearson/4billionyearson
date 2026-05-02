/**
 * build-uk-nations.mjs
 *
 * Rebuilds public/data/uk-nations.json from ONS Open Geography Portal data,
 * using the BGC (500 m generalised, clipped to coastline) UK Countries layer.
 *
 * Run with:  node scripts/build-uk-nations.mjs
 * Requires:  Node ≥ 18
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../public/data/uk-nations.json');

const BASE = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const URL = `${BASE}/Countries_December_2023_Boundaries_UK_BGC/FeatureServer/0/query` +
  `?where=1%3D1&outFields=CTRY23CD,CTRY23NM&returnGeometry=true&outSR=4326&f=geojson&geometryPrecision=4`;

const SLUG_MAP = {
  'England':          'england',
  'Wales':            'wales',
  'Scotland':         'scotland',
  'Northern Ireland': 'northern-ireland',
};

async function main() {
  console.log('Fetching UK Countries from ONS…');
  const res = await fetch(URL, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`ONS fetch failed: ${res.status}`);
  const data = await res.json();
  if (!data.features?.length) throw new Error('No features returned');
  console.log(`  Got ${data.features.length} features`);

  const features = data.features.map(f => {
    const name = f.properties.CTRY23NM;
    const slug = SLUG_MAP[name];
    if (!slug) throw new Error(`Unexpected country name: ${name}`);
    console.log(`  ${name} → ${slug} (${f.geometry.type})`);
    return { type: 'Feature', properties: { name, slug }, geometry: f.geometry };
  });

  const geojson = { type: 'FeatureCollection', features };
  await writeFile(OUT_PATH, JSON.stringify(geojson));
  console.log(`\n✅ Written ${features.length} features to ${OUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
