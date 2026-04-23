"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Loader2, Flame, Wind, Clock, AlertTriangle } from 'lucide-react';
import type { ExtrasGlobalResponse, ExtrasCountryResponse } from './fuel-chart';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const fmtMt = (v: number | null | undefined) => {
  if (v == null) return '—';
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} Gt`;
  return `${v.toFixed(1)} Mt`;
};

const fmtGt = (v: number) => `${v.toFixed(0)} Gt`;

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[200px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="text-xs">
          {p.name}: {typeof p.value === 'number' ? fmtMt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── IPCC AR6 remaining carbon budgets (GtCO₂, from start of 2020) ────── */
const AR6_BUDGETS = [
  { label: '1.5 °C', probability: '50% chance', start: 500,  color: '#dc2626' },
  { label: '1.5 °C', probability: '67% chance', start: 400,  color: '#b91c1c' },
  { label: '1.7 °C', probability: '50% chance', start: 850,  color: '#f97316' },
  { label: '2.0 °C', probability: '50% chance', start: 1350, color: '#eab308' },
];
const BUDGET_BASE_YEAR = 2020;

/* ─── Global GHG section ─────────────────────────────────────────────── */

export function GlobalGhgSection() {
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

  if (err) return <div className="text-sm text-gray-400 p-4">GHG data unavailable.</div>;
  if (!data) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#D0A65E]" />
      </div>
    );
  }

  // World methane + N2O + total_ghg time-series
  const worldSeries = data.world.yearly
    .filter(y => y.year >= 1990 && (y.methane != null || y.nitrous_oxide != null))
    .map(y => ({
      year: y.year,
      methane: y.methane ?? null,
      nitrous_oxide: y.nitrous_oxide ?? null,
      total_ghg: y.total_ghg ?? null,
      co2: y.co2_including_luc ?? y.co2 ?? null,
    }));

  const latest = data.world.latest;
  const latestYear = latest?.year ?? 0;
  const totalGhgLatest = latest?.total_ghg ?? null;
  const ch4Latest = latest?.methane ?? null;
  const n2oLatest = latest?.nitrous_oxide ?? null;

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-300 leading-relaxed">
        CO₂ gets the headlines, but two shorter-lived gases do disproportionate damage:{' '}
        <span className="text-orange-300 font-medium">methane (CH₄)</span>, from cattle, rice paddies, landfills and fossil-fuel leaks — around 80× more warming than CO₂ over 20 years —
        and <span className="text-sky-300 font-medium">nitrous oxide (N₂O)</span>, largely from nitrogen fertiliser, with ~270× the warming power and a century-long lifetime.
      </p>

      {/* Composition chart */}
      <div>
        <h3 className="text-sm font-mono text-white mb-3">World GHG composition (CO₂-equivalent)</h3>
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={worldSeries} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}Gt` : `${v}Mt`} />
              <Tooltip content={<Tip />} />
              <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="co2" name="CO₂ (incl. land use)" stackId="g" stroke="#ef4444" fill="#ef4444" fillOpacity={0.8} strokeWidth={0.5} />
              <Area type="monotone" dataKey="methane" name="Methane (CH₄)" stackId="g" stroke="#f97316" fill="#f97316" fillOpacity={0.85} strokeWidth={0.5} />
              <Area type="monotone" dataKey="nitrous_oxide" name="Nitrous oxide (N₂O)" stackId="g" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.9} strokeWidth={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {totalGhgLatest != null && (
          <p className="text-xs text-gray-400 mt-3">
            In {latestYear}, humanity released the equivalent of <span className="text-white font-semibold">{fmtMt(totalGhgLatest)}</span> of CO₂
            — of which methane contributed {fmtMt(ch4Latest)} and nitrous oxide {fmtMt(n2oLatest)}.
          </p>
        )}
      </div>

      {/* Rankings */}
      <div className="grid md:grid-cols-2 gap-6">
        <GhgRankingChart
          title="Top Methane Emitters"
          icon={<Flame className="h-4 w-4 text-orange-400" />}
          rows={data.rankings.methane.slice(0, 10)}
          color="#f97316"
        />
        <GhgRankingChart
          title="Top Nitrous Oxide Emitters"
          icon={<Wind className="h-4 w-4 text-sky-400" />}
          rows={data.rankings.nitrous_oxide.slice(0, 10)}
          color="#38bdf8"
        />
      </div>

      <p className="text-xs text-gray-400">
        Values in Mt CO₂-equivalent (AR5 GWP-100). Source:{' '}
        <a href="https://ourworldindata.org/greenhouse-gas-emissions" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a>{' '}/
        {' '}<a href="https://www.climatewatchdata.org/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Climate Watch</a> (Jones et al.).
      </p>
    </div>
  );
}

