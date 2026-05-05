"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Thermometer, Sun, CloudRain, Snowflake, Droplets, ExternalLink, BookOpen, MapPin, Factory, Globe2 } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import MonthlySpaghettiCard, { type SeriesMap } from '@/app/_components/monthly-spaghetti-card';
import SeasonalShiftCard from '@/app/_components/seasonal-shift-card';
import ClimateRankPill from '@/app/_components/climate-rank-pill';
import EmissionsCard from '@/app/_components/emissions-card';
import EnergyMixCard from '@/app/_components/energy-mix-card';
import ClimateMapCard, { type CountryAnomalyRow } from '../global/ClimateMapCard';
import type { ClimateMapPreset } from '../global/ClimateMapCard';
import ShareBar from '@/app/climate/enso/_components/ShareBar';
import { renderWithDriverTooltips, relabelSummaryHeading } from '@/lib/climate/driver-annotator';
import { StaticFAQPanel, FaqJsonLd } from '@/app/_components/seo/StaticFAQPanel';
import { RegionDataSourcesCard } from './RegionDataSourcesCard';
import { buildRegionFAQ } from '@/lib/climate/region-faq';

// ─── Divider ─────────────────────────────────────────────────────────────────

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
  monthlyAll?: { year: number; month: number; value: number }[];
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
    monthlyAll?: { year: number; month: number; value: number }[];
    precipYearly?: PrecipPoint[];
    dateRange: string;
  };
  countryPrecipData?: {
    code: string;
    monthlyAll?: { year: number; month: number; value: number }[];
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
    noaaStats?: {
      landOcean?: { yearly?: YearlyPoint[]; latestMonthStats?: RankedPeriodStat; latestThreeMonthStats?: RankedPeriodStat };
      land?:      { yearly?: YearlyPoint[]; latestMonthStats?: RankedPeriodStat; latestThreeMonthStats?: RankedPeriodStat };
      ocean?:     { yearly?: YearlyPoint[]; latestMonthStats?: RankedPeriodStat; latestThreeMonthStats?: RankedPeriodStat };
    };
    keyThresholds: { plus1_5: number; plus2_0: number };
  };
  lastUpdated: string;
  source?: string;
}

type SummaryResponse = {
  summary: string | null;
  sources?: { title: string; uri: string }[];
  generatedAt?: string;
  source?: string;
  message?: string;
  retryable?: boolean;
};

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

