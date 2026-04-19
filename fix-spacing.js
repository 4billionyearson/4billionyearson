const fs = require('fs');

let c = fs.readFileSync('src/app/energy-dashboard/page.tsx', 'utf8');

c = c.replace(
  /<div className="absolute z-50 w-full mt-1 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">/,
  '<div className="absolute z-50 w-full mt-2 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">'
);

c = c.replace(
  /className="w-full text-left px-4 py-2\.5 hover:bg-gray-800 text-sm text-gray-200 border-b border-gray-800 last:border-0 transition-colors flex items-center gap-2"/g,
  'className="w-full text-left px-4 py-3 hover:bg-gray-800 text-sm text-gray-200 border-b border-gray-800 last:border-0 transition-colors flex items-center gap-2"'
);

fs.writeFileSync('src/app/energy-dashboard/page.tsx', c);
