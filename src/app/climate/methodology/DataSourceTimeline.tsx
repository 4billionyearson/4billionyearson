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
// Use a fixed ceiling so layout stays stable; the build script reads
// `latestDataMonth` per source but for a static visualisation a single
// "now" anchor is sufficient.
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
      <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
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

      <div className="relative">
        {/* Year ticks */}
        <div className="relative h-5 mb-1 text-[10px] text-gray-500">
          {TICK_YEARS.map((y) => (
            <span
              key={y}
              className="absolute -translate-x-1/2 font-mono"
              style={{ left: `${pct(y)}%` }}
            >
              {y}
            </span>
          ))}
        </div>

        {/* 1961 reference line */}
        <div
          className="absolute top-5 bottom-0 w-px bg-[#D0A65E]/40"
          style={{ left: `${pct(1961)}%` }}
          aria-hidden
        />

        {/* Bars */}
        <div className="space-y-1.5">
          {ordered.map((s) => {
            const left = pct(s.start);
            const width = Math.max(0.5, pct(TIMELINE_END) - left);
            return (
              <div key={`${s.source}-${s.dataset}`} className="relative h-7">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-0 bottom-0 rounded-sm hover:brightness-125 transition-[filter] flex items-center pl-2"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: FAMILY_COLOUR[s.family],
                    opacity: 0.85,
                  }}
                  title={`${s.source} · ${s.dataset} (from ${s.start}, native ${s.baseline})`}
                >
                  <span className="truncate text-[11px] font-semibold text-gray-900 mix-blend-screen">
                    {s.source} — {s.dataset}
                  </span>
                </a>
              </div>
            );
          })}
        </div>

        {/* Reference label */}
        <p className="mt-2 text-[10px] text-gray-500">
          <span className="text-[#D0A65E]">│</span> = start of the 1961–1990 comparison window.
        </p>
      </div>
    </div>
  );
}
