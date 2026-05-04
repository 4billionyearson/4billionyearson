"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend, BarChart, Bar, Cell, ComposedChart,
} from 'recharts';
import { Thermometer, Globe2, Loader2, ExternalLink, AlertTriangle, Database, Wind, Info, BookOpen, Scale, Factory, Leaf, Ruler } from 'lucide-react';
import MonthlySpaghettiCard from '@/app/_components/monthly-spaghetti-card';
import GlobalSeasonalSummary from '@/app/_components/global-seasonal-summary';
import { StaticFAQPanel, FaqJsonLd } from '@/app/_components/seo/StaticFAQPanel';
import { GLOBAL_CLIMATE_FAQ } from './global-faq';
import { getRegionBySlug } from '@/lib/climate/regions';
import {
  OverviewGrid,
  buildOverviewRow,
  type OverviewPanel,
  type OverviewRow,
} from '../_shared/overview-grid';
import { EnsoCard, GhgTile, SeaIceTile, ContinentalBar } from './ClimateSystemsPanel';
import GlobalRankingsTeaser from '@/app/_components/global-rankings-teaser';
import ClimateMapCard from './ClimateMapCard';
import ParisTrackerCard from './ParisTrackerCard';
import EmissionsCard from '@/app/_components/emissions-card';
import EnergyMixCard from '@/app/_components/energy-mix-card';
import ShareBar from '@/app/climate/enso/_components/ShareBar';
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
  continentStats?: Array<{
    key: string;
    label: string;
    // New rich shape from build-global-snapshot.
    latestMonth?: { year: number; month: number; anomaly: number } | null;
    nativeBaseline?: string | null;
    comparisonBaseline?: string | null;
    anomaly1m?: number | null;
    nativeAnomaly1m?: number | null;
    label1m?: string | null;
    sourceUrl?: string | null;
    // Legacy shape kept for forward-compat until the next build runs.
    latest?: { year: number; month: number; anomaly: number } | null;
  }> | null;
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
      <ExternalLink className="absolute top-3 right-3 w-3.5 h-3.5 text-teal-300" />
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

interface GlobalProfileProps {
  /** Pre-fetched Gemini summary read from Redis at request time on the server.
   *  When provided, the client component skips the auto-fetch on mount so the
   *  raw SSR HTML already contains the summary paragraph (good for AI / search
   *  crawlers). When null, the client falls back to the existing fetch flow. */
  initialSummary?: string | null;
  initialSources?: { title: string; uri: string }[];
}

