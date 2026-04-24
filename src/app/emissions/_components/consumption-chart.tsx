"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import type { ExtrasGlobalResponse, ExtrasCountryResponse } from './fuel-chart';

/* ─── Helpers ────────────────────────────────────────────────────────── */

const fmtMt = (v: number | null | undefined) => {
  if (v == null) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(2)} Gt`;
  return `${v.toFixed(1)} Mt`;
};

const Tip = ({ active, payload, label, unit = 'Mt' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="text-xs">
          {p.name}: {typeof p.value === 'number' ? fmtMt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── Global section ─────────────────────────────────────────────────── */

export function GlobalConsumptionSection() {
  const [data, setData] = useState<ExtrasGlobalResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    fetch('/api/climate/emissions/extras?view=global')
      .then(r => r.json())
      .then(d => { if (!c) { if (d.error) throw new Error(d.error); setData(d); } })
      .catch(e => { if (!c) setErr(e.message); });
    return () => { c = true; };
  }, []);

  if (err) return <div className="text-sm text-gray-400 p-4">Consumption data unavailable.</div>;
  if (!data) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#D0A65E]" />
      </div>
    );
  }

  const { netImporters, netExporters } = data.rankings;
  const year = netImporters[0]?.year ?? data.rankings.consumption[0]?.year ?? 0;

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-300 leading-relaxed">
        <span className="text-[#D0A65E] font-medium">Production-based</span> accounting (what the standard CO₂ figures measure) counts emissions where the
        smokestack is. <span className="text-[#D0A65E] font-medium">Consumption-based</span> accounting reassigns those emissions to the country that
        ultimately <em>buys</em> the product. The gap - <span className="font-mono">trade CO₂</span> - reveals where climate responsibility shifts under globalised supply chains.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Net importers */}
        <div>
          <h3 className="text-sm font-mono text-white mb-3 inline-flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-red-400" /> Net CO₂ Importers ({year})
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Consume more CO₂ than they produce - outsource emissions.
          </p>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={netImporters} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#D3C8BB' }} tickLine={false} axisLine={false} interval={0} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="value" name="Net imports" fill="#f87171" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net exporters */}
        <div>
          <h3 className="text-sm font-mono text-white mb-3 inline-flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-emerald-400" /> Net CO₂ Exporters ({year})
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Produce more CO₂ than they consume - factories of the world.
          </p>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={netExporters} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#D3C8BB' }} tickLine={false} axisLine={false} interval={0} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="value" name="Net exports (trade CO₂)" fill="#34d399" radius={[0, 4, 4, 0]}>
                  {netExporters.map((_: unknown, i: number) => <Cell key={i} fill="#34d399" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Values in Mt CO₂. Negative trade-CO₂ shown as positive net exports above. Source:{' '}
        <a href="https://ourworldindata.org/consumption-based-co2" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a>{' '}
        / <a href="https://globalcarbonproject.org/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Global Carbon Project</a>.
        Consumption-based data only available for countries with detailed trade records (mostly OECD + major economies) from ~1990.
      </p>
    </div>
  );
}

/* ─── Country section ─────────────────────────────────────────────────── */

export function CountryConsumptionChart({ countryName }: { countryName?: string }) {
  const [data, setData] = useState<ExtrasCountryResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!countryName) return;
    let c = false;
    setData(null); setErr(null);
    fetch(`/api/climate/emissions/extras?view=country&name=${encodeURIComponent(countryName)}`)
      .then(r => r.json())
      .then(d => { if (!c) { if (d.error) throw new Error(d.error); setData(d); } })
      .catch(e => { if (!c) setErr(e.message); });
    return () => { c = true; };
  }, [countryName]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.country.yearly
      .filter(y => y.consumption_co2 != null || y.co2 != null)
      .map(y => ({
        year: y.year,
        production: y.co2 ?? null,
        consumption: y.consumption_co2 ?? null,
      }))
      .filter(d => d.consumption != null); // only show years where consumption is available
  }, [data]);

  if (err) return <div className="text-xs text-gray-500">Consumption data unavailable.</div>;
  if (!data) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic py-4">
        Consumption-based CO₂ figures are not published for this country.
      </div>
    );
  }

  const latest = chartData[chartData.length - 1];
  const gap = (latest.consumption ?? 0) - (latest.production ?? 0);
  const gapPct = latest.production ? (gap / latest.production) * 100 : 0;
  const isImporter = gap > 0;

  return (
    <div className="space-y-3">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}Gt` : `${v}Mt`} />
            <Tooltip content={<Tip />} />
            <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 11, paddingTop: 6 }} />
            <Line type="monotone" dataKey="production" name="Production-based" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="consumption" name="Consumption-based" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400">
        In {latest.year}, {data.country.name}&apos;s consumption-based CO₂ was{' '}
        <span className={isImporter ? 'text-red-300' : 'text-emerald-300'}>
          {fmtMt(latest.consumption)}
        </span>{' '}
        vs production-based{' '}
        <span className="text-gray-200">{fmtMt(latest.production)}</span>
        {' '}— a {isImporter ? 'net import' : 'net export'} of{' '}
        <span className={isImporter ? 'text-red-300' : 'text-emerald-300'}>{fmtMt(Math.abs(gap))}</span>
        {' '}({gapPct >= 0 ? '+' : ''}{gapPct.toFixed(0)}%).
      </p>
    </div>
  );
}
