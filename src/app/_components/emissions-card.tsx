"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Factory, ArrowDown, ArrowUp, ArrowUpRight, Loader2 } from 'lucide-react';

interface YearPoint { year: number; value: number }

interface GlobalApiResponse {
  top10Annual: { name: string; value: number; year: number }[];
  worldAnnual: YearPoint[];
  stats: {
    latestAnnual: number;
    latestAnnualYear: number;
    topEmitter: string;
    topEmitterValue: number;
  };
  fetchedAt: string;
}

interface CountryApiResponse {
  country: {
    name: string;
    annual: YearPoint[];
    perCapita: YearPoint[];
    cumulative: YearPoint[];
    latestYear: number;
    latestAnnual: number | null;
    latestPerCapita: number | null;
    latestCumulative: number | null;
    annualRank: number | null;
    annualOf: number;
    perCapRank: number | null;
    perCapOf: number;
    globalSharePct: number | null;
  };
  world: { annualLatest: number; annualLatestYear: number };
  fetchedAt: string;
}

// ─── US-state energy response shape (subset we need for emissions) ────────
interface EnergyLatest { year: number; ghgEmissions: number | null; ghgPerCapita: number | null }
interface EnergyYearly { year: number; ghgEmissions: number | null; ghgPerCapita: number | null }
interface EnergyApiEntity { name: string; yearly: EnergyYearly[]; latest: EnergyLatest }
interface StateEnergyApiResponse {
  country: EnergyApiEntity | null;   // USA totals
  usState: EnergyApiEntity | null;   // the selected state
  fetchedAt: string;
}

function formatTonnes(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Tt`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Gt`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} Mt`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} kt`;
  return `${v.toFixed(0)} t`;
}

