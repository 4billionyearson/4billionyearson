"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Wind, ArrowUp, ArrowDown, ExternalLink, Loader2 } from 'lucide-react';

interface YearlyPoint {
  year: number;
  coalShareElec: number | null;
  gasShareElec: number | null;
  oilShareElec: number | null;
  solarShareElec: number | null;
  windShareElec: number | null;
  hydroShareElec: number | null;
  nuclearShareElec: number | null;
  biofuelShareElec: number | null;
  otherRenewShareElecExcBiofuel: number | null;
  renewablesShareElec: number | null;
  fossilShareElec: number | null;
}

interface CountryEnergy {
  name: string;
  yearly: YearlyPoint[];
  latest: unknown;
}

interface EnergyApiResponse {
  world: CountryEnergy;
  country?: CountryEnergy | null;
  usState?: CountryEnergy | null;
  fetchedAt: string;
}

const MIX_COLORS: Record<string, string> = {
  coal: '#1f2937',
  gas: '#9a3412',
  oil: '#7c2d12',
  nuclear: '#a78bfa',
  hydro: '#0ea5e9',
  wind: '#22d3ee',
  solar: '#fbbf24',
  bio: '#84cc16',
  other: '#6b7280',
};

interface MixSlice { key: string; label: string; share: number; color: string }

function buildMix(y: YearlyPoint): MixSlice[] {
  const slices: MixSlice[] = [
    { key: 'coal', label: 'Coal', share: y.coalShareElec ?? 0, color: MIX_COLORS.coal },
    { key: 'gas', label: 'Gas', share: y.gasShareElec ?? 0, color: MIX_COLORS.gas },
    { key: 'oil', label: 'Oil', share: y.oilShareElec ?? 0, color: MIX_COLORS.oil },
    { key: 'nuclear', label: 'Nuclear', share: y.nuclearShareElec ?? 0, color: MIX_COLORS.nuclear },
    { key: 'hydro', label: 'Hydro', share: y.hydroShareElec ?? 0, color: MIX_COLORS.hydro },
    { key: 'wind', label: 'Wind', share: y.windShareElec ?? 0, color: MIX_COLORS.wind },
    { key: 'solar', label: 'Solar', share: y.solarShareElec ?? 0, color: MIX_COLORS.solar },
    { key: 'bio', label: 'Bioenergy', share: (y.biofuelShareElec ?? 0) + (y.otherRenewShareElecExcBiofuel ?? 0), color: MIX_COLORS.bio },
  ].filter(s => s.share > 0.05);
  const sum = slices.reduce((s, x) => s + x.share, 0);
  if (sum < 99.5) {
    slices.push({ key: 'other', label: 'Other', share: Math.max(0, 100 - sum), color: MIX_COLORS.other });
  }
  return slices;
}

function MiniSparkline({ data, color, height = 28 }: { data: number[]; color: string; height?: number }) {
  const path = useMemo(() => {
    if (!data.length) return '';
    const minY = Math.min(...data);
    const maxY = Math.max(...data);
    const range = maxY - minY || 1;
    const w = 100;
    const stepX = w / Math.max(1, data.length - 1);
    return data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - minY) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }, [data, height]);

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function findLatestMixYear(yearly: YearlyPoint[]): YearlyPoint | null {
  for (let i = yearly.length - 1; i >= 0; i--) {
    const y = yearly[i];
    if (y.coalShareElec != null || y.gasShareElec != null || y.solarShareElec != null || y.renewablesShareElec != null) {
      return y;
    }
  }
  return null;
}

