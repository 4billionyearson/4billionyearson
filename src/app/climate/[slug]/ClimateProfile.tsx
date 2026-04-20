"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Thermometer, Sun, CloudRain, Snowflake, ExternalLink, Database } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface YearlyPoint { year: number; value?: number; avgTemp?: number; rollingAvg?: number }
interface MonthlyComparison {
  monthLabel: string; month: number; year: number;
  recent?: number | null; recentTemp?: number | null;
  historicAvg: number | null; diff: number | null;
}
interface PrecipPoint { year: number; value?: number; rollingAvg?: number }
interface RankedPeriodStat {
  label: string;
  value: number;
  diff: number | null;
  rank: number;
  total: number;
  recordLabel: string;
  recordValue: number;
}
interface MetricSeries {
  label: string;
  units: string;
  yearly: YearlyPoint[];
  monthlyComparison: MonthlyComparison[];
  latestMonthStats?: RankedPeriodStat;
  latestThreeMonthStats?: RankedPeriodStat;
}

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
    latestMonthStats?: RankedPeriodStat;
    latestThreeMonthStats?: RankedPeriodStat;
    precipYearly?: PrecipPoint[];
    dateRange: string;
  };
  usStateData?: {
    state: string;
    paramData: Record<string, MetricSeries>;
  };
  ukRegionData?: {
    region: string;
    varData: Record<string, MetricSeries>;
    attribution: string;
  };
  nationalData?: {
    region?: string;
    state?: string;
    varData?: Record<string, MetricSeries>;
    paramData?: Record<string, MetricSeries>;
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
    landLatestMonthStats?: RankedPeriodStat;
    landLatestThreeMonthStats?: RankedPeriodStat;
    keyThresholds: { plus1_5: number; plus2_0: number };
  };
  lastUpdated: string;
  source?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSignedValue(value: number, units = '°C', digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}${units}`;
}

function formatValue(value: number, units = '', digits = 1): string {
  return `${value.toFixed(digits)}${units}`;
}

function ordinal(value: number): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function getPointValue(point: YearlyPoint | PrecipPoint): number | null {
  if (typeof (point as YearlyPoint).value === 'number') return (point as YearlyPoint).value as number;
  if (typeof (point as YearlyPoint).avgTemp === 'number') return (point as YearlyPoint).avgTemp as number;
  return null;
}

type OverviewMetricBlock = {
  title: string;
  value: string;
  anomaly: string;
  rank: string;
  record: string;
};

type OverviewRow = {
  label: string;
  lowerIsBetter?: boolean;
  isPrimary?: boolean;
  latestMonth: OverviewMetricBlock;
  latestQuarter: OverviewMetricBlock;
  annual: OverviewMetricBlock;
};

type OverviewSection = {
  title?: string;
  rows: OverviewRow[];
};

type OverviewPanel = {
  title: string;
  icon: React.ReactNode;
  accentClass: string;
  accentBg: string;
  accentBorder: string;
  sections: OverviewSection[];
};

function buildOverviewRow(
  label: string,
  yearly: Array<YearlyPoint | PrecipPoint> | undefined,
  latestMonthStats: RankedPeriodStat | undefined,
  latestThreeMonthStats: RankedPeriodStat | undefined,
  units: string,
  digits: number,
  lowerIsBetter = false,
  isPrimary = false,
): OverviewRow | null {
  if (!yearly?.length) return null;

  const values = yearly
    .map((point) => ({ year: point.year, value: getPointValue(point) }))
    .filter((point): point is { year: number; value: number } => typeof point.value === 'number');

  if (!values.length) return null;

  const latest = values[values.length - 1];
  const baseline = values.filter((point) => point.year >= 1961 && point.year <= 1990);
  const baselineAvg = baseline.length
    ? baseline.reduce((sum, point) => sum + point.value, 0) / baseline.length
    : null;
  const sorted = [...values].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  const rank = sorted.findIndex((point) => point.year === latest.year && point.value === latest.value) + 1;
  const record = sorted[0];

  const extractYear = (label: string): string => {
    const match = label.match(/(\d{4})/);
    return match ? match[1] : label;
  };

  const buildPeriodBlock = (stats?: RankedPeriodStat): OverviewMetricBlock => {
    const s = stats;
    return {
      title: s?.label ?? 'n/a',
      value: s ? formatValue(s.value, units, digits) : 'n/a',
      anomaly: s && s.diff != null ? `${formatSignedValue(s.diff, units, digits)} vs avg` : 'n/a',
      rank: s ? ordinal(s.rank) : 'n/a',
      record: s ? `${formatValue(s.recordValue, units, digits)} (${extractYear(s.recordLabel)})` : 'n/a',
    };
  };

  return {
    label,
    lowerIsBetter,
    isPrimary,
    latestMonth: buildPeriodBlock(latestMonthStats),
    latestQuarter: buildPeriodBlock(latestThreeMonthStats),
    annual: {
      title: `${latest.year}`,
      value: formatValue(latest.value, units, digits),
      anomaly: baselineAvg == null ? 'n/a' : `${formatSignedValue(latest.value - baselineAvg, units, digits)} vs avg`,
      rank: ordinal(rank),
      record: `${formatValue(record.value, units, digits)} (${record.year})`,
    },
  };
}

function OverviewGrid({ panels }: { panels: OverviewPanel[] }) {
  const periods = ['latestMonth', 'latestQuarter', 'annual'] as const;
  const periodShortLabel = (label: string, period: typeof periods[number]) => {
    if (period === 'annual') return label;
    return label.replace(/\s+\d{4}$/, '');
  };

  return (
    <div className="space-y-4">
      {panels.map((panel) => (
        <div key={panel.title} className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-center gap-2 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
            {panel.icon}
            {panel.title}
          </h2>
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 overflow-hidden">
            {panel.sections.map((section, sIdx) => (
              <div key={sIdx} className={`${sIdx > 0 ? 'border-t-2 border-gray-600/50' : ''}`}>
                {section.title && (
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{section.title}</div>
                )}
                <div className="p-2 md:p-3 pt-1">
                  {/* Column headers */}
                  <div className="flex gap-px">
                    <div className="w-14 md:w-20 shrink-0" />
                    {section.rows.map((row) => (
                      <div
                        key={row.label}
                        className={`flex-1 min-w-0 px-2 py-1.5 text-[11px] md:text-xs font-bold truncate ${
                          row.isPrimary ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        {row.label}
                      </div>
                    ))}
                  </div>

                  {/* Data rows with record sub-row after each period */}
                  {periods.map((period, pIdx) => {
                    const periodLabel = section.rows[0]?.[period]?.title ?? '';
                    return (
                      <React.Fragment key={period}>
                        <div className={`flex gap-px border-t border-gray-600/40 ${pIdx % 2 === 0 ? 'bg-gray-800/40' : ''}`}>
                          <div className="w-14 md:w-20 shrink-0 py-2 px-1.5 text-[10px] md:text-[11px] uppercase tracking-wider text-gray-400 font-semibold leading-tight flex items-start pt-2.5">
                            <span className="md:hidden">{periodShortLabel(periodLabel, period)}</span>
                            <span className="hidden md:inline">{periodLabel}</span>
                          </div>
                          {section.rows.map((row) => {
                            const metric = row[period];
                            return (
                              <div
                                key={`${row.label}-${period}`}
                                className={`flex-1 min-w-0 py-2 px-2 ${
                                  row.isPrimary ? `${panel.accentBg} border-l-4 ${panel.accentBorder}` : ''
                                }`}
                              >
                                <div className={`text-sm font-bold leading-snug ${row.isPrimary ? 'text-white' : 'text-gray-200'}`}>
                                  {metric.value}
                                  <span className={`text-sm font-bold ml-1.5 ${row.isPrimary ? 'text-white' : 'text-gray-200'}`}>
                                    · {metric.rank}{row.lowerIsBetter ? ' ↓' : ''}
                                  </span>
                                </div>
                                <div className={`text-[10px] md:text-[11px] mt-0.5 ${row.isPrimary ? 'text-white/70' : 'text-gray-400'}`}>
                                  {metric.anomaly.replace(' vs avg', '')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Record sub-row for this period */}
                        <div className="flex gap-px border-t border-dashed border-gray-500/50 italic">
                          <div className="w-14 md:w-20 shrink-0 py-1.5 px-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold leading-tight flex items-center">
                            Record
                          </div>
                          {section.rows.map((row) => (
                            <div
                              key={`${row.label}-${period}-record`}
                              className={`flex-1 min-w-0 py-1.5 px-2 ${
                                row.isPrimary ? `${panel.accentBg} border-l-4 ${panel.accentBorder}` : ''
                              }`}
                            >
                              <div className={`text-[10px] md:text-[11px] truncate ${row.isPrimary ? 'text-white/60' : 'text-gray-500'}`}>
                                {row[period].record}
                              </div>
                            </div>
                          ))}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="px-3 py-2 text-[10px] text-gray-500 border-t border-gray-700/40">Baseline: 1961–1990 mean · Anomaly = difference from baseline · Record = highest (or lowest) value on record</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function buildOverviewPanels(data: ProfileData, regionLabel: string, nationalLabel: string): OverviewPanel[] {
  const panels: OverviewPanel[] = [];

  const temperatureRows = [
    buildOverviewRow(
      regionLabel,
      data.ukRegionData?.varData?.Tmean?.yearly || data.usStateData?.paramData?.tavg?.yearly || data.countryData?.yearlyData,
      data.ukRegionData?.varData?.Tmean?.latestMonthStats || data.usStateData?.paramData?.tavg?.latestMonthStats || data.countryData?.latestMonthStats,
      data.ukRegionData?.varData?.Tmean?.latestThreeMonthStats || data.usStateData?.paramData?.tavg?.latestThreeMonthStats || data.countryData?.latestThreeMonthStats,
      '°C',
      1,
      false,
      true,
    ),
    buildOverviewRow(
      nationalLabel || 'National',
      data.nationalData?.varData?.Tmean?.yearly || data.nationalData?.paramData?.tavg?.yearly,
      data.nationalData?.varData?.Tmean?.latestMonthStats || data.nationalData?.paramData?.tavg?.latestMonthStats,
      data.nationalData?.varData?.Tmean?.latestThreeMonthStats || data.nationalData?.paramData?.tavg?.latestThreeMonthStats,
      '°C',
      1,
    ),
    buildOverviewRow('Global', data.globalData?.landYearlyData, data.globalData?.landLatestMonthStats, data.globalData?.landLatestThreeMonthStats, '°C', 1),
  ].filter((row): row is OverviewRow => Boolean(row));

  if (temperatureRows.length) {
    panels.push({
      title: 'Temperature – Average',
      icon: <Thermometer className="text-orange-400" />,
      accentClass: 'bg-orange-600',
      accentBg: 'bg-orange-950/50',
      accentBorder: 'border-orange-400/80',
      sections: [{ rows: temperatureRows }],
    });
  }

  const sunshineRows = [
    buildOverviewRow(regionLabel, data.ukRegionData?.varData?.Sunshine?.yearly, data.ukRegionData?.varData?.Sunshine?.latestMonthStats, data.ukRegionData?.varData?.Sunshine?.latestThreeMonthStats, ' hrs', 0, false, true),
    buildOverviewRow(nationalLabel || 'United Kingdom', data.nationalData?.varData?.Sunshine?.yearly, data.nationalData?.varData?.Sunshine?.latestMonthStats, data.nationalData?.varData?.Sunshine?.latestThreeMonthStats, ' hrs', 0),
  ].filter((row): row is OverviewRow => Boolean(row));

  if (sunshineRows.length) {
    panels.push({
      title: 'Sunshine – Total Hours',
      icon: <Sun className="text-amber-400" />,
      accentClass: 'bg-amber-600',
      accentBg: 'bg-amber-950/50',
      accentBorder: 'border-amber-400/80',
      sections: [{ rows: sunshineRows }],
    });
  }

  const rainfallRows = [
    buildOverviewRow(
      regionLabel,
      data.ukRegionData?.varData?.Rainfall?.yearly || data.usStateData?.paramData?.pcp?.yearly || data.countryData?.precipYearly,
      data.ukRegionData?.varData?.Rainfall?.latestMonthStats || data.usStateData?.paramData?.pcp?.latestMonthStats,
      data.ukRegionData?.varData?.Rainfall?.latestThreeMonthStats || data.usStateData?.paramData?.pcp?.latestThreeMonthStats,
      ' mm',
      0,
      false,
      true,
    ),
    buildOverviewRow(
      nationalLabel || 'National',
      data.nationalData?.varData?.Rainfall?.yearly || data.nationalData?.paramData?.pcp?.yearly,
      data.nationalData?.varData?.Rainfall?.latestMonthStats || data.nationalData?.paramData?.pcp?.latestMonthStats,
      data.nationalData?.varData?.Rainfall?.latestThreeMonthStats || data.nationalData?.paramData?.pcp?.latestThreeMonthStats,
      ' mm',
      0,
    ),
  ].filter((row): row is OverviewRow => Boolean(row));

  const rainDaysRows = [
    buildOverviewRow(regionLabel, data.ukRegionData?.varData?.Raindays1mm?.yearly, data.ukRegionData?.varData?.Raindays1mm?.latestMonthStats, data.ukRegionData?.varData?.Raindays1mm?.latestThreeMonthStats, ' days', 0, false, true),
    buildOverviewRow(nationalLabel || 'United Kingdom', data.nationalData?.varData?.Raindays1mm?.yearly, data.nationalData?.varData?.Raindays1mm?.latestMonthStats, data.nationalData?.varData?.Raindays1mm?.latestThreeMonthStats, ' days', 0),
  ].filter((row): row is OverviewRow => Boolean(row));

  if (rainfallRows.length || rainDaysRows.length) {
    panels.push({
      title: 'Rainfall & Rain Days – Totals',
      icon: <CloudRain className="text-blue-400" />,
      accentClass: 'bg-blue-600',
      accentBg: 'bg-blue-950/50',
      accentBorder: 'border-blue-400/80',
      sections: [
        ...(rainfallRows.length ? [{ title: 'Rainfall / Precipitation', rows: rainfallRows }] : []),
        ...(rainDaysRows.length ? [{ title: 'Rain Days (≥1mm)', rows: rainDaysRows }] : []),
      ],
    });
  }

  const frostRows = [
    buildOverviewRow(regionLabel, data.ukRegionData?.varData?.AirFrost?.yearly, data.ukRegionData?.varData?.AirFrost?.latestMonthStats, data.ukRegionData?.varData?.AirFrost?.latestThreeMonthStats, ' days', 0, true, true),
    buildOverviewRow(nationalLabel || 'United Kingdom', data.nationalData?.varData?.AirFrost?.yearly, data.nationalData?.varData?.AirFrost?.latestMonthStats, data.nationalData?.varData?.AirFrost?.latestThreeMonthStats, ' days', 0, true),
  ].filter((row): row is OverviewRow => Boolean(row));

  if (frostRows.length) {
    panels.push({
      title: 'Frost Days – Total',
      icon: <Snowflake style={{ color: '#E6F8F6' }} />,
      accentClass: 'bg-[#E6F8F6]/20',
      accentBg: 'bg-[#E6F8F6]/10',
      accentBorder: 'border-[#E6F8F6]/60',
      sections: [{ rows: frostRows }],
    });
  }

  return panels;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ClimateProfile({ slug, region }: { slug: string; region: ClimateRegion }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summarySources, setSummarySources] = useState<{ title: string; uri: string }[]>([]);

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
    setSummaryLoading(true);
    fetch(`/api/climate/summary/${slug}?_t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(d => {
        if (d?.summary) setSummary(d.summary);
        if (d?.sources?.length) setSummarySources(d.sources);
      })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [slug]);

  // Derived labels
  const regionLabel = data?.ukRegionData?.region || data?.usStateData?.state || data?.name || region.name;
  const nationalLabel = data?.nationalData?.region || (region.type === 'us-state' ? 'United States' : region.type === 'uk-region' ? 'United Kingdom' : '');
  const isSubNational = region.type === 'uk-region' || region.type === 'us-state';
  const overviewPanels = data ? buildOverviewPanels(data, regionLabel, nationalLabel) : [];

  // Use the API-returned region name for UK regions (correct Met Office name)
  const pageTitle = data?.ukRegionData?.region || region.name;
  const dashboardSearchTerm = data?.ukRegionData?.region || data?.usStateData?.state || data?.name || region.name;

  // Derive the latest data month for the page title
  const latestMonthLabel = (() => {
    const stats = data?.ukRegionData?.varData?.Tmean?.latestMonthStats
      || data?.usStateData?.paramData?.tavg?.latestMonthStats
      || data?.countryData?.latestMonthStats
      || data?.globalData?.landLatestMonthStats;
    return stats?.label || null; // e.g. "Mar 2026"
  })();

  // Full month name for the subtitle (e.g. "March" from "Mar 2026")
  const FULL_MONTHS: Record<string, string> = {
    Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
    May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
    Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
  };
  const latestFullMonth = latestMonthLabel
    ? FULL_MONTHS[latestMonthLabel.split(' ')[0]] || latestMonthLabel.split(' ')[0]
    : null;
  const latestMonthYearLabel = latestMonthLabel
    ? `${latestFullMonth} ${latestMonthLabel.split(' ')[1]}`
    : null;
  const coverageLine = region.coveragePlaces?.length
    ? `Coverage: ${region.coveragePlaces.slice(0, -1).join(', ')}${region.coveragePlaces.length > 1 ? `${region.coveragePlaces.length > 2 ? ',' : ''} and ${region.coveragePlaces[region.coveragePlaces.length - 1]}` : ''}.`
    : null;

  // Responsive font sizes — shrink when the title is long
  const titleText = `${pageTitle} Climate`;
  const h1SizeClass =
    titleText.length > 28 ? 'text-2xl md:text-3xl' :
    titleText.length > 20 ? 'text-2xl md:text-4xl' :
    'text-3xl md:text-5xl';
  const subtitleSizeClass =
    titleText.length > 28 ? 'text-lg md:text-xl' :
    titleText.length > 20 ? 'text-xl md:text-2xl' :
    'text-2xl md:text-3xl';

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Header ─── */}
          <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className={`${h1SizeClass} font-bold font-mono tracking-wide leading-tight`} style={{ color: '#FFF5E7' }}>
                {pageTitle} Climate
              </h1>
              {latestMonthYearLabel ? (
                <p className={`${subtitleSizeClass} font-bold mt-1`} style={{ color: '#FFF5E7' }}>
                  {latestMonthYearLabel} Update
                </p>
              ) : (
                <p className={`${subtitleSizeClass} font-bold mt-1`} style={{ color: '#FFF5E7' }}>
                  Monthly Climate Update
                </p>
              )}
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-4">
              {summary ? (
                <div>
                  {coverageLine && (
                    <p className="text-xs md:text-sm font-medium text-[#D0A65E] mb-3">{coverageLine}</p>
                  )}
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    {summary.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
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
                  <Link
                    href={`/climate-dashboard?q=${encodeURIComponent(dashboardSearchTerm)}`}
                    className="inline-block mt-3 text-sm font-semibold text-[#D0A65E] hover:text-[#E8C97A] transition-colors"
                  >
                    Full Climate Data for {pageTitle} →
                  </Link>
                </div>
              ) : summaryLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#D0A65E] shrink-0" />
                  <p className="text-sm text-gray-400">Generating climate update…</p>
                </div>
              ) : !loading && data ? (
                <div>
                  {coverageLine && (
                    <p className="text-xs md:text-sm font-medium text-[#D0A65E] mb-3">{coverageLine}</p>
                  )}
                  <p className="text-sm text-gray-300 leading-relaxed">{buildTextSummary(region, data)}</p>
                  <Link
                    href={`/climate-dashboard?q=${encodeURIComponent(dashboardSearchTerm)}`}
                    className="inline-block mt-3 text-sm font-semibold text-[#D0A65E] hover:text-[#E8C97A] transition-colors"
                  >
                    Full Climate Data for {pageTitle} →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-400">{region.tagline}</p>
              )}
            </div>
          </div>

          {/* Loading / Error */}
          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#D0A65E] flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#D0A65E]" />
              <p className="text-gray-400">Loading climate data...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-6 text-red-400 text-center">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {overviewPanels.length > 0 && <OverviewGrid panels={overviewPanels} />}

              {/* ─── Explore More ─── */}
              <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                <h2 className="text-xl font-bold font-mono text-white mb-4">Explore Climate Data</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <RelatedLink href="/climate-dashboard" label="Climate Dashboard" desc="Interactive global climate data" />
                  <RelatedLink href="/emissions" label="CO₂ Emissions" desc="Global and per-country emissions" />
                  <RelatedLink href="/greenhouse-gases" label="Greenhouse Gases" desc="CO₂, methane, and N₂O levels" />
                  <RelatedLink href="/sea-levels-ice" label="Sea Levels & Ice" desc="Arctic ice and sea-level rise" />
                  <RelatedLink href="/extreme-weather" label="Extreme Weather" desc="Live disaster and weather alerts" />
                </div>
              </section>

              {/* ─── Attribution ─── */}
              <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-center gap-2">
                  <Database className="h-5 w-5 text-[#D0A65E]" />
                  Data Sources
                </h2>
                <div className="text-xs text-gray-400 space-y-1.5">
                  <p>Last updated: <span className="text-gray-300">{data.lastUpdated}</span> · Source: <span className="text-gray-300">{data.source === 'cache' ? 'cached' : 'live'}</span></p>
                  {data.ukRegionData?.attribution && <p>{data.ukRegionData.attribution}</p>}
                  <p>
                    Temperature, rainfall, sunshine and frost data from the{' '}
                    <a href="https://www.metoffice.gov.uk/research/climate/maps-and-data/uk-and-regional-series" className="text-[#D0A65E] hover:text-[#E8C97A]" target="_blank" rel="noopener noreferrer">Met Office UK Regional Series <ExternalLink className="inline w-3 h-3" /></a>.
                    Global temperature data via{' '}
                    <a href="https://ourworldindata.org" className="text-[#D0A65E] hover:text-[#E8C97A]" target="_blank" rel="noopener noreferrer">Our World in Data <ExternalLink className="inline w-3 h-3" /></a>{' '}
                    ({' '}<a href="https://www.ncei.noaa.gov" className="text-[#D0A65E] hover:text-[#E8C97A]" target="_blank" rel="noopener noreferrer">NOAA <ExternalLink className="inline w-3 h-3" /></a>).
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Related Link Card ──────────────────────────────────────────────────────

function RelatedLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="relative block rounded-xl border border-gray-700/50 bg-gray-900/60 p-4 hover:border-[#D0A65E]/50 hover:bg-gray-900 transition-all"
    >
      <ExternalLink className="absolute top-3 right-3 w-3.5 h-3.5 text-gray-600" />
      <div className="font-semibold text-gray-200 text-sm pr-5">{label}</div>
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
