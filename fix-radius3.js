const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/**/*.tsx');
let changed = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  // Target the Hero blocks
  if (c.match(/className="rounded-2xl border-2 border-\[#[0-9A-Fa-f]+\] shadow-xl overflow-hidden"/)) {
    c = c.replace(
      /(className="rounded-2xl border-2 border-\[#[0-9A-Fa-f]+\] shadow-xl overflow-hidden")([\s\S]*?)(<div className="px-\d.*?" style=\{\{ backgroundColor: ".*?" \}\}>)([\s\S]*?)(<div className="bg-gray-950\/90 backdrop-blur-md p-\d">)/g,
      (match, wrapperClasses, space1, topClasses, space2, bottomClasses) => {
        // Extract the color
        const colorMatch = wrapperClasses.match(/border-\[(#[0-9A-Fa-f]+)\]/);
        const color = colorMatch ? colorMatch[1] : '';
        
        // Remove border-2, border-[color], overflow-hidden from wrapper
        const newWrapper = `className="rounded-2xl shadow-xl flex flex-col"`;
        
        // Add border to top child, plus rounded-t-2xl
        const newTop = topClasses.replace('className="', `className="rounded-t-2xl border-2 border-b-0 border-[${color}] `);
        
        // Add border to bottom child, plus rounded-b-2xl
        const newBottom = bottomClasses.replace('className="', `className="rounded-b-[14px] border-2 border-t-0 border-[${color}] `); // inside padding wrapper needs matching? wait. let's just make it rounded-b-2xl
        
        return `${newWrapper}${space1}${newTop}${space2}${newBottom.replace('rounded-b-[14px]', 'rounded-b-2xl')}`;
      }
    );
  }
  
  if (c !== fs.readFileSync(f, 'utf8')) {
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
    changed++;
  }
});
console.log('Total fixed:', changed);
