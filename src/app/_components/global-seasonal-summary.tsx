"use client";

/**
 * Global Shifting-Seasons summary used on /climate/global.
 *
 * Splits the ~236 analysed regions two ways:
 *   1. Northern vs Southern hemisphere — mean spring & autumn shifts
 *      (warm-cold + mixed seasonality regions only, hence Köppen C/D/E).
 *   2. Köppen group breakdown — uses the right metric for each climate zone:
 *        • C / D / E  → warm-season spring & autumn shifts
 *        • A          → wet-season onset shift + annual rainfall change
 *        • B          → wet-season onset shift + annual rainfall change
 *
 * Replaces the older US-centric SeasonTimelineGraphic teaser.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Leaf, ArrowRight, Snowflake, CloudRain, Sun, ThermometerSun, Compass } from 'lucide-react';
import type { GlobalShiftRecord } from '@/app/_components/global-shift-map';

type GlobalShiftData = {
  generatedAt: string;
  globalStats: {
    totalAnalysed: number;
    countriesAnalysed: number;
    usStatesAnalysed: number;
    ukRegionsAnalysed: number;
    seasonalityCounts: { warmCold: number; wetDry: number; mixed: number; aseasonal: number };
    koppenGroupCounts: Record<string, number>;
    warmColdStats: {
      total: number;
      withCrossings: number;
      earlierSprings: number;
      laterAutumns: number;
      meanSpringShift: number | null;
      meanAutumnShift: number | null;
      meanNetShiftMonths: number | null;
      warmestMonthShifted: number;
    };
    wetDryStats: {
      total: number;
      withRainData: number;
      wetSeasonsShorter: number;
      wetSeasonsLonger: number;
      meanWetSeasonOnsetShiftDays: number | null;
      meanAnnualRainfallShiftPct: number | null;
    };
  };
  countries: GlobalShiftRecord[];
  usStates: GlobalShiftRecord[];
  ukRegions: GlobalShiftRecord[];
};

type Row = GlobalShiftRecord;

const KOPPEN_LABELS: Record<string, { name: string; blurb: string }> = {
  A: { name: 'Tropical', blurb: 'Wet-season timing & annual rainfall' },
  B: { name: 'Arid',     blurb: 'Wet-season timing & annual rainfall' },
  C: { name: 'Temperate',  blurb: 'Spring & autumn temperature crossings' },
  D: { name: 'Continental', blurb: 'Spring & autumn temperature crossings' },
  E: { name: 'Polar',    blurb: 'Warm-season expansion' },
};

function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function fmtDays(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)} d`;
}

function fmtMonths(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)} mo`;
}

function fmtPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

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

  const summary = useMemo(() => {
    if (!data) return null;
    const all: Row[] = [...data.countries, ...data.usStates, ...data.ukRegions];

    // Hemisphere split — only warm-cold-capable regions (C/D/E + warm-cold seasonality).
    const tempSeasonal = all.filter(
      (r) => r.koppen && (r.koppen.group === 'C' || r.koppen.group === 'D' || r.koppen.group === 'E')
        && r.temp.springShiftDays !== null && r.temp.autumnShiftDays !== null,
    );

    function hemiStats(hemi: 'N' | 'S') {
      const rows = tempSeasonal.filter((r) => r.hemisphere === hemi);
      const earlier = rows.filter((r) => (r.temp.springShiftDays ?? 0) < 0).length;
      const later = rows.filter((r) => (r.temp.autumnShiftDays ?? 0) > 0).length;
      return {
        count: rows.length,
        earlierSprings: earlier,
        laterAutumns: later,
        meanSpring: mean(rows.map((r) => r.temp.springShiftDays!).filter(Number.isFinite)),
        meanAutumn: mean(rows.map((r) => r.temp.autumnShiftDays!).filter(Number.isFinite)),
        meanNet: mean(rows.map((r) => r.temp.netShiftMonths).filter(Number.isFinite)),
      };
    }

    const nh = hemiStats('N');
    const sh = hemiStats('S');

    // Köppen-group stats — different metrics for A/B vs C/D/E.
    function tempGroup(group: 'C' | 'D' | 'E') {
      const rows = all.filter(
        (r) => r.koppen?.group === group
          && r.temp.springShiftDays !== null && r.temp.autumnShiftDays !== null,
      );
      return {
        count: all.filter((r) => r.koppen?.group === group).length,
        usable: rows.length,
        meanSpring: mean(rows.map((r) => r.temp.springShiftDays!)),
        meanAutumn: mean(rows.map((r) => r.temp.autumnShiftDays!)),
        meanNet: mean(rows.map((r) => r.temp.netShiftMonths).filter(Number.isFinite)),
      };
    }

    function rainGroup(group: 'A' | 'B') {
      const rows = all.filter((r) => r.koppen?.group === group && r.rain);
      const onset = rows.filter((r) => r.rain?.wetSeasonOnsetShiftDays !== null && r.rain?.wetSeasonOnsetShiftDays !== undefined);
      const annual = rows.filter((r) => r.rain?.annualTotalShiftPct !== null && r.rain?.annualTotalShiftPct !== undefined);
      return {
        count: all.filter((r) => r.koppen?.group === group).length,
        usable: rows.length,
        meanOnset: mean(onset.map((r) => r.rain!.wetSeasonOnsetShiftDays as number)),
        meanAnnualPct: mean(annual.map((r) => r.rain!.annualTotalShiftPct as number)),
      };
    }

    return {
      total: all.length,
      generatedAt: data.generatedAt,
      hemispheres: { nh, sh },
      koppen: {
        A: rainGroup('A'),
        B: rainGroup('B'),
        C: tempGroup('C'),
        D: tempGroup('D'),
        E: tempGroup('E'),
      },
      warmCold: data.globalStats.warmColdStats,
      wetDry: data.globalStats.wetDryStats,
    };
  }, [data]);

  if (error) {
    return (
      <p className="text-sm text-red-400">Could not load global shifting-seasons data: {error}</p>
    );
  }

  if (!summary) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
        Loading worldwide seasonal-shift data…
      </div>
    );
  }

  const { hemispheres, koppen, warmCold, wetDry, total } = summary;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-300">
        Global averages smooth out the seasonal cycle, but climate change shows up most clearly in
        the <em>timing</em> of the year. Across <strong className="text-[#FFF5E7]">{total}</strong> countries,
        US states and UK regions analysed, <strong className="text-amber-300">
          {warmCold.earlierSprings}/{warmCold.withCrossings}
        </strong> have earlier springs and <strong className="text-amber-300">
          {warmCold.laterAutumns}/{warmCold.withCrossings}
        </strong> have later autumns; wet seasons have lengthened in <strong className="text-cyan-300">
          {wetDry.wetSeasonsLonger}
        </strong> and shortened in <strong className="text-cyan-300">{wetDry.wetSeasonsShorter}</strong> tropical/arid regions.
      </p>

      {/* Hemisphere split */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-gray-400 font-mono mb-2 flex items-center gap-2">
          <Compass className="h-4 w-4 text-cyan-400" /> Northern vs Southern Hemisphere
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { key: 'nh', label: 'Northern Hemisphere', icon: <Sun className="h-4 w-4 text-amber-300" />, s: hemispheres.nh },
            { key: 'sh', label: 'Southern Hemisphere', icon: <Snowflake className="h-4 w-4 text-cyan-300" />, s: hemispheres.sh },
          ] as const).map(({ key, label, icon, s }) => (
            <div key={key} className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <h5 className="text-sm font-bold text-[#FFF5E7]">{label}</h5>
                <span className="ml-auto text-xs text-gray-500">{s.count} regions</span>
              </div>
              {s.count === 0 ? (
                <p className="text-xs text-gray-500">No temperate/continental/polar regions in sample.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Mean spring shift</div>
                    <div className="font-mono text-emerald-300 font-semibold">{fmtDays(s.meanSpring)}</div>
                    <div className="text-[11px] text-gray-500">{s.earlierSprings}/{s.count} earlier</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Mean autumn shift</div>
                    <div className="font-mono text-amber-300 font-semibold">{fmtDays(s.meanAutumn)}</div>
                    <div className="text-[11px] text-gray-500">{s.laterAutumns}/{s.count} later</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Mean warm-season change</div>
                    <div className="font-mono text-orange-300 font-semibold">{fmtMonths(s.meanNet)}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Köppen breakdown */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-gray-400 font-mono mb-2 flex items-center gap-2">
          <ThermometerSun className="h-4 w-4 text-orange-400" /> By Köppen Climate Zone
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Tropical (A) */}
          <KoppenCard
            letter="A"
            color="text-emerald-300"
            icon={<CloudRain className="h-4 w-4 text-emerald-300" />}
            count={koppen.A.count}
            usable={koppen.A.usable}
            metrics={[
              { label: 'Mean wet-season onset', value: fmtDays(koppen.A.meanOnset), tone: 'cyan' },
              { label: 'Mean annual rainfall', value: fmtPct(koppen.A.meanAnnualPct), tone: 'emerald' },
            ]}
          />
          {/* Arid (B) */}
          <KoppenCard
            letter="B"
            color="text-yellow-300"
            icon={<Sun className="h-4 w-4 text-yellow-300" />}
            count={koppen.B.count}
            usable={koppen.B.usable}
            metrics={[
              { label: 'Mean wet-season onset', value: fmtDays(koppen.B.meanOnset), tone: 'cyan' },
              { label: 'Mean annual rainfall', value: fmtPct(koppen.B.meanAnnualPct), tone: 'emerald' },
            ]}
          />
          {/* Temperate (C) */}
          <KoppenCard
            letter="C"
            color="text-lime-300"
            icon={<Leaf className="h-4 w-4 text-lime-300" />}
            count={koppen.C.count}
            usable={koppen.C.usable}
            metrics={[
              { label: 'Mean spring shift', value: fmtDays(koppen.C.meanSpring), tone: 'emerald' },
              { label: 'Mean autumn shift', value: fmtDays(koppen.C.meanAutumn), tone: 'amber' },
              { label: 'Mean warm-season Δ', value: fmtMonths(koppen.C.meanNet), tone: 'orange' },
            ]}
          />
          {/* Continental (D) */}
          <KoppenCard
            letter="D"
            color="text-sky-300"
            icon={<Snowflake className="h-4 w-4 text-sky-300" />}
            count={koppen.D.count}
            usable={koppen.D.usable}
            metrics={[
              { label: 'Mean spring shift', value: fmtDays(koppen.D.meanSpring), tone: 'emerald' },
              { label: 'Mean autumn shift', value: fmtDays(koppen.D.meanAutumn), tone: 'amber' },
              { label: 'Mean warm-season Δ', value: fmtMonths(koppen.D.meanNet), tone: 'orange' },
            ]}
          />
          {/* Polar (E) */}
          <KoppenCard
            letter="E"
            color="text-cyan-200"
            icon={<Snowflake className="h-4 w-4 text-cyan-200" />}
            count={koppen.E.count}
            usable={koppen.E.usable}
            metrics={[
              { label: 'Mean spring shift', value: fmtDays(koppen.E.meanSpring), tone: 'emerald' },
              { label: 'Mean autumn shift', value: fmtDays(koppen.E.meanAutumn), tone: 'amber' },
              { label: 'Mean warm-season Δ', value: fmtMonths(koppen.E.meanNet), tone: 'orange' },
            ]}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Sources: NOAA NClimDiv (US states), Met Office HadUK-Grid (UK regions), Berkeley Earth and country-level Climate Reanalyzer aggregates (countries).
        Warm-season metrics use the 1951–1980 vs 2001–2024 comparison; values shown are unweighted means within each cohort.
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

type Tone = 'emerald' | 'amber' | 'orange' | 'cyan';
const TONE_CLASS: Record<Tone, string> = {
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
  orange: 'text-orange-300',
  cyan: 'text-cyan-300',
};

function KoppenCard({
  letter, color, icon, count, usable, metrics,
}: {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  color: string;
  icon: React.ReactNode;
  count: number;
  usable: number;
  metrics: Array<{ label: string; value: string; tone: Tone }>;
}) {
  const meta = KOPPEN_LABELS[letter];
  return (
    <div className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h5 className="text-sm font-bold text-[#FFF5E7]">
          {meta.name} <span className={`font-mono ${color}`}>({letter})</span>
        </h5>
        <span className="ml-auto text-xs text-gray-500">{count} regions</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">{meta.blurb}</p>
      {usable === 0 ? (
        <p className="text-xs text-gray-500">Not enough usable data.</p>
      ) : (
        <div className="space-y-2">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">{m.label}</span>
              <span className={`font-mono font-semibold text-sm ${TONE_CLASS[m.tone]}`}>{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
