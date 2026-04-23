"use client";

import React, { useMemo, useState } from 'react';
import { Leaf } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

interface MonthlyPoint {
  year: number;
  month: number;
  value: number;
}

interface SeasonalShiftCardProps {
  monthlyAll: MonthlyPoint[];
  regionName: string;
  dataSource?: string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SeasonalShiftCard({ monthlyAll, regionName, dataSource }: SeasonalShiftCardProps) {
  const [view, setView] = useState<'length' | 'monthly'>('length');

  const stats = useMemo(() => {
    if (!monthlyAll?.length) return null;

    // Group by year, keep only complete years (12 months) for the length metric
    const byYear = new Map<number, Map<number, number>>();
    for (const p of monthlyAll) {
      if (!byYear.has(p.year)) byYear.set(p.year, new Map());
      byYear.get(p.year)!.set(p.month, p.value);
    }
    const completeYears = [...byYear.entries()]
      .filter(([, m]) => m.size === 12)
      .map(([y, m]) => ({
        year: y,
        months: Array.from({ length: 12 }, (_, i) => m.get(i + 1) as number),
      }))
      .sort((a, b) => a.year - b.year);

    if (completeYears.length < 30) return null;

    // Baseline: first 30 complete years
    const baseline = completeYears.slice(0, 30);
    const baselineStart = baseline[0].year;
    const baselineEnd = baseline[baseline.length - 1].year;

    // Baseline annual mean (across all months of all baseline years)
    let sum = 0, count = 0;
    for (const y of baseline) for (const v of y.months) { sum += v; count += 1; }
    const baselineAnnualMean = sum / count;

    // Baseline monthly climatology
    const baselineMonthly: number[] = [];
    for (let m = 0; m < 12; m++) {
      let s = 0;
      for (const y of baseline) s += y.months[m];
      baselineMonthly.push(s / baseline.length);
    }

    // Recent monthly climatology: last 10 complete years
    const recent = completeYears.slice(-10);
    const recentStart = recent[0].year;
    const recentEnd = recent[recent.length - 1].year;
    const recentMonthly: number[] = [];
    for (let m = 0; m < 12; m++) {
      let s = 0;
      for (const y of recent) s += y.months[m];
      recentMonthly.push(s / recent.length);
    }

    // Per-year warm-season length = count of months > baselineAnnualMean
    const lengthSeries = completeYears.map(y => ({
      year: y.year,
      length: y.months.filter(v => v > baselineAnnualMean).length,
    }));

    const baselineLen = lengthSeries.slice(0, 30).reduce((a, b) => a + b.length, 0) / 30;
    const recentLen = lengthSeries.slice(-10).reduce((a, b) => a + b.length, 0) / 10;

    // Monthly comparison for chart 2
    const monthlyComparison = MONTH_LABELS.map((label, i) => ({
      month: label,
      baseline: +baselineMonthly[i].toFixed(2),
      recent: +recentMonthly[i].toFixed(2),
      diff: +(recentMonthly[i] - baselineMonthly[i]).toFixed(2),
    }));

    // Which months crossed the annual-mean threshold in each window?
    const warmMonthsBaseline = baselineMonthly
      .map((v, i) => v > baselineAnnualMean ? MONTH_LABELS[i] : null)
      .filter(Boolean) as string[];
    const warmMonthsRecent = recentMonthly
      .map((v, i) => v > baselineAnnualMean ? MONTH_LABELS[i] : null)
      .filter(Boolean) as string[];

    // Month with biggest warming
    const biggestIdx = monthlyComparison.reduce((bestIdx, row, i, arr) => row.diff > arr[bestIdx].diff ? i : bestIdx, 0);

    return {
      baselineAnnualMean,
      baselineStart, baselineEnd,
      recentStart, recentEnd,
      baselineLen, recentLen,
      lengthSeries,
      monthlyComparison,
      warmMonthsBaseline,
      warmMonthsRecent,
      biggestMonth: monthlyComparison[biggestIdx],
    };
  }, [monthlyAll]);

  if (!stats) {
    return null;
  }

  const shift = stats.recentLen - stats.baselineLen;
  const shiftLabel = shift >= 0 ? `+${shift.toFixed(1)} months` : `${shift.toFixed(1)} months`;
  const shiftColor = shift > 0.2 ? 'text-orange-300' : shift < -0.2 ? 'text-sky-300' : 'text-gray-300';

  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-400 shrink-0" />
          <h3 className="text-lg sm:text-xl font-bold font-mono text-[#FFF5E7]">Shifting seasons</h3>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setView('length')}
            className={`px-3 py-1.5 rounded-full font-mono transition ${
              view === 'length'
                ? 'bg-[#D0A65E] text-gray-950 font-bold'
                : 'bg-gray-900 text-gray-400 hover:text-[#FFF5E7] border border-gray-700'
            }`}
          >
            Warm-season length
          </button>
          <button
            type="button"
            onClick={() => setView('monthly')}
            className={`px-3 py-1.5 rounded-full font-mono transition ${
              view === 'monthly'
                ? 'bg-[#D0A65E] text-gray-950 font-bold'
                : 'bg-gray-900 text-gray-400 hover:text-[#FFF5E7] border border-gray-700'
            }`}
          >
            Month-by-month warming
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        How the <strong className="text-[#FFF5E7]">{regionName}</strong> warm season has shifted. A month counts as
        &ldquo;warm&rdquo; when its mean temperature exceeds the long-term annual mean
        ({stats.baselineAnnualMean.toFixed(1)}°C, from {stats.baselineStart}–{stats.baselineEnd}).
      </p>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-center">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-mono">{stats.baselineStart}–{stats.baselineEnd}</div>
          <div className="text-lg sm:text-2xl font-bold text-[#FFF5E7] font-mono">{stats.baselineLen.toFixed(1)}</div>
          <div className="text-[11px] text-gray-400">warm months / yr</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-center">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-mono">{stats.recentStart}–{stats.recentEnd}</div>
          <div className="text-lg sm:text-2xl font-bold text-[#FFF5E7] font-mono">{stats.recentLen.toFixed(1)}</div>
          <div className="text-[11px] text-gray-400">warm months / yr</div>
        </div>
        <div className="bg-gray-900 border border-[#D0A65E]/40 rounded-lg p-2.5 text-center">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-mono">Net shift</div>
          <div className={`text-lg sm:text-2xl font-bold font-mono ${shiftColor}`}>{shiftLabel}</div>
          <div className="text-[11px] text-gray-400">per year</div>
        </div>
      </div>

