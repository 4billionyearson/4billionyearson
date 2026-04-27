"use client";

/**
 * Calendar-year timeline of three notable Northern-Hemisphere seasonal-shift
 * records, used in the "Seasons at a Glance" card on /climate/shifting-seasons:
 *
 *   • US frost-free growing season - lengthened ~15 d since 1895 (EPA).
 *   • Kyoto cherry-blossom peak bloom - 11 d earlier vs pre-1850 (Aono & Kazui).
 *   • NH snow-free season - melt-out earlier (NOAA Rutgers GSL).
 *
 * Renders via the shared <CalendarTimeline>, so the same layout works on
 * mobile and desktop without a separate stacked card view.
 */

import React from 'react';
import CalendarTimeline, { dayOfYear, type TimelineRow } from '@/app/_components/calendar-timeline';

export default function SeasonTimelineGraphic() {
  const toFrac = (m: number, d: number) => dayOfYear(m, d) / 365;

  const rows: TimelineRow[] = [
    {
      kind: 'fixed-bar',
      key: 'us-grow',
      title: 'US growing season',
      sub: '1895 → present · EPA frost-free season',
      delta: '156 d → 172 d (+15 d)',
      deltaColor: '#10B981',
      recentColor: '#10B981',
      baselineFrac: { start: toFrac(5, 4), end: toFrac(10, 7) },
      recentFrac: { start: toFrac(4, 26), end: toFrac(10, 15) },
    },
    {
      kind: 'point',
      key: 'kyoto',
      title: 'Kyoto cherry blossom',
      sub: 'pre-1850 → present · peak-bloom date',
      delta: '11 days earlier (Apr 17 → Apr 6)',
      deltaColor: '#F472B6',
      color: '#F472B6',
      baselineDoy: dayOfYear(4, 17),
      recentDoy: dayOfYear(4, 6),
    },
    {
      kind: 'fixed-bar',
      key: 'nh-snow',
      title: 'NH snow-free season',
      sub: '1971–2000 → present · NOAA Rutgers GSL',
      delta: '187 d → 204 d (+17 d)',
      deltaColor: '#22D3EE',
      recentColor: '#22D3EE',
      baselineFrac: { start: toFrac(4, 24), end: toFrac(10, 28) },
      recentFrac: { start: toFrac(4, 14), end: toFrac(11, 4) },
    },
  ];

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-3 sm:p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider">
          Calendar-year view · Northern Hemisphere
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-mono text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-2 rounded-full border border-dashed border-gray-400" />
            baseline
          </span>
          <span className="text-gray-600">→</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-2 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-500" />
            now
          </span>
        </div>
      </div>
      <CalendarTimeline rows={rows} labelColPx={188} />
    </div>
  );
}
