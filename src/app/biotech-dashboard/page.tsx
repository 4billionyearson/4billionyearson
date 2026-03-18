"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush, Cell,
} from "recharts";
import {
  Loader2, Dna, Heart, Syringe, Activity, FlaskConical,
  HeartPulse, FileText, DollarSign, TrendingDown, Globe,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface BiotechDashboardData {
  genomeCost: Record<string, number>[];
  lifeExpectancy: Record<string, number>[];
  cancerPrevalence: Record<string, number>[];
  cancerDeathRate: Record<string, number>[];
  dtp3Vaccination: Record<string, number>[];
  healthcareSpending: Record<string, number>[];
  topHealthSpenders: { name: string; value: number; year: number }[];
  childMortality: Record<string, number>[];
  hivPrevalence: Record<string, number>[];
  malariaDeathRate: Record<string, number>[];
  clinicalTrials: { category: string; count: number }[];
  pubmedCounts: { category: string; count: number }[];
  crisprYearTrend: { year: number; count: number }[];
  stats: {
    latestYear: number;
    genomeCost: number;
    genomeCostYear: number;
    globalLifeExpectancy: number;
    totalCrisprTrials: number;
    totalGeneTherapyTrials: number;
  };
  fetchedAt: string;
}

/* ─── Chart config ────────────────────────────────────────────────────────── */

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;
const ACCENT = "#FFF5E7";

const formatDollars = (v: number) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
};

const formatCompact = (v: number) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
};

const formatPct = (v: number) => `${v.toFixed(1)}%`;

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
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
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
      <div className="h-px bg-[#FFF5E7]/30 flex-1" />
      <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#FFF5E7]/50 shadow-lg">
        {icon} {title}
      </h2>
      <div className="h-px bg-[#FFF5E7]/30 flex-1" />
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

