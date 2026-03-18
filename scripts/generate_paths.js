// Pre-compute US state SVG paths from GeoJSON using d3-geo
// This eliminates client-side d3-geo projection issues
const fs = require("fs");
const d3 = require("d3-geo");

const geo = JSON.parse(fs.readFileSync("public/data/us-states.json", "utf-8"));
const projection = d3.geoAlbersUsa().fitSize([960, 600], geo);
const pathGen = d3.geoPath().projection(projection);

const statePaths = {};
for (const feature of geo.features) {
  const name = feature.properties && feature.properties.name;
  if (!name) continue;
  const d = pathGen(feature);
  if (d) {
    statePaths[name] = d;
  } else {
    console.warn("No path for:", name);
  }
}

console.log("Generated paths for", Object.keys(statePaths).length, "states");
fs.writeFileSync(
  "public/data/us-state-paths.json",
  JSON.stringify(statePaths, null, 0)
);
console.log("Written to public/data/us-state-paths.json");
