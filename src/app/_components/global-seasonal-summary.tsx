"use client";

/**
 * Global Shifting-Seasons summary used on /climate/global.
 *
 * Renders one shared calendar-year timeline (Jan-Dec) with three sections:
 *
 *   Hemispheres
 *     • Northern Hemisphere warm season (mean across NH C/D/E regions)
 *     • Southern Hemisphere warm season (mean across SH C/D/E regions, wraps year-end)
 *
 *   By Köppen climate zone
 *     • Temperate (C) / Continental (D) / Polar (E) — warm-season bars
 *     • Tropical (A) / Arid (B) — wet-season-onset point markers
 *
 *   Notable Northern-Hemisphere records
 *     • US frost-free growing season — EPA, lengthened ~15 d since 1895
 *     • NH snow-free season — NOAA Rutgers GSL
 *     • Kyoto cherry-blossom peak bloom — Aono & Kazui, 11 d earlier vs pre-1850
 *
 * All text rendered in HTML (CalendarTimeline) so it stays readable at every
 * viewport width without a separate mobile fallback.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { GlobalShiftRecord } from '@/app/_components/global-shift-map';
import CalendarTimeline, { dayOfYear, doyToLabel, type TimelineRow } from '@/app/_components/calendar-timeline';
import ShareBar from '@/app/climate/enso/_components/ShareBar';

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

function meanOf(xs: Array<number | null | undefined>): number | null {
  const v = xs.filter((x): x is number => x !== null && x !== undefined && Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

// Circular mean for DOYs (handles wraparound — e.g. SH warm-season starts/ends).
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

type WarmCohort = {
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

type WetCohort = {
  key: string;
  label: string;
  color: string;
  count: number;
  baselineDoy: number;
  recentDoy: number;
  meanShiftDays: number;
  meanRainPct: number;
};

export default function GlobalSeasonalSummary({
  hideExploreLink = false,
  share,
}: {
  hideExploreLink?: boolean;
  share?: { pageUrl: string; sectionId: string; embedUrl?: string; embedCode?: string };
} = {}) {
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

  // If the page was opened with a hash that targets this section (e.g.
  // /climate/global#shifting-seasons from a Share link), the browser scrolls
  // to the section before our async data has rendered, so the user lands
  // mid-page once the section grows. Re-anchor once data is in.
  useEffect(() => {
    if (!data || !share?.sectionId) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#' + share.sectionId) return;
    const el = document.getElementById(share.sectionId);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [data, share?.sectionId]);

  const cohorts = useMemo(() => {
    if (!data) return null;
    const all: GlobalShiftRecord[] = [...data.countries, ...data.usStates, ...data.ukRegions];

    function buildWarm(filter: (r: GlobalShiftRecord) => boolean, label: string, color: string, hemisphere: WarmCohort['hemisphere']): WarmCohort | null {
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

    function buildWet(filter: (r: GlobalShiftRecord) => boolean, label: string, color: string): WetCohort | null {
      const rows = all.filter(
        (r) => filter(r) && r.rain
          && r.rain.wetSeasonOnsetDoyBaseline !== null && r.rain.wetSeasonOnsetDoyBaseline !== undefined
          && r.rain.wetSeasonOnsetDoyRecent !== null && r.rain.wetSeasonOnsetDoyRecent !== undefined,
      );
      if (!rows.length) return null;
      const bDoy = circularMeanDoy(rows.map((r) => r.rain!.wetSeasonOnsetDoyBaseline as number));
      const rDoy = circularMeanDoy(rows.map((r) => r.rain!.wetSeasonOnsetDoyRecent as number));
      if (bDoy === null || rDoy === null) return null;
      return {
        key: label,
        label,
        color,
        count: rows.length,
        baselineDoy: bDoy,
        recentDoy: rDoy,
        meanShiftDays: meanOf(rows.map((r) => r.rain!.wetSeasonOnsetShiftDays)) ?? 0,
        meanRainPct: meanOf(rows.map((r) => r.rain!.annualTotalShiftPct)) ?? 0,
      };
    }

    const nh = buildWarm(
      (r) => r.hemisphere === 'N' && (r.koppen?.group === 'C' || r.koppen?.group === 'D' || r.koppen?.group === 'E'),
      'Northern Hemisphere',
      '#FB923C',
      'N',
    );
    const sh = buildWarm(
      (r) => r.hemisphere === 'S' && (r.koppen?.group === 'C' || r.koppen?.group === 'D' || r.koppen?.group === 'E'),
      'Southern Hemisphere',
      '#22D3EE',
      'S',
    );
    const c = buildWarm((r) => r.koppen?.group === 'C', 'Temperate (C)', '#A3E635', 'mixed');
    const d_ = buildWarm((r) => r.koppen?.group === 'D', 'Continental (D)', '#7DD3FC', 'N');
    const e = buildWarm((r) => r.koppen?.group === 'E', 'Polar (E)', '#67E8F9', 'N');

    const a = buildWet((r) => r.koppen?.group === 'A', 'Tropical (A)', '#34D399');
    const b = buildWet((r) => r.koppen?.group === 'B', 'Arid (B)', '#FBBF24');

    const hemiRows = [nh, sh].filter((x): x is WarmCohort => !!x);
    const koppenWarmRows = [c, d_, e].filter((x): x is WarmCohort => !!x);
    const wetRows = [a, b].filter((x): x is WetCohort => !!x);

    return { hemiRows, koppenWarmRows, wetRows, total: all.length };
  }, [data]);

  if (error) {
    return <p className="text-sm text-red-400">Could not load global shifting-seasons data: {error}</p>;
  }
  if (!cohorts) {
    return <div className="h-32 flex items-center justify-center text-gray-500 text-sm">Loading worldwide seasonal-shift data…</div>;
  }

  const { hemiRows, koppenWarmRows, wetRows, total } = cohorts;

  const fmtShift = (d: number) => `${d > 0 ? '+' : ''}${d.toFixed(1)} days`;
  const fmtMonths = (m: number | null) => (m === null ? '—' : `${m > 0 ? '+' : ''}${m.toFixed(2)} months`);

  function warmToRow(c: WarmCohort): TimelineRow {
    return {
      kind: 'bar',
      key: c.key,
      title: c.label,
      sub: `${c.count} regions · ${doyToLabel(c.recentSpringDoy)} → ${doyToLabel(c.recentAutumnDoy)}`,
      delta: `Spring ${fmtShift(c.meanSpringShift)} · Autumn ${fmtShift(c.meanAutumnShift)}${c.meanNetMonths !== null ? ` · ${fmtMonths(c.meanNetMonths)}` : ''}`,
      deltaColor: c.color,
      recentColor: c.color,
      baselineSpringDoy: c.baselineSpringDoy,
      baselineAutumnDoy: c.baselineAutumnDoy,
      recentSpringDoy: c.recentSpringDoy,
      recentAutumnDoy: c.recentAutumnDoy,
    };
  }

  function wetToRow(w: WetCohort): TimelineRow {
    return {
      kind: 'point',
      key: w.key,
      title: w.label,
      sub: `${w.count} regions · onset ${doyToLabel(w.baselineDoy)} → ${doyToLabel(w.recentDoy)}`,
      delta: `${fmtShift(w.meanShiftDays)} onset · ${w.meanRainPct > 0 ? '+' : ''}${w.meanRainPct.toFixed(1)}% annual rainfall`,
      deltaColor: w.color,
      color: w.color,
      baselineDoy: w.baselineDoy,
      recentDoy: w.recentDoy,
    };
  }

  const leftRows: TimelineRow[] = [
    { kind: 'header', key: 'h1', label: 'Hemispheres', accent: '#FB923C' },
    ...hemiRows.map(warmToRow),
    { kind: 'header', key: 'h2', label: 'By Köppen climate zone', accent: '#A3E635' },
    ...koppenWarmRows.map(warmToRow),
    ...wetRows.map(wetToRow),
  ];

  const rightRows: TimelineRow[] = [
    { kind: 'header', key: 'h3', label: 'Notable Northern-Hemisphere records', accent: '#22D3EE' },
    {
      kind: 'fixed-bar',
      key: 'us-grow',
      title: 'US growing season',
      sub: '1895 → present · EPA frost-free season',
      delta: '156 days → 172 days (+15 days)',
      deltaColor: '#10B981',
      recentColor: '#10B981',
      baselineFrac: { start: dayOfYear(5, 4) / 365, end: dayOfYear(10, 7) / 365 },
      recentFrac: { start: dayOfYear(4, 26) / 365, end: dayOfYear(10, 15) / 365 },
    },
    {
      kind: 'fixed-bar',
      key: 'nh-snow',
      title: 'NH snow-free season',
      sub: '1971–2000 → present · NOAA Rutgers GSL',
      delta: '187 days → 204 days (+17 days)',
      deltaColor: '#22D3EE',
      recentColor: '#22D3EE',
      baselineFrac: { start: dayOfYear(4, 24) / 365, end: dayOfYear(10, 28) / 365 },
      recentFrac: { start: dayOfYear(4, 14) / 365, end: dayOfYear(11, 4) / 365 },
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
  ];

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

      <div className="rounded-xl border border-gray-700/50 bg-gray-800/60 p-3 sm:p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider font-mono">
            Jan <span className="text-gray-500">→</span> Dec · Baseline vs Now
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-mono text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-2 rounded-full border border-dashed border-gray-400" />
              baseline
            </span>
            <span className="text-gray-600">→</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-2 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-500" />
              now
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-6">
          <CalendarTimeline rows={leftRows} labelColPx={196} showAxis={false} />
          <CalendarTimeline rows={rightRows} labelColPx={196} showAxis={false} />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Sources: NOAA NClimDiv (US states), Met Office HadUK-Grid (UK regions), Berkeley Earth and country-level Climate Reanalyzer aggregates;
        EPA frost-free growing season; Aono &amp; Kazui 2008 Kyoto peak-bloom record; NOAA Rutgers Global Snow Lab. Warm-season metrics use 1951–1980 vs 2001–2024.
      </p>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {share ? (
          <ShareBar
            pageUrl={`${share.pageUrl}#${share.sectionId}`}
            shareText={encodeURIComponent('Shifting Seasons worldwide - 4 Billion Years On')}
            emailSubject={'Shifting Seasons worldwide - 4 Billion Years On'}
            embedUrl={share.embedUrl}
            embedCode={share.embedCode}
            wrapperClassName="relative"
            align="left"
          />
        ) : <span />}
        {!hideExploreLink && (
          <Link
            href="/climate/shifting-seasons"
            className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-teal-300 hover:text-teal-200 hover:underline transition-colors"
          >
            Explore Shifting Seasons worldwide
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
