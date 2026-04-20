"use client";

import React, { useMemo } from 'react';
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
}

interface ChartRow {
  month: number;
  monthLabel: string;
  [key: string]: number | string | null; // year columns like "y2024", "y2025"
}

export default function TemperatureSpaghettiChart({ monthlyAll, regionName }: SpaghettiChartProps) {
  const { chartData, allYears, backgroundYears, recordYear, currentYear, currentMonth, minTemp, maxTemp, startYear } = useMemo(() => {
    if (!monthlyAll?.length) return { chartData: [], allYears: [], backgroundYears: [], recordYear: 0, currentYear: 0, currentMonth: 0, minTemp: 0, maxTemp: 0, startYear: 0 };

    // Group by year
    const byYear = new Map<number, Map<number, number>>();
    for (const p of monthlyAll) {
      if (!byYear.has(p.year)) byYear.set(p.year, new Map());
      byYear.get(p.year)!.set(p.month, p.value);
    }

    // Find years with at least 6 months of data
    const allValidYears = [...byYear.entries()]
      .filter(([, months]) => months.size >= 6)
      .map(([y]) => y)
      .sort((a, b) => a - b);

    if (allValidYears.length === 0) return { chartData: [], allYears: [], backgroundYears: [], recordYear: 0, currentYear: 0, currentMonth: 0, minTemp: 0, maxTemp: 0, startYear: 0 };

    // Current year = the last year that has data
    const now = new Date();
    const calendarYear = now.getFullYear();
    const calendarMonth = now.getMonth() + 1;
    const latestYear = allValidYears[allValidYears.length - 1];

    // Find the record year (highest annual average from complete years)
    let bestYear = allValidYears[0];
    let bestAvg = -Infinity;
    for (const yr of allValidYears) {
      const months = byYear.get(yr)!;
      if (months.size < 12 && yr === latestYear) continue; // skip incomplete current year
      const vals = [...months.values()];
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestYear = yr;
      }
    }

    // Limit background to last ~40 years (like Copernicus shows since 1940)
    // Always include record year even if outside range
    const cutoffYear = latestYear - 39;
    const displayYears = allValidYears.filter(y => y >= cutoffYear || y === bestYear);
    const bgYears = displayYears.filter(y => y !== bestYear && y !== latestYear);

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
      allYears: displayYears,
      backgroundYears: bgYears,
      recordYear: bestYear,
      currentYear: latestYear,
      currentMonth: latestYear === calendarYear ? calendarMonth - 1 : 12,
      minTemp: Math.floor(globalMin - 1),
      maxTemp: Math.ceil(globalMax + 1),
      startYear: displayYears[0],
    };
  }, [monthlyAll]);

  if (chartData.length === 0) return null;

  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-lg font-bold font-mono text-white mb-1 flex items-center gap-2">
        Monthly Temperature – All Years
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Each line represents one year. Data: monthly mean temperature for {regionName}.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[2px] bg-gray-600 rounded" />
          <span className="text-gray-500">All years since {startYear}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[3px] bg-orange-500 rounded" />
          <span className="text-orange-400 font-semibold">{recordYear} (warmest)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[3px] bg-[#8B0000] rounded" />
          <span className="text-red-400 font-semibold">{currentYear} (latest)</span>
        </span>
      </div>

      <div className="w-full" style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
              width={48}
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

            {/* Record year - orange, thicker */}
            {recordYear !== currentYear && (
              <Line
                type="monotone"
                dataKey={`y${recordYear}`}
                stroke="#F97316"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#F97316' }}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Current year - dark red, thickest, on top */}
            <Line
              type="monotone"
              dataKey={`y${currentYear}`}
              stroke="#8B0000"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: '#8B0000' }}
              isAnimationActive={false}
              connectNulls
            />

            <Tooltip content={<SpaghettiTooltip recordYear={recordYear} currentYear={currentYear} />} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
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
