"use client";

import React, { useMemo } from 'react';
import { Thermometer } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyPoint {
  year: number;
  month: number;
  value: number;
}

interface SpaghettiChartProps {
  monthlyAll: MonthlyPoint[];
  regionName: string;
  dataSource?: string;
}

interface ChartRow {
  month: number;
  monthLabel: string;
  [key: string]: number | string | null; // year columns like "y2024", "y2025"
}

export default function TemperatureSpaghettiChart({ monthlyAll, regionName, dataSource }: SpaghettiChartProps) {
  const { chartData, backgroundYears, recordYear, currentYear, minTemp, maxTemp, startYear, latestMonthIdx } = useMemo(() => {
    const empty = { chartData: [] as ChartRow[], backgroundYears: [] as number[], recordYear: 0, currentYear: 0, minTemp: 0, maxTemp: 0, startYear: 0, latestMonthIdx: -1 };
    if (!monthlyAll?.length) return empty;

    const now = new Date();
    const calendarYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // Group by year, excluding current (incomplete) month
    const byYear = new Map<number, Map<number, number>>();
    for (const p of monthlyAll) {
      if (p.year === calendarYear && p.month >= currentMonth) continue;
      if (!byYear.has(p.year)) byYear.set(p.year, new Map());
      byYear.get(p.year)!.set(p.month, p.value);
    }

    // All years with at least 6 months (for background), but always include current calendar year even if partial
    const allValidYears = [...byYear.entries()]
      .filter(([y, months]) => months.size >= 6 || y === calendarYear)
      .map(([y]) => y)
      .sort((a, b) => a - b);

    if (allValidYears.length === 0) return empty;

    // Find the record warmest year (from complete years only, excluding current calendar year)
    let bestYear = allValidYears[0];
    let bestAvg = -Infinity;
    for (const yr of allValidYears) {
      if (yr === calendarYear) continue;
      const months = byYear.get(yr)!;
      if (months.size < 12) continue;
      const vals = [...months.values()];
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestYear = yr;
      }
    }

    // Limit background to last ~40 years, always include record year and current calendar year
    const cutoffYear = calendarYear - 39;
    const displayYears = allValidYears.filter(y => y >= cutoffYear || y === bestYear || y === calendarYear);
    const bgYears = displayYears.filter(y => y !== bestYear && y !== calendarYear);

    // Build chart data: 12 rows (one per month), each row has a column per year
    let globalMin = Infinity;
    let globalMax = -Infinity;
    const rows: ChartRow[] = [];
    for (let m = 1; m <= 12; m++) {
      const row: ChartRow = { month: m, monthLabel: MONTH_LABELS[m - 1] };
      for (const yr of displayYears) {
        const val = byYear.get(yr)?.get(m) ?? null;
        row[`y${yr}`] = val !== null ? Math.round(val * 100) / 100 : null;
        if (val !== null) {
          if (val < globalMin) globalMin = val;
          if (val > globalMax) globalMax = val;
        }
      }
      rows.push(row);
    }

    return {
      chartData: rows,
      backgroundYears: bgYears,
      recordYear: bestYear,
      currentYear: calendarYear,
      minTemp: Math.floor(globalMin - 1),
      maxTemp: Math.ceil(globalMax + 3),
      startYear: Math.min(...displayYears),
      latestMonthIdx: (() => {
        const currentYearMonths = byYear.get(calendarYear);
        if (!currentYearMonths?.size) return -1;
        return Math.max(...currentYearMonths.keys()) - 1; // 0-indexed
      })(),
    };
  }, [monthlyAll]);

  if (chartData.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold font-mono text-white mb-1 flex items-start gap-2">
        <Thermometer className="h-5 w-5 shrink-0 text-orange-400 mt-1" />
        <span className="min-w-0 flex-1">
          {regionName} – Monthly Temperature – All Years
        </span>
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        Each line represents one year of monthly mean temperatures.
      </p>

      <div className="w-full h-[360px] md:h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 30, right: 50, left: -12, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#555' }}
              tickLine={false}
            />
            <YAxis
              domain={[minTemp, maxTemp]}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#555' }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}°C`}
              width={52}
            />

            {/* Background years - thin, gray, no dots */}
            {backgroundYears.map(yr => (
              <Line
                key={yr}
                type="monotone"
                dataKey={`y${yr}`}
                stroke="#4B5563"
                strokeWidth={0.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}

            {/* Current year - orange */}
            <Line
              type="monotone"
              dataKey={`y${currentYear}`}
              stroke="#F97316"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, index, payload } = props;
                if (index !== latestMonthIdx || cy == null) return <g key={index} />;
                const val = payload[`y${currentYear}`];
                if (val == null) return <g key={index} />;
                return (
                  <g key={index}>
                    <circle cx={cx} cy={cy} r={5} fill="#F97316" stroke="#fff" strokeWidth={1.5} />
                    <text x={cx} y={cy - 12} textAnchor="middle" fill="#F97316" fontSize={11} fontWeight="bold">
                      {MONTH_LABELS[latestMonthIdx]} {currentYear}: {val.toFixed(1)}°C
                    </text>
                  </g>
                );
              }}
              activeDot={{ r: 4, fill: '#F97316' }}
              isAnimationActive={false}
              connectNulls
            />

            {/* Record warmest year - dark red, thickest, on top */}
            {recordYear !== currentYear && (
              <Line
                type="monotone"
                dataKey={`y${recordYear}`}
                stroke="#8B0000"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#8B0000' }}
                isAnimationActive={false}
                connectNulls
              />
            )}

            <Tooltip content={<SpaghettiTooltip recordYear={recordYear} currentYear={currentYear} />} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[2px] bg-gray-600 rounded" />
          <span className="text-gray-500">All years since {startYear}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[3px] bg-[#8B0000] rounded" />
          <span className="text-red-400 font-semibold">{recordYear} (warmest)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[3px] bg-orange-500 rounded" />
          <span className="text-orange-400 font-semibold">{currentYear} (current year)</span>
        </span>
      </div>

      {/* Data source */}
      {dataSource && (
        <p className="text-[10px] text-gray-500 mt-2">{dataSource}</p>
      )}
    </div>
  );
}

function SpaghettiTooltip({ active, payload, label, recordYear, currentYear }: any) {
  if (!active || !payload?.length) return null;

  // Find record and current year entries
  const recordEntry = payload.find((p: any) => p.dataKey === `y${recordYear}`);
  const currentEntry = payload.find((p: any) => p.dataKey === `y${currentYear}`);

  // Find the highest and lowest values from all entries
  const numericPayloads = payload.filter((p: any) => p.value != null);
  const allValues = numericPayloads.map((p: any) => p.value as number);
  const maxVal = allValues.length ? Math.max(...allValues) : null;
  const minVal = allValues.length ? Math.min(...allValues) : null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      {currentEntry?.value != null && (
        <p className="text-red-400">
          {currentYear}: <span className="font-mono">{currentEntry.value.toFixed(1)}°C</span>
        </p>
      )}
      {recordEntry?.value != null && recordYear !== currentYear && (
        <p className="text-orange-400">
          {recordYear}: <span className="font-mono">{recordEntry.value.toFixed(1)}°C</span>
        </p>
      )}
      {maxVal !== null && (
        <p className="text-gray-400">
          Range: <span className="font-mono">{minVal!.toFixed(1)}–{maxVal.toFixed(1)}°C</span>
        </p>
      )}
    </div>
  );
}
