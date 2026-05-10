"use client";

/**
 * Shared calendar-year (Jan-Dec) timeline used by:
 *   • src/app/_components/global-seasonal-summary.tsx     (/climate/global)
 *   • src/app/_components/season-timeline-graphic.tsx     (/climate/shifting-seasons)
 *   • src/app/_components/seasonal-shift-card.tsx         (per-region pages)
 *
 * All text rendered as plain HTML at fixed CSS sizes; only bar/point geometry
 * is positioned via percentage-of-container so the chart compresses cleanly
 * on phones without shrinking the text.
 *
 * Each row uses its own 2-column grid [label | track] so labels and bars stay
 * visually bound. Bar rows render baseline (dashed outline, top half) above
 * recent (filled, bottom half). Point rows mirror that structure with a
 * hollow circle on the top half and a filled circle on the bottom half — so
 * even when the two dates are within a day of each other the markers stay
 * visible (no overlap).
 */

import React from 'react';
import { Flower2, Leaf, Droplet, Sun } from 'lucide-react';

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayOfYear(month: number, day: number): number {
  let s = 0;
  for (let i = 0; i < month - 1; i++) s += MONTH_DAYS[i];
  return s + day;
}

export function doyToFrac(doy: number): number {
  return ((doy - 1 + 365) % 365) / 365;
}

export function doyToLabel(doy: number): string {
  let rem = Math.round(doy);
  if (rem < 1) rem = 1;
  if (rem > 365) rem = 365;
  for (let i = 0; i < 12; i++) {
    if (rem <= MONTH_DAYS[i]) return `${MONTH_NAMES[i]} ${rem}`;
    rem -= MONTH_DAYS[i];
  }
  return '';
}

export type TimelineRow =
  | {
      kind: 'header';
      key: string;
      label: string;
      /** accent colour for the left stripe + section title */
      accent?: string;
    }
  | {
      kind: 'bar';
      key: string;
      title: string;
      sub?: string;
      delta?: string;
      deltaColor?: string;
      recentColor: string;
      baselineSpringDoy: number;
      baselineAutumnDoy: number;
      recentSpringDoy: number;
      recentAutumnDoy: number;
      /** When true, render the recent bar with a spring-green → summer-yellow
       *  → autumn-russet gradient and add flower / leaf icons at its ends. */
      seasonalPalette?: boolean;
    }
  | {
      kind: 'fixed-bar';
      key: string;
      title: string;
      sub?: string;
      delta?: string;
      deltaColor?: string;
      recentColor: string;
      baselineFrac: { start: number; end: number };
      recentFrac: { start: number; end: number };
      seasonalPalette?: boolean;
    }
  | {
      kind: 'point';
      key: string;
      title: string;
      sub?: string;
      delta?: string;
      deltaColor?: string;
      color: string;
      baselineDoy: number;
      recentDoy: number;
      /** Visual variant for the recent marker. 'wet' = droplet icon on top
       *  of the dot, used for wet-season-onset rows. */
      pointStyle?: 'wet' | 'bloom';
    };

