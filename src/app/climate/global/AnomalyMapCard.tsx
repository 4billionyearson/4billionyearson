"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { Globe2 } from 'lucide-react';
import type { default as GlobalAnomalyMapType } from './GlobalAnomalyMap';

const GlobalAnomalyMap = dynamic(() => import('./GlobalAnomalyMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] md:h-[500px] w-full rounded-xl bg-gray-900/40 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
    </div>
  ),
}) as ComponentType<React.ComponentProps<typeof GlobalAnomalyMapType>>;

export interface CountryAnomalyRow {
  iso3: string;
  name: string;
  anomaly: number;
  value: number;
  monthLabel: string;
  rank: number;
  total: number;
  anomaly1m?: number | null;
  label1m?: string | null;
  anomaly3m?: number | null;
  label3m?: string | null;
  anomaly12m?: number | null;
  label12m?: string | null;
}

type AnomalyWindow = '1m' | '3m' | '12m';
type MapLevel = 'countries' | 'continents' | 'us-regions';

const WINDOW_OPTS = [
  { key: '1m', label: '1 month' },
  { key: '3m', label: '3 months' },
  { key: '12m', label: '12 months' },
] as const;

const LEVEL_OPTS: Array<{ key: MapLevel; label: string }> = [
  { key: 'countries', label: 'Countries / states' },
  { key: 'continents', label: 'Continents' },
  { key: 'us-regions', label: 'US climate regions' },
];

const TOGGLE_BASE = 'inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-medium transition-colors';
const TOGGLE_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#D0A65E]';
const TOGGLE_INACTIVE = 'border-gray-800 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';

export default function AnomalyMapCard({
  countryAnomalies,
  initialWindow = '1m',
}: {
  countryAnomalies: CountryAnomalyRow[];
  initialWindow?: AnomalyWindow;
}) {
  const [anomalyWindow, setAnomalyWindow] = useState<AnomalyWindow>(initialWindow);
  const [level, setLevel] = useState<MapLevel>('countries');

  if (!countryAnomalies || countryAnomalies.length === 0) return null;

  const cardTitle = 'Temperature Anomaly Map';

  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h3 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <Globe2 className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
        <span className="min-w-0 flex-1">{cardTitle}</span>
      </h3>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mr-1">Level</span>
        {LEVEL_OPTS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setLevel(opt.key)}
            className={`${TOGGLE_BASE} ${level === opt.key ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mr-1">Window</span>
        {WINDOW_OPTS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setAnomalyWindow(opt.key)}
            className={`${TOGGLE_BASE} ${anomalyWindow === opt.key ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <GlobalAnomalyMap countryAnomalies={countryAnomalies} window={anomalyWindow} level={level} />
      <p className="text-xs text-gray-500 mt-3">
        Source: NOAA Climate at a Glance &middot; Met Office (UK) &middot; each region ranked against its own record, so colour reflects <em>relative</em> warming. Continent and US climate region levels use 4BYO group rollups (see <a className="underline hover:text-[#D0A65E]" href="/climate/methodology">methodology</a>).
      </p>
    </div>
  );
}
