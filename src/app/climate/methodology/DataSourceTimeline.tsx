'use client';

import React from 'react';

export interface SourceRow {
  source: string;
  dataset: string;
  variable: string;
  start: number;
  baseline: string;
  url: string;
  family: 'temp' | 'precip' | 'co2' | 'ghg' | 'ice' | 'enso' | 'sea';
}

const FAMILY_COLOUR: Record<SourceRow['family'], string> = {
  temp: '#fb923c',
  precip: '#38bdf8',
  co2: '#a78bfa',
  ghg: '#c084fc',
  ice: '#67e8f9',
  enso: '#facc15',
  sea: '#60a5fa',
};

const FAMILY_LABEL: Record<SourceRow['family'], string> = {
  temp: 'Temperature',
  precip: 'Precipitation',
  co2: 'CO₂',
  ghg: 'Other GHG',
  ice: 'Sea ice',
  enso: 'ENSO',
  sea: 'Sea level',
};

const TIMELINE_START = 1850;
const TIMELINE_END = new Date().getFullYear();

function pct(year: number): number {
  return ((year - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
}

const TICK_YEARS = [1850, 1880, 1901, 1920, 1950, 1961, 1980, 1991, 2000, 2025];

export default function DataSourceTimeline({ sources }: { sources: SourceRow[] }) {
  // Stable display order: oldest start year first.
  const ordered = [...sources].sort((a, b) => a.start - b.start);
  const families = Array.from(new Set(ordered.map((s) => s.family))) as SourceRow['family'][];

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-gray-300">
        {families.map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: FAMILY_COLOUR[f] }}
            />
            {FAMILY_LABEL[f]}
          </span>
        ))}
      </div>

      {/* Source labels rendered ABOVE the bars so they are always legible
          regardless of where each bar starts on the timeline. */}
      <div className="relative space-y-1.5">
        {/* 1961 reference line spanning the bar stack */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[#D0A65E]/40 pointer-events-none z-10"
          style={{ left: `${pct(1961)}%` }}
          aria-hidden
        />
        {ordered.map((s) => {
          const left = pct(s.start);
          const width = Math.max(1, pct(TIMELINE_END) - left);
          return (
            <div key={`${s.source}-${s.dataset}`} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-gray-200 font-medium truncate">
                  <span
                    className="inline-block h-2 w-2 rounded-sm mr-1.5 align-middle"
                    style={{ backgroundColor: FAMILY_COLOUR[s.family] }}
                  />
                  {s.source} — {s.dataset}
                </span>
                <span className="font-mono text-gray-400 shrink-0">
                  {s.start} · native {s.baseline}
                </span>
              </div>
              <div className="relative h-3 rounded-sm bg-gray-900/70 overflow-hidden">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-y-0 rounded-sm hover:brightness-125 transition-[filter]"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: FAMILY_COLOUR[s.family],
                    opacity: 0.85,
                  }}
                  title={`${s.source} · ${s.dataset} (from ${s.start}, native ${s.baseline}) — open source`}
                  aria-label={`${s.source} ${s.dataset}: from ${s.start} to present`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Year axis below the bars */}
      <div className="relative h-5 text-[10px] text-gray-400 border-t border-gray-800 pt-1">
        {TICK_YEARS.map((y) => (
          <span
            key={y}
            className={`absolute -translate-x-1/2 font-mono ${y === 1961 ? 'text-[#D0A65E] font-semibold' : ''}`}
            style={{ left: `${pct(y)}%` }}
          >
            {y}
          </span>
        ))}
      </div>

      <p className="text-[11px] text-gray-400">
        <span className="text-[#D0A65E]">│</span> guideline at <strong className="text-gray-200">1961</strong> marks the start
        of the comparison-baseline window. Bars run from each record&apos;s first year to the
        present. Click a bar to open the upstream source.
      </p>
    </div>
  );
}

// ─── Monthly publication timeline ───────────────────────────────────────────
// Day-of-month each upstream source releases data for the prior month, and
// when 4BYO runs its snapshot rebuild. Dates are typical lags observed in
// production; values represent the calendar day on which data for the most
// recent complete month becomes available.

export interface MonthlyReleaseRow {
  source: string;
  release: string; // human label e.g. "5th–7th"
  startDay: number;
  endDay: number;
  variable: string;
  family: SourceRow['family'] | 'snapshot';
}

const MONTHLY_FAMILY_COLOUR: Record<string, string> = {
  ...FAMILY_COLOUR,
  snapshot: '#D0A65E',
};

export function MonthlyReleaseTimeline({ rows }: { rows: MonthlyReleaseRow[] }) {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const dayPct = (d: number) => ((d - 1) / 27) * 100;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {rows.map((r) => {
          const left = dayPct(r.startDay);
          const width = Math.max(2, dayPct(r.endDay) - left);
          const colour = MONTHLY_FAMILY_COLOUR[r.family] ?? '#9ca3af';
          return (
            <div key={r.source} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-gray-200 font-medium truncate">
                  <span className="inline-block h-2 w-2 rounded-sm mr-1.5 align-middle" style={{ backgroundColor: colour }} />
                  {r.source}
                  {r.family === 'snapshot' && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-[#E8C97A]">our snapshot</span>
                  )}
                </span>
                <span className="font-mono text-gray-400 shrink-0">{r.release}</span>
              </div>
              <div className="relative h-3 rounded-sm bg-gray-900/70 overflow-hidden">
                <span
                  className="absolute inset-y-0 rounded-sm"
                  style={{ left: `${left}%`, width: `${width}%`, backgroundColor: colour, opacity: 0.85 }}
                  title={`${r.source}: ${r.release} of the month (${r.variable})`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="relative h-5 text-[10px] text-gray-400 border-t border-gray-800 pt-1">
        {[1, 5, 10, 15, 20, 25, 28].map((d) => (
          <span key={d} className="absolute -translate-x-1/2 font-mono" style={{ left: `${dayPct(d)}%` }}>
            {d}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-gray-400">
        Day of the month upstream sources publish the previous month&apos;s data.
        4BYO snapshots run after the slowest source has refreshed so every region
        is current as of the same reference month.
      </p>
    </div>
  );
}

// ─── Annual publication timeline ────────────────────────────────────────────

export interface AnnualReleaseRow {
  source: string;
  release: string; // human label e.g. "Jun–Aug"
  startMonth: number; // 1..12
  endMonth: number;
  variable: string;
  family: SourceRow['family'] | 'snapshot';
}

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function AnnualReleaseTimeline({ rows }: { rows: AnnualReleaseRow[] }) {
  const monthPct = (m: number) => ((m - 1) / 11) * 100;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {rows.map((r) => {
          const left = monthPct(r.startMonth);
          const width = Math.max(3, monthPct(r.endMonth) - left + 100 / 11);
          const colour = MONTHLY_FAMILY_COLOUR[r.family] ?? '#9ca3af';
          return (
            <div key={r.source} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-gray-200 font-medium truncate">
                  <span className="inline-block h-2 w-2 rounded-sm mr-1.5 align-middle" style={{ backgroundColor: colour }} />
                  {r.source}
                </span>
                <span className="font-mono text-gray-400 shrink-0">{r.release}</span>
              </div>
              <div className="relative h-3 rounded-sm bg-gray-900/70 overflow-hidden">
                <span
                  className="absolute inset-y-0 rounded-sm"
                  style={{ left: `${left}%`, width: `${width}%`, backgroundColor: colour, opacity: 0.85 }}
                  title={`${r.source}: ${r.release} (${r.variable})`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="relative h-5 text-[10px] text-gray-400 border-t border-gray-800 pt-1">
        {[1, 3, 5, 7, 9, 11, 12].map((m) => (
          <span key={m} className="absolute -translate-x-1/2 font-mono" style={{ left: `${monthPct(m)}%` }}>
            {MONTH_LABELS[m]}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-gray-400">
        Month each annual dataset is typically published. Data covers the previous calendar year.
      </p>
    </div>
  );
}

