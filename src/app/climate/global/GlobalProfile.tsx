"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend, BarChart, Bar, Cell, ComposedChart,
} from 'recharts';
import { Thermometer, Globe2, Loader2, ExternalLink, AlertTriangle, Database, Wind, Info, BookOpen, Scale, Factory, Leaf, ArrowRight, Ruler } from 'lucide-react';
import TemperatureSpaghettiChart from '@/app/_components/temperature-spaghetti-chart';
import SeasonTimelineGraphic from '@/app/_components/season-timeline-graphic';
import { getRegionBySlug } from '@/lib/climate/regions';
import {
  OverviewGrid,
  buildOverviewRow,
  type OverviewPanel,
  type OverviewRow,
} from '../_shared/overview-grid';
import { EnsoCard, GhgTile, SeaIceTile, ContinentalBar, WhatChangedTile } from './ClimateSystemsPanel';
import GlobalRankingsTeaser from '@/app/_components/global-rankings-teaser';
import AnomalyMapCard from './AnomalyMapCard';
import EmissionsCard from '@/app/_components/emissions-card';
import EnergyMixCard from '@/app/_components/energy-mix-card';
import { renderWithDriverTooltips, relabelSummaryHeading } from '@/lib/climate/driver-annotator';

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
  landOceanMonthlyAll?: { year: number; month: number; value: number }[];
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
  enso?: {
    state: 'El Niño' | 'La Niña' | 'Neutral';
    strength: string;
    anomaly: number;
    season: string;
    seasonYear: number;
    history: { season: string; year: number; anom: number }[];
  } | null;
  ghgStats?: {
    co2: GhgStat | null;
    ch4: GhgStat | null;
    n2o: GhgStat | null;
  } | null;
  seaIceStats?: {
    label: string;
    baseline: string;
    unit: string;
    latest: { year: number; month: number; extent: number };
    climatology: number;
    anomaly: number;
    anomalyPct: number | null;
    rankLowestOfSameMonth: number;
    totalYearsInMonth: number;
    recent60: { year: number; month: number; extent: number }[];
  } | null;
  continentStats?: { key: string; label: string; latest: { year: number; month: number; anomaly: number } | null }[] | null;
  countryAnomalies?: {
    iso3: string;
    name: string;
    anomaly: number;
    value: number;
    monthLabel: string;
    rank: number;
    total: number;
    anomaly1m?: number | null;
    label1m?: string | null;
    anomaly3m?: number | null;
    label3m?: string | null;
    anomaly12m?: number | null;
    label12m?: string | null;
  }[] | null;
  previousLatestMonthStats?: {
    landOcean?: RankedStat | null;
    land?: RankedStat | null;
    ocean?: RankedStat | null;
  } | null;
}

interface GhgStat {
  label: string;
  unit: string;
  latest: { year: number; month: number; value: number };
  yoy: { absolute: number | null; pct: number | null } | null;
  tenYr: { absolute: number | null; pct: number | null } | null;
  preindustrial: number;
  vsPreindustrialPct: number | null;
  sparkline: { year: number; month: number; value: number }[];
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

/**
 * Calendar-year timeline showing two concrete Northern-Hemisphere shifts:
 * see `season-timeline-graphic.tsx` (shared with the country/state/region
 * seasonal-shift card and the main /climate/shifting-seasons page).
 */

function RelatedLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="relative block rounded-xl border border-gray-700/50 bg-gray-900 hover:bg-gray-800 hover:border-gray-600 p-4 transition-all shadow-md"
    >
      <ExternalLink className="absolute top-3 right-3 w-3.5 h-3.5 text-cyan-400" />
      <div className="font-semibold text-white text-sm pr-5">{label}</div>
      <div className="text-xs text-gray-300 mt-1">{desc}</div>
    </Link>
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

function pathLabel(path: string): string {
  const p = path.toLowerCase();
  if (p === '/extreme-weather') return 'Extreme Weather tracker';
  if (p === '/emissions') return 'Emissions dashboard';
  if (p === '/energy-dashboard') return 'Energy dashboard';
  if (p === '/greenhouse-gases') return 'Greenhouse Gases';
  if (p === '/sea-levels-ice') return 'Sea Levels & Ice';
  if (p === '/planetary-boundaries') return 'Planetary Boundaries';
  if (p === '/climate-dashboard') return 'Climate dashboard';
  if (p === '/climate/rankings') return 'climate rankings';
  if (p === '/climate/global') return 'Global climate page';
  if (p === '/climate/enso') return 'ENSO tracker';
  if (p === '/climate/shifting-seasons') return 'Shifting Seasons';
  if (p.startsWith('/climate/')) return 'climate page';
  return path;
}

function linkifyPaths(html: string): string {
  return html.replace(
    /(^|[\s(—–−])(\/(?:extreme-weather|emissions|energy-dashboard|climate\/[a-z0-9-]+|greenhouse-gases|sea-levels-ice|planetary-boundaries|climate-dashboard|climate\/rankings))(?=[\s).,;:—–−]|$)/gi,
    (_m, lead, path) =>
      `${lead}<a href="${path}" class="border-b border-dotted border-teal-300/60 text-teal-300 hover:text-teal-200 hover:border-teal-200 transition-colors">${pathLabel(path)}</a>`,
  );
}

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
  return linkifyPaths(escaped.replace(pattern, (m) => `<strong style="color:#fff">${m}</strong>`));
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