export default function CalendarTimeline({
  rows,
  className = '',
  labelColPx = 192,
  showAxis = true,
}: {
  rows: TimelineRow[];
  className?: string;
  /** desktop label column width in px (mobile collapses to single column) */
  labelColPx?: number;
  /** render the Jan-Dec axis row at the bottom (default true) */
  showAxis?: boolean;
}) {
  const cssVars: React.CSSProperties = {
    // @ts-expect-error CSS custom property
    '--cal-label-col': `${labelColPx}px`,
  };

  return (
    <div className={`cal-timeline ${className}`} style={cssVars}>
      {rows.map((row) => {
        switch (row.kind) {
          case 'header':
            return <SectionHeader key={row.key} label={row.label} accent={row.accent} />;
          case 'bar':
            return (
              <BarRow
                key={row.key}
                title={row.title}
                sub={row.sub}
                delta={row.delta}
                deltaColor={row.deltaColor}
                recentColor={row.recentColor}
                baselineFracStart={doyToFrac(row.baselineSpringDoy)}
                baselineFracEnd={doyToFrac(row.baselineAutumnDoy)}
                baselineWraps={row.baselineSpringDoy > row.baselineAutumnDoy}
                recentFracStart={doyToFrac(row.recentSpringDoy)}
                recentFracEnd={doyToFrac(row.recentAutumnDoy)}
                recentWraps={row.recentSpringDoy > row.recentAutumnDoy}
                seasonalPalette={row.seasonalPalette}
              />
            );
          case 'fixed-bar':
            return (
              <BarRow
                key={row.key}
                title={row.title}
                sub={row.sub}
                delta={row.delta}
                deltaColor={row.deltaColor}
                recentColor={row.recentColor}
                baselineFracStart={row.baselineFrac.start}
                baselineFracEnd={row.baselineFrac.end}
                baselineWraps={row.baselineFrac.start > row.baselineFrac.end}
                recentFracStart={row.recentFrac.start}
                recentFracEnd={row.recentFrac.end}
                recentWraps={row.recentFrac.start > row.recentFrac.end}
                seasonalPalette={row.seasonalPalette}
              />
            );
          case 'point':
            return (
              <PointRow
                key={row.key}
                title={row.title}
                sub={row.sub}
                delta={row.delta}
                deltaColor={row.deltaColor}
                color={row.color}
                baselineFrac={doyToFrac(row.baselineDoy)}
                recentFrac={doyToFrac(row.recentDoy)}
                pointStyle={row.pointStyle}
              />
            );
        }
      })}
      {showAxis && <MonthAxisRow />}
    </div>
  );
}

/* ───────────────────────── Constants ───────────────────────── */

const TRACK_H = 58;       // overall row track height (px) - leaves room for season icons under recent bar
const BAR_TOP = 8;        // top offset of baseline bar
const BAR_H = 14;         // bar thickness
const RECENT_TOP = 26;    // top offset of recent bar
const POINT_SIZE = 14;    // marker diameter

/* ───────────────────────── Row primitives ───────────────────────── */

