const fs = require('fs');

let c = fs.readFileSync('src/app/energy-dashboard/page.tsx', 'utf8');

c = c.replace(
  '<div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369]">',
  '<div className="relative z-10 rounded-2xl shadow-xl flex flex-col">'
);

c = c.replace(
  '<div className="px-4 py-3 md:px-6 md:py-4 rounded-t-2xl ring-2 ring-inset ring-[#D2E369]" style={{ backgroundColor: \'#D2E369\' }}>',
  '<div className="px-4 py-3 md:px-6 md:py-4 rounded-t-2xl border-2 border-[#D2E369] border-b-0" style={{ backgroundColor: \'#D2E369\' }}>'
);

c = c.replace(
  '<div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-b-2xl">',
  '<div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-b-2xl border-2 border-[#D2E369] border-t-0 hover-z-overlap">' // Wait, let's just make it border-t-0. Will they overlap if there's flex? Yes.
);

fs.writeFileSync('src/app/energy-dashboard/page.tsx', c);
console.log('Fixed energy dashboard manually.');
