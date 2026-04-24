"use client";

import React, { useMemo, useState } from 'react';
import { Leaf, CloudRain, Thermometer, Sun } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
import {
  analyseRainfall,
  analyseTemperature,
  classifyKoppen,
  classifySeasonality,
  doyToLabel,
  SHIFT_MONTH_LABELS,
  type MonthlyPoint,
  type SeasonalityKind,
} from '@/lib/climate/shift-analysis';

interface SeasonalShiftCardProps {
  monthlyAll: MonthlyPoint[];
  rainfallMonthly?: MonthlyPoint[];
  sunshineMonthly?: MonthlyPoint[];
  regionName: string;
  dataSource?: string;
}

type View = 'length' | 'monthly' | 'rainfall' | 'sunshine' | 'wet-season';

export default function SeasonalShiftCard({
  monthlyAll,
  rainfallMonthly,
  sunshineMonthly,
  regionName,
  dataSource,
}: SeasonalShiftCardProps) {
  const stats = useMemo(() => {
    const res = analyseTemperature(monthlyAll ?? []);
    if (!res) return null;
    const rain = analyseRainfall(rainfallMonthly);
    const sunshine = analyseRainfall(sunshineMonthly); // reuse baseline/recent helper for hours
    const seasonality: SeasonalityKind = classifySeasonality(res.temp, rain);
    const koppen = classifyKoppen(res.temp.baselineMonthly, rain?.baselineMonthly ?? null);
    return { ...res, rain, sunshine, seasonality, koppen };
  }, [monthlyAll, rainfallMonthly, sunshineMonthly]);

  const defaultView: View = useMemo<View>(() => {
    if (!stats) return 'length';
    if (stats.seasonality === 'wet-dry' && stats.rain) return 'wet-season';
    if (stats.seasonality === 'aseasonal') return 'monthly';
    return 'length';
  }, [stats]);

  const [view, setView] = useState<View | null>(null);
  const effectiveView: View = view ?? defaultView;

  if (!stats) return null;

  const { temp, rain, sunshine, windows, seasonality } = stats;
  const koppen = stats.koppen;
  const { baselineStart, baselineEnd, recentStart, recentEnd } = windows;
  const shift = temp.recentLen - temp.baselineLen;
  const shiftLabel = shift >= 0 ? `+${shift.toFixed(1)} months` : `${shift.toFixed(1)} months`;
  const shiftColor = shift > 0.2 ? 'text-orange-300' : shift < -0.2 ? 'text-sky-300' : 'text-gray-300';

  const hasTempSeasons = seasonality === 'warm-cold' || seasonality === 'mixed';
  const hasWetDry = (seasonality === 'wet-dry' || seasonality === 'mixed') && !!rain;

  const monthlyComparison = SHIFT_MONTH_LABELS.map((label, i) => ({
    month: label,
    baseline: temp.baselineMonthly[i],
    recent: temp.recentMonthly[i],
  }));

  const lengthSeries = useMemo(() => {
    if (!hasTempSeasons) return [];
    const byYear = new Map<number, Map<number, number>>();
    for (const p of monthlyAll) {
      if (!byYear.has(p.year)) byYear.set(p.year, new Map());
      byYear.get(p.year)!.set(p.month, p.value);
    }
    return [...byYear.entries()]
      .filter(([, m]) => m.size === 12)
      .map(([y, m]) => ({
        year: y,
        length: Array.from({ length: 12 }, (_, i) => m.get(i + 1) as number).filter(
          (v) => v > temp.baselineAnnualMean,
        ).length,
      }))
      .sort((a, b) => a.year - b.year);
  }, [hasTempSeasons, monthlyAll, temp.baselineAnnualMean]);

  const rainRows = rain
    ? SHIFT_MONTH_LABELS.map((m, i) => ({
        month: m,
        baseline: rain.baselineMonthly[i],
        recent: rain.recentMonthly[i],
      }))
    : [];

  const sunshineRows = sunshine
    ? SHIFT_MONTH_LABELS.map((m, i) => ({
        month: m,
        baseline: sunshine.baselineMonthly[i],
        recent: sunshine.recentMonthly[i],
      }))
    : [];

  const seasonalityBadge: Record<SeasonalityKind, { label: string; className: string; icon: React.ReactNode }> = {
    'warm-cold': {
      label: 'Warm / cold seasons',
      className: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      icon: <Thermometer className="h-3 w-3" />,
    },
    'wet-dry': {
      label: 'Wet / dry seasons',
      className: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      icon: <CloudRain className="h-3 w-3" />,
    },
    mixed: {
      label: 'Warm/cold + wet/dry',
      className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      icon: <Leaf className="h-3 w-3" />,
    },
    aseasonal: {
      label: 'Weakly seasonal',
      className: 'bg-gray-700/40 text-gray-300 border-gray-600/50',
      icon: <Sun className="h-3 w-3" />,
    },
  };

  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Leaf className="h-5 w-5 text-emerald-400 shrink-0" />
          <h3 className="text-lg sm:text-xl font-bold font-mono text-[#FFF5E7]">Shifting seasons</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${seasonalityBadge[seasonality].className}`}
          >
            {seasonalityBadge[seasonality].icon}
            {seasonalityBadge[seasonality].label}
          </span>
          {koppen && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-[#D0A65E]/40 bg-[#D0A65E]/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#D0A65E]"
              title={`Köppen–Geiger climate classification (Peel, Finlayson & McMahon 2007): ${koppen.code} - ${koppen.label}`}
            >
              Köppen {koppen.code} · {koppen.groupLabel}
            </span>
          )}
        </div>
        <div className="flex gap-1 text-xs flex-wrap">
          {hasTempSeasons && (
            <TabButton active={effectiveView === 'length'} onClick={() => setView('length')}>
              Warm-season length
            </TabButton>
          )}
          <TabButton active={effectiveView === 'monthly'} onClick={() => setView('monthly')}>
            Month-by-month
          </TabButton>
          {hasWetDry && (
            <TabButton active={effectiveView === 'wet-season'} onClick={() => setView('wet-season')}>
              Wet / dry season
            </TabButton>
          )}
          {rain && !hasWetDry && (
            <TabButton active={effectiveView === 'rainfall'} onClick={() => setView('rainfall')}>
              Rainfall
            </TabButton>
          )}
          {sunshine && (
            <TabButton active={effectiveView === 'sunshine'} onClick={() => setView('sunshine')}>
              Sunshine
            </TabButton>
          )}
        </div>
      </div>

      <ShiftExplanation
        seasonality={seasonality}
        regionName={regionName}
        baselineMean={temp.baselineAnnualMean}
        baselineStart={baselineStart}
        baselineEnd={baselineEnd}
        amplitudeC={temp.baselineAmplitudeC}
        wetDryRatio={rain?.wetDryRatio}
      />

      {hasTempSeasons ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <StatTile label={`${baselineStart}–${baselineEnd}`} value={temp.baselineLen.toFixed(1)} sub="warm months / yr" />
          <StatTile label={`${recentStart}–${recentEnd}`} value={temp.recentLen.toFixed(1)} sub="warm months / yr" />
          <StatTile label="Net shift" value={shiftLabel} sub="per year" valueClassName={shiftColor} bordered />
        </div>
      ) : hasWetDry && rain ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <StatTile label={`${baselineStart}–${baselineEnd}`} value={`${rain.baselineAnnualMm}`} sub="mm / yr" />
          <StatTile label={`${recentStart}–${recentEnd}`} value={`${rain.recentAnnualMm}`} sub="mm / yr" />
          <StatTile
            label="Annual rain shift"
            value={`${rain.annualTotalShiftPct > 0 ? '+' : ''}${rain.annualTotalShiftPct.toFixed(1)}%`}
            sub="recent vs baseline"
            valueClassName={
              rain.annualTotalShiftPct > 2
                ? 'text-sky-300'
                : rain.annualTotalShiftPct < -2
                ? 'text-amber-300'
                : 'text-gray-300'
            }
            bordered
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <StatTile label={`${baselineStart}–${baselineEnd}`} value={`${temp.baselineAnnualMean.toFixed(1)}°C`} sub="annual mean" />
          <StatTile label="Temp range" value={`${temp.baselineAmplitudeC.toFixed(1)}°C`} sub="peak-to-peak" />
          <StatTile
            label="Biggest warming"
            value={`+${temp.biggestMonthWarmingC.toFixed(1)}°C`}
            sub={`in ${temp.biggestMonth}`}
            valueClassName="text-orange-300"
            bordered
          />
        </div>
      )}

      {hasTempSeasons &&
        temp.baselineSpringDoy !== null &&
        temp.recentSpringDoy !== null &&
        temp.baselineAutumnDoy !== null &&
        temp.recentAutumnDoy !== null && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
            <CrossingTile
              title="Spring threshold crossed"
              baselineDoy={temp.baselineSpringDoy}
              recentDoy={temp.recentSpringDoy}
              shiftDays={temp.springShiftDays ?? 0}
              direction="spring"
            />
            <CrossingTile
              title="Autumn threshold crossed"
              baselineDoy={temp.baselineAutumnDoy}
              recentDoy={temp.recentAutumnDoy}
              shiftDays={temp.autumnShiftDays ?? 0}
              direction="autumn"
            />
          </div>
        )}

      {hasWetDry && rain && effectiveView === 'wet-season' && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 font-mono mb-1">Wet-season onset</div>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div className="text-sm text-gray-300">
                {rain.wetSeasonOnsetDoyBaseline !== null ? (
                  <>
                    <span className="text-gray-500">{doyToLabel(rain.wetSeasonOnsetDoyBaseline)}</span>
                    <span className="mx-1 text-gray-600">→</span>
                    <span className="text-[#FFF5E7] font-mono font-bold">
                      {doyToLabel(rain.wetSeasonOnsetDoyRecent ?? rain.wetSeasonOnsetDoyBaseline)}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">n/a</span>
                )}
              </div>
              {rain.wetSeasonOnsetShiftDays !== null && (
                <div
                  className={`text-sm font-mono font-bold ${
                    rain.wetSeasonOnsetShiftDays > 1
                      ? 'text-amber-300'
                      : rain.wetSeasonOnsetShiftDays < -1
                      ? 'text-sky-300'
                      : 'text-gray-300'
                  }`}
                >
                  {rain.wetSeasonOnsetShiftDays > 0
                    ? `${rain.wetSeasonOnsetShiftDays.toFixed(0)} d later`
                    : rain.wetSeasonOnsetShiftDays < 0
                    ? `${Math.abs(rain.wetSeasonOnsetShiftDays).toFixed(0)} d earlier`
                    : 'no change'}
                </div>
              )}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">When 25% of annual rain has fallen</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 font-mono mb-1">Peak-rain month</div>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div className="text-sm text-gray-300">
                <span className="text-gray-500">{rain.peakRainMonthBaseline}</span>
                <span className="mx-1 text-gray-600">→</span>
                <span className="text-[#FFF5E7] font-mono font-bold">{rain.peakRainMonthRecent}</span>
              </div>
              <div
                className={`text-sm font-mono font-bold ${
                  rain.peakRainMonthShiftIndex !== 0 ? 'text-sky-300' : 'text-gray-300'
                }`}
              >
                {rain.peakRainMonthShiftIndex === 0
                  ? 'unchanged'
                  : `${rain.peakRainMonthShiftIndex > 0 ? '+' : ''}${rain.peakRainMonthShiftIndex} mo`}
              </div>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              Wet months: {rain.baselineWetMonths} → {rain.recentWetMonths}
            </div>
          </div>
        </div>
      )}

      {effectiveView === 'length' && hasTempSeasons && (
        <>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lengthSeries} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
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
                <ReferenceLine
                  y={temp.baselineLen}
                  stroke="#D0A65E"
                  strokeDasharray="4 4"
                  label={{ value: `Baseline ${temp.baselineLen.toFixed(1)}`, fill: '#D0A65E', fontSize: 10, position: 'insideTopLeft' }}
                />
                <Bar dataKey="length" radius={[2, 2, 0, 0]}>
                  {lengthSeries.map((d) => (
                    <Cell
                      key={d.year}
                      fill={
                        d.length > temp.baselineLen
                          ? '#f97316'
                          : d.length < temp.baselineLen
                          ? '#38bdf8'
                          : '#6b7280'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Orange bars = years with more warm months than the {baselineStart}–{baselineEnd} baseline;
            blue = fewer. The dashed gold line is the baseline average.
          </p>
        </>
      )}

      {effectiveView === 'monthly' && (
        <>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: '°C', angle: -90, position: 'insideLeft', offset: 10, fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12 }}
                  formatter={(v, name) => [`${typeof v === 'number' ? v.toFixed(1) : v}°C`, name]}
                />
                {hasTempSeasons && (
                  <ReferenceLine
                    y={temp.baselineAnnualMean}
                    stroke="#D0A65E"
                    strokeDasharray="4 4"
                    label={{ value: `Annual mean ${temp.baselineAnnualMean.toFixed(1)}°C`, fill: '#D0A65E', fontSize: 10, position: 'insideTopRight' }}
                  />
                )}
                <Bar dataKey="baseline" name={`${baselineStart}–${baselineEnd}`} fill="#64748b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="recent" name={`${recentStart}–${recentEnd}`} fill="#f97316" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Baseline vs recent monthly temperature climatology. Biggest warming:{' '}
            <strong className="text-[#FFF5E7]">{temp.biggestMonth}</strong>{' '}
            ({temp.biggestMonthWarmingC > 0 ? '+' : ''}{temp.biggestMonthWarmingC.toFixed(1)}°C).
            {temp.warmestMonthShiftIndex !== 0 && (
              <>
                {' '}The warmest month has shifted from{' '}
                <strong className="text-[#FFF5E7]">{temp.warmestMonthBaseline}</strong> to{' '}
                <strong className="text-[#FFF5E7]">{temp.warmestMonthRecent}</strong>.
              </>
            )}
          </p>
        </>
      )}

      {effectiveView === 'wet-season' && hasWetDry && rain && (
        <>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rainRows} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'mm', angle: -90, position: 'insideLeft', offset: 10, fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12 }}
                  formatter={(v, name) => [`${typeof v === 'number' ? v.toFixed(0) : v} mm`, name]}
                />
                <ReferenceLine
                  y={rain.baselineAnnualMm / 12}
                  stroke="#D0A65E"
                  strokeDasharray="4 4"
                  label={{ value: `Threshold ${(rain.baselineAnnualMm / 12).toFixed(0)} mm`, fill: '#D0A65E', fontSize: 10, position: 'insideTopRight' }}
                />
                <Bar dataKey="baseline" name={`${baselineStart}–${baselineEnd}`} fill="#475569" radius={[2, 2, 0, 0]} />
                <Bar dataKey="recent" name={`${recentStart}–${recentEnd}`} fill="#38bdf8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Monthly rainfall climatology. A &ldquo;wet month&rdquo; exceeds the baseline monthly mean
            (dashed gold line). Biggest month-to-month shift:{' '}
            <strong className="text-[#FFF5E7]">{rain.biggestRainMonth.month}</strong> (
            {rain.biggestRainMonth.diff > 0 ? '+' : ''}{rain.biggestRainMonth.diff.toFixed(0)} mm,{' '}
            {rain.biggestRainMonth.pctDiff > 0 ? '+' : ''}{rain.biggestRainMonth.pctDiff.toFixed(0)}%).
          </p>
        </>
      )}

      {effectiveView === 'rainfall' && rain && (
        <>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rainRows} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'mm', angle: -90, position: 'insideLeft', offset: 10, fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12 }}
                  formatter={(v, name) => [`${typeof v === 'number' ? v.toFixed(0) : v} mm`, name]}
                />
                <Bar dataKey="baseline" name={`${baselineStart}–${baselineEnd}`} fill="#475569" radius={[2, 2, 0, 0]} />
                <Bar dataKey="recent" name={`${recentStart}–${recentEnd}`} fill="#38bdf8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Monthly rainfall climatology. Annual total:{' '}
            <strong className="text-[#FFF5E7]">{rain.baselineAnnualMm} mm</strong> →{' '}
            <strong className="text-[#FFF5E7]">{rain.recentAnnualMm} mm</strong>{' '}
            ({rain.annualTotalShiftPct > 0 ? '+' : ''}{rain.annualTotalShiftPct.toFixed(1)}%).
          </p>
        </>
      )}

      {effectiveView === 'sunshine' && sunshine && (
        <>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sunshineRows} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'hours', angle: -90, position: 'insideLeft', offset: 10, fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12 }}
                  formatter={(v, name) => [`${typeof v === 'number' ? v.toFixed(0) : v} h`, name]}
                />
                <Bar dataKey="baseline" name={`${baselineStart}–${baselineEnd}`} fill="#475569" radius={[2, 2, 0, 0]} />
                <Bar dataKey="recent" name={`${recentStart}–${recentEnd}`} fill="#fbbf24" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Monthly sunshine hours. Annual total:{' '}
            <strong className="text-[#FFF5E7]">{sunshine.baselineAnnualMm.toFixed(0)} h</strong> →{' '}
            <strong className="text-[#FFF5E7]">{sunshine.recentAnnualMm.toFixed(0)} h</strong>{' '}
            ({sunshine.annualTotalShiftPct > 0 ? '+' : ''}{sunshine.annualTotalShiftPct.toFixed(1)}%).
          </p>
        </>
      )}

      {dataSource && <p className="text-[11px] text-gray-500 mt-3 font-mono">{dataSource}</p>}
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full font-mono transition ${
        active
          ? 'bg-[#D0A65E] text-gray-950 font-bold'
          : 'bg-gray-900 text-gray-400 hover:text-[#FFF5E7] border border-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function StatTile({
  label,
  value,
  sub,
  valueClassName = 'text-[#FFF5E7]',
  bordered = false,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
  bordered?: boolean;
}) {
  return (
    <div className={`bg-gray-900 border rounded-lg p-2.5 text-center ${bordered ? 'border-[#D0A65E]/40' : 'border-gray-800'}`}>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-mono">{label}</div>
      <div className={`text-lg sm:text-2xl font-bold font-mono ${valueClassName}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function CrossingTile({
  title,
  baselineDoy,
  recentDoy,
  shiftDays,
  direction,
}: {
  title: string;
  baselineDoy: number;
  recentDoy: number;
  shiftDays: number;
  direction: 'spring' | 'autumn';
}) {
  const earlierColor = direction === 'spring' ? 'text-orange-300' : 'text-sky-300';
  const laterColor = direction === 'spring' ? 'text-sky-300' : 'text-orange-300';
  const shiftClass =
    Math.abs(shiftDays) < 1 ? 'text-gray-300' : shiftDays < 0 ? earlierColor : laterColor;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-mono mb-1">{title}</div>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="text-sm text-gray-300">
          <span className="text-gray-500">{doyToLabel(baselineDoy)}</span>
          <span className="mx-1 text-gray-600">→</span>
          <span className="text-[#FFF5E7] font-mono font-bold">{doyToLabel(recentDoy)}</span>
        </div>
        <div className={`text-sm font-mono font-bold ${shiftClass}`}>
          {shiftDays < 0
            ? `${Math.abs(shiftDays).toFixed(0)} d earlier`
            : shiftDays > 0
            ? `${shiftDays.toFixed(0)} d later`
            : 'no change'}
        </div>
      </div>
    </div>
  );
}

