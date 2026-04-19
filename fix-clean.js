const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/app/**/*.tsx');
let changed = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  // Fix md:py-4ring-1 -> md:py-4 ring-2 (switch to ring-2 just to strictly cover 2px border gaps)
  c = c.replace(/md:py-(\d+)ring-1 ring-inset ring-\[(#[A-Za-z0-9]+)\]/g, 'md:py-$1 ring-2 ring-inset ring-[$2]');
  // Also fix md:py-5ring-1
  c = c.replace(/md:py-5ring-1 ring-inset ring-\[(#[A-Za-z0-9]+)\]/g, 'md:py-5 ring-2 ring-inset ring-[$2]');

  // Add ring-2 to ones that don't have it yet and also fix space
  let nextC = c.replace(/className="([^"]*(?:px-\d.*?py-\d.*?)[^"]*)" style=\{\{\s*backgroundColor:\s*(["'][#A-Za-z0-9]+["'])\s*\}\}/g, (match, classes, color) => {
    if (!classes.includes('ring-')) {
      const hex = color.replace(/['"]/g, '');
      return `className="${classes.trim()} ring-2 ring-inset ring-[${hex}]" style={{ backgroundColor: ${color} }}`;
    }
    return match;
  });

  if (f.includes('navigation-hub.tsx')) {
    // Re-apply box-shadow with 2px inset if it only has c or 1px
    nextC = nextC.replace(/style=\{\{\s*backgroundColor:\s*c\s*\}\}/g, "style={{ backgroundColor: c, boxShadow: 'inset 0 0 0 2px ' + c }}");
    nextC = nextC.replace(/boxShadow: 'inset 0 0 0 1px '\s*\+\s*c/g, "boxShadow: 'inset 0 0 0 2px ' + c");
  }

  if (nextC !== c) {
    fs.writeFileSync(f, nextC);
    console.log('Cleaned & Fixed', f);
    changed++;
  }
});
console.log('Total fixed:', changed);
