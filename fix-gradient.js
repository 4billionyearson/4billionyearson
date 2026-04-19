const fs = require('fs');

let c = fs.readFileSync('src/app/_components/navigation-hub.tsx', 'utf8');

c = c.replace(
  /style=\{\{ boxShadow(?:.*?)\}\}/g,
  (match) => {
     // Revert my test-hub.js changes and return the original style + the background gradient
     return "style={{ borderColor: c, background: `linear-gradient(to bottom, ${c} 0%, ${c} 60px, transparent 60px)`, boxShadow: isExpanded ? `0 4px 24px ${c}33` : '0 4px 12px rgba(0,0,0,0.4)' }}";
  }
);
// Restore class name back to original with border
c = c.replace(
  'className="relative rounded-2xl transition-all duration-500 ease-out overflow-hidden"',
  'className="relative rounded-2xl border-2 transition-all duration-500 ease-out overflow-hidden"'
);

fs.writeFileSync('src/app/_components/navigation-hub.tsx', c);
console.log('Applied linear gradient trick to navigation-hub');