  // Combined last-12-months anomaly chart: bars for land+ocean, overlaid
  // line for land-only — so the user can directly see that land warms
  // faster than the combined series, using a single vs-1961-1990 axis.
  const monthlyAnomalyCombined = useMemo(() => {
    const lo = data?.monthlyComparison ?? [];
    if (!lo.length) return [];
    const landByLabel = new Map<string, number | null>();
    for (const p of data?.landMonthlyComparison ?? []) {
      landByLabel.set(p.monthLabel, p.diff ?? null);
    }
    return lo.map((p) => ({
      monthLabel: p.monthLabel,
      landOcean: p.diff ?? null,
      land: landByLabel.get(p.monthLabel) ?? null,
    }));
  }, [data]);

  // Build the overview panel (month / 3-month / year) - three NOAA rows so
  // rankings match what NOAA and Copernicus publish in press releases.
  const overviewPanels = useMemo<OverviewPanel[]>(() => {
    if (!data?.noaaStats) return [];
    const { landOcean, land, ocean } = data.noaaStats;
    const rows: OverviewRow[] = [];
    const landRow = buildOverviewRow('Land', land.yearly, land.latestMonthStats ?? undefined, land.latestThreeMonthStats ?? undefined, '°C', 1, false, false);
    const oceanRow = buildOverviewRow('Ocean', ocean.yearly, ocean.latestMonthStats ?? undefined, ocean.latestThreeMonthStats ?? undefined, '°C', 1, false, false);
    const landOceanRow = buildOverviewRow('Land + Ocean', landOcean.yearly, landOcean.latestMonthStats ?? undefined, landOcean.latestThreeMonthStats ?? undefined, '°C', 1, false, true);
    if (landRow) rows.push(landRow);
    if (oceanRow) rows.push(oceanRow);
    if (landOceanRow) rows.push(landOceanRow);
    if (!rows.length) return [];
    return [{
      title: 'Temperature - Average (NOAA)',
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
              <GlobalRankingsTeaser />

              {summary ? (
                <div>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    {summary.split('\n\n').map((para, i) => {
                      const trimmed = para.trim();
                      const headingMatch = trimmed.match(/^##\s+(.+?)(?:\n([\s\S]*))?$/);
                      if (headingMatch) {
                        const heading = relabelSummaryHeading(headingMatch[1].trim());
                        const body = (headingMatch[2] || '').trim();
                        return (
                          <div key={i} className="space-y-1.5">
                            <h3 className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-[#D0A65E]">{heading}</h3>
                            {body && <p>{renderWithDriverTooltips(body, highlightRankings)}</p>}
                          </div>
                        );
                      }
                      return <p key={i}>{renderWithDriverTooltips(trimmed, highlightRankings)}</p>;
                    })}
                  </div>
                  {summarySources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-800">
                      <p className="text-gray-500 text-xs mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {summarySources.map((s, i) => (
                          <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-[#D0A65E] transition-colors">
                            {s.title} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-2 italic">Generated by Gemini from climate data and web sources</p>
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
              {/* Overview table: month / 3-month / year - matches country & region pages */}
              {overviewPanels.length > 0 && (
                <>
                  <Divider icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="At a Glance" />
                  <OverviewGrid panels={overviewPanels} />
                </>
              )}

              {/* Paris Agreement tracker - 10-year mean vs pre-industrial (WMO/IPCC methodology) */}
              {rolling10yr != null && vsPreIndustrial != null && (() => {
                const pct15 = Math.min(100, Math.max(0, (vsPreIndustrial / 1.5) * 100));
                const pct20 = Math.min(100, Math.max(0, (vsPreIndustrial / 2.0) * 100));
                const latestYearValue = latestYearly?.absoluteTemp ?? null;
                const latestYearDelta = latestYearValue != null ? latestYearValue - data.preIndustrialBaseline : null;
                const decadeStart = (latestYearly?.year ?? 0) - 9;
                const decadeEnd = latestYearly?.year ?? 0;
                const atOrPast15 = vsPreIndustrial >= 1.5;

                // Milestone calculations from the yearly series (annual anomalies)
                const yearlyWithAnom = (data.yearlyData ?? []).map((p) => ({
                  year: p.year,
                  absoluteTemp: p.absoluteTemp,
                  rollingAvg: p.rollingAvg ?? null,
                  annualAnomaly: p.absoluteTemp - data.preIndustrialBaseline,
                  decadeAnomaly: p.rollingAvg != null ? p.rollingAvg - data.preIndustrialBaseline : null,
                }));
                const hottestYear = yearlyWithAnom.length
                  ? yearlyWithAnom.reduce((best, p) => p.annualAnomaly > best.annualAnomaly ? p : best)
                  : null;
                const firstAnnualBreach15 = yearlyWithAnom.find((p) => p.annualAnomaly >= 1.5);

                return (
                  <div className="bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:flex-wrap">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold font-mono text-white mb-1 flex items-start gap-2">
                          <Scale className="h-5 w-5 shrink-0 text-orange-400 mt-1" />
                          <span className="min-w-0 flex-1">Paris Agreement Tracker</span>
                        </h3>
                        <p className="text-xs text-gray-400">How close are we to 1.5°C and 2°C? Global land + ocean surface temperature (NOAA) – the series used by Copernicus, WMO and the IPCC.</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className={`text-4xl md:text-5xl font-bold font-mono ${atOrPast15 ? 'text-red-300' : 'text-orange-300'}`}>
                          {formatSigned(vsPreIndustrial)}°C
                        </p>
                        <p className="text-xs text-gray-400">above pre-industrial</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 mt-3">
                      Earth&apos;s surface is currently <span className="font-semibold text-white">{vsPreIndustrial.toFixed(2)}°C</span> warmer than the pre-industrial (1850–1900) average, based on the 10-year mean for <span className="font-semibold text-white">{decadeStart}–{decadeEnd}</span>. Climate scientists use a decade average, not a single year, to smooth out natural variability (El Niño, volcanoes) and define long-term warming, in line with <a href="https://wmo.int/news/media-centre/wmo-confirms-2024-warmest-year-record-about-155degc-above-pre-industrial-level" target="_blank" rel="noopener noreferrer" className="underline text-teal-300 hover:text-teal-200">WMO</a> and <a href="https://www.ipcc.ch/sr15/chapter/spm/" target="_blank" rel="noopener noreferrer" className="underline text-teal-300 hover:text-teal-200">IPCC AR6</a> methodology. A single year can cross 1.5°C and then fall back; the Paris limit is considered breached only once the 10-year mean stays above it.
                    </p>

                    {/* Progress bars */}
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
                      <p className="text-[11px] text-gray-400 mt-1">
                        1.5°C ≈ {data.keyThresholds.plus1_5.toFixed(1)}°C absolute · aspirational lower limit agreed at COP21 Paris (2015)
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold text-white">Paris 2.0°C upper bound</span>
                        <span className="font-mono text-amber-300">{pct20.toFixed(0)}% of the way there</span>
                      </div>
                      <div className="mt-1.5 h-3 rounded-full bg-gray-800 overflow-hidden ring-1 ring-gray-700">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct20}%` }} />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        2.0°C ≈ {data.keyThresholds.plus2_0.toFixed(1)}°C absolute · dangerous-warming ceiling; every 0.1°C above 1.5°C measurably worsens heatwaves, sea-level rise and ecosystem loss
                      </p>
                    </div>

                    {/* Visual chart: annual + 10-yr mean vs Paris limits, shown as anomaly °C.
                        Compressed to 2000→present so the recent acceleration and the
                        approach toward 1.5°C are visually obvious. */}
                    {yearlyWithAnom.length > 0 && (() => {
                      const chartData = yearlyWithAnom.filter((p) => p.year >= 2000);
                      if (!chartData.length) return null;
                      const chartStart = chartData[0].year;
                      const chartEnd = chartData[chartData.length - 1].year;

                      // WMO 1961–1990 baseline, expressed as anomaly vs 1850–1900
                      const wmoYears = yearlyWithAnom.filter((p) => p.year >= 1961 && p.year <= 1990);
                      const wmoBaselineAnom = wmoYears.length
                        ? wmoYears.reduce((s, p) => s + p.annualAnomaly, 0) / wmoYears.length
                        : null;

                      return (
                      <div className="mt-6 pt-4 border-t border-gray-800">
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                          Warming above pre-industrial, {chartStart}–{chartEnd}
                        </p>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} />
                              <YAxis
                                stroke="#9CA3AF"
                                fontSize={11}
                                width={44}
                                domain={[0, 2.2]}
                                ticks={[0, 0.5, 1.0, 1.5, 2.0]}
                                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}°C`}
                              />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8 }}
                                labelStyle={{ color: '#FFF5E7' }}
                                formatter={(v: any, name: any) => [typeof v === 'number' ? `${formatSigned(v)}°C` : '—', name]}
                              />
                              <Legend wrapperStyle={{ color: '#D1D5DB', fontSize: 11 }} />
                              <ReferenceLine y={0} stroke="#10b981" strokeDasharray="2 2" strokeWidth={1.5} label={{ value: 'Pre-industrial 1850–1900 baseline', fill: '#6ee7b7', fontSize: 10, position: 'insideBottomLeft' }} />
                              {wmoBaselineAnom != null && (
                                <ReferenceLine y={wmoBaselineAnom} stroke="#60a5fa" strokeDasharray="2 2" strokeWidth={1.5} label={{ value: 'WMO 1961–1990 baseline', fill: '#93c5fd', fontSize: 10, position: 'insideBottomLeft' }} />
                              )}
                              <ReferenceLine y={1.5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '+1.5°C Paris limit', fill: '#fbbf24', fontSize: 10, position: 'insideTopLeft' }} />
                              <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '+2.0°C Critical limit', fill: '#fca5a5', fontSize: 10, position: 'insideTopLeft' }} />
                              {firstAnnualBreach15 && firstAnnualBreach15.year >= chartStart && (
                                <ReferenceLine x={firstAnnualBreach15.year} stroke="#f97316" strokeDasharray="2 4" strokeWidth={1.5} />
                              )}
                              <Line type="monotone" dataKey="annualAnomaly" name="Annual anomaly" stroke="#fb923c" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                              <Line type="monotone" dataKey="decadeAnomaly" name="10-year mean" stroke="#fbbf24" strokeWidth={3} dot={false} connectNulls isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Thin orange line = individual years · thick gold line = 10-year mean (the official Paris tracker) · amber dashes = +1.5°C Paris limit · red dashes = +2.0°C critical limit · green dashes = pre-industrial 1850–1900 baseline · blue dashes = WMO 1961–1990 standard baseline{firstAnnualBreach15 && firstAnnualBreach15.year >= chartStart ? <> · <span className="text-orange-400">vertical orange dash</span> = first annual anomaly above +1.5°C ({firstAnnualBreach15.year})</> : null}. All values are anomalies vs the 1850–1900 pre-industrial average.
                        </p>
                      </div>
                      );
                    })()}

                    {/* Key milestones */}
                    <div className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">10-year mean ({decadeStart}–{decadeEnd})</p>
                        <p className="font-mono text-white mt-0.5">
                          <span className={atOrPast15 ? 'text-red-300' : 'text-orange-300'}>{formatSigned(vsPreIndustrial)}°C</span>
                        </p>
                        <p className="text-[11px] text-gray-400">{rolling10yr.toFixed(2)}°C absolute · official Paris metric</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Latest full year ({decadeEnd})</p>
                        <p className="font-mono text-white mt-0.5">
                          {latestYearDelta != null ? formatSigned(latestYearDelta) : '—'}°C
                        </p>
                        <p className="text-[11px] text-gray-400">{latestYearValue != null ? `${latestYearValue.toFixed(2)}°C absolute` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Hottest year on record</p>
                        <p className="font-mono text-white mt-0.5">
                          {hottestYear ? `${formatSigned(hottestYear.annualAnomaly)}°C` : '—'}
                        </p>
                        <p className="text-[11px] text-gray-400">{hottestYear ? `in ${hottestYear.year}` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">First year above 1.5°C</p>
                        <p className="font-mono text-white mt-0.5">
                          {firstAnnualBreach15 ? firstAnnualBreach15.year : 'not yet'}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {firstAnnualBreach15 ? `${formatSigned(firstAnnualBreach15.annualAnomaly)}°C - a single-year breach, not yet the 10-yr mean` : 'annual basis, NOAA'}
                        </p>
                      </div>
                    </div>

                    {/* Baselines explainer - moved up so readers can see what each number means */}
                    <div className="mt-5 pt-4 border-t border-gray-800">
                      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Two baselines, two purposes</p>
                      <ul className="text-xs text-gray-400 space-y-1.5">
                        <li><span className="text-white font-semibold">Pre-industrial (1850-1900)</span> ≈ {data.preIndustrialBaseline.toFixed(1)}°C - used <em>only</em> for the Paris 1.5°C and 2.0°C limits above.</li>
                        <li><span className="text-white font-semibold">1961-1990 (WMO standard)</span> - used for the monthly/quarterly rankings in the table above and on country pages. A relatively stable mid-20th-century reference.</li>
                      </ul>
                    </div>
                  </div>
                );
              })()}

              {/* World anomaly map - country-level temperature anomalies.
                  Sits inside At a Glance under the Paris tracker so readers
                  see where the current warming is concentrated before diving
                  into longer time-series charts below. */}
              {data.countryAnomalies && data.countryAnomalies.length > 0 && (
                <AnomalyMapCard countryAnomalies={data.countryAnomalies} />
              )}

              {/* Spaghetti charts - Land+Ocean headline and Land-only comparison.
                  Side-by-side at lg screens so they can be read in parallel. */}
              {(data.landOceanMonthlyAll && data.landOceanMonthlyAll.length > 0) || data.landMonthlyAll?.length > 0 ? (
                <>
                  <Divider icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Year-on-Year Temperature" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {data.landOceanMonthlyAll && data.landOceanMonthlyAll.length > 0 && (
                      <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                        <TemperatureSpaghettiChart
                          monthlyAll={data.landOceanMonthlyAll}
                          regionName="Global Land + Ocean"
                          dataSource="NOAA Climate at a Glance - Global Land+Ocean"
                        />
                        <p className="text-xs text-gray-400 mt-3">
                          The headline global series (land + ocean) - the dataset Copernicus, WMO and NOAA report against. Source: NOAA Climate at a Glance.
                        </p>
                      </div>
                    )}
                    {data.landMonthlyAll?.length > 0 && (
                      <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                        <TemperatureSpaghettiChart
                          monthlyAll={data.landMonthlyAll}
                          regionName="Global Land"
                          dataSource="Our World in Data / ERA5"
                        />
                        <p className="text-xs text-gray-400 mt-3">
                          Land-only equivalent, on the same scale as the country, state and region climate pages (which have no ocean inside their borders). Source: Our World in Data / ERA5.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {/* Shifting Seasons teaser - global temperature is too flat to run
                  the standard warm/cold analysis, so we link out to the full
                  worldwide treatment instead. */}
              <Divider icon={<Leaf className="h-5 w-5 text-emerald-400" />} title="Shifting Seasons" />
              <section className="bg-gray-950/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Leaf className="h-5 w-5 text-emerald-400 shrink-0" />
                  <h3 className="text-lg sm:text-xl font-bold font-mono text-[#FFF5E7]">Shifting Seasons Worldwide</h3>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Global averages smooth out the seasonal cycle, but climate change shows up most clearly in the <em>timing</em> of the year. Spring is arriving earlier, snow seasons are shorter and growing seasons are longer.
                </p>

                {/* Calendar-year timeline graphic */}
                <SeasonTimelineGraphic />

                <p className="text-xs text-gray-500 mt-3">
                  Sources: EPA (US frost-free growing season since 1895) · Aono &amp; Kazui 2008 (Kyoto peak-bloom 1,200-year record) · NOAA Rutgers Global Snow Lab (NH snow cover).
                </p>

                <div className="mt-4 flex justify-end">
                  <Link
                    href="/climate/shifting-seasons"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  >
                    Explore Shifting Seasons worldwide
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>

              {/* Long-view charts: yearly trend + last-12-months anomaly comparison */}
              <Divider icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Global Temperature" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Yearly trend chart */}
                {yearlyChartData.length > 0 && (
                  <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                    <h3 className="text-xl font-bold font-mono text-white mb-1 flex items-start gap-2">
                      <Globe2 className="h-5 w-5 shrink-0 text-orange-400 mt-1" />
                      <span className="min-w-0 flex-1">Global Land + Ocean Absolute Temperature, {yearMin}–{yearMax}</span>
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Annual average (thin line) with a 10-year rolling mean (thick line). Horizontal lines mark the Paris 1.5°C and 2.0°C thresholds above pre-industrial.
                    </p>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearlyChartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} />
                          <YAxis
                            stroke="#9CA3AF"
                            fontSize={11}
                            width={44}
                            domain={[(dataMin: number) => Math.min(dataMin, data.preIndustrialBaseline) - 0.2, () => data.keyThresholds.plus2_0 + 0.2]}
                            tickFormatter={(v) => `${v.toFixed(1)}°C`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8 }}
                            labelStyle={{ color: '#FFF5E7' }}
                            formatter={(v: any) => typeof v === 'number' ? `${v.toFixed(2)}°C` : '—'}
                          />
                          <Legend wrapperStyle={{ color: '#D1D5DB', fontSize: 12 }} />
                          <ReferenceLine y={data.keyThresholds.plus1_5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '+1.5°C Paris limit', fill: '#fbbf24', fontSize: 10, position: 'insideTopLeft' }} />
                          <ReferenceLine y={data.keyThresholds.plus2_0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '+2.0°C Critical limit', fill: '#fca5a5', fontSize: 10, position: 'insideTopLeft' }} />
                          <ReferenceLine y={data.preIndustrialBaseline} stroke="#60a5fa" strokeDasharray="2 2" strokeWidth={1.5} label={{ value: 'Pre-industrial 1850–1900 baseline', fill: '#93c5fd', fontSize: 10, position: 'insideBottomLeft' }} />
                          <Line type="monotone" dataKey="absoluteTemp" name="Annual mean" stroke="#fb923c" strokeWidth={1} dot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="rollingAvg" name="10-year rolling" stroke="#fbbf24" strokeWidth={3} dot={false} connectNulls isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Combined last-12-months anomaly: land+ocean bars + land line */}
                {monthlyAnomalyCombined.length > 0 && (
                  <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                    <h3 className="text-xl font-bold font-mono text-white mb-1 flex items-start gap-2">
                      <Thermometer className="h-5 w-5 shrink-0 text-orange-400 mt-1" />
                      <span className="min-w-0 flex-1">Last 12 Months vs 1961–1990 · Land vs Land + Ocean</span>
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Bars show each month&rsquo;s global <strong>land + ocean</strong> anomaly versus the 1961–1990 average (NOAA). The orange line shows the <strong>land-only</strong> anomaly (ERA5 via Our World in Data). Land warms roughly twice as fast as the ocean, so the line runs well above the bars.
                    </p>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyAnomalyCombined} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="monthLabel" stroke="#9CA3AF" fontSize={10} interval={0} angle={-30} textAnchor="end" height={60} />
                          <YAxis
                            stroke="#9CA3AF"
                            fontSize={11}
                            width={44}
                            tickFormatter={(v) => `${formatSigned(v, 1)}°C`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #D0A65E', borderRadius: 8 }}
                            formatter={(v: any) => typeof v === 'number' ? `${formatSigned(v)}°C` : '—'}
                          />
                          <Legend wrapperStyle={{ color: '#D1D5DB', fontSize: 12 }} />
                          <ReferenceLine y={0} stroke="#6B7280" />
                          <Bar dataKey="landOcean" name="Land + Ocean (NOAA)" fill="#38bdf8" />
                          <Line type="monotone" dataKey="land" name="Land only (ERA5)" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316' }} connectNulls isAnimationActive={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Climate systems - ENSO, GHG, sea ice, continents */}
              {(data.enso || data.ghgStats || data.seaIceStats || data.continentStats?.length || data.previousLatestMonthStats) && (
                <>
                  <Divider icon={<Wind className="h-5 w-5 text-sky-300" />} title="Climate Systems" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.enso && <EnsoCard enso={data.enso} />}
                    {data.ghgStats && <GhgTile ghgStats={data.ghgStats} />}
                    {data.seaIceStats && <SeaIceTile seaIce={data.seaIceStats} />}
                    {data.noaaStats?.landOcean?.latestMonthStats && data.previousLatestMonthStats?.landOcean && (
                      <WhatChangedTile
                        current={data.noaaStats.landOcean.latestMonthStats}
                        previous={data.previousLatestMonthStats.landOcean}
                      />
                    )}
                  </div>
                  {data.continentStats?.length ? (
                    <div className="mt-6">
                      <ContinentalBar continents={data.continentStats} />
                    </div>
                  ) : null}
                </>
              )}

              {/* Emissions & Energy */}
              <Divider icon={<Factory className="h-5 w-5 text-rose-400" />} title="Emissions & Energy" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EmissionsCard />
                <EnergyMixCard />
              </div>

              {/* Context + Sources */}
              <Divider icon={<Database className="h-5 w-5 text-[#D0A65E]" />} title="Context & Sources" />
              <div className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E] space-y-4">
                {/* Baseline chips */}
                <div>
                  <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
                    <Ruler className="text-[#D0A65E]" />
                    <span className="min-w-0 flex-1">Baselines used on this page</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
                      <p className="text-[13px] font-semibold text-[#FFF5E7]">1961–1990</p>
                      <p className="text-xs text-gray-400">WMO standard - used for the monthly and quarterly anomalies above.</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
                      <p className="text-[13px] font-semibold text-[#FFF5E7]">Pre-industrial ≈ {data.preIndustrialBaseline.toFixed(1)}°C</p>
                      <p className="text-xs text-gray-400">1850–1900. Used only for the Paris 1.5°C / 2.0°C limits (10-year mean).</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
                      <p className="text-[13px] font-semibold text-[#FFF5E7]">20th-century mean {data.globalBaseline}°C</p>
                      <p className="text-xs text-gray-400">NOAA&rsquo;s reference for individual monthly and yearly anomalies.</p>
                    </div>
                  </div>
                </div>

