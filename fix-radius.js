const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/**/*.tsx');
let changed = 0;
files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  if (c.match(/className=\"[^\"]*\" style=\{\{\s?backgroundColor:/)) {
    const nextC = c.replace(/(className=\"[^\"]*)(\"\s*style=\{\{\s?backgroundColor:)/g, (match, prefix, suffix) => {
      if (prefix.includes('rounded-t-') || prefix.includes('rounded-2xl')) return match;
      if (prefix.includes('flex flex-col')) return match; 
      if (!prefix.includes('px-') || !prefix.includes('py-')) return match; 
      return prefix + ' rounded-t-[14px]' + suffix;
    });
    if (nextC !== c) {
      fs.writeFileSync(f, nextC);
      console.log('Fixed', f);
      changed++;
    }
  }
});
console.log('Total fixed:', changed);
