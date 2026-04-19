const http = require('http');

http.get('http://localhost:3000/api/ai', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log("Sites count:", json.frontierDataCenters?.length);
    if (json.frontierDataCenters?.length > 0) {
      console.log("First site:", json.frontierDataCenters[0]);
    }
  });
}).on('error', err => console.error(err));
