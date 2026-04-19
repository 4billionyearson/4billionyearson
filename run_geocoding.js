const fs = require('fs');
const https = require('https');

const sites = JSON.parse(fs.readFileSync('sites.json', 'utf8'));
const geoMap = {};

function geocode(address, name) {
  return new Promise((resolve) => {
    let query = address || name;
    if (query.includes('Mega Site Nissan Parkway')) query = 'Canton, Mississippi';
    if (query.includes('Goodyear, Arizona')) query = 'Goodyear, AZ';
    if (query.includes('Al Dhafrah')) query = 'Abu Dhabi, UAE';
    if (query.includes('Zhangbei Yun')) query = 'Zhangbei, Hebei, China';
    query = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
    https.get(url, { headers: { 'User-Agent': '4billionyearson-app/1.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results && results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) });
          } else {
            console.log(`Failed to geocode: ${name} (${address})`);
            resolve(null);
          }
        } catch (e) { console.log(`Parse error on ${name}`); resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  for (const s of sites) {
    if (!geoMap[s.name]) {
      const geo = await geocode(s.address, s.name);
      if (geo) {
        geoMap[s.name] = geo;
      }
      await new Promise(r => setTimeout(r, 1200)); // 1.2s delay for Nominatim rules
    }
  }
  fs.writeFileSync('public/data/ai-datacenters-geo.json', JSON.stringify(geoMap, null, 2));
  console.log("Geocoding complete. Sites total:", Object.keys(geoMap).length);
})();
