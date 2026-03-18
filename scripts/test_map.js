const d3 = require('d3-geo');
const fs = require('fs');
const geo = JSON.parse(fs.readFileSync('public/data/us-states.json','utf8'));

// Test with fitSize
const proj1 = d3.geoAlbersUsa().fitSize([960,600], geo);
const pathGen1 = d3.geoPath().projection(proj1);

// Test with manual scale/translate 
const proj2 = d3.geoAlbersUsa().scale(1300).translate([480,300]);
const pathGen2 = d3.geoPath().projection(proj2);

// Compare a few states
for (const name of ['California','Texas','New York','Florida','Washington','Colorado','Wisconsin','West Virginia']) {
  const f = geo.features.find(x => x.properties.name === name);
  const p1 = pathGen1(f);
  const p2 = pathGen2(f);
  const bbox1 = p1 ? pathGen1.bounds(f) : null;
  const bbox2 = p2 ? pathGen2.bounds(f) : null;
  console.log(name + ':');
  console.log('  fitSize path length:', p1 ? p1.length : 0, 'bounds:', JSON.stringify(bbox1));
  console.log('  manual  path length:', p2 ? p2.length : 0, 'bounds:', JSON.stringify(bbox2));
}

// Check overall scale
console.log('fitSize projection scale:', proj1.scale());
console.log('fitSize projection translate:', proj1.translate());
console.log('manual projection scale:', proj2.scale());
console.log('manual projection translate:', proj2.translate());
