"use client";

import React from 'react';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, Cell, ComposedChart, Area, ReferenceArea, ReferenceDot, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Waves, Snowflake, Flame, Wind, ExternalLink, ArrowUpRight } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Shared tile shell
function Tile({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border-2 border-[#D0A65E] bg-gray-950/90 backdrop-blur-md p-3.5 md:p-4 shadow-xl flex flex-col ${className}`}>
      {children}
    </div>
  );
}

function TileHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-xl font-bold font-mono text-white flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-5 [&>svg]:w-5">{icon}<span className="min-w-0 flex-1">{title}</span></h3>
      {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
    </div>
  );
}

// ─── ENSO ───────────────────────────────────────────────────────────────────

interface ForecastSeason {
  season: string;
  label: string;
  pLaNina: number;
  pNeutral: number;
  pElNino: number;
}

interface WeeklyRow {
  date: string;
  year: number;
  month: number;
  day: number;
  nino34: { sst: number; anom: number };
}

interface PlumePeriod {
  period: number;
  label: string;
  seasonAnchorYear: number;
  mean: number | null;
  dynMean: number | null;
  statMean: number | null;
  modelCount: number;
}

interface EnsoData {
  state: 'El Niño' | 'La Niña' | 'Neutral';
  strength: string;
  anomaly: number;
  season: string;
  seasonYear: number;
  history: { season: string; year: number; anom: number }[];
  weekly?: { weekly: WeeklyRow[]; lastWeek: string } | null;
  forecast?: { seasons: ForecastSeason[] } | null;
  plume?: { issueYear: number; issueMonth: number; periods: PlumePeriod[] } | null;
}

const ENSO_SEASON_LABELS = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'];
const ENSO_MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ensoSeasonMiddleMonth(label: string, anchorYear: number): string {
  const idx = ENSO_SEASON_LABELS.indexOf(label);
  if (idx < 0) return `${label} ${anchorYear}`;
  let monthIdx: number;
  if (label === 'DJF') { monthIdx = 0; }
  else if (label === 'NDJ') { monthIdx = 11; }
  else { monthIdx = (idx + 1) % 12; }
  return `${ENSO_MONTH_NAMES_FULL[monthIdx]} ${anchorYear}`;
}

const ENSO_SEASON_MONTHS: Record<string, [number, number]> = {
  DJF: [-1, 1], JFM: [0, 2], FMA: [1, 3], MAM: [2, 4], AMJ: [3, 5],
  MJJ: [4, 6], JJA: [5, 7], JAS: [6, 8], ASO: [7, 9], SON: [8, 10],
  OND: [9, 11], NDJ: [10, 12],
};

function ensoSeasonWindow(label: string, anchorYear: number): [number, number] {
  const months = ENSO_SEASON_MONTHS[label] || [0, 2];
  return [anchorYear + months[0] / 12, anchorYear + (months[1] + 1) / 12];
}

function ensoSeasonCentre(label: string, anchorYear: number): number {
  const [a, b] = ensoSeasonWindow(label, anchorYear);
  return (a + b) / 2;
}

