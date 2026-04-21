"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from 'recharts';
import { Thermometer, Globe2, Loader2, ExternalLink, AlertTriangle, Database, MapPin } from 'lucide-react';
import TemperatureSpaghettiChart from '@/app/_components/temperature-spaghetti-chart';
import { getRegionBySlug } from '@/lib/climate/regions';
import {
  OverviewGrid,
  buildOverviewRow,
  type OverviewPanel,
  type OverviewRow,
} from '../_shared/overview-grid';

// ─── Types ───────────────────────────────────────────────────────────────────

interface YearlyPoint { year: number; anomaly: number; absoluteTemp: number; rollingAvg?: number }
interface LandYearlyPoint { year: number; avgTemp: number; rollingAvg?: number }
interface MonthlyComparisonPoint {
  monthLabel: string;
  month: number;
  year: number;
  recentTemp: number | null;
  historicAvg: number | null;
  diff: number | null;
}
interface LandVsOceanPoint {
  monthLabel: string;
  landTemp: number | null;
  landOceanTemp: number | null;
}
interface RankedStat {
  label: string;
  value: number;
  diff: number | null;
  rank: number;
  total: number;
  recordLabel: string;
  recordValue: number;
}

interface GlobalData {
  yearlyData: YearlyPoint[];
  monthlyComparison: MonthlyComparisonPoint[];
  landYearlyData: LandYearlyPoint[] | null;
  landMonthlyComparison: MonthlyComparisonPoint[] | null;
  landMonthlyAll: { year: number; month: number; value: number }[];
  landLatestMonthStats: RankedStat | null;
  landLatestThreeMonthStats: RankedStat | null;
  landVsOceanMonthly: LandVsOceanPoint[] | null;
  noaaStats?: {
    landOcean: { yearly: LandYearlyPoint[]; latestMonthStats: RankedStat | null; latestThreeMonthStats: RankedStat | null };
    land:      { yearly: LandYearlyPoint[]; latestMonthStats: RankedStat | null; latestThreeMonthStats: RankedStat | null };
    ocean:     { yearly: LandYearlyPoint[]; latestMonthStats: RankedStat | null; latestThreeMonthStats: RankedStat | null };
  };
  globalBaseline: number;
  globalLandBaseline?: number;
  globalOceanBaseline?: number;
  preIndustrialBaseline: number;
  keyThresholds: { plus1_5: number; plus2_0: number };
  lastUpdated: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}`;
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

type SummaryResponse = {
  summary: string | null;
  sources?: { title: string; uri: string }[];
  generatedAt?: string;
  source?: string;
  message?: string;
  retryable?: boolean;
};

function highlightRankings(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sup = 'warmest|coldest|hottest|coolest|wettest|driest|sunniest|highest|lowest|fewest|most|least';
  const supNoMost = 'warmest|coldest|hottest|coolest|wettest|driest|sunniest|highest|lowest|fewest|least';
  const wordOrd = 'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth';
  const w = `(?:\\s+(?!on\\s+record|in\\s+\\d|of\\s+\\d+\\s*year|of\\s+\\d+[.,°]|at\\s+\\d|with\\s+\\d|averaging\\s)(?:[a-zA-Z][a-zA-Z'\\u2019-]*|\\d+[-\\u2013]\\w+))*`;
  const rec = '(?:\\s+(?:on record|in \\d+ years?(?:\\s+of records?)?|of \\d+ years?(?:\\s+on record)?))?';
  const p1 = `(?:\\d+(?:st|nd|rd|th)|${wordOrd})\\s+(?:${sup})\\b${w}${rec}`;
  const p2 = `the\\s+(?:${supNoMost})\\b${w}\\s+(?:on record|in \\d+ years?(?:\\s+of records?)?|of \\d+ years?(?:\\s+on record)?)`;
  const pattern = new RegExp(`\\b(${p1}|${p2})`, 'gi');
  return escaped.replace(pattern, (m) => `<strong style="color:#fff">${m}</strong>`);
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function GlobalProfile() {
  const region = getRegionBySlug('global')!;
  const [data, setData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gemini summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summarySources, setSummarySources] = useState<{ title: string; uri: string }[]>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryRetryable, setSummaryRetryable] = useState(false);

  const fetchSummary = async (forceFresh = false) => {
    setSummaryLoading(true);
    setSummary(null);
    setSummarySources([]);
    setSummaryError(null);
    setSummaryRetryable(false);
    try {
      const url = `/api/climate/summary/global?_t=${Date.now()}${forceFresh ? '&nocache=1' : ''}`;
      const res = await fetch(url);
      const payload: SummaryResponse | null = await res.json().catch(() => null);
      if (payload?.summary) {
        setSummary(payload.summary);
        setSummarySources(payload.sources || []);
        return;
      }
      setSummaryError(
        payload?.message || 'The AI-generated global climate update is temporarily unavailable. The underlying data below is still live.'
      );
      setSummaryRetryable(payload?.retryable ?? payload?.source !== 'no-key');
    } catch {
      setSummaryError('The AI-generated global climate update could not be loaded right now.');
      setSummaryRetryable(true);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/climate/global?_t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load global climate data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    void fetchSummary();
    return () => { cancelled = true; };
  }, []);

  // Derived values
  const latestYearly = data?.yearlyData && data.yearlyData.length
    ? data.yearlyData[data.yearlyData.length - 1]
    : null;

  const rolling10yr = latestYearly?.rollingAvg ?? null;

  const vsPreIndustrial = rolling10yr != null && data
    ? rolling10yr - data.preIndustrialBaseline
    : null;

  const latestMonth = data?.monthlyComparison && data.monthlyComparison.length
    ? [...data.monthlyComparison].reverse().find((p) => p.recentTemp != null) ?? null
    : null;

  const updateLabel = (() => {
    if (!latestMonth) return null;
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${names[latestMonth.month - 1]} ${latestMonth.year}`;
  })();

  const combinedTitle = `Global Climate${updateLabel ? ` – ${updateLabel} Update` : ''}`;
  const h1SizeClass =
    combinedTitle.length > 38 ? 'text-xl md:text-2xl' :
    combinedTitle.length > 28 ? 'text-2xl md:text-3xl' :
    'text-3xl md:text-5xl';

  // Yearly chart: show 1950-present
  const yearlyChartData = useMemo(() => {
    if (!data?.yearlyData?.length) return [];
    return data.yearlyData.filter((p) => p.year >= 1950).map((p) => ({
      year: p.year,
      absoluteTemp: p.absoluteTemp,
      rollingAvg: p.rollingAvg ?? null,
    }));
  }, [data]);

  const yearMin = yearlyChartData.length ? yearlyChartData[0].year : 1950;
  const yearMax = yearlyChartData.length ? yearlyChartData[yearlyChartData.length - 1].year : 2026;

  // Build the overview panel (month / 3-month / year) — three NOAA rows so
  // rankings match what NOAA and Copernicus publish in press releases.
  const overviewPanels = useMemo<OverviewPanel[]>(() => {
    if (!data?.noaaStats) return [];
    const { landOcean, land, ocean } = data.noaaStats;
    const rows: OverviewRow[] = [];
    const landRow = buildOverviewRow('Global Land', land.yearly, land.latestMonthStats ?? undefined, land.latestThreeMonthStats ?? undefined, '°C', 1, false, false);
    const oceanRow = buildOverviewRow('Global Ocean', ocean.yearly, ocean.latestMonthStats ?? undefined, ocean.latestThreeMonthStats ?? undefined, '°C', 1, false, false);
    const landOceanRow = buildOverviewRow('Global Land + Ocean', landOcean.yearly, landOcean.latestMonthStats ?? undefined, landOcean.latestThreeMonthStats ?? undefined, '°C', 1, false, true);
    if (landRow) rows.push(landRow);
    if (oceanRow) rows.push(oceanRow);
    if (landOceanRow) rows.push(landOceanRow);
    if (!rows.length) return [];
    return [{
      title: 'Temperature — Average (NOAA)',
      icon: <Thermometer className="text-orange-400" />,
      accentClass: 'bg-orange-600',
      accentBg: 'bg-orange-600/50',
      accentBorder: 'border-orange-400/80',
      sections: [{ rows }],
    }];
  }, [data]);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Hero */}
          <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className={`${h1SizeClass} font-bold font-mono tracking-wide leading-tight`} style={{ color: '#FFF5E7' }}>
                {combinedTitle}
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-4">
              <div className="inline-flex items-start gap-2 mb-3 px-3 py-2 rounded-lg border border-[#D0A65E]/30 bg-[#D0A65E]/5">
                <MapPin className="h-4 w-4 text-[#D0A65E] mt-0.5 shrink-0" />
                <p className="text-xs md:text-sm font-medium text-[#D0A65E]">
                  <span className="font-semibold">Coverage:</span> Whole Earth — land and ocean surface temperature
                </p>
              </div>

              {summary ? (
                <div>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    {summary.split('\n\n').map((para, i) => (
                      <p key={i} dangerouslySetInnerHTML={{ __html: highlightRankings(para) }} />
                    ))}
                  </div>
                  {summarySources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-800">
                      <p className="text-gray-600 text-xs mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {summarySources.map((s, i) => (
                          <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-[#D0A65E] transition-colors">
                            {s.title} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-gray-600 text-xs mt-2 italic">Generated by Gemini from climate data and web sources</p>
                </div>
              ) : summaryLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#D0A65E] shrink-0" />
                  <p className="text-sm text-gray-400">Generating global climate update…</p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3">
                  <p className="text-sm font-medium text-amber-200">Global climate update temporarily unavailable</p>
                  <p className="mt-1 text-sm text-gray-300">{summaryError || 'The AI-generated update is temporarily unavailable. The measured global climate data below is still live.'}</p>
                  {summaryRetryable && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => void fetchSummary(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D0A65E]/40 bg-[#D0A65E]/10 px-3 py-2 text-sm font-semibold text-[#D0A65E] transition-colors hover:bg-[#D0A65E]/20 hover:text-[#E8C97A]"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                  <p className="mt-3 text-sm text-gray-400">{region.tagline}</p>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E] text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#D0A65E] mx-auto mb-3" />
              <p className="text-gray-400">Loading global climate data…</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border-2 border-red-900/60">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-red-200">Global climate data unavailable</h3>
                  <p className="mt-1 text-sm text-gray-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {data && !loading && !error && (
            <>
              {/* Overview table: month / 3-month / year — matches country & region pages */}
              {overviewPanels.length > 0 && (
                <>
                  <Divider icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Global Temperature — At a Glance" />
                  <OverviewGrid panels={overviewPanels} />
                </>
              )}

              {/* Paris Agreement tracker — 10-year mean vs pre-industrial (WMO/IPCC methodology) */}
              {rolling10yr != null && vsPreIndustrial != null && (() => {
                const pct15 = Math.min(100, Math.max(0, (vsPreIndustrial / 1.5) * 100));
                const pct20 = Math.min(100, Math.max(0, (vsPreIndustrial / 2.0) * 100));
                const latestYearValue = latestYearly?.absoluteTemp ?? null;
                const latestYearDelta = latestYearValue != null ? latestYearValue - data.preIndustrialBaseline : null;
                const decadeStart = (latestYearly?.year ?? 0) - 9;
                const decadeEnd = latestYearly?.year ?? 0;
                const atOrPast15 = vsPreIndustrial >= 1.5;
                return (
                  <div className="bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Paris Agreement Tracker</p>
                        <h3 className="text-lg md:text-xl font-bold text-white mt-1">How close are we to 1.5°C and 2°C?</h3>
                      </div>
                      <div className="text-right">
                        <p className={`text-4xl md:text-5xl font-bold font-mono ${atOrPast15 ? 'text-red-300' : 'text-orange-300'}`}>
                          {formatSigned(vsPreIndustrial)}°C
                        </p>
                        <p className="text-xs text-gray-400">above pre-industrial</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 mt-3">
                      Earth&apos;s surface is currently <span className="font-semibold text-white">{vsPreIndustrial.toFixed(2)}°C</span> warmer than the pre-industrial (1850–1900) average, based on the 10-year mean for <span className="font-semibold text-white">{decadeStart}–{decadeEnd}</span>. Climate scientists use a decade average rather than a single year to smooth out natural variability (El Niño, volcanoes) and define long-term warming, in line with <a href="https://wmo.int/news/media-centre/wmo-confirms-2024-warmest-year-record-about-155degc-above-pre-industrial-level" target="_blank" rel="noopener noreferrer" className="underline text-[#D0A65E] hover:text-[#E8C97A]">WMO</a> and <a href="https://www.ipcc.ch/sr15/chapter/spm/" target="_blank" rel="noopener noreferrer" className="underline text-[#D0A65E] hover:text-[#E8C97A]">IPCC AR6</a> methodology.
                    </p>

                    {/* 1.5°C progress bar */}
                    <div className="mt-5">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold text-white">Paris 1.5°C limit</span>
                        <span className={`font-mono ${atOrPast15 ? 'text-red-300' : 'text-orange-300'}`}>{pct15.toFixed(0)}% of the way there</span>
                      </div>
                      <div className="mt-1.5 h-3 rounded-full bg-gray-800 overflow-hidden ring-1 ring-gray-700">
                        <div
                          className={`h-full rounded-full ${atOrPast15 ? 'bg-red-400' : 'bg-orange-400'}`}
                          style={{ width: `${pct15}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        1.5°C ≈ {data.keyThresholds.plus1_5.toFixed(1)}°C absolute · aspirational lower limit agreed at COP21 Paris (2015)
                      </p>
                    </div>

                    {/* 2.0°C progress bar */}
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold text-white">Paris 2.0°C upper bound</span>
                        <span className="font-mono text-amber-300">{pct20.toFixed(0)}% of the way there</span>
                      </div>
                      <div className="mt-1.5 h-3 rounded-full bg-gray-800 overflow-hidden ring-1 ring-gray-700">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct20}%` }} />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        2.0°C ≈ {data.keyThresholds.plus2_0.toFixed(1)}°C absolute · dangerous-warming ceiling; every 0.1°C above 1.5°C measurably worsens heatwaves, sea-level rise and ecosystem loss
                      </p>
                    </div>

                    {/* Secondary stats */}
                    <div className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Most recent full year ({decadeEnd})</p>
                        <p className="font-mono text-white mt-0.5">
                          {latestYearDelta != null ? formatSigned(latestYearDelta) : '—'}°C <span className="text-gray-500 font-sans">above pre-industrial</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">10-year mean ({decadeStart}–{decadeEnd})</p>
                        <p className="font-mono text-white mt-0.5">
                          {rolling10yr.toFixed(2)}°C absolute <span className="text-gray-500 font-sans">({formatSigned(vsPreIndustrial)}°C anomaly)</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Spaghetti chart */}
              {data.landMonthlyAll?.length > 0 && (
                <>
                  <Divider icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Year-on-Year — Global Land" />
                  <div className="bg-gray-950/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                    <TemperatureSpaghettiChart
                      monthlyAll={data.landMonthlyAll}
                      regionName="Global Land"
                      dataSource="Our World in Data / ERA5"
                    />
                  </div>
                </>
              )}

              {/* Yearly trend chart */}
              {yearlyChartData.length > 0 && (
                <>
                  <Divider icon={<Globe2 className="h-5 w-5 text-orange-400" />} title="Long-Term Temperature Trend" />
                  <div className="bg-gray-950/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                    <h3 className="text-base font-semibold text-white mb-1">Global Land+Ocean absolute temperature, {yearMin}–{yearMax}</h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Annual average (thin line) with a 10-year rolling mean (thick line). Horizontal lines mark the Paris 1.5°C and 2.0°C thresholds above pre-industrial.
                    </p>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} />
                          <YAxis
                            stroke="#9CA3AF"
                            fontSize={11}
                            domain={['dataMin - 0.2', 'dataMax + 0.2']}
                            tickFormatter={(v) => `${v.toFixed(1)}°C`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8 }}
                            labelStyle={{ color: '#FFF5E7' }}
                            formatter={(v: any) => typeof v === 'number' ? `${v.toFixed(2)}°C` : '—'}
                          />
                          <Legend wrapperStyle={{ color: '#D1D5DB', fontSize: 12 }} />
                          <ReferenceLine y={data.keyThresholds.plus1_5} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '+1.5°C Paris', fill: '#fca5a5', fontSize: 10, position: 'insideTopRight' }} />
                          <ReferenceLine y={data.keyThresholds.plus2_0} stroke="#b91c1c" strokeDasharray="4 4" label={{ value: '+2.0°C Paris', fill: '#fecaca', fontSize: 10, position: 'insideTopRight' }} />
                          <ReferenceLine y={data.preIndustrialBaseline} stroke="#60a5fa" strokeDasharray="2 2" label={{ value: 'Pre-industrial', fill: '#93c5fd', fontSize: 10, position: 'insideBottomRight' }} />
                          <Line type="monotone" dataKey="absoluteTemp" name="Annual mean" stroke="#fb923c" strokeWidth={1} dot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="rollingAvg" name="10-year rolling" stroke="#fbbf24" strokeWidth={3} dot={false} connectNulls isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* Monthly comparison — last 12 months (land+ocean) */}
              {data.monthlyComparison?.length > 0 && (
                <>
                  <Divider icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Last 12 Months vs 1961–1990" />
                  <div className="bg-gray-950/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                    <p className="text-xs text-gray-400 mb-4">
                      Each bar is the difference between that month&rsquo;s global land+ocean temperature and the 1961–1990 average for the same month. Red bars are warmer than baseline, blue are cooler.
                    </p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.monthlyComparison} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="monthLabel" stroke="#9CA3AF" fontSize={10} interval={0} angle={-30} textAnchor="end" height={60} />
                          <YAxis
                            stroke="#9CA3AF"
                            fontSize={11}
                            tickFormatter={(v) => `${formatSigned(v, 1)}°C`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8 }}
                            formatter={(v: any) => typeof v === 'number' ? `${formatSigned(v)}°C` : '—'}
                          />
                          <ReferenceLine y={0} stroke="#6B7280" />
                          <Bar dataKey="diff" name="Anomaly vs 1961–1990">
                            {data.monthlyComparison.map((p, i) => (
                              <Cell key={i} fill={p.diff == null ? '#4b5563' : p.diff > 0 ? '#fb923c' : '#60a5fa'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* Land vs Ocean */}
              {data.landVsOceanMonthly && data.landVsOceanMonthly.length > 0 && (
                <>
                  <Divider icon={<Globe2 className="h-5 w-5 text-orange-400" />} title="Land vs Land+Ocean — Last 12 Months" />
                  <div className="bg-gray-950/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                    <p className="text-xs text-gray-400 mb-4">
                      Land surfaces warm roughly twice as fast as the ocean. This chart compares the global land-only temperature (ERA5, via Our World in Data) against the combined land+ocean series (NOAA) for each of the last 12 months.
                    </p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.landVsOceanMonthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="monthLabel" stroke="#9CA3AF" fontSize={10} angle={-30} textAnchor="end" height={60} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickFormatter={(v) => `${v.toFixed(1)}°C`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8 }}
                            formatter={(v: any) => typeof v === 'number' ? `${v.toFixed(2)}°C` : '—'}
                          />
                          <Legend wrapperStyle={{ color: '#D1D5DB', fontSize: 12 }} />
                          <Line type="monotone" dataKey="landTemp" name="Land only (ERA5)" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="landOceanTemp" name="Land + Ocean (NOAA)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* Context + Sources */}
              <Divider icon={<Database className="h-5 w-5 text-[#D0A65E]" />} title="Context & Sources" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-950/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                  <h3 className="text-base font-bold text-white mb-2">What the baselines mean</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li><strong className="text-[#FFF5E7]">1961–1990 baseline</strong> — the WMO standard reference period used for monthly and quarterly anomalies on this site. It brackets the relatively stable mid-20th-century climate.</li>
                    <li><strong className="text-[#FFF5E7]">Pre-industrial (1850–1900)</strong> ~{data.preIndustrialBaseline.toFixed(1)}°C absolute — the reference point for the Paris Agreement&rsquo;s 1.5°C and 2.0°C temperature limits.</li>
                    <li><strong className="text-[#FFF5E7]">20th-century mean</strong> {data.globalBaseline}°C — the long-run average NOAA uses when reporting anomalies for individual months or years.</li>
                  </ul>
                </div>
                <div className="bg-gray-950/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                  <h3 className="text-base font-bold text-white mb-2">Sources</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>
                      <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/1/0/1950-2026" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:text-[#E8C97A] inline-flex items-center gap-1">
                        NOAA Climate at a Glance — Global Land+Ocean <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-xs text-gray-500 mt-0.5">Monthly and yearly anomalies vs the 20th-century mean, 1850–present.</p>
                    </li>
                    <li>
                      <a href="https://ourworldindata.org/grapher/temperature-anomaly" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:text-[#E8C97A] inline-flex items-center gap-1">
                        Our World in Data — Global temperature anomaly <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-xs text-gray-500 mt-0.5">ERA5 reanalysis land surface temperature used for the land-only series.</p>
                    </li>
                    <li>
                      <a href="https://www.ipcc.ch/report/ar6/syr/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:text-[#E8C97A] inline-flex items-center gap-1">
                        IPCC AR6 Synthesis Report <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-xs text-gray-500 mt-0.5">The scientific basis for the 1.5°C and 2.0°C warming thresholds referenced above.</p>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Cross-links */}
              <div className="bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                <h2 className="text-lg font-bold font-mono text-white mb-2 flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-[#D0A65E]" />
                  Zoom in — country & regional updates
                </h2>
                <p className="text-sm text-gray-400 mb-4 max-w-3xl">
                  Global figures hide huge regional variation: the Arctic is warming about four times faster than the global mean, and heat extremes are outpacing rainfall change across much of the tropics and mid-latitudes. Dive into individual profiles:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { slug: 'usa', label: 'United States' },
                    { slug: 'china', label: 'China' },
                    { slug: 'india', label: 'India' },
                    { slug: 'brazil', label: 'Brazil' },
                    { slug: 'uk', label: 'United Kingdom' },
                    { slug: 'germany', label: 'Germany' },
                    { slug: 'australia', label: 'Australia' },
                    { slug: 'california', label: 'California' },
                    { slug: 'texas', label: 'Texas' },
                  ].map((c) => (
                    <Link
                      key={c.slug}
                      href={`/climate/${c.slug}`}
                      className="inline-flex items-center h-8 rounded-full border border-gray-800 bg-gray-900/45 px-3 text-[13px] text-gray-300 transition-colors hover:border-[#D0A65E]/45 hover:bg-white/[0.03] hover:text-[#FFF5E7]"
                    >
                      {c.label} →
                    </Link>
                  ))}
                  <Link
                    href="/climate"
                    className="inline-flex items-center h-8 rounded-full border border-[#D0A65E]/55 bg-[#D0A65E]/10 px-3 text-[13px] font-semibold text-[#FFF5E7] transition-colors hover:bg-[#D0A65E]/20"
                  >
                    Browse all regions →
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* SEO footer */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-lg font-bold font-mono text-white mb-3">About this page</h2>
            <div className="text-sm text-gray-400 space-y-3 max-w-3xl">
              <p>
                {region.description}
              </p>
              <p>
                For local context covering a specific country, US state or UK region, see the full
                {' '}
                <Link href="/climate" className="text-[#D0A65E] hover:text-[#E8C97A]">Climate Updates index</Link>
                . For the real-time interactive dashboard with every chart, visit the
                {' '}
                <Link href="/climate-dashboard" className="text-[#D0A65E] hover:text-[#E8C97A]">Climate Dashboard</Link>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
