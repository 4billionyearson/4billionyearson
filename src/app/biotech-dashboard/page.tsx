"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush, Cell,
} from "recharts";
import {
  Loader2, Dna, Activity, FlaskConical,
  FileText, MapPin,
} from "lucide-react";
import DiseaseOutbreakMap, { type DiseaseOutbreak } from "../_components/disease-outbreak-map";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface BiotechDashboardData {
  genomeCost: Record<string, number>[];
  clinicalTrials: { category: string; count: number }[];
  pubmedCounts: { category: string; count: number }[];
  crisprYearTrend: { year: number; count: number }[];
  stats: {
    genomeCost: number;
    genomeCostYear: number;
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


const SERIES_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#a855f7", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6", "#8b5cf6"];
const BAR_GRADIENT = [
  "#ef4444", "#f87171", "#fb923c", "#fbbf24", "#facc15",
  "#a3e635", "#4ade80", "#34d399", "#2dd4bf", "#22d3ee",
];

const DISEASE_COLOR_MAP: [string, string][] = [
  ["influenza", "#dc2626"], ["ebola", "#f97316"], ["marburg", "#ea580c"],
  ["mers", "#ef4444"], ["sars", "#ef4444"], ["covid", "#ef4444"],
  ["mpox", "#a855f7"], ["nipah", "#eab308"], ["cholera", "#3b82f6"],
  ["measles", "#06b6d4"], ["polio", "#14b8a6"], ["zika", "#84cc16"],
  ["dengue", "#facc15"], ["plague", "#78716c"], ["yellow fever", "#eab308"],
  ["meningococcal", "#8b5cf6"], ["lassa", "#fb923c"], ["hepatitis", "#f59e0b"],
];
function getDiseaseColor(disease: string) {
  const l = disease.toLowerCase();
  for (const [k, c] of DISEASE_COLOR_MAP) if (l.includes(k)) return c;
  return "#6b7280";
}

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
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
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
  if (!data.length) return <p className="text-gray-400 text-sm">No data available.</p>;
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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

interface OutbreakData {
  outbreaks: DiseaseOutbreak[];
  stats: { totalRecentOutbreaks: number; countriesAffected: number; diseasesTracked: number };
  fetchedAt: string;
}

export default function BiotechDashboardPage() {
  const [data, setData] = useState<BiotechDashboardData | null>(null);
  const [outbreakData, setOutbreakData] = useState<OutbreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/biotech").then(r => r.json()),
      fetch("/api/disease-outbreaks").then(r => r.json()).catch(() => null),
    ])
      .then(([biotech, outbreaks]) => {
        if (biotech.error) throw new Error(biotech.error);
        setData(biotech);
        if (outbreaks && !outbreaks.error) setOutbreakData(outbreaks);
      })
      .catch(e => setError(e.message || "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Hero ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border-2 border-[#FFF5E7] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #FFF5E7 0%, #FFF5E7 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: "#FFF5E7" }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: "#D26742" }}>
                Biotechnology
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Genome sequencing costs, clinical trials, CRISPR research, and biotech publication trends.
              </p>
            </div>
          </div>

          {/* ─── Loading / Error ───────────────────────────────────── */}
          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#FFF5E7] flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-amber-300" />
              <p className="text-gray-400">Fetching biotech data...</p>
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
                  <span className="ml-auto text-xs text-gray-400">
                    Updated {new Date(data.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="Genome Sequencing Cost"
                    value={formatDollars(data.stats.genomeCost)}
                    color="text-green-400"
                    subtext={`As of ${data.stats.genomeCostYear}`}
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
                  <StatCard
                    label="WHO Outbreak Alerts"
                    value={outbreakData ? outbreakData.stats.totalRecentOutbreaks.toLocaleString() : "—"}
                    color="text-red-400"
                    subtext={outbreakData ? `Across ${outbreakData.stats.countriesAffected} countries (past year)` : "Loading…"}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Sources:{" "}
                  <a href="https://www.genome.gov/about-genomics/fact-sheets/Sequencing-Human-Genome-cost" target="_blank" rel="noopener noreferrer" className="text-[#FFF5E7]/70 hover:underline">NIH NHGRI</a>{" "}
                  (sequencing cost) ·{" "}
                  <a href="https://clinicaltrials.gov/" target="_blank" rel="noopener noreferrer" className="text-[#FFF5E7]/70 hover:underline">ClinicalTrials.gov</a>{" "}
                  (CRISPR &amp; gene therapy trials) ·{" "}
                  <a href="https://www.who.int/emergencies/disease-outbreak-news" target="_blank" rel="noopener noreferrer" className="text-[#FFF5E7]/70 hover:underline">WHO DON</a>{" "}
                  (outbreak alerts).
                </p>
              </div>

              {/* ═══ GENOMICS & BIOTECHNOLOGY ═══ */}
              <Divider icon={<Dna className="h-5 w-5" />} title="Genomics &amp; Biotechnology" />

              {data.genomeCost.length > 0 && (() => {
                // Pre-transform data to log10 for Brush child (avoids YAxis conflict)
                const keys = seriesKeys(data.genomeCost);
                const logData = data.genomeCost.map(row => {
                  const out: Record<string, number> = { year: row.year };
                  for (const k of keys) if (row[k] != null && row[k] > 0) out[k] = Math.log10(row[k]);
                  return out;
                });
                return (
              <SectionCard icon={<Dna className="h-5 w-5 text-green-400" />} title="Cost to Sequence a Human Genome">
                <div className="h-[380px] w-full relative">
                  <div className="absolute top-0 left-0 text-[11px] font-semibold" style={{ color: '#A99B8D' }}>$100M</div>
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <LineChart data={data.genomeCost} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
                      <YAxis scale="log" domain={['auto', 'auto']} tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} tickFormatter={formatDollars} allowDataOverflow />
                      <Tooltip content={<DarkTooltip formatter={formatDollars} />} />
                      <Legend wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                      {keys.map((k, i) => (
                        <Line key={k} type="monotone" dataKey={k} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                      ))}
                      <Brush dataKey="year" height={BRUSH_HEIGHT} stroke={ACCENT} fill="#111" travellerWidth={10}>
                        <LineChart data={logData}>
                          <YAxis hide domain={[2, 9]} yAxisId="brushY" />
                          {keys.map((k, i) => (
                            <Line key={k} type="monotone" dataKey={k} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} dot={false} strokeWidth={1} yAxisId="brushY" />
                          ))}
                        </LineChart>
                      </Brush>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Cost of sequencing a complete human genome, from $100M in 2001 to under $1,000 today — outpacing Moore&rsquo;s Law. Logarithmic scale. Source:{" "}
                  <a href="https://ourworldindata.org/grapher/cost-of-sequencing-a-full-human-genome" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    NHGRI via Our World in Data
                  </a>.
                </p>
              </SectionCard>
              );
              })()}

              {data.clinicalTrials.length > 0 && (
              <SectionCard icon={<FlaskConical className="h-5 w-5 text-violet-400" />} title="Clinical Trials by Therapy Type">
                <SimpleBarChart data={data.clinicalTrials} categoryKey="category" valueKey="count" barColor="#a855f7" />
                <p className="text-xs text-gray-400 mt-4">
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
                <p className="text-xs text-gray-400 mt-4">
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
                <p className="text-xs text-gray-400 mt-4">
                  Total publications indexed in PubMed for key biotechnology research areas: gene therapy, CRISPR, genomics, and mRNA vaccines. Source:{" "}
                  <a href="https://pubmed.ncbi.nlm.nih.gov" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    PubMed / NCBI
                  </a>.
                </p>
              </SectionCard>
              )}

              {outbreakData && outbreakData.outbreaks.length > 0 && (
              <>
              <Divider icon={<MapPin className="h-4 w-4 text-red-400" />} title="Disease Outbreaks" />

              <SectionCard icon={<MapPin className="h-5 w-5 text-red-400" />} title="WHO Disease Outbreak Map">
                <DiseaseOutbreakMap outbreaks={outbreakData.outbreaks} />
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                  {outbreakData.outbreaks.map((o, i) => (
                    <a
                      key={i}
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 p-2 bg-gray-800/60 rounded-lg hover:bg-gray-700/60 transition-colors group"
                    >
                      <span className="shrink-0 mt-0.5 h-2.5 w-2.5 rounded-full" style={{ background: getDiseaseColor(o.disease) }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate group-hover:text-[#FFF5E7]">{o.disease}</p>
                        <p className="text-[10px] text-gray-400 truncate">{o.country} · {new Date(o.date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p>
                      </div>
                    </a>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Recent disease outbreak alerts worldwide (past 12 months), deduplicated by disease and country. Source:{" "}
                  <a href="https://www.who.int/emergencies/disease-outbreak-news" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    WHO Disease Outbreak News
                  </a>.
                </p>
              </SectionCard>
              </>
              )}


            </>
          )}
        </div>
      </div>
    </main>
  );
}