export default function GlobalProfile({
  initialSummary = null,
  initialSources = [],
}: GlobalProfileProps = {}) {
  const region = getRegionBySlug('global')!;
  const [data, setData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gemini summary state — pre-seeded from server-side Redis read when available.
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [summaryLoading, setSummaryLoading] = useState(initialSummary == null);
  const [summarySources, setSummarySources] = useState<{ title: string; uri: string }[]>(initialSources);
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

    // Only fetch the Gemini summary client-side if it wasn't pre-seeded by SSR.
    if (initialSummary == null) {
      void fetchSummary();
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      title: 'Temperature - Average',
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
          <div id="climate-update" className="scroll-mt-24 rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
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
                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <ShareBar
                      pageUrl={'https://4billionyearson.org/climate/global#climate-update'}
                      shareText={encodeURIComponent('Global climate update - 4 Billion Years On')}
                      emailSubject={'Global climate update - 4 Billion Years On'}
                      embedUrl={'https://4billionyearson.org/climate/embed/update/global'}
                      embedCode={'<iframe\n  src="https://4billionyearson.org/climate/embed/update/global"\n  width="100%" height="640"\n  style="border:none;"\n  title="Global climate update - 4 Billion Years On"\n></iframe>'}
                      wrapperClassName="relative"
                      align="left"
                    />
                    <Link
                      href="/climate-dashboard"
                      className="inline-block text-sm font-semibold text-teal-300 hover:text-teal-200 transition-colors"
                    >
                      Full Climate Data →
                    </Link>
                  </div>
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
              {rolling10yr != null && vsPreIndustrial != null && (
                <ParisTrackerCard
                  data={data}
                  share={{
                    pageUrl: 'https://4billionyearson.org/climate/global',
                    sectionId: 'paris-tracker',
                    embedUrl: 'https://4billionyearson.org/climate/embed/paris',
                    embedCode: '<iframe\n  src="https://4billionyearson.org/climate/embed/paris"\n  width="100%" height="720"\n  style="border:none;"\n  title="Paris Agreement Tracker - 4 Billion Years On"\n></iframe>',
                  }}
                />
              )}

              {/* World anomaly map - country-level temperature anomalies.
                  Sits inside At a Glance under the Paris tracker so readers
                  see where the current warming is concentrated before diving
                  into longer time-series charts below. */}
              {data.countryAnomalies && data.countryAnomalies.length > 0 && (
                <ClimateMapCard
                  countryAnomalies={data.countryAnomalies}
                  share={{ pageUrl: 'https://4billionyearson.org/climate/global', sectionId: 'climate-map' }}
                />
              )}

              {/* Spaghetti charts - Land+Ocean headline and Land-only comparison.
                  Side-by-side at lg screens so they can be read in parallel. */}
              {(data.landOceanMonthlyAll && data.landOceanMonthlyAll.length > 0) || data.landMonthlyAll?.length > 0 ? (
                <>
                  <Divider icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Year-on-Year Temperature" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {data.landOceanMonthlyAll && data.landOceanMonthlyAll.length > 0 && (
                      <MonthlySpaghettiCard
                        series={{ temp: data.landOceanMonthlyAll }}
                        regionName="Global Land + Ocean"
                        dataSource="NOAA Climate at a Glance - Global Land+Ocean"
                        embedSlug="global-land-ocean"
                        share={{ pageUrl: 'https://4billionyearson.org/climate/global', sectionId: 'monthly-history-land-ocean' }}
                        footer={<>The headline global series (land + ocean) - the dataset Copernicus, WMO and NOAA report against. Source: NOAA Climate at a Glance.</>}
                      />
                    )}
                    {data.landMonthlyAll?.length > 0 && (
                      <MonthlySpaghettiCard
                        series={{ temp: data.landMonthlyAll }}
                        regionName="Global Land"
                        dataSource="Our World in Data / ERA5"
                        embedSlug="global-land"
                        share={{ pageUrl: 'https://4billionyearson.org/climate/global', sectionId: 'monthly-history-land' }}
                        footer={<>Land-only equivalent, on the same scale as the country, state and region climate pages (which have no ocean inside their borders). Source: Our World in Data / ERA5.</>}
                      />
                    )}
                  </div>
                </>
              ) : null}

              {/* Shifting Seasons summary - splits the ~236 analysed regions by
                  hemisphere and Köppen climate zone, since global mean temperature
                  is too flat to run the standard warm/cold analysis on its own. */}
              <Divider icon={<Leaf className="h-5 w-5 text-emerald-400" />} title="Shifting Seasons" />
              <section id="shifting-seasons" className="scroll-mt-24 bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Leaf className="h-5 w-5 text-emerald-400 shrink-0" />
                  <h3 className="text-lg sm:text-xl font-bold font-mono text-[#FFF5E7]">Shifting Seasons Worldwide</h3>
                </div>
                <GlobalSeasonalSummary share={{
                  pageUrl: 'https://4billionyearson.org/climate/global',
                  sectionId: 'shifting-seasons',
                  embedUrl: 'https://4billionyearson.org/climate/embed/seasons/global',
                  embedCode: '<iframe\n  src="https://4billionyearson.org/climate/embed/seasons/global"\n  width="100%" height="720"\n  style="border:none;"\n  title="Shifting Seasons Worldwide - 4 Billion Years On"\n></iframe>',
                }} />
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
                  {data.enso && <EnsoCard enso={data.enso} />}
                  {(data.ghgStats || data.seaIceStats) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.ghgStats && <GhgTile ghgStats={data.ghgStats} />}
                      {data.seaIceStats && <SeaIceTile seaIce={data.seaIceStats} />}
                    </div>
                  )}
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
                      <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/1/0/1950-2026" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 underline">
                        NOAA Climate at a Glance
                      </a>
                      <span className="text-xs text-gray-500"> - Land+Ocean anomalies</span>
                    </li>
                    <li>
                      <a href="https://ourworldindata.org/grapher/temperature-anomaly" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 underline">
                        Our World in Data
                      </a>
                      <span className="text-xs text-gray-500"> - ERA5 land-only series</span>
                    </li>
                    <li>
                      <a href="https://www.ipcc.ch/report/ar6/syr/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 underline">
                        IPCC AR6 Synthesis
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
                      className="inline-flex items-center h-8 rounded-full border border-gray-700 bg-gray-900/45 px-3 text-[13px] text-gray-300 transition-colors hover:border-[#D0A65E]/45 hover:bg-white/[0.03] hover:text-[#FFF5E7]"
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

          {/* Frequently Asked Questions — always rendered so AI crawlers
              see Q&A in raw SSR HTML. Mirrors FAQPage JSON-LD below. */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
            <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg [&>svg]:shrink-0">
              <BookOpen className="h-5 w-5" />
              <span>FAQs</span>
            </h2>
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
          </div>
          <StaticFAQPanel headingId="global-climate-faq-heading" qa={GLOBAL_CLIMATE_FAQ} />
          <FaqJsonLd qa={GLOBAL_CLIMATE_FAQ} />
        </div>
      </div>
    </main>
  );
}
