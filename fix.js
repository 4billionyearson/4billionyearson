const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/app/**/*.tsx');
let changed = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let nextC = c.replace(/className="([^"]*(?:px-\d.*?py-\d.*?)[^"]*)" style=\{\{\s*backgroundColor:\s*(["'][#A-Za-z0-9]+["'])\s*\}\}/g, (match, classes, color) => {
    // If it's a fixed hex color
    if (!classes.includes('ring-1')) {
      const hex = color.replace(/['"]/g, '');
      return `className="${classes.trim()} ring-2 ring-inset ring-[${hex}]" style={{ backgroundColor: ${color} }}`;
    }
    return match;
  });
  
  if (f.includes('navigation-hub.tsx')) {
    nextC = nextC.replace(/<div className="([^"]*px-4 py-3 md:px-5 md:py-4[^"]*)" style=\{\{\s*backgroundColor:\s*c\s*\}\}/g, '<div className="$1" style={{ backgroundColor: c, boxShadow: "inset 0 0 0 2px " + c }}');
  }

  if (nextC !== c) {
    fs.writeFileSync(f, nextC);
    console.log('Fixed', f);
    changed++;
  }
});
console.log('Total fixed:', changed);
