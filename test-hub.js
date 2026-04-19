const fs = require('fs');
let c = fs.readFileSync('src/app/_components/navigation-hub.tsx', 'utf8');

// The wrapper currently has:
// className="relative rounded-2xl border-2 transition-all duration-500 ease-out overflow-hidden"
// style={{ borderColor: c, boxShadow: isExpanded ? `0 4px 24px \${c}33` : '0 4px 12px rgba(0,0,0,0.4)' }}
c = c.replace(
  'className="relative rounded-2xl border-2 transition-all duration-500 ease-out overflow-hidden"',
  'className="relative rounded-2xl transition-all duration-500 ease-out overflow-hidden"'
);

// We change style to add the inset shadow instead of borderColor
c = c.replace(
  /style=\{\{ borderColor: c, boxShadow: isExpanded \? `0 4px 24px \$\{c\}33` : '0 4px 12px rgba\(0,0,0,0.4\)' \}\}/g,
  "style={{ boxShadow: isExpanded ? `inset 0 0 0 2px ${c}, 0 4px 24px ${c}33` : `inset 0 0 0 2px ${c}, 0 4px 12px rgba(0,0,0,0.4)` }}"
);

// We need to revert the child style change
c = c.replace(
  /style=\{\{ backgroundColor: c, boxShadow: 'inset 0 0 0 2px ' \+ c \}\}/g,
  "style={{ backgroundColor: c }}"
);

fs.writeFileSync('src/app/_components/navigation-hub.tsx', c);
console.log('Fixed navigation-hub');
