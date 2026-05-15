"use client";

import React, { useMemo, useState } from 'react';
import { Thermometer, CloudRain, Sun, Snowflake, ArrowUp, ArrowDown, Circle } from 'lucide-react';
import type { SpaghettiMetric } from './monthly-spaghetti-chart';
import { ChipDropdown } from './responsive-segmented-control';

/* ────────────────────────────────────────────────────────────────────────────
 * Types & constants (self-contained copy so this file compiles independently)
 * ──────────────────────────────────────────────────────────────────────── */

export type YearMap = Map<number, number[]>;

export type MetricPalette = {
  high: string; low: string; current: string;
  highTextClass: string; lowTextClass: string; currentTextClass: string;
  highWord: string; lowWord: string;
};

const METRIC_ICON: Record<SpaghettiMetric, React.ReactNode> = {
  temp: <Thermometer className="h-3.5 w-3.5" />,
  precip: <CloudRain className="h-3.5 w-3.5" />,
  sunshine: <Sun className="h-3.5 w-3.5" />,
  frost: <Snowflake className="h-3.5 w-3.5" />,
};

const METRIC_LABEL: Record<SpaghettiMetric, string> = {
  temp: 'Temperature',
  precip: 'Rainfall',
  sunshine: 'Sunshine',
  frost: 'Frost',
};

const METRIC_UNIT: Record<SpaghettiMetric, string> = {
  temp: '°C',
  precip: 'mm',
  sunshine: 'hrs',
  frost: 'days',
};

const METRIC_DECIMALS: Record<SpaghettiMetric, number> = {
  temp: 1,
  precip: 0,
  sunshine: 0,
  frost: 1,
};

