const fs = require('fs');
let s = fs.readFileSync('src/app/climate/[slug]/ClimateProfile.tsx', 'utf8');

s = s.replace(`        {/* Monthly comparison bars FIRST */}
        {ukVar?.monthlyComparison && (
          
        }`, '');

fs.writeFileSync('src/app/climate/[slug]/ClimateProfile.tsx', s);
