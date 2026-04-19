"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush, Cell,
} from 'recharts';
import { Loader2, Thermometer, Droplets, Sun, Snowflake, CloudRain, TrendingUp, Link2 } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface YearlyPoint { year: number; value?: number; avgTemp?: number; rollingAvg?: number }
interface MonthlyComparison {
  monthLabel: string; month: number; year: number;
  recent?: number | null; recentTemp?: number | null;
  historicAvg: number | null; diff: number | null;
}
interface PrecipPoint { year: number; value?: number; rollingAvg?: number }

interface ProfileData {
  slug: string;
  name: string;
  type: string;
  keyStats: {
    latestTemp?: string;
    tempTrend?: string;
    warmestYear?: string;
    dataRange?: string;
    latestPrecip?: string;
  };
  countryData?: {
    yearlyData: YearlyPoint[];
    monthlyComparison: MonthlyComparison[];
    precipYearly?: PrecipPoint[];
    dateRange: string;
  };
  usStateData?: {
    state: string;
    paramData: Record<string, {
      label: string;
      units: string;
      yearly: YearlyPoint[];
      monthlyComparison: MonthlyComparison[];
    }>;
  };
  ukRegionData?: {
    region: string;
    varData: Record<string, {
      label: string;
      units: string;
      yearly: YearlyPoint[];
      monthlyComparison: MonthlyComparison[];
    }>;
    attribution: string;
  };
  lastUpdated: string;
  source?: string;
}

// ─── Chart config ────────────────────────────────────────────────────────────

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;

// ─── Shared components ──────────────────────────────────────────────────────

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

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-xl font-bold font-mono text-white mb-5 flex items-center gap-2 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Divider({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="h-px bg-[#D0A65E]/30 flex-1" />
      <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg">
        {icon} {title}
      </h2>
      <div className="h-px bg-[#D0A65E]/30 flex-1" />
    </div>
  );
}

function StatCard({ label, value, unit, subtext, color }: {
  label: string; value: string; unit?: string; subtext?: string; color: string;
}) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  );
}

// ─── Temperature Yearly Chart ───────────────────────────────────────────────

