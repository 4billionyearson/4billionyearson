const fs = require('fs');
let content = fs.readFileSync('src/app/climate/[slug]/ClimateProfile.tsx', 'utf8');

const tRainOld = `<SubSection title={\`\${regionLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={ukRainfall.monthlyComparison} recentKey="recent" label="Rainfall" units="mm" barColor="#3b82f6" />
          </SubSection>
        )}
        {natUkRainfall?.monthlyComparison && (
          <SubSection title={\`\${nationalLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={natUkRainfall.monthlyComparison} recentKey="recent" label="Rainfall" units="mm" barColor="#7c3aed" />
          </SubSection>
        )}

        {usPrecip?.monthlyComparison && (
          <SubSection title={\`\${regionLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={usPrecip.monthlyComparison} recentKey="recent" label="Precipitation" units="mm" barColor="#3b82f6" />
          </SubSection>
        )}
        {natUsPrecip?.monthlyComparison && (
          <SubSection title={\`\${nationalLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={natUsPrecip.monthlyComparison} recentKey="recent" label="Precipitation" units="mm" barColor="#7c3aed" />
          </SubSection>
        )}`;

const tRainNew = `
        {/* NEW UNIFIED MONTHLY COMPARISONS */}
        {(() => {
          const rData = ukRainfall?.monthlyComparison || usPrecip?.monthlyComparison;
          const nData = natUkRainfall?.monthlyComparison || natUsPrecip?.monthlyComparison;
          if (!rData) return null;
          
          const merged = mergeMonthlyData(rData, nData || []);
          const series = [
            { dataKey: 'regRecent', avgKey: 'regAvg', isPendingKey: 'regPending', label: regionLabel, color: '#3b82f6' },
          ];
          if (nData) {
            series.push({ dataKey: 'natRecent', avgKey: 'natAvg', isPendingKey: 'natPending', label: nationalLabel, color: '#7c3aed' });
          }

          return (
            <SubSection title="Last 12 months vs Historic Baseline (1961-1990)">
               <MultiComparisonChart data={merged} series={series} units="mm" />
            </SubSection>
          );
        })()}
`;

if (content.includes(tRainOld.substring(100, 200))) {
  content = content.replace(tRainOld, tRainNew);
  fs.writeFileSync('src/app/climate/[slug]/ClimateProfile.tsx', content);
  console.log('Fixed Rain Section');
}