export function EnsoCard({ enso }: { enso: EnsoData | null }) {
  if (!enso) return null;
  const state = enso.state;
  const accent = state === 'El Niño' ? 'text-rose-300' : state === 'La Niña' ? 'text-sky-300' : 'text-gray-300';

  // Forecast verdict — same logic as the full ENSO page
  const now = new Date();
  let runYear = now.getUTCFullYear();
  let prevIdx = -1;
  const forecastWithYear = (enso.forecast?.seasons || []).map((s) => {
    const idx = ENSO_SEASON_LABELS.indexOf(s.season);
    if (prevIdx >= 0 && idx >= 0 && idx < prevIdx) runYear += 1;
    if (idx >= 0) prevIdx = idx;
    return { ...s, anchorYear: runYear };
  });
  const forecastFirst50 = forecastWithYear.find((s) => s.pElNino >= 50) || null;
  const forecastFirst50La = forecastWithYear.find((s) => s.pLaNina >= 50) || null;
  const forecastVerdictLabel = forecastFirst50
    ? `El Niño Predicted by ${ensoSeasonMiddleMonth(forecastFirst50.season, forecastFirst50.anchorYear)}`
    : forecastFirst50La
      ? `La Niña Predicted by ${ensoSeasonMiddleMonth(forecastFirst50La.season, forecastFirst50La.anchorYear)}`
      : null;
  const cardTitle = `ENSO – ${state}${forecastVerdictLabel ? ` · ${forecastVerdictLabel}` : ''}`;
  const isForecastingElNino = !!forecastFirst50;

  // ── Forecast chart data ──────────────────────────────────────────────────
  const plumePeriods = enso.plume?.periods || [];
  const usingPlume = plumePeriods.length > 0;
  const currentYear = now.getFullYear();
  const yearsBack = 7;
  const xMin = currentYear - yearsBack + 0.5;
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1).getTime();
  const todayX = now.getFullYear() + (now.getTime() - startOfYear) / (endOfYear - startOfYear);
  const currentOni = enso.weekly?.weekly?.length
    ? enso.weekly.weekly[enso.weekly.weekly.length - 1].nino34.anom
    : enso.anomaly;

  const decimalYearFromYMD = (y: number, m: number, d: number) => {
    const start = new Date(y, 0, 1).getTime();
    const end = new Date(y + 1, 0, 1).getTime();
    return y + (new Date(y, m - 1, d).getTime() - start) / (end - start);
  };

  type ChartPoint = { x: number; anom?: number; pos?: number; neg?: number; fcAnom?: number; fcPos?: number; dateLabel?: string };

  const observedPoints: ChartPoint[] = (enso.weekly?.weekly || [])
    .filter((w) => {
      const dx = decimalYearFromYMD(w.year, w.month, w.day);
      return dx >= xMin && dx <= todayX + 0.001;
    })
    .map((w) => {
      const dx = decimalYearFromYMD(w.year, w.month, w.day);
      const a = w.nino34.anom;
      return { x: dx, anom: a, pos: a > 0 ? a : 0, neg: a < 0 ? a : 0, dateLabel: w.date };
    })
    .sort((a, b) => a.x - b.x);

  if (observedPoints.length) {
    const last = observedPoints[observedPoints.length - 1];
    if (todayX > last.x + 0.0001) {
      observedPoints.push({ x: todayX, anom: currentOni, pos: currentOni > 0 ? currentOni : 0, neg: currentOni < 0 ? currentOni : 0 });
    }
  }

  const forecastPoints: ChartPoint[] = [];
  if (usingPlume) {
    const anchors = plumePeriods
      .map((pr) => {
        const v = pr.dynMean ?? pr.mean ?? pr.statMean;
        if (v == null) return null;
        return { x: ensoSeasonCentre(pr.label, pr.seasonAnchorYear), y: v };
      })
      .filter((a): a is { x: number; y: number } => a != null)
      .sort((a, b) => a.x - b.x)
      .filter((a) => a.x > todayX);

    const allAnchors = [{ x: todayX, y: currentOni }, ...anchors];
    const stepsPerLeg = 8;
    for (let i = 0; i < allAnchors.length - 1; i++) {
      const a0 = allAnchors[i];
      const a1 = allAnchors[i + 1];
      for (let s = 0; s <= stepsPerLeg; s++) {
        if (i > 0 && s === 0) continue;
        const t = s / stepsPerLeg;
        const eased = (1 - Math.cos(Math.PI * t)) / 2;
        const fx = a0.x + (a1.x - a0.x) * t;
        const fy = a0.y + (a1.y - a0.y) * eased;
        forecastPoints.push({ x: fx, fcAnom: fy, fcPos: fy > 0 ? fy : 0 });
      }
    }
  }

  const plumePeaks = plumePeriods.map((p) => p.dynMean ?? p.mean).filter((v): v is number => v != null);
  const predictedPeakOni = plumePeaks.length ? Math.max(...plumePeaks) : 1.5;
  const plumePeakPeriod = plumePeriods.reduce<PlumePeriod | null>((a, b) => {
    const bv = b.dynMean ?? b.mean;
    const av = a ? (a.dynMean ?? a.mean) : null;
    if (bv == null) return a;
    if (av == null || bv > av) return b;
    return a;
  }, null);

  const elNinoStart = forecastFirst50 ? ensoSeasonWindow(forecastFirst50.season, forecastFirst50.anchorYear)[0] : null;
  const lastPlume = plumePeriods[plumePeriods.length - 1];
  const elNinoEnd = lastPlume ? ensoSeasonWindow(lastPlume.label, lastPlume.seasonAnchorYear)[1] : null;
  const peakX = plumePeakPeriod ? ensoSeasonCentre(plumePeakPeriod.label, plumePeakPeriod.seasonAnchorYear) : null;

  const xMax = Math.max(currentYear + 1.5, (elNinoEnd ?? currentYear + 1) + 0.5);
  const yearTicks: number[] = [];
  for (let y = currentYear - yearsBack + 1; y <= Math.ceil(xMax); y++) yearTicks.push(y);

  const chartData: ChartPoint[] = [...observedPoints, ...forecastPoints];

  // ── Past event labels (same logic as the full ENSO tracker page) ─────────
  type EnsoEvent = { phase: 'el-nino' | 'la-nina'; weak: boolean; startX: number; endX: number; peak: number };
  const ensoEvents: EnsoEvent[] = [];
  {
    const MIN_CONSEC = 3;
    const MIN_PEAK = 0.5;
    const WEAK_MAX = 1.0;
    const histInWindow = (enso.history || []).filter((p) => {
      const [s] = ensoSeasonWindow(p.season, p.year);
      return s >= xMin && s < todayX;
    });
    let cur: { phase: 'el-nino' | 'la-nina'; rows: typeof histInWindow } | null = null;
    const flush = () => {
      if (!cur || cur.rows.length < MIN_CONSEC) { cur = null; return; }
      const peakRow = cur.rows.reduce((a, b) => (Math.abs(b.anom) > Math.abs(a.anom) ? b : a));
      if (Math.abs(peakRow.anom) < MIN_PEAK) { cur = null; return; }
      const first = cur.rows[0];
      const last = cur.rows[cur.rows.length - 1];
      const [s] = ensoSeasonWindow(first.season, first.year);
      const [, e] = ensoSeasonWindow(last.season, last.year);
      ensoEvents.push({ phase: cur.phase, weak: Math.abs(peakRow.anom) < WEAK_MAX, startX: s, endX: e, peak: peakRow.anom });
      cur = null;
    };
    for (const p of histInWindow) {
      const phase: 'el-nino' | 'la-nina' | null = p.anom >= 0.5 ? 'el-nino' : p.anom <= -0.5 ? 'la-nina' : null;
      if (phase === null) { flush(); continue; }
      if (cur && cur.phase === phase) { cur.rows.push(p); }
      else { flush(); cur = { phase, rows: [p] }; }
    }
    flush();
  }

  // Forecast narrative detail
  const seasons = enso.forecast?.seasons || [];
  const first50 = seasons.find((s) => s.pElNino >= 50);
  const first90 = seasons.find((s) => s.pElNino >= 90);
  const peakSeason = seasons.reduce<ForecastSeason | null>((a, b) => (a === null || b.pElNino > a.pElNino ? b : a), null);
  let last90: ForecastSeason | null = null;
  seasons.forEach((s) => { if (s.pElNino >= 90) last90 = s; });
  const fmtSigned = (v: number, d = 2) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

  return (
    <Tile>
      <TileHeader
        icon={<Wind className="h-5 w-5 text-sky-300" />}
        title={cardTitle}
        subtitle="NOAA CPC Oceanic Niño Index · Weekly Niño 3.4 SST · IRI/CCSR forecast plume"
      />

      {/* Description */}
      <p className="text-sm text-gray-300 leading-relaxed mb-3">
        The El Niño-Southern Oscillation (ENSO) is the single biggest year-to-year driver of
        global temperature and rainfall after the long-term warming trend itself. It is also a{' '}
        <span className="text-[#FFF5E7] font-semibold">natural amplifier of climate change</span>.
      </p>

      {/* ONI + This week stat boxes */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ONI · 3-month mean</p>
          <p className={`text-2xl font-bold font-mono ${accent}`}>{state}</p>
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-mono text-white">{enso.anomaly > 0 ? '+' : ''}{enso.anomaly.toFixed(2)}°C</span>{' ·'}{' '}
            {enso.season} {enso.seasonYear}
          </p>
        </div>
        {enso.weekly?.weekly?.length ? (() => {
          const lastW = enso.weekly!.weekly[enso.weekly!.weekly.length - 1];
          const wa = lastW.nino34.anom;
          const wColor = wa >= 0.5 ? 'text-rose-300' : wa <= -0.5 ? 'text-sky-300' : 'text-gray-200';
          const [wy, wm, wd] = enso.weekly!.lastWeek.split('-');
          return (
            <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Niño 3.4 · this week</p>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className={`text-2xl font-bold font-mono ${wColor}`}>{wa > 0 ? '+' : ''}{wa.toFixed(2)}</span>
                <span className="text-sm text-gray-400">°C</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">SST {lastW.nino34.sst.toFixed(1)}°C · w/e {wd}-{wm}-{wy.slice(2)}</p>
            </div>
          );
        })() : null}
      </div>

      {/* Forecast chart */}
      {chartData.length > 0 && (
        <div className="h-[260px] -ml-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <pattern id="enso-card-stripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="rgba(244,63,94,0.12)" />
                  <rect width="3" height="6" fill="rgba(244,63,94,0.32)" />
                </pattern>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="x" type="number" domain={[xMin, xMax]} ticks={yearTicks} tickFormatter={(v) => String(Math.round(v))} stroke="#9CA3AF" fontSize={10} allowDecimals={false} />
              <YAxis stroke="#9CA3AF" fontSize={10} width={30} domain={[-3, 3]} ticks={[-2, -1, 0, 1, 2]} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #D0A65E', borderRadius: 8, fontSize: 12, color: '#f3f4f6' }}
                formatter={(value: any, name: any) => {
                  if (value == null) return ['', ''];
                  const labels: Record<string, string> = { anom: 'Niño 3.4 observed', fcAnom: 'Forecast' };
                  return [`${fmtSigned(Number(value), 2)}°C`, labels[name] || name];
                }}
                labelFormatter={(v: any, p: any) => p?.[0]?.payload?.dateLabel || `${Math.floor(v)}-${String(Math.floor((v - Math.floor(v)) * 12) + 1).padStart(2, '0')}`}
              />
              <ReferenceLine y={0.5} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={-0.5} stroke="#0ea5e9" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={0} stroke="#6B7280" />
              <Area type="monotone" dataKey="pos" stroke="none" fill="#f43f5e" fillOpacity={0.55} isAnimationActive={false} connectNulls={false} />
              <Area type="monotone" dataKey="neg" stroke="none" fill="#0ea5e9" fillOpacity={0.55} isAnimationActive={false} connectNulls={false} />
              {isForecastingElNino && elNinoStart !== null && elNinoEnd !== null && (
                <ReferenceArea x1={elNinoStart} x2={elNinoEnd} y1={0} y2={predictedPeakOni} fill="url(#enso-card-stripes)" stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.45} ifOverflow="extendDomain" />
              )}
              <Area type="monotone" dataKey="fcPos" stroke="none" fill="#f43f5e" fillOpacity={0.35} isAnimationActive={false} connectNulls={false} />
              <Line type="monotone" dataKey="anom" stroke="#fef3c7" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
              <Line type="monotone" dataKey="fcAnom" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} connectNulls={false} />
              {isForecastingElNino && peakX !== null && (
                <ReferenceDot x={peakX} y={predictedPeakOni} r={4} fill="#f43f5e" stroke="#0f172a" strokeWidth={2} />
              )}
              {/* Past event labels — same logic as the full ENSO tracker */}
              {ensoEvents.filter((ev) => ((ev.startX + ev.endX) / 2) - xMin >= 1).map((ev, i) => {
                const cx = (ev.startX + ev.endX) / 2;
                return (
                  <ReferenceLine
                    key={`ev-label-${i}`}
                    x={cx}
                    stroke="transparent"
                    label={{
                      value: `${ev.phase === 'el-nino' ? 'El Niño' : 'La Niña'}${ev.weak ? ' (weak)' : ''}`,
                      fill: ev.phase === 'el-nino' ? '#fecaca' : '#bfdbfe',
                      fontSize: 9.5,
                      position: ev.peak >= 0 ? 'insideTop' : 'insideBottom',
                      offset: 4,
                    }}
                  />
                );
              })}
              <ReferenceLine x={todayX} stroke="#D0A65E" strokeDasharray="4 4" label={{ value: 'Today', fill: '#D0A65E', fontSize: 10, position: 'top' }} />
              <ReferenceDot x={todayX} y={currentOni} r={5} fill="#D0A65E" stroke="#0f172a" strokeWidth={2}
                label={{ value: `Now ${fmtSigned(currentOni, 2)}°C`, fill: '#D0A65E', fontSize: 10, fontWeight: 600, position: 'left', offset: 10 }} />
              {forecastPoints.length > 0 && (() => {
                const lastFc = forecastPoints[forecastPoints.length - 1];
                return <ReferenceLine x={lastFc.x} stroke="#f43f5e" strokeDasharray="2 4" strokeOpacity={0.55} label={{ value: 'End of forecasts', fill: '#fda4af', fontSize: 9, position: 'insideTopLeft', offset: 4 }} />;
              })()}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {chartData.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-300">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-[#fef3c7]" /> Weekly Niño 3.4</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(244,63,94,0.55)' }} /> El Niño shading</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(14,165,233,0.55)' }} /> La Niña shading</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-5 h-0.5" style={{ background: 'repeating-linear-gradient(90deg,#f43f5e 0 4px,transparent 4px 8px)' }} /> Forecast</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D0A65E]" /> Now / Today</span>
        </div>
      )}

      {/* Forecast narrative */}
      {isForecastingElNino && first50 && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 to-gray-900/30 p-3">
          <p className="text-[10px] uppercase tracking-wider text-rose-300/80 font-mono mb-1">NOAA forecast - what&apos;s coming</p>
          <p className="text-xs text-gray-100 leading-relaxed">
            A new <span className="font-semibold text-rose-300">El Niño</span> looks increasingly likely.{' '}
            Probability first crosses <span className="font-mono font-semibold text-rose-200">50%</span> in{' '}
            <span className="font-mono">{first50.label}</span> ({first50.pElNino}% chance)
            {first90 && <> — climbs above <span className="font-mono font-semibold text-rose-200">90%</span> in <span className="font-mono">{first90.label}</span></>}
            {peakSeason && <> and peaks at <span className="font-mono font-semibold text-rose-200">{peakSeason.pElNino}%</span> in <span className="font-mono">{peakSeason.label}</span></>}
            {last90 && first90 && (last90 as ForecastSeason).season !== first90.season && <>, staying above 90% through <span className="font-mono">{(last90 as ForecastSeason).label}</span></>}
            {'. '}
            {enso.plume && <>The dashed red curve traces the multi-model <a href="https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/?enso_tab=enso-sst_table" target="_blank" rel="noopener noreferrer" className="text-rose-300 underline decoration-rose-400/40 underline-offset-2 hover:decoration-rose-300">IRI/CCSR plume forecast</a>{' '}
            (issued {enso.plume.issueMonth}/{enso.plume.issueYear}, {enso.plume.periods[0]?.modelCount ?? 0} dynamical &amp; statistical models).</>}
            {plumePeakPeriod && <> Peak intensity reaches <span className="font-mono font-semibold text-rose-200">{fmtSigned(predictedPeakOni, 1)}°C</span> in <span className="font-mono">{plumePeakPeriod.label} {plumePeakPeriod.seasonAnchorYear}</span> — the dynamical-model average, which currently signals a strong-to-super El Niño.</>}
          </p>
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-2">
        Sources:{' '}
        <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php" target="_blank" rel="noopener noreferrer" className="underline text-gray-400 hover:text-gray-300">NOAA CPC ONI</a>,{' '}
        <a href="https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for" target="_blank" rel="noopener noreferrer" className="underline text-gray-400 hover:text-gray-300">NOAA CPC weekly Niño 3.4</a>,{' '}
        <a href="https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/?enso_tab=enso-sst_table" target="_blank" rel="noopener noreferrer" className="underline text-gray-400 hover:text-gray-300">IRI/CCSR plume forecast</a>,{' '}
        <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities.php" target="_blank" rel="noopener noreferrer" className="underline text-gray-400 hover:text-gray-300">NOAA CPC probability outlook</a>.
      </p>
      <div className="flex justify-end mt-2">
        <Link href="/climate/enso" className="text-xs font-semibold text-teal-300 hover:text-teal-200 inline-flex items-center gap-1">
          Full ENSO tracker (Niño 3.4, MEI, SOI, forecast) <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </Tile>
  );
}

