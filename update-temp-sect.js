const fs = require('fs');

let content = fs.readFileSync('src/app/climate/[slug]/ClimateProfile.tsx', 'utf8');

const tSectOld = `<SubSection title={\`\${regionLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={ukVar.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#d97706" />
          </SubSection>
        )}
        {natUkVar?.monthlyComparison && (
          <SubSection title={\`\${nationalLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={natUkVar.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#ef4444" />
          </SubSection>
        )}

        {usVar?.monthlyComparison && (
          <SubSection title={\`\${regionLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={usVar.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#ea580c" />
          </SubSection>
        )}
        {natUsVar?.monthlyComparison && (
          <SubSection title={\`\${nationalLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={natUsVar.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#ef4444" />
          </SubSection>
        )}

        {/* Country-level monthly comparison (for country profiles) */}
        {regionType === 'country' && data.countryData?.monthlyComparison && (
          <SubSection title={\`\${regionLabel} – Last 12 months vs 1961–1990 baseline\`}>
            <ComparisonChart data={data.countryData.monthlyComparison} recentKey="recentTemp" label="Temperature" units="°C" barColor="#ef4444" />
          </SubSection>
        )}

        {/* Global comparison */}
        {data.globalData?.landMonthlyComparison && (
          <SubSection title="Global (Land) – Last 12 months vs 1961–1990 baseline">
            <ComparisonChart data={data.globalData.landMonthlyComparison} recentKey="recentTemp" label="Temperature" units="°C" barColor="#10b981" />
          </SubSection>
        )}`;

const tSectNew = `
        {/* NEW UNIFIED MONTHLY COMPARISONS */}
        {(() => {
          const rData = ukVar?.monthlyComparison || usVar?.monthlyComparison || data.countryData?.monthlyComparison;
          const nData = natUkVar?.monthlyComparison || natUsVar?.monthlyComparison;
          const gData = regionType === 'country' ? null : data.globalData?.landMonthlyComparison;
          if (!rData) return null;
          
          const merged = mergeMonthlyData(rData, nData || [], gData || []);
          const series = [
            { dataKey: 'regRecent', avgKey: 'regAvg', isPendingKey: 'regPending', label: regionLabel, color: '#d97706' },
          ];
          if (nData) {
            series.push({ dataKey: 'natRecent', avgKey: 'natAvg', isPendingKey: 'natPending', label: nationalLabel, color: '#ef4444' });
          }
          if (gData) {
            series.push({ dataKey: 'globRecent', avgKey: 'globAvg', isPendingKey: 'globPending', label: 'Global Land', color: '#10b981' });
          }

          return (
            <SubSection title="Last 12 months vs Historic Baseline (1961-1990)">
               <MultiComparisonChart data={merged} series={series} units="°C" />
            </SubSection>
          );
        })()}
`;

if (content.includes(tSectOld.slice(0, 100))) {
  content = content.replace(tSectOld, tSectNew);
  fs.writeFileSync('src/app/climate/[slug]/ClimateProfile.tsx', content);
  console.log('Replaced Temp Section Charts');
} else {
  console.log('Temp section signature not found, or already replaced.');
}