function RowLabel({
  title, sub, delta, deltaColor,
}: {
  title: string;
  sub?: string;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <div className="cal-row-label flex flex-col justify-center min-w-0">
      <div className="text-sm font-mono font-medium text-gray-100 leading-snug">{title}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{sub}</div>}
      {delta && (
        <div className="mt-1.5">
          <span
            className="inline-block text-[11px] font-mono px-1.5 py-0.5 rounded"
            style={{
              color: deltaColor ?? '#FDE68A',
              background: hexToRgba(deltaColor ?? '#FDE68A', 0.12),
              border: `1px solid ${hexToRgba(deltaColor ?? '#FDE68A', 0.35)}`,
            }}
          >
            {delta}
          </span>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, accent }: { label: string; accent?: string }) {
  const c = accent ?? '#94A3B8';
  return (
    <div className="cal-section-header">
      <span className="inline-block w-1 h-4 rounded-full shrink-0" style={{ background: c }} />
      <span
        className="text-[11px] uppercase font-semibold tracking-[0.18em] whitespace-nowrap"
        style={{ color: c }}
      >
        {label}
      </span>
      <span className="flex-1 h-px" style={{ background: hexToRgba(c, 0.25) }} />
    </div>
  );
}

/* ───────────────────────── Bar / Point rows ───────────────────────── */

function BarRow({
  title, sub, delta, deltaColor, recentColor,
  baselineFracStart, baselineFracEnd, baselineWraps,
  recentFracStart, recentFracEnd, recentWraps,
  seasonalPalette,
}: {
  title: string;
  sub?: string;
  delta?: string;
  deltaColor?: string;
  recentColor: string;
  baselineFracStart: number;
  baselineFracEnd: number;
  baselineWraps: boolean;
  recentFracStart: number;
  recentFracEnd: number;
  recentWraps: boolean;
  seasonalPalette?: boolean;
}) {
  return (
    <div className="cal-row">
      <RowLabel title={title} sub={sub} delta={delta} deltaColor={deltaColor} />
      <div className="cal-row-track" style={{ height: TRACK_H }}>
        <TrackBackdrop />
        {renderBarSegments({
          start: baselineFracStart,
          end: baselineFracEnd,
          wraps: baselineWraps,
          variant: 'baseline',
          color: recentColor,
          top: BAR_TOP,
        })}
        {renderBarSegments({
          start: recentFracStart,
          end: recentFracEnd,
          wraps: recentWraps,
          variant: 'recent',
          color: recentColor,
          top: RECENT_TOP,
          seasonalPalette,
        })}
      </div>
    </div>
  );
}

/* ── Seasonal palette helpers ─────────────────────────────────
 * The recent bar can opt into a horizontal gradient that maps the bar's
 * own length onto a spring-green → summer-yellow → autumn-russet ramp.
 * For wrapping bars (e.g. SH summer Sep→Apr) we render two segments and
 * give each its own slice of the gradient so the colour ramp continues
 * across the year boundary. */
const SEASON_STOPS: Array<[number, [number, number, number]]> = [
  [0.00, [101, 163, 13]],   // #65A30D spring green
  [0.18, [163, 203, 56]],   // #A3CB38 yellow-green
  [0.35, [234, 179, 8]],    // #EAB308 summer yellow
  [0.65, [234, 179, 8]],    // #EAB308 summer yellow (plateau)
  [0.82, [217, 119, 6]],    // #D97706 amber-orange
  [1.00, [180, 83, 9]],     // #B45309 autumn russet
];
function seasonColorAt(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < SEASON_STOPS.length; i++) {
    const [t0, c0] = SEASON_STOPS[i - 1];
    const [t1, c1] = SEASON_STOPS[i];
    if (x <= t1) {
      const u = (x - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * u);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * u);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * u);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const [, last] = SEASON_STOPS[SEASON_STOPS.length - 1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}
function seasonalGradient(t0: number, t1: number): string {
  // produce a linear-gradient with stops sampled across [t0, t1]
  const stops: string[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const t = t0 + (t1 - t0) * u;
    stops.push(`${seasonColorAt(t)} ${Math.round(u * 100)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function renderBarSegments({
  start, end, wraps, variant, color, top, seasonalPalette,
}: {
  start: number;
  end: number;
  wraps: boolean;
  variant: 'baseline' | 'recent';
  color: string;
  top: number;
  seasonalPalette?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top,
    height: BAR_H,
    borderRadius: 9999,
  };

  // Total bar length as a fraction of the year (handles wrapping).
  const totalLen = wraps ? (1 - start) + end : Math.max(1e-6, end - start);

  function recentSegStyle(progressFrom: number, progressTo: number): React.CSSProperties {
    if (seasonalPalette) {
      return {
        ...baseStyle,
        backgroundImage: seasonalGradient(progressFrom, progressTo),
        boxShadow: `inset 0 0 0 1px ${hexToRgba(color, 0.45)}, 0 0 14px ${hexToRgba(color, 0.30)}`,
      };
    }
    return {
      ...baseStyle,
      background: `linear-gradient(180deg, ${hexToRgba(color, 1)}, ${hexToRgba(color, 0.85)})`,
      boxShadow: `inset 0 0 0 1px ${hexToRgba(color, 0.35)}, 0 0 14px ${hexToRgba(color, 0.35)}`,
    };
  }

  if (variant === 'baseline') {
    const segStyle: React.CSSProperties = {
      ...baseStyle,
      border: '1.5px dashed #94A3B8',
      background: 'rgba(148,163,184,0.08)',
    };
    if (!wraps) {
      const left = `${Math.min(start, end) * 100}%`;
      const width = `${Math.max(0.01, Math.abs(end - start)) * 100}%`;
      return <div style={{ ...segStyle, left, width }} />;
    }
    return (
      <>
        <div style={{ ...segStyle, left: 0, width: `${end * 100}%` }} />
        <div style={{ ...segStyle, left: `${start * 100}%`, width: `${(1 - start) * 100}%` }} />
      </>
    );
  }

  // recent variant
  if (!wraps) {
    const segStart = Math.min(start, end);
    const segEnd = Math.max(start, end);
    const width = Math.max(0.01, segEnd - segStart);
    return (
      <>
        <div style={{ ...recentSegStyle(0, 1), left: `${segStart * 100}%`, width: `${width * 100}%` }} />
        {seasonalPalette && (
          <SeasonalEndcaps
            startPct={segStart * 100}
            endPct={segEnd * 100}
            top={top}
          />
        )}
      </>
    );
  }
  // wraps: two segments
  const seg1Len = end;                 // 0 .. end
  const seg2Len = 1 - start;           // start .. 1
  // Segment 2 (start..1) holds the FIRST part of the season (spring side).
  // Segment 1 (0..end)   holds the LAST part (autumn side).
  const split = seg2Len / totalLen;    // where the year boundary falls in [0,1] season-progress
  return (
    <>
      <div
        style={{
          ...recentSegStyle(split, 1),
          left: 0,
          width: `${seg1Len * 100}%`,
        }}
      />
      <div
        style={{
          ...recentSegStyle(0, split),
          left: `${start * 100}%`,
          width: `${seg2Len * 100}%`,
        }}
      />
      {seasonalPalette && (
        <SeasonalEndcaps
          startPct={start * 100}
          endPct={end * 100}
          top={top}
        />
      )}
    </>
  );
}

/** Spring flower / midsummer sun / autumn leaf icons placed UNDER the recent
 *  warm bar so they don't overlap it. Each is tinted to match the season:
 *  pink flower, amber sun, russet leaf. The sun sits at the bar's midpoint
 *  (handles wrapping bars by computing the circular midpoint). */
function SeasonalEndcaps({
  startPct, endPct, top,
}: { startPct: number; endPct: number; top: number }) {
  const iconSize = 14;
  // Place icons centred just below the bar.
  const cy = top + BAR_H + 7;
  // Midpoint along the year axis: if bar wraps (end < start) the midpoint
  // sits in the second half of the year.
  const midPct = endPct >= startPct
    ? (startPct + endPct) / 2
    : ((startPct + endPct + 100) / 2) % 100;
  const iconStyle = (leftPct: number, color: string): React.CSSProperties => ({
    position: 'absolute',
    left: `${leftPct}%`,
    top: cy,
    transform: 'translate(-50%, -50%)',
    color,
    filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,0.7))',
    lineHeight: 0,
  });
  return (
    <>
      <span className="pointer-events-none" style={iconStyle(startPct, '#F472B6')} aria-hidden>
        <Flower2 width={iconSize} height={iconSize} />
      </span>
      <span className="pointer-events-none" style={iconStyle(midPct, '#FCD34D')} aria-hidden>
        <Sun width={iconSize} height={iconSize} fill="#FCD34D" />
      </span>
      <span className="pointer-events-none" style={iconStyle(endPct, '#C2410C')} aria-hidden>
        <Leaf width={iconSize} height={iconSize} />
      </span>
    </>
  );
}

function PointRow({
  title, sub, delta, deltaColor, color, baselineFrac, recentFrac, pointStyle,
}: {
  title: string;
  sub?: string;
  delta?: string;
  deltaColor?: string;
  color: string;
  baselineFrac: number;
  recentFrac: number;
  pointStyle?: 'wet' | 'bloom';
}) {
  const reversed = recentFrac < baselineFrac;
  const baselineCenter = BAR_TOP + BAR_H / 2;
  const recentCenter = RECENT_TOP + BAR_H / 2;

  return (
    <div className="cal-row">
      <RowLabel title={title} sub={sub} delta={delta} deltaColor={deltaColor} />
      <div className="cal-row-track" style={{ height: TRACK_H }}>
        <TrackBackdrop />
        {/* faint connector between baseline and recent markers */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <line
            x1={baselineFrac * 100}
            y1={(baselineCenter / TRACK_H) * 100}
            x2={recentFrac * 100}
            y2={(recentCenter / TRACK_H) * 100}
            stroke={color}
            strokeOpacity={0.55}
            strokeWidth={0.6}
            strokeDasharray="2 1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* baseline marker (hollow, on top track) */}
        <div
          className="absolute rounded-full"
          style={{
            left: `${baselineFrac * 100}%`,
            top: BAR_TOP,
            width: POINT_SIZE,
            height: POINT_SIZE,
            transform: 'translateX(-50%)',
            border: '1.5px dashed #94A3B8',
            background: 'rgba(148,163,184,0.08)',
          }}
        />
        {/* recent marker (filled, on bottom track) */}
        <div
          className="absolute rounded-full"
          style={{
            left: `${recentFrac * 100}%`,
            top: RECENT_TOP,
            width: POINT_SIZE,
            height: POINT_SIZE,
            transform: 'translateX(-50%)',
            background: `radial-gradient(circle at 35% 35%, ${hexToRgba(color, 1)}, ${hexToRgba(color, 0.85)})`,
            boxShadow: `inset 0 0 0 1px ${hexToRgba(color, 0.35)}, 0 0 12px ${hexToRgba(color, 0.45)}`,
          }}
        />
        {pointStyle === 'wet' && (
          <span
            className="absolute pointer-events-none"
            style={{
              left: `${recentFrac * 100}%`,
              top: RECENT_TOP + POINT_SIZE / 2,
              transform: 'translate(-50%, -50%)',
              color: '#F0F9FF',
              filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,0.6))',
              lineHeight: 0,
            }}
            aria-hidden
          >
            <Droplet width={9} height={9} fill="currentColor" />
          </span>
        )}
        {pointStyle === 'bloom' && (
          <span
            className="absolute pointer-events-none"
            style={{
              left: `${recentFrac * 100}%`,
              top: RECENT_TOP + POINT_SIZE / 2,
              transform: 'translate(-50%, -50%)',
              color: '#FDF2F8',
              filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,0.6))',
              lineHeight: 0,
            }}
            aria-hidden
          >
            <Flower2 width={9} height={9} />
          </span>
        )}
        {/* tiny direction chevron next to recent marker */}
        <div
          className="absolute font-mono"
          style={{
            left: `${recentFrac * 100}%`,
            top: RECENT_TOP + BAR_H / 2,
            transform: `translate(${reversed ? 'calc(-50% - 14px)' : 'calc(-50% + 14px)'}, -50%)`,
            color: hexToRgba(color, 0.9),
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          {reversed ? '←' : '→'}
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Track backdrop ───────────────── */

function TrackBackdrop() {
  return (
    <>
      <div
        className="absolute left-0 right-0"
        style={{
          top: BAR_TOP + BAR_H / 2,
          height: 1,
          background:
            'linear-gradient(90deg, rgba(148,163,184,0) 0%, rgba(148,163,184,0.18) 8%, rgba(148,163,184,0.18) 92%, rgba(148,163,184,0) 100%)',
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          top: RECENT_TOP + BAR_H / 2,
          height: 1,
          background:
            'linear-gradient(90deg, rgba(148,163,184,0) 0%, rgba(148,163,184,0.18) 8%, rgba(148,163,184,0.18) 92%, rgba(148,163,184,0) 100%)',
        }}
      />
    </>
  );
}

/* ───────────────────────── Month axis ───────────────────────── */

function MonthAxisRow() {
  return (
    <div className="cal-row cal-row-axis">
      <div /> {/* spacer for label column on sm+ */}
      <div className="relative h-7 mt-1 border-t border-gray-700">
        {MONTH_NAMES.map((m, i) => {
          const left = ((i + 0.5) / 12) * 100;
          return (
            <React.Fragment key={m}>
              <div
                className="absolute top-0 w-px h-1.5 bg-gray-600"
                style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
              />
              <span
                className="hidden sm:block absolute text-[10px] text-gray-400 font-mono"
                style={{ left: `${left}%`, top: 6, transform: 'translateX(-50%)' }}
              >
                {m}
              </span>
              <span
                className="sm:hidden absolute text-[10px] text-gray-400 font-mono"
                style={{ left: `${left}%`, top: 6, transform: 'translateX(-50%)' }}
              >
                {m[0]}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Utility ───────────────────────── */

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
