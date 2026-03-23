"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush, Cell,
} from "recharts";
import {
  Loader2, Brain, DollarSign, TrendingUp,
  Cpu, Globe, BarChart3, Activity, MapPin, Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const DataCenterMap = dynamic(() => import("@/app/_components/data-center-map"), { ssr: false });

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AIDashboardData {
  investment: Record<string, number>[];
  aiSystemsPerYear: Record<string, number>[];
  aiSystemsByCountry: Record<string, number>[];
  frontierMath: { name: string; score: number; date: string }[];
  epochModelsByOrg: { name: string; value: number }[];
  epochModelsByYear: Record<string, number>[];
  latestModels: { name: string; org: string; date: string; domain: string }[];
  frontierDataCenters: {
    name: string;
    owner: string;
    users: string;
    powerMW: number;
    h100Equiv: number;
    costBillions: number;
    country: string;
    lat: number;
    lon: number;
  }[];
  frontierDCTimeline: { date: string; totalPowerMW: number; totalH100e: number; totalCostB: number }[];
  stats: {
    latestYear: number;
    globalInvestment: number;
    totalModels2025: number;
    fmTopModel: string;
    fmTopScore: number;
    frontierTotalPowerMW: number;
    frontierTotalCostB: number;
    frontierTotalH100e: number;
    frontierCount: number;
    worldElectricityTWh: number | null;
    equivalentCountry: string | null;
    comparisonCountries: { name: string; twh: number }[];
  };
  fetchedAt: string;
}

/* ─── Chart config ────────────────────────────────────────────────────────── */

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;
const ACCENT = "#88DDFC";

const formatBillions = (v: number) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
};

const formatCompact = (v: number) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
};

const SERIES_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#a855f7", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6", "#8b5cf6"];
const BAR_GRADIENT = [
  "#ef4444", "#f87171", "#fb923c", "#fbbf24", "#facc15",
  "#a3e635", "#4ade80", "#34d399", "#2dd4bf", "#22d3ee",
];

/* ─── Tooltip ─────────────────────────────────────────────────────────────── */

function DarkTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.filter((p: any) => p.value != null).map((p: any, i: number) => (
        <p key={i} className="text-sm flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color || p.stroke || p.fill }} />
          <span className="text-gray-200">
            {p.name}: {formatter ? formatter(p.value) : (typeof p.value === "number" ? p.value.toLocaleString() : p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ─── Layout components ───────────────────────────────────────────────────── */

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="relative z-0 bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#88DDFC] [&:hover]:z-10">
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
      <div className="h-px bg-[#88DDFC]/30 flex-1" />
      <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#88DDFC]/50 shadow-lg">
        {icon} {title}
      </h2>
      <div className="h-px bg-[#88DDFC]/30 flex-1" />
    </div>
  );
}

function StatCard({ label, value, unit, subtext, color }: {
  label: string; value: string; unit?: string; subtext?: string; color: string;
}) {
  return (
    <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700/50">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

/* ─── Multi-series area chart ─────────────────────────────────────────────── */

function MultiAreaChart({ data, keys, formatter, stacked, unit }: {
  data: Record<string, number>[];
  keys: string[];
  formatter?: (v: number) => string;
  stacked?: boolean;
  unit?: string;
}) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data available.</p>;
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k} id={`grad-${k.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} wrapperStyle={{ zIndex: 50 }} />
          <Legend wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId={stacked ? "1" : undefined}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              fill={`url(#grad-${k.replace(/\s+/g, '-')})`}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
          {data.length > 15 && <Brush dataKey="year" height={BRUSH_HEIGHT} stroke={ACCENT} fill="#111" travellerWidth={10} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Multi-series line chart ─────────────────────────────────────────────── */

function MultiLineChart({ data, keys, formatter, refLine }: {
  data: Record<string, number>[];
  keys: string[];
  formatter?: (v: number) => string;
  refLine?: number;
}) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data available.</p>;
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} wrapperStyle={{ zIndex: 50 }} />
          <Legend wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
          {data.length > 15 && <Brush dataKey="year" height={BRUSH_HEIGHT} stroke={ACCENT} fill="#111" travellerWidth={10} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Stacked bar chart ───────────────────────────────────────────────────── */

function StackedBarChart({ data, keys, formatter, showBrush = true }: {
  data: Record<string, number>[];
  keys: string[];
  formatter?: (v: number) => string;
  showBrush?: boolean;
}) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data available.</p>;
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} wrapperStyle={{ zIndex: 50 }} />
          <Legend wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="1" fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
          {showBrush && data.length > 15 && <Brush dataKey="year" height={BRUSH_HEIGHT} stroke={ACCENT} fill="#111" travellerWidth={10} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Top 10 horizontal bar chart ─────────────────────────────────────────── */

function Top10BarChart({ data, dataKey, formatter }: {
  data: { name: string; value: number }[];
  dataKey: string;
  formatter?: (v: number) => string;
}) {
  const chartData = data.map(d => ({ name: d.name, [dataKey]: d.value }));
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#D3C8BB" }} tickLine={false} axisLine={false} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} wrapperStyle={{ zIndex: 50 }} />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={BAR_GRADIENT[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Helper: extract series keys (excluding "year") ──────────────────────── */

function seriesKeys(data: Record<string, number>[]): string[] {
  if (!data.length) return [];
  return Object.keys(data[0]).filter(k => k !== "year");
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function AIDashboardPage() {
  const [data, setData] = useState<AIDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai")
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Hero ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border-2 border-[#88DDFC] shadow-xl overflow-hidden">
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: "#88DDFC" }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: "#FFF5E7" }}>
                AI Industry Data
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Tracking AI models released, data center infrastructure, and investment.
              </p>
            </div>
          </div>

          {/* ─── Loading / Error ───────────────────────────────────── */}
          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#88DDFC] flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
              <p className="text-gray-400">Fetching AI data from Our World in Data...</p>
            </div>
          )}

          {error && !data && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-6 text-red-400 text-center">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* ─── Stat Cards ───────────────────────────────────── */}
              <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#88DDFC] p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <h2 className="text-lg font-bold font-mono text-white">Key Facts</h2>
                  <span className="ml-auto text-xs text-gray-600">
                    Updated {new Date(data.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="2025 AI Models Released"
                    value={String(data.stats.totalModels2025 ?? 0)}
                    color="text-violet-400"
                    subtext="Epoch AI (continuously updated)"
                  />
                  <StatCard
                    label="Global AI Investment"
                    value={formatBillions(data.stats.globalInvestment)}
                    color="text-cyan-400"
                    subtext={`${data.stats.latestYear} (AI Index Report)`}
                  />
                  <StatCard
                    label="Frontier AI Sites"
                    value={(data.stats.frontierCount ?? 0).toLocaleString()}
                    color="text-sky-400"
                    subtext={`${data.frontierDataCenters?.filter(dc => dc.powerMW > 0).length ?? 0} Operational · ${data.frontierDataCenters?.filter(dc => dc.powerMW <= 0).length ?? 0} Planned`}
                  />
                  <StatCard
                    label="AI Energy Demand"
                    value={`${((data.stats.frontierTotalPowerMW ?? 0) * 8.76 / 1000).toFixed(1)} TWh`}
                    color="text-amber-400"
                    subtext={data.stats.worldElectricityTWh
                      ? `${(((data.stats.frontierTotalPowerMW ?? 0) * 8.76 / 1000) / data.stats.worldElectricityTWh * 100).toFixed(2)}% of world electricity`
                      : `${data.frontierDataCenters?.filter(dc => dc.powerMW > 0).length ?? 0} operational sites annualised`}
                  />
                </div>
              </div>

              {/* ═══ AI MODELS & BENCHMARKS ═══ */}
              <Divider icon={<Brain className="h-5 w-5" />} title="AI Models" />

              {data.latestModels?.length > 0 && (
              <SectionCard icon={<Brain className="h-5 w-5 text-emerald-400" />} title="Latest AI Models Released">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/50 text-left">
                        <th className="py-2 pr-4 text-gray-400 font-medium">Model</th>
                        <th className="py-2 pr-4 text-gray-400 font-medium">Organization</th>
                        <th className="py-2 pr-4 text-gray-400 font-medium hidden sm:table-cell">Domain</th>
                        <th className="py-2 text-gray-400 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.latestModels.map((m, i) => (
                        <tr key={i} className="border-b border-gray-800/40">
                          <td className="py-2 pr-4 text-gray-200 font-medium">{m.name}</td>
                          <td className="py-2 pr-4 text-gray-400">{m.org}</td>
                          <td className="py-2 pr-4 text-gray-500 hidden sm:table-cell">{m.domain}</td>
                          <td className="py-2 text-gray-500 whitespace-nowrap">{m.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Most recently released AI models. Source:{" "}
                  <a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Epoch AI
                  </a>. Continuously updated.
                </p>
              </SectionCard>
              )}

              {data.epochModelsByOrg?.length > 0 && (
              <SectionCard icon={<Brain className="h-5 w-5 text-cyan-400" />} title="2025 AI Models Released by Organization">
                <Top10BarChart data={data.epochModelsByOrg} dataKey="models" />
                <p className="text-xs text-gray-500 mt-4">
                  AI models released in 2025, by organization. Source:{" "}
                  <a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Epoch AI
                  </a>. Continuously updated.
                </p>
              </SectionCard>
              )}

              {data.epochModelsByYear?.length > 0 && (
              <SectionCard icon={<TrendingUp className="h-5 w-5 text-amber-400" />} title="AI Models Released Per Year">
                <StackedBarChart data={data.epochModelsByYear} keys={seriesKeys(data.epochModelsByYear)} showBrush={false} />
                <p className="text-xs text-gray-500 mt-4">
                  AI models released per year (2010–present). Source:{" "}<a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Epoch AI</a>. Continuously updated.
                </p>
              </SectionCard>
              )}

              {data.aiSystemsPerYear.length > 0 && (
              <SectionCard icon={<Brain className="h-5 w-5 text-violet-400" />} title="AI Systems Released Per Year">
                <StackedBarChart data={data.aiSystemsPerYear} keys={seriesKeys(data.aiSystemsPerYear)} />
                <p className="text-xs text-gray-500 mt-4">
                  Number of large-scale AI systems released per year, by domain (language, vision, multimodal, etc.). Source:{" "}<a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Epoch AI</a>{" / "}<a href="https://ourworldindata.org/artificial-intelligence" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Our World in Data</a>. Updated monthly.
                  <span className="block mt-1 text-amber-400/80">2026 figure is year-to-date and will increase throughout the year.</span>
                </p>
              </SectionCard>
              )}

              {data.aiSystemsByCountry.length > 0 && (
              <SectionCard icon={<Globe className="h-5 w-5 text-blue-400" />} title="Cumulative AI Systems by Country">
                <MultiAreaChart data={data.aiSystemsByCountry} keys={seriesKeys(data.aiSystemsByCountry)} stacked />
                <p className="text-xs text-gray-500 mt-4">
                  Cumulative number of large-scale AI systems by country of origin since 2017. Source:{" "}<a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Epoch AI</a>{" / "}<a href="https://ourworldindata.org/artificial-intelligence" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Our World in Data</a>. Updated monthly.
                </p>
              </SectionCard>
              )}

              {data.frontierMath?.length > 0 && (
              <SectionCard icon={<BarChart3 className="h-5 w-5 text-rose-400" />} title="FrontierMath Benchmark">
                <Top10BarChart data={data.frontierMath.slice(0, 10).map(d => ({ name: d.name, value: d.score }))} dataKey="score" formatter={(v) => `${Math.round(v)}%`} />
                <p className="text-xs text-gray-500 mt-4">
                  Latest AI model performance on FrontierMath — a challenging mathematics benchmark. Source:{" "}
                  <a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Epoch AI
                  </a>. Updated monthly.
                </p>
              </SectionCard>
              )}

              {/* ═══ INFRASTRUCTURE ═══ */}
              <Divider icon={<Cpu className="h-5 w-5" />} title="Infrastructure" />

              {data.frontierDataCenters?.length > 0 && (
              <SectionCard icon={<MapPin className="h-5 w-5 text-cyan-400" />} title="Frontier AI Data Center Locations">
                <DataCenterMap sites={data.frontierDataCenters} />
                <p className="text-xs text-gray-500 mt-4">
                  {data.stats.frontierCount} frontier AI data centers tracked globally ({data.frontierDataCenters.filter(dc => dc.country === 'United States').length} in the US). Pin size indicates power capacity. Source:{" "}
                  <a href="https://epoch.ai/data/data-centers" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Epoch AI — Frontier Data Centers
                  </a>{" "}(CC-BY).
                </p>
              </SectionCard>
              )}

              {data.frontierDataCenters?.length > 0 && (
              <SectionCard icon={<Cpu className="h-5 w-5 text-cyan-400" />} title="Frontier AI Data Centers">
                {(() => {
                  const operational = data.frontierDataCenters.filter(dc => dc.powerMW > 0);
                  const planned = data.frontierDataCenters.filter(dc => dc.powerMW <= 0);
                  const opPower = operational.reduce((s, dc) => s + dc.powerMW, 0);
                  const opH100 = operational.reduce((s, dc) => s + dc.h100Equiv, 0);
                  const opCost = operational.reduce((s, dc) => s + dc.costBillions, 0);
                  return (
                    <div className="mb-5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gray-800/60 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-cyan-400">{data.stats.frontierCount}</div>
                          <div className="text-xs text-gray-400 mt-1">Tracked Sites</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{operational.length} operational · {planned.length} planned</div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-emerald-400">{opPower.toLocaleString()} MW</div>
                          <div className="text-xs text-gray-400 mt-1">Operational Power</div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-amber-400">{(opH100 / 1e6).toFixed(1)}M</div>
                          <div className="text-xs text-gray-400 mt-1">H100 Equivalents</div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-rose-400">${Math.round(opCost * 10) / 10}B</div>
                          <div className="text-xs text-gray-400 mt-1">Capital Cost</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">2021–2029, {data.stats.frontierCount} sites</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">H100 Equivalents = total GPU compute capacity normalised to NVIDIA H100 chips, allowing comparison across different hardware.</p>
                    </div>
                  );
                })()}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/50 text-left">
                        <th className="py-2 pr-3 text-gray-400 font-medium">Data Center</th>
                        <th className="py-2 pr-3 text-gray-400 font-medium">Owner</th>
                        <th className="py-2 pr-3 text-gray-400 font-medium hidden sm:table-cell">Users</th>
                        <th className="py-2 pr-3 text-gray-400 font-medium hidden lg:table-cell">Country</th>
                        <th className="py-2 pr-3 text-gray-400 font-medium text-right">Power (MW)</th>
                        <th className="py-2 pr-3 text-gray-400 font-medium text-right hidden md:table-cell">H100 Equiv.</th>
                        <th className="py-2 pr-3 text-gray-400 font-medium text-right">Cost ($B)</th>
                        <th className="py-2 text-gray-400 font-medium text-center hidden sm:table-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.frontierDataCenters.map((dc, i) => (
                        <tr key={i} className="border-b border-gray-800/40">
                          <td className="py-2 pr-3 text-gray-200 font-medium">{dc.name}</td>
                          <td className="py-2 pr-3 text-gray-400">{dc.owner}</td>
                          <td className="py-2 pr-3 text-gray-500 hidden sm:table-cell">{dc.users || '—'}</td>
                          <td className="py-2 pr-3 text-gray-500 hidden lg:table-cell">{dc.country || '—'}</td>
                          <td className="py-2 pr-3 text-gray-300 text-right font-mono">{dc.powerMW > 0 ? dc.powerMW.toLocaleString() : '—'}</td>
                          <td className="py-2 pr-3 text-gray-400 text-right font-mono hidden md:table-cell">{dc.h100Equiv > 0 ? (dc.h100Equiv / 1000).toFixed(0) + 'K' : '—'}</td>
                          <td className="py-2 pr-3 text-gray-300 text-right font-mono">{dc.costBillions > 0 ? `$${dc.costBillions}` : '—'}</td>
                          <td className="py-2 text-center hidden sm:table-cell">{dc.powerMW > 0 ? <span className="text-emerald-400 text-xs">Operational</span> : <span className="text-amber-400 text-xs">Planned</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  The world&apos;s largest known AI data centers tracked via satellite imagery, construction permits and public disclosures. Source:{" "}
                  <a href="https://epoch.ai/data/data-centers" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Epoch AI — Frontier Data Centers
                  </a>{" "}(CC-BY). Updated {new Date(data.fetchedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}.
                </p>
              </SectionCard>
              )}

              {data.stats.frontierTotalH100e > 0 && (
              <SectionCard icon={<Cpu className="h-5 w-5 text-violet-400" />} title="AI Frontier Data Center Processing Power">
                {(() => {
                  const TFLOPS_PER_H100 = 989;   // H100 SXM FP16 dense
                  const TFLOPS_PER_PHONE = 2;     // Modern smartphone (iPhone 16 / Pixel 9 class)
                  const WORLD_POP = 8.2e9;        // ~8.2 billion (2025)
                  const WORLD_PHONES = 4.9e9;     // ~4.9 billion smartphones globally (GSMA 2025)

                  const totalH100e = data.stats.frontierTotalH100e;
                  const totalTFLOPS = totalH100e * TFLOPS_PER_H100;
                  const totalExaFLOPS = totalTFLOPS / 1e6; // 1 ExaFLOPS = 10^6 TFLOPS
                  const perPersonTFLOPS = totalTFLOPS / WORLD_POP;
                  const phoneEquivPerPerson = perPersonTFLOPS / TFLOPS_PER_PHONE;
                  const worldPhoneTFLOPS = WORLD_PHONES * TFLOPS_PER_PHONE;
                  const aiVsPhonesPct = (totalTFLOPS / worldPhoneTFLOPS) * 100;

                  // Compute growth from timeline
                  const computeTimeline = (data.frontierDCTimeline ?? []).map(d => ({
                    date: d.date,
                    exaflops: Math.round((d.totalH100e * TFLOPS_PER_H100) / 1e6),
                    phonesPerPerson: Math.round(((d.totalH100e * TFLOPS_PER_H100) / WORLD_POP / TFLOPS_PER_PHONE) * 1000) / 1000,
                  })).filter(d => d.exaflops > 0);

                  // Device comparison (sorted by TFLOPS ascending)
                  const devices = [
                    { name: 'Smartwatch', tflops: 0.1, isAI: false },
                    { name: 'Budget phone', tflops: 0.5, isAI: false },
                    { name: '\u2699\uFE0F AI per human', tflops: perPersonTFLOPS, isAI: true },
                    { name: 'Flagship phone', tflops: 2, isAI: false },
                    { name: 'Laptop (M3 Pro)', tflops: 7, isAI: false },
                  ].sort((a, b) => a.tflops - b.tflops);
                  const maxTFLOPS = Math.max(...devices.map(d => d.tflops));

                  return (
                    <div className="space-y-5">
                      {/* ─ Stat cards ─ */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gray-800/60 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-violet-400">{totalExaFLOPS < 100 ? totalExaFLOPS.toFixed(1) : Math.round(totalExaFLOPS).toLocaleString()}</div>
                          <div className="text-xs text-gray-400 mt-1">ExaFLOPS (FP16)</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">operational + planned</div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-cyan-400">{perPersonTFLOPS < 0.01 ? perPersonTFLOPS.toFixed(3) : perPersonTFLOPS.toFixed(2)}</div>
                          <div className="text-xs text-gray-400 mt-1">TFLOPS per human</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">if shared among 8.2B people</div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-amber-400">{phoneEquivPerPerson < 1 ? phoneEquivPerPerson.toFixed(2) : phoneEquivPerPerson.toFixed(1)}</div>
                          <div className="text-xs text-gray-400 mt-1">Equivalent smartphones per human</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">AI DC compute per person = this many phones</div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-emerald-400">{aiVsPhonesPct < 1 ? aiVsPhonesPct.toFixed(2) : aiVsPhonesPct.toFixed(1)}%</div>
                          <div className="text-xs text-gray-400 mt-1">of Total Global Phone Compute</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">AI DCs vs ~4.9B smartphones combined</div>
                        </div>
                      </div>

                      {/* ─ Compute growth chart ─ */}
                      {computeTimeline.length > 1 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-300 mb-3">Total AI frontier data center compute over time (ExaFLOPS, FP16)</h3>
                          <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                              <AreaChart data={computeTimeline} margin={CHART_MARGIN}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString()} />
                                <Tooltip content={<DarkTooltip formatter={(v: number) => `${v.toLocaleString()} ExaFLOPS`} />} wrapperStyle={{ zIndex: 50 }} />
                                <Area type="monotone" dataKey="exaflops" name="ExaFLOPS" stroke="#a855f7" fill="#a855f7" fillOpacity={0.15} strokeWidth={2} />
                                {computeTimeline.length > 15 && (
                                  <Brush dataKey="date" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                                    <AreaChart data={computeTimeline}>
                                      <Area type="monotone" dataKey="exaflops" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} dot={false} strokeWidth={1} />
                                    </AreaChart>
                                  </Brush>
                                )}
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* ─ Device comparison bars ─ */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-3">AI Frontier data center compute per human vs everyday devices (TFLOPS, FP16)</h3>
                        <div className="space-y-2">
                          {devices.map(d => (
                            <div key={d.name} className="flex items-center gap-3">
                              <span className={`text-xs w-36 text-right flex-shrink-0 ${d.isAI ? 'text-amber-400 font-semibold' : 'text-gray-400'}`}>{d.name}</span>
                              <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.max((d.tflops / maxTFLOPS) * 100, 1.5)}%`, backgroundColor: d.isAI ? '#f59e0b' : '#8b5cf6' }} />
                              </div>
                              <span className={`text-xs font-mono w-20 flex-shrink-0 ${d.isAI ? 'text-amber-400' : 'text-gray-400'}`}>{d.tflops < 1 ? d.tflops.toFixed(2) : d.tflops.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Frontier data center compute only (not general AI in phones/laptops). TFLOPS = trillion floating-point operations per second (FP16). H100 SXM at 989 TFLOPS (dense FP16). Includes operational + planned facilities. Smartphone estimate: modern flagship GPU (Apple A18/Snapdragon 8 Gen 3 class). World population ~8.2B (UN 2025); smartphone count ~4.9B (GSMA Intelligence 2025). Source:{" "}
                        <a href="https://epoch.ai/data/data-centers" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Epoch AI</a>{" "}(CC-BY).
                      </p>
                    </div>
                  );
                })()}
              </SectionCard>
              )}

              {data.stats.worldElectricityTWh && (
              <SectionCard icon={<Zap className="h-5 w-5 text-amber-400" />} title="AI Share of World Electricity">
                {(() => {
                  const aiTWh = (data.stats.frontierTotalPowerMW ?? 0) * 8.76 / 1000;
                  const worldTWh = data.stats.worldElectricityTWh;
                  const pct = worldTWh ? (aiTWh / worldTWh) * 100 : 0;
                  const eqCountry = data.stats.equivalentCountry;
                  const comparisons = data.stats.comparisonCountries ?? [];
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gray-800/60 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold font-mono text-amber-400">{pct.toFixed(2)}%</div>
                          <div className="text-xs text-gray-400 mt-1">of World Electricity Generation</div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-emerald-400">{aiTWh.toFixed(1)} TWh</div>
                          <div className="text-xs text-gray-400 mt-1">Frontier AI Data Center Demand</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">annualised from {data.stats.frontierTotalPowerMW?.toLocaleString()} MW capacity</div>
                        </div>
                      </div>
                      {data.frontierDCTimeline?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-3">Power Over Time</h3>
                        <div className="h-[340px] w-full">
                          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <AreaChart data={data.frontierDCTimeline} margin={CHART_MARGIN}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toLocaleString()} MW`} />
                              <Tooltip content={<DarkTooltip formatter={(v: number) => `${v.toLocaleString()} MW`} />} wrapperStyle={{ zIndex: 50 }} />
                              <Area type="monotone" dataKey="totalPowerMW" name="Total Power (MW)" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                              <Brush dataKey="date" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                                <AreaChart data={data.frontierDCTimeline}>
                                  <Area type="monotone" dataKey="totalPowerMW" stroke="#10b981" fill="#10b981" fillOpacity={0.2} dot={false} strokeWidth={1} />
                                </AreaChart>
                              </Brush>
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Cumulative operational power capacity across all tracked frontier data centers.</p>
                      </div>
                      )}
                      {comparisons.length > 0 && (() => {
                        const allRows = [
                          ...comparisons.map(c => ({ name: c.name, twh: c.twh, isAI: false })),
                          { name: '⚡ AI Frontier', twh: aiTWh, isAI: true },
                        ].sort((a, b) => b.twh - a.twh);
                        const maxTWh = Math.max(...allRows.map(r => r.twh));
                        return (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-300 mb-3">For comparison — country electricity generation (TWh)</h3>
                            <div className="space-y-2">
                              {allRows.map(r => (
                                <div key={r.name} className="flex items-center gap-3">
                                  <span className={`text-xs w-28 text-right flex-shrink-0 ${r.isAI ? 'text-amber-400 font-semibold' : 'text-gray-400'}`}>{r.name}</span>
                                  <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${(r.twh / maxTWh) * 100}%`, backgroundColor: r.isAI ? '#f59e0b' : '#10b981' }} />
                                  </div>
                                  <span className={`text-xs font-mono w-20 flex-shrink-0 ${r.isAI ? 'text-amber-400' : 'text-gray-400'}`}>{r.twh.toFixed(1)} TWh</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-xs text-gray-500">
                        Covers only tracked frontier facilities; total AI-related electricity use (including cloud, inference, and smaller facilities) is likely higher. Sources:{" "}
                        <a href="https://epoch.ai/data/data-centers" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Epoch AI</a>{" "}(data centers),{" "}
                        <a href="https://ourworldindata.org/electricity-mix" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Our World in Data</a>{" "}(electricity generation).
                      </p>
                    </div>
                  );
                })()}
              </SectionCard>
              )}

              {/* ═══ INVESTMENT ═══ */}
              <Divider icon={<DollarSign className="h-5 w-5" />} title="Investment" />

              <SectionCard icon={<DollarSign className="h-5 w-5 text-cyan-400" />} title="Global AI Investment">
                <MultiAreaChart data={data.investment} keys={seriesKeys(data.investment)} formatter={formatBillions} />
                <p className="text-xs text-gray-500 mt-4">
                  Total private investment into AI companies raising above $1.5M. Inflation-adjusted (constant 2021 US$). Source:{" "}
                  <a href="https://ourworldindata.org/grapher/private-investment-in-artificial-intelligence" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Quid via AI Index Report
                  </a>{" "}/ Our World in Data.
                  <span className="block mt-1 text-amber-400/80">Data through 2024. Next update expected ~April 2026 (AI Index Report).</span>
                </p>
              </SectionCard>

              {/* ─── Footer attribution ───────────────────────────── */}
              <div className="bg-gray-950/90 backdrop-blur-md p-5 rounded-xl border-2 border-[#88DDFC] text-sm text-gray-400 space-y-1.5">
                <p className="font-semibold text-gray-300">Data sources &amp; attribution:</p>
                <p>• AI models, systems &amp; benchmarks: <a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">Epoch AI</a> and <a href="https://ourworldindata.org/artificial-intelligence" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">Our World in Data</a> (CC-BY)</p>
                <p>• Frontier data centers: <a href="https://epoch.ai/data/data-centers" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">Epoch AI — Frontier Data Centers</a> (CC-BY)</p>
                <p>• Investment: <a href="https://aiindex.stanford.edu/report/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">AI Index Report</a> via <a href="https://ourworldindata.org/artificial-intelligence" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">Our World in Data</a> (CC-BY)</p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