                {/* Sources row */}
                <div className="pt-3 border-t border-gray-800/70">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D0A65E] mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Data sources
                  </h3>
                  <ul className="text-sm text-gray-300 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1.5">
                    <li>
                      <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/1/0/1950-2026" target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-teal-200 inline-flex items-center gap-1">
                        NOAA Climate at a Glance <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-xs text-gray-500"> - Land+Ocean anomalies</span>
                    </li>
                    <li>
                      <a href="https://ourworldindata.org/grapher/temperature-anomaly" target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-teal-200 inline-flex items-center gap-1">
                        Our World in Data <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-xs text-gray-500"> - ERA5 land-only series</span>
                    </li>
                    <li>
                      <a href="https://www.ipcc.ch/report/ar6/syr/" target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-teal-200 inline-flex items-center gap-1">
                        IPCC AR6 Synthesis <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-xs text-gray-500"> - 1.5°C / 2.0°C basis</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Cross-links */}
              <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                <h2 className="text-xl font-bold font-mono text-white mb-2 flex items-start gap-2">
                  <Globe2 className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
                  <span className="min-w-0 flex-1">Zoom In - Country &amp; Regional Updates</span>
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

              {/* Explore Climate Data - matches the country/state/region pages */}
              <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
                  <BookOpen className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
                  <span className="min-w-0 flex-1">Explore Climate Data</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <RelatedLink href="/climate/shifting-seasons" label="Shifting Seasons" desc="How the timing of the seasons is moving worldwide" />
                  <RelatedLink href="/climate/enso" label="El Niño / La Niña" desc="Live ENSO state, weekly Niño 3.4 SST and NOAA forecast" />
                  <RelatedLink href="/climate/rankings" label="Climate Rankings" desc="League table of anomalies across 144 regions" />
                  <RelatedLink href="/climate-dashboard" label="Climate Dashboard" desc="Headline global climate indicators in one view" />
                  <RelatedLink href="/emissions" label="CO₂ Emissions" desc="Global and per-country emissions" />
                  <RelatedLink href="/extreme-weather" label="Extreme Weather" desc="Live disaster and weather alerts" />
                  <RelatedLink href="/climate-explained" label="Climate Explained" desc="ENSO, greenhouse effect, glossary" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
