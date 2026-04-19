const fs = require('fs');

let content = fs.readFileSync('src/app/climate/[slug]/ClimateProfile.tsx', 'utf8');

const helper = `
function mergeMonthlyData(regData: any[], natData: any[], globData?: any[]): any[] {
  if (!regData) return [];
  return regData.map((r, i) => {
    const n = natData?.[i] || {};
    const g = globData?.[i] || {};
    return {
      monthLabel: r.monthLabel,
      regRecent: r.recent ?? r.recentTemp ?? null,
      regAvg: r.historicAvg ?? null,
      regPending: (r.recent ?? r.recentTemp) == null,
      
      natRecent: n.recent ?? n.recentTemp ?? null,
      natAvg: n.historicAvg ?? null,
      natPending: (n.recent ?? n.recentTemp) == null,
      
      globRecent: g.recent ?? g.recentTemp ?? null,
      globAvg: g.historicAvg ?? null,
      globPending: (g.recent ?? g.recentTemp) == null,
    };
  });
}
`;

if (!content.includes('function mergeMonthlyData')) {
  content = content.replace('// ─── Merge helpers ───────────────────────────────────────────────────────────', '// ─── Merge helpers ───────────────────────────────────────────────────────────\n' + helper);
  fs.writeFileSync('src/app/climate/[slug]/ClimateProfile.tsx', content);
  console.log('Added mergeMonthlyData');
}
