"use client";

import React from 'react';

/**
 * Calendar-year timeline showing Northern-Hemisphere timing shifts driven by
 * warming. Each stacked row is a separate baseline-vs-current comparison on
 * the same Jan–Dec axis:
 *   1. US frost-free growing season - lengthened ~15 days since 1895 (EPA).
 *   2. Kyoto cherry-blossom peak-bloom date - 11 days earlier vs pre-1850
 *      (1,200-year record).
 *   3. NH spring snow cover - end-of-season melt is now ~5 days earlier
 *      than the 1971-2000 baseline (NOAA Rutgers GSL, NH4).
 *
 * SVG is drawn on a viewBox of 0..1000 wide and the full row stack tall,
 * then scaled to the parent width.
 */
export default function SeasonTimelineGraphic() {
  // fraction-of-year → x-coordinate on a 60..960 track (leaves margin for labels)
  const X0 = 60;
  const X1 = 960;
  const x = (frac: number) => X0 + frac * (X1 - X0);
  const dayOfYear = (m: number, d: number) => {
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let sum = 0;
    for (let i = 0; i < m - 1; i++) sum += days[i];
    return sum + d;
  };
  const toFrac = (m: number, d: number) => dayOfYear(m, d) / 365;

  // Row Y-positions
  const ROW_H = 64;
  const GROW_Y = 22;
  const BLOSSOM_Y = GROW_Y + ROW_H;
  const SNOW_Y = BLOSSOM_Y + ROW_H;
  const AXIS_Y = SNOW_Y + ROW_H + 4;
  const TOTAL_H = AXIS_Y + 26;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Growing season (US, EPA)
  const growOldStart = toFrac(5, 4);
  const growOldEnd = toFrac(10, 7);
  const growNewStart = toFrac(4, 26);
  const growNewEnd = toFrac(10, 15);

  // Kyoto cherry-blossom peak bloom
  const kyotoOld = toFrac(4, 17);
  const kyotoNew = toFrac(4, 6);

  // NH snow cover (Rutgers Global Snow Lab); snow season runs Nov through Apr
  // Use snow-absent window (approximate) for the "snow-free" bar.
  // Baseline snow-free: late Apr → late Oct ; current: mid-Apr → early Nov.
  const snowOldStart = toFrac(4, 24);
  const snowOldEnd = toFrac(10, 28);
  const snowNewStart = toFrac(4, 14);
  const snowNewEnd = toFrac(11, 4);

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">
        Calendar-year view - Northern Hemisphere
      </div>
      <svg
        viewBox={`0 0 1000 ${TOTAL_H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Seasonal timing shifts across the calendar year - US growing season, Kyoto cherry blossom, NH snow-free season"
      >
        <defs>
          <marker id="arrowPink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#F472B6" />
          </marker>
        </defs>

        {/* ───────── Row 1: US growing season ───────── */}
        <text x={X0} y={GROW_Y - 6} fontSize={11} fill="#9CA3AF" fontFamily="ui-monospace, monospace">
          US growing season
        </text>
        {/* historical (dashed outline) */}
        <rect x={x(growOldStart)} y={GROW_Y} width={x(growOldEnd) - x(growOldStart)} height={10} rx={5} fill="none" stroke="#9CA3AF" strokeDasharray="4 3" />
        <text x={(x(growOldStart) + x(growOldEnd)) / 2} y={GROW_Y - 2} textAnchor="middle" fontSize={10} fill="#9CA3AF" fontFamily="ui-monospace, monospace">
          1895 baseline · {Math.round((growOldEnd - growOldStart) * 365)} days
        </text>
        {/* current (solid emerald) */}
        <rect x={x(growNewStart)} y={GROW_Y + 14} width={x(growNewEnd) - x(growNewStart)} height={10} rx={5} fill="#10B981" fillOpacity={0.85} />
        <text x={(x(growNewStart) + x(growNewEnd)) / 2} y={GROW_Y + 36} textAnchor="middle" fontSize={11} fill="#6EE7B7" fontFamily="ui-monospace, monospace">
          Now · {Math.round((growNewEnd - growNewStart) * 365)} days (+{Math.round((growNewEnd - growNewStart - (growOldEnd - growOldStart)) * 365)})
        </text>

        {/* ───────── Row 2: Kyoto blossom ───────── */}
        <text x={X0} y={BLOSSOM_Y - 6} fontSize={11} fill="#9CA3AF" fontFamily="ui-monospace, monospace">
          Kyoto cherry blossom peak bloom
        </text>
        {/* axis track (thin) */}
        <line x1={X0} y1={BLOSSOM_Y + 16} x2={X1} y2={BLOSSOM_Y + 16} stroke="#374151" strokeWidth={1} />
        {/* historical (hollow) */}
        <circle cx={x(kyotoOld)} cy={BLOSSOM_Y + 16} r={6} fill="none" stroke="#F9A8D4" strokeWidth={2} />
        <text x={x(kyotoOld) + 10} y={BLOSSOM_Y + 20} fontSize={10} fill="#9CA3AF" fontFamily="ui-monospace, monospace">
          historic Apr 17
        </text>
        {/* current (filled) */}
        <circle cx={x(kyotoNew)} cy={BLOSSOM_Y + 16} r={6} fill="#F472B6" />
        {/* arrow between old and new */}
        <line x1={x(kyotoOld) - 6} y1={BLOSSOM_Y + 16} x2={x(kyotoNew) + 8} y2={BLOSSOM_Y + 16} stroke="#F472B6" strokeWidth={1.5} markerEnd="url(#arrowPink)" />
        <text x={x(kyotoNew) - 10} y={BLOSSOM_Y + 36} textAnchor="end" fontSize={11} fill="#F472B6" fontFamily="ui-monospace, monospace">
          Now Apr 6 · 11 days earlier
        </text>

        {/* ───────── Row 3: NH snow-free season ───────── */}
        <text x={X0} y={SNOW_Y - 6} fontSize={11} fill="#9CA3AF" fontFamily="ui-monospace, monospace">
          NH snow-free season
        </text>
        {/* historical (dashed outline) */}
        <rect x={x(snowOldStart)} y={SNOW_Y} width={x(snowOldEnd) - x(snowOldStart)} height={10} rx={5} fill="none" stroke="#9CA3AF" strokeDasharray="4 3" />
        <text x={(x(snowOldStart) + x(snowOldEnd)) / 2} y={SNOW_Y - 2} textAnchor="middle" fontSize={10} fill="#9CA3AF" fontFamily="ui-monospace, monospace">
          1971–2000 baseline · {Math.round((snowOldEnd - snowOldStart) * 365)} days
        </text>
        {/* current (solid cyan) */}
        <rect x={x(snowNewStart)} y={SNOW_Y + 14} width={x(snowNewEnd) - x(snowNewStart)} height={10} rx={5} fill="#22D3EE" fillOpacity={0.8} />
        <text x={(x(snowNewStart) + x(snowNewEnd)) / 2} y={SNOW_Y + 36} textAnchor="middle" fontSize={11} fill="#67E8F9" fontFamily="ui-monospace, monospace">
          Now · {Math.round((snowNewEnd - snowNewStart) * 365)} days (+{Math.round((snowNewEnd - snowNewStart - (snowOldEnd - snowOldStart)) * 365)})
        </text>

        {/* ───────── Month axis ───────── */}
        <line x1={X0} y1={AXIS_Y} x2={X1} y2={AXIS_Y} stroke="#4B5563" strokeWidth={1} />
        {months.map((m, i) => {
          const cx = x((i + 0.5) / 12);
          return (
            <g key={m}>
              <line x1={cx} y1={AXIS_Y - 4} x2={cx} y2={AXIS_Y + 4} stroke="#6B7280" strokeWidth={1} />
              <text x={cx} y={AXIS_Y + 18} textAnchor="middle" fontSize={12} fill="#9CA3AF" fontFamily="ui-monospace, monospace">
                {m}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#10B981', opacity: 0.85 }} />
          Growing season (current)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#22D3EE', opacity: 0.8 }} />
          Snow-free season (current)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm border border-dashed border-gray-500" />
          Baseline
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-pink-400" />
          Kyoto peak bloom
        </span>
      </div>
    </div>
  );
}
