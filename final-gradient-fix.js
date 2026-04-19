const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/app/**/*.tsx');

let changed = 0;

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  // Remove the old ring-2 fix we deployed that didn't work perfectly
  c = c.replace(/ ring-2 ring-inset ring-\[(#[A-Za-z0-9]+)\]/g, '');

  if (f.includes('navigation-hub.tsx')) {
    // Only target the SectionCard specifically, we already patched it earlier but let's be sure it's 20px
    c = c.replace(
      /style=\{\{ borderColor: c, background: `linear-gradient\(to bottom, \$\{c\} 0%, \$\{c\} 60px, transparent 60px\)`/g,
      "style={{ borderColor: c, background: `linear-gradient(to bottom, ${c} 0%, ${c} 20px, transparent 20px)`"
    );
    // AND remove the inset box shadow we added to the accordion elements
    c = c.replace(/boxShadow: 'inset 0 0 0 2px ' \+ c/g, "");
    c = c.replace(/, boxShadow: 'inset 0 0 0 2px ' \+ c \}\}/g, " }}");
    c = c.replace(/style=\{\{ backgroundColor: c,  \}\}/g, "style={{ backgroundColor: c }}"); 
  } else {
    // For all the other cards/banners
    let nextC = c.replace(
      /(<div className="[^"]*rounded-2xl border-2 border-\[(#[A-Za-z0-9]+)\][^"]*)"(>)\s*(<div className="[^"]*" style=\{\{\s*backgroundColor:\s*["'][^"']+["']\s*\}\}>)/g,
      (match, p1, color, p3, p4) => {
         return `${p1}" style={{ background: 'linear-gradient(to bottom, ${color} 0%, ${color} 20px, transparent 20px)' }}${p3}\n            ${p4}`;
      }
    );
    c = nextC;
  }

  // Energy Dashboard had a manual fix that we need to revert
  if (f.includes('energy-dashboard/page.tsx')) {
    c = c.replace(
      /<div className="relative z-10 rounded-2xl shadow-xl flex flex-col">/,
      '<div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369]" style={{ background: "linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, Math.min(20px, 100%))" }}>'
    );
    // Remove border-2 etc from inner divs that I put manually
    c = c.replace(/ rounded-t-2xl border-2 border-\[#D2E369\] border-b-0/g, '');
    c = c.replace(/ rounded-b-2xl border-2 border-\[#D2E369\] border-t-0 hover-z-overlap/g, '');
  }

  if (c !== fs.readFileSync(f, 'utf8')) {
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
    changed++;
  }
});
console.log('Total fixed:', changed);
