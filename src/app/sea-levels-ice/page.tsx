"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush,
} from 'recharts';
import { Loader2, Activity, Snowflake, Waves, Thermometer, ArrowUp, Link2, MapPin } from 'lucide-react';

const ArcticIceMap = dynamic(() => import("@/app/_components/arctic-ice-map"), { ssr: false });
const ICE_YEARS = ["1979","1985","1990","1995","2000","2005","2010","2012","2015","2020","2024"];

// ─── Types ───────────────────────────────────────────────────────────────────

interface YearlyPoint { year: number; value: number }
interface TempPoint { year: number; anomaly: number }

interface GHGData {
  co2: { current: { value: number }; yearly: YearlyPoint[] } | null;
  temperature: { current: { anomaly: number; date: string }; yearly: TempPoint[] } | null;
  arcticIce: { current: { extent: number; anomaly: number; date: string }; yearly: YearlyPoint[] } | null;
  oceanWarming: { current: { anomaly: number; year: string }; yearly: YearlyPoint[] } | null;
  seaLevel: { current: { value: number; year: string }; rate: string; yearly: YearlyPoint[] } | null;
  fetchedAt: string;
}

// ─── Chart config ────────────────────────────────────────────────────────────

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;

// ─── Tooltips ────────────────────────────────────────────────────────────────

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke }} className="text-sm">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Layout Components ───────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-800">
      <h2 className="text-xl font-bold font-mono text-white mb-5 flex items-center gap-2 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Divider({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="h-px bg-gray-700 flex-1" />
      <h2 className="text-lg font-bold font-mono text-gray-200 flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-gray-700 shadow-lg">
        {icon} {title}
      </h2>
      <div className="h-px bg-gray-700 flex-1" />
    </div>
  );
}

function StatCard({ label, value, unit, subtext, color }: {
  label: string; value: string; unit: string; subtext?: string; color: string;
}) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

// ─── Yearly Area Chart ───────────────────────────────────────────────────────

