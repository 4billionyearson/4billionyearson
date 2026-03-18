"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush, Cell,
} from "recharts";
import {
  Loader2, Brain, DollarSign, TrendingUp, Building2, Users,
  Cpu, Globe, FileText, Scale, BarChart3, Activity,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AIDashboardData {
  investment: Record<string, number>[];
  genAiInvestment: Record<string, number>[];
  corporateDeals: Record<string, number>[];
  newCompanies: Record<string, number>[];
  companyAdoption: Record<string, number>[];
  jobPostings: Record<string, number>[];
  devsUsingAi: Record<string, number>[];
  nvidiaRevenue: Record<string, number>[];
  dataCenterSpend: Record<string, number>[];
  aiSystemsPerYear: Record<string, number>[];
  aiSystemsByCountry: Record<string, number>[];
  publications: Record<string, number>[];
  topPatents: { name: string; value: number; year: number }[];
  patentMapData: Record<string, number>;
  aiBills: Record<string, number>[];
  topBills: { name: string; value: number; year: number }[];
  testScores: Record<string, number>[];
  stats: {
    latestYear: number;
    globalInvestment: number;
    usInvestment: number;
    topPatentCountry: string;
    topPatentCount: number;
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
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
};

const formatPct = (v: number) => `${v.toFixed(0)}%`;

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
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
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
      <ResponsiveContainer width="100%" height="100%">
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
          <Tooltip content={<DarkTooltip formatter={formatter} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
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
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
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

function StackedBarChart({ data, keys, formatter }: {
  data: Record<string, number>[];
  keys: string[];
  formatter?: (v: number) => string;
}) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data available.</p>;
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="1" fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
          {data.length > 15 && <Brush dataKey="year" height={BRUSH_HEIGHT} stroke={ACCENT} fill="#111" travellerWidth={10} />}
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
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#D3C8BB" }} tickLine={false} axisLine={false} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} />
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
                AI Industry &amp; Research
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Tracking global AI investment, company adoption, research output, compute growth, and regulation.
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
                  <h2 className="text-lg font-bold font-mono text-white">Key Facts ({data.stats.latestYear})</h2>
                  <span className="ml-auto text-xs text-gray-600">
                    Updated {new Date(data.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="Global AI Investment"
                    value={formatBillions(data.stats.globalInvestment)}
                    color="text-cyan-400"
                    subtext={`Total in ${data.stats.latestYear}`}
                  />
                  <StatCard
                    label="US Share"
                    value={formatBillions(data.stats.usInvestment)}
                    color="text-blue-400"
                    subtext="United States"
                  />
                  <StatCard
                    label="Top Patent Country"
                    value={data.stats.topPatentCountry}
                    color="text-amber-400"
                    subtext={`${data.stats.topPatentCount.toLocaleString()} applications`}
                  />
                  <StatCard
                    label="Data Year"
                    value={String(data.stats.latestYear)}
                    color="text-green-400"
                    subtext="Latest available"
                  />
                </div>
              </div>

              {/* ═══ INVESTMENT ═══ */}
              <Divider icon={<DollarSign className="h-5 w-5" />} title="Investment" />

              <SectionCard icon={<DollarSign className="h-5 w-5 text-cyan-400" />} title="Global AI Investment">
                <MultiAreaChart data={data.investment} keys={seriesKeys(data.investment)} formatter={formatBillions} />
                <p className="text-xs text-gray-500 mt-4">
                  Total private investment into AI companies raising above $1.5M. Inflation-adjusted (constant 2021 US$). Source:{" "}
                  <a href="https://ourworldindata.org/grapher/private-investment-in-artificial-intelligence" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Quid via AI Index Report
                  </a>{" "}/ Our World in Data.
                </p>
              </SectionCard>

              {data.genAiInvestment.length > 0 && (
              <SectionCard icon={<TrendingUp className="h-5 w-5 text-violet-400" />} title="Generative AI Investment">
                <MultiAreaChart data={data.genAiInvestment} keys={seriesKeys(data.genAiInvestment)} formatter={formatBillions} />
                <p className="text-xs text-gray-500 mt-4">
                  Investment into privately held generative AI companies specifically. Source: Quid via AI Index Report / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.corporateDeals.length > 0 && (
              <SectionCard icon={<Building2 className="h-5 w-5 text-orange-400" />} title="Corporate AI Deals by Type">
                <StackedBarChart data={data.corporateDeals} keys={seriesKeys(data.corporateDeals)} formatter={formatBillions} />
                <p className="text-xs text-gray-500 mt-4">
                  Annual corporate finance transactions involving AI companies: mergers &amp; acquisitions, private investment, public offerings, and minority stakes.
                </p>
              </SectionCard>
              )}

              {data.newCompanies.length > 0 && (
              <SectionCard icon={<Building2 className="h-5 w-5 text-emerald-400" />} title="Newly-Funded AI Companies">
                <MultiLineChart data={data.newCompanies} keys={seriesKeys(data.newCompanies)} />
                <p className="text-xs text-gray-500 mt-4">
                  Number of newly-funded AI companies by region per year.
                </p>
              </SectionCard>
              )}

              {/* ═══ ADOPTION & WORKFORCE ═══ */}
              <Divider icon={<Users className="h-5 w-5" />} title="Adoption &amp; Workforce" />

              {data.companyAdoption.length > 0 && (
              <SectionCard icon={<Building2 className="h-5 w-5 text-blue-400" />} title="Company AI Adoption">
                <MultiLineChart data={data.companyAdoption} keys={seriesKeys(data.companyAdoption)} formatter={formatPct} />
                <p className="text-xs text-gray-500 mt-4">
                  Share of companies using AI technology, by region. Source: McKinsey via AI Index Report / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.jobPostings.length > 0 && (
              <SectionCard icon={<Users className="h-5 w-5 text-amber-400" />} title="AI Job Postings Share">
                <MultiLineChart data={data.jobPostings} keys={seriesKeys(data.jobPostings)} formatter={formatPct} />
                <p className="text-xs text-gray-500 mt-4">
                  Share of all job postings that mention artificial intelligence, by country.
                </p>
              </SectionCard>
              )}

              {data.devsUsingAi.length > 0 && (
              <SectionCard icon={<Cpu className="h-5 w-5 text-violet-400" />} title="Developers Using AI Tools">
                <MultiLineChart data={data.devsUsingAi} keys={seriesKeys(data.devsUsingAi)} formatter={formatPct} />
                <p className="text-xs text-gray-500 mt-4">
                  Share of professional software developers using AI coding tools. Source: Stack Overflow Developer Survey / Our World in Data.
                </p>
              </SectionCard>
              )}

              {/* ═══ INFRASTRUCTURE ═══ */}
              <Divider icon={<Cpu className="h-5 w-5" />} title="Infrastructure" />

              {data.nvidiaRevenue.length > 0 && (
              <SectionCard icon={<Cpu className="h-5 w-5 text-green-400" />} title="NVIDIA Quarterly Revenue">
                <StackedBarChart data={data.nvidiaRevenue} keys={seriesKeys(data.nvidiaRevenue)} formatter={formatBillions} />
                <p className="text-xs text-gray-500 mt-4">
                  NVIDIA&rsquo;s quarterly revenue by market segment, showing the explosion in data center / AI chip demand.
                </p>
              </SectionCard>
              )}

              {data.dataCenterSpend.length > 0 && (
              <SectionCard icon={<Building2 className="h-5 w-5 text-sky-400" />} title="US Data Center Construction Spend">
                <MultiAreaChart data={data.dataCenterSpend} keys={seriesKeys(data.dataCenterSpend)} formatter={formatBillions} />
                <p className="text-xs text-gray-500 mt-4">
                  Monthly spending on data center construction in the United States. Source: US Census Bureau / Our World in Data.
                </p>
              </SectionCard>
              )}

              {/* ═══ AI MODELS & CAPABILITIES ═══ */}
              <Divider icon={<Brain className="h-5 w-5" />} title="Models &amp; Capabilities" />

              {data.aiSystemsPerYear.length > 0 && (
              <SectionCard icon={<Brain className="h-5 w-5 text-violet-400" />} title="AI Systems Released Per Year">
                <StackedBarChart data={data.aiSystemsPerYear} keys={seriesKeys(data.aiSystemsPerYear)} />
                <p className="text-xs text-gray-500 mt-4">
                  Number of large-scale AI systems released per year, by domain (language, vision, multimodal, etc.). Source: Epoch AI / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.aiSystemsByCountry.length > 0 && (
              <SectionCard icon={<Globe className="h-5 w-5 text-blue-400" />} title="Cumulative AI Systems by Country">
                <MultiAreaChart data={data.aiSystemsByCountry} keys={seriesKeys(data.aiSystemsByCountry)} stacked />
                <p className="text-xs text-gray-500 mt-4">
                  Cumulative number of large-scale AI systems by country of origin since 2017. Source: Epoch AI / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.testScores.length > 0 && (
              <SectionCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} title="AI Performance vs Human Baseline">
                <MultiLineChart data={data.testScores} keys={seriesKeys(data.testScores)} />
                <p className="text-xs text-gray-500 mt-4">
                  AI test scores on various capabilities relative to human performance (0 = human level). Domains where the line crosses zero indicate AI has matched human performance. Source: Kiela et al. / Our World in Data.
                </p>
              </SectionCard>
              )}

              {/* ═══ RESEARCH & REGULATION ═══ */}
              <Divider icon={<FileText className="h-5 w-5" />} title="Research &amp; Regulation" />

              {data.publications.length > 0 && (
              <SectionCard icon={<FileText className="h-5 w-5 text-sky-400" />} title="AI Scholarly Publications">
                <MultiAreaChart data={data.publications} keys={seriesKeys(data.publications)} />
                <p className="text-xs text-gray-500 mt-4">
                  Annual scholarly publications on artificial intelligence by country. Source: AI Index Report / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.topPatents.length > 0 && (
              <SectionCard icon={<FileText className="h-5 w-5 text-amber-400" />} title="Top 10 Countries by AI Patents">
                <Top10BarChart data={data.topPatents} dataKey="patents" />
                <p className="text-xs text-gray-500 mt-4">
                  AI patent applications filed by country. Source: CSET / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.topBills.length > 0 && (
              <SectionCard icon={<Scale className="h-5 w-5 text-rose-400" />} title="Top Countries by AI Laws Passed">
                <Top10BarChart data={data.topBills} dataKey="bills" />
                <p className="text-xs text-gray-500 mt-4">
                  Cumulative number of AI-related bills passed into law by country. Source: OECD via AI Index Report / Our World in Data.
                </p>
              </SectionCard>
              )}

              {/* ─── Footer attribution ───────────────────────────── */}
              <div className="text-center text-xs text-gray-600 pt-4">
                Data from{" "}
                <a href="https://ourworldindata.org/artificial-intelligence" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                  Our World in Data
                </a>
                {" "}(Epoch AI, AI Index Report, CSET). Licensed under{" "}
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">CC BY 4.0</a>.
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
