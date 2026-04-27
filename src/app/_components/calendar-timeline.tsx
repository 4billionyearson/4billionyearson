"use client";

/**
 * Shared calendar-year (Jan-Dec) timeline used by:
 *   • src/app/_components/global-seasonal-summary.tsx     (/climate/global)
 *   • src/app/_components/season-timeline-graphic.tsx     (/climate/shifting-seasons)
 *   • src/app/_components/seasonal-shift-card.tsx         (per-region pages)
 *
 * Every visible bit of text is plain HTML at fixed CSS font sizes, so the
 * layout stays readable at every viewport width. Only the bar/point geometry
 * is positioned via percentage-of-container, which lets the chart compress
 * horizontally without shrinking the text.
 *
 * Rows can be:
 *   • bar       — paired baseline (dashed) + recent (filled) ranges, drawn
 *                 from a pair of day-of-year values. Handles year-wrap (when
 *                 spring DOY > autumn DOY, e.g. southern-hemisphere warm
 *                 seasons) by rendering two segments.
 *   • fixed-bar — same shape but the start/end are supplied as fractions of
 *                 the year directly (used for fixed historical records).
 *   • point     — paired baseline (hollow) + recent (filled) markers at two
 *                 day-of-year values, joined by an arrow.
 *   • header    — section title spanning both columns.
 */

import React from 'react';

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
    };

/**
 * Layout uses a 2-column grid: [label | track]. On small viewports the
 * left column collapses so label and track stack vertically. Header rows
 * span both columns. The month axis sits at the bottom of the track column.
 */
export default function CalendarTimeline({
  rows,
  className = '',
  labelColPx = 168,
}: {
  rows: TimelineRow[];
  className?: string;
  /** desktop label column width in px (mobile collapses to single column) */
  labelColPx?: number;
}) {
  const cssVars: React.CSSProperties = {
    // @ts-expect-error CSS custom property
    '--cal-label-col': `${labelColPx}px`,
  };

  return (
    <div
      className={`cal-timeline grid gap-x-3 gap-y-2.5 ${className}`}
      style={cssVars}
    >
      {rows.map((row) => {
        switch (row.kind) {
          case 'header':
            return (
              <div
                key={row.key}
                className="col-span-1 sm:col-span-2 text-[11px] uppercase tracking-wider text-gray-400 font-mono pt-2 first:pt-0"
              >
                {row.label}
              </div>
            );
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
              />
            );
        }
      })}

      {/* Month axis spans the track column only */}
      <div className="hidden sm:block" />
      <MonthAxis />
    </div>
  );
}

function RowLabel({
  title, sub, delta, deltaColor,
}: {
  title: string;
  sub?: string;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-mono text-gray-200 leading-tight">{title}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{sub}</div>}
      {delta && (
        <div
          className="text-xs font-mono mt-0.5 leading-tight"
          style={{ color: deltaColor ?? '#FDE68A' }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function BarRow({
  title, sub, delta, deltaColor, recentColor,
  baselineFracStart, baselineFracEnd, baselineWraps,
  recentFracStart, recentFracEnd, recentWraps,
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
}) {
  return (
    <>
      <RowLabel title={title} sub={sub} delta={delta} deltaColor={deltaColor} />
      <div className="relative h-7 self-center">
        {/* baseline track (top half, dashed outline) */}
        {renderBarSegments({
          start: baselineFracStart,
          end: baselineFracEnd,
          wraps: baselineWraps,
          dashed: true,
          color: recentColor,
          top: 4,
        })}
        {/* recent track (bottom half, filled) */}
        {renderBarSegments({
          start: recentFracStart,
          end: recentFracEnd,
          wraps: recentWraps,
          dashed: false,
          color: recentColor,
          top: 16,
        })}
      </div>
    </>
  );
}

function renderBarSegments({
  start, end, wraps, dashed, color, top,
}: {
  start: number;
  end: number;
  wraps: boolean;
  dashed: boolean;
  color: string;
  top: number;
}) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top,
    height: 9,
    borderRadius: 9999,
  };
  const segStyle: React.CSSProperties = dashed
    ? { ...baseStyle, border: '1.5px dashed #9CA3AF', background: 'transparent' }
    : { ...baseStyle, background: color, opacity: 0.85 };

  if (!wraps) {
    const left = `${Math.min(start, end) * 100}%`;
    const width = `${Math.max(0.01, Math.abs(end - start)) * 100}%`;
    return <div style={{ ...segStyle, left, width }} />;
  }
  // wrapping: two segments — start..year-end and year-start..end
  return (
    <>
      <div style={{ ...segStyle, left: 0, width: `${end * 100}%` }} />
      <div style={{ ...segStyle, left: `${start * 100}%`, width: `${(1 - start) * 100}%` }} />
    </>
  );
}

function PointRow({
  title, sub, delta, deltaColor, color, baselineFrac, recentFrac,
}: {
  title: string;
  sub?: string;
  delta?: string;
  deltaColor?: string;
  color: string;
  baselineFrac: number;
  recentFrac: number;
}) {
  // Arrow from baseline to recent: a thin coloured line. Direction decided
  // by which side recent sits on.
  const left = Math.min(baselineFrac, recentFrac);
  const right = Math.max(baselineFrac, recentFrac);
  const reversed = recentFrac < baselineFrac;
  return (
    <>
      <RowLabel title={title} sub={sub} delta={delta} deltaColor={deltaColor} />
      <div className="relative h-7 self-center">
        {/* axis track */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-700" />
        {/* connecting arrow */}
        <div
          className="absolute top-1/2"
          style={{
            left: `${left * 100}%`,
            width: `${Math.max(0.005, right - left) * 100}%`,
            height: 1.5,
            background: color,
            opacity: 0.7,
            transform: 'translateY(-50%)',
          }}
        />
        {/* arrow head */}
        <div
          className="absolute top-1/2"
          style={{
            left: `${recentFrac * 100}%`,
            transform: `translate(${reversed ? '0' : '-100%'}, -50%) rotate(${reversed ? 180 : 0}deg)`,
            width: 0, height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderLeft: `6px solid ${color}`,
            opacity: 0.7,
          }}
        />
        {/* baseline marker (hollow) */}
        <div
          className="absolute top-1/2 rounded-full border-2 bg-transparent"
          style={{
            left: `${baselineFrac * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 11, height: 11,
            borderColor: '#9CA3AF',
          }}
        />
        {/* recent marker (filled) */}
        <div
          className="absolute top-1/2 rounded-full"
          style={{
            left: `${recentFrac * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 11, height: 11,
            background: color,
          }}
        />
      </div>
    </>
  );
}

function MonthAxis() {
  return (
    <div className="relative h-7 mt-1 border-t border-gray-700">
      {MONTH_NAMES.map((m, i) => {
        const left = ((i + 0.5) / 12) * 100;
        return (
          <React.Fragment key={m}>
            <div
              className="absolute top-0 w-px h-1.5 bg-gray-600"
              style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
            />
            {/* full label sm+ */}
            <span
              className="hidden sm:block absolute text-[10px] text-gray-400 font-mono"
              style={{ left: `${left}%`, top: 6, transform: 'translateX(-50%)' }}
            >
              {m}
            </span>
            {/* single-letter label at small widths to avoid overlap */}
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
  );
}
