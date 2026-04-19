const fs = require('fs');
let content = fs.readFileSync('src/app/climate/[slug]/ClimateProfile.tsx', 'utf8');

content = content.replace(
  `{/* NEW UNIFIED MONTHLY COMPARISONS */}
        {(() => {`,
  `}
        {/* NEW UNIFIED MONTHLY COMPARISONS */}
        {(() => {`
);

fs.writeFileSync('src/app/climate/[slug]/ClimateProfile.tsx', content);
