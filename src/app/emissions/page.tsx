"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush, Cell,
} from "recharts";
import { Loader2, Activity, Factory, TrendingUp, Globe, Users, Link2, MapPin } from "lucide-react";

const EmissionsChoroplethMap = dynamic(() => import("@/app/_components/emissions-choropleth-map"), {
  ssr: false,
  loading: () => <div className="h-[400px] md:h-[500px] w-full rounded-xl bg-gray-900/50 animate-pulse" />,
});

const EmissionsCountryPanel = dynamic(() => import("./EmissionsCountryPanel"), {
  ssr: false,
  loading: () => <div className="h-48 w-full rounded-2xl bg-gray-900/50 border-2 border-[#D0A65E]/40 animate-pulse" />,
});

const GlobalFuelSection = dynamic(
  () => import("./_components/fuel-chart").then(m => ({ default: m.GlobalFuelSection })),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full rounded-xl bg-gray-900/50 animate-pulse" />,
  }
);

const GlobalConsumptionSection = dynamic(
  () => import("./_components/consumption-chart").then(m => ({ default: m.GlobalConsumptionSection })),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full rounded-xl bg-gray-900/50 animate-pulse" />,
  }
);

const GlobalGhgSection = dynamic(
  () => import("./_components/ghg-budget").then(m => ({ default: m.GlobalGhgSection })),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full rounded-xl bg-gray-900/50 animate-pulse" />,
  }
);

const CarbonBudgetSection = dynamic(
  () => import("./_components/ghg-budget").then(m => ({ default: m.CarbonBudgetSection })),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full rounded-xl bg-gray-900/50 animate-pulse" />,
  }
);

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface RankEntry { name: string; value: number; year: number }
interface YearlyPoint { year: number; value: number }

interface EmissionsData {
  top10Annual: RankEntry[];
  top10PerCapita: RankEntry[];
  top10Cumulative: RankEntry[];
  worldAnnual: YearlyPoint[];
  worldCumulative: YearlyPoint[];
  top5History: Record<string, number>[];
  top5Names: string[];
  countryMapData: Record<string, { annual: number; perCapita: number }>;
  stats: {
    latestAnnual: number;
    latestAnnualYear: number;
    latestCumulative: number;
    latestCumulativeYear: number;
    topEmitter: string;
    topEmitterValue: number;
    topPerCapita: string;
    topPerCapitaValue: number;
  };
  fetchedAt: string;
}

/* ─── Chart config ────────────────────────────────────────────────────────── */

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;