// ─── GHG tile ───────────────────────────────────────────────────────────────

interface GhgStat {
  label: string;
  unit: string;
  latest: { year: number; month: number; value: number };
  yoy: { absolute: number | null; pct: number | null } | null;
  tenYr: { absolute: number | null; pct: number | null } | null;
  preindustrial: number;
  vsPreindustrialPct: number | null;
  sparkline: { year: number; month: number; value: number }[];
}

function GhgRow({ stat, color }: { stat: GhgStat; color: string }) {
  const spark = stat.sparkline.map((p, i) => ({ i, v: p.value }));
  return (
    <div className="py-2 border-b border-gray-900 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{stat.label}</p>
          <p className="text-[11px] text-gray-400">
            {stat.latest.value.toFixed(stat.unit === 'ppm' ? 2 : 1)} {stat.unit} ({stat.latest.year}-{String(stat.latest.month).padStart(2, '0')})
          </p>
        </div>
        <div className="text-right">
          {stat.vsPreindustrialPct != null && (
            <p className="text-sm font-mono" style={{ color }}>+{stat.vsPreindustrialPct.toFixed(0)}% vs 1750</p>
          )}
          {stat.yoy?.absolute != null && (
            <p className="text-[11px] text-gray-400">+{stat.yoy.absolute.toFixed(stat.unit === 'ppm' ? 2 : 1)} {stat.unit}/yr</p>
          )}
        </div>
      </div>
      <div className="h-8 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GhgTile({ ghgStats }: { ghgStats: { co2: GhgStat | null; ch4: GhgStat | null; n2o: GhgStat | null } | null }) {
  if (!ghgStats) return null;
  const { co2, ch4, n2o } = ghgStats;
  if (!co2 && !ch4 && !n2o) return null;
  return (
    <Tile>
      <TileHeader
        icon={<Flame className="h-5 w-5 text-amber-400" />}
        title="Greenhouse Gases - Latest Monthly Mean"
        subtitle="NOAA Global Monitoring Laboratory · globally-averaged marine surface sites"
      />
      {co2 && <GhgRow stat={co2} color="#fb923c" />}
      {ch4 && <GhgRow stat={ch4} color="#f472b6" />}
      {n2o && <GhgRow stat={n2o} color="#a78bfa" />}
      <p className="text-[11px] text-gray-400 mt-2">
        Sparklines: last 10 years of monthly values. Pre-industrial reference values: CO₂ 280 ppm, CH₄ 722 ppb, N₂O 270 ppb.
      </p>
      <p className="text-[11px] text-gray-400 mt-1">
        Source:&nbsp;
        <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noopener noreferrer" className="underline text-gray-400 hover:text-gray-300">
          NOAA GML Trends
        </a>
      </p>
      <div className="mt-auto pt-2 flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
        <Link href="/greenhouse-gases" className="inline-flex items-center gap-1 text-teal-300 hover:text-teal-200 font-semibold">
          Greenhouse gases dashboard <ArrowUpRight className="h-3 w-3" />
        </Link>
        <Link href="/emissions" className="inline-flex items-center gap-1 text-teal-300 hover:text-teal-200 font-semibold">
          Emissions by country <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </Tile>
  );
}

// ─── Sea ice ────────────────────────────────────────────────────────────────

interface SeaIceStats {
  label: string;
  baseline: string;
  unit: string;
  latest: { year: number; month: number; extent: number };
  climatology: number;
  anomaly: number;
  anomalyPct: number | null;
  rankLowestOfSameMonth: number;
  totalYearsInMonth: number;
  recent60: { year: number; month: number; extent: number }[];
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function SeaIceTile({ seaIce, variant = 'tile' }: { seaIce: SeaIceStats | null; variant?: 'tile' | 'section' }) {
  if (!seaIce) return null;
  const chart = seaIce.recent60.map((p, i) => ({ i, label: `${MONTH_NAMES[p.month]} ${String(p.year).slice(-2)}`, extent: p.extent }));
  const anomColor = seaIce.anomaly < 0 ? 'text-sky-300' : 'text-emerald-300';
  const isSection = variant === 'section';
  return (
    <Tile className={isSection ? 'p-4 md:p-5' : ''}>
      {isSection ? (
        <div className="mb-4">
          <h2 className="text-xl font-bold font-mono text-white flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
            <Snowflake className="h-5 w-5 text-sky-300" />
            <span className="min-w-0 flex-1">Global Sea Ice Extent</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">Arctic + Antarctic combined · anomaly vs {seaIce.baseline}</p>
        </div>
      ) : (
        <TileHeader
          icon={<Snowflake className="h-5 w-5 text-sky-300" />}
          title="Global Sea Ice Extent"
          subtitle={`Arctic + Antarctic combined · anomaly vs ${seaIce.baseline}`}
        />
      )}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-3xl font-bold font-mono text-white">{seaIce.latest.extent.toFixed(2)}<span className="text-sm text-gray-400 font-normal"> Mkm²</span></p>
          <p className="text-[11px] text-gray-400">{MONTH_NAMES[seaIce.latest.month]} {seaIce.latest.year}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-mono ${anomColor}`}>
            {seaIce.anomaly > 0 ? '+' : ''}{seaIce.anomaly.toFixed(2)} Mkm²
          </p>
          {seaIce.anomalyPct != null && (
            <p className="text-[11px] text-gray-400">{seaIce.anomalyPct > 0 ? '+' : ''}{seaIce.anomalyPct.toFixed(1)}% vs {seaIce.baseline}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-0.5">
            Rank: <span className="text-white font-semibold">{seaIce.rankLowestOfSameMonth}</span> lowest of {seaIce.totalYearsInMonth} {MONTH_NAMES[seaIce.latest.month]}s
          </p>
        </div>
      </div>
      <div className="h-28 mt-3 -ml-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={9} interval={11} />
            <YAxis stroke="#9CA3AF" fontSize={10} width={26} domain={[14, 26]} tickFormatter={(v) => `${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => [typeof v === 'number' ? `${v.toFixed(2)} Mkm²` : '—', 'Extent']}
            />
            <Line type="monotone" dataKey="extent" stroke="#38bdf8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">Last 60 months. Long-term trend is down - Arctic loss exceeds Antarctic variability.</p>
      <p className="text-[11px] text-gray-400 mt-1">
        Source:&nbsp;
        <a href="https://nsidc.org/arcticseaicenews/" target="_blank" rel="noopener noreferrer" className="underline text-gray-400 hover:text-gray-300">
          NSIDC via global-warming.org
        </a>
      </p>
      {!isSection && (
        <div className="mt-auto pt-2 flex justify-end text-xs">
          <Link href="/sea-levels-ice" className="inline-flex items-center gap-1 text-teal-300 hover:text-teal-200 font-semibold">
            Sea levels &amp; ice dashboard <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </Tile>
  );
}

// ─── Continental bar ────────────────────────────────────────────────────────

interface ContinentStat {
  key: string;
  label: string;
  // Rich shape (current build)
  latestMonth?: { year: number; month: number; anomaly: number } | null;
  anomaly1m?: number | null;
  nativeAnomaly1m?: number | null;
  // Legacy shape (kept until the next global-history.json is regenerated)
  latest?: { year: number; month: number; anomaly: number } | null;
}

export function ContinentalBar({ continents }: { continents: ContinentStat[] | null }) {
  if (!continents?.length) return null;
  // Resolve from new or legacy shape so the panel keeps rendering across
  // a build transition.
  const resolved = continents
    .map((c) => {
      const lm = c.latestMonth ?? c.latest ?? null;
      if (!lm || !Number.isFinite(lm.anomaly)) return null;
      const nativeAnom = typeof c.nativeAnomaly1m === 'number' ? c.nativeAnomaly1m : lm.anomaly;
      const compAnom = typeof c.anomaly1m === 'number' ? c.anomaly1m : null;
      return {
        label: c.label,
        nativeAnom,
        compAnom,
        anom: compAnom ?? nativeAnom,
        year: lm.year,
        month: lm.month,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.anom - a.anom);
  if (!resolved.length) return null;
  const latest = resolved[0];
  const usingComparison = resolved.some((r) => r.compAnom != null);
  return (
    <Tile>
      <TileHeader
        icon={<Waves className="h-5 w-5 text-orange-300" />}
        title="Continental Land Anomalies - Latest Month"
        subtitle={`${MONTH_NAMES[latest.month]} ${latest.year} · bars vs ${usingComparison ? '1961–1990' : '1901–2000'} (NOAA, land only)`}
      />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={resolved} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis type="number" stroke="#9CA3AF" fontSize={10} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}°C`} />
            <YAxis type="category" dataKey="label" stroke="#9CA3AF" fontSize={11} width={118} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any, _name: any, ctx: any) => {
                const n = typeof v === 'number' ? `${v > 0 ? '+' : ''}${v.toFixed(2)}°C` : '—';
                const r = ctx?.payload;
                if (!r) return [n, 'Anomaly'];
                const native = typeof r.nativeAnom === 'number' ? `${r.nativeAnom > 0 ? '+' : ''}${r.nativeAnom.toFixed(2)}°C` : '—';
                return [n, usingComparison ? `vs 1961–1990 (NOAA-native ${native} vs 1901–2000)` : 'vs 1901–2000 (NOAA-native)'];
              }}
            />
            <ReferenceLine x={0} stroke="#6B7280" />
            <Bar dataKey="anom" isAnimationActive={false}>
              {resolved.map((p, i) => (
                <Cell key={i} fill={p.anom > 0 ? '#fb923c' : '#60a5fa'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        Ranked warmest to coolest for the most recent complete month. Bars use the {usingComparison ? '1961–1990 baseline shared across the site' : 'NOAA-native 1901–2000 baseline'}; hover to see both figures.
      </p>
      <p className="text-[11px] text-gray-400 mt-1">
        Source:&nbsp;
        <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series" target="_blank" rel="noopener noreferrer" className="underline text-gray-400 hover:text-gray-300">
          NOAA Climate at a Glance
        </a>
      </p>
    </Tile>
  );
}

// ─── What-changed diff ──────────────────────────────────────────────────────

interface RankedStat {
  label: string;
  value: number;
  diff: number | null;
  rank: number;
  total: number;
  recordLabel: string;
  recordValue: number;
}

export function WhatChangedTile({
  current,
  previous,
}: {
  current: RankedStat | null;
  previous: RankedStat | null;
}) {
  if (!current || !previous) return null;
  const sameMonth = current.label === previous.label;
  const diffRank = current.rank - previous.rank; // positive = worse this month (lower rank number means warmer)
  const diffValue = current.diff != null && previous.diff != null ? current.diff - previous.diff : null;
  return (
    <Tile>
      <TileHeader
        icon={<Flame className="h-5 w-5 text-orange-300" />}
        title="What Changed Since Last Month"
        subtitle="Rank and anomaly movement of the latest monthly reading"
      />
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Previous snapshot</p>
          <p className="text-white font-semibold mt-0.5">{previous.label}</p>
          <p className="text-gray-400 text-xs">
            {previous.value.toFixed(2)}°C · anomaly {previous.diff != null ? (previous.diff > 0 ? '+' : '') + previous.diff.toFixed(2) + '°C' : '—'}
          </p>
          <p className="text-gray-500 text-xs">Rank: {previous.rank}/{previous.total}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Current snapshot</p>
          <p className="text-white font-semibold mt-0.5">{current.label}</p>
          <p className="text-gray-400 text-xs">
            {current.value.toFixed(2)}°C · anomaly {current.diff != null ? (current.diff > 0 ? '+' : '') + current.diff.toFixed(2) + '°C' : '—'}
          </p>
          <p className="text-gray-500 text-xs">Rank: {current.rank}/{current.total}</p>
        </div>
      </div>
      {sameMonth ? null : (
        <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-400">
          <p>
            Latest month moved from <span className="text-white">{previous.label}</span> to <span className="text-white">{current.label}</span>.
            {diffValue != null && (
              <> Anomaly changed by <span className={diffValue > 0 ? 'text-orange-300' : 'text-sky-300'}>
                {diffValue > 0 ? '+' : ''}{diffValue.toFixed(2)}°C
              </span>.</>
            )}
            {diffRank !== 0 && (
              <> Rank changed by <span className={diffRank < 0 ? 'text-orange-300' : 'text-sky-300'}>
                {diffRank > 0 ? '+' : ''}{diffRank}
              </span> (lower = warmer on record).</>
            )}
          </p>
        </div>
      )}
    </Tile>
  );
}