function MultiAreaChart({ data, keys, formatter }: {
  data: Record<string, number>[];
  keys: string[];
  formatter?: (v: number) => string;
}) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data available.</p>;
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k} id={`bio-grad-${k.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} />
          <Legend wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              fill={`url(#bio-grad-${k.replace(/\s+/g, '-')})`}
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

function MultiLineChart({ data, keys, formatter }: {
  data: Record<string, number>[];
  keys: string[];
  formatter?: (v: number) => string;
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

/* ─── Horizontal bar chart ────────────────────────────────────────────────── */

function HorizontalBarChart({ data, dataKey, formatter }: {
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

/* ─── Simple vertical bar chart ───────────────────────────────────────────── */

function SimpleBarChart({ data, categoryKey, valueKey, formatter, barColor }: {
  data: Record<string, any>[];
  categoryKey: string;
  valueKey: string;
  formatter?: (v: number) => string;
  barColor?: string;
}) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data available.</p>;
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={categoryKey} tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatter || formatCompact} />
          <Tooltip content={<DarkTooltip formatter={formatter} />} />
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={barColor || BAR_GRADIENT[i % BAR_GRADIENT.length]} />
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

export default function BiotechDashboardPage() {
  const [data, setData] = useState<BiotechDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/biotech")
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
          <div className="rounded-2xl border-2 border-[#FFF5E7] shadow-xl overflow-hidden">
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: "#FFF5E7" }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: "#1a1a2e" }}>
                Biotech &amp; Global Health
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Genome sequencing costs, clinical trials, life expectancy, vaccination coverage, disease burden, and healthcare spending worldwide.
              </p>
            </div>
          </div>

          {/* ─── Loading / Error ───────────────────────────────────── */}
          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#FFF5E7] flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-amber-300" />
              <p className="text-gray-400">Fetching biotech &amp; health data...</p>
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
              <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#FFF5E7] p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-amber-300 animate-pulse" />
                  <h2 className="text-lg font-bold font-mono text-white">Key Facts</h2>
                  <span className="ml-auto text-xs text-gray-600">
                    Updated {new Date(data.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="Genome Sequencing Cost"
                    value={formatDollars(data.stats.genomeCost)}
                    color="text-green-400"
                    subtext={`As of ${data.stats.genomeCostYear}`}
                  />
                  <StatCard
                    label="Global Life Expectancy"
                    value={data.stats.globalLifeExpectancy.toFixed(1)}
                    unit="years"
                    color="text-cyan-400"
                    subtext={`${data.stats.latestYear}`}
                  />
                  <StatCard
                    label="CRISPR Clinical Trials"
                    value={data.stats.totalCrisprTrials.toLocaleString()}
                    color="text-violet-400"
                    subtext="Registered on ClinicalTrials.gov"
                  />
                  <StatCard
                    label="Gene Therapy Trials"
                    value={data.stats.totalGeneTherapyTrials.toLocaleString()}
                    color="text-amber-400"
                    subtext="Registered on ClinicalTrials.gov"
                  />
                </div>
              </div>

              {/* ═══ GENOMICS & BIOTECHNOLOGY ═══ */}
              <Divider icon={<Dna className="h-5 w-5" />} title="Genomics &amp; Biotechnology" />

              {data.genomeCost.length > 0 && (
              <SectionCard icon={<Dna className="h-5 w-5 text-green-400" />} title="Cost to Sequence a Human Genome">
                <MultiLineChart data={data.genomeCost} keys={seriesKeys(data.genomeCost)} formatter={formatDollars} />
                <p className="text-xs text-gray-500 mt-4">
                  Cost of sequencing a complete human genome, from $100M in 2001 to under $1,000 today — outpacing Moore&rsquo;s Law. Source:{" "}
                  <a href="https://ourworldindata.org/grapher/cost-of-sequencing-a-full-human-genome" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    NHGRI via Our World in Data
                  </a>.
                </p>
              </SectionCard>
              )}

              {data.clinicalTrials.length > 0 && (
              <SectionCard icon={<FlaskConical className="h-5 w-5 text-violet-400" />} title="Clinical Trials by Therapy Type">
                <SimpleBarChart data={data.clinicalTrials} categoryKey="category" valueKey="count" barColor="#a855f7" />
                <p className="text-xs text-gray-500 mt-4">
                  Total number of registered clinical trials on{" "}
                  <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    ClinicalTrials.gov
                  </a>
                  {" "}for key biotech therapeutic approaches. Counts include all phases and statuses.
                </p>
              </SectionCard>
              )}

              {data.crisprYearTrend.length > 0 && (
              <SectionCard icon={<Dna className="h-5 w-5 text-emerald-400" />} title="CRISPR Publications Per Year">
                <SimpleBarChart data={data.crisprYearTrend} categoryKey="year" valueKey="count" barColor="#10b981" />
                <p className="text-xs text-gray-500 mt-4">
                  Annual CRISPR-related publications indexed in PubMed, showing the explosion of research since the 2012 breakthrough. Source:{" "}
                  <a href="https://pubmed.ncbi.nlm.nih.gov" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    PubMed / NCBI
                  </a>.
                </p>
              </SectionCard>
              )}

              {data.pubmedCounts.length > 0 && (
              <SectionCard icon={<FileText className="h-5 w-5 text-sky-400" />} title="Biotech Research Publications (All Time)">
                <SimpleBarChart data={data.pubmedCounts} categoryKey="category" valueKey="count" barColor="#0ea5e9" />
                <p className="text-xs text-gray-500 mt-4">
                  Total publications indexed in PubMed for key biotechnology research areas: gene therapy, CRISPR, genomics, and mRNA vaccines.
                </p>
              </SectionCard>
              )}

              {/* ═══ LIFE EXPECTANCY & MORTALITY ═══ */}
              <Divider icon={<HeartPulse className="h-5 w-5" />} title="Life Expectancy &amp; Mortality" />

              {data.lifeExpectancy.length > 0 && (
              <SectionCard icon={<Heart className="h-5 w-5 text-rose-400" />} title="Life Expectancy at Birth">
                <MultiLineChart data={data.lifeExpectancy} keys={seriesKeys(data.lifeExpectancy)} formatter={(v) => `${v.toFixed(1)} yr`} />
                <p className="text-xs text-gray-500 mt-4">
                  Life expectancy at birth by country. Source:{" "}
                  <a href="https://ourworldindata.org/life-expectancy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    UN World Population Prospects via Our World in Data
                  </a>.
                </p>
              </SectionCard>
              )}

              {data.childMortality.length > 0 && (
              <SectionCard icon={<TrendingDown className="h-5 w-5 text-blue-400" />} title="Under-5 Mortality Rate">
                <MultiLineChart data={data.childMortality} keys={seriesKeys(data.childMortality)} formatter={(v) => `${v.toFixed(1)}`} />
                <p className="text-xs text-gray-500 mt-4">
                  Deaths of children under five years old per 1,000 live births. One of the most important indicators of global health progress. Source: UN IGME / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.hivPrevalence.length > 0 && (
              <SectionCard icon={<Activity className="h-5 w-5 text-red-400" />} title="People Living with HIV">
                <MultiAreaChart data={data.hivPrevalence} keys={seriesKeys(data.hivPrevalence)} />
                <p className="text-xs text-gray-500 mt-4">
                  Estimated number of people living with HIV worldwide. Source: UNAIDS / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.malariaDeathRate.length > 0 && (
              <SectionCard icon={<TrendingDown className="h-5 w-5 text-teal-400" />} title="Malaria Death Rate">
                <MultiLineChart data={data.malariaDeathRate} keys={seriesKeys(data.malariaDeathRate)} />
                <p className="text-xs text-gray-500 mt-4">
                  Age-standardized death rate from malaria per 100,000 population. Source: IHME / Our World in Data.
                </p>
              </SectionCard>
              )}

              {/* ═══ CANCER ═══ */}
              <Divider icon={<Activity className="h-5 w-5" />} title="Cancer" />

              {data.cancerPrevalence.length > 0 && (
              <SectionCard icon={<Activity className="h-5 w-5 text-orange-400" />} title="Cancer Prevalence">
                <MultiLineChart data={data.cancerPrevalence} keys={seriesKeys(data.cancerPrevalence)} formatter={formatPct} />
                <p className="text-xs text-gray-500 mt-4">
                  Share of population with cancer (all forms), by country. Source: IHME Global Burden of Disease / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.cancerDeathRate.length > 0 && (
              <SectionCard icon={<TrendingDown className="h-5 w-5 text-red-400" />} title="Cancer Death Rate">
                <MultiLineChart data={data.cancerDeathRate} keys={seriesKeys(data.cancerDeathRate)} />
                <p className="text-xs text-gray-500 mt-4">
                  Age-standardized death rate from cancer per 100,000 population. Source: IHME / Our World in Data.
                </p>
              </SectionCard>
              )}

              {/* ═══ VACCINATION & PUBLIC HEALTH ═══ */}
              <Divider icon={<Syringe className="h-5 w-5" />} title="Vaccination &amp; Public Health" />

              {data.dtp3Vaccination.length > 0 && (
              <SectionCard icon={<Syringe className="h-5 w-5 text-blue-400" />} title="DTP3 Vaccination Coverage">
                <MultiLineChart data={data.dtp3Vaccination} keys={seriesKeys(data.dtp3Vaccination)} formatter={formatPct} />
                <p className="text-xs text-gray-500 mt-4">
                  Share of one-year-olds who have received three doses of the combined DTP vaccine (diphtheria, tetanus, pertussis). Source: WHO / Our World in Data.
                </p>
              </SectionCard>
              )}

              {/* ═══ HEALTHCARE SPENDING ═══ */}
              <Divider icon={<DollarSign className="h-5 w-5" />} title="Healthcare Spending" />

              {data.healthcareSpending.length > 0 && (
              <SectionCard icon={<DollarSign className="h-5 w-5 text-green-400" />} title="Healthcare Spending (% of GDP)">
                <MultiLineChart data={data.healthcareSpending} keys={seriesKeys(data.healthcareSpending)} formatter={formatPct} />
                <p className="text-xs text-gray-500 mt-4">
                  Total healthcare expenditure as a share of GDP. Source: WHO Global Health Expenditure Database / Our World in Data.
                </p>
              </SectionCard>
              )}

              {data.topHealthSpenders.length > 0 && (
              <SectionCard icon={<Globe className="h-5 w-5 text-amber-400" />} title="Top 10 Countries by Healthcare Spending (% GDP)">
                <HorizontalBarChart data={data.topHealthSpenders} dataKey="spending" formatter={formatPct} />
                <p className="text-xs text-gray-500 mt-4">
                  Countries with the highest share of GDP allocated to healthcare. Source: WHO / Our World in Data.
                </p>
              </SectionCard>
              )}

              {/* ─── Footer attribution ───────────────────────────── */}
              <div className="text-center text-xs text-gray-600 pt-4">
                Data from{" "}
                <a href="https://ourworldindata.org" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                  Our World in Data
                </a>
                {" "}(IHME, WHO, UNAIDS, NHGRI),{" "}
                <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                  ClinicalTrials.gov
                </a>
                , and{" "}
                <a href="https://pubmed.ncbi.nlm.nih.gov" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                  PubMed/NCBI
                </a>
                . Licensed under CC BY 4.0.
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