function highlightRankings(text: string): string {
  // Escape HTML entities first to prevent XSS, then apply bold formatting
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Bold ranking phrases - supports numeric ordinals ("3rd warmest") and
  // word ordinals ("the warmest", "fourth driest")
  // Stops before value citations (numbers, "at X°C", "of X.X mm") so bold
  // doesn't bleed into the rest of the sentence.
  const sup = 'warmest|coldest|hottest|coolest|wettest|driest|sunniest|highest|lowest|fewest|most|least';
  const supNoMost = 'warmest|coldest|hottest|coolest|wettest|driest|sunniest|highest|lowest|fewest|least';
  const wordOrd = 'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth';
  // Words that don't introduce a value - letters only or hyphenated numbers like "12-month"
  const w = `(?:\\s+(?!on\\s+record|in\\s+\\d|of\\s+\\d+\\s*year|of\\s+\\d+[.,°]|at\\s+\\d|with\\s+\\d|averaging\\s)(?:[a-zA-Z][a-zA-Z'\\u2019-]*|\\d+[-\\u2013]\\w+))*`;
  // Optional "on record" / "in N years of records" / "of N years on record"
  const rec = '(?:\\s+(?:on record|in \\d+ years?(?:\\s+of records?)?|of \\d+ years?(?:\\s+on record)?))?';
  // Pattern 1: ordinal + superlative + descriptor words + optional "on record"
  const p1 = `(?:\\d+(?:st|nd|rd|th)|${wordOrd})\\s+(?:${sup})\\b${w}${rec}`;
  // Pattern 2: "the" + superlative (no "most") - REQUIRES "on record" / "of N years"
  const p2 = `the\\s+(?:${supNoMost})\\b${w}\\s+(?:on record|in \\d+ years?(?:\\s+of records?)?|of \\d+ years?(?:\\s+on record)?)`;
  const pattern = new RegExp(`\\b(${p1}|${p2})`, 'gi');
  let out = escaped.replace(pattern, (m) => `<strong style="color:#fff">${m}</strong>`);
  // Linkify bare site paths that Gemini may include (e.g. /extreme-weather,
  // /emissions, /climate/global). Render them as a short human label in the
  // same teal shade used for glossary terms instead of the raw slug.
  const pathLabel = (path: string): string => {
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
  };
  out = out.replace(
    /(^|[\s(—–−])(\/(?:extreme-weather|emissions|energy-dashboard|climate\/[a-z0-9-]+|greenhouse-gases|sea-levels-ice|planetary-boundaries|climate-dashboard|climate\/rankings))(?=[\s).,;:—–−]|$)/gi,
    (_m, lead, path) =>
      `${lead}<a href="${path}" class="border-b border-dotted border-teal-300/60 text-teal-300 hover:text-teal-200 hover:border-teal-200 transition-colors">${pathLabel(path)}</a>`,
  );
  return out;
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
  sublabel?: string;
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
      {panels.map((panel) => {
        // Only the rainfall panel uses the narrow side-column layout that shows
        // the "About these numbers" explainer; sunshine and frost panels always
        // use the compact single-line footer regardless of how many rows they
        // have, so the explainer doesn't keep appearing for countries with
        // only national-level data.
        const isRainfall = /rain|precip/i.test(panel.title);
        const isNarrow = isRainfall && panel.sections.length === 1 && (panel.sections[0]?.rows.length ?? 0) === 1;
        return (
        <div key={panel.title} className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
            {panel.icon}
            <span className="min-w-0 flex-1">{panel.title}</span>
          </h2>
          <div className={`rounded-xl border border-gray-700/50 bg-gray-800/40 overflow-hidden ${
            isNarrow ? 'lg:flex lg:items-stretch' : ''
          }`}>
            <div className={isNarrow ? 'lg:w-[28rem] lg:shrink-0' : ''}>
            <div className={panel.sections.length > 1 ? 'lg:grid lg:grid-cols-2' : ''}>
            {panel.sections.map((section, sIdx) => (
              <div
                key={sIdx}
                className={
                  panel.sections.length > 1
                    ? `${sIdx > 0 ? 'border-t-2 border-gray-600/50 lg:border-t-0 lg:border-l-2' : ''}`
                    : `${sIdx > 0 ? 'border-t-2 border-gray-600/50' : ''}`
                }
              >
                {section.title && (
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{section.title}</div>
                )}
                <div className="p-2 md:p-3 pt-1">
                  {/* Column headers */}
                  <div className="flex gap-px">
                    <div className="w-12 md:w-20 shrink-0" />
                    {section.rows.map((row) => (
                      <div
                        key={row.label}
                        className={`flex-1 min-w-0 px-1 md:px-2 py-1.5 text-[11px] md:text-xs font-bold ${
                          row.isPrimary ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        <div className="truncate">{row.label}</div>
                        {row.sublabel ? (
                          <div className="text-[9px] md:text-[10px] font-normal text-gray-500 truncate normal-case">{row.sublabel}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Data rows with record sub-row after each period */}
                  {periods.map((period, pIdx) => {
                    const periodLabel = section.rows[0]?.[period]?.title ?? '';
                    return (
                      <React.Fragment key={period}>
                        <div className={`flex gap-px border-t border-gray-600/40 ${pIdx % 2 === 0 ? 'bg-gray-800/40' : ''}`}>
                          <div className="w-12 md:w-20 shrink-0 py-2 px-1 text-[10px] md:text-[11px] uppercase tracking-wider text-gray-400 font-semibold leading-tight flex items-start pt-2.5">
                            <span className="md:hidden">{periodShortLabel(periodLabel, period)}</span>
                            <span className="hidden md:inline">{periodLabel}</span>
                          </div>
                          {section.rows.map((row) => {
                            const metric = row[period];
                            return (
                              <div
                                key={`${row.label}-${period}`}
                                className={`flex-1 min-w-0 py-2 px-1 md:px-2 ${
                                  row.isPrimary ? `${panel.accentBg} border-l-4 ${panel.accentBorder}` : ''
                                }`}
                              >
                                <div className={`text-sm font-bold leading-snug ${row.isPrimary ? 'text-white' : 'text-gray-200'}`}>
                                  {metric.value}
                                  <span className={`text-sm font-bold ml-1 ${row.isPrimary ? 'text-white' : 'text-gray-200'}`}>
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
                          <div className="w-12 md:w-20 shrink-0 py-1.5 px-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold leading-tight flex items-center">
                            Record
                          </div>
                          {section.rows.map((row) => (
                            <div
                              key={`${row.label}-${period}-record`}
                              className={`flex-1 min-w-0 py-1.5 px-1 md:px-2 ${
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
            </div>
            </div>

            <div className={`text-gray-500 ${
              isNarrow
                ? 'px-3 py-2 text-[10px] border-t border-gray-700/40 lg:flex-1 lg:border-t-0 lg:border-l lg:border-gray-700/40 lg:px-5 lg:py-4 lg:text-xs lg:leading-relaxed lg:flex lg:items-center'
                : 'px-3 py-2 text-[10px] border-t border-gray-700/40'
            }`}>
              {isNarrow ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1 hidden lg:block">About these numbers</div>
                  <p className="m-0">
                    <span className="text-gray-400">Baseline:</span> 1961–1990 mean.{' '}
                    <span className="text-gray-400">Anomaly:</span> difference from that baseline.{' '}
                    <span className="text-gray-400">Rank:</span> position in the full record (1st = highest ever{panel.accentBorder?.includes('sky') || panel.accentBorder?.includes('purple') ? ', n↓ = lowest' : ''}).{' '}
                    <span className="text-gray-400">Record:</span> highest (or lowest) value on record with its year.
                  </p>
                </div>
              ) : (
                'Baseline: 1961–1990 mean · Anomaly = difference from baseline · Record = highest (or lowest) value on record'
              )}
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

function buildOverviewPanels(data: ProfileData, regionLabel: string, nationalLabel: string): OverviewPanel[] {
  const panels: OverviewPanel[] = [];

  // For country pages with dedicated national data (UK Met Office / US NOAA), use it as primary
  // to get all metrics and avoid a duplicate national comparison row
  const useNationalAsPrimary = data.type === 'country' && !!(data.nationalData?.varData || data.nationalData?.paramData);
  const nd = data.nationalData;

  const temperatureRows = [
    buildOverviewRow(
      regionLabel,
      useNationalAsPrimary
        ? (nd!.varData?.Tmean?.yearly || nd!.paramData?.tavg?.yearly)
        : (data.ukRegionData?.varData?.Tmean?.yearly || data.usStateData?.paramData?.tavg?.yearly || data.countryData?.yearlyData),
      useNationalAsPrimary
        ? (nd!.varData?.Tmean?.latestMonthStats || nd!.paramData?.tavg?.latestMonthStats)
        : (data.ukRegionData?.varData?.Tmean?.latestMonthStats || data.usStateData?.paramData?.tavg?.latestMonthStats || data.countryData?.latestMonthStats),
      useNationalAsPrimary
        ? (nd!.varData?.Tmean?.latestThreeMonthStats || nd!.paramData?.tavg?.latestThreeMonthStats)
        : (data.ukRegionData?.varData?.Tmean?.latestThreeMonthStats || data.usStateData?.paramData?.tavg?.latestThreeMonthStats || data.countryData?.latestThreeMonthStats),
      '°C',
      1,
      false,
      true,
    ),
    ...(useNationalAsPrimary ? [] : [
      buildOverviewRow(
        nationalLabel || 'National',
        data.nationalData?.varData?.Tmean?.yearly || data.nationalData?.paramData?.tavg?.yearly,
        data.nationalData?.varData?.Tmean?.latestMonthStats || data.nationalData?.paramData?.tavg?.latestMonthStats,
        data.nationalData?.varData?.Tmean?.latestThreeMonthStats || data.nationalData?.paramData?.tavg?.latestThreeMonthStats,
        '°C',
        1,
      ),
    ]),
    (() => {
      const row = buildOverviewRow('Global', data.globalData?.noaaStats?.landOcean?.yearly ?? data.globalData?.landYearlyData, data.globalData?.noaaStats?.landOcean?.latestMonthStats ?? data.globalData?.landLatestMonthStats, data.globalData?.noaaStats?.landOcean?.latestThreeMonthStats ?? data.globalData?.landLatestThreeMonthStats, '°C', 1);
      return row ? { ...row, sublabel: 'Land + Ocean' } : null;
    })(),
  ].filter((row): row is OverviewRow => Boolean(row));

  if (temperatureRows.length) {
    panels.push({
      title: 'Temperature – Average',
      icon: <Thermometer className="text-orange-400" />,
      accentClass: 'bg-orange-600',
      accentBg: 'bg-orange-600/50',
      accentBorder: 'border-orange-400/80',
      sections: [{ rows: temperatureRows }],
    });
  }

  const sunshineRows = [
    buildOverviewRow(
      regionLabel,
      useNationalAsPrimary ? nd!.varData?.Sunshine?.yearly : data.ukRegionData?.varData?.Sunshine?.yearly,
      useNationalAsPrimary ? nd!.varData?.Sunshine?.latestMonthStats : data.ukRegionData?.varData?.Sunshine?.latestMonthStats,
      useNationalAsPrimary ? nd!.varData?.Sunshine?.latestThreeMonthStats : data.ukRegionData?.varData?.Sunshine?.latestThreeMonthStats,
      ' hrs', 0, false, true,
    ),
    ...(useNationalAsPrimary ? [] : [
      buildOverviewRow(nationalLabel || 'United Kingdom', data.nationalData?.varData?.Sunshine?.yearly, data.nationalData?.varData?.Sunshine?.latestMonthStats, data.nationalData?.varData?.Sunshine?.latestThreeMonthStats, ' hrs', 0),
    ]),
  ].filter((row): row is OverviewRow => Boolean(row));

  if (sunshineRows.length) {
    panels.push({
      title: 'Sunshine – Total Hours',
      icon: <Sun className="text-amber-400" />,
      accentClass: 'bg-amber-500',
      accentBg: 'bg-amber-500/50',
      accentBorder: 'border-amber-400/80',
      sections: [{ rows: sunshineRows }],
    });
  }

  const rainfallRows = [
    buildOverviewRow(
      regionLabel,
      useNationalAsPrimary
        ? (nd!.varData?.Rainfall?.yearly || nd!.paramData?.pcp?.yearly)
        : (data.ukRegionData?.varData?.Rainfall?.yearly || data.usStateData?.paramData?.pcp?.yearly || data.countryData?.precipYearly),
      useNationalAsPrimary
        ? (nd!.varData?.Rainfall?.latestMonthStats || nd!.paramData?.pcp?.latestMonthStats)
        : (data.ukRegionData?.varData?.Rainfall?.latestMonthStats || data.usStateData?.paramData?.pcp?.latestMonthStats),
      useNationalAsPrimary
        ? (nd!.varData?.Rainfall?.latestThreeMonthStats || nd!.paramData?.pcp?.latestThreeMonthStats)
        : (data.ukRegionData?.varData?.Rainfall?.latestThreeMonthStats || data.usStateData?.paramData?.pcp?.latestThreeMonthStats),
      ' mm',
      0,
      false,
      true,
    ),
    ...(useNationalAsPrimary ? [] : [
      buildOverviewRow(
        nationalLabel || 'National',
        data.nationalData?.varData?.Rainfall?.yearly || data.nationalData?.paramData?.pcp?.yearly,
        data.nationalData?.varData?.Rainfall?.latestMonthStats || data.nationalData?.paramData?.pcp?.latestMonthStats,
        data.nationalData?.varData?.Rainfall?.latestThreeMonthStats || data.nationalData?.paramData?.pcp?.latestThreeMonthStats,
        ' mm',
        0,
      ),
    ]),
  ].filter((row): row is OverviewRow => Boolean(row));

  const rainDaysRows = [
    buildOverviewRow(
      regionLabel,
      useNationalAsPrimary ? nd!.varData?.Raindays1mm?.yearly : data.ukRegionData?.varData?.Raindays1mm?.yearly,
      useNationalAsPrimary ? nd!.varData?.Raindays1mm?.latestMonthStats : data.ukRegionData?.varData?.Raindays1mm?.latestMonthStats,
      useNationalAsPrimary ? nd!.varData?.Raindays1mm?.latestThreeMonthStats : data.ukRegionData?.varData?.Raindays1mm?.latestThreeMonthStats,
      ' days', 0, false, true,
    ),
    ...(useNationalAsPrimary ? [] : [
      buildOverviewRow(nationalLabel || 'United Kingdom', data.nationalData?.varData?.Raindays1mm?.yearly, data.nationalData?.varData?.Raindays1mm?.latestMonthStats, data.nationalData?.varData?.Raindays1mm?.latestThreeMonthStats, ' days', 0),
    ]),
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
    buildOverviewRow(
      regionLabel,
      useNationalAsPrimary ? nd!.varData?.AirFrost?.yearly : data.ukRegionData?.varData?.AirFrost?.yearly,
      useNationalAsPrimary ? nd!.varData?.AirFrost?.latestMonthStats : data.ukRegionData?.varData?.AirFrost?.latestMonthStats,
      useNationalAsPrimary ? nd!.varData?.AirFrost?.latestThreeMonthStats : data.ukRegionData?.varData?.AirFrost?.latestThreeMonthStats,
      ' days', 0, true, true,
    ),
    ...(useNationalAsPrimary ? [] : [
      buildOverviewRow(nationalLabel || 'United Kingdom', data.nationalData?.varData?.AirFrost?.yearly, data.nationalData?.varData?.AirFrost?.latestMonthStats, data.nationalData?.varData?.AirFrost?.latestThreeMonthStats, ' days', 0, true),
    ]),
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

export default function ClimateProfile({
  slug,
  region,
  initialSummary = null,
  initialSources = [],
  summaryCacheMiss = false,
}: {
  slug: string;
  region: ClimateRegion;
  /** Pre-fetched Gemini summary read from Redis at request time on the server.
   *  When provided, the client component skips the auto-fetch on mount so the
   *  raw SSR HTML already contains the summary paragraph (good for AI / search
   *  crawlers). When null, the client falls back to the existing fetch flow. */
  initialSummary?: string | null;
  initialSources?: { title: string; uri: string }[];
  /** True when the SSR cache lookup missed and the server has fired off a
   *  background warm-up call to Gemini. The client renders a friendly
   *  "summary is being generated, refresh in a moment" panel instead of
   *  duplicating the fetch. */
  summaryCacheMiss?: boolean;
}) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const url = `/api/climate/summary/${slug}?_t=${Date.now()}${forceFresh ? '&nocache=1' : ''}`;
      const res = await fetch(url);
      const payload: SummaryResponse | null = await res.json().catch(() => null);

      if (payload?.summary) {
        setSummary(payload.summary);
        setSummarySources(payload.sources || []);
        return;
      }

      setSummaryError(
        payload?.message || 'The AI-generated climate update is temporarily unavailable. The underlying climate data below is still live.'
      );
      setSummaryRetryable(payload?.retryable ?? payload?.source !== 'no-key');
    } catch {
      setSummaryError('The AI-generated climate update could not be loaded right now. The underlying climate data below is still live.');
      setSummaryRetryable(true);
    } finally {
      setSummaryLoading(false);
    }
  };

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

    // Only fetch the Gemini summary client-side if it wasn't pre-seeded by SSR
    // and the server didn't already kick off a background warm-up. When
    // summaryCacheMiss is true, the user sees a friendly "regenerating"
    // panel and a Refresh button - the client doesn't duplicate the fetch.
    if (initialSummary == null && !summaryCacheMiss) {
      void fetchSummary();
    }
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
    ? region.coveragePlaces.slice(0, -1).join(', ') + (region.coveragePlaces.length > 1 ? `${region.coveragePlaces.length > 2 ? ',' : ''} and ${region.coveragePlaces[region.coveragePlaces.length - 1]}` : '')
    : null;
  const coverageLabel =
    region.slug === 'uk' ? 'Coverage:' :
    region.slug === 'usa' ? 'Key States:' :
    region.type === 'country' ? 'Top 5 Cities:' :
    region.type === 'us-state' ? 'Top 5 Cities:' :
    'City Coverage:';

  // Responsive font sizes - shrink when the title is long
  // Combine title and subtitle for header
  const combinedTitle = `${pageTitle} Climate${latestMonthYearLabel ? ` – ${latestMonthYearLabel} Update` : ''}`;
  const h1SizeClass =
    combinedTitle.length > 38 ? 'text-xl md:text-2xl' :
    combinedTitle.length > 28 ? 'text-2xl md:text-3xl' :
    combinedTitle.length > 20 ? 'text-2xl md:text-4xl' :
    'text-3xl md:text-5xl';

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Header ─── */}
          <div id="climate-update" className="scroll-mt-24 rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className={`${h1SizeClass} font-bold font-mono tracking-wide leading-tight`} style={{ color: '#FFF5E7' }}>
                {combinedTitle}
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-4">
              {summary ? (
                <div>
                  {coverageLine && (
                    <div className="inline-flex items-start gap-2 px-3 py-2 rounded-lg border border-[#D0A65E]/30 bg-[#D0A65E]/5">
                      <MapPin className="h-4 w-4 text-[#D0A65E] mt-0.5 shrink-0" />
                      <p className="text-xs md:text-sm font-medium text-[#D0A65E]"><span className="font-semibold">{coverageLabel}</span> {coverageLine}</p>
                    </div>
                  )}
                  <div className="mb-3">
                    <ClimateRankPill slug={slug} />
                  </div>
                  <div className="mt-3 text-gray-300 text-sm leading-relaxed space-y-3">
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
                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <ShareBar
                      pageUrl={`https://4billionyearson.org/climate/${slug}#climate-update`}
                      shareText={encodeURIComponent(`${pageTitle} climate update - 4 Billion Years On`)}
                      emailSubject={`${pageTitle} climate update - 4 Billion Years On`}
                      embedUrl={`https://4billionyearson.org/climate/embed/update/${encodeURIComponent(slug)}`}
                      embedCode={`<iframe\n  src="https://4billionyearson.org/climate/embed/update/${encodeURIComponent(slug)}"\n  width="100%" height="640"\n  style="border:none;"\n  title="${pageTitle} climate update - 4 Billion Years On"\n></iframe>`}
                      wrapperClassName="relative"
                      align="left"
                    />
                    <Link
                      href={`/climate-dashboard?q=${encodeURIComponent(dashboardSearchTerm)}`}
                      className="inline-block text-sm font-semibold text-teal-300 hover:text-teal-200 transition-colors ml-auto"
                    >
                      Full Climate Data for {pageTitle} →
                    </Link>
                  </div>
                </div>
              ) : summaryCacheMiss ? (
                <div>
                  {coverageLine && (
                    <div className="inline-flex items-start gap-2 px-3 py-2 rounded-lg border border-[#D0A65E]/30 bg-[#D0A65E]/5">
                      <MapPin className="h-4 w-4 text-[#D0A65E] mt-0.5 shrink-0" />
                      <p className="text-xs md:text-sm font-medium text-[#D0A65E]"><span className="font-semibold">{coverageLabel}</span> {coverageLine}</p>
                    </div>
                  )}
                  <div className="mb-3">
                    <ClimateRankPill slug={slug} />
                  </div>
                  <div className="rounded-xl border border-[#D0A65E]/40 bg-[#D0A65E]/5 px-4 py-3">
                    <p className="text-sm font-medium text-[#FFF5E7]">A fresh climate update for {region.name} is being generated…</p>
                    <p className="mt-1 text-sm text-gray-300">
                      The new monthly summary is being written by Gemini in the
                      background. This usually takes 5–10 seconds. The live
                      climate data below is already up to date.
                    </p>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D0A65E]/40 bg-[#D0A65E]/10 px-3 py-2 text-sm font-semibold text-[#D0A65E] transition-colors hover:bg-[#D0A65E]/20 hover:text-[#E8C97A]"
                      >
                        Refresh page
                      </button>
                    </div>
                  </div>
                </div>
              ) : summaryLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#D0A65E] shrink-0" />
                  <p className="text-sm text-gray-400">Generating climate update…</p>
                </div>
              ) : (
                <div>
                  {coverageLine && (
                    <div className="inline-flex items-start gap-2 px-3 py-2 rounded-lg border border-[#D0A65E]/30 bg-[#D0A65E]/5">
                      <MapPin className="h-4 w-4 text-[#D0A65E] mt-0.5 shrink-0" />
                      <p className="text-xs md:text-sm font-medium text-[#D0A65E]"><span className="font-semibold">{coverageLabel}</span> {coverageLine}</p>
                    </div>
                  )}
                  <div className="mb-3">
                    <ClimateRankPill slug={slug} />
                  </div>
                  <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3">
                    <p className="text-sm font-medium text-amber-200">Climate update temporarily unavailable</p>
                    <p className="mt-1 text-sm text-gray-300">{summaryError || 'The AI-generated climate update is temporarily unavailable. The measured climate data below is still available and up to date.'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {summaryRetryable && (
                        <button
                          type="button"
                          onClick={() => void fetchSummary(true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#D0A65E]/40 bg-[#D0A65E]/10 px-3 py-2 text-sm font-semibold text-[#D0A65E] transition-colors hover:bg-[#D0A65E]/20 hover:text-[#E8C97A]"
                        >
                          Try again
                        </button>
                      )}
                      <span className="text-xs text-gray-500">No fallback summary is shown when the Gemini request fails.</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-400">{region.tagline}</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Static FAQ ─ rendered unconditionally so AI crawlers and
              Google's first crawl see region-named content in raw SSR
              HTML even before the live data loads. The Gemini summary
              (when available in the Redis cache) is also pre-seeded
              from page.tsx and rendered server-side without a
              placeholder. ── */}

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
              {/* ─── At a Glance: Temperature panels + (USA/UK) climate map.
                  Headline numbers come first; the map adds geographic context
                  for USA / UK pages and any of their sub-national regions. ─── */}
              {(() => {
                const tempPanels = overviewPanels.filter(p => p.title.startsWith('Temperature'));
                const mapPreset: ClimateMapPreset | null =
                  region.slug === 'usa' || region.type === 'us-state' ? 'usa' :
                  region.slug === 'uk' || region.type === 'uk-region' ? 'uk' :
                  null;
                // For UK sub-regions (Met Office areas) the default level is
                // 'uk-countries' but we want to show 'uk-regions'. UK nations
                // (england/wales/scotland/northern-ireland) are fine at the default.
                const UK_NATIONS = new Set(['england', 'scotland', 'wales', 'northern-ireland']);
                const mapInitialLevel =
                  region.type === 'uk-region' && !UK_NATIONS.has(region.slug)
                    ? 'uk-regions' as const
                    : undefined;
                if (tempPanels.length === 0 && !mapPreset) return null;
                return (
                  <>
                    <Divider icon={<Globe2 className="h-5 w-5 text-[#D0A65E]" />} title="At a Glance" />
                    {tempPanels.length > 0 && <OverviewGrid panels={tempPanels} />}
                    {mapPreset && (
                      <ClimateMapCard
                        countryAnomalies={[] as CountryAnomalyRow[]}
                        preset={mapPreset}
                        initialLevel={mapInitialLevel}
                        share={{ pageUrl: `https://4billionyearson.org/climate/${region.slug}`, sectionId: 'climate-map' }}
                      />
                    )}
                  </>
                );
              })()}

              {/* ─── Sections with dividers ─── */}
              {(() => {
                const sunshinePanels = overviewPanels.filter(p => p.title.startsWith('Sunshine'));
                const rainfallPanels = overviewPanels.filter(p => p.title.startsWith('Rainfall'));
                const frostPanels = overviewPanels.filter(p => p.title.startsWith('Frost'));
                const monthlyAll = data.ukRegionData?.varData?.Tmean?.monthlyAll
                  || data.nationalData?.varData?.Tmean?.monthlyAll
                  || data.usStateData?.paramData?.tavg?.monthlyAll
                  || data.nationalData?.paramData?.tavg?.monthlyAll
                  || data.countryData?.monthlyAll;
                const rainfallMonthly = data.ukRegionData?.varData?.Rainfall?.monthlyAll
                  || data.nationalData?.varData?.Rainfall?.monthlyAll
                  || data.usStateData?.paramData?.pcp?.monthlyAll
                  || data.nationalData?.paramData?.pcp?.monthlyAll
                  || data.countryPrecipData?.monthlyAll;
                const sunshineMonthly = data.ukRegionData?.varData?.Sunshine?.monthlyAll
                  || data.nationalData?.varData?.Sunshine?.monthlyAll;
                const frostMonthly = data.ukRegionData?.varData?.AirFrost?.monthlyAll
                  || data.nationalData?.varData?.AirFrost?.monthlyAll;
                const spaghettiSeries: SeriesMap = {
                  temp: monthlyAll,
                  precip: rainfallMonthly,
                  sunshine: sunshineMonthly,
                  frost: frostMonthly,
                };
                const chartSource = (data.ukRegionData || data.nationalData?.varData)
                  ? 'Data: Met Office UK Regional Series © Crown copyright'
                  : (data.usStateData || data.nationalData?.paramData)
                    ? 'Data: NOAA National Centers for Environmental Information'
                    : 'Data: Our World in Data / NOAA (rainfall: World Bank CCKP / CRU TS 4.08)';

                return (
                  <>
                    {/* Year-on-year multi-metric chart + Shifting Seasons card. */}
                    {(monthlyAll?.length || rainfallMonthly?.length || sunshineMonthly?.length || frostMonthly?.length) ? (
                      <>
                        <Divider icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Year-on-Year Trends" />
                        <MonthlySpaghettiCard
                          series={spaghettiSeries}
                          regionName={pageTitle}
                          dataSource={chartSource}
                          embedSlug={slug}
                          share={{ pageUrl: `https://4billionyearson.org/climate/${slug}`, sectionId: 'monthly-history' }}
                        />
                      </>
                    ) : null}

                    {monthlyAll?.length ? (
                      <SeasonalShiftCard
                        monthlyAll={monthlyAll}
                        rainfallMonthly={rainfallMonthly}
                        sunshineMonthly={sunshineMonthly}
                        regionName={pageTitle}
                        dataSource={chartSource}
                        share={{
                          pageUrl: `https://4billionyearson.org/climate/${slug}`,
                          sectionId: 'shifting-seasons',
                          embedUrl: `https://4billionyearson.org/climate/embed/seasons/${encodeURIComponent(slug)}`,
                          embedCode: `<iframe\n  src="https://4billionyearson.org/climate/embed/seasons/${encodeURIComponent(slug)}"\n  width="100%" height="720"\n  style="border:none;"\n  title="Shifting Seasons - ${pageTitle} - 4 Billion Years On"\n></iframe>`,
                        }}
                      />
                    ) : null}

                    {/* Sunshine + Frost - paired side-by-side on lg (both single-column) */}
                    {(sunshinePanels.length > 0 || frostPanels.length > 0) && (
                      <>
                        <Divider icon={<Sun className="h-5 w-5 text-amber-300" />} title="Sunshine & Frost" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          {sunshinePanels.length > 0 && (
                            <div>
                              <OverviewGrid panels={sunshinePanels} />
                            </div>
                          )}
                          {frostPanels.length > 0 && (
                            <div>
                              <OverviewGrid panels={frostPanels} />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Rainfall - full width; inner Rainfall + Rain Days sections already pair at lg */}
                    {rainfallPanels.length > 0 && (
                      <>
                        <Divider icon={<Droplets className="h-5 w-5 text-sky-300" />} title="Rainfall & Precipitation" />
                        <OverviewGrid panels={rainfallPanels} />
                      </>
                    )}
                  </>
                );
              })()}

              {/* ─── Emissions & Energy ─── */}
              {(region.type === 'country' || region.type === 'us-state' || region.type === 'uk-region') && (
                <>
                  <Divider icon={<Factory className="h-5 w-5 text-rose-400" />} title="Emissions & Energy" />
                  {region.type === 'uk-region' && (
                    <div className="rounded-xl border border-[#D0A65E]/60 bg-gray-950/95 backdrop-blur-sm px-4 py-2.5 text-xs text-gray-200 shadow-lg">
                      Showing UK-wide figures - {region.name} is part of the United Kingdom. Sub-national emissions and electricity-mix breakdowns are not yet published in a unified format.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {region.type === 'country' ? (
                      <>
                        <EmissionsCard countryName={region.name} />
                        <EnergyMixCard countryName={region.name} />
                      </>
                    ) : region.type === 'us-state' ? (
                      <>
                        <EmissionsCard
                          usStateCode={region.apiCode.replace('us-', '').toUpperCase()}
                          usStateName={region.name}
                        />
                        <EnergyMixCard
                          usStateCode={region.apiCode.replace('us-', '').toUpperCase()}
                          usStateName={region.name}
                        />
                      </>
                    ) : (
                      <>
                        <EmissionsCard countryName="United Kingdom" />
                        <EnergyMixCard countryName="United Kingdom" />
                      </>
                    )}
                  </div>
                </>
              )}

              <Divider icon={<BookOpen className="h-5 w-5 text-[#D0A65E]" />} title="Explore" />

              {/* ─── Explore More ─── */}
              <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
                <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-start gap-2">
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
              </section>
            </>
          )}

          {/* ─── Data Sources ─ static, always-visible card listing the
              authoritative datasets that drive every figure on this page. */}
          <Divider icon={<BookOpen className="h-5 w-5" />} title="Data Sources" />
          <RegionDataSourcesCard region={region} />

          {/* ─── Frequently Asked Questions ─ always rendered so AI search
              engines and non-JS crawlers can extract region-tailored
              Q&A from raw SSR HTML. Mirrors FAQPage JSON-LD below. ────── */}
          <Divider icon={<BookOpen className="h-5 w-5" />} title="FAQs" />
          <StaticFAQPanel
            headingId="climate-faq-heading"
            qa={buildRegionFAQ(region)}
          />
          <FaqJsonLd qa={buildRegionFAQ(region)} />
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
      className="relative block rounded-xl border border-gray-700/50 bg-gray-900 hover:bg-gray-800 hover:border-gray-600 p-4 transition-all shadow-md"
    >
      <ExternalLink className="absolute top-3 right-3 w-3.5 h-3.5 text-teal-300" />
      <div className="font-semibold text-white text-sm pr-5">{label}</div>
      <div className="text-xs text-gray-300 mt-1">{desc}</div>
    </Link>
  );
}