function CardShell({ title, year, deepLinkHref, children }: {
  title: string; year: number; deepLinkHref: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden">
      <div className="p-4 pb-0">
        <h2 className="text-xl font-bold font-mono text-white flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
          <Wind className="text-[#D1E368]" />
          <span className="min-w-0 flex-1">{title}</span>
          <span className="text-[11px] text-gray-500 font-mono font-normal mt-1.5">{year}</span>
        </h2>
      </div>
      <div className="p-4 md:p-5 space-y-4">{children}</div>
      <Link
        href={deepLinkHref}
        className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-gray-800/60 bg-gray-900/40 text-xs text-[#D1E368] hover:text-[#E4F088] hover:bg-[#D1E368]/5 transition-colors"
      >
        <span>See full energy data</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function MixPanel({ yearly, countryName }: { yearly: YearlyPoint[]; countryName?: string }) {
  const latestPoint = findLatestMixYear(yearly);
  if (!latestPoint) return null;

  const slices = buildMix(latestPoint);
  const renewLatest = latestPoint.renewablesShareElec ?? 0;
  const tenAgo = yearly.find(y => y.year === latestPoint.year - 10);
  const renewTenAgo = tenAgo?.renewablesShareElec ?? null;
  const renewDelta = renewTenAgo != null ? renewLatest - renewTenAgo : null;

  const recent = yearly.slice(-25);
  const windSeries = recent.map(y => y.windShareElec ?? 0);
  const solarSeries = recent.map(y => y.solarShareElec ?? 0);

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl md:text-4xl font-bold font-mono text-white">
            {renewLatest.toFixed(0)}<span className="text-2xl text-gray-400">%</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Renewables share{countryName ? ` · ${countryName}` : ' of electricity'}
          </div>
        </div>
        {renewDelta != null && tenAgo && (
          <div className={`text-right ${renewDelta >= 0 ? 'text-emerald-300' : 'text-orange-300'}`}>
            <div className="text-base font-bold font-mono inline-flex items-center gap-1">
              {renewDelta >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {renewDelta >= 0 ? '+' : ''}{renewDelta.toFixed(1)}pp
            </div>
            <div className="text-[11px] text-gray-500">vs {tenAgo.year}</div>
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Generation mix</div>
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-800/60">
          {slices.map((s) => (
            <div key={s.key} className="h-full" title={`${s.label}: ${s.share.toFixed(1)}%`}
              style={{ width: `${s.share}%`, backgroundColor: s.color }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
          {slices.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1 text-gray-300">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label} <span className="text-gray-500">{s.share.toFixed(1)}%</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-lg border border-gray-800/60 bg-gray-900/40 p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-400">Wind</span>
            <span className="font-mono font-semibold text-cyan-300">{(latestPoint.windShareElec ?? 0).toFixed(1)}%</span>
          </div>
          <MiniSparkline data={windSeries} color="#22d3ee" />
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{recent[0].year} → {latestPoint.year}</div>
        </div>
        <div className="rounded-lg border border-gray-800/60 bg-gray-900/40 p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-400">Solar</span>
            <span className="font-mono font-semibold text-amber-300">{(latestPoint.solarShareElec ?? 0).toFixed(1)}%</span>
          </div>
          <MiniSparkline data={solarSeries} color="#fbbf24" />
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{recent[0].year} → {latestPoint.year}</div>
        </div>
      </div>
    </>
  );
}

export default function EnergyMixCard({ countryName, usStateCode, usStateName, deepLinkHref }: {
  countryName?: string;
  usStateCode?: string;
  usStateName?: string;
  deepLinkHref?: string;
}) {
  const [data, setData] = useState<EnergyApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string;
    if (usStateCode) {
      const sn = usStateName || usStateCode;
      url = `/api/climate/energy?state=${encodeURIComponent(usStateCode)}&stateName=${encodeURIComponent(sn)}`;
    } else if (countryName) {
      url = `/api/climate/energy?country=${encodeURIComponent(countryName)}`;
    } else {
      url = '/api/climate/energy';
    }
    fetch(url)
      .then(r => r.json())
      .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setData(d); } })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load'); });
    return () => { cancelled = true; };
  }, [countryName, usStateCode, usStateName]);

  const href = deepLinkHref ?? (usStateCode
    ? `/energy-dashboard?state=${encodeURIComponent(usStateCode)}`
    : countryName
      ? `/energy-dashboard?country=${encodeURIComponent(countryName)}`
      : '/energy-dashboard');

  if (error) {
    return (
      <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-5 text-sm text-gray-400">
        Energy data unavailable.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#D1E368]" />
      </div>
    );
  }

  // Choose series: US state → country → world
  let yearly: YearlyPoint[];
  let displayName: string | undefined;
  if (usStateCode && data.usState?.yearly?.length) {
    yearly = data.usState.yearly;
    displayName = data.usState.name;
  } else if (countryName && data.country?.yearly?.length) {
    yearly = data.country.yearly;
    displayName = data.country.name;
  } else {
    yearly = data.world.yearly;
    displayName = undefined;
  }
  const latestPoint = findLatestMixYear(yearly);

  if (!latestPoint) {
    const label = displayName || countryName || usStateName;
    return (
      <div className="bg-gray-950/90 rounded-2xl border-2 border-[#D0A65E] p-5 text-sm text-gray-400">
        Electricity mix unavailable{label ? ` for ${label}` : ''}.
      </div>
    );
  }

  const title = 'Electricity Mix';

  return (
    <CardShell title={title} year={latestPoint.year} deepLinkHref={href}>
      <MixPanel yearly={yearly} countryName={displayName} />
    </CardShell>
  );
}
