const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/app/**/*.tsx');
let changed = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  // 1. Revert previous rounded-t-[14px] gap hack
  c = c.replace(/ rounded-t-\[14px\]/g, '');

  // 2. Add ring-2 ring-inset to ALL elements that have an inline backgroundColor
  c = c.replace(/className="([^"]*(?:px-\d.*?py-\d.*?)[^"]*)" style=\{\{\s*backgroundColor:\s*(["'][#A-Za-z0-9]+["'])\s*\}\}/g, (match, classes, color) => {
      // Check we don't duplicate
      if (!classes.includes('ring-2 ring-inset')) {
        const hex = color.replace(/['"]/g, '');
        // Just append cleanly
        return `className="${classes.trim()} ring-2 ring-inset ring-[${hex}]" style={{ backgroundColor: ${color} }}`;
      }
      return match;
  });

  // 3. For navigation-hub.tsx, apply via inline boxShadow inset
  if (f.includes('navigation-hub.tsx')) {
    c = c.replace(/style=\{\{\s*backgroundColor:\s*c\s*\}\}/g, "style={{ backgroundColor: c, boxShadow: 'inset 0 0 0 2px ' + c }}");
  }

  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Successfully fixed radius gap in:', f);
    changed++;
  }
});
console.log('Total files patched with inset shadow:', changed);