const formatYAxis = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(0)}B`
  : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M`
  : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K`
  : String(v);

const formatTonnes = (v: number) => {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Tt`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Bt`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} Mt`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} Kt`;
  return `${v.toFixed(0)} t`;
};

const TOP5_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#a855f7"];
const BAR_GRADIENT = [
  "#ef4444", "#f87171", "#fb923c", "#fbbf24", "#facc15",
  "#a3e635", "#4ade80", "#34d399", "#2dd4bf", "#22d3ee",
];

/* ─── Tooltips ────────────────────────────────────────────────────────────── */

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="text-sm">
          {p.name}: {typeof p.value === "number" ? formatTonnes(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const PerCapTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="text-sm">
          {p.name}: {typeof p.value === "number" ? `${p.value.toFixed(1)} t/person` : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── Layout Components ───────────────────────────────────────────────────── */

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

/* ─── Top 10 Bar Chart ────────────────────────────────────────────────────── */

function Top10BarChart({ data, dataKey, tooltip }: {
  data: RankEntry[];
  dataKey: string;
  tooltip: React.ComponentType<any>;
}) {
  const chartData = data.map((d) => ({ name: d.name, [dataKey]: d.value }));
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#D3C8BB" }} tickLine={false} axisLine={false} />
          <Tooltip content={React.createElement(tooltip)} />
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

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function EmissionsPage() {
  const [data, setData] = useState<EmissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/climate/emissions")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message || "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Hero + Country Deep Dive (combined) ──────────────── */}
          {/* No overflow-hidden here — the search dropdown inside the
              EmissionsCountryPanel needs to escape the wrapper's bounds.
              Rounded corners are applied to the inner header & body so the
              hero still looks clipped. */}
          <div className="relative z-20 rounded-2xl border-2 border-[#D0A65E] shadow-xl">
            <div className="px-4 py-3 md:px-6 md:py-4 rounded-t-2xl" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
                CO₂ Emissions
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4 space-y-4 rounded-b-2xl">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Tracking who emits the most CO₂, how emissions have changed over time, and the cumulative burden each country carries.
              </p>
              <div className="h-px bg-[#D0A65E]/30" />
              <EmissionsCountryPanel embedded worldAnnual={data?.worldAnnual} />
            </div>
          </div>

          {/* ─── Loading / Error ───────────────────────────────────── */}
          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#D0A65E] flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-red-400" />
              <p className="text-gray-400">Fetching emissions data from Our World in Data...</p>
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
              <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D0A65E] p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                  <h2 className="text-lg font-bold font-mono text-white">Key Facts ({data.stats.latestAnnualYear})</h2>
                  <span className="ml-auto text-xs text-gray-400">
                    Updated {new Date(data.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="Global Annual CO₂"
                    value={formatTonnes(data.stats.latestAnnual)}
                    unit=""
                    subtext={`Total in ${data.stats.latestAnnualYear}`}
                    color="text-red-400"
                  />
                  <StatCard
                    label="Top Emitter"
                    value={data.stats.topEmitter}
                    unit=""
                    subtext={formatTonnes(data.stats.topEmitterValue)}
                    color="text-orange-400"
                  />
                  <StatCard
                    label="Highest Per Capita"
                    value={data.stats.topPerCapita}
                    unit=""
                    subtext={`${data.stats.topPerCapitaValue.toFixed(1)} t/person`}
                    color="text-amber-400"
                  />
                  <StatCard
                    label="Cumulative CO₂"
                    value={formatTonnes(data.stats.latestCumulative)}
                    unit=""
                    subtext="All-time total"
                    color="text-yellow-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Source:{" "}
                  <a href="https://ourworldindata.org/co2-emissions" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a>{" "}
                  / <a href="https://globalcarbonproject.org/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Global Carbon Project</a>.
                </p>
              </div>

              {/* ═══ EMISSIONS MAP ═══ */}
              {data.countryMapData && Object.keys(data.countryMapData).length > 0 && (
              <SectionCard icon={<MapPin className="h-5 w-5 text-red-400" />} title="Global CO₂ Emissions Map">
                <EmissionsChoroplethMap countryMapData={data.countryMapData} />
                <p className="text-xs text-gray-400 mt-4">
                  Hover over any country to see its emissions. Toggle between per-capita and total annual views. Source:{" "}
                  <a href="https://github.com/owid/co2-data" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                    Global Carbon Project
                  </a>{" "}
                  via Our World in Data ({data.stats.latestAnnualYear}).
                </p>
              </SectionCard>
              )}

              {/* ═══ TOP EMITTERS ═══ */}
              <Divider icon={<Factory className="h-5 w-5" />} title="Top Emitters" />

              {/* ── Top 10 Annual ── */}
              <SectionCard icon={<Factory className="h-5 w-5 text-red-400" />} title="Top 10 Annual CO₂ Emitters">
                <Top10BarChart data={data.top10Annual} dataKey="annual" tooltip={DarkTooltip} />
                <p className="text-xs text-gray-400 mt-4">
                  The top 10 countries produce over two-thirds of global annual CO₂ emissions. Source:{" "}
                  <a href="https://ourworldindata.org/co2-emissions" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Our World in Data</a>{" "}– Global Carbon Project.
                </p>
              </SectionCard>

              {/* ── Top 10 Per Capita ── */}
              <SectionCard icon={<Users className="h-5 w-5 text-amber-400" />} title="Top 10 Emitters Per Capita">
                <Top10BarChart data={data.top10PerCapita} dataKey="perCapita" tooltip={PerCapTooltip} />
                <p className="text-xs text-gray-400 mt-4">
                  Per-capita figures highlight small, fossil-fuel-rich nations - the biggest absolute emitters often rank lower here. Source:{" "}
                  <a href="https://ourworldindata.org/per-capita-co2" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Our World in Data</a>{" "}– Global Carbon Project.
                </p>
              </SectionCard>

              {/* ── Top 10 Cumulative ── */}
              <SectionCard icon={<TrendingUp className="h-5 w-5 text-yellow-400" />} title="Top 10 Cumulative CO₂ Emitters">
                <Top10BarChart data={data.top10Cumulative} dataKey="cumulative" tooltip={DarkTooltip} />
                <p className="text-xs text-gray-400 mt-4">
                  CO₂ persists for centuries, so early-industrialised nations carry a disproportionate share of the total warming burden. Source:{" "}
                  <a href="https://ourworldindata.org/contributed-most-global-co2" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Our World in Data</a>{" "}– Global Carbon Project.
                </p>
              </SectionCard>

              {/* ═══ BY FUEL SOURCE ═══ */}
              <Divider icon={<Factory className="h-5 w-5" />} title="How Are We Emitting?" />

              <SectionCard icon={<Factory className="h-5 w-5 text-orange-400" />} title="Global CO₂ by Fuel Source">
                <GlobalFuelSection />
              </SectionCard>

              <SectionCard icon={<Link2 className="h-5 w-5 text-sky-400" />} title="Consumption vs Production - Who Emits for Whom?">
                <GlobalConsumptionSection />
              </SectionCard>

              {/* ═══ BEYOND CO₂ ═══ */}
              <Divider icon={<Activity className="h-5 w-5" />} title="Beyond CO₂" />

              <SectionCard icon={<Activity className="h-5 w-5 text-orange-400" />} title="All Greenhouse Gases - Methane & N₂O">
                <GlobalGhgSection />
              </SectionCard>

              <SectionCard icon={<Activity className="h-5 w-5 text-[#D0A65E]" />} title="Carbon Budget Countdown">
                <CarbonBudgetSection />
              </SectionCard>

              {/* ═══ GLOBAL TRENDS ═══ */}
              <Divider icon={<Globe className="h-5 w-5" />} title="Global Trends" />

              {/* ── Global Annual ── */}
              <SectionCard icon={<TrendingUp className="h-5 w-5 text-red-400" />} title="Global Annual CO₂ Emissions">
                <div className="h-[380px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.worldAnnual} margin={CHART_MARGIN}>
                      <defs>
                        <linearGradient id="grad-annual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
                      <Tooltip content={<DarkTooltip />} />
                      <Legend iconType="plainline" wrapperStyle={{ color: "#D3C8BB", fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                      <Area type="monotone" dataKey="value" name="Global CO₂ (tonnes)" stroke="#ef4444" strokeWidth={2}
                        fill="url(#grad-annual)" dot={false} />
                      <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                        <AreaChart data={data.worldAnnual}>
                          <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} dot={false} strokeWidth={1} />
                        </AreaChart>
                      </Brush>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  To limit warming to 1.5 °C, global emissions must roughly halve by 2030 and reach net zero by 2050. Source:{" "}
                  <a href="https://ourworldindata.org/co2-emissions" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Our World in Data</a>{" "}– Global Carbon Project.
                </p>
              </SectionCard>

              {/* ── Top 5 Country Comparison Over Time ── */}
              {data.top5History.length > 0 && (
                <SectionCard icon={<Factory className="h-5 w-5 text-orange-400" />} title="Top 5 Emitters Over Time">
                  <div className="h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.top5History} margin={CHART_MARGIN}>
                        <defs>
                          {data.top5Names.map((name, i) => (
                            <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={TOP5_COLORS[i]} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={TOP5_COLORS[i]} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
                        <Tooltip content={<DarkTooltip />} />
                        <Legend iconType="plainline" wrapperStyle={{ color: "#D3C8BB", fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                        {data.top5Names.map((name, i) => (
                          <Area
                            key={name}
                            type="monotone"
                            dataKey={name}
                            name={name}
                            stroke={TOP5_COLORS[i]}
                            strokeWidth={2}
                            fill={`url(#grad-${i})`}
                            dot={false}
                          />
                        ))}
                        <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                          <AreaChart data={data.top5History}>
                            <Area type="monotone" dataKey={data.top5Names[0]} stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} dot={false} strokeWidth={1} />
                          </AreaChart>
                        </Brush>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    How the biggest emitters have evolved since 1950, showing shifting patterns of industrial development. Source:{" "}
                    <a href="https://ourworldindata.org/co2-emissions" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Our World in Data</a>{" "}– Global Carbon Project.
                  </p>
                </SectionCard>
              )}

              {/* ── Global Cumulative ── */}
              <SectionCard icon={<Globe className="h-5 w-5 text-yellow-400" />} title="Cumulative Global CO₂ Emissions">
                <div className="h-[380px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.worldCumulative} margin={CHART_MARGIN}>
                      <defs>
                        <linearGradient id="grad-cumul" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
                      <Tooltip content={<DarkTooltip />} />
                      <Legend iconType="plainline" wrapperStyle={{ color: "#D3C8BB", fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                      <Area type="monotone" dataKey="value" name="Cumulative CO₂ (tonnes)" stroke="#eab308" strokeWidth={2}
                        fill="url(#grad-cumul)" dot={false} />
                      <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                        <AreaChart data={data.worldCumulative}>
                          <Area type="monotone" dataKey="value" stroke="#eab308" fill="#eab308" fillOpacity={0.2} dot={false} strokeWidth={1} />
                        </AreaChart>
                      </Brush>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Cumulative CO₂ determines long-term warming &ndash; even if emissions stopped today, existing CO₂ would warm the planet for centuries. Source:{" "}
                  <a href="https://ourworldindata.org/contributed-most-global-co2" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Our World in Data</a>{" "}– Global Carbon Project.
                </p>
              </SectionCard>
              
            </>
          )}
        </div>
      </div>
    </main>
  );
}
