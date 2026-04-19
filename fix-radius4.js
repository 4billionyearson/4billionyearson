const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/**/*.tsx');
let changed = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  // Instead of complex AST, let's just make the simple box-shadow trick.
  // Add `style={{ boxShadow: '0 0 0 2px ' + c }}` to SectionCard, or `ring-2 ring-inset` to the top child.
  // Wait, setting border on the outer flex col and letting the top child fill the box exactly with a pseudo element is best.
  
  // The absolute BEST trick for Tailwind curved inner-background bleeding is:
  // Add `box-shadow: inset 0 0 0 2px currentColor` or similar to the wrapper? No.
  // Add `border-2 border-[color]` on the outer wrapper.
  // Inside: top element has `bg-[color]`. We just add `<div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-[color] pointer-events-none" />` to the wrapper? No, the background of top child is cut.
  
  // To stop Webkit `overflow: hidden` bleeding, `transform: translateZ(0)` on the wrapper works 100% of the time combined with matching inner radii.
  // But wait, the user's gap was visible AFTER I matched inner radii. 
  // Which means `14px` geometry simply doesn't perfectly match `16px - 2px` visually because of mathematical subpixel differences in how the browser path-finds the inner stroke vs outer stroke!
  // If the browser path-finds differently, the ONLY way they match is if they are drawn by the exact same geometry instruction.
  
  // What if we just apply the bg color via a pseudo element that sits BEHIND the border, but doesn't get clipped by overflow?
  // Let's go back to ring. `ring-2 ring-[color] ring-inset` on the top child.
  // The top child is `className="px-4 py-3..."`.
  // If it has `ring-2 ring-inset ring-[color]`, the child draws a shadow inwards from its bounds. 
  // It completely paints over the 2px boundary edge where the gap is, with solid `#88DDFC`!
  // Will that fix it? YES! Because the gap is between the inner background rect and the outer border rect. The ring paints EXACTLY over that gap.
  
  let nextC = c.replace(
    /(<div className="px-\d.*?py-\d.*?)(md:px-\d.*?md:py-\d.*?)(" style=\{\{(.*?backgroundColor:\s*["'][^"']+["'].*?)\}\}>)/g,
    (match, p1, p2, p3) => {
      // If it doesn't already have 'ring-1'
      if (!p1.includes('ring-1')) {
         // extract color
         let colMatch = p3.match(/backgroundColor:\s*(?:c|textColor|["']([^"']+)["'])/);
         if (colMatch && colMatch[1]) {
           // It's a string color like "#88DDFC"
           return p1 + p2 + `ring-1 ring-inset ring-[${colMatch[1]}]` + p3;
         } else if (p3.includes('backgroundColor: c')) {
           // It's variable 'c' (like in NavigationHub)
           // We can't easily use Tailwind arbitrary brackets with a variable inner color unless we use inline style.
           // `style={{ backgroundColor: c, boxShadow: 'inset 0 0 0 1px ' + c }}`
         }
      }
      return match;
    }
  );

  // For Nav Hub Section Card:
  if (f.includes('navigation-hub.tsx')) {
     nextC = nextC.replace(
       /style=\{\{ backgroundColor: c \}\}/g,
       "style={{ backgroundColor: c, boxShadow: 'inset 0 0 0 1px ' + c }}"
     );
  }

  if (nextC !== c) {
    fs.writeFileSync(f, nextC);
    console.log('Fixed', f);
    changed++;
  }
});
console.log('Total fixed:', changed);
