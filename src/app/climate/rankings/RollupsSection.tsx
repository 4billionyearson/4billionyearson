'use client';

import React, { useState } from 'react';
import { Globe2 } from 'lucide-react';

type WindowKey = 'anomaly1m' | 'anomaly3m' | 'anomaly12m';

export interface RollupGroup {
  label: string;
  count: number;
  means: { anomaly1m: number | null; anomaly3m: number | null; anomaly12m: number | null };
  /** Optional note shown as a tooltip/footnote (e.g. for 4BYO aggregates). */
  note?: string | null;
  /** True when the row is a 4BYO aggregate rather than a NOAA-native series. */
  aggregate?: boolean;
}

function fmtSigned(v: number | null): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}°C`;
}

function toneBar(v: number | null): string {
  if (v == null) return 'bg-gray-700';
  if (v >= 1.5) return 'bg-red-400';
  if (v >= 0.8) return 'bg-orange-400';
  if (v >= 0.2) return 'bg-amber-400';
  if (v <= -0.2) return 'bg-sky-400';
  return 'bg-gray-500';
}

function RollupCard({ title, groups, windowKey }: { title: string; groups: RollupGroup[]; windowKey: WindowKey }) {
  if (!groups.length) return null;
  const sorted = [...groups].sort((a, b) => (b.means[windowKey] ?? -99) - (a.means[windowKey] ?? -99));
  const maxAbs = Math.max(...sorted.map((g) => Math.abs(g.means[windowKey] ?? 0)), 0.5);
  // When every group is positive (the common case for anomaly rollups),
  // render left-anchored bars that scale 0 → max. Only fall back to a
  // diverging 0-centred bar when the group actually contains negatives.
  const hasNegative = sorted.some((g) => (g.means[windowKey] ?? 0) < 0);
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      <div className="space-y-2">
        {sorted.map((g) => {
          const v = g.means[windowKey];
          const pct = v == null ? 0 : Math.min(100, (Math.abs(v) / maxAbs) * 100);
          const positive = (v ?? 0) >= 0;
          const barStyle: React.CSSProperties = hasNegative
            ? {
                left: positive ? '50%' : `${50 - pct / 2}%`,
                width: `${pct / 2}%`,
              }
            : { left: 0, width: `${pct}%` };
          return (
            <div key={g.label} className="text-xs">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-semibold text-gray-200">
                  {g.label}{' '}
                  {g.count > 0 && (
                    <span className="text-gray-500 font-normal">({g.count})</span>
                  )}
                  {g.aggregate && (
                    <span
                      className="ml-1 text-[10px] uppercase tracking-wide text-gray-500"
                      title={g.note ?? '4BYO aggregate'}
                    >
                      · agg
                    </span>
                  )}
                </span>
                <span className="font-mono text-gray-200">{fmtSigned(v)}</span>
              </div>
              <div className="relative h-2 rounded-full bg-gray-800 overflow-hidden">
                <div className={`absolute top-0 h-full ${toneBar(v)}`} style={barStyle} />
                {hasNegative && <div className="absolute top-0 left-1/2 h-full w-px bg-gray-600" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const WINDOW_OPTS = [
  { key: 'anomaly1m' as const, label: '1 Month' },
  { key: 'anomaly3m' as const, label: '3 Months' },
  { key: 'anomaly12m' as const, label: '12 Months' },
];

const TOGGLE_BASE = 'inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-medium transition-colors';
// Cream active text matches the rest of the site (Climate Map, Emissions
// Deep Dive, Seasons map). The previous gold-on-tinted-gold combo had
// poor contrast against the bg-[#D0A65E]/12 fill.
const TOGGLE_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]';
const TOGGLE_INACTIVE = 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';

export default function RollupsSection({
  continents,
  usRegions,
  types,
}: {
  continents: RollupGroup[];
  usRegions: RollupGroup[];
  types: RollupGroup[];
}) {
  const [windowKey, setWindowKey] = useState<WindowKey>('anomaly1m');

  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <Globe2 className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
        <span className="min-w-0 flex-1">Roll-ups by Group</span>
      </h2>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mr-1">Window</span>
        {WINDOW_OPTS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setWindowKey(opt.key)}
            className={`${TOGGLE_BASE} ${windowKey === opt.key ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RollupCard title="By Continent" groups={continents} windowKey={windowKey} />
        <RollupCard title="By US Climate Region" groups={usRegions} windowKey={windowKey} />
        <RollupCard title="By Region Type" groups={types} windowKey={windowKey} />
      </div>
    </section>
  );
}
