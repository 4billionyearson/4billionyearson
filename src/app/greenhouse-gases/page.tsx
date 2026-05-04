"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush,
} from 'recharts';
import { Loader2, Activity, Wind, Thermometer, Snowflake, Waves, TrendingUp, Link2, BookOpen } from 'lucide-react';
import { StaticFAQPanel, FaqJsonLd } from '@/app/_components/seo/StaticFAQPanel';
import { GREENHOUSE_GASES_FAQ } from './greenhouse-gases-faq';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MonthlyPoint { date: string; value: number; trend: number }
interface YearlyPoint { year: number; value: number }

interface GasData {
  current: { value: number; trend: number; date: string };
  monthly: MonthlyPoint[];
  yearly: YearlyPoint[];
  preindustrial: number;
  unit: string;
}

interface TempPoint { year: number; anomaly: number }

interface GHGData {
  co2: GasData | null;
  methane: GasData | null;
  n2o: GasData | null;
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
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-xl font-bold font-mono text-white mb-5 flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
        {icon}
        <span className="min-w-0 flex-1">{title}</span>
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
      <div className="h-px bg-[#D0A65E]/30 flex-1" />
      <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg [&>svg]:shrink-0">
        {icon}
        <span>{title}</span>
      </h2>
      <div className="h-px bg-[#D0A65E]/30 flex-1" />
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, subtext, color }: {
  label: string; value: string; unit: string; subtext?: string; color: string;
}) {
  return (
    <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700/50">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  );
}

// ─── Gas Chart (yearly line + area with preindustrial reference) ─────────────

function GasYearlyChart({ data, label, unit, color, fillColor, preindustrial, preindustrialLabel }: {
  data: YearlyPoint[];
  label: string;
  unit: string;
  color: string;
  fillColor: string;
  preindustrial?: number;
  preindustrialLabel?: string;
}) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false}
            domain={['auto', 'auto']} />
          <Tooltip content={<DarkTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          {preindustrial != null && (
            <ReferenceLine y={preindustrial} stroke="#7A6E63" strokeDasharray="6 3" strokeWidth={1.5}
              label={{ position: 'insideTopLeft', value: preindustrialLabel || `Pre-industrial: ${preindustrial}`, fill: '#7A6E63', fontSize: 11, fontWeight: 600 } as any} />
          )}
          <Area type="monotone" dataKey="value" name={`${label} (${unit})`} stroke={color} strokeWidth={2}
            fill={`url(#grad-${label})`} dot={false} />
          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
            <AreaChart data={data}>
              <Area type="monotone" dataKey="value" stroke={color} fill={fillColor} fillOpacity={0.2} dot={false} strokeWidth={1} />
            </AreaChart>
          </Brush>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Temperature Anomaly Chart ───────────────────────────────────────────────

function TempAnomalyChart({ data }: { data: TempPoint[] }) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="grad-temp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="°" />
          <Tooltip content={<DarkTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          <ReferenceLine y={0} stroke="#7A6E63" />
          <ReferenceLine y={1.5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
            label={{ position: 'insideTopLeft', value: 'Paris +1.5°C', fill: '#f59e0b', fontSize: 11, fontWeight: 600 } as any} />
          <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
            label={{ position: 'insideBottomLeft', value: 'Critical +2.0°C', fill: '#ef4444', fontSize: 11, fontWeight: 600 } as any} />
          <Area type="monotone" dataKey="anomaly" name="Temperature Anomaly (°C)" stroke="#ef4444" strokeWidth={2}
            fill="url(#grad-temp)" dot={false} />
          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
            <LineChart data={data}>
              <Line type="monotone" dataKey="anomaly" stroke="#ef4444" dot={false} strokeWidth={1} />
            </LineChart>
          </Brush>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Arctic / Ocean Chart ────────────────────────────────────────────────────

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
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
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
            fill={`url(#grad-${dataKey})`} dot={false} />
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

// ─── Correlation Tooltip (shows multiple series with their actual units) ─────

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

// ─── Overview Section (combined cause & effect charts) ────────────────────────

function OverviewSection({ data }: { data: GHGData }) {
  // Merge datasets by year for combined views
  const normalisedGasData = useMemo(() => {
    const map = new Map<number, any>();
    if (data.co2?.yearly) {
      for (const p of data.co2.yearly) {
        const row = map.get(p.year) || { year: p.year };
        row.co2Pct = ((p.value - 280) / 280) * 100;
        map.set(p.year, row);
      }
    }
    if (data.methane?.yearly) {
      for (const p of data.methane.yearly) {
        const row = map.get(p.year) || { year: p.year };
        row.ch4Pct = ((p.value - 722) / 722) * 100;
        map.set(p.year, row);
      }
    }
    if (data.n2o?.yearly) {
      for (const p of data.n2o.yearly) {
        const row = map.get(p.year) || { year: p.year };
        row.n2oPct = ((p.value - 270) / 270) * 100;
        map.set(p.year, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }, [data.co2, data.methane, data.n2o]);

  const co2TempData = useMemo(() => {
    if (!data.co2?.yearly || !data.temperature?.yearly) return null;
    const tempMap = new Map(data.temperature.yearly.map(t => [t.year, t.anomaly]));
    return data.co2.yearly
      .filter(c => tempMap.has(c.year))
      .map(c => ({ year: c.year, co2: c.value, temp: tempMap.get(c.year)! }));
  }, [data.co2, data.temperature]);

  const co2IceData = useMemo(() => {
    if (!data.co2?.yearly || !data.arcticIce?.yearly) return null;
    const iceMap = new Map(data.arcticIce.yearly.map(i => [i.year, i.value]));
    return data.co2.yearly
      .filter(c => iceMap.has(c.year))
      .map(c => ({ year: c.year, co2: c.value, ice: iceMap.get(c.year)! }));
  }, [data.co2, data.arcticIce]);

  const tempOceanData = useMemo(() => {
    if (!data.temperature?.yearly || !data.oceanWarming?.yearly) return null;
    const oceanMap = new Map(data.oceanWarming.yearly.map(o => [o.year, o.value]));
    return data.temperature.yearly
      .filter(t => oceanMap.has(t.year))
      .map(t => ({ year: t.year, landTemp: t.anomaly, oceanTemp: oceanMap.get(t.year)! }));
  }, [data.temperature, data.oceanWarming]);

  const hasAnyData = normalisedGasData.length > 0 || co2TempData || co2IceData || tempOceanData;
  if (!hasAnyData) return null;

  return (
    <>
      <Divider icon={<Link2 className="h-5 w-5" />} title="Overview" />

      {/* ── CO₂ vs Temperature ── */}
      {co2TempData && co2TempData.length > 0 && (
        <SectionCard icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="CO₂ & Global Temperature">
          <SubSection title="CO₂ concentration (left axis) vs temperature anomaly (right axis)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={co2TempData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="co2" tick={{ fontSize: 11, fill: '#ef4444' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 11, fill: '#f59e0b' }} tickLine={false} axisLine={false} unit="°" />
                  <Tooltip content={<CorrelationTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <ReferenceLine yAxisId="co2" y={350} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ position: 'insideBottomRight', value: 'CO₂ safe boundary: 350 ppm', fill: '#ef4444', fontSize: 10, fontWeight: 600, dy: 17} as any} />
                  <ReferenceLine yAxisId="co2" y={280} stroke="#7A6E63" strokeDasharray="6 3" strokeWidth={1}
                    label={{ position: 'insideBottomRight', value: 'Pre-industrial CO₂: 280 ppm', fill: '#7A6E63', fontSize: 10 } as any} />
                  <ReferenceLine yAxisId="temp" y={1.5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ position: 'insideTopLeft', value: 'Paris +1.5°C', fill: '#f59e0b', fontSize: 10, fontWeight: 600 } as any} />
                  <ReferenceLine yAxisId="temp" y={2.0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ position: 'insideBottomLeft', value: 'Critical +2.0°C', fill: '#dc2626', fontSize: 10, fontWeight: 600 } as any} />
                  <Line yAxisId="co2" type="monotone" dataKey="co2" name="CO₂ (ppm)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp Anomaly (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={co2TempData}>
                      <Line type="monotone" dataKey="co2" stroke="#ef4444" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
          <p className="text-sm text-gray-400 mt-3">
            As CO₂ rises, global temperatures track upward in near-lockstep – a correlation that holds across every timescale. Sources:{" "}
            <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA GML</a>{" "}(CO₂) ·{" "}
            <a href="https://data.giss.nasa.gov/gistemp/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NASA GISS</a>{" "}/ NOAA (temperature).
          </p>
        </SectionCard>
      )}

      {/* ── All Gases Normalised ── */}
      {normalisedGasData.length > 0 && (
        <SectionCard icon={<TrendingUp className="h-5 w-5 text-rose-400" />} title="All Greenhouse Gases – Percentage Rise">
          <SubSection title="% above pre-industrial level – drag slider to zoom">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={normalisedGasData} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="grad-co2Pct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-ch4Pct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-n2oPct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<CorrelationTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <ReferenceLine y={0} stroke="#7A6E63" strokeDasharray="3 3"
                    label={{ position: 'insideBottomLeft', value: 'Pre-industrial level', fill: '#7A6E63', fontSize: 10 } as any} />
                  <ReferenceLine y={((350 - 280) / 280) * 100} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ position: 'insideTopLeft', value: 'CO₂ safe boundary (350 ppm ≈ 25%)', fill: '#ef4444', fontSize: 10, fontWeight: 600, dy: -17 } as any} />
                  <Area type="monotone" dataKey="co2Pct" name="CO₂ (% above 280 ppm)" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls fill="url(#grad-co2Pct)" />
                  <Area type="monotone" dataKey="ch4Pct" name="CH₄ (% above 722 ppb)" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls fill="url(#grad-ch4Pct)" />
                  <Area type="monotone" dataKey="n2oPct" name="N₂O (% above 270 ppb)" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls fill="url(#grad-n2oPct)" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={normalisedGasData}>
                      <Area type="monotone" dataKey="co2Pct" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
          <p className="text-sm text-gray-400 mt-3">
            All three gases as percentage increase above pre-industrial levels, showing how each amplifies the others&apos; warming effect. Sources:{" "}
            <a href="https://gml.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA Global Monitoring Laboratory</a>{" "}via{" "}
            <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">global-warming.org</a>.
          </p>
        </SectionCard>
      )}

      {/* ── Temperature + Ocean ── */}
      {tempOceanData && tempOceanData.length > 0 && (
        <SectionCard icon={<Waves className="h-5 w-5 text-blue-400" />} title="Global Warming – Land & Sea">
          <SubSection title="Temperature anomaly: land (NASA/NOAA) vs ocean surface (NOAA)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempOceanData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="°" />
                  <Tooltip content={<CorrelationTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <ReferenceLine y={0} stroke="#7A6E63" strokeDasharray="3 3"
                    label={{ position: 'insideBottomLeft', value: 'Baseline (0°C)', fill: '#7A6E63', fontSize: 10 } as any} />
                  <ReferenceLine y={1.5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ position: 'insideTopLeft', value: 'Paris +1.5°C limit', fill: '#f59e0b', fontSize: 10, fontWeight: 600 } as any} />
                  <ReferenceLine y={2.0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ position: 'insideBottomLeft', value: 'Critical +2.0°C limit', fill: '#dc2626', fontSize: 10, fontWeight: 600 } as any} />
                  <Line type="monotone" dataKey="landTemp" name="Land Temp Anomaly (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="oceanTemp" name="Ocean Surface Anomaly (°C)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={tempOceanData}>
                      <Line type="monotone" dataKey="landTemp" stroke="#ef4444" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
          <p className="text-sm text-gray-400 mt-3">
            The atmosphere and oceans are warming in tandem – confirming this is a whole-Earth system shift, not a local phenomenon. Sources:{" "}
            <a href="https://data.giss.nasa.gov/gistemp/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NASA GISS</a>{" "}/ <a href="https://www.ncei.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA</a>{" "}via{" "}
            <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">global-warming.org</a>.
          </p>
        </SectionCard>
      )}

      {/* ── CO₂ vs Arctic Ice ── */}
      {co2IceData && co2IceData.length > 0 && (
        <SectionCard icon={<Snowflake className="h-5 w-5 text-cyan-400" />} title="Rising Carbon, Vanishing Ice">
          <SubSection title="CO₂ concentration (left axis) vs Arctic sea ice extent (right axis)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={co2IceData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="co2" tick={{ fontSize: 11, fill: '#ef4444' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="ice" orientation="right" tick={{ fontSize: 11, fill: '#22d3ee' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CorrelationTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <ReferenceLine yAxisId="co2" y={350} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ position: 'insideBottom', value: 'CO₂ safe boundary: 350 ppm', fill: '#ef4444', fontSize: 10, fontWeight: 600, dy: 17} as any} />
                  <ReferenceLine yAxisId="co2" y={280} stroke="#7A6E63" strokeDasharray="6 3" strokeWidth={1}
                    label={{ position: 'insideBottom', value: 'Pre-industrial: 280 ppm', fill: '#7A6E63', fontSize: 10 } as any} />
                  <Line yAxisId="co2" type="monotone" dataKey="co2" name="CO₂ (ppm)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line yAxisId="ice" type="monotone" dataKey="ice" name="Arctic Ice (M km²)" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={co2IceData}>
                      <Line type="monotone" dataKey="co2" stroke="#ef4444" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
          <p className="text-sm text-gray-400 mt-3">
            As CO₂ climbs, Arctic ice drops – lost ice exposes dark ocean, absorbing more heat and accelerating warming further. Sources:{" "}
            <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA GML</a>{" "}(CO₂) ·{" "}
            <a href="https://nsidc.org/arcticseaicenews/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NSIDC</a>{" "}via{" "}
            <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">global-warming.org</a>.
          </p>
        </SectionCard>
      )}


    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function GreenhouseGasesPage() {
  const [data, setData] = useState<GHGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/climate/greenhouse-gases')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const pctAbovePreindustrial = (current: number, preindustrial: number) => {
    return ((current - preindustrial) / preindustrial * 100).toFixed(0);
  };

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Hero ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
                Greenhouse Gases
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Live atmospheric concentrations of the key greenhouse gases driving climate change – carbon dioxide, methane, and nitrous oxide – along with their historical trends and climate impacts.
              </p>
            </div>
          </div>

          {/* ─── Loading / Error ───────────────────────────────────── */}
          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#D0A65E] flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
              <p className="text-gray-400">Fetching live greenhouse gas data...</p>
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
              <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D0A65E] p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                  <h2 className="text-lg font-bold font-mono text-white">Current Readings</h2>
                  <span className="ml-auto text-xs text-gray-400">
                    Updated {new Date(data.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.co2 && (
                    <StatCard
                      label="Carbon Dioxide (CO₂)"
                      value={data.co2.current.value.toFixed(1)}
                      unit="ppm"
                      subtext={`${pctAbovePreindustrial(data.co2.current.value, 280)}% above pre-industrial`}
                      color="text-red-400"
                    />
                  )}
                  {data.methane && (
                    <StatCard
                      label="Methane (CH₄)"
                      value={data.methane.current.value.toFixed(0)}
                      unit="ppb"
                      subtext={`${pctAbovePreindustrial(data.methane.current.value, 722)}% above pre-industrial`}
                      color="text-amber-400"
                    />
                  )}
                  {data.n2o && (
                    <StatCard
                      label="Nitrous Oxide (N₂O)"
                      value={data.n2o.current.value.toFixed(1)}
                      unit="ppb"
                      subtext={`${pctAbovePreindustrial(data.n2o.current.value, 270)}% above pre-industrial`}
                      color="text-purple-400"
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
                  {data.arcticIce && (
                    <StatCard
                      label="Arctic Sea Ice"
                      value={data.arcticIce.current.extent.toFixed(1)}
                      unit="M km²"
                      subtext={`${data.arcticIce.current.anomaly > 0 ? '+' : ''}${data.arcticIce.current.anomaly.toFixed(1)} vs average`}
                      color="text-cyan-400"
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

              {/* ═══ OVERVIEW: CAUSE & EFFECT ═══ */}
              <OverviewSection data={data} />

              {/* ═══ CO₂ ═══ */}
              {data.co2 && data.co2.yearly.length > 0 && (
                <>
                  <Divider icon={<TrendingUp className="h-5 w-5" />} title="Carbon Dioxide (CO₂)" />
                  <SectionCard icon={<TrendingUp className="h-5 w-5 text-red-400" />} title="Atmospheric CO₂ Concentration">
                    <SubSection title="Yearly average CO₂ concentration (ppm) – drag slider to zoom">
                      <GasYearlyChart
                        data={data.co2.yearly}
                        label="CO₂"
                        unit="ppm"
                        color="#ef4444"
                        fillColor="#ef4444"
                        preindustrial={280}
                        preindustrialLabel="Pre-industrial: 280 ppm"
                      />
                    </SubSection>
                    <p className="text-sm text-gray-400 mt-3">
                      CO₂ is the primary driver of climate change, responsible for about two-thirds of total warming. Continuous measurements from Mauna Loa date back to 1958. Source:{" "}
                      <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA Global Monitoring Laboratory</a>{" "}(Mauna Loa Observatory).
                    </p>
                  </SectionCard>
                </>
              )}

              {/* ═══ Methane ═══ */}
              {data.methane && data.methane.yearly.length > 0 && (
                <>
                  <Divider icon={<Wind className="h-5 w-5" />} title="Methane (CH₄)" />
                  <SectionCard icon={<Wind className="h-5 w-5 text-amber-400" />} title="Atmospheric Methane Concentration">
                    <SubSection title="Yearly average methane concentration (ppb) – drag slider to zoom">
                      <GasYearlyChart
                        data={data.methane.yearly}
                        label="CH₄"
                        unit="ppb"
                        color="#f59e0b"
                        fillColor="#f59e0b"
                        preindustrial={722}
                        preindustrialLabel="Pre-industrial: 722 ppb"
                      />
                    </SubSection>
                    <p className="text-sm text-gray-400 mt-3">
                      Methane is over 80× more potent than CO₂ over 20 years. Major sources include agriculture, fossil fuel extraction, and wetlands. Source:{" "}
                      <a href="https://gml.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA GML</a>{" "}via{" "}
                      <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">global-warming.org</a>.
                    </p>
                  </SectionCard>
                </>
              )}

              {/* ═══ N₂O ═══ */}
              {data.n2o && data.n2o.yearly.length > 0 && (
                <>
                  <Divider icon={<Wind className="h-5 w-5" />} title="Nitrous Oxide (N₂O)" />
                  <SectionCard icon={<Wind className="h-5 w-5 text-purple-400" />} title="Atmospheric Nitrous Oxide Concentration">
                    <SubSection title="Yearly average N₂O concentration (ppb) – drag slider to zoom">
                      <GasYearlyChart
                        data={data.n2o.yearly}
                        label="N₂O"
                        unit="ppb"
                        color="#a855f7"
                        fillColor="#a855f7"
                        preindustrial={270}
                        preindustrialLabel="Pre-industrial: 270 ppb"
                      />
                    </SubSection>
                    <p className="text-sm text-gray-400 mt-3">
                      N₂O has nearly 300× the warming potential of CO₂ over 100 years and also depletes the ozone layer. The primary source is agricultural fertiliser. Source:{" "}
                      <a href="https://gml.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA GML</a>{" "}via{" "}
                      <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">global-warming.org</a>.
                    </p>
                  </SectionCard>
                </>
              )}

              {/* ═══ Temperature ═══ */}
              {data.temperature && data.temperature.yearly.length > 0 && (
                <>
                  <Divider icon={<Thermometer className="h-5 w-5" />} title="Global Temperature" />
                  <SectionCard icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Global Temperature Anomaly">
                    <SubSection title="Annual average temperature anomaly (°C)">
                      <TempAnomalyChart data={data.temperature.yearly} />
                    </SubSection>
                    <p className="text-sm text-gray-400 mt-3">
                      The cumulative effect of rising greenhouse gases. The Paris Agreement aims to limit warming to 1.5°C, with 2.0°C as an absolute ceiling. Source:{" "}
                      <a href="https://data.giss.nasa.gov/gistemp/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NASA GISS</a>{" "}/ <a href="https://www.ncei.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA</a>{" "}via{" "}
                      <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">global-warming.org</a>.
                    </p>
                  </SectionCard>
                </>
              )}

              {/* ═══ Arctic Ice ═══ */}
              {data.arcticIce && data.arcticIce.yearly.length > 0 && (
                <>
                  <Divider icon={<Snowflake className="h-5 w-5" />} title="Arctic Sea Ice" />
                  <SectionCard icon={<Snowflake className="h-5 w-5 text-cyan-400" />} title="Arctic Sea Ice Extent">
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
                    <p className="text-sm text-gray-400 mt-3">
                      Arctic ice reflects sunlight back into space. As it melts, darker ocean absorbs more heat, accelerating warming in a feedback loop. Source:{" "}
                      <a href="https://nsidc.org/arcticseaicenews/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NSIDC</a>{" "}/ NOAA via{" "}
                      <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">global-warming.org</a>.
                    </p>
                  </SectionCard>
                </>
              )}

              {/* ═══ Ocean Warming ═══ */}
              {data.oceanWarming && data.oceanWarming.yearly.length > 0 && (
                <>
                  <Divider icon={<Waves className="h-5 w-5" />} title="Ocean Warming" />
                  <SectionCard icon={<Waves className="h-5 w-5 text-blue-400" />} title="Ocean Surface Temperature Anomaly">
                    <SubSection title="Annual ocean surface temperature anomaly (°C)">
                      <SimpleYearlyChart
                        data={data.oceanWarming.yearly}
                        dataKey="value"
                        label="Ocean Anomaly"
                        unit="°C"
                        color="#3b82f6"
                        fillColor="#3b82f6"
                      />
                    </SubSection>
                    <p className="text-sm text-gray-400 mt-3">
                      Oceans absorb over 90% of excess heat trapped by greenhouse gases, driving coral bleaching, sea-level rise, and more intense storms. Source:{" "}
                      <a href="https://www.ncei.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">NOAA</a>{" "}via{" "}
                      <a href="https://global-warming.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">global-warming.org</a>.
                    </p>
                  </SectionCard>
                </>
              )}
            </>
          )}

          {/* Frequently Asked Questions — always rendered for AI / non-JS crawlers. */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
            <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg [&>svg]:shrink-0">
              <BookOpen className="h-5 w-5" />
              <span>Frequently Asked Questions</span>
            </h2>
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
          </div>
          <StaticFAQPanel headingId="greenhouse-gases-faq-heading" qa={GREENHOUSE_GASES_FAQ} />
          <FaqJsonLd qa={GREENHOUSE_GASES_FAQ} />
        </div>
      </div>
    </main>
  );
}
