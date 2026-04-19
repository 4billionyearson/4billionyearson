"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush,
} from 'recharts';
import {
  Loader2, Thermometer, Droplets, Sun, Snowflake,
  TrendingUp, Link2,
} from 'lucide-react';
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
  nationalData?: {
    region?: string;
    state?: string;
    varData?: Record<string, {
      label: string;
      units: string;
      yearly: YearlyPoint[];
      monthlyComparison: MonthlyComparison[];
    }>;
    paramData?: Record<string, {
      label: string;
      units: string;
      yearly: YearlyPoint[];
      monthlyComparison: MonthlyComparison[];
    }>;
  };
  owidCountryData?: {
    yearlyData: YearlyPoint[];
    monthlyComparison: MonthlyComparison[];
    precipYearly?: PrecipPoint[];
    country?: string;
  };
  globalData?: {
    landYearlyData: YearlyPoint[];
    landMonthlyComparison: MonthlyComparison[];
    keyThresholds: { plus1_5: number; plus2_0: number };
  };
  lastUpdated: string;
  source?: string;
}

// ─── Chart config ────────────────────────────────────────────────────────────

const CHART_MARGIN = { top: 10, right: 0, left: -20, bottom: 0 };
const BRUSH_HEIGHT = 30;

// ─── Shared tooltips ─────────────────────────────────────────────────────────

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

const ComparisonTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const recentEntry = payload.find((p: any) => p.dataKey === 'recent' || p.dataKey === 'recentTemp');
  const recent = recentEntry?.value;
  const historic = payload.find((p: any) => p.dataKey === 'historicAvg')?.value;
  const isPending = recentEntry?.payload?.pending;
  let diffEl = null;
  if (recent != null && historic != null && !isPending) {
    const diff = recent - historic;
    const pct = historic !== 0 ? (diff / Math.abs(historic)) * 100 : 0;
    const sign = diff > 0 ? '+' : '';
    const color = diff > 0 ? 'text-red-400' : 'text-blue-400';
    diffEl = (
      <p className={`mt-1 pt-1 border-t border-gray-700 text-sm font-medium ${color}`}>
        Diff: {sign}{diff.toFixed(2)} ({sign}{pct.toFixed(1)}%)
      </p>
    );
  }
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[200px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => {
        if ((p.dataKey === 'recent' || p.dataKey === 'recentTemp') && p.payload?.pending) {
          return <p key={i} style={{ color: p.color || p.fill }} className="text-sm italic">Recent: data not yet available</p>;
        }
        return (
          <p key={i} style={{ color: p.color || p.fill }} className="text-sm">
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </p>
        );
      })}
      {diffEl}
    </div>
  );
};

// ─── Layout components ───────────────────────────────────────────────────────

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
      <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg">
        {icon} {title}
      </h2>
      <div className="h-px bg-[#D0A65E]/30 flex-1" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ─── Comparison Bar Chart (dashboard-style, side-by-side) ───────────────────

function ComparisonChart({ data, recentKey, label, units, barColor }: {
  data: MonthlyComparison[];
  recentKey: string;
  label: string;
  units: string;
  barColor: string;
}) {
  const chartData = data.map(d => ({
    ...d,
    pending: (d as any)[recentKey] == null,
    [recentKey]: (d as any)[recentKey] != null ? (d as any)[recentKey] : d.historicAvg ?? 0,
  }));

  const PendingBarShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload?.pending) return <rect x={x} y={y} width={width} height={height} fill={barColor} rx={4} ry={4} />;
    const minH = 36;
    const baseline = height >= 0 ? y + height : y;
    return (
      <g>
        <rect x={x} y={baseline - minH} width={width} height={minH} fill="none" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" rx={4} ry={4} />
        <text x={x + width / 2} y={baseline - minH / 2 + 3} textAnchor="middle" fontSize={9} fill="#9ca3af" fontStyle="italic">N/A</text>
      </g>
    );
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} allowDecimals={false} domain={[(d: number) => { const v = Math.floor(d - 1); return units === '°C' ? v : Math.max(0, v); }, (d: number) => Math.ceil(d + 1)]} unit={units === '°C' ? '°' : ''} />
          <Tooltip content={<ComparisonTooltip />} cursor={{ fill: '#1F2937' }} />
          <Legend iconType="circle" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, left: 0, right: 0 }} />
          <Bar dataKey={recentKey} name={`Recent ${label}`} fill={barColor} radius={[4, 4, 0, 0]} shape={<PendingBarShape />} />
          <Bar dataKey="historicAvg" name="Historic Avg (1961-1990)" fill="#7A6E63" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Yearly trend chart ──────────────────────────────────────────────────────

