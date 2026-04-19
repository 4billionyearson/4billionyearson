const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/**/*.tsx');
let changed = 0;

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  // 1. Remove the old ring-2 patch
  c = c.replace(/ ring-2 ring-inset ring-\[(#[A-Za-z0-9]+)\]/g, '');

  if (f.includes('navigation-hub.tsx')) {
    c = c.replace(
      /background: `linear-gradient\(to bottom, \$\{c\} 0%, \$\{c\} 60px, transparent 60px\)`/g,
      "background: `linear-gradient(to bottom, ${c} 0%, ${c} 20px, transparent 20px)`"
    );
    c = c.replace(/, boxShadow: 'inset 0 0 0 2px ' \+ c/g, "");
    c = c.replace(/boxShadow: 'inset 0 0 0 2px ' \+ c, /g, "");
    c = c.replace(/style=\{\{\s*backgroundColor:\s*c,\s*\}\}/g, "style={{ backgroundColor: c }}");
    c = c.replace(/style=\{\{\s*backgroundColor:\s*c\s*\}\}/g, "style={{ backgroundColor: c }}"); // normalize
  } else {
    // Other files: add background linear-gradient to the outer wrapper.
    // We match: <div className="... border-[#COLOR] ... overflow-hidden">
    // And inject: style={{ background: 'linear-gradient(to bottom, #COLOR 0%, #COLOR 20px, transparent 20px)' }}
    const regex = /(<div className="[^"]*rounded-2xl[^"]*border-\[(#[A-Za-z0-9]+)\][^"]*overflow-hidden)"(>)/g;
    c = c.replace(regex, (match, prefix, color, suffix) => {
      // Don't duplicate if already injected
      if (prefix.includes('style={{ background:')) return match;
      return `${prefix}" style={{ background: 'linear-gradient(to bottom, ${color} 0%, ${color} 20px, transparent 20px)' }}${suffix}`;
    });
  }

  // Energy Dashboard had a manual fix that we need to revert
  if (f.includes('energy-dashboard/page.tsx')) {
    c = c.replace(
      /<div className="relative z-10 rounded-2xl shadow-xl flex flex-col">/,
      '<div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369] overflow-hidden" style={{ background: "linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)" }}>'
    );
    c = c.replace(/ rounded-t-2xl border-2 border-\[#D2E369\] border-b-0" style=\{\{ backgroundColor: '#D2E369' \}\}/g, '" style={{ backgroundColor: \'#D2E369\' }}');
    c = c.replace(/ rounded-b-2xl border-2 border-\[#D2E369\] border-t-0 hover-z-overlap/g, '');
  }

  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
    changed++;
  }
});
console.log('Total fixed:', changed);
