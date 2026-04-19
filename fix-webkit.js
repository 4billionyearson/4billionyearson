const fs = require('fs');
const files = require('glob').sync('src/app/**/*.tsx');
let changed = 0;
for (let f of files) {
  let c = fs.readFileSync(f, 'utf8');
  let o = c;
  c = c.replace(/ ring-2 ring-inset ring-\[#[a-fA-F0-9]+\]/g, '');
  if (f.includes('navigation-hub.tsx')) {
    c = c.replace(/background: `linear-gradient\(to bottom, \$\{c\} 0%, \$\{c\} 60px, transparent 60px\)`/g, "background: `linear-gradient(to bottom, ${c} 0%, ${c} 20px, transparent 20px)`");
    c = c.replace(/, boxShadow: 'inset 0 0 0 2px ' \+ c/g, "");
    c = c.replace(/boxShadow: 'inset 0 0 0 2px ' \+ c, /g, "");
    c = c.replace(/style=\{\{\s*backgroundColor:\s*c,\s*\}\}/g, "style={{ backgroundColor: c }}");
  } else {
    c = c.replace(/(<div className="[^"]*rounded-2xl[^"]*border-\[(#[a-fA-F0-9]+)\][^"]*overflow-hidden)"(>)/g, (m, p1, col, p3) => {
      return p1 + `" style={{ background: 'linear-gradient(to bottom, ${col} 0%, ${col} 20px, transparent 20px)' }}` + p3;
    });
  }
  if (f.includes('energy-dashboard/page.tsx')) {
    c = c.replace(/className="relative z-10 rounded-2xl shadow-xl flex flex-col"/, 'className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369] overflow-hidden" style={{ background: "linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)" }}');
    c = c.replace(/ rounded-t-2xl border-2 border-\[#D2E369\] border-b-0/g, '');
    c = c.replace(/ rounded-b-2xl border-2 border-\[#D2E369\] border-t-0 hover-z-overlap/g, '');
  }
  if (c !== o) { fs.writeFileSync(f, c); changed++; }
}
console.log('Fixed', changed);