function YearlyChart({ data, dataKey, rollingKey, label, units, color, rollingColor }: {
  data: any[];
  dataKey: string;
  rollingKey?: string;
  label: string;
  units: string;
  color: string;
  rollingColor: string;
}) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} allowDecimals={false} tickCount={10} domain={[(d: number) => Math.floor(d - 1), (d: number) => Math.ceil(d + 1)]} unit={units === '°C' ? '°' : ''} />
          <Tooltip content={<DarkTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          <Line type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={1} dot={false} strokeOpacity={0.35} />
          {rollingKey && <Line type="monotone" dataKey={rollingKey} name="10-Yr Rolling Avg" stroke={rollingColor} strokeWidth={3} dot={false} />}
          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
            <LineChart data={data}>
              <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1} />
            </LineChart>
          </Brush>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Multi-series line chart (region + national overlay) ─────────────────────

function MultiLineChart({ data, series }: {
  data: any[];
  series: { dataKey: string; rollingKey?: string; label: string; color: string; rollingColor: string }[];
}) {
  const lines: React.ReactNode[] = [];
  series.forEach((s, i) => {
    lines.push(
      <Line key={`data-${i}`} type="monotone" dataKey={s.dataKey} name={s.label} stroke={s.color} strokeWidth={1} dot={false} connectNulls strokeOpacity={0.35} />
    );
    if (s.rollingKey) {
      lines.push(
        <Line key={`rolling-${i}`} type="monotone" dataKey={s.rollingKey} name={`${s.label} (10-Yr Avg)`} stroke={s.rollingColor} strokeWidth={3} dot={false} connectNulls />
      );
    }
  });
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} allowDecimals={false} domain={[(d: number) => Math.floor(d - 1), (d: number) => Math.ceil(d + 1)]} unit="°" />
          <Tooltip content={<DarkTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          {lines}
          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
            <LineChart data={data}>
              <Line type="monotone" dataKey={series[0].dataKey} stroke={series[0].color} dot={false} strokeWidth={1} />
            </LineChart>
          </Brush>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Merge helpers ───────────────────────────────────────────────────────────

function mergeMetricData(regionYearly: any[], countryYearly: any[]): any[] {
  const map = new Map<number, any>();
  for (const e of regionYearly) {
    map.set(e.year, { year: e.year, regionValue: e.value, regionRolling: e.rollingAvg });
  }
  for (const e of countryYearly) {
    const row = map.get(e.year) || { year: e.year };
    row.countryValue = e.value;
    row.countryRolling = e.rollingAvg;
    map.set(e.year, row);
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

function mergeAvgTempData(regionYearly?: any[], countryYearly?: any[]): any[] {
  const map = new Map<number, any>();
  if (regionYearly) {
    for (const e of regionYearly) {
      map.set(e.year, { year: e.year, regionTemp: e.value ?? e.avgTemp, regionRolling: e.rollingAvg });
    }
  }
  if (countryYearly) {
    for (const e of countryYearly) {
      const row = map.get(e.year) || { year: e.year };
      row.countryTemp = e.avgTemp ?? e.value;
      row.countryRolling = e.rollingAvg;
      map.set(e.year, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ClimateProfile({ slug, region }: { slug: string; region: ClimateRegion }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    // Add cache buster to bypass Next.js client caching
    fetch(`/api/climate/profile/${slug}?_t=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load data');
        return res.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    // Fetch Gemini summary (non-blocking) - add cache buster
    fetch(`/api/climate/summary/${slug}?_t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(d => { if (d?.summary) setSummary(d.summary); })
      .catch(() => {});
  }, [slug]);

  // Derived labels
  const regionLabel = data?.ukRegionData?.region || data?.usStateData?.state || data?.name || region.name;
  const nationalLabel = data?.nationalData?.region || (region.type === 'us-state' ? 'United States' : region.type === 'uk-region' ? 'United Kingdom' : '');
  const isSubNational = region.type === 'uk-region' || region.type === 'us-state';

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

            {/* AI-generated narrative */}
            {summary && (
              <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 mb-8">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Monthly Climate Update
                </h2>
                <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                  {summary.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                  <p className="text-gray-600 text-xs mt-3 italic">Generated by Gemini from the latest data</p>
                </div>
              </div>
            )}

            {/* ═══ TEMPERATURE ═══ */}
            <TemperatureSection
              data={data}
              regionLabel={regionLabel}
              nationalLabel={nationalLabel}
              isSubNational={isSubNational}
              regionType={region.type}
            />

            {/* ═══ SUNSHINE (UK only) ═══ */}
            {data.ukRegionData?.varData?.Sunshine && (
              <UKVariableSection
                varName="Sunshine"
                regionData={data.ukRegionData}
                nationalData={data.nationalData}
                regionLabel={regionLabel}
                nationalLabel={nationalLabel}
                icon={<Sun className="h-5 w-5 text-yellow-400" />}
                dividerIcon={<Sun className="h-5 w-5" />}
                dividerTitle="Sunshine"
                barColor="#eab308"
                nationalBarColor="#ea580c"
                lineColor="#fde047"
                rollingColor="#ca8a04"
                nationalLineColor="#fdba74"
                nationalRollingColor="#ea580c"
              />
            )}

            {/* ═══ RAINFALL & PRECIPITATION ═══ */}
            <RainfallSection
              data={data}
              regionLabel={regionLabel}
              nationalLabel={nationalLabel}
              isSubNational={isSubNational}
              regionType={region.type}
            />

            {/* ═══ FROST (UK only) ═══ */}
            {data.ukRegionData?.varData?.AirFrost && (
              <UKVariableSection
                varName="AirFrost"
                regionData={data.ukRegionData}
                nationalData={data.nationalData}
                regionLabel={regionLabel}
                nationalLabel={nationalLabel}
                icon={<Snowflake className="h-5 w-5 text-cyan-400" />}
                dividerIcon={<Snowflake className="h-5 w-5" />}
                dividerTitle="Frost"
                barColor="#06b6d4"
                nationalBarColor="#a855f7"
                lineColor="#67e8f9"
                rollingColor="#06b6d4"
                nationalLineColor="#d8b4fe"
                nationalRollingColor="#a855f7"
              />
            )}

            {/* ═══ RAIN DAYS (UK only) ═══ */}
            {data.ukRegionData?.varData?.Raindays1mm && (
              <UKVariableSection
                varName="Raindays1mm"
                regionData={data.ukRegionData}
                nationalData={data.nationalData}
                regionLabel={regionLabel}
                nationalLabel={nationalLabel}
                icon={<Droplets className="h-5 w-5 text-indigo-400" />}
                dividerIcon={<Droplets className="h-5 w-5" />}
                dividerTitle="Rain Days (≥1mm)"
                barColor="#6366f1"
                nationalBarColor="#8b5cf6"
                lineColor="#a5b4fc"
                rollingColor="#6366f1"
                nationalLineColor="#c4b5fd"
                nationalRollingColor="#8b5cf6"
              />
            )}

            {/* ─── Explore More ──────────────────────────────────────── */}
            <Divider icon={<Link2 className="h-5 w-5" />} title="Explore More" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <RelatedLink href="/climate-dashboard" label="Climate Dashboard" desc="Interactive global climate data" />
              <RelatedLink href="/emissions" label="CO₂ Emissions" desc="Global and per-country emissions" />
              <RelatedLink href="/greenhouse-gases" label="Greenhouse Gases" desc="CO₂, methane, and N₂O levels" />
              <RelatedLink href="/sea-levels-ice" label="Sea Levels & Ice" desc="Arctic ice and sea-level rise" />
              <RelatedLink href="/extreme-weather" label="Extreme Weather" desc="Live disaster and weather alerts" />
              <RelatedLink href="/planetary-boundaries" label="Planetary Boundaries" desc="The nine factors of stability" />
            </div>

            {/* ─── Attribution ───────────────────────────────────────── */}
            <div className="mt-8 text-xs text-gray-600 space-y-1">
              <p>Last updated: {data.lastUpdated} · Source: {data.source === 'cache' ? 'cached' : 'live'}</p>
              {data.ukRegionData?.attribution && <p>{data.ukRegionData.attribution}</p>}
              <p>
                Data from{' '}
                <a href="https://ourworldindata.org" className="text-gray-500 hover:text-gray-400" target="_blank" rel="noopener noreferrer">OWID</a>,{' '}
                <a href="https://www.ncei.noaa.gov" className="text-gray-500 hover:text-gray-400" target="_blank" rel="noopener noreferrer">NOAA</a>,{' '}
                <a href="https://www.metoffice.gov.uk" className="text-gray-500 hover:text-gray-400" target="_blank" rel="noopener noreferrer">Met Office</a>
              </p>
            </div>

            {/* Crawlable fallback text */}
            {!summary && (
              <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 mt-6">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Data Summary</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{buildTextSummary(region, data)}</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ─── TEMPERATURE SECTION ────────────────────────────────────────────────────

function TemperatureSection({ data, regionLabel, nationalLabel, isSubNational, regionType }: {
  data: ProfileData;
  regionLabel: string;
  nationalLabel: string;
  isSubNational: boolean;
  regionType: string;
}) {
  const ukVar = data.ukRegionData?.varData?.Tmean;
  const usVar = data.usStateData?.paramData?.tavg;
  const natUkVar = data.nationalData?.varData?.Tmean;
  const natUsVar = data.nationalData?.paramData?.tavg;

  // Build combined yearly data for overlay chart
  const combinedYearly = (() => {
    if (regionType === 'uk-region' && ukVar?.yearly && data.owidCountryData?.yearlyData) {
      return mergeAvgTempData(ukVar.yearly, data.owidCountryData.yearlyData);
    }
    if (regionType === 'us-state' && usVar?.yearly && data.owidCountryData?.yearlyData) {
      return mergeAvgTempData(usVar.yearly, data.owidCountryData.yearlyData);
    }
    return null;
  })();

  const sectionTitle = (() => {
    const parts: string[] = [regionLabel];
    if (isSubNational && data.owidCountryData) parts.push(regionType === 'uk-region' ? 'United Kingdom' : 'United States');
    return parts.join(' + ') + ' – Average Temperature';
  })();

  return (
    <>
      <Divider icon={<Thermometer className="h-5 w-5" />} title="Temperature" />

      <SectionCard icon={<TrendingUp className="h-5 w-5 text-red-400" />} title={sectionTitle}>
        {/* Monthly comparison bars FIRST */}
        {ukVar?.monthlyComparison && (
          <SubSection title={`${regionLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={ukVar.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#d97706" />
          </SubSection>
        )}
        {natUkVar?.monthlyComparison && (
          <SubSection title={`${nationalLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={natUkVar.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#ef4444" />
          </SubSection>
        )}

        {usVar?.monthlyComparison && (
          <SubSection title={`${regionLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={usVar.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#ea580c" />
          </SubSection>
        )}
        {natUsVar?.monthlyComparison && (
          <SubSection title={`${nationalLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={natUsVar.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#ef4444" />
          </SubSection>
        )}

        {/* Country-level monthly comparison (for country profiles) */}
        {regionType === 'country' && data.countryData?.monthlyComparison && (
          <SubSection title={`${regionLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={data.countryData.monthlyComparison} recentKey="recentTemp" label="Temperature" units="°C" barColor="#ef4444" />
          </SubSection>
        )}

        {/* Global comparison */}
        {data.globalData?.landMonthlyComparison && (
          <SubSection title="Global (Land) – Last 12 months vs 1961–1990 baseline">
            <ComparisonChart data={data.globalData.landMonthlyComparison} recentKey="recentTemp" label="Temperature" units="°C" barColor="#10b981" />
          </SubSection>
        )}

        {/* Yearly annual trend */}
        {combinedYearly ? (
          <SubSection title="Annual average – full history (drag slider to zoom)">
            <MultiLineChart
              data={combinedYearly}
              series={[
                { dataKey: 'regionTemp', rollingKey: 'regionRolling', label: regionLabel, color: '#fdcc74', rollingColor: '#f59e0b' },
                { dataKey: 'countryTemp', rollingKey: 'countryRolling', label: regionType === 'uk-region' ? 'United Kingdom' : 'United States', color: '#fca5a5', rollingColor: '#dc2626' },
              ]}
            />
          </SubSection>
        ) : data.countryData?.yearlyData ? (
          <SubSection title="Annual average – full history (drag slider to zoom)">
            <YearlyChart data={data.countryData.yearlyData} dataKey="avgTemp" rollingKey="rollingAvg" label="Avg Temperature" units="°C" color="#fca5a5" rollingColor="#ef4444" />
          </SubSection>
        ) : ukVar?.yearly ? (
          <SubSection title="Annual average – full history (drag slider to zoom)">
            <YearlyChart data={ukVar.yearly} dataKey="value" rollingKey="rollingAvg" label="Avg Temperature" units="°C" color="#fdcc74" rollingColor="#f59e0b" />
          </SubSection>
        ) : usVar?.yearly ? (
          <SubSection title="Annual average – full history (drag slider to zoom)">
            <YearlyChart data={usVar.yearly} dataKey="value" rollingKey="rollingAvg" label="Avg Temperature" units="°C" color="#fdcc74" rollingColor="#f59e0b" />
          </SubSection>
        ) : null}

        <SourceAttribution countryData={data.countryData} usStateData={data.usStateData} ukRegionData={data.ukRegionData} />
      </SectionCard>
    </>
  );
}

// ─── UK VARIABLE SECTION (Sunshine / Frost / Rain Days) ──────────────────────

function UKVariableSection({ varName, regionData, nationalData, regionLabel, nationalLabel, icon, dividerIcon, dividerTitle, barColor, nationalBarColor, lineColor, rollingColor, nationalLineColor, nationalRollingColor }: {
  varName: string;
  regionData: NonNullable<ProfileData['ukRegionData']>;
  nationalData?: ProfileData['nationalData'];
  regionLabel: string;
  nationalLabel: string;
  icon: React.ReactNode;
  dividerIcon: React.ReactNode;
  dividerTitle: string;
  barColor: string;
  nationalBarColor: string;
  lineColor: string;
  rollingColor: string;
  nationalLineColor: string;
  nationalRollingColor: string;
}) {
  const variable = regionData.varData[varName];
  const nationalVar = nationalData?.varData?.[varName];
  if (!variable) return null;

  const combinedYearly = nationalVar?.yearly
    ? mergeMetricData(variable.yearly, nationalVar.yearly)
    : null;

  const sectionTitle = combinedYearly
    ? `${regionLabel} + ${nationalLabel} – ${variable.label}`
    : `${regionLabel} – ${variable.label}`;

  return (
    <>
      <Divider icon={dividerIcon} title={dividerTitle} />

      <SectionCard icon={icon} title={sectionTitle}>
        {/* Monthly comparison bars FIRST */}
        {variable.monthlyComparison && (
          <SubSection title={`${regionLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={variable.monthlyComparison} recentKey="recent" label={variable.label} units={variable.units} barColor={barColor} />
          </SubSection>
        )}
        {nationalVar?.monthlyComparison && (
          <SubSection title={`${nationalLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={nationalVar.monthlyComparison} recentKey="recent" label={variable.label} units={variable.units} barColor={nationalBarColor} />
          </SubSection>
        )}

        {/* Yearly trend */}
        <SubSection title="Annual total – full history (drag slider to zoom)">
          {combinedYearly ? (
            <MultiLineChart
              data={combinedYearly}
              series={[
                { dataKey: 'regionValue', rollingKey: 'regionRolling', label: regionLabel, color: lineColor, rollingColor: rollingColor },
                { dataKey: 'countryValue', rollingKey: 'countryRolling', label: nationalLabel, color: nationalLineColor, rollingColor: nationalRollingColor },
              ]}
            />
          ) : (
            <YearlyChart data={variable.yearly} dataKey="value" rollingKey="rollingAvg" label={variable.label} units={variable.units} color={lineColor} rollingColor={rollingColor} />
          )}
        </SubSection>

        <p className="text-xs text-gray-400 mt-4">
          Source: Contains{' '}
          <a href="https://www.metoffice.gov.uk/research/climate/maps-and-data/uk-climate-averages" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Met Office</a>{' '}
          data © Crown copyright (Open Government Licence).
        </p>
      </SectionCard>
    </>
  );
}

// ─── RAINFALL / PRECIPITATION SECTION ────────────────────────────────────────

function RainfallSection({ data, regionLabel, nationalLabel, isSubNational, regionType }: {
  data: ProfileData;
  regionLabel: string;
  nationalLabel: string;
  isSubNational: boolean;
  regionType: string;
}) {
  const ukRainfall = data.ukRegionData?.varData?.Rainfall;
  const usPrecip = data.usStateData?.paramData?.pcp;
  const natUkRainfall = data.nationalData?.varData?.Rainfall;
  const natUsPrecip = data.nationalData?.paramData?.pcp;
  const countryPrecip = data.countryData?.precipYearly;

  if (!ukRainfall && !usPrecip && !countryPrecip) return null;

  const combinedRainfallYearly = ukRainfall?.yearly && natUkRainfall?.yearly
    ? mergeMetricData(ukRainfall.yearly, natUkRainfall.yearly)
    : null;

  const combinedPrecipYearly = usPrecip?.yearly && natUsPrecip?.yearly
    ? mergeMetricData(usPrecip.yearly, natUsPrecip.yearly)
    : null;

  const sectionTitle = (() => {
    if (ukRainfall && combinedRainfallYearly) return `${regionLabel} + ${nationalLabel} – Rainfall`;
    if (usPrecip && combinedPrecipYearly) return `${regionLabel} + ${nationalLabel} – Precipitation`;
    if (ukRainfall) return `${regionLabel} – Rainfall`;
    if (usPrecip) return `${regionLabel} – Precipitation`;
    return `${regionLabel} – Annual Precipitation`;
  })();

  return (
    <>
      <Divider icon={<Droplets className="h-5 w-5" />} title="Rainfall & Precipitation" />

      <SectionCard icon={<Droplets className="h-5 w-5 text-blue-400" />} title={sectionTitle}>
        {/* Monthly comparison bars FIRST */}
        {ukRainfall?.monthlyComparison && (
          <SubSection title={`${regionLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={ukRainfall.monthlyComparison} recentKey="recent" label="Rainfall" units="mm" barColor="#3b82f6" />
          </SubSection>
        )}
        {natUkRainfall?.monthlyComparison && (
          <SubSection title={`${nationalLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={natUkRainfall.monthlyComparison} recentKey="recent" label="Rainfall" units="mm" barColor="#7c3aed" />
          </SubSection>
        )}

        {usPrecip?.monthlyComparison && (
          <SubSection title={`${regionLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={usPrecip.monthlyComparison} recentKey="recent" label="Precipitation" units="mm" barColor="#3b82f6" />
          </SubSection>
        )}
        {natUsPrecip?.monthlyComparison && (
          <SubSection title={`${nationalLabel} – Last 12 months vs 1961–1990 baseline`}>
            <ComparisonChart data={natUsPrecip.monthlyComparison} recentKey="recent" label="Precipitation" units="mm" barColor="#7c3aed" />
          </SubSection>
        )}

        {/* Yearly trend */}
        {combinedRainfallYearly ? (
          <SubSection title="Annual total rainfall – full history (drag slider to zoom)">
            <MultiLineChart
              data={combinedRainfallYearly}
              series={[
                { dataKey: 'regionValue', rollingKey: 'regionRolling', label: regionLabel, color: '#60a5fa', rollingColor: '#2563eb' },
                { dataKey: 'countryValue', rollingKey: 'countryRolling', label: nationalLabel, color: '#a78bfa', rollingColor: '#7c3aed' },
              ]}
            />
          </SubSection>
        ) : combinedPrecipYearly ? (
          <SubSection title="Annual total precipitation – full history (drag slider to zoom)">
            <MultiLineChart
              data={combinedPrecipYearly}
              series={[
                { dataKey: 'regionValue', rollingKey: 'regionRolling', label: regionLabel, color: '#60a5fa', rollingColor: '#2563eb' },
                { dataKey: 'countryValue', rollingKey: 'countryRolling', label: nationalLabel, color: '#a78bfa', rollingColor: '#7c3aed' },
              ]}
            />
          </SubSection>
        ) : ukRainfall?.yearly ? (
          <SubSection title="Annual total rainfall – full history (drag slider to zoom)">
            <YearlyChart data={ukRainfall.yearly} dataKey="value" rollingKey="rollingAvg" label="Rainfall" units="mm" color="#60a5fa" rollingColor="#2563eb" />
          </SubSection>
        ) : usPrecip?.yearly ? (
          <SubSection title="Annual total precipitation – full history (drag slider to zoom)">
            <YearlyChart data={usPrecip.yearly} dataKey="value" rollingKey="rollingAvg" label="Precipitation" units="mm" color="#60a5fa" rollingColor="#2563eb" />
          </SubSection>
        ) : countryPrecip ? (
          <SubSection title="Annual total precipitation – full history (drag slider to zoom)">
            <YearlyChart data={countryPrecip} dataKey="value" rollingKey="rollingAvg" label="Precipitation" units="mm" color="#60a5fa" rollingColor="#2563eb" />
          </SubSection>
        ) : null}

        <SourceAttribution countryData={data.countryData} usStateData={data.usStateData} ukRegionData={data.ukRegionData} />
      </SectionCard>
    </>
  );
}

// ─── Source Attribution ──────────────────────────────────────────────────────

function SourceAttribution({ countryData, usStateData, ukRegionData }: {
  countryData?: any; usStateData?: any; ukRegionData?: any;
}) {
  return (
    <p className="text-xs text-gray-400 mt-4">
      {countryData && <>Country temperature:{' '}<a href="https://ourworldindata.org/explorers/climate-change" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a>{' '}/ <a href="https://climate.copernicus.eu/climate-reanalysis" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Copernicus ERA5</a> (CC-BY).{' '}</>}
      {usStateData && <>US state data:{' '}<a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">NOAA NCEI</a>.{' '}</>}
      {ukRegionData && <>UK data: contains{' '}<a href="https://www.metoffice.gov.uk/research/climate/maps-and-data/uk-climate-averages" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Met Office</a>{' '}data © Crown copyright (Open Government Licence).</>}
    </p>
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
  if (ks.dataRange) parts.push(`Data coverage spans ${ks.dataRange}.`);
  if (ks.latestTemp) parts.push(`The latest annual average temperature was ${ks.latestTemp}.`);
  if (ks.tempTrend) parts.push(`The recent decade shows a trend of ${ks.tempTrend}.`);
  if (ks.warmestYear) parts.push(`The warmest year on record was ${ks.warmestYear}.`);
  if (ks.latestPrecip) parts.push(`Latest annual precipitation: ${ks.latestPrecip}.`);
  return parts.join(' ');
}
