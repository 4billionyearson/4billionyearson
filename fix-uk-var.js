const fs = require('fs');
let content = fs.readFileSync('src/app/climate/[slug]/ClimateProfile.tsx', 'utf8');

const tOld = `{/* Monthly comparison bars FIRST */}
        {variable.monthlyComparison && (
          <SubSection title={\`\${regionLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={variable.monthlyComparison} recentKey="recent" label={variable.label} units={variable.units} barColor={barColor} />
          </SubSection>
        )}
        {nationalVar?.monthlyComparison && (
          <SubSection title={\`\${nationalLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={nationalVar.monthlyComparison} recentKey="recent" label={variable.label} units={variable.units} barColor={nationalBarColor} />
          </SubSection>
        )}`;
        
const tNew = `        {/* Unified Monthly Comparison FIRST */}
        {variable.monthlyComparison && (
          <SubSection title="Last 12 months vs Historic Baseline (1961-1990)">
            <MultiComparisonChart
              units={variable.units}
              data={mergeMonthlyData(variable.monthlyComparison, nationalVar?.monthlyComparison || [])}
              series={[
                { dataKey: 'regRecent', avgKey: 'regAvg', isPendingKey: 'regPending', color: barColor, label: regionLabel },
                ...(nationalVar?.monthlyComparison ? [{ dataKey: 'natRecent', avgKey: 'natAvg', isPendingKey: 'natPending', color: nationalBarColor, label: nationalLabel }] : [])
              ]}
            />
          </SubSection>
        )}`;

if (content.includes(tOld.substring(100,200))) {
  content = content.replace(tOld, tNew);
  fs.writeFileSync('src/app/climate/[slug]/ClimateProfile.tsx', content);
  console.log('Fixed UK variables');
}