function GhgRankingChart({ title, icon, rows, color }: {
  title: string;
  icon: React.ReactNode;
  rows: { name: string; value: number; year: number }[];
  color: string;
}) {
  const year = rows[0]?.year ?? '';
  return (
    <div>
      <h3 className="text-sm font-mono text-white mb-3 inline-flex items-center gap-1.5">
        {icon} {title} {year && <span className="text-gray-500 text-xs">({year})</span>}
      </h3>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#D3C8BB' }} tickLine={false} axisLine={false} interval={0} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="value" name="Mt CO₂e" fill={color} radius={[0, 4, 4, 0]}>
              {rows.map((_, i) => <Cell key={i} fill={color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Carbon budget countdown ─────────────────────────────────────────── */

export function CarbonBudgetSection() {
  const [data, setData] = useState<ExtrasGlobalResponse | null>(null);

  useEffect(() => {
    let c = false;
    fetch('/api/climate/emissions/extras?view=global')
      .then(r => r.json())
      .then(d => { if (!c && !d.error) setData(d); });
    return () => { c = true; };
  }, []);

  const budgets = useMemo(() => {
    if (!data) return null;
    // Sum world CO₂ (incl. LUC) from 2020 to latest year
    const series = data.world.yearly
      .filter(y => y.year >= BUDGET_BASE_YEAR)
      .map(y => ({ year: y.year, co2: y.co2_including_luc ?? y.co2 ?? 0 }));
    if (series.length === 0) return null;
    const emittedSince = series.reduce((s, r) => s + r.co2, 0) / 1000; // Mt → Gt
    const latestYear = series[series.length - 1].year;
    const latestAnnualGt = (series[series.length - 1].co2 || 0) / 1000;

    return AR6_BUDGETS.map(b => {
      const remaining = b.start - emittedSince;
      const pctBurned = Math.min(100, Math.max(0, (emittedSince / b.start) * 100));
      const yearsLeft = latestAnnualGt > 0 ? remaining / latestAnnualGt : 0;
      const exhaustionYear = latestYear + yearsLeft;
      return { ...b, emittedSince, remaining, pctBurned, yearsLeft, exhaustionYear, latestYear, latestAnnualGt };
    });
  }, [data]);

  if (!data || !budgets) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#D0A65E]" />
      </div>
    );
  }

  const { latestYear, latestAnnualGt, emittedSince } = budgets[0];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-300 leading-relaxed">
        The IPCC&apos;s Sixth Assessment Report (AR6) gave humanity a fixed <span className="text-[#D0A65E] font-medium">carbon budget</span> from the start of 2020
        — the total tonnes of CO₂ we can still emit while keeping warming below a given threshold with a given probability. Since 2020, the world has emitted
        roughly <span className="text-white font-semibold">{fmtGt(emittedSince)}</span> of CO₂ (through {latestYear}), burning through each budget at today&apos;s pace of{' '}
        <span className="text-white font-semibold">~{latestAnnualGt.toFixed(1)} Gt/yr</span>.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {budgets.map((b, i) => {
          const exhausted = b.remaining <= 0;
          const critical = b.yearsLeft < 10 && !exhausted;
          return (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <h4 className="text-white font-mono text-base inline-flex items-center gap-2">
                  <span style={{ color: b.color }}>●</span>
                  {b.label}
                  <span className="text-gray-400 text-xs font-normal">({b.probability})</span>
                </h4>
                {exhausted && <AlertTriangle className="h-4 w-4 text-red-400" />}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Original budget (2020)</span>
                <span className="text-gray-200 font-mono">{fmtGt(b.start)} CO₂</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Emitted since 2020</span>
                <span className="text-gray-200 font-mono">{fmtGt(b.emittedSince)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Remaining</span>
                <span className={exhausted ? 'text-red-300 font-mono' : 'text-gray-200 font-mono'}>
                  {exhausted ? 'Overshot' : fmtGt(b.remaining)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${b.pctBurned}%`, backgroundColor: b.color }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 pt-1 font-mono">
                  <span>{b.pctBurned.toFixed(0)}% burned</span>
                  <span className={critical ? 'text-red-300 inline-flex items-center gap-1' : ''}>
                    {critical && <Clock className="h-3 w-3" />}
                    {exhausted
                      ? `exceeded in ${Math.floor(b.exhaustionYear)}`
                      : `~${b.yearsLeft.toFixed(1)} yrs at current rate`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Budgets from <a href="https://www.ipcc.ch/report/ar6/wg1/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">IPCC AR6 WG1 Table SPM.2</a> (p. TS-37), given from 1 January 2020 for the stated probability of staying below the temperature target. Emissions since 2020 include land-use change. &quot;Years at current rate&quot; is a mechanical projection, not a prediction — real-world trajectories bend with policy and technology.
      </p>
    </div>
  );
}

/* ─── Country GHG mini display ────────────────────────────────────────── */

export function CountryGhgPanel({ countryName }: { countryName?: string }) {
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

  if (err) return <div className="text-xs text-gray-500">GHG data unavailable.</div>;
  if (!data) {
    return (
      <div className="h-24 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
      </div>
    );
  }

  const latest = data.country.latest;
  const co2 = latest?.co2 ?? null;
  const ch4 = latest?.methane ?? null;
  const n2o = latest?.nitrous_oxide ?? null;
  const ghg = latest?.total_ghg ?? null;

  if (ch4 == null && n2o == null && ghg == null) {
    return <div className="text-xs text-gray-500 italic">Non-CO₂ gas data not published for this country.</div>;
  }

  const series = data.country.yearly
    .filter(y => y.year >= 1990 && (y.methane != null || y.nitrous_oxide != null))
    .map(y => ({
      year: y.year,
      methane: y.methane ?? null,
      nitrous_oxide: y.nitrous_oxide ?? null,
    }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <Stat label="CO₂" value={fmtMt(co2)} color="#ef4444" />
        <Stat label="Methane" value={fmtMt(ch4)} color="#f97316" />
        <Stat label="N₂O" value={fmtMt(n2o)} color="#38bdf8" />
        <Stat label="Total GHG" value={fmtMt(ghg)} color="#D0A65E" />
      </div>
      {series.length > 0 && (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}Mt`} />
              <Tooltip content={<Tip />} />
              <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 11, paddingTop: 6 }} />
              <Line type="monotone" dataKey="methane" name="Methane" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="nitrous_oxide" name="N₂O" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-0.5">
        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
        {label}
      </div>
      <div className="text-sm font-mono text-gray-100">{value}</div>
    </div>
  );
}