function TempYearlyChart({ data, valueKey, label }: {
  data: YearlyPoint[];
  valueKey: 'value' | 'avgTemp';
  label: string;
}) {
  const startIdx = Math.max(0, data.length - 50);
  return (
    <div className="h-[300px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip content={<DarkTooltip />} />
          <Legend />
          <Area type="monotone" dataKey={valueKey} name={label} stroke="#ef4444" fill="url(#tempGrad)" strokeWidth={1.5} />
          <Line type="monotone" dataKey="rollingAvg" name="10-yr Average" stroke="#fbbf24" strokeWidth={2} dot={false} />
          <Brush dataKey="year" height={BRUSH_HEIGHT} fill="#1f2937" stroke="#4b5563" startIndex={startIdx} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Monthly Comparison Bar Chart ───────────────────────────────────────────

function MonthlyComparisonChart({ data, label, unit }: {
  data: MonthlyComparison[];
  label: string;
  unit: string;
}) {
  const compData = data.map(d => ({
    name: d.monthLabel,
    diff: d.diff,
    recent: d.recent ?? d.recentTemp ?? null,
    baseline: d.historicAvg,
  }));

  return (
    <div className="h-[280px] md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={compData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip content={<DarkTooltip />} />
          <Legend />
          <Bar dataKey="diff" name={`${label} Anomaly (${unit})`} radius={[4, 4, 0, 0]}>
            {compData.map((entry, i) => (
              <Cell key={i} fill={(entry.diff ?? 0) >= 0 ? '#ef4444' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Precipitation Chart ────────────────────────────────────────────────────

function PrecipChart({ data, label }: { data: PrecipPoint[]; label: string }) {
  const startIdx = Math.max(0, data.length - 50);
  return (
    <div className="h-[300px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="precipGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip content={<DarkTooltip />} />
          <Legend />
          <Area type="monotone" dataKey="value" name={label} stroke="#3b82f6" fill="url(#precipGrad)" strokeWidth={1.5} />
          <Line type="monotone" dataKey="rollingAvg" name="10-yr Average" stroke="#fbbf24" strokeWidth={2} dot={false} />
          <Brush dataKey="year" height={BRUSH_HEIGHT} fill="#1f2937" stroke="#4b5563" startIndex={startIdx} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── UK Variable Chart (Met Office) ─────────────────────────────────────────

const UK_VAR_CONFIG: Record<string, { color: string; icon: React.ReactNode; isSumVar: boolean }> = {
  Tmean: { color: '#ef4444', icon: <Thermometer className="h-5 w-5 text-red-400" />, isSumVar: false },
  Tmax: { color: '#f97316', icon: <Thermometer className="h-5 w-5 text-orange-400" />, isSumVar: false },
  Tmin: { color: '#3b82f6', icon: <Thermometer className="h-5 w-5 text-blue-400" />, isSumVar: false },
  Rainfall: { color: '#3b82f6', icon: <CloudRain className="h-5 w-5 text-blue-400" />, isSumVar: true },
  Sunshine: { color: '#fbbf24', icon: <Sun className="h-5 w-5 text-amber-400" />, isSumVar: true },
  AirFrost: { color: '#a5b4fc', icon: <Snowflake className="h-5 w-5 text-indigo-300" />, isSumVar: true },
  Raindays1mm: { color: '#60a5fa', icon: <Droplets className="h-5 w-5 text-blue-400" />, isSumVar: true },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ClimateProfile({ slug, region }: { slug: string; region: ClimateRegion }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/climate/profile/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load data`);
        return res.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    // Fetch Gemini summary (non-blocking)
    fetch(`/api/climate/summary/${slug}`)
      .then(res => res.ok ? res.json() : null)
      .then(d => { if (d?.summary) setSummary(d.summary); })
      .catch(() => {});
  }, [slug]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-14">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/climate" className="hover:text-gray-300">Climate Profiles</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-300">{region.name}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">{region.emoji}</span>
            <span className="bg-gradient-to-r from-[#D0A65E] to-[#E8C97A] bg-clip-text text-transparent">
              {region.name}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">{region.tagline}</p>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <span className="ml-3 text-gray-400">Loading climate data...</span>
          </div>
        )}
        {error && (
          <div className="text-center py-32">
            <p className="text-red-400 mb-2">Failed to load data</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Key Stats */}
            {data.keyStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {data.keyStats.latestTemp && (
                  <StatCard label="Latest Avg. Temp" value={data.keyStats.latestTemp} color="text-red-400" />
                )}
                {data.keyStats.tempTrend && (
                  <StatCard label="Temperature Trend" value={data.keyStats.tempTrend} color="text-amber-400" />
                )}
                {data.keyStats.warmestYear && (
                  <StatCard label="Warmest Year" value={data.keyStats.warmestYear} color="text-orange-400" />
                )}
                {data.keyStats.dataRange && (
                  <StatCard label="Data Coverage" value={data.keyStats.dataRange} color="text-sky-400" />
                )}
              </div>
            )}

            {/* AI-generated narrative or fallback crawlable summary */}
            <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 mb-8">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">
                {summary ? 'Monthly Climate Update' : 'Data Summary'}
              </h2>
              {summary ? (
                <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                  {summary.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                  <p className="text-gray-600 text-xs mt-3 italic">Generated by Gemini from the latest data</p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm leading-relaxed">
                  {buildTextSummary(region, data)}
                </p>
              )}
            </div>

            {/* Country charts */}
            {data.countryData && <CountryCharts data={data.countryData} name={region.name} />}

            {/* US State charts */}
            {data.usStateData && <USStateCharts data={data.usStateData} />}

            {/* UK Region charts */}
            {data.ukRegionData && <UKRegionCharts data={data.ukRegionData} />}

            {/* Related links */}
            <Divider icon={<Link2 className="h-5 w-5" />} title="Explore More" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <RelatedLink href="/climate-dashboard" label="Climate Dashboard" desc="Interactive global climate data" />
              <RelatedLink href="/emissions" label="CO₂ Emissions" desc="Global and per-country emissions" />
              <RelatedLink href="/greenhouse-gases" label="Greenhouse Gases" desc="CO₂, methane, and N₂O levels" />
              <RelatedLink href="/sea-levels-ice" label="Sea Levels & Ice" desc="Arctic ice and sea-level rise" />
              <RelatedLink href="/extreme-weather" label="Extreme Weather" desc="Live disaster and weather alerts" />
              <RelatedLink href="/planetary-boundaries" label="Planetary Boundaries" desc="The nine factors of stability" />
            </div>

            {/* Source attribution */}
            <div className="mt-8 text-xs text-gray-600 space-y-1">
              <p>
                Last updated: {data.lastUpdated} · Source: {data.source === 'cache' ? 'cached' : 'live'}
              </p>
              {data.ukRegionData?.attribution && <p>{data.ukRegionData.attribution}</p>}
              <p>
                Data from{' '}
                <a href="https://ourworldindata.org" className="text-gray-500 hover:text-gray-400" target="_blank" rel="noopener noreferrer">OWID</a>,{' '}
                <a href="https://www.ncei.noaa.gov" className="text-gray-500 hover:text-gray-400" target="_blank" rel="noopener noreferrer">NOAA</a>,{' '}
                <a href="https://www.metoffice.gov.uk" className="text-gray-500 hover:text-gray-400" target="_blank" rel="noopener noreferrer">Met Office</a>
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ─── Country Charts ─────────────────────────────────────────────────────────

function CountryCharts({ data, name }: { data: NonNullable<ProfileData['countryData']>; name: string }) {
  return (
    <div className="space-y-6">
      <SectionCard icon={<Thermometer className="text-red-400" />} title={`${name} Temperature History`}>
        <TempYearlyChart data={data.yearlyData} valueKey="avgTemp" label="Mean Temperature (°C)" />
      </SectionCard>

      {data.monthlyComparison?.length > 0 && (
        <SectionCard icon={<TrendingUp className="text-amber-400" />} title="Monthly Temperature Anomalies">
          <p className="text-xs text-gray-500 mb-3">Difference from 1961–1990 monthly average</p>
          <MonthlyComparisonChart data={data.monthlyComparison} label="Temperature" unit="°C" />
        </SectionCard>
      )}

      {data.precipYearly && data.precipYearly.length > 0 && (
        <SectionCard icon={<Droplets className="text-blue-400" />} title={`${name} Annual Precipitation`}>
          <PrecipChart data={data.precipYearly} label="Precipitation (mm)" />
        </SectionCard>
      )}
    </div>
  );
}

// ─── US State Charts ────────────────────────────────────────────────────────

function USStateCharts({ data }: { data: NonNullable<ProfileData['usStateData']> }) {
  const params = data.paramData;
  return (
    <div className="space-y-6">
      {params.tavg && (
        <SectionCard icon={<Thermometer className="text-red-400" />} title={`${data.state} Temperature History`}>
          <TempYearlyChart data={params.tavg.yearly} valueKey="value" label="Avg Temperature (°C)" />
        </SectionCard>
      )}

      {params.tavg?.monthlyComparison?.length > 0 && (
        <SectionCard icon={<TrendingUp className="text-amber-400" />} title="Monthly Temperature Anomalies">
          <p className="text-xs text-gray-500 mb-3">Difference from 1961–1990 monthly average</p>
          <MonthlyComparisonChart data={params.tavg.monthlyComparison} label="Temperature" unit="°C" />
        </SectionCard>
      )}

      {params.pcp && (
        <SectionCard icon={<Droplets className="text-blue-400" />} title={`${data.state} Annual Precipitation`}>
          <PrecipChart data={params.pcp.yearly} label="Precipitation (mm)" />
        </SectionCard>
      )}

      {params.pcp?.monthlyComparison?.length > 0 && (
        <SectionCard icon={<CloudRain className="text-blue-300" />} title="Monthly Precipitation Anomalies">
          <p className="text-xs text-gray-500 mb-3">Difference from 1961–1990 monthly average</p>
          <MonthlyComparisonChart data={params.pcp.monthlyComparison} label="Precipitation" unit="mm" />
        </SectionCard>
      )}
    </div>
  );
}

// ─── UK Region Charts ───────────────────────────────────────────────────────

function UKRegionCharts({ data }: { data: NonNullable<ProfileData['ukRegionData']> }) {
  const vars = data.varData;
  // Show Tmean first, then others
  const varOrder = ['Tmean', 'Tmax', 'Tmin', 'Rainfall', 'Sunshine', 'AirFrost', 'Raindays1mm'];
  const availableVars = varOrder.filter(v => vars[v]);

  return (
    <div className="space-y-6">
      {availableVars.map(varName => {
        const variable = vars[varName];
        const config = UK_VAR_CONFIG[varName] || { color: '#9ca3af', icon: <Thermometer className="h-5 w-5" />, isSumVar: false };

        return (
          <SectionCard key={varName} icon={config.icon} title={`${data.region} — ${variable.label}`}>
            {config.isSumVar ? (
              <PrecipChart data={variable.yearly} label={`${variable.label} (${variable.units})`} />
            ) : (
              <TempYearlyChart data={variable.yearly} valueKey="value" label={`${variable.label} (${variable.units})`} />
            )}

            {variable.monthlyComparison?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Monthly Anomalies (vs 1961–1990)</h3>
                <MonthlyComparisonChart data={variable.monthlyComparison} label={variable.label} unit={variable.units} />
              </div>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

// ─── Related Link Card ──────────────────────────────────────────────────────

function RelatedLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-800 bg-gray-900/60 p-4 hover:border-[#D0A65E]/40 hover:bg-gray-900 transition-all"
    >
      <div className="font-semibold text-gray-200 text-sm">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{desc}</div>
    </Link>
  );
}

// ─── Crawlable text summary builder ─────────────────────────────────────────

function buildTextSummary(region: ClimateRegion, data: ProfileData): string {
  const parts: string[] = [];
  const ks = data.keyStats;

  parts.push(`${region.name} climate data profile.`);

  if (ks.dataRange) {
    parts.push(`Data coverage spans ${ks.dataRange}.`);
  }

  if (ks.latestTemp) {
    parts.push(`The latest annual average temperature was ${ks.latestTemp}.`);
  }

  if (ks.tempTrend) {
    parts.push(`The recent decade shows a trend of ${ks.tempTrend}.`);
  }

  if (ks.warmestYear) {
    parts.push(`The warmest year on record was ${ks.warmestYear}.`);
  }

  if (ks.latestPrecip) {
    parts.push(`Latest annual precipitation: ${ks.latestPrecip}.`);
  }

  return parts.join(' ');
}