function TonnesValue({ v }: { v: number }) {
  const [num, unit] = formatTonnes(v).split(' ');
  return (
    <div className="text-3xl md:text-4xl font-bold font-mono text-white">
      {num}
      <span className="text-2xl text-gray-400 ml-1">{unit}</span>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function Sparkline({ data, color = '#f87171', height = 40, gradId = 'emit-spark-grad' }: {
  data: YearPoint[]; color?: string; height?: number; gradId?: string;
}) {
  const { path, area } = useMemo(() => {
    if (!data.length) return { path: '', area: '' };
    const values = data.map(d => d.value);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const range = maxY - minY || 1;
    const w = 100;
    const h = height;
    const stepX = w / Math.max(1, data.length - 1);
    const points = data.map((d, i) => {
      const x = i * stepX;
      const y = h - ((d.value - minY) / range) * h;
      return [x, y];
    });
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
    const area = `${path} L${points[points.length - 1][0].toFixed(2)},${h} L0,${h} Z`;
    return { path, area };
  }, [data, height]);

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const TOP_COLORS = ['#ef4444', '#f97316', '#fbbf24', '#a3e635', '#22d3ee', '#a78bfa'];

function CardShell({ year, deepLinkHref, children }: { year: number; deepLinkHref: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden flex flex-col">
      <div className="p-4 pb-0">
        <h2 className="text-xl font-bold font-mono text-white flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
          <Factory className="text-rose-400" />
          <span className="min-w-0 flex-1">CO₂ Emissions</span>
          <span className="text-[11px] text-gray-500 font-mono font-normal mt-1.5">{year}</span>
        </h2>
      </div>
      <div className="p-4 md:p-5 space-y-4 flex-1">{children}</div>
      <div className="flex justify-end px-4 pb-4">
        <Link
          href={deepLinkHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          See full emissions data <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function GlobalCard({ data, deepLinkHref }: { data: GlobalApiResponse; deepLinkHref: string }) {
  const series = data.worldAnnual;
  const latest = series[series.length - 1];
  const tenYearsAgo = series.find(p => p.year === latest.year - 10) ?? series[Math.max(0, series.length - 11)];
  const delta = latest.value - tenYearsAgo.value;
  const deltaPct = tenYearsAgo.value > 0 ? (delta / tenYearsAgo.value) * 100 : 0;
  const isUp = delta >= 0;

  const top5 = data.top10Annual.slice(0, 5);
  const top5Total = top5.reduce((s, c) => s + c.value, 0);
  const restShare = ((data.stats.latestAnnual - top5Total) / data.stats.latestAnnual) * 100;
  const sparkData = series.slice(-25);

  return (
    <CardShell year={data.stats.latestAnnualYear} deepLinkHref={deepLinkHref}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <TonnesValue v={data.stats.latestAnnual} />
          <div className="text-xs text-gray-400 mt-0.5">Total fossil CO₂ worldwide</div>
        </div>
        <div className={`text-right ${isUp ? 'text-orange-300' : 'text-emerald-300'}`}>
          <div className="text-base font-bold font-mono inline-flex items-center gap-1">
            {isUp ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {isUp ? '+' : ''}{deltaPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-500">vs {tenYearsAgo.year}</div>
        </div>
      </div>

      <div>
        <Sparkline data={sparkData} color={isUp ? '#fb923c' : '#34d399'} height={48} gradId="emit-global-spark" />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-0.5">
          <span>{sparkData[0].year}</span>
          <span>{sparkData[sparkData.length - 1].year}</span>
        </div>
      </div>

      <div>
        <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Where it comes from</div>
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-800/60">
          {top5.map((c, i) => {
            const share = (c.value / data.stats.latestAnnual) * 100;
            return (
              <div key={c.name} className="h-full" title={`${c.name}: ${share.toFixed(1)}%`}
                style={{ width: `${share}%`, backgroundColor: TOP_COLORS[i] }} />
            );
          })}
          {restShare > 0 && (
            <div className="h-full bg-gray-600" title={`Rest of world: ${restShare.toFixed(1)}%`} style={{ width: `${restShare}%` }} />
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
          {top5.map((c, i) => (
            <span key={c.name} className="inline-flex items-center gap-1 text-gray-300">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: TOP_COLORS[i] }} />
              {c.name} <span className="text-gray-500">{((c.value / data.stats.latestAnnual) * 100).toFixed(1)}%</span>
            </span>
          ))}
          {restShare > 0 && (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <span className="h-2 w-2 rounded-sm bg-gray-600" />
              Rest <span className="text-gray-500">{restShare.toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>
    </CardShell>
  );
}

function CountryCard({ data, deepLinkHref }: { data: CountryApiResponse; deepLinkHref: string }) {
  const c = data.country;
  if (c.latestAnnual == null || c.annual.length === 0) {
    return (
      <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-5 text-sm text-gray-400">
        Emissions data unavailable for {c.name}.
      </div>
    );
  }

  const series = c.annual;
  const latest = series[series.length - 1];
  const tenYearsAgo = series.find(p => p.year === latest.year - 10) ?? series[Math.max(0, series.length - 11)];
  const delta = latest.value - tenYearsAgo.value;
  const deltaPct = tenYearsAgo.value > 0 ? (delta / tenYearsAgo.value) * 100 : 0;
  const isUp = delta >= 0;
  const sparkData = series.slice(-25);

  return (
    <CardShell year={c.latestYear} deepLinkHref={deepLinkHref}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <TonnesValue v={c.latestAnnual} />
          <div className="text-xs text-gray-400 mt-0.5">CO₂ emissions · {c.name}</div>
        </div>
        <div className={`text-right ${isUp ? 'text-orange-300' : 'text-emerald-300'}`}>
          <div className="text-base font-bold font-mono inline-flex items-center gap-1">
            {isUp ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {isUp ? '+' : ''}{deltaPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-500">vs {tenYearsAgo.year}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-900/40 border border-gray-800/60 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Per capita</div>
          <div className="text-sm font-mono font-semibold text-white mt-0.5">
            {c.latestPerCapita != null ? `${c.latestPerCapita.toFixed(1)} t` : '—'}
          </div>
        </div>
        <div className="rounded-lg bg-gray-900/40 border border-gray-800/60 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Global rank</div>
          <div className="text-sm font-mono font-semibold text-white mt-0.5">
            {c.annualRank != null ? `${ordinal(c.annualRank)}` : '—'}
            {c.annualOf > 0 && c.annualRank != null && <span className="text-gray-500 text-[11px]"> /{c.annualOf}</span>}
          </div>
        </div>
        <div className="rounded-lg bg-gray-900/40 border border-gray-800/60 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Share of global</div>
          <div className="text-sm font-mono font-semibold text-white mt-0.5">
            {c.globalSharePct != null ? `${c.globalSharePct.toFixed(2)}%` : '—'}
          </div>
        </div>
      </div>

      <div>
        <Sparkline data={sparkData} color={isUp ? '#fb923c' : '#34d399'} height={48} gradId="emit-country-spark" />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-0.5">
          <span>{sparkData[0]?.year ?? ''}</span>
          <span>{sparkData[sparkData.length - 1]?.year ?? ''}</span>
        </div>
      </div>
    </CardShell>
  );
}

export default function EmissionsCard({ countryName, usStateCode, usStateName, deepLinkHref }: {
  countryName?: string;
  usStateCode?: string;
  usStateName?: string;
  deepLinkHref?: string;
}) {
  const [global, setGlobal] = useState<GlobalApiResponse | null>(null);
  const [country, setCountry] = useState<CountryApiResponse | null>(null);
  const [stateData, setStateData] = useState<StateEnergyApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (usStateCode) {
      const name = usStateName || usStateCode;
      fetch(`/api/climate/energy?state=${encodeURIComponent(usStateCode)}&stateName=${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setStateData(d); } })
        .catch(e => { if (!cancelled) setError(e.message || 'Failed to load'); });
    } else if (countryName) {
      fetch(`/api/climate/emissions/country?name=${encodeURIComponent(countryName)}`)
        .then(r => r.json())
        .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setCountry(d); } })
        .catch(e => { if (!cancelled) setError(e.message || 'Failed to load'); });
    } else {
      fetch('/api/climate/emissions')
        .then(r => r.json())
        .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setGlobal(d); } })
        .catch(e => { if (!cancelled) setError(e.message || 'Failed to load'); });
    }
    return () => { cancelled = true; };
  }, [countryName, usStateCode, usStateName]);

  const href = deepLinkHref ?? (usStateCode
    ? `/energy-dashboard?state=${encodeURIComponent(usStateCode)}`
    : countryName
      ? `/emissions?country=${encodeURIComponent(countryName)}`
      : '/emissions');

  if (error) {
    return (
      <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-5 text-sm text-gray-400">
        Emissions data unavailable.
      </div>
    );
  }

  if (usStateCode) {
    if (!stateData) {
      return (
        <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
        </div>
      );
    }
    return <USStateCard data={stateData} stateName={usStateName || usStateCode} deepLinkHref={href} />;
  }

  if (countryName) {
    if (!country) {
      return (
        <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
        </div>
      );
    }
    return <CountryCard data={country} deepLinkHref={href} />;
  }

  if (!global) {
    return (
      <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
      </div>
    );
  }
  return <GlobalCard data={global} deepLinkHref={href} />;
}

/* ─── US State Card ──────────────────────────────────────────────────────── */

function USStateCard({ data, stateName, deepLinkHref }: {
  data: StateEnergyApiResponse;
  stateName: string;
  deepLinkHref: string;
}) {
  const state = data.usState;
  const usa = data.country;

  if (!state || !state.yearly.length || state.latest.ghgEmissions == null) {
    return (
      <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-5 text-sm text-gray-400">
        Emissions data unavailable for {stateName}.
      </div>
    );
  }

  // Build annual series in tonnes for sparkline + tonne-formatter
  // ghgEmissions is million metric tonnes → convert to tonnes for formatTonnes()
  const seriesMt = state.yearly.filter(y => y.ghgEmissions != null) as Array<EnergyYearly & { ghgEmissions: number }>;
  const sparkData: YearPoint[] = seriesMt.map(y => ({ year: y.year, value: y.ghgEmissions * 1e6 }));
  const latestMt = state.latest.ghgEmissions;
  const latestYear = state.latest.year;
  const tenAgo = seriesMt.find(y => y.year === latestYear - 10) ?? seriesMt[Math.max(0, seriesMt.length - 11)];
  const delta = latestMt - (tenAgo?.ghgEmissions ?? latestMt);
  const deltaPct = tenAgo && tenAgo.ghgEmissions > 0 ? (delta / tenAgo.ghgEmissions) * 100 : 0;
  const isUp = delta >= 0;

  const usLatestMt = usa?.latest.ghgEmissions ?? null;
  const shareOfUsPct = usLatestMt != null && usLatestMt > 0 ? (latestMt / usLatestMt) * 100 : null;

  const recent = sparkData.slice(-25);

  return (
    <CardShell year={latestYear} deepLinkHref={deepLinkHref}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <TonnesValue v={latestMt * 1e6} />
          <div className="text-xs text-gray-400 mt-0.5">Energy-related CO₂ · {stateName}</div>
        </div>
        <div className={`text-right ${isUp ? 'text-orange-300' : 'text-emerald-300'}`}>
          <div className="text-base font-bold font-mono inline-flex items-center gap-1">
            {isUp ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {isUp ? '+' : ''}{deltaPct.toFixed(1)}%
          </div>
          {tenAgo && <div className="text-[11px] text-gray-500">vs {tenAgo.year}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-gray-900/40 border border-gray-800/60 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Per capita</div>
          <div className="text-sm font-mono font-semibold text-white mt-0.5">
            {state.latest.ghgPerCapita != null ? `${state.latest.ghgPerCapita.toFixed(1)} t` : '—'}
          </div>
        </div>
        <div className="rounded-lg bg-gray-900/40 border border-gray-800/60 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Share of US</div>
          <div className="text-sm font-mono font-semibold text-white mt-0.5">
            {shareOfUsPct != null ? `${shareOfUsPct.toFixed(shareOfUsPct < 1 ? 2 : 1)}%` : '—'}
          </div>
        </div>
      </div>

      <div>
        <Sparkline data={recent} color={isUp ? '#fb923c' : '#34d399'} height={48} gradId="emit-state-spark" />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-0.5">
          <span>{recent[0]?.year ?? ''}</span>
          <span>{recent[recent.length - 1]?.year ?? ''}</span>
        </div>
      </div>

      <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-800/60">
        Source: <a href="https://www.eia.gov/state/seds/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">EIA State Energy Data System</a> - fossil-fuel CO₂ only.
      </div>
    </CardShell>
  );
}
