"use client";

import React, { useEffect } from 'react';
import { Scale } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import ShareBar from '@/app/climate/enso/_components/ShareBar';

interface YearlyPoint {
  year: number;
  absoluteTemp: number;
  rollingAvg?: number | null;
}

export interface ParisTrackerData {
  yearlyData: YearlyPoint[];
  preIndustrialBaseline: number;
  keyThresholds: { plus1_5: number; plus2_0: number };
}

interface ShareProps {
  pageUrl: string;
  sectionId: string;
  embedUrl?: string;
  embedCode?: string;
}

function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}`;
}

export default function ParisTrackerCard({
  data,
  share,
  hideShare,
}: {
  data: ParisTrackerData;
  share?: ShareProps;
  hideShare?: boolean;
}) {
  const latestYearly = data.yearlyData?.length ? data.yearlyData[data.yearlyData.length - 1] : null;
  const rolling10yr = latestYearly?.rollingAvg ?? null;
  const vsPreIndustrial = rolling10yr != null ? rolling10yr - data.preIndustrialBaseline : null;

  // Re-anchor when the page is opened with a hash that targets this card,
  // because GlobalProfile fetches data async and the card mounts after the
  // browser's initial scroll. Same pattern as ClimateMapCard.
  useEffect(() => {
    if (!share?.sectionId) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#' + share.sectionId) return;
    const el = document.getElementById(share.sectionId);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [share?.sectionId]);

  if (rolling10yr == null || vsPreIndustrial == null || latestYearly == null) return null;

  const pct15 = Math.min(100, Math.max(0, (vsPreIndustrial / 1.5) * 100));
  const pct20 = Math.min(100, Math.max(0, (vsPreIndustrial / 2.0) * 100));
  const latestYearValue = latestYearly.absoluteTemp ?? null;
  const latestYearDelta = latestYearValue != null ? latestYearValue - data.preIndustrialBaseline : null;
  const decadeStart = (latestYearly.year ?? 0) - 9;
  const decadeEnd = latestYearly.year ?? 0;
  const atOrPast15 = vsPreIndustrial >= 1.5;

  const yearlyWithAnom = (data.yearlyData ?? []).map((p) => ({
    year: p.year,
    absoluteTemp: p.absoluteTemp,
    rollingAvg: p.rollingAvg ?? null,
    annualAnomaly: p.absoluteTemp - data.preIndustrialBaseline,
    decadeAnomaly: p.rollingAvg != null ? p.rollingAvg - data.preIndustrialBaseline : null,
  }));
  const hottestYear = yearlyWithAnom.length
    ? yearlyWithAnom.reduce((best, p) => (p.annualAnomaly > best.annualAnomaly ? p : best))
    : null;
  const firstAnnualBreach15 = yearlyWithAnom.find((p) => p.annualAnomaly >= 1.5);

  const chartData = yearlyWithAnom.filter((p) => p.year >= 2000);
  const chartStart = chartData.length ? chartData[0].year : 2000;
  const chartEnd = chartData.length ? chartData[chartData.length - 1].year : decadeEnd;
  const wmoYears = yearlyWithAnom.filter((p) => p.year >= 1961 && p.year <= 1990);
  const wmoBaselineAnom = wmoYears.length
    ? wmoYears.reduce((s, p) => s + p.annualAnomaly, 0) / wmoYears.length
    : null;

  return (
    <div
      id={share?.sectionId}
      className={`bg-gray-950/90 backdrop-blur-md p-5 pb-4 md:p-6 md:pb-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]${share?.sectionId ? ' scroll-mt-24' : ''}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:flex-wrap">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold font-mono text-white mb-1 flex items-start gap-2">
            <Scale className="h-5 w-5 shrink-0 text-orange-400 mt-1" />
            <span className="min-w-0 flex-1">Paris Agreement Tracker</span>
          </h3>
          <p className="text-xs text-gray-400">
            How close are we to 1.5°C and 2°C? Global land + ocean surface temperature (NOAA) – the series used by Copernicus, WMO and the IPCC.
          </p>
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

      {chartData.length > 0 && (
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      )}

      {/* Key milestones */}
      <div className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">10-year mean ({decadeStart}–{decadeEnd})</p>
          <p className="font-mono text-white mt-0.5 text-2xl md:text-2xl font-bold">
            <span className={atOrPast15 ? 'text-red-300' : 'text-orange-300'}>{formatSigned(vsPreIndustrial)}°C</span>
          </p>
          <p className="text-[11px] text-gray-400">{rolling10yr.toFixed(2)}°C absolute · official Paris metric</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Latest full year ({decadeEnd})</p>
          <p className="font-mono text-white mt-0.5 text-2xl md:text-2xl font-bold">
            {latestYearDelta != null ? formatSigned(latestYearDelta) : '—'}°C
          </p>
          <p className="text-[11px] text-gray-400">{latestYearValue != null ? `${latestYearValue.toFixed(2)}°C absolute` : '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Hottest year on record</p>
          <p className="font-mono text-white mt-0.5 text-2xl md:text-2xl font-bold">
            {hottestYear ? `${formatSigned(hottestYear.annualAnomaly)}°C` : '—'}
          </p>
          <p className="text-[11px] text-gray-400">{hottestYear ? `in ${hottestYear.year}` : '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">First year above 1.5°C</p>
          <p className="font-mono text-white mt-0.5 text-2xl md:text-2xl font-bold">
            {firstAnnualBreach15 ? firstAnnualBreach15.year : 'not yet'}
          </p>
          <p className="text-[11px] text-gray-400">
            {firstAnnualBreach15 ? `${formatSigned(firstAnnualBreach15.annualAnomaly)}°C - a single-year breach, not yet the 10-yr mean` : 'annual basis, NOAA'}
          </p>
        </div>
      </div>

      {/* Baselines explainer */}
      <div className="mt-5 pt-4 border-t border-gray-800">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Two baselines, two purposes</p>
        <ul className="text-xs text-gray-400 space-y-1.5">
          <li><span className="text-white font-semibold">Pre-industrial (1850-1900)</span> ≈ {data.preIndustrialBaseline.toFixed(1)}°C - used <em>only</em> for the Paris 1.5°C and 2.0°C limits above.</li>
          <li><span className="text-white font-semibold">1961-1990 (WMO standard)</span> - used for the monthly/quarterly rankings in the table above and on country pages. A relatively stable mid-20th-century reference.</li>
        </ul>
      </div>

      {!hideShare && share && (
        <ShareBar
          pageUrl={share.pageUrl + '#' + share.sectionId}
          shareText={encodeURIComponent('Paris Agreement Tracker - 4 Billion Years On')}
          emailSubject="Paris Agreement Tracker - 4 Billion Years On"
          embedUrl={share.embedUrl}
          embedCode={share.embedCode}
        />
      )}
    </div>
  );
}

ParisTrackerCard.computeReady = (data: ParisTrackerData | null | undefined) => {
  if (!data) return false;
  const last = data.yearlyData?.[data.yearlyData.length - 1];
  return !!last && last.rollingAvg != null;
};
