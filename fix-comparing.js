const fs = require('fs');

let c = fs.readFileSync('src/app/energy-dashboard/page.tsx', 'utf8');

c = c.replace(
  '<span className="text-sm font-medium">\n                    {usStateData\n                      ? `Comparing ${usStateData.name} with United States`\n                      : `Comparing with ${countryData?.name}`}\n                  </span>',
  '<span className="text-sm font-medium">\n                    {usStateData\n                      ? `${usStateData.name} vs United States`\n                      : countryData?.name}\n                  </span>'
);

fs.writeFileSync('src/app/energy-dashboard/page.tsx', c);