const METRIC_AGG: Record<SpaghettiMetric, 'mean' | 'sum'> = {
  temp: 'mean',
  precip: 'sum',
  sunshine: 'sum',
  frost: 'sum',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ────────────────────────────────────────────────────────────────────────────
 * Data helpers
 * ──────────────────────────────────────────────────────────────────────── */

function annualAggregate(yearMap: YearMap, agg: 'mean' | 'sum'): Map<number, number> {
  const out = new Map<number, number>();
  for (const [y, arr] of yearMap.entries()) {
    if (arr.some((v) => !Number.isFinite(v))) continue;
    const s = arr.reduce((a, b) => a + b, 0);
    out.set(y, agg === 'mean' ? s / 12 : s);
  }
  return out;
}

function seasonalAggregate(
  yearMap: YearMap,
  season: 'DJF' | 'MAM' | 'JJA' | 'SON',
  agg: 'mean' | 'sum',
): Map<number, number> {
  const out = new Map<number, number>();
  if (season === 'DJF') {
    for (const [y, arr] of yearMap.entries()) {
      const prev = yearMap.get(y - 1);
      if (!prev) continue;
      const vals = [prev[11], arr[0], arr[1]];
      if (!vals.every(Number.isFinite)) continue;
      const s = vals[0] + vals[1] + vals[2];
      out.set(y, agg === 'mean' ? s / 3 : s);
    }
  } else {
    const months = season === 'MAM' ? [2, 3, 4] : season === 'JJA' ? [5, 6, 7] : [8, 9, 10];
    for (const [y, arr] of yearMap.entries()) {
      const vals = months.map((m) => arr[m]);
      if (!vals.every(Number.isFinite)) continue;
      const s = vals.reduce((a, b) => a + b, 0);
      out.set(y, agg === 'mean' ? s / 3 : s);
    }
  }
  return out;
}

function monthlySeries(yearMap: YearMap, monthIdx: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const [y, arr] of yearMap.entries()) {
    if (Number.isFinite(arr[monthIdx])) out.set(y, arr[monthIdx]);
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Rank helper types
 * ──────────────────────────────────────────────────────────────────────── */

type RankInfo = { rank: number; total: number; value: number };

type YearEntry = [number, number];

/* ────────────────────────────────────────────────────────────────────────────
 * StatCard — hoisted outside RecordsTable to keep it stable
 * ──────────────────────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  year?: number;
  value: number;
  rankInfo?: RankInfo | null;
  accentClass: string;
  accentHex: string;
  isCurrent?: boolean;
  decimals: number;
  unit: string;
}

function StatCard({ label, year, value, rankInfo, accentClass, accentHex, isCurrent = false, decimals, unit }: StatCardProps) {
  return (
    <div
      className="rounded-xl border bg-gray-800/40 backdrop-blur-md px-4 py-3 flex flex-col gap-1 flex-1 overflow-hidden"
      style={{ borderColor: `${accentHex}55` }}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold font-mono">{label}</div>
      {year !== undefined && (
        <div className={`font-mono text-3xl font-black tabular-nums leading-none ${accentClass}`} style={{ textShadow: `0 0 18px ${accentHex}55` }}>{year}</div>
      )}
      {isCurrent && rankInfo && (
        <div className={`font-mono text-3xl font-black tabular-nums leading-none ${accentClass}`} style={{ textShadow: `0 0 18px ${accentHex}55` }}>
          #{rankInfo.rank}<span className="text-sm font-normal text-gray-500"> of {rankInfo.total}</span>
        </div>
      )}
      <div className="font-mono text-[15px] tabular-nums text-gray-200">{value.toFixed(decimals)}<span className="text-gray-500 text-xs ml-0.5">{unit}</span></div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * RecordsTable
 * ──────────────────────────────────────────────────────────────────────── */

interface RecordsTableProps {
  metric: SpaghettiMetric;
  yearMap: YearMap;
  currentYear: number;
  palette: MetricPalette;
  /** Optional per-metric data so the records section can show a different
   *  variable from the spiral above. When omitted, only `metric` is shown. */
  allSeries?: Partial<Record<SpaghettiMetric, YearMap>>;
  allPalettes?: Record<SpaghettiMetric, MetricPalette>;
}

export default function RecordsTable({ metric: parentMetric, yearMap: parentYearMap, currentYear, palette: parentPalette, allSeries, allPalettes }: RecordsTableProps) {
  // Local metric override — defaults to parent's metric. When parent metric
  // changes (user clicks a different tab on the spiral) we follow it.
  const [localMetric, setLocalMetric] = useState<SpaghettiMetric>(parentMetric);
  React.useEffect(() => { setLocalMetric(parentMetric); }, [parentMetric]);

  // Use the local metric's data/palette when available, else fall back to parent.
  const metric = localMetric;
  const yearMap = allSeries?.[metric] ?? parentYearMap;
  const palette = allPalettes?.[metric] ?? parentPalette;
  const availableMetrics: SpaghettiMetric[] | null = allSeries
    ? (['temp', 'precip', 'sunshine', 'frost'] as SpaghettiMetric[]).filter((m) => (allSeries[m]?.size ?? 0) > 0)
    : null;

  const agg = METRIC_AGG[metric];
  const unit = METRIC_UNIT[metric];
  const dec = METRIC_DECIMALS[metric];
  const [view, setView] = useState<'year' | 'seasons' | 'months'>('year');

  const highLabel = palette.highWord;
  const lowLabel = palette.lowWord;
  const degSuffix = unit === '°C' ? '°' : '';

  /* ── Year-view ─────────────────────────────────────────────────────── */
  const yearRows = useMemo(() => {
    const annual = annualAggregate(yearMap, agg);
    const entries: YearEntry[] = [...annual.entries()];
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const high = sorted[0] as YearEntry;
    const low = sorted[sorted.length - 1] as YearEntry;
    const curArr = yearMap.get(currentYear);
    let ytdRank: RankInfo | null = null;
    if (curArr) {
      const ytdMonths: number[] = [];
      curArr.forEach((v) => { if (Number.isFinite(v)) ytdMonths.push(v); });
      if (ytdMonths.length >= 2) {
        const N = ytdMonths.length;
        const ytdValue = agg === 'mean'
          ? ytdMonths.reduce((a, b) => a + b, 0) / ytdMonths.length
          : ytdMonths.reduce((a, b) => a + b, 0);
        const scores: Array<{ year: number; v: number }> = [];
        for (const [y, arr] of yearMap.entries()) {
          if (y === currentYear) continue;
          const slice = arr.slice(0, N);
          if (slice.some((v) => !Number.isFinite(v))) continue;
          const s = agg === 'mean' ? slice.reduce((a, b) => a + b, 0) / N : slice.reduce((a, b) => a + b, 0);
          scores.push({ year: y, v: s });
        }
        scores.sort((a, b) => b.v - a.v);
        const rank = scores.filter((s) => s.v > ytdValue).length + 1;
        ytdRank = { rank, total: scores.length + 1, value: ytdValue };
      }
    }
    return { high, low, ytdRank };
  }, [yearMap, agg, currentYear]);

  /* ── Seasons-view ──────────────────────────────────────────────────── */
  const seasonData = useMemo(() => {
    const seasons: Array<{ key: 'DJF' | 'MAM' | 'JJA' | 'SON'; label: string; color: string }> = [
      { key: 'DJF', label: 'Winter', color: '#7DD3FC' },
      { key: 'MAM', label: 'Spring', color: '#86EFAC' },
      { key: 'JJA', label: 'Summer', color: '#FACC15' },
      { key: 'SON', label: 'Autumn', color: '#FDBA74' },
    ];
    return seasons.map((s) => {
      const map = seasonalAggregate(yearMap, s.key, agg);
      const entries: YearEntry[] = [...map.entries()];
      if (entries.length === 0) {
        return { ...s, high: null as YearEntry | null, low: null as YearEntry | null, rank: null as RankInfo | null, rankYear: currentYear };
      }
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      const high = sorted[0] as YearEntry;
      const low = sorted[sorted.length - 1] as YearEntry;
      const latestYear = Math.max(...map.keys());
      const curVal = map.get(latestYear);
      let rank: RankInfo | null = null;
      if (curVal !== undefined) {
        const others = entries.filter(([y]) => y !== latestYear);
        const r = others.filter(([, v]) => v > curVal).length + 1;
        rank = { rank: r, total: others.length + 1, value: curVal };
      }
      return { ...s, high, low, rank, rankYear: latestYear };
    });
  }, [yearMap, agg, currentYear]);

  /* ── Months-view ───────────────────────────────────────────────────── */
  const monthData = useMemo(() => {
    return MONTH_LABELS.map((label, m) => {
      const map = monthlySeries(yearMap, m);
      const entries: YearEntry[] = [...map.entries()];
      if (entries.length === 0) {
        return { label, high: null as YearEntry | null, low: null as YearEntry | null, rank: null as RankInfo | null };
      }
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      const high = sorted[0] as YearEntry;
      const low = sorted[sorted.length - 1] as YearEntry;
      const curVal = map.get(currentYear);
      let rank: RankInfo | null = null;
      if (curVal !== undefined) {
        const others = entries.filter(([y]) => y !== currentYear);
        const r = others.filter(([, v]) => v > curVal).length + 1;
        rank = { rank: r, total: others.length + 1, value: curVal };
      }
      return { label, high, low, rank };
    });
  }, [yearMap, currentYear]);

  if (!yearRows) return null;

  return (
    <div>
      {/* Header: metric ChipDropdown on the left (matches the climate map
          chips elsewhere on site), view tabs on the right — single row */}
      <div className="flex items-center justify-between gap-2 mb-4">
        {availableMetrics && availableMetrics.length > 1 ? (
          <ChipDropdown
            label="Metric"
            ariaLabel="Records metric"
            value={metric}
            onChange={(k) => setLocalMetric(k as SpaghettiMetric)}
            options={availableMetrics.map((m) => ({ key: m, label: METRIC_LABEL[m] }))}
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-4 w-0.5 rounded-full" style={{ background: palette.current }} />
            <span className="text-[11px] font-bold font-mono uppercase tracking-[0.2em]" style={{ color: palette.current }}>
              {METRIC_LABEL[metric]}
            </span>
          </div>
        )}
        {/* Tab bar */}
        <div className="inline-flex rounded-full border border-[#D0A65E]/40 bg-gray-950/80 backdrop-blur-md overflow-hidden text-[10px] shrink-0 p-0.5 shadow-lg">
          {(['year', 'seasons', 'months'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-full font-mono uppercase tracking-wider font-bold transition-all ${view === v ? 'bg-[#D0A65E] text-[#0a0a0a]' : 'text-gray-400 hover:text-[#FFF5E7]'}`}
            >
              {v === 'year' ? 'Year' : v === 'seasons' ? 'Seasons' : 'Months'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Year view ── */}
      {view === 'year' && (
        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <StatCard
            label={`${highLabel} year`}
            year={yearRows.high[0]}
            value={yearRows.high[1]}
            accentClass={palette.highTextClass}
            accentHex={palette.high}
            decimals={dec}
            unit={unit}
          />
          <StatCard
            label={`${lowLabel} year`}
            year={yearRows.low[0]}
            value={yearRows.low[1]}
            accentClass={palette.lowTextClass}
            accentHex={palette.low}
            decimals={dec}
            unit={unit}
          />
          {yearRows.ytdRank && (
            <StatCard
              label={`${currentYear} so far`}
              value={yearRows.ytdRank.value}
              rankInfo={yearRows.ytdRank}
              accentClass={palette.currentTextClass}
              accentHex={palette.current}
              isCurrent
              decimals={dec}
              unit={unit}
            />
          )}
        </div>
      )}

      {/* ── Seasons view ── */}
      {view === 'seasons' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {seasonData.map((s) => {
            const currentLabel = s.key === 'DJF'
              ? `${s.rankYear - 1}/${String(s.rankYear).slice(-2)}`
              : String(s.rankYear);
            return (
              <div
                key={s.key}
                className="rounded-xl border bg-gray-800/40 backdrop-blur-md px-4 py-3"
                style={{ borderColor: `${s.color}55` }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  <div className="text-[13px] font-bold font-mono uppercase tracking-[0.18em]" style={{ color: s.color }}>{s.label}</div>
                </div>
                <div className="space-y-1.5">
                  {s.high && (
                    <div className="flex items-baseline justify-between">
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-gray-400 font-mono font-semibold">
                        <ArrowUp className={`h-3 w-3 ${palette.highTextClass}`} />
                        {highLabel}
                      </span>
                      <span className="font-mono text-base tabular-nums inline-flex items-baseline">
                        <span className={`font-bold ${palette.highTextClass} w-[3rem] text-right`}>{s.high[0]}</span>
                        <span className="text-gray-200 w-[4.5rem] text-right">{s.high[1].toFixed(dec)}{degSuffix}</span>
                      </span>
                    </div>
                  )}
                  {s.low && (
                    <div className="flex items-baseline justify-between">
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-gray-400 font-mono font-semibold">
                        <ArrowDown className={`h-3 w-3 ${palette.lowTextClass}`} />
                        {lowLabel}
                      </span>
                      <span className="font-mono text-base tabular-nums inline-flex items-baseline">
                        <span className={`font-bold ${palette.lowTextClass} w-[3rem] text-right`}>{s.low[0]}</span>
                        <span className="text-gray-200 w-[4.5rem] text-right">{s.low[1].toFixed(dec)}{degSuffix}</span>
                      </span>
                    </div>
                  )}
                  {s.rank && (
                    <div className="flex items-baseline justify-between pt-1.5 border-t border-white/[0.08]">
                      <span className="flex items-center gap-1 font-mono font-bold text-[13px] tabular-nums" style={{ color: s.color }}>
                        <Circle className="h-2 w-2 fill-current" />
                        {currentLabel}
                      </span>
                      <span className="font-mono text-base tabular-nums inline-flex items-baseline">
                        <span className="font-bold" style={{ color: s.color }}>#{s.rank.rank}</span>
                        <span className="text-gray-500 text-xs mx-1">of</span>
                        <span className="text-gray-500 text-xs">{s.rank.total}</span>
                        <span className="text-gray-200 w-[4.5rem] text-right">{s.rank.value.toFixed(dec)}{degSuffix}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Months view ── */}
      {view === 'months' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {monthData.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border bg-gray-800/40 backdrop-blur-sm px-3 py-2.5"
              style={{ borderColor: '#D0A65E33' }}
            >
              <div className="text-[13px] font-bold font-mono uppercase tracking-[0.18em] text-[#D0A65E] mb-2">{m.label}</div>
              <div className="space-y-1.5">
                {m.high && (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1 shrink-0">
                      <ArrowUp className={`h-3 w-3 ${palette.highTextClass}`} />
                      <span className={`font-mono text-[13px] font-bold tabular-nums ${palette.highTextClass}`}>{m.high[0]}</span>
                    </span>
                    <span className="font-mono text-[12px] text-gray-200 tabular-nums">{m.high[1].toFixed(dec)}{degSuffix}</span>
                  </div>
                )}
                {m.low && (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1 shrink-0">
                      <ArrowDown className={`h-3 w-3 ${palette.lowTextClass}`} />
                      <span className={`font-mono text-[13px] font-bold tabular-nums ${palette.lowTextClass}`}>{m.low[0]}</span>
                    </span>
                    <span className="font-mono text-[12px] text-gray-200 tabular-nums">{m.low[1].toFixed(dec)}{degSuffix}</span>
                  </div>
                )}
                {m.rank && (
                  <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-white/[0.08]">
                    <span className="shrink-0">
                      <span className={`font-mono text-[13px] font-bold tabular-nums ${palette.currentTextClass}`}>#{m.rank.rank}</span>
                    </span>
                    <span className="font-mono text-[12px] text-gray-200 tabular-nums">{m.rank.value.toFixed(dec)}{degSuffix}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
