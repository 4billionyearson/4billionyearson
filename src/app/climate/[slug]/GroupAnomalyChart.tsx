'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export interface MonthlyPoint {
  ym: string; // 'YYYY-MM' for x-axis
  year: number;
  month: number;
  anomaly?: number | null;       // vs comparison baseline (1961–1990)
  nativeAnomaly?: number | null; // vs source-native (1901–2000 NOAA)
}

interface Props {
  data: MonthlyPoint[];
  showNative?: boolean;
  baselineLabel?: string;
  nativeBaselineLabel?: string;
  units?: string;
  height?: number;
}

export default function GroupAnomalyChart({
  data,
  showNative = true,
  baselineLabel = 'vs 1961–1990',
  nativeBaselineLabel = 'vs 1901–2000 (source-native)',
  units = '°C',
  height = 280,
}: Props) {
  if (!data.length) return null;

  // Show last 30 years for legibility.
  const sliced = data.slice(-360);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={sliced} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis
            dataKey="ym"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v: string) => v.slice(0, 4)}
            interval="preserveStartEnd"
            minTickGap={48}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
            width={48}
            label={{ value: units, angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
          />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
          <Tooltip
            contentStyle={{ background: '#0b0f17', border: '1px solid #D0A65E', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#FFF5E7' }}
            itemStyle={{ color: '#e5e7eb' }}
            formatter={(value: unknown, name: unknown) => {
              const label = (name as string) ?? '';
              if (value == null) return ['—', label];
              const num = Number(value);
              return [`${num > 0 ? '+' : ''}${num.toFixed(2)} ${units}`, label];
            }}
            labelFormatter={(label: unknown) => String(label ?? '')}
          />
          {showNative && (
            <Line
              type="monotone"
              dataKey="nativeAnomaly"
              name={nativeBaselineLabel}
              stroke="#94a3b8"
              dot={false}
              strokeWidth={1.25}
            />
          )}
          <Line
            type="monotone"
            dataKey="anomaly"
            name={baselineLabel}
            stroke="#D0A65E"
            dot={false}
            strokeWidth={1.6}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