function ShiftExplanation({
  seasonality,
  regionName,
  baselineMean,
  baselineStart,
  baselineEnd,
  amplitudeC,
  wetDryRatio,
}: {
  seasonality: SeasonalityKind;
  regionName: string;
  baselineMean: number;
  baselineStart: number;
  baselineEnd: number;
  amplitudeC: number;
  wetDryRatio?: number;
}) {
  if (seasonality === 'warm-cold') {
    return (
      <p className="text-sm text-gray-300 mb-4">
        How the <strong className="text-[#FFF5E7]">{regionName}</strong> warm season has shifted. A
        month counts as &ldquo;warm&rdquo; when its mean temperature exceeds the long-term annual
        mean ({baselineMean.toFixed(1)}°C, from {baselineStart}–{baselineEnd}). Temperature swings{' '}
        {amplitudeC.toFixed(1)}°C peak-to-peak across the year - a classic four-seasons rhythm.
      </p>
    );
  }
  if (seasonality === 'wet-dry') {
    return (
      <p className="text-sm text-gray-300 mb-4">
        <strong className="text-[#FFF5E7]">{regionName}</strong> doesn&apos;t have a warm/cold cycle
        - its monthly temperature range is only {amplitudeC.toFixed(1)}°C across the year - but it
        does have a strong <strong className="text-sky-300">wet/dry cycle</strong>
        {wetDryRatio
          ? ` (the wettest month gets ${wetDryRatio.toFixed(0)}× as much rain as the driest)`
          : ''}
        . So we track how the wet season has shifted instead.
      </p>
    );
  }
  if (seasonality === 'mixed') {
    return (
      <p className="text-sm text-gray-300 mb-4">
        <strong className="text-[#FFF5E7]">{regionName}</strong> has both a clear warm/cold cycle
        (±{(amplitudeC / 2).toFixed(1)}°C) and a wet/dry cycle
        {wetDryRatio ? ` (${wetDryRatio.toFixed(0)}× wet:dry ratio)` : ''}. Switch tabs to see how
        each side of the annual rhythm is moving.
      </p>
    );
  }
  return (
    <p className="text-sm text-gray-300 mb-4">
      <strong className="text-[#FFF5E7]">{regionName}</strong> is weakly seasonal - temperature
      barely changes across the year ({amplitudeC.toFixed(1)}°C range) and rainfall is fairly even.
      The clearest climate signal here is overall warming: monthly temperature has risen in every
      month.
    </p>
  );
}
