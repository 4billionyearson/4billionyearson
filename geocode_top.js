const fs = require('fs');
const https = require('https');

function parseCSVRecords(text) {
  const result = [];
  let row = [];
  let inQuote = false;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === ',' && !inQuote) { row.push(cur.trim()); cur = ''; continue; }
    if (c === '\n' && !inQuote) { row.push(cur.trim()); result.push(row); row = []; cur = ''; continue; }
    cur += c;
  }
  if (cur || row.length) { row.push(cur.trim()); result.push(row); }
  return result;
}

https.get('https://epoch.ai/data/data_centers/data_centers.csv', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const rows = parseCSVRecords(d);
    const h = rows[0];
    const nameo = h.indexOf('Name');
    const poweo = h.indexOf('Current power (MW)');
    const addo = h.indexOf('Address');
    const counto = h.indexOf('Country');
    
    let sites = rows.slice(1).map(r => ({
      name: r[nameo] || '',
      power: parseFloat(r[poweo]) || 0,
      address: r[addo] || '',
      country: r[counto] || ''
    })).filter(s => s.name);
    
    fs.writeFileSync('sites.json', JSON.stringify(sites, null, 2));
    console.log(sites.length);
  });
});
