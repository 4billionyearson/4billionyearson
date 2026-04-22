"use client";

import React from 'react';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Waves, Snowflake, Flame, Wind, ExternalLink, ArrowUpRight } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Shared tile shell
function Tile({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border-2 border-[#D0A65E] bg-gray-950/90 backdrop-blur-md p-3.5 md:p-4 shadow-xl flex flex-col ${className}`}>
      {children}
    </div>
  );
}

function TileHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-xl font-bold font-mono text-white flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-5 [&>svg]:w-5">{icon}<span className="min-w-0 flex-1">{title}</span></h3>
      {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
    </div>
  );
}

// ─── ENSO ───────────────────────────────────────────────────────────────────

interface EnsoData {
  state: 'El Niño' | 'La Niña' | 'Neutral';
  strength: string;
  anomaly: number;
  season: string;
  seasonYear: number;
  history: { season: string; year: number; anom: number }[];
}

export function EnsoCard({ enso }: { enso: EnsoData | null }) {
  if (!enso) return null;
  const state = enso.state;
  const color = state === 'El Niño' ? '#fb7185' : state === 'La Niña' ? '#60a5fa' : '#a3a3a3';
  const accent = state === 'El Niño' ? 'text-rose-300' : state === 'La Niña' ? 'text-sky-300' : 'text-gray-300';

  // Chart data — last 36 seasons with indexed x to keep spacing even
  const chart = enso.history.map((p, i) => ({ i, label: p.season, anom: p.anom, year: p.year }));

  return (
    <Tile>
      <TileHeader
        icon={<Wind className="h-5 w-5 text-sky-300" />}
        title="ENSO — El Niño / La Niña State"
        subtitle={`NOAA CPC Oceanic Niño Index (3-month running mean of Niño 3.4 SST)`}
      />
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className={`text-3xl font-bold font-mono ${accent}`}>{state}</p>
          {enso.strength ? <p className="text-xs text-gray-400 capitalize">{enso.strength}</p> : null}
        </div>
        <div className="text-right">
          <p className="font-mono text-white text-lg">{enso.anomaly > 0 ? '+' : ''}{enso.anomaly.toFixed(2)}°C</p>
          <p className="text-[11px] text-gray-400">{enso.season} {enso.seasonYear}</p>
        </div>
      </div>
      <div className="h-36 mt-3 -ml-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={9} interval={5} />
            <YAxis stroke="#9CA3AF" fontSize={10} width={28} domain={[-3, 3]} ticks={[-2, -1, 0, 1, 2]} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => [typeof v === 'number' ? `${v > 0 ? '+' : ''}${v.toFixed(2)}°C` : '—', 'ONI anomaly']}
              labelFormatter={(_, p: any) => p?.[0]?.payload ? `${p[0].payload.label} ${p[0].payload.year}` : ''}
            />
            <ReferenceLine y={0.5} stroke="#fb7185" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={-0.5} stroke="#60a5fa" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={0} stroke="#6B7280" />
            <Bar dataKey="anom" isAnimationActive={false}>
              {chart.map((p, i) => (
                <Cell key={i} fill={p.anom >= 0.5 ? '#fb7185' : p.anom <= -0.5 ? '#60a5fa' : '#6b7280'} fillOpacity={p.i === chart.length - 1 ? 1 : 0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        ≥ +0.5°C = El Niño · ≤ -0.5°C = La Niña · between = Neutral. El Niño years tend to push global temperature up; La Niña years temporarily damp it.
      </p>
      <p className="text-[11px] text-gray-400 mt-1">
        <span style={{ color }} /> Source:&nbsp;
        <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php" target="_blank" rel="noopener noreferrer" className="underline text-[#D0A65E] hover:text-[#E8C97A] inline-flex items-center gap-1">
          NOAA CPC ONI <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </p>
    </Tile>
  );
}

// ─── GHG tile ───────────────────────────────────────────────────────────────

interface GhgStat {
  label: string;
  unit: string;
  latest: { year: number; month: number; value: number };
  yoy: { absolute: number | null; pct: number | null } | null;
  tenYr: { absolute: number | null; pct: number | null } | null;
  preindustrial: number;
  vsPreindustrialPct: number | null;
  sparkline: { year: number; month: number; value: number }[];
}

function GhgRow({ stat, color }: { stat: GhgStat; color: string }) {
  const spark = stat.sparkline.map((p, i) => ({ i, v: p.value }));
  return (
    <div className="py-2 border-b border-gray-900 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{stat.label}</p>
          <p className="text-[11px] text-gray-400">
            {stat.latest.value.toFixed(stat.unit === 'ppm' ? 2 : 1)} {stat.unit} ({stat.latest.year}-{String(stat.latest.month).padStart(2, '0')})
          </p>
        </div>
        <div className="text-right">
          {stat.vsPreindustrialPct != null && (
            <p className="text-sm font-mono" style={{ color }}>+{stat.vsPreindustrialPct.toFixed(0)}% vs 1750</p>
          )}
          {stat.yoy?.absolute != null && (
            <p className="text-[11px] text-gray-400">+{stat.yoy.absolute.toFixed(stat.unit === 'ppm' ? 2 : 1)} {stat.unit}/yr</p>
          )}
        </div>
      </div>
      <div className="h-8 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GhgTile({ ghgStats }: { ghgStats: { co2: GhgStat | null; ch4: GhgStat | null; n2o: GhgStat | null } | null }) {
  if (!ghgStats) return null;
  const { co2, ch4, n2o } = ghgStats;
  if (!co2 && !ch4 && !n2o) return null;
  return (
    <Tile>
      <TileHeader
        icon={<Flame className="h-5 w-5 text-amber-400" />}
        title="Greenhouse Gases — Latest Monthly Mean"
        subtitle="NOAA Global Monitoring Laboratory · globally-averaged marine surface sites"
      />
      {co2 && <GhgRow stat={co2} color="#fb923c" />}
      {ch4 && <GhgRow stat={ch4} color="#f472b6" />}
      {n2o && <GhgRow stat={n2o} color="#a78bfa" />}
      <p className="text-[11px] text-gray-400 mt-2">
        Sparklines: last 10 years of monthly values. Pre-industrial reference values: CO₂ 280 ppm, CH₄ 722 ppb, N₂O 270 ppb.
      </p>
      <div className="mt-auto pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <Link href="/greenhouse-gases" className="inline-flex items-center gap-1 text-[#D0A65E] hover:text-[#E8C97A] font-semibold">
          Greenhouse gases dashboard <ArrowUpRight className="h-3 w-3" />
        </Link>
        <Link href="/emissions" className="inline-flex items-center gap-1 text-[#D0A65E] hover:text-[#E8C97A] font-semibold">
          Emissions by country <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        Source:&nbsp;
        <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noopener noreferrer" className="underline text-[#D0A65E] hover:text-[#E8C97A] inline-flex items-center gap-1">
          NOAA GML Trends <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </p>
    </Tile>
  );
}

// ─── Sea ice ────────────────────────────────────────────────────────────────

interface SeaIceStats {
  label: string;
  baseline: string;
  unit: string;
  latest: { year: number; month: number; extent: number };
  climatology: number;
  anomaly: number;
  anomalyPct: number | null;
  rankLowestOfSameMonth: number;
  totalYearsInMonth: number;
  recent60: { year: number; month: number; extent: number }[];
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function SeaIceTile({ seaIce, variant = 'tile' }: { seaIce: SeaIceStats | null; variant?: 'tile' | 'section' }) {
  if (!seaIce) return null;
  const chart = seaIce.recent60.map((p, i) => ({ i, label: `${MONTH_NAMES[p.month]} ${String(p.year).slice(-2)}`, extent: p.extent }));
  const anomColor = seaIce.anomaly < 0 ? 'text-sky-300' : 'text-emerald-300';
  const isSection = variant === 'section';
  return (
    <Tile className={isSection ? 'p-4 md:p-5' : ''}>
      {isSection ? (
        <div className="mb-4">
          <h2 className="text-xl font-bold font-mono text-white flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
            <Snowflake className="h-5 w-5 text-sky-300" />
            <span className="min-w-0 flex-1">Global Sea Ice Extent</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">Arctic + Antarctic combined · anomaly vs {seaIce.baseline}</p>
        </div>
      ) : (
        <TileHeader
          icon={<Snowflake className="h-5 w-5 text-sky-300" />}
          title="Global Sea Ice Extent"
          subtitle={`Arctic + Antarctic combined · anomaly vs ${seaIce.baseline}`}
        />
      )}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-3xl font-bold font-mono text-white">{seaIce.latest.extent.toFixed(2)}<span className="text-sm text-gray-400 font-normal"> Mkm²</span></p>
          <p className="text-[11px] text-gray-400">{MONTH_NAMES[seaIce.latest.month]} {seaIce.latest.year}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-mono ${anomColor}`}>
            {seaIce.anomaly > 0 ? '+' : ''}{seaIce.anomaly.toFixed(2)} Mkm²
          </p>
          {seaIce.anomalyPct != null && (
            <p className="text-[11px] text-gray-400">{seaIce.anomalyPct > 0 ? '+' : ''}{seaIce.anomalyPct.toFixed(1)}% vs {seaIce.baseline}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-0.5">
            Rank: <span className="text-white font-semibold">{seaIce.rankLowestOfSameMonth}</span> lowest of {seaIce.totalYearsInMonth} {MONTH_NAMES[seaIce.latest.month]}s
          </p>
        </div>
      </div>
      <div className="h-28 mt-3 -ml-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={9} interval={11} />
            <YAxis stroke="#9CA3AF" fontSize={10} width={26} domain={[14, 26]} tickFormatter={(v) => `${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => [typeof v === 'number' ? `${v.toFixed(2)} Mkm²` : '—', 'Extent']}
            />
            <Line type="monotone" dataKey="extent" stroke="#38bdf8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">Last 60 months. Long-term trend is down — Arctic loss exceeds Antarctic variability.</p>
      <div className="mt-auto pt-2 text-[11px]">
        <Link href="/sea-levels-ice" className="inline-flex items-center gap-1 text-[#D0A65E] hover:text-[#E8C97A] font-semibold">
          Sea levels &amp; ice dashboard <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        Source:&nbsp;
        <a href="https://nsidc.org/arcticseaicenews/" target="_blank" rel="noopener noreferrer" className="underline text-[#D0A65E] hover:text-[#E8C97A] inline-flex items-center gap-1">
          NSIDC via global-warming.org <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </p>
    </Tile>
  );
}

// ─── Continental bar ────────────────────────────────────────────────────────

interface ContinentStat {
  key: string;
  label: string;
  latest: { year: number; month: number; anomaly: number } | null;
}

export function ContinentalBar({ continents }: { continents: ContinentStat[] | null }) {
  if (!continents?.length) return null;
  const rows = continents
    .filter((c) => c.latest && Number.isFinite(c.latest.anomaly))
    .map((c) => ({ label: c.label, anom: c.latest!.anomaly, year: c.latest!.year, month: c.latest!.month }))
    .sort((a, b) => b.anom - a.anom);
  if (!rows.length) return null;
  const latest = rows[0];
  return (
    <Tile>
      <TileHeader
        icon={<Waves className="h-5 w-5 text-orange-300" />}
        title="Continental Land Anomalies — Latest Month"
        subtitle={`${MONTH_NAMES[latest.month]} ${latest.year} vs 1901–2000 average (NOAA, land only)`}
      />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis type="number" stroke="#9CA3AF" fontSize={10} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}°C`} />
            <YAxis type="category" dataKey="label" stroke="#9CA3AF" fontSize={11} width={150} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => [typeof v === 'number' ? `${v > 0 ? '+' : ''}${v.toFixed(2)}°C` : '—', 'Anomaly']}
            />
            <ReferenceLine x={0} stroke="#6B7280" />
            <Bar dataKey="anom" isAnimationActive={false}>
              {rows.map((p, i) => (
                <Cell key={i} fill={p.anom > 0 ? '#fb923c' : '#60a5fa'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        Ranked warmest to coolest for the most recent complete month. Each bar shows the continent&apos;s land-surface temperature anomaly relative to its 20th-century average.
      </p>
      <p className="text-[11px] text-gray-400 mt-1">
        Source:&nbsp;
        <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series" target="_blank" rel="noopener noreferrer" className="underline text-[#D0A65E] hover:text-[#E8C97A] inline-flex items-center gap-1">
          NOAA Climate at a Glance <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </p>
    </Tile>
  );
}

// ─── What-changed diff ──────────────────────────────────────────────────────

interface RankedStat {
  label: string;
  value: number;
  diff: number | null;
  rank: number;
  total: number;
  recordLabel: string;
  recordValue: number;
}

export function WhatChangedTile({
  current,
  previous,
}: {
  current: RankedStat | null;
  previous: RankedStat | null;
}) {
  if (!current || !previous) return null;
  const sameMonth = current.label === previous.label;
  const diffRank = current.rank - previous.rank; // positive = worse this month (lower rank number means warmer)
  const diffValue = current.diff != null && previous.diff != null ? current.diff - previous.diff : null;
  return (
    <Tile>
      <TileHeader
        icon={<Flame className="h-5 w-5 text-orange-300" />}
        title="What Changed Since Last Month"
        subtitle="Rank and anomaly movement of the latest monthly reading"
      />
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Previous snapshot</p>
          <p className="text-white font-semibold mt-0.5">{previous.label}</p>
          <p className="text-gray-400 text-xs">
            {previous.value.toFixed(2)}°C · anomaly {previous.diff != null ? (previous.diff > 0 ? '+' : '') + previous.diff.toFixed(2) + '°C' : '—'}
          </p>
          <p className="text-gray-500 text-xs">Rank: {previous.rank}/{previous.total}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Current snapshot</p>
          <p className="text-white font-semibold mt-0.5">{current.label}</p>
          <p className="text-gray-400 text-xs">
            {current.value.toFixed(2)}°C · anomaly {current.diff != null ? (current.diff > 0 ? '+' : '') + current.diff.toFixed(2) + '°C' : '—'}
          </p>
          <p className="text-gray-500 text-xs">Rank: {current.rank}/{current.total}</p>
        </div>
      </div>
      {sameMonth ? null : (
        <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-400">
          <p>
            Latest month moved from <span className="text-white">{previous.label}</span> to <span className="text-white">{current.label}</span>.
            {diffValue != null && (
              <> Anomaly changed by <span className={diffValue > 0 ? 'text-orange-300' : 'text-sky-300'}>
                {diffValue > 0 ? '+' : ''}{diffValue.toFixed(2)}°C
              </span>.</>
            )}
            {diffRank !== 0 && (
              <> Rank changed by <span className={diffRank < 0 ? 'text-orange-300' : 'text-sky-300'}>
                {diffRank > 0 ? '+' : ''}{diffRank}
              </span> (lower = warmer on record).</>
            )}
          </p>
        </div>
      )}
    </Tile>
  );
}
