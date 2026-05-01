#!/usr/bin/env node
/**
 * Build approximate Met-Office-style UK climate sub-region polygons
 * (`public/data/uk-regions.json`) by aggregating ONS International Territorial
 * Level 1 (ITL1, formerly NUTS1) boundaries.
 *
 * Output is a GeoJSON FeatureCollection where every feature carries a `slug`
 * matching the slugs in `rankings.json` (groups: ukRegions). Slugs covered:
 *   - east-anglia
 *   - england-east-and-north-east
 *   - england-nw-and-north-wales        (approx: NW England + all of Wales)
 *   - england-se-central-south
 *   - england-sw-and-south-wales        (approx: SW England only — Wales lives
 *                                        in NW slot above to avoid overlap)
 *   - midlands
 *   - scotland (single polygon — sub-Scottish council-area splits would need a
 *               richer boundary file; map falls back to the 4-nation overlay
 *               for scotland-east / west / north tooltips)
 *   - wales (single polygon — placed under NW slot above; not a separate
 *            feature because Met Office regions overlap with English ones)
 *   - northern-ireland (informational only — not a Met Office sub-region)
 *
 * Source: ONS Open Geography Portal (Open Government Licence v3.0).
 *   ITL1 (Jan 2021) Boundaries UK BUC
 *   https://geoportal.statistics.gov.uk/datasets/ons::international-territorial-level-1-january-2021-uk-buc-2/
 *
 * Aggregation uses turf @turf/union so we depend on @turf/turf at runtime.
 * If turf is not installed we fall back to outputting one feature per ITL1
 * region tagged with the climate slug — leaflet still renders fine but you
 * see ITL1 boundaries inside (e.g. a line between East Midlands & West
 * Midlands inside the "midlands" feature).
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'data', 'uk-regions.json');

// ITL1 January 2021 — BUC (Boundary Ultra-Generalised Clipped, ~500m resolution).
// Returns a FeatureCollection with ITL121CD + ITL121NM properties per region.
const ITL1_URL =
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/' +
  'International_Territorial_Level_1_January_2021_UK_BUC_2022/FeatureServer/0/query' +
  '?where=1%3D1&outFields=ITL121CD,ITL121NM&f=geojson&outSR=4326';

// ITL1 code → 4BYO Met Office sub-region slug.
// Wales (TLL) & Scotland (TLM) intentionally map to single super-regions because
// our ITL1 source has no sub-Welsh / sub-Scottish geometry. Northern Ireland
// is included so the choropleth fills the whole UK landmass.
const ITL1_TO_SLUG = {
  TLC: 'england-east-and-north-east', // North East
  TLD: 'england-nw-and-north-wales',  // North West
  TLE: 'england-east-and-north-east', // Yorkshire and The Humber
  TLF: 'midlands',                    // East Midlands
  TLG: 'midlands',                    // West Midlands
  TLH: 'east-anglia',                 // East of England
  TLI: 'england-se-central-south',    // London
  TLJ: 'england-se-central-south',    // South East
  TLK: 'england-sw-and-south-wales',  // South West
  TLL: 'england-nw-and-north-wales',  // Wales (assigned to NW slot to avoid SW overlap)
  TLM: 'scotland',                    // Scotland (single polygon)
  TLN: 'northern-ireland',            // Northern Ireland
};

const SLUG_LABELS = {
  'east-anglia': 'East Anglia',
  'england-east-and-north-east': 'England East & North East',
  'england-nw-and-north-wales': 'England NW & North Wales',
  'england-se-central-south': 'England SE & Central South',
  'england-sw-and-south-wales': 'England SW & South Wales',
  'midlands': 'Midlands',
  'scotland': 'Scotland',
  'northern-ireland': 'Northern Ireland',
};

async function loadTurfUnion() {
  try {
    const turf = await import('@turf/turf');
    return turf.union ?? null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('Fetching ITL1 boundaries from ONS …');
  const res = await fetch(ITL1_URL, { headers: { 'User-Agent': '4byo-build-script' } });
  if (!res.ok) throw new Error(`ITL1 fetch failed: ${res.status} ${res.statusText}`);
  const fc = await res.json();
  if (!fc.features?.length) throw new Error('ITL1 response had no features');
  console.log(`  → ${fc.features.length} ITL1 features`);

  // Group by slug.
  const bySlug = new Map();
  for (const f of fc.features) {
    const code = f.properties?.ITL121CD;
    const slug = ITL1_TO_SLUG[code];
    if (!slug) {
      console.warn(`  · skipping unknown ITL1 code ${code}`);
      continue;
    }
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(f);
  }

  const union = await loadTurfUnion();
  if (!union) {
    console.warn('  · @turf/turf not installed — emitting one feature per ITL1 region (visual seams between joined regions)');
  }

  const features = [];
  for (const [slug, parts] of bySlug.entries()) {
    if (parts.length === 1 || !union) {
      for (const p of parts) {
        features.push({
          type: 'Feature',
          properties: { slug, name: SLUG_LABELS[slug] ?? slug },
          geometry: p.geometry,
        });
      }
      continue;
    }
    // Union all parts of this slug into a single MultiPolygon.
    let merged = parts[0];
    for (let i = 1; i < parts.length; i++) {
      try {
        merged = union(merged, parts[i]) ?? merged;
      } catch (e) {
        console.warn(`  · union failed for slug=${slug} part ${i}: ${e.message}`);
      }
    }
    features.push({
      type: 'Feature',
      properties: { slug, name: SLUG_LABELS[slug] ?? slug },
      geometry: merged.geometry,
    });
  }

  const output = { type: 'FeatureCollection', features };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(output));
  console.log(`✔ wrote ${features.length} features → ${path.relative(process.cwd(), OUT)}`);
  console.log('  slugs:', [...bySlug.keys()].join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
