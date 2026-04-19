const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/**/*.tsx');
let changed = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  // Revert rounded-t-[14px]
  if (c.includes('rounded-t-[14px]')) {
    c = c.replace(/ rounded-t-\[14px\]/g, '');
    fs.writeFileSync(f, c);
    console.log('Reverted', f);
    changed++;
  }
});
console.log('Total reverted:', changed);
