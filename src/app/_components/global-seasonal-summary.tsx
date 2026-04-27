"use client";

/**
 * Global Shifting-Seasons summary used on /climate/global.
 *
 * Renders a single calendar-year (Jan-Dec) timeline with stacked rows, each
 * comparing a baseline window (dashed grey) to the present (solid colour):
 *
 *   Hemispheres
 *   ───────────
 *     • Northern Hemisphere warm season  (mean across NH C/D/E regions)
 *     • Southern Hemisphere warm season  (mean across SH C/D/E regions, wraps year-end)
 *
 *   By Köppen climate zone
 *   ──────────────────────
 *     • Temperate (C)   warm season
 *     • Continental (D) warm season
 *     • Polar (E)       warm season
 *     • Tropical (A)    wet-season onset (point marker)
 *     • Arid (B)        wet-season onset (point marker)
 *
 *   Notable Northern-Hemisphere records
 *   ───────────────────────────────────
 *     • US frost-free growing season - lengthened ~15 d since 1895 (EPA).
 *     • Kyoto cherry-blossom peak bloom - 11 d earlier vs pre-1850 (Aono & Kazui).
 *     • NH snow-free season - melt-out earlier (NOAA Rutgers GSL).
 *
 * Below `sm` we render a stacked card view because the SVG text becomes
 * unreadable when scaled to phone widths.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { GlobalShiftRecord } from '@/app/_components/global-shift-map';

type GlobalShiftData = {
  generatedAt: string;
  globalStats: {
    totalAnalysed: number;
    seasonalityCounts: { warmCold: number; wetDry: number; mixed: number; aseasonal: number };
    warmColdStats: {
      withCrossings: number;
      earlierSprings: number;
      laterAutumns: number;
    };
    wetDryStats: {
      wetSeasonsShorter: number;
      wetSeasonsLonger: number;
    };
  };
  countries: GlobalShiftRecord[];
  usStates: GlobalShiftRecord[];
  ukRegions: GlobalShiftRecord[];
};

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function dayOfYear(m: number, d: number): number {
  let s = 0;
  for (let i = 0; i < m - 1; i++) s += MONTH_DAYS[i];
  return s + d;
}
function doyToFrac(doy: number): number {
  return ((doy - 1 + 365) % 365) / 365;
}
function fracToLabel(frac: number): string {
  const doy = Math.round(frac * 365) + 1;
  let rem = doy;
  for (let i = 0; i < 12; i++) {
    if (rem <= MONTH_DAYS[i]) {
      return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]} ${rem}`;
    }
    rem -= MONTH_DAYS[i];
  }
  return '';
}

function meanOf(xs: Array<number | null | undefined>): number | null {
  const v = xs.filter((x): x is number => x !== null && x !== undefined && Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

// Circular mean for DOYs (handles wraparound — used for SH warm-season starts/ends).
function circularMeanDoy(xs: number[]): number | null {
  if (!xs.length) return null;
  let sx = 0, sy = 0;
  for (const d of xs) {
    const a = ((d - 1) / 365) * 2 * Math.PI;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  if (sx === 0 && sy === 0) return null;
  let a = Math.atan2(sy, sx);
  if (a < 0) a += 2 * Math.PI;
  return (a / (2 * Math.PI)) * 365 + 1;
}

type WarmRow = {
  key: string;
  label: string;
  color: string;
  count: number;
  hemisphere: 'N' | 'S' | 'mixed';
  baselineSpringDoy: number;
  baselineAutumnDoy: number;
  recentSpringDoy: number;
  recentAutumnDoy: number;
  meanSpringShift: number;
  meanAutumnShift: number;
  meanNetMonths: number | null;
};

type PointRow = {
  key: string;
  label: string;
  color: string;
  count: number;
  baselineDoy: number;
  recentDoy: number;
  shiftDays: number;
  detail: string;
};

type RecordRow = {
  key: string;
  label: string;
  color: string;
  baselineLabel: string;
  baselineFrac: { start: number; end: number };
  recentFrac: { start: number; end: number };
  delta: string;
};

export default function GlobalSeasonalSummary() {
  const [data, setData] = useState<GlobalShiftData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/seasons/shift-global.json')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load global shift data');
        return r.json() as Promise<GlobalShiftData>;
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const cohorts = useMemo(() => {
    if (!data) return null;
    const all: GlobalShiftRecord[] = [...data.countries, ...data.usStates, ...data.ukRegions];

    function buildWarm(filter: (r: GlobalShiftRecord) => boolean, label: string, color: string, hemisphere: WarmRow['hemisphere']): WarmRow | null {
      const rows = all.filter(
        (r) => filter(r)
          && r.temp.baselineSpringDoy !== null && r.temp.baselineAutumnDoy !== null
          && r.temp.recentSpringDoy !== null && r.temp.recentAutumnDoy !== null,
      );
      if (!rows.length) return null;
      const useCircular = hemisphere === 'S' || hemisphere === 'mixed';
      const bSpr = useCircular
        ? circularMeanDoy(rows.map((r) => r.temp.baselineSpringDoy as number))
        : meanOf(rows.map((r) => r.temp.baselineSpringDoy));
      const bAut = useCircular
        ? circularMeanDoy(rows.map((r) => r.temp.baselineAutumnDoy as number))
        : meanOf(rows.map((r) => r.temp.baselineAutumnDoy));
      const rSpr = useCircular
        ? circularMeanDoy(rows.map((r) => r.temp.recentSpringDoy as number))
        : meanOf(rows.map((r) => r.temp.recentSpringDoy));
      const rAut = useCircular
        ? circularMeanDoy(rows.map((r) => r.temp.recentAutumnDoy as number))
        : meanOf(rows.map((r) => r.temp.recentAutumnDoy));
      if (bSpr === null || bAut === null || rSpr === null || rAut === null) return null;
      return {
        key: label,
        label,
        color,
        count: rows.length,
        hemisphere,
        baselineSpringDoy: bSpr,
        baselineAutumnDoy: bAut,
        recentSpringDoy: rSpr,
        recentAutumnDoy: rAut,
        meanSpringShift: meanOf(rows.map((r) => r.temp.springShiftDays)) ?? 0,
        meanAutumnShift: meanOf(rows.map((r) => r.temp.autumnShiftDays)) ?? 0,
        meanNetMonths: meanOf(rows.map((r) => r.temp.netShiftMonths)),
      };
    }

    function buildWet(filter: (r: GlobalShiftRecord) => boolean, label: string, color: string): PointRow | null {
      const rows = all.filter(
        (r) => filter(r) && r.rain
          && r.rain.wetSeasonOnsetDoyBaseline !== null && r.rain.wetSeasonOnsetDoyBaseline !== undefined
          && r.rain.wetSeasonOnsetDoyRecent !== null && r.rain.wetSeasonOnsetDoyRecent !== undefined,
      );
      if (!rows.length) return null;
      const bDoy = circularMeanDoy(rows.map((r) => r.rain!.wetSeasonOnsetDoyBaseline as number));
      const rDoy = circularMeanDoy(rows.map((r) => r.rain!.wetSeasonOnsetDoyRecent as number));
      if (bDoy === null || rDoy === null) return null;
      const meanShift = meanOf(rows.map((r) => r.rain!.wetSeasonOnsetShiftDays)) ?? 0;
      const meanPct = meanOf(rows.map((r) => r.rain!.annualTotalShiftPct)) ?? 0;
      return {
        key: label,
        label,
        color,
        count: rows.length,
        baselineDoy: bDoy,
        recentDoy: rDoy,
        shiftDays: meanShift,
        detail: `${meanShift > 0 ? '+' : ''}${meanShift.toFixed(1)} d onset · ${meanPct > 0 ? '+' : ''}${meanPct.toFixed(1)}% annual rainfall`,
      };
    }

    const nh = buildWarm(
      (r) => r.hemisphere === 'N' && (r.koppen?.group === 'C' || r.koppen?.group === 'D' || r.koppen?.group === 'E'),
      'Northern Hemisphere warm season',
      '#FB923C',
      'N',
    );
    const sh = buildWarm(
      (r) => r.hemisphere === 'S' && (r.koppen?.group === 'C' || r.koppen?.group === 'D' || r.koppen?.group === 'E'),
      'Southern Hemisphere warm season',
      '#22D3EE',
      'S',
    );
    const c = buildWarm((r) => r.koppen?.group === 'C', 'Temperate (C) warm season', '#A3E635', 'mixed');
    const d_ = buildWarm((r) => r.koppen?.group === 'D', 'Continental (D) warm season', '#7DD3FC', 'N');
    const e = buildWarm((r) => r.koppen?.group === 'E', 'Polar (E) warm season', '#67E8F9', 'N');

    const a = buildWet((r) => r.koppen?.group === 'A', 'Tropical (A) wet-season onset', '#34D399');
    const b = buildWet((r) => r.koppen?.group === 'B', 'Arid (B) wet-season onset', '#FBBF24');

    const hemiRows: WarmRow[] = [nh, sh].filter((x): x is WarmRow => !!x);
    const koppenWarmRows: WarmRow[] = [c, d_, e].filter((x): x is WarmRow => !!x);
    const pointRows: PointRow[] = [a, b].filter((x): x is PointRow => !!x);

    return { hemiRows, koppenWarmRows, pointRows, total: all.length };
  }, [data]);

  // Hard-coded "notable records" rows — same data as the original SeasonTimelineGraphic.
  const recordRows: RecordRow[] = useMemo(() => {
    const toFrac = (m: number, d: number) => dayOfYear(m, d) / 365;
    return [
      {
        key: 'us-grow',
        label: 'US growing season',
        color: '#10B981',
        baselineLabel: '1895',
        baselineFrac: { start: toFrac(5, 4), end: toFrac(10, 7) },
        recentFrac: { start: toFrac(4, 26), end: toFrac(10, 15) },
        delta: '+15 d',
      },
      {
        key: 'nh-snow',
        label: 'NH snow-free season',
        color: '#22D3EE',
        baselineLabel: '1971–2000',
        baselineFrac: { start: toFrac(4, 24), end: toFrac(10, 28) },
        recentFrac: { start: toFrac(4, 14), end: toFrac(11, 4) },
        delta: '+17 d',
      },
    ];
  }, []);

  const kyotoRow = useMemo(() => ({
    key: 'kyoto',
    label: 'Kyoto cherry blossom peak bloom',
    color: '#F472B6',
    baselineDoy: dayOfYear(4, 17),
    recentDoy: dayOfYear(4, 6),
    shiftDays: -11,
    baselineLabel: 'pre-1850',
    detail: '11 days earlier vs pre-1850',
  }), []);

  if (error) {
    return <p className="text-sm text-red-400">Could not load global shifting-seasons data: {error}</p>;
  }
  if (!cohorts) {
    return <div className="h-32 flex items-center justify-center text-gray-500 text-sm">Loading worldwide seasonal-shift data…</div>;
  }

  const { hemiRows, koppenWarmRows, pointRows, total } = cohorts;

  // ── SVG layout ───────────────────────────────────────────────────────────
  const X0 = 220;     // left margin (room for row labels)
  const X1 = 960;
  const x = (frac: number) => X0 + frac * (X1 - X0);
  const xDoy = (doy: number) => x(doyToFrac(doy));

  const ROW_H = 56;

  type AnyRow =
    | { type: 'header'; label: string }
    | { type: 'warm'; row: WarmRow }
    | { type: 'point'; row: PointRow }
    | { type: 'record'; row: RecordRow }
    | { type: 'kyoto' };

  const layoutRows: AnyRow[] = [];
  layoutRows.push({ type: 'header', label: 'Hemispheres' });
  for (const r of hemiRows) layoutRows.push({ type: 'warm', row: r });
  layoutRows.push({ type: 'header', label: 'By Köppen climate zone' });
  for (const r of koppenWarmRows) layoutRows.push({ type: 'warm', row: r });
  for (const r of pointRows) layoutRows.push({ type: 'point', row: r });
  layoutRows.push({ type: 'header', label: 'Notable Northern-Hemisphere records' });
  for (const r of recordRows) layoutRows.push({ type: 'record', row: r });
  layoutRows.push({ type: 'kyoto' });

  // y assignments
  const yMap: number[] = [];
  let cy = 14;
  for (const item of layoutRows) {
    if (item.type === 'header') {
      yMap.push(cy);
      cy += 26;
    } else {
      yMap.push(cy);
      cy += ROW_H;
    }
  }
  const AXIS_Y = cy + 4;
  const TOTAL_H = AXIS_Y + 26;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Helper to render a "warm season" row — handles wrap (spring DOY > autumn DOY).
  function WarmSegments({
    y, springDoy, autumnDoy, color, dashed,
  }: { y: number; springDoy: number; autumnDoy: number; color: string; dashed: boolean }) {
    const wrap = springDoy > autumnDoy;
    const rectProps = dashed
      ? { fill: 'none', stroke: '#9CA3AF', strokeDasharray: '4 3' }
      : { fill: color, fillOpacity: 0.85, stroke: 'none' };
    if (!wrap) {
      return <rect x={xDoy(springDoy)} y={y} width={Math.max(2, xDoy(autumnDoy) - xDoy(springDoy))} height={10} rx={5} {...rectProps} />;
    }
    return (
      <>
        <rect x={X0} y={y} width={Math.max(2, xDoy(autumnDoy) - X0)} height={10} rx={5} {...rectProps} />
        <rect x={xDoy(springDoy)} y={y} width={Math.max(2, X1 - xDoy(springDoy))} height={10} rx={5} {...rectProps} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">
        Each row compares a baseline window (dashed grey) to the present (coloured). Across <strong className="text-[#FFF5E7]">{total}</strong> countries,
        US states and UK regions, <strong className="text-amber-300">
          {data!.globalStats.warmColdStats.earlierSprings}/{data!.globalStats.warmColdStats.withCrossings}
        </strong> have earlier springs and <strong className="text-amber-300">
          {data!.globalStats.warmColdStats.laterAutumns}/{data!.globalStats.warmColdStats.withCrossings}
        </strong> have later autumns; wet seasons have lengthened in <strong className="text-cyan-300">
          {data!.globalStats.wetDryStats.wetSeasonsLonger}
        </strong> and shortened in <strong className="text-cyan-300">{data!.globalStats.wetDryStats.wetSeasonsShorter}</strong> tropical/arid regions.
      </p>

      <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">
          <span className="hidden sm:inline">Calendar-year view · </span>Baseline vs now
        </div>

        {/* ── Mobile stacked cards ──────────────────────────────────── */}
        <div className="space-y-4 sm:hidden">
          <MobileSection title="Hemispheres">
            {hemiRows.map((r) => (
              <MobileCard
                key={r.key}
                title={r.label}
                accent={r.color}
                count={r.count}
                baselineLabel={`Baseline · ${fracToLabel(doyToFrac(r.baselineSpringDoy))} → ${fracToLabel(doyToFrac(r.baselineAutumnDoy))}`}
                nowLabel={`Now · ${fracToLabel(doyToFrac(r.recentSpringDoy))} → ${fracToLabel(doyToFrac(r.recentAutumnDoy))}`}
                delta={`${r.meanSpringShift > 0 ? '+' : ''}${r.meanSpringShift.toFixed(1)} d spring · ${r.meanAutumnShift > 0 ? '+' : ''}${r.meanAutumnShift.toFixed(1)} d autumn${r.meanNetMonths !== null ? ` · ${r.meanNetMonths > 0 ? '+' : ''}${r.meanNetMonths.toFixed(2)} mo` : ''}`}
              />
            ))}
          </MobileSection>
          <MobileSection title="By Köppen climate zone">
            {koppenWarmRows.map((r) => (
              <MobileCard
                key={r.key}
                title={r.label}
                accent={r.color}
                count={r.count}
                baselineLabel={`Baseline · ${fracToLabel(doyToFrac(r.baselineSpringDoy))} → ${fracToLabel(doyToFrac(r.baselineAutumnDoy))}`}
                nowLabel={`Now · ${fracToLabel(doyToFrac(r.recentSpringDoy))} → ${fracToLabel(doyToFrac(r.recentAutumnDoy))}`}
                delta={`${r.meanSpringShift > 0 ? '+' : ''}${r.meanSpringShift.toFixed(1)} d spring · ${r.meanAutumnShift > 0 ? '+' : ''}${r.meanAutumnShift.toFixed(1)} d autumn${r.meanNetMonths !== null ? ` · ${r.meanNetMonths > 0 ? '+' : ''}${r.meanNetMonths.toFixed(2)} mo` : ''}`}
              />
            ))}
            {pointRows.map((r) => (
              <MobileCard
                key={r.key}
                title={r.label}
                accent={r.color}
                count={r.count}
                baselineLabel={`Baseline · ${fracToLabel(doyToFrac(r.baselineDoy))}`}
                nowLabel={`Now · ${fracToLabel(doyToFrac(r.recentDoy))}`}
                delta={r.detail}
              />
            ))}
          </MobileSection>
          <MobileSection title="Notable NH records">
            {recordRows.map((r) => (
              <MobileCard
                key={r.key}
                title={r.label}
                accent={r.color}
                count={null}
                baselineLabel={`${r.baselineLabel} · ${fracToLabel(r.baselineFrac.start)} → ${fracToLabel(r.baselineFrac.end)}`}
                nowLabel={`Now · ${fracToLabel(r.recentFrac.start)} → ${fracToLabel(r.recentFrac.end)}`}
                delta={r.delta}
              />
            ))}
            <MobileCard
              title={kyotoRow.label}
              accent={kyotoRow.color}
              count={null}
              baselineLabel={`${kyotoRow.baselineLabel} · ${fracToLabel(doyToFrac(kyotoRow.baselineDoy))}`}
              nowLabel={`Now · ${fracToLabel(doyToFrac(kyotoRow.recentDoy))}`}
              delta={kyotoRow.detail}
            />
          </MobileSection>
        </div>

        {/* ── Wide SVG calendar view ────────────────────────────────── */}
        <svg
          viewBox={`0 0 1000 ${TOTAL_H}`}
          className="w-full h-auto hidden sm:block"
          role="img"
          aria-label="Calendar-year shifting-seasons summary across hemispheres, Köppen zones and notable records"
        >
          <defs>
            <marker id="arrowPink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#F472B6" />
            </marker>
          </defs>

          {layoutRows.map((item, idx) => {
            const y = yMap[idx];
            if (item.type === 'header') {
              return (
                <text
                  key={`hdr-${idx}`}
                  x={0} y={y + 14}
                  fontSize={11}
                  fill="#9CA3AF"
                  fontFamily="ui-monospace, monospace"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  {item.label}
                </text>
              );
            }
            if (item.type === 'warm') {
              const r = item.row;
              const baseY = y;
              const nowY = y + 14;
              return (
                <g key={r.key}>
                  <text x={0} y={baseY + 8} fontSize={12} fill="#D1D5DB" fontFamily="ui-monospace, monospace">{r.label}</text>
                  <text x={0} y={baseY + 22} fontSize={10} fill="#6B7280" fontFamily="ui-monospace, monospace">{r.count} regions</text>
                  <WarmSegments y={baseY} springDoy={r.baselineSpringDoy} autumnDoy={r.baselineAutumnDoy} color={r.color} dashed />
                  <WarmSegments y={nowY} springDoy={r.recentSpringDoy} autumnDoy={r.recentAutumnDoy} color={r.color} dashed={false} />
                  <text x={X0} y={nowY + 26} fontSize={11} fill={r.color} fontFamily="ui-monospace, monospace">
                    Mean spring {r.meanSpringShift > 0 ? '+' : ''}{r.meanSpringShift.toFixed(1)} d · autumn {r.meanAutumnShift > 0 ? '+' : ''}{r.meanAutumnShift.toFixed(1)} d{r.meanNetMonths !== null ? ` · warm season ${r.meanNetMonths > 0 ? '+' : ''}${r.meanNetMonths.toFixed(2)} mo` : ''}
                  </text>
                </g>
              );
            }
            if (item.type === 'point') {
              const r = item.row;
              const cy2 = y + 14;
              return (
                <g key={r.key}>
                  <text x={0} y={y + 8} fontSize={12} fill="#D1D5DB" fontFamily="ui-monospace, monospace">{r.label}</text>
                  <text x={0} y={y + 22} fontSize={10} fill="#6B7280" fontFamily="ui-monospace, monospace">{r.count} regions</text>
                  <line x1={X0} y1={cy2} x2={X1} y2={cy2} stroke="#374151" strokeWidth={1} />
                  <circle cx={xDoy(r.baselineDoy)} cy={cy2} r={6} fill="none" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="2 2" />
                  <circle cx={xDoy(r.recentDoy)} cy={cy2} r={6} fill={r.color} />
                  <text x={X0} y={cy2 + 22} fontSize={11} fill={r.color} fontFamily="ui-monospace, monospace">{r.detail}</text>
                </g>
              );
            }
            if (item.type === 'record') {
              const r = item.row;
              const baseY = y;
              const nowY = y + 14;
              const baselineDays = Math.round((r.baselineFrac.end - r.baselineFrac.start) * 365);
              const recentDays = Math.round((r.recentFrac.end - r.recentFrac.start) * 365);
              return (
                <g key={r.key}>
                  <text x={0} y={baseY + 8} fontSize={12} fill="#D1D5DB" fontFamily="ui-monospace, monospace">{r.label}</text>
                  <text x={0} y={baseY + 22} fontSize={10} fill="#6B7280" fontFamily="ui-monospace, monospace">{r.baselineLabel} baseline</text>
                  <rect x={x(r.baselineFrac.start)} y={baseY} width={x(r.baselineFrac.end) - x(r.baselineFrac.start)} height={10} rx={5} fill="none" stroke="#9CA3AF" strokeDasharray="4 3" />
                  <rect x={x(r.recentFrac.start)} y={nowY} width={x(r.recentFrac.end) - x(r.recentFrac.start)} height={10} rx={5} fill={r.color} fillOpacity={0.85} />
                  <text x={X0} y={nowY + 26} fontSize={11} fill={r.color} fontFamily="ui-monospace, monospace">
                    {baselineDays} d → {recentDays} d ({r.delta})
                  </text>
                </g>
              );
            }
            // kyoto
            const cy2 = y + 14;
            return (
              <g key="kyoto">
                <text x={0} y={y + 8} fontSize={12} fill="#D1D5DB" fontFamily="ui-monospace, monospace">{kyotoRow.label}</text>
                <text x={0} y={y + 22} fontSize={10} fill="#6B7280" fontFamily="ui-monospace, monospace">{kyotoRow.baselineLabel} mean</text>
                <line x1={X0} y1={cy2} x2={X1} y2={cy2} stroke="#374151" strokeWidth={1} />
                <circle cx={xDoy(kyotoRow.baselineDoy)} cy={cy2} r={6} fill="none" stroke="#F9A8D4" strokeWidth={2} />
                <circle cx={xDoy(kyotoRow.recentDoy)} cy={cy2} r={6} fill={kyotoRow.color} />
                <line x1={xDoy(kyotoRow.baselineDoy) - 6} y1={cy2} x2={xDoy(kyotoRow.recentDoy) + 8} y2={cy2} stroke={kyotoRow.color} strokeWidth={1.5} markerEnd="url(#arrowPink)" />
                <text x={X0} y={cy2 + 22} fontSize={11} fill={kyotoRow.color} fontFamily="ui-monospace, monospace">{kyotoRow.detail}</text>
              </g>
            );
          })}

          {/* Month axis */}
          <line x1={X0} y1={AXIS_Y} x2={X1} y2={AXIS_Y} stroke="#4B5563" strokeWidth={1} />
          {months.map((m, i) => {
            const cx = x((i + 0.5) / 12);
            return (
              <g key={m}>
                <line x1={cx} y1={AXIS_Y - 4} x2={cx} y2={AXIS_Y + 4} stroke="#6B7280" strokeWidth={1} />
                <text x={cx} y={AXIS_Y + 18} textAnchor="middle" fontSize={12} fill="#9CA3AF" fontFamily="ui-monospace, monospace">{m}</text>
              </g>
            );
          })}
        </svg>

        {/* Legend (wide only) */}
        <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm border border-dashed border-gray-500" />
            Baseline window
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm bg-orange-400" />
            Warm season (now)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Wet-season onset
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-pink-400" />
            Kyoto peak bloom
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Sources: NOAA NClimDiv (US states), Met Office HadUK-Grid (UK regions), Berkeley Earth and country-level Climate Reanalyzer aggregates;
        EPA frost-free growing season; Aono &amp; Kazui 2008 Kyoto peak-bloom record; NOAA Rutgers Global Snow Lab. Warm-season metrics use 1951–1980 vs 2001–2024.
      </p>

      <div className="flex justify-end">
        <Link
          href="/climate/shifting-seasons"
          className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
        >
          Explore Shifting Seasons worldwide
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-mono mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MobileCard({
  title, accent, count, baselineLabel, nowLabel, delta,
}: {
  title: string;
  accent: string;
  count: number | null;
  baselineLabel: string;
  nowLabel: string;
  delta: string;
}) {
  return (
    <div className="rounded-lg border border-gray-700/60 bg-gray-900/60 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
        <span className="text-sm font-mono text-gray-200 flex-1">{title}</span>
        {count !== null && <span className="text-[11px] text-gray-500">{count} regions</span>}
      </div>
      <div className="text-xs text-gray-400 font-mono">{baselineLabel}</div>
      <div className="text-xs font-mono mt-0.5" style={{ color: accent }}>{nowLabel}</div>
      <div className="text-sm font-bold font-mono mt-1.5" style={{ color: accent }}>{delta}</div>
    </div>
  );
}
