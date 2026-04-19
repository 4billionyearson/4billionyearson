const fs = require('fs');
let content = fs.readFileSync('src/app/climate/[slug]/ClimateProfile.tsx', 'utf8');

// Replace the single comparison chart with a new MultiComparisonChart component
const newMultiComparisonChart = `

// ─── Multi Comparison Bar Chart ──────────────────────────────────────────────

function MultiComparisonChart({ data, series, units }: {
  data: any[];
  series: { dataKey: string; avgKey?: string; label: string; color: string; isPendingKey?: string }[];
  units: string;
}) {
  const bars: React.ReactNode[] = [];
  
  series.forEach((s, i) => {
    const PendingBarShape = (props: any) => {
      const { x, y, width, height, payload } = props;
      if (!payload[s.isPendingKey as string]) {
        return <rect x={x} y={y} width={width} height={height} fill={s.color} rx={4} ry={4} />;
      }
      const minH = 36;
      const baseline = height >= 0 ? y + height : y;
      return (
        <g>
          <rect x={x} y={baseline - minH} width={width} height={minH} fill="none" stroke="#9ca3af" strokeWidth={1} strokeDasharray="2 2" rx={4} ry={4} />
          <text x={x + width / 2} y={baseline - minH / 2 + 3} textAnchor="middle" fontSize={8} fill="#9ca3af" fontStyle="italic">N/A</text>
        </g>
      );
    };

    bars.push(
      <Bar key={\`recent-\${i}\`} dataKey={s.dataKey} name={\`\${s.label} (Recent)\`} fill={s.color} radius={[4, 4, 0, 0]} shape={<PendingBarShape />} />
    );
    if (s.avgKey) {
      bars.push(
        <Bar key={\`avg-\${i}\`} dataKey={s.avgKey} name={\`\${s.label} (1961-1990 Avg)\`} fill={s.color} fillOpacity={0.3} radius={[4, 4, 0, 0]} />
      );
    }
  });

  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} allowDecimals={false} domain={[(d: number) => { const v = Math.floor(d - 1); return units === '°C' ? v : Math.max(0, v); }, (d: number) => Math.ceil(d + 1)]} unit={units === '°C' ? '°' : ''} />
          <Tooltip content={<ComparisonTooltip />} cursor={{ fill: '#1F2937' }} />
          <Legend iconType="circle" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, left: 0, right: 0 }} />
          {bars}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

`;

if (!content.includes('function MultiComparisonChart')) {
  content = content.replace('// ─── Yearly trend chart ──────────────────────────────────────────────────────', newMultiComparisonChart + '\n// ─── Yearly trend chart ──────────────────────────────────────────────────────');
  fs.writeFileSync('src/app/climate/[slug]/ClimateProfile.tsx', content);
  console.log('Added MultiComparisonChart');
}
