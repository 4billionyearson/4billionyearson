const fs = require('fs');
let c = fs.readFileSync('src/app/energy-dashboard/page.tsx', 'utf8');

c = c.replace(
  /Math\.min\(20px, 100\%\)/g,
  'transparent 20px'
);

c = c.replace(
  '<div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369]" style={{ background: "linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)" }}>',
  '<div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369] overflow-hidden" style={{ background: "linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)" }}>'
);

fs.writeFileSync('src/app/energy-dashboard/page.tsx', c);
