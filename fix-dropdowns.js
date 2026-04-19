const fs = require('fs');

// ENERGY DASHBOARD
let energy = fs.readFileSync('src/app/energy-dashboard/page.tsx', 'utf8');
energy = energy.replace(
  /<div className="relative z-10 rounded-2xl shadow-xl border-2 border-\[#D2E369\] overflow-hidden" style=\{\{ background: "linear-gradient\(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px\)" \}\}>/,
  '<div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369]" style={{ background: "linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)" }}>'
);
// Ensure children have radii since overflow-hidden is gone
energy = energy.replace(
  /<div className="px-4 py-3 md:px-6 md:py-4" style=\{\{ backgroundColor: '#D2E369' \}\}>/,
  '<div className="px-4 py-3 md:px-6 md:py-4 rounded-t-[14px]" style={{ backgroundColor: \'#D2E369\' }}>'
);
energy = energy.replace(
  /<div className="bg-gray-950\/90 backdrop-blur-md p-4">/,
  '<div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-b-[14px]">'
);
fs.writeFileSync('src/app/energy-dashboard/page.tsx', energy);

// CLIMATE DASHBOARD
let climate = fs.readFileSync('src/app/climate-dashboard/page.tsx', 'utf8');
climate = climate.replace(
  /<div className="relative z-10 rounded-2xl shadow-xl border-2 border-\[#D0A65E\]">/,
  '<div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D0A65E]" style={{ background: "linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)" }}>'
);
climate = climate.replace(
  /<div className="px-4 py-3 md:px-6 md:py-4 rounded-t-2xl"/,
  '<div className="px-4 py-3 md:px-6 md:py-4 rounded-t-[14px]"'
);
climate = climate.replace(
  /<div className="bg-gray-950\/90 backdrop-blur-md p-4 rounded-b-2xl">/,
  '<div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-b-[14px]">'
);
fs.writeFileSync('src/app/climate-dashboard/page.tsx', climate);

console.log('Fixed dropdowns overlay / radii');
