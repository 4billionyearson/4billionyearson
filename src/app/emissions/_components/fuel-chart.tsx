"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush,
} from 'recharts';
import { Loader2 } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface YearlyCompact {
  year: number;
  co2?: number;
  coal_co2?: number;
  oil_co2?: number;
  gas_co2?: number;
  cement_co2?: number;
  flaring_co2?: number;
  land_use_change_co2?: number;
  consumption_co2?: number;
  trade_co2?: number;
  methane?: number;
  nitrous_oxide?: number;
  total_ghg?: number;
  co2_per_gdp?: number;
  co2_including_luc?: number;
}

interface CountrySlice {
  name: string;
  iso?: string;
  yearly: YearlyCompact[];
  latest: YearlyCompact | null;
}

export interface ExtrasGlobalResponse {
  world: CountrySlice;
  aggregates: Record<string, YearlyCompact | null>;
  rankings: {
    consumption: { name: string; value: number; year: number }[];
    methane: { name: string; value: number; year: number }[];
    nitrous_oxide: { name: string; value: number; year: number }[];
    total_ghg: { name: string; value: number; year: number }[];
    co2_per_gdp: { name: string; value: number; year: number }[];
    netImporters: { name: string; value: number; year: number; production: number; consumption: number }[];
    netExporters: { name: string; value: number; year: number; production: number; consumption: number }[];
  };
  fetchedAt: string;
}

export interface ExtrasCountryResponse {
  country: CountrySlice;
  fetchedAt: string;
}

/* ─── Formatters ─────────────────────────────────────────────────────────── */

const formatYAxisMt = (v: number) => {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}Gt`;
  if (v >= 1) return `${v.toFixed(0)}Mt`;
  return `${v.toFixed(1)}Mt`;
};

const formatValueMt = (v: number | null | undefined) => {
  if (v == null) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(2)} Gt`;
  return `${v.toFixed(1)} Mt`;
};

const StackTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[200px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.slice().reverse().map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="text-xs">
          {p.name}: {formatValueMt(p.value)}
        </p>
      ))}
      <p className="text-xs text-gray-400 mt-1 border-t border-gray-700 pt-1">
        Total: {formatValueMt(total)}
      </p>
    </div>
  );
};

/* ─── Fuel colours ───────────────────────────────────────────────────────
   Aligned with the energy / renewables dashboard palette so Coal, Oil and
   Gas read consistently across emissions and energy charts. The original
   #1f2937 coal was unreadable against the dark surface — gray-400 here is
   the same tone the renewables dashboard uses. */

const FUEL_CONFIG: { key: keyof YearlyCompact; label: string; color: string }[] = [
  { key: 'coal_co2',    label: 'Coal',    color: '#9ca3af' },
  { key: 'oil_co2',     label: 'Oil',     color: '#78716c' },
  { key: 'gas_co2',     label: 'Gas',     color: '#d97706' },
  { key: 'cement_co2',  label: 'Cement',  color: '#f59e0b' },
  { key: 'flaring_co2', label: 'Flaring', color: '#facc15' },
];

/* ─── Main component ────────────────────────────────────────────────────── */

export function FuelStackedChart({ data, height = 360, since = 1950 }: {
  data: YearlyCompact[];
  height?: number;
  since?: number;
}) {
  const chartData = useMemo(() => {
    return data
      .filter(y => y.year >= since)
      .map(y => {
        const row: Record<string, number | string | null> = { year: y.year };
        for (const f of FUEL_CONFIG) {
          const v = y[f.key];
          row[f.label] = typeof v === 'number' ? v : 0;
        }
        return row;
      });
  }, [data, since]);

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-500">
        No fuel breakdown available.
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatYAxisMt} />
          <Tooltip content={<StackTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 11, paddingTop: 8 }} />
          {FUEL_CONFIG.map((f) => (
            <Area
              key={f.label}
              type="monotone"
              dataKey={f.label}
              stackId="fuel"
              stroke={f.color}
              fill={f.color}
              fillOpacity={0.85}
              strokeWidth={0.5}
              dot={false}
            />
          ))}
          <Brush dataKey="year" height={24} stroke="#4B5563" fill="#111827" travellerWidth={10} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Global fuel section for /emissions ────────────────────────────────── */

export function GlobalFuelSection() {
  const [data, setData] = useState<ExtrasGlobalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/climate/emissions/extras?view=global')
      .then(r => r.json())
      .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setData(d); } })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load'); });
    return () => { cancelled = true; };
  }, []);

  const latest = data?.world.latest ?? null;
  const latestYear = latest?.year ?? 0;

  // Latest-year fuel split for the caption
  const fuelShares = useMemoFuelShares(latest);

  if (error) {
    return (
      <div className="text-sm text-gray-400 p-4">Fuel-source breakdown unavailable.</div>
    );
  }

  if (!data) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#D0A65E]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FuelStackedChart data={data.world.yearly} height={400} since={1900} />

      {fuelShares.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {fuelShares.map(({ label, color, share, mt }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-gray-300">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="font-medium">{label}</span>
              <span className="text-gray-500">{share.toFixed(1)}% · {formatValueMt(mt)}</span>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Coal, oil and gas still dominate global CO₂ in {latestYear}. Cement and gas flaring together add a few percent.
        Data shown from 1900 onwards. Source:{' '}
        <a href="https://ourworldindata.org/emissions-by-fuel" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a>{' '}
        / <a href="https://globalcarbonproject.org/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Global Carbon Project</a>.
      </p>
    </div>
  );
}

/* ─── Country fuel chart (smaller, used inside EmissionsCountryPanel) ──── */

export function CountryFuelChart({ countryName, fallbackData }: {
  countryName?: string;
  fallbackData?: CountrySlice;
}) {
  const [slice, setSlice] = useState<CountrySlice | null>(fallbackData || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryName || fallbackData) return;
    let cancelled = false;
    fetch(`/api/climate/emissions/extras?view=country&name=${encodeURIComponent(countryName)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setSlice(d.country); } })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load'); });
    return () => { cancelled = true; };
  }, [countryName, fallbackData]);

  if (error) return <div className="text-xs text-gray-500">Fuel breakdown unavailable.</div>;
  if (!slice) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
      </div>
    );
  }

  return <FuelStackedChart data={slice.yearly} height={280} since={1950} />;
}

/* ─── Helper hook ─────────────────────────────────────────────────────── */

function useMemoFuelShares(latest: YearlyCompact | null) {
  return useMemo(() => {
    if (!latest) return [];
    const total = FUEL_CONFIG.reduce((s, f) => {
      const v = latest[f.key];
      return s + (typeof v === 'number' ? v : 0);
    }, 0);
    if (total <= 0) return [];
    return FUEL_CONFIG.map(f => {
      const v = latest[f.key];
      const mt = typeof v === 'number' ? v : 0;
      return { label: f.label, color: f.color, mt, share: (mt / total) * 100 };
    }).filter(x => x.mt > 0);
  }, [latest]);
}