      {view === 'length' ? (
        <>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.lengthSeries} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  domain={[0, 12]}
                  ticks={[0, 3, 6, 9, 12]}
                  label={{ value: 'Months', angle: -90, position: 'insideLeft', offset: 10, fill: '#9ca3af', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12 }}
                  formatter={(v) => [`${v} months`, 'Warm season']}
                />
                <ReferenceLine y={stats.baselineLen} stroke="#D0A65E" strokeDasharray="4 4" label={{ value: `Baseline ${stats.baselineLen.toFixed(1)}`, fill: '#D0A65E', fontSize: 10, position: 'insideTopLeft' }} />
                <Bar dataKey="length" radius={[2, 2, 0, 0]}>
                  {stats.lengthSeries.map(d => (
                    <Cell key={d.year} fill={d.length > stats.baselineLen ? '#f97316' : d.length < stats.baselineLen ? '#38bdf8' : '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Orange bars show years with more warm months than the {stats.baselineStart}–{stats.baselineEnd} baseline;
            blue bars show fewer. The dashed gold line is the baseline average.
          </p>
        </>
      ) : (
        <>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyComparison} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  label={{ value: '°C', angle: -90, position: 'insideLeft', offset: 10, fill: '#9ca3af', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12 }}
                  formatter={(v, name) => [`${typeof v === 'number' ? v.toFixed(1) : v}°C`, name]}
                />
                <ReferenceLine y={stats.baselineAnnualMean} stroke="#D0A65E" strokeDasharray="4 4" label={{ value: `Annual mean ${stats.baselineAnnualMean.toFixed(1)}°C`, fill: '#D0A65E', fontSize: 10, position: 'insideTopRight' }} />
                <Bar dataKey="baseline" name={`${stats.baselineStart}–${stats.baselineEnd}`} fill="#64748b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="recent" name={`${stats.recentStart}–${stats.recentEnd}`} fill="#f97316" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Comparing the {stats.baselineStart}–{stats.baselineEnd} baseline monthly climatology with the
            {' '}{stats.recentStart}–{stats.recentEnd} average. The biggest warming this location has seen is in{' '}
            <strong className="text-[#FFF5E7]">{stats.biggestMonth.month}</strong> ({stats.biggestMonth.diff > 0 ? '+' : ''}
            {stats.biggestMonth.diff.toFixed(1)}°C).
          </p>
        </>
      )}

      {dataSource && (
        <p className="text-[11px] text-gray-500 mt-3 font-mono">{dataSource}</p>
      )}
    </section>
  );
}