function SimpleYearlyChart({ data, dataKey, label, unit, color, fillColor }: {
  data: YearlyPoint[];
  dataKey: string;
  label: string;
  unit: string;
  color: string;
  fillColor: string;
}) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={`grad-sl-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit={unit === '°C' ? '°' : ''} />
          <Tooltip content={<DarkTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          <Area type="monotone" dataKey={dataKey} name={`${label} (${unit})`} stroke={color} strokeWidth={2}
            fill={`url(#grad-sl-${dataKey})`} dot={false} />
          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
            <AreaChart data={data}>
              <Area type="monotone" dataKey={dataKey} stroke={color} fill={fillColor} fillOpacity={0.2} dot={false} strokeWidth={1} />
            </AreaChart>
          </Brush>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Correlation Tooltip ─────────────────────────────────────────────────────

const CorrelationTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[200px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke }} className="text-sm">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SeaLevelsIcePage() {
  const [data, setData] = useState<GHGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIceYear, setActiveIceYear] = useState<string>("1979");
  const handleIceYearChange = useCallback((y: string) => setActiveIceYear(y), []);

  useEffect(() => {
    fetch('/api/climate/greenhouse-gases')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  // ─── Correlation datasets ──────────────────────────────────────────────────

  const tempSeaLevelData = useMemo(() => {
    if (!data?.temperature?.yearly || !data?.seaLevel?.yearly) return null;
    const slMap = new Map(data.seaLevel.yearly.map(s => [s.year, s.value]));
    return data.temperature.yearly
      .filter(t => slMap.has(t.year))
      .map(t => ({ year: t.year, temp: t.anomaly, seaLevel: slMap.get(t.year)! }));
  }, [data?.temperature, data?.seaLevel]);

  const iceSeaLevelData = useMemo(() => {
    if (!data?.arcticIce?.yearly || !data?.seaLevel?.yearly) return null;
    const slMap = new Map(data.seaLevel.yearly.map(s => [s.year, s.value]));
    return data.arcticIce.yearly
      .filter(i => slMap.has(i.year))
      .map(i => ({ year: i.year, ice: i.value, seaLevel: slMap.get(i.year)! }));
  }, [data?.arcticIce, data?.seaLevel]);

  const tempIceData = useMemo(() => {
    if (!data?.temperature?.yearly || !data?.arcticIce?.yearly) return null;
    const iceMap = new Map(data.arcticIce.yearly.map(i => [i.year, i.value]));
    return data.temperature.yearly
      .filter(t => iceMap.has(t.year))
      .map(t => ({ year: t.year, temp: t.anomaly, ice: iceMap.get(t.year)! }));
  }, [data?.temperature, data?.arcticIce]);

  const oceanSeaLevelData = useMemo(() => {
    if (!data?.oceanWarming?.yearly || !data?.seaLevel?.yearly) return null;
    const slMap = new Map(data.seaLevel.yearly.map(s => [s.year, s.value]));
    return data.oceanWarming.yearly
      .filter(o => slMap.has(o.year))
      .map(o => ({ year: o.year, ocean: o.value, seaLevel: slMap.get(o.year)! }));
  }, [data?.oceanWarming, data?.seaLevel]);

  const co2SeaLevelData = useMemo(() => {
    if (!data?.co2?.yearly || !data?.seaLevel?.yearly) return null;
    const slMap = new Map(data.seaLevel.yearly.map(s => [s.year, s.value]));
    return data.co2.yearly
      .filter(c => slMap.has(c.year))
      .map(c => ({ year: c.year, co2: c.value, seaLevel: slMap.get(c.year)! }));
  }, [data?.co2, data?.seaLevel]);

  // ─── Anomaly data aligned to ice map years ──────────────────────────────
  const iceYearAnomalies = useMemo(() => {
    if (!data) return null;
    const tempMap = new Map(data.temperature?.yearly.map(t => [t.year, t.anomaly]));
    const oceanMap = new Map(data.oceanWarming?.yearly.map(o => [o.year, o.value]));
    const slMap = new Map(data.seaLevel?.yearly.map(s => [s.year, s.value]));
    return ICE_YEARS.map(y => {
      const yr = Number(y);
      return {
        year: yr,
        temp: tempMap.get(yr) ?? null,
        ocean: oceanMap.get(yr) ?? null,
        seaLevel: slMap.get(yr) ?? null,
      };
    }).filter(d => d.temp !== null || d.ocean !== null || d.seaLevel !== null);
  }, [data]);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Hero ─────────────────────────────────────────────── */}
          <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border border-gray-800 p-4 md:p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] font-mono mb-4" style={{ background: 'linear-gradient(to right, #22d3ee, #14b8a6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Climate Change
            </p>
            <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide text-white leading-tight mb-4">
              Sea Levels{" "}
              <span style={{ background: 'linear-gradient(to right, #22d3ee, #14b8a6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                &amp; Ice
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
              Rising temperatures are melting polar ice and driving sea levels higher. As the planet warms, two forces push the oceans upward: thermal expansion of warming water and the vast quantities of meltwater from glaciers and ice sheets. This page tracks both, and shows how they&apos;re connected.
            </p>
          </div>

          {/* ─── Loading / Error ───────────────────────────────────── */}
          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-gray-800 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
              <p className="text-gray-400">Fetching live climate data...</p>
            </div>
          )}

          {error && !data && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-6 text-red-400 text-center">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* ─── Live Readings ────────────────────────────────── */}
              <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border border-gray-800 p-4 md:p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                  <h2 className="text-lg font-bold font-mono text-white">Current Readings</h2>
                  <span className="ml-auto text-xs text-gray-600">
                    Updated {new Date(data.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {data.seaLevel && (
                    <StatCard
                      label="Sea Level Rise"
                      value={`+${data.seaLevel.current.value.toFixed(0)}`}
                      unit="mm"
                      subtext={`Rising ${data.seaLevel.rate} since 1993`}
                      color="text-teal-400"
                    />
                  )}
                  {data.arcticIce && (
                    <StatCard
                      label="Arctic Sea Ice"
                      value={data.arcticIce.current.extent.toFixed(1)}
                      unit="M km²"
                      subtext={`${data.arcticIce.current.anomaly > 0 ? '+' : ''}${data.arcticIce.current.anomaly.toFixed(1)} vs average`}
                      color="text-cyan-400"
                    />
                  )}
                  {data.temperature && (
                    <StatCard
                      label="Temperature Anomaly"
                      value={`+${Math.abs(data.temperature.current.anomaly).toFixed(2)}`}
                      unit="°C"
                      subtext="vs 1951-1980 baseline"
                      color="text-orange-400"
                    />
                  )}
                  {data.oceanWarming && (
                    <StatCard
                      label={`Ocean Warming (${data.oceanWarming.current.year})`}
                      value={`+${data.oceanWarming.current.anomaly.toFixed(2)}`}
                      unit="°C"
                      subtext="Sea surface anomaly"
                      color="text-blue-400"
                    />
                  )}
                </div>
              </div>

              {/* ═══ ICE EXTENT + ANOMALY PANEL ═══ */}
              <SectionCard icon={<MapPin className="h-5 w-5 text-cyan-400" />} title="September Ice Extent: Arctic & Antarctic 1979 – 2024">
                <p className="text-sm text-gray-400 mb-4">
                  Every September the Arctic sea ice reaches its annual minimum while Antarctic ice nears its maximum. Press play to see how both poles have changed over 45 years — the Arctic has <span className="text-white font-medium">dramatically shrunk</span> from 7.2 to 4.3 million km², while Antarctic extent has also declined in recent years. The lighter the colour, the greater the extent. Drag to rotate each globe.
                </p>
                <ArcticIceMap onYearChange={handleIceYearChange} />

                {/* Combined anomaly chart for the same years */}
                {iceYearAnomalies && iceYearAnomalies.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                      Temperature &amp; Sea Level for the Same Years
                    </h3>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={iceYearAnomalies} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="temp" tick={{ fontSize: 11, fill: '#f59e0b' }} tickLine={false} axisLine={false} unit="°" />
                          <YAxis yAxisId="sl" orientation="right" tick={{ fontSize: 11, fill: '#14b8a6' }} tickLine={false} axisLine={false} unit="mm" />
                          <Tooltip content={<CorrelationTooltip />} />
                          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                          <ReferenceLine yAxisId="temp" y={0} stroke="#4B5563" strokeDasharray="3 3" />
                          {iceYearAnomalies.map((d) => (
                            String(d.year) === activeIceYear ? (
                              <ReferenceLine
                                key={d.year}
                                x={d.year}
                                yAxisId="temp"
                                stroke="#22d3ee"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                              />
                            ) : null
                          ))}
                          <Line yAxisId="temp" type="monotone" dataKey="temp" name="Air Temp Anomaly (°C)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                          <Line yAxisId="temp" type="monotone" dataKey="ocean" name="Ocean Temp Anomaly (°C)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                          <Line yAxisId="sl" type="monotone" dataKey="seaLevel" name="Sea Level (mm)" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-3">
                  Source: <a href="https://nsidc.org/data/g02135" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">NSIDC Sea Ice Index v4.0</a> — September monthly polygon shapefiles · NASA GISS · NOAA
                </p>
              </SectionCard>

              {/* ═══ HOW IT ALL CONNECTS ═══ */}
              <Divider icon={<Link2 className="h-5 w-5" />} title="How It All Connects" />

              {/* ── Temperature → Sea Level ── */}
              {tempSeaLevelData && tempSeaLevelData.length > 0 && (
                <SectionCard icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Warming Drives Rising Seas">
                  <p className="text-sm text-gray-400 mb-4">
                    Rising global temperatures are the root cause of sea level rise. Warmer air melts ice sheets and glaciers, adding water to the oceans. At the same time, warmer water <span className="text-white font-medium">expands</span> — thermal expansion accounts for roughly a third of observed sea level rise. This chart shows the tight correlation between temperature anomaly and sea level since satellite measurement began.
                  </p>
                  <SubSection title="Temperature anomaly (left axis) vs sea level change in mm (right axis)">
                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tempSeaLevelData} margin={CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="temp" tick={{ fontSize: 11, fill: '#f59e0b' }} tickLine={false} axisLine={false} unit="°" />
                          <YAxis yAxisId="sl" orientation="right" tick={{ fontSize: 11, fill: '#14b8a6' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CorrelationTooltip />} />
                          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                          <ReferenceLine yAxisId="temp" y={1.5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
                            label={{ position: 'insideTopLeft', value: 'Paris +1.5°C', fill: '#f59e0b', fontSize: 10, fontWeight: 600 } as any} />
                          <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp Anomaly (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                          <Line yAxisId="sl" type="monotone" dataKey="seaLevel" name="Sea Level (mm)" stroke="#14b8a6" strokeWidth={2} dot={false} />
                          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                            <LineChart data={tempSeaLevelData}>
                              <Line type="monotone" dataKey="seaLevel" stroke="#14b8a6" dot={false} strokeWidth={1} />
                            </LineChart>
                          </Brush>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SubSection>
                </SectionCard>
              )}

              {/* ── Ice → Sea Level ── */}
              {iceSeaLevelData && iceSeaLevelData.length > 0 && (
                <SectionCard icon={<Snowflake className="h-5 w-5 text-cyan-400" />} title="Melting Ice, Rising Seas">
                  <p className="text-sm text-gray-400 mb-4">
                    As Arctic sea ice extent declines, it signals broader ice loss across Greenland, Antarctica, and mountain glaciers — all of which contribute directly to sea level rise. While sea ice itself (floating on water) doesn&apos;t raise levels when it melts, its loss <span className="text-white font-medium">accelerates warming</span> through the ice-albedo feedback, driving further ice sheet melt from land-based glaciers.
                  </p>
                  <SubSection title="Arctic ice extent in M km² (left axis) vs sea level change in mm (right axis)">
                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={iceSeaLevelData} margin={CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="ice" tick={{ fontSize: 11, fill: '#22d3ee' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <YAxis yAxisId="sl" orientation="right" tick={{ fontSize: 11, fill: '#14b8a6' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CorrelationTooltip />} />
                          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                          <Line yAxisId="ice" type="monotone" dataKey="ice" name="Arctic Ice (M km²)" stroke="#22d3ee" strokeWidth={2} dot={false} />
                          <Line yAxisId="sl" type="monotone" dataKey="seaLevel" name="Sea Level (mm)" stroke="#14b8a6" strokeWidth={2} dot={false} />
                          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                            <LineChart data={iceSeaLevelData}>
                              <Line type="monotone" dataKey="seaLevel" stroke="#14b8a6" dot={false} strokeWidth={1} />
                            </LineChart>
                          </Brush>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SubSection>
                </SectionCard>
              )}

              {/* ── Temperature → Ice ── */}
              {tempIceData && tempIceData.length > 0 && (
                <SectionCard icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Warming Destroys Ice">
                  <p className="text-sm text-gray-400 mb-4">
                    The mechanism is straightforward: higher temperatures melt ice. This chart shows how rising global temperatures have driven a steady decline in Arctic sea ice extent — a trend that feeds on itself as exposed dark ocean absorbs more solar energy, amplifying the warming that caused the melt in the first place.
                  </p>
                  <SubSection title="Temperature anomaly (left axis) vs Arctic ice extent in M km² (right axis)">
                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tempIceData} margin={CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="temp" tick={{ fontSize: 11, fill: '#f59e0b' }} tickLine={false} axisLine={false} unit="°" />
                          <YAxis yAxisId="ice" orientation="right" tick={{ fontSize: 11, fill: '#22d3ee' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <Tooltip content={<CorrelationTooltip />} />
                          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                          <ReferenceLine yAxisId="temp" y={1.5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
                            label={{ position: 'insideTopLeft', value: 'Paris +1.5°C', fill: '#f59e0b', fontSize: 10, fontWeight: 600 } as any} />
                          <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp Anomaly (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                          <Line yAxisId="ice" type="monotone" dataKey="ice" name="Arctic Ice (M km²)" stroke="#22d3ee" strokeWidth={2} dot={false} />
                          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                            <LineChart data={tempIceData}>
                              <Line type="monotone" dataKey="temp" stroke="#f59e0b" dot={false} strokeWidth={1} />
                            </LineChart>
                          </Brush>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SubSection>
                </SectionCard>
              )}

              {/* ── Ocean Warming → Sea Level ── */}
              {oceanSeaLevelData && oceanSeaLevelData.length > 0 && (
                <SectionCard icon={<Waves className="h-5 w-5 text-blue-400" />} title="Warmer Oceans, Higher Seas">
                  <p className="text-sm text-gray-400 mb-4">
                    Oceans absorb over <span className="text-white font-medium">90% of excess heat</span> trapped by greenhouse gases. As ocean water warms, it physically expands — a process called <span className="text-white font-medium">thermal expansion</span> — pushing sea levels up even without any additional meltwater. This is the single largest contributor to observed sea level rise to date.
                  </p>
                  <SubSection title="Ocean surface anomaly (left axis) vs sea level change in mm (right axis)">
                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={oceanSeaLevelData} margin={CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="ocean" tick={{ fontSize: 11, fill: '#3b82f6' }} tickLine={false} axisLine={false} unit="°" />
                          <YAxis yAxisId="sl" orientation="right" tick={{ fontSize: 11, fill: '#14b8a6' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CorrelationTooltip />} />
                          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                          <Line yAxisId="ocean" type="monotone" dataKey="ocean" name="Ocean Anomaly (°C)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          <Line yAxisId="sl" type="monotone" dataKey="seaLevel" name="Sea Level (mm)" stroke="#14b8a6" strokeWidth={2} dot={false} />
                          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                            <LineChart data={oceanSeaLevelData}>
                              <Line type="monotone" dataKey="seaLevel" stroke="#14b8a6" dot={false} strokeWidth={1} />
                            </LineChart>
                          </Brush>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SubSection>
                </SectionCard>
              )}

              {/* ── CO₂ → Sea Level ── */}
              {co2SeaLevelData && co2SeaLevelData.length > 0 && (
                <SectionCard icon={<ArrowUp className="h-5 w-5 text-teal-400" />} title="Rising Carbon, Rising Seas">
                  <p className="text-sm text-gray-400 mb-4">
                    The chain of cause and effect begins with CO₂. Fossil fuel emissions trap heat, that heat warms oceans and melts ice, and both processes raise sea levels. Since satellite measurements began in 1993, global mean sea level has risen by over <span className="text-white font-medium">{data.seaLevel?.current.value.toFixed(0)} mm</span> — an accelerating trend with profound implications for coastal communities worldwide.
                  </p>
                  <SubSection title="CO₂ concentration (left axis) vs sea level change in mm (right axis)">
                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={co2SeaLevelData} margin={CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="co2" tick={{ fontSize: 11, fill: '#ef4444' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <YAxis yAxisId="sl" orientation="right" tick={{ fontSize: 11, fill: '#14b8a6' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CorrelationTooltip />} />
                          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                          <Line yAxisId="co2" type="monotone" dataKey="co2" name="CO₂ (ppm)" stroke="#ef4444" strokeWidth={2} dot={false} />
                          <Line yAxisId="sl" type="monotone" dataKey="seaLevel" name="Sea Level (mm)" stroke="#14b8a6" strokeWidth={2} dot={false} />
                          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                            <LineChart data={co2SeaLevelData}>
                              <Line type="monotone" dataKey="co2" stroke="#ef4444" dot={false} strokeWidth={1} />
                            </LineChart>
                          </Brush>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SubSection>
                </SectionCard>
              )}

              {/* ═══ INDIVIDUAL DATA SERIES ═══ */}

              {/* ── Sea Level ── */}
              {data.seaLevel && data.seaLevel.yearly.length > 0 && (
                <>
                  <Divider icon={<ArrowUp className="h-5 w-5" />} title="Global Sea Level" />
                  <SectionCard icon={<ArrowUp className="h-5 w-5 text-teal-400" />} title="Global Mean Sea Level">
                    <p className="text-sm text-gray-400 mb-4">
                      Satellite altimetry has tracked global mean sea level since 1993, revealing an accelerating rise. The current level is approximately <span className="text-white font-medium">+{data.seaLevel.current.value.toFixed(0)} mm</span> above the 1993 baseline, rising at <span className="text-white font-medium">{data.seaLevel.rate}</span>. At this pace, sea levels could rise by 0.3–1.0 metres by 2100, threatening hundreds of millions of people in low-lying coastal areas.
                    </p>
                    <SubSection title="Annual average sea level change (mm) — satellite era">
                      <SimpleYearlyChart
                        data={data.seaLevel.yearly}
                        dataKey="value"
                        label="Sea Level"
                        unit="mm"
                        color="#14b8a6"
                        fillColor="#14b8a6"
                      />
                    </SubSection>
                  </SectionCard>
                </>
              )}

              {/* ── Arctic Ice ── */}
              {data.arcticIce && data.arcticIce.yearly.length > 0 && (
                <>
                  <Divider icon={<Snowflake className="h-5 w-5" />} title="Arctic Sea Ice" />

                  <SectionCard icon={<Snowflake className="h-5 w-5 text-cyan-400" />} title="Arctic Sea Ice Extent">
                    <p className="text-sm text-gray-400 mb-4">
                      Arctic sea ice acts as a giant reflector, bouncing sunlight back into space. As it melts, the darker ocean absorbs more heat, accelerating warming in a dangerous feedback loop. Current extent is <span className="text-white font-medium">{data.arcticIce.current.extent.toFixed(1)} million km²</span>. Scientists project ice-free Arctic summers could occur within the next few decades.
                    </p>
                    <SubSection title="Annual average sea ice extent (million km²)">
                      <SimpleYearlyChart
                        data={data.arcticIce.yearly}
                        dataKey="value"
                        label="Sea Ice Extent"
                        unit="M km²"
                        color="#22d3ee"
                        fillColor="#22d3ee"
                      />
                    </SubSection>
                  </SectionCard>
                </>
              )}

              {/* ─── Attribution ──────────────────────────────────── */}
              <div className="bg-gray-950/90 backdrop-blur-md p-5 rounded-xl border border-gray-800 text-sm text-gray-400 space-y-1.5">
                <p className="font-semibold text-gray-300">Data sources &amp; attribution:</p>
                <p>• Sea level: <a href="https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NOAA Laboratory for Satellite Altimetry</a> (1993-present)</p>
                <p>• Arctic sea ice: <a href="https://nsidc.org/arcticseaicenews/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NSIDC</a> / NOAA via <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">global-warming.org</a></p>
                <p>• Arctic ice extent map: <a href="https://nsidc.org/data/g02135" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NSIDC Sea Ice Index v4.0</a> — September monthly shapefiles (1979-2024)</p>
                <p>• Temperature anomaly: <a href="https://data.giss.nasa.gov/gistemp/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NASA GISS</a> / <a href="https://www.ncei.noaa.gov/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NOAA</a> via <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">global-warming.org</a></p>
                <p>• Ocean warming: <a href="https://www.ncei.noaa.gov/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NOAA</a> via <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">global-warming.org</a></p>
                <p>• CO₂: <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NOAA Global Monitoring Laboratory</a> — Mauna Loa Observatory</p>
                <p className="text-xs text-gray-600 pt-2">
                  Data refreshed automatically every 12 hours. Last updated: {new Date(data.fetchedAt).toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
