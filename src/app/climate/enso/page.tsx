'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  LineChart,
  Line,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowRight,
  CloudRain,
  Globe2,
  History,
  Loader2,
  Map as MapIcon,
  Sun,
  Thermometer,
  TrendingUp,
  Waves,
  Wind,
} from 'lucide-react';
import { REGION_IMPACTS, PAST_EVENTS, type ImpactPhase } from '@/lib/climate/enso-impacts';
import EnsoRegionMap from './EnsoRegionMap';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ─── Types ───────────────────────────────────────────────────────────────── */

type EnsoState = 'El Niño' | 'La Niña' | 'Neutral';

type OniData = {
  state: EnsoState;
  strength: string;
  anomaly: number;
  season: string;
  seasonYear: number;
  history: { season: string; year: number; anom: number }[];
};

type WeeklyRow = {
  date: string;
  year: number;
  month: number;
  day: number;
  nino12: { sst: number; anom: number };
  nino3: { sst: number; anom: number };
  nino34: { sst: number; anom: number };
  nino4: { sst: number; anom: number };
};

type WeeklyData = {
  latest: WeeklyRow;
  weekly: WeeklyRow[];
  baseline: string;
  firstWeek: string;
  lastWeek: string;
};

type MeiData = {
  latest: { year: number; season: string; seasonIndex: number; value: number };
  history: { year: number; season: string; seasonIndex: number; value: number }[];
};

type SoiData = {
  latest: { year: number; month: number; value: number };
  history: { year: number; month: number; value: number }[];
};

type ForecastSeason = {
  season: string;
  label: string;
  pLaNina: number;
  pNeutral: number;
  pElNino: number;
};

type ForecastData = {
  seasons: ForecastSeason[];
  imageUrl: string | null;
};

type PlumePeriod = {
  period: number;
  label: string;
  seasonAnchorYear: number;
  mean: number | null;
  dynMean: number | null;
  statMean: number | null;
  modelCount: number;
  models: { name: string; type: string; value: number }[];
};

type PlumeData = {
  issueYear: number;
  issueMonth: number;
  periods: PlumePeriod[];
};

type EnsoSnapshot = {
  oni: OniData | null;
  weekly: WeeklyData | null;
  mei: MeiData | null;
  soi: SoiData | null;
  forecast: ForecastData | null;
  plume: PlumeData | null;
  sources: Record<string, string>;
  images: {
    sstAnomalyMap: string;
    tropicalSstAnimation: string;
    subsurfaceAnomaly: string;
    hovmollerSst: string;
    cpcProbabilityForecast: string | null;
    metOfficePlumeNino34?: string;
    metOfficePlumeNino3?: string;
    metOfficePlumeNino4?: string;
    metOfficePlumeNino12?: string;
    metOfficeImpactElNinoTemp?: string;
    metOfficeImpactElNinoPrecip?: string;
    metOfficeImpactLaNinaTemp?: string;
    metOfficeImpactLaNinaPrecip?: string;
  };
  generatedAt: string;
};

/* ─── Shared styling ──────────────────────────────────────────────────────── */

const ACCENT = '#D0A65E';

// Recharts tooltip props - fixes default dark text on dark bg.
const TT_CONTENT = { backgroundColor: '#0f172a', border: `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 12, color: '#f3f4f6' } as const;
const TT_LABEL = { color: '#ffffff', fontWeight: 600, marginBottom: 4 } as const;
const TT_ITEM = { color: '#e5e7eb' } as const;
const TT_CURSOR = { fill: 'rgba(208,166,94,0.08)' } as const;

function Divider({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mt-8 mb-4 flex items-center gap-3">
      <span className="text-[#D0A65E]">{icon}</span>
      <h2 className="text-2xl font-bold font-mono text-white">{title}</h2>
      <div className="flex-1 border-t border-[#D0A65E]/30" />
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <div className="mb-3">
        <h3 className="text-xl font-bold font-mono text-white flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
          <span className="min-w-0 flex-1">{title}</span>
        </h3>
        {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const ENSO_COLORS: Record<EnsoState, string> = {
  'El Niño': '#f43f5e',
  'La Niña': '#0ea5e9',
  Neutral: '#a3a3a3',
};

const ENSO_TEXT: Record<EnsoState, string> = {
  'El Niño': 'text-rose-300',
  'La Niña': 'text-sky-300',
  Neutral: 'text-gray-300',
};

const fmtSigned = (v: number, d = 2) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function EnsoPage() {
  const [data, setData] = useState<EnsoSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ImpactPhase>('el-nino');
  const [continentFilter, setContinentFilter] = useState<string>('All');

  useEffect(() => {
    fetch('/api/climate/enso')
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e?.message || 'Failed to load'));
  }, []);

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-orange-900/30 border border-orange-800/50 text-orange-300 rounded-xl p-4">
          {error}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-sky-300" />
        <p className="text-gray-400 text-sm">Loading ENSO data…</p>
      </main>
    );
  }

  const { oni, weekly, mei, soi, images, generatedAt } = data;
  const plume = data.plume;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-4">
      {/* ─── Hero ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
        <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
          <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
            El Niño / La Niña - Live ENSO Tracker
          </h1>
        </div>
        <div className="bg-gray-950/90 backdrop-blur-md p-4">
          <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
            The El Niño-Southern Oscillation (ENSO) is the single biggest year-to-year driver of
            global temperature and rainfall after the long-term warming trend itself. This page
            combines the four most-watched indicators - Niño 3.4 SST, the Oceanic Niño Index,
            the Multivariate ENSO Index and the Southern Oscillation Index - with live
            tropical Pacific maps and the official NOAA forecast.
          </p>
        </div>
      </div>

      {/* ─── Hero state + Niño-region map ──────────────────────── */}
      {oni && (() => {
        // Anomaly → text-class for headline numbers
        const anomColor = (a: number) =>
          a >= 0.5 ? 'text-rose-300' : a <= -0.5 ? 'text-sky-300' : 'text-gray-200';

        const regions = weekly
          ? ([
              {
                label: 'Niño 1+2',
                key: 'nino12',
                area: 'Coastal Peru/Ecuador (10°S–0°, 90°W–80°W)',
                blurb: 'Often leads coastal El Niño signals',
                box: { x: 882, y: 150, w: 59, h: 60 }, // 10°S–0°, 90–80°W
                labelAt: { x: 912, y: 240 },
              },
              {
                label: 'Niño 3',
                key: 'nino3',
                area: 'Eastern Pacific (5°S–5°N, 150°W–90°W)',
                blurb: 'Eastern equatorial Pacific',
                box: { x: 529, y: 90, w: 353, h: 120 }, // 5°S–5°N, 150–90°W
                labelAt: { x: 706, y: 80 },
              },
              {
                label: 'Niño 3.4',
                key: 'nino34',
                area: 'Central Pacific (5°S–5°N, 170°W–120°W)',
                blurb: 'Official ENSO yardstick',
                box: { x: 412, y: 90, w: 294, h: 120 }, // 5°S–5°N, 170°W–120°W
                labelAt: { x: 559, y: 230 },
              },
              {
                label: 'Niño 4',
                key: 'nino4',
                area: 'Western Pacific warm pool (5°S–5°N, 160°E–150°W)',
                blurb: 'Warm-pool dynamics',
                box: { x: 235, y: 90, w: 294, h: 120 }, // 5°S–5°N, 160°E–150°W
                labelAt: { x: 382, y: 80 },
              },
            ] as const)
          : [];

        return (
          <SectionCard
            icon={<Activity className="text-sky-300" />}
            title={`Current state - ${oni.state}${oni.strength ? `, ${oni.strength}` : ''}`}
            subtitle="The four NOAA Niño regions sample different stretches of the equatorial Pacific. Niño 3.4 (central Pacific) is the official ENSO yardstick - it drives the headline number. The other three regions add texture: Niño 1+2 off Peru leads coastal signals, Niño 4 captures the western warm-pool dynamics."
          >
            {/* Headline: ONI · Niño 3.4 weekly · Thresholds */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ONI · 3-month mean</p>
                <p className={`text-3xl font-bold font-mono ${ENSO_TEXT[oni.state]}`}>{oni.state}</p>
                <p className="text-sm text-gray-400 mt-1">
                  <span className="font-mono text-white">{fmtSigned(oni.anomaly)}°C</span> ·{' '}
                  {oni.season} {oni.seasonYear}
                </p>
              </div>
              {weekly && (
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Niño 3.4 · this week</p>
                  <p className={`text-3xl font-bold font-mono ${anomColor(weekly.latest.nino34.anom)}`}>
                    {fmtSigned(weekly.latest.nino34.anom)}°C
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    SST {weekly.latest.nino34.sst.toFixed(1)}°C · week of {weekly.lastWeek}
                  </p>
                </div>
              )}
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Thresholds</p>
                <p className="text-sm text-gray-200 font-mono">
                  <span className="text-rose-400">≥ +0.5°C</span> El Niño
                </p>
                <p className="text-sm text-gray-200 font-mono">
                  <span className="text-sky-400">≤ −0.5°C</span> La Niña
                </p>
                <p className="text-sm text-gray-200 font-mono">otherwise Neutral</p>
              </div>
            </div>

            {/* Live Leaflet map of the four Niño regions over the equatorial Pacific */}
            {weekly && (
              <div className="mt-5 rounded-xl border border-gray-700/50 bg-gray-800/30 p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Where the data comes from - equatorial Pacific
                </p>
                <EnsoRegionMap
                  anoms={{
                    nino12: weekly.latest.nino12.anom,
                    nino3: weekly.latest.nino3.anom,
                    nino34: weekly.latest.nino34.anom,
                    nino4: weekly.latest.nino4.anom,
                  }}
                />
                <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                  Box colour shows this week&rsquo;s SST anomaly relative to the 1991-2020 baseline:
                  {' '}<span className="text-rose-400">warmer than average</span>{' '}
                  (El Niño-leaning) or{' '}
                  <span className="text-sky-400">cooler than average</span>{' '}
                  (La Niña-leaning). A pink box does not by itself mean an El Niño event has been declared - that requires sustained Niño&nbsp;3.4 anomalies above +0.5&deg;C for several months. Niño&nbsp;3 and Niño&nbsp;3.4 overlap by design; 3.4 is the central slice that NOAA tracks for the official ENSO state.
                </p>
              </div>
            )}

            {/* Per-region anomaly cards */}
            {weekly && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {regions.map((r) => {
                  const v = (weekly.latest as any)[r.key] as { sst: number; anom: number };
                  const lean = leaningLabel(v.anom);
                  return (
                    <div key={r.key} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{r.label}</p>
                      <p className={`text-2xl font-bold font-mono ${anomColor(v.anom)}`}>{fmtSigned(v.anom)}°C</p>
                      <p className={`text-[10px] font-mono uppercase tracking-wider mt-0.5 ${lean.cls}`}>{lean.text}</p>
                      <p className="text-xs text-gray-400 mt-1">SST {v.sst.toFixed(1)}°C</p>
                      <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">{r.area}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              El Niño years tend to push global temperature higher (El Niño 2023-24 helped make
              2024 the hottest year on record). La Niña years temporarily damp the long-term
              warming trend - but the underlying greenhouse-gas-driven trend continues either way.
              The four-region snapshot above shows how those signals are forming right now across
              the Pacific basin - and feed into the forecast curve below.
            </p>
          </SectionCard>
        );
      })()}

      {/* ═══ PAST + FUTURE HERO STORY ════════════════════════════ */}
      {oni && (() => {
        // Numeric (decimal-year) timeline so the forecast El Niño can be
        // positioned exactly between MJJ 2026 and end of NDJ (Jan 2027).
        const yearsBack = 7;
        const currentYear = new Date().getFullYear();
        const minYear = currentYear - yearsBack + 1;
        // Use the live weekly Niño 3.4 anomaly for "now" - it's the most
        // up-to-date number and matches the headline card. Fall back to the
        // lagging 3-month ONI if weekly is unavailable.
        const currentOni = weekly?.latest.nino34.anom ?? oni.anomaly;

        // Decimal-year for "now" using actual current date.
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
        const endOfYear = new Date(now.getFullYear() + 1, 0, 1).getTime();
        const todayX = now.getFullYear() + (now.getTime() - startOfYear) / (endOfYear - startOfYear);

        // Map a 3-month season label like "MJJ" to its [start, end] decimal-year
        // window. MJJ = May 1 → end of July.
        const SEASON_MONTHS: Record<string, [number, number]> = {
          DJF: [-1, 1], JFM: [0, 2], FMA: [1, 3], MAM: [2, 4], AMJ: [3, 5],
          MJJ: [4, 6], JJA: [5, 7], JAS: [6, 8], ASO: [7, 9], SON: [8, 10],
          OND: [9, 11], NDJ: [10, 12],
        };
        const seasonWindow = (label: string, anchorYear: number): [number, number] => {
          const months = SEASON_MONTHS[label] || [0, 2];
          // start is first day of months[0], end is first day of months[1]+1
          const startMonth = months[0]; // 0-indexed; -1 means previous Dec
          const endMonth = months[1] + 1;
          const start = anchorYear + startMonth / 12;
          const end = anchorYear + endMonth / 12;
          return [start, end];
        };
        // Decimal-year for the centre month of a 3-month season.
        const seasonCentre = (label: string, anchorYear: number): number => {
          const [a, b] = seasonWindow(label, anchorYear);
          return (a + b) / 2;
        };

        // Detect past ENSO events using the NOAA-official rule: an event is
        // declared only when the ONI stays at or beyond ±0.5°C for at least
        // 5 consecutive overlapping 3-month seasons. Brief one- or two-season
        // excursions (e.g. early-2020 weak warmth, isolated late-2025 wobbles)
        // do NOT qualify as El Niño/La Niña events and should not be labelled
        // - they're noise relative to the year-to-year ENSO cycle.
        const MIN_CONSECUTIVE_SEASONS = 5;
        // We also require the event peak to clearly exceed the threshold, so
        // a string of marginal +0.5/+0.6 readings doesn't get flagged.
        const MIN_PEAK_MAGNITUDE = 0.5;
        const histInWindow = oni.history.filter((p) => p.year >= minYear && p.year < currentYear);
        type EnsoEvent = {
          phase: 'el-nino' | 'la-nina';
          startX: number;
          endX: number;
          peak: number;
          peakLabel: string;
          firstLabel: string;
          lastLabel: string;
        };
        const events: EnsoEvent[] = [];
        let cur: { phase: 'el-nino' | 'la-nina'; rows: typeof histInWindow } | null = null;
        const flush = () => {
          if (!cur || cur.rows.length === 0) return;
          // Skip runs that don't meet NOAA's 5-season duration rule.
          if (cur.rows.length < MIN_CONSECUTIVE_SEASONS) { cur = null; return; }
          const peakRow = cur.rows.reduce((a, b) => (Math.abs(b.anom) > Math.abs(a.anom) ? b : a));
          // Belt-and-braces: also require a clear peak.
          if (Math.abs(peakRow.anom) < MIN_PEAK_MAGNITUDE) { cur = null; return; }
          const first = cur.rows[0];
          const last = cur.rows[cur.rows.length - 1];
          const [s] = seasonWindow(first.season, first.year);
          const [, e] = seasonWindow(last.season, last.year);
          events.push({
            phase: cur.phase,
            startX: s,
            endX: e,
            peak: peakRow.anom,
            peakLabel: `${peakRow.season} ${peakRow.year}`,
            firstLabel: `${first.season} ${first.year}`,
            lastLabel: `${last.season} ${last.year}`,
          });
          cur = null;
        };
        for (const p of histInWindow) {
          const phase: 'el-nino' | 'la-nina' | null = p.anom >= 0.5 ? 'el-nino' : p.anom <= -0.5 ? 'la-nina' : null;
          if (phase === null) { flush(); continue; }
          if (cur && cur.phase === phase) {
            cur.rows.push(p);
          } else {
            flush();
            cur = { phase, rows: [p] };
          }
        }
        flush();
        // Past = empty data array (we render bars via ReferenceArea below) but
        // we still pass at least one row for axis domain calculations.
        const past = events.map((ev) => ({
          x: (ev.startX + ev.endX) / 2,
          year: Math.floor((ev.startX + ev.endX) / 2),
          label: `${ev.firstLabel} → ${ev.lastLabel}`,
          phase: ev.phase,
          peak: ev.peak,
        }));

        // Forecast analysis.
        const seasons = data?.forecast?.seasons || [];
        const first50 = seasons.find((s) => s.pElNino >= 50);
        const first90 = seasons.find((s) => s.pElNino >= 90);
        const last90Idx = (() => {
          let last = -1;
          seasons.forEach((s, i) => { if (s.pElNino >= 90) last = i; });
          return last;
        })();
        const last90 = last90Idx >= 0 ? seasons[last90Idx] : null;
        const peakSeason = seasons.reduce<ForecastSeason | null>(
          (a, b) => (a === null || b.pElNino > a.pElNino ? b : a),
          null,
        );
        const isForecastingElNino = !!first50;

        // Predicted peak intensity. Prefer the IRI plume (multi-model dynamical
        // mean) when available - that's a real model-driven number, not just a
        // historical average. Falls back to the mean of past El Niño peaks.
        const plumePeaks = (data?.plume?.periods || [])
          .map((p) => p.dynMean ?? p.mean)
          .filter((v): v is number => v != null);
        const elNinoPeaks = past.filter((p) => p.peak >= 0.5).map((p) => p.peak);
        const predictedPeakOni = plumePeaks.length
          ? Math.max(...plumePeaks)
          : elNinoPeaks.length
            ? elNinoPeaks.reduce((a, b) => a + b, 0) / elNinoPeaks.length
            : 1.5;
        // Locate which plume period holds that peak so labels match.
        const plumePeakPeriod = (data?.plume?.periods || []).reduce<PlumePeriod | null>(
          (a, b) => {
            const bv = b.dynMean ?? b.mean;
            const av = a ? (a.dynMean ?? a.mean) : null;
            if (bv == null) return a;
            if (av == null || bv > av) return b;
            return a;
          },
          null,
        );

        // Anchor seasons on current/next year. Seasons earlier in the array
        // belong to the current year; once labels wrap, anchor on next year.
        // Simpler heuristic: anchor on currentYear, but NDJ rolls to currentYear too
        // since NDJ runs Nov(currentYear)→Jan(currentYear+1) - its window already
        // crosses the year via SEASON_MONTHS (endMonth=12 → 13 = next Jan).
        const elNinoStart = first50 ? seasonWindow(first50.season, currentYear)[0] : null;
        // End = end of last ≥30% El Niño season (i.e. when probability drops back).
        const lastNotableIdx = (() => {
          let last = -1;
          seasons.forEach((s, i) => { if (s.pElNino >= 30) last = i; });
          return last;
        })();
        const lastNotable = lastNotableIdx >= 0 ? seasons[lastNotableIdx] : null;
        // End of the forecast envelope. Prefer the last plume period (extends
        // further than the CPC probability outlook) so the dashed window covers
        // every model-predicted month.
        const lastPlume = data?.plume?.periods?.[data.plume.periods.length - 1];
        const elNinoEnd = lastPlume
          ? seasonWindow(lastPlume.label, lastPlume.seasonAnchorYear)[1]
          : lastNotable
            ? seasonWindow(lastNotable.season, currentYear)[1]
            : null;
        // Peak X position. Plume gives us a model-driven peak season; otherwise
        // fall back to the highest-probability CPC season.
        const peakX = plumePeakPeriod
          ? seasonCentre(plumePeakPeriod.label, plumePeakPeriod.seasonAnchorYear)
          : peakSeason
            ? seasonCentre(peakSeason.season, currentYear)
            : null;

        const xMin = minYear - 0.5;
        // Extend to the end of the year that contains elNinoEnd plus a small
        // buffer, so the next integer tick (e.g. 2028) renders.
        const xMax = Math.max(
          currentYear + 1.5,
          (elNinoEnd ?? currentYear + 1) + 0.5,
        );

        // X-axis ticks - integer years only.
        const yearTicks: number[] = [];
        for (let y = minYear; y <= Math.ceil(xMax); y++) yearTicks.push(y);

        // Build the detailed time series: weekly Niño 3.4 anomalies for the
        // observed past, plus a synthetic profile through the forecast window.
        type ChartPoint = {
          x: number;
          anom?: number; // observed weekly value
          pos?: number;  // positive (El Niño) area fill
          neg?: number;  // negative (La Niña) area fill
          fcAnom?: number; // forecast value
          fcPos?: number;  // forecast positive area fill
          dateLabel?: string;
        };
        const decimalYearFromYMD = (y: number, m: number, d: number) => {
          const start = new Date(y, 0, 1).getTime();
          const end = new Date(y + 1, 0, 1).getTime();
          const t = new Date(y, m - 1, d).getTime();
          return y + (t - start) / (end - start);
        };
        const observedPoints: ChartPoint[] = (weekly?.weekly || [])
          .filter((w) => {
            const dx = decimalYearFromYMD(w.year, w.month, w.day);
            return dx >= xMin && dx <= todayX + 0.001;
          })
          .map((w) => {
            const dx = decimalYearFromYMD(w.year, w.month, w.day);
            const a = w.nino34.anom;
            return {
              x: dx,
              anom: a,
              pos: a > 0 ? a : 0,
              neg: a < 0 ? a : 0,
              dateLabel: `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`,
            };
          })
          .sort((a, b) => a.x - b.x);
        // Bridge the gap between the last weekly reading (typically a few
        // days behind) and "today" by extending the observed series to
        // todayX with the same currentOni value the "Now" dot uses. This
        // eliminates the small black strip that otherwise appears under
        // the Now dot.
        if (observedPoints.length) {
          const last = observedPoints[observedPoints.length - 1];
          if (todayX > last.x + 0.0001) {
            observedPoints.push({
              x: todayX,
              anom: currentOni,
              pos: currentOni > 0 ? currentOni : 0,
              neg: currentOni < 0 ? currentOni : 0,
              dateLabel: `today (${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')})`,
            });
          }
        }

        // Forecast curve - built from the IRI/Columbia ENSO plume (multi-model
        // mean of dynamical + statistical Niño 3.4 forecasts) when available,
        // falling back to a synthetic peak-shaped profile otherwise. Each plume
        // period is one 3-month overlapping season; we anchor the value at the
        // season centre and let Recharts interpolate.
        const forecastPoints: ChartPoint[] = [];
        const plumePeriods = plume?.periods || [];
        const usingPlume = plumePeriods.length > 0;

        if (usingPlume) {
          // Anchor each period at the centre of its 3-month window. Use the
          // dynamical-model mean (it captures the dramatic super-El Niño
          // signal that's currently dominant) but fall back to overall mean.
          const anchors: { x: number; y: number; label: string }[] = [];
          for (const pr of plumePeriods) {
            const v = pr.dynMean ?? pr.mean ?? pr.statMean;
            if (v == null) continue;
            const cx = seasonCentre(pr.label, pr.seasonAnchorYear);
            anchors.push({ x: cx, y: v, label: `${pr.label} ${pr.seasonAnchorYear}` });
          }
          // Sort by x just in case.
          anchors.sort((a, b) => a.x - b.x);
          // Bridge: prepend the live "now" value so the curve starts where the
          // observed line ends and there's no visual jump.
          const bridge = { x: todayX, y: currentOni, label: 'now' };
          // Only keep anchors strictly after today (so the bridge is genuinely
          // the start of the predicted curve).
          const futureAnchors = anchors.filter((a) => a.x > todayX);
          const allAnchors = [bridge, ...futureAnchors];
          // Densify with cosine interpolation for smoothness.
          const stepsPerLeg = 10;
          for (let i = 0; i < allAnchors.length - 1; i++) {
            const a0 = allAnchors[i];
            const a1 = allAnchors[i + 1];
            for (let s = 0; s <= stepsPerLeg; s++) {
              const t = s / stepsPerLeg;
              const eased = (1 - Math.cos(Math.PI * t)) / 2;
              const fx = a0.x + (a1.x - a0.x) * t;
              const fy = a0.y + (a1.y - a0.y) * eased;
              // Skip duplicates at leg joins (except for the very first point).
              if (i > 0 && s === 0) continue;
              forecastPoints.push({ x: fx, fcAnom: fy, fcPos: fy > 0 ? fy : 0 });
            }
          }
        } else if (
          isForecastingElNino &&
          elNinoStart !== null &&
          elNinoEnd !== null &&
          peakX !== null &&
          todayX < elNinoEnd
        ) {
          // Fallback: synthetic three-segment cosine curve through past-peak
          // average. Used only if the IRI plume feed is unavailable.
          const startVal = currentOni;
          const startThresh = 0.6;
          const peakVal = predictedPeakOni;
          const endVal = 0.3;
          const steps = 28;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const fx = todayX + t * (elNinoEnd - todayX);
            let fy: number;
            if (fx <= elNinoStart) {
              const u = (fx - todayX) / Math.max(0.001, elNinoStart - todayX);
              const eased = (1 - Math.cos(Math.PI * u)) / 2;
              fy = startVal + (startThresh - startVal) * eased;
            } else if (fx <= peakX) {
              const u = (fx - elNinoStart) / Math.max(0.001, peakX - elNinoStart);
              const eased = (1 - Math.cos(Math.PI * u)) / 2;
              fy = startThresh + (peakVal - startThresh) * eased;
            } else {
              const u = (fx - peakX) / Math.max(0.001, elNinoEnd - peakX);
              const eased = (1 - Math.cos(Math.PI * u)) / 2;
              fy = peakVal + (endVal - peakVal) * eased;
            }
            forecastPoints.push({
              x: fx,
              fcAnom: fy,
              fcPos: fy > 0 ? fy : 0,
            });
          }
          const lastObs = observedPoints[observedPoints.length - 1];
          if (lastObs && forecastPoints.length) {
            forecastPoints[0] = {
              ...forecastPoints[0],
              fcAnom: lastObs.anom ?? forecastPoints[0].fcAnom,
              fcPos: (lastObs.anom ?? 0) > 0 ? (lastObs.anom ?? 0) : 0,
            };
          }
        }

        const chartData: ChartPoint[] = [...observedPoints, ...forecastPoints];

        return (
        <SectionCard
          icon={<History className="text-[#D0A65E]" />}
          title="Past & future - the central thread of the ENSO story"
          subtitle="The thin line traces the actual weekly Niño 3.4 anomaly. Red shading shows where it ran above zero (El Niño territory above the +0.5 line); blue shading where it ran below (La Niña). The dashed red curve is a smoothed profile of NOAA's forecast through the next predicted El Niño peak."
        >
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 24, right: 28, left: 0, bottom: 18 }}>
                <defs>
                  <pattern id="enso-forecast-stripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="rgba(244,63,94,0.12)" />
                    <rect width="3" height="6" fill="rgba(244,63,94,0.32)" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[xMin, xMax]}
                  ticks={yearTicks}
                  tickFormatter={(v) => String(Math.round(v))}
                  stroke="#9CA3AF"
                  fontSize={11}
                  height={32}
                  allowDecimals={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={10}
                  width={42}
                  domain={[-3, 3]}
                  ticks={[-3, -2, -1, 0, 1, 2, 3]}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
                />
                <Tooltip
                  contentStyle={TT_CONTENT}
                  labelStyle={TT_LABEL}
                  itemStyle={TT_ITEM}
                  cursor={{ stroke: '#D0A65E', strokeDasharray: '3 3' }}
                  formatter={(value: any, name: any) => {
                    if (value === null || value === undefined) return ['', ''];
                    const labelMap: Record<string, string> = {
                      anom: 'Observed Niño 3.4',
                      fcAnom: 'Forecast (smoothed)',
                    };
                    return [`${fmtSigned(Number(value), 2)}°C`, labelMap[name] || name];
                  }}
                  labelFormatter={(v: any, p: any) => {
                    const pl = p?.[0]?.payload;
                    if (pl?.dateLabel) return pl.dateLabel;
                    const yr = Math.floor(v);
                    const mo = Math.floor((v - yr) * 12);
                    return `${yr}-${String(mo + 1).padStart(2, '0')}`;
                  }}
                />
                {/* Threshold lines */}
                <ReferenceLine y={0.5} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={-0.5} stroke="#0ea5e9" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={0} stroke="#6B7280" />

                {/* Observed area fills - profile-shaped from weekly data */}
                <Area
                  type="monotone"
                  dataKey="pos"
                  stroke="none"
                  fill="#f43f5e"
                  fillOpacity={0.55}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="neg"
                  stroke="none"
                  fill="#0ea5e9"
                  fillOpacity={0.55}
                  isAnimationActive={false}
                  connectNulls={false}
                />

                {/* Forecast El Niño envelope - profiled, dashed border */}
                {isForecastingElNino && elNinoStart !== null && elNinoEnd !== null && (
                  <ReferenceArea
                    x1={elNinoStart}
                    x2={elNinoEnd}
                    y1={0}
                    y2={predictedPeakOni}
                    fill="url(#enso-forecast-stripes)"
                    stroke="#f43f5e"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    strokeOpacity={0.45}
                    ifOverflow="extendDomain"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="fcPos"
                  stroke="none"
                  fill="#f43f5e"
                  fillOpacity={0.35}
                  isAnimationActive={false}
                  connectNulls={false}
                />

                {/* Observed weekly line - the actual Niño 3.4 trace */}
                <Line
                  type="monotone"
                  dataKey="anom"
                  stroke="#fef3c7"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                {/* Forecast smoothed curve - dashed */}
                <Line
                  type="monotone"
                  dataKey="fcAnom"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />

                {/* Forecast labels (start-probability and peak-season text
                    labels intentionally suppressed - narrative below the
                    chart carries the detail). */}
                {isForecastingElNino && peakX !== null && (peakSeason || plumePeakPeriod) && (
                  <ReferenceDot
                    x={peakX}
                    y={predictedPeakOni}
                    r={5}
                    fill="#f43f5e"
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                )}

                {/* Past event labels - peak markers */}
                {events.map((ev, i) => {
                  const cx = (ev.startX + ev.endX) / 2;
                  return (
                    <ReferenceLine
                      key={`ev-label-${i}`}
                      x={cx}
                      stroke="transparent"
                      label={{
                        value: ev.phase === 'el-nino' ? 'El Niño' : 'La Niña',
                        fill: ev.phase === 'el-nino' ? '#fecaca' : '#bfdbfe',
                        fontSize: 9.5,
                        position: ev.peak >= 0 ? 'insideTop' : 'insideBottom',
                        offset: 4,
                      }}
                    />
                  );
                })}

                {/* "Today" vertical */}
                <ReferenceLine
                  x={todayX}
                  stroke="#D0A65E"
                  strokeDasharray="4 4"
                  label={{ value: 'Today', fill: '#D0A65E', fontSize: 11, position: 'top' }}
                />
                {/* "Now" dot at the actual current ONI value */}
                <ReferenceDot
                  x={todayX}
                  y={currentOni}
                  r={6}
                  fill="#D0A65E"
                  stroke="#0f172a"
                  strokeWidth={2}
                  label={{
                    value: `Now ${fmtSigned(currentOni, 2)}°C`,
                    fill: '#D0A65E',
                    fontSize: 11,
                    fontWeight: 600,
                    position: 'left',
                    offset: 12,
                  }}
                />
                {/* End of available forecast data - vertical marker at the
                    last plume period (DJF n+1 by default - 9 periods ahead
                    of issue date). IRI plume doesn't extend further. */}
                {forecastPoints.length > 0 && (() => {
                  const lastFc = forecastPoints[forecastPoints.length - 1];
                  return (
                    <ReferenceLine
                      x={lastFc.x}
                      stroke="#f43f5e"
                      strokeDasharray="2 4"
                      strokeOpacity={0.55}
                      label={{
                        value: 'End of current forecasts',
                        fill: '#fda4af',
                        fontSize: 10,
                        position: 'insideTopLeft',
                        offset: 6,
                      }}
                    />
                  );
                })()}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend strip */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-5 h-0.5 bg-[#fef3c7]" /> Weekly Niño 3.4 (observed)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(244,63,94,0.55)' }} /> El Niño shading (above 0)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(14,165,233,0.55)' }} /> La Niña shading (below 0)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-5 h-0.5"
                style={{ background: 'repeating-linear-gradient(90deg, #f43f5e 0 4px, transparent 4px 8px)' }}
              />{' '}
              Forecast (smoothed profile)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D0A65E]" /> Now / Today
            </span>
          </div>

          {/* Headline forecast narrative */}
          {isForecastingElNino && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 to-gray-900/30 p-4">
              <p className="text-xs uppercase tracking-wider text-rose-300/80 font-mono mb-1">NOAA forecast - what's coming</p>
              <p className="text-sm text-gray-100 leading-relaxed">
                A new <span className="font-semibold text-rose-300">El Niño</span> looks increasingly likely.{' '}
                {first50 && (
                  <>
                    Probability first crosses{' '}
                    <span className="font-mono font-semibold text-rose-200">50%</span> in{' '}
                    <span className="font-mono">{first50.label}</span>
                    {' '}({first50.pElNino}% chance) - this is the official "start" of the event
                    {first90 && (
                      <>
                        . It then climbs above <span className="font-mono font-semibold text-rose-200">90%</span> in{' '}
                        <span className="font-mono">{first90.label}</span>
                      </>
                    )}
                    {peakSeason && (
                      <>
                        {' '}and peaks at{' '}
                        <span className="font-mono font-semibold text-rose-200">{peakSeason.pElNino}%</span> in{' '}
                        <span className="font-mono">{peakSeason.label}</span>
                      </>
                    )}
                    {last90 && first90 && first90.season !== last90.season && (
                      <>
                        , staying above 90% through <span className="font-mono">{last90.label}</span>
                      </>
                    )}
                    .
                  </>
                )}{' '}
                The dashed red curve traces the multi-model{' '}
                <a href="https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/?enso_tab=enso-sst_table" target="_blank" rel="noopener noreferrer" className="text-rose-300 underline decoration-rose-400/40 underline-offset-2 hover:decoration-rose-300">
                  IRI/CCSR plume forecast
                </a>{' '}
                {plume && (
                  <>(issued {plume.issueMonth}/{plume.issueYear}, {plume.periods[0]?.modelCount ?? 0} dynamical &amp; statistical models). </>
                )}
                Peak intensity reaches{' '}
                <span className="font-mono font-semibold text-rose-200">{fmtSigned(predictedPeakOni, 1)}°C</span>
                {plumePeakPeriod && (
                  <>{' '}in <span className="font-mono">{plumePeakPeriod.label} {plumePeakPeriod.seasonAnchorYear}</span></>
                )}
                {' '}- the dynamical-model average, which currently signals a strong-to-super El Niño.
              </p>
            </div>
          )}

          {/* Compact season-by-season probability strip */}
          {seasons.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                Season-by-season El Niño probability
              </p>
              <div className="flex gap-1">
                {seasons.map((s) => (
                  <div
                    key={s.season}
                    className="flex-1 flex flex-col items-center"
                    title={`${s.label}: ${s.pElNino}% El Niño · ${s.pNeutral}% Neutral · ${s.pLaNina}% La Niña`}
                  >
                    <div className="w-full h-12 bg-gray-800/40 rounded-sm overflow-hidden flex flex-col-reverse border border-gray-700/40">
                      <div
                        className={s.pElNino >= 50 ? 'bg-rose-500' : 'bg-rose-500/40'}
                        style={{ height: `${s.pElNino}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-gray-400 mt-1">{s.season}</span>
                    <span className={`text-[10px] font-mono font-bold ${s.pElNino >= 50 ? 'text-rose-300' : 'text-gray-500'}`}>
                      {s.pElNino}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            Sources:{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA CPC weekly Niño 3.4 SST
            </a>{' '}
            (observed),{' '}
            <a
              href="https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/?enso_tab=enso-sst_table"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              IRI/CCSR ENSO plume
            </a>{' '}
            (forecast - multi-model dynamical &amp; statistical mean of {plume?.periods[0]?.modelCount ?? 0} models, issued {plume ? `${plume.issueMonth}/${plume.issueYear}` : 'monthly'}),{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA CPC probability outlook
            </a>
            , and{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA ONI v5
            </a>{' '}
            (past events). The IRI plume publishes 9 overlapping 3-month forecast periods; that limit is shown by the &ldquo;End of current forecasts&rdquo; line.
          </p>
        </SectionCard>
        );
      })()}

      {/* ═══ INDICATOR CROSS-CHECK ═══════════════════════════════ */}
      {(weekly || mei || soi) && (() => {
        // Build a single time-aligned dataset combining the three most-watched
        // ENSO indicators so the reader can see - at a glance - whether the
        // ocean (Niño 3.4 SST) and the atmosphere (MEI v2, SOI) are all
        // pointing the same way as the hero forecast above. SOI is plotted
        // inverted (−SOI) because its sign is reversed relative to ENSO:
        // negative SOI = El Niño-favourable, so flipping it lets all three
        // lines rise together when El Niño is building.

        const FIVE_YEARS_MS = 5 * 365.25 * 24 * 3600 * 1000;
        const nowMs = Date.now();
        const startMs = nowMs - FIVE_YEARS_MS;

        // Niño 3.4 weekly anomaly
        const ninoSeries = (weekly?.weekly ?? [])
          .map((w) => ({ t: Date.parse(w.date), v: w.nino34.anom }))
          .filter((p) => Number.isFinite(p.t) && p.t >= startMs);

        // MEI v2 - seasonIndex 1..12 (DJ, JF, FM, …, ND); we map to the mid-
        // month of the second month in the bi-monthly window.
        const meiSeries = (mei?.history ?? [])
          .map((m) => ({
            t: Date.UTC(m.year, Math.max(0, Math.min(11, m.seasonIndex - 1)), 15),
            v: m.value,
            label: `${m.season} ${m.year}`,
          }))
          .filter((p) => p.t >= startMs);

        // SOI monthly, plotted inverted so it lines up with Niño 3.4 / MEI.
        const soiSeries = (soi?.history ?? [])
          .map((s) => ({
            t: Date.UTC(s.year, s.month - 1, 15),
            v: -s.value,
            raw: s.value,
            label: `${MONTH_NAMES[s.month - 1]} ${s.year}`,
          }))
          .filter((p) => p.t >= startMs);

        // X-axis ticks: one per year start over the last 5 years.
        const startYear = new Date(startMs).getUTCFullYear();
        const endYear = new Date(nowMs).getUTCFullYear();
        const yearTicks: number[] = [];
        for (let y = startYear; y <= endYear; y++) yearTicks.push(Date.UTC(y, 0, 1));

        const fmtDate = (t: number) => {
          const d = new Date(t);
          return `${d.getUTCFullYear()}`;
        };
        const fmtFullDate = (t: number) => {
          const d = new Date(t);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        };

        return (
          <SectionCard
            icon={<Activity className="h-5 w-5 text-amber-300" />}
            title="Do the indicators agree? - Niño 3.4 SST · MEI v2 · −SOI, last 5 years"
            subtitle="The same five-year window for all three most-watched ENSO indicators on one axis. Niño 3.4 is the ocean (weekly SST anomaly), MEI v2 is the coupled ocean–atmosphere index (bi-monthly, five variables), and SOI is the atmospheric pressure see-saw between Tahiti and Darwin (monthly). SOI is plotted inverted (−SOI) because its sign is reversed relative to ENSO - that way all three lines rise together when El Niño is building. If all three are climbing in lock-step toward the +0.5 line, the forecast above has independent ocean and atmosphere support."
          >
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 10, right: 64, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={[startMs, nowMs]}
                    ticks={yearTicks}
                    tickFormatter={fmtDate}
                    stroke="#9CA3AF"
                    fontSize={10}
                    allowDuplicatedCategory={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={10}
                    width={36}
                    domain={[-3, 3]}
                    ticks={[-3, -2, -1, 0, 1, 2, 3]}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
                  />
                  <Tooltip
                    contentStyle={TT_CONTENT}
                    labelStyle={TT_LABEL}
                    itemStyle={TT_ITEM}
                    cursor={TT_CURSOR}
                    labelFormatter={(t: any) => (typeof t === 'number' ? fmtFullDate(t) : '')}
                    formatter={(v: any, name: any) => [
                      typeof v === 'number' ? fmtSigned(v, 2) : '-',
                      name,
                    ]}
                  />
                  <ReferenceLine
                    y={0.5}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    label={{ value: 'El Niño', position: 'right', fill: '#f43f5e', fontSize: 10, offset: 8 }}
                  />
                  <ReferenceLine
                    y={-0.5}
                    stroke="#0ea5e9"
                    strokeDasharray="3 3"
                    label={{ value: 'La Niña', position: 'right', fill: '#0ea5e9', fontSize: 10, offset: 8 }}
                  />
                  <ReferenceLine y={0} stroke="#6B7280" />
                  <Line
                    data={ninoSeries}
                    dataKey="v"
                    name="Niño 3.4 SST anomaly (°C)"
                    type="monotone"
                    stroke="#fbbf24"
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    data={meiSeries}
                    dataKey="v"
                    name="MEI v2 (index)"
                    type="monotone"
                    stroke="#a78bfa"
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    data={soiSeries}
                    dataKey="v"
                    name="−SOI (sign-flipped)"
                    type="monotone"
                    stroke="#34d399"
                    strokeWidth={1.6}
                    strokeDasharray="4 2"
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Legend + read-out */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-4 h-[2px] bg-amber-400" /> Niño 3.4 weekly SST anomaly (°C)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-4 h-[2px] bg-violet-400" /> MEI v2 (bi-monthly, 5 variables)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-4 h-[2px] bg-emerald-400" style={{ borderTop: '2px dashed #34d399', height: 0 }} /> −SOI (sign-flipped)
              </span>
            </div>
            {(() => {
              const lastNino = ninoSeries[ninoSeries.length - 1];
              const lastMei = meiSeries[meiSeries.length - 1];
              const lastSoi = soiSeries[soiSeries.length - 1];
              const agree = (v: number | undefined, side: 1 | -1) =>
                typeof v === 'number' && Math.sign(v) === side && Math.abs(v) >= 0.3;
              // What's the hero chart predicting? Check whether the most
              // recent points are all leaning the same way (+ = El Niño-ward).
              const leaningPos =
                agree(lastNino?.v, 1) || agree(lastMei?.v, 1) || agree(lastSoi?.v, 1);
              const leaningNeg =
                agree(lastNino?.v, -1) || agree(lastMei?.v, -1) || agree(lastSoi?.v, -1);
              const verdict = leaningPos && !leaningNeg
                ? 'All three are currently above zero and trending toward the +0.5 El Niño threshold - the ocean (Niño 3.4) and the atmosphere (MEI, −SOI) are independently supporting the forecast above.'
                : leaningNeg && !leaningPos
                ? 'All three are currently below zero - the ocean and atmosphere are leaning La Niña-ward.'
                : 'The three indicators are mixed right now - watch for them to converge before reading too much into the forecast above.';
              return (
                <p className="text-xs text-gray-400 mt-2">
                  <strong className="text-gray-200">Latest:</strong>{' '}
                  Niño 3.4 ={' '}
                  <span className="font-mono text-amber-300">
                    {typeof lastNino?.v === 'number' ? fmtSigned(lastNino.v) : '-'}
                  </span>
                  °C · MEI v2 ={' '}
                  <span className="font-mono text-violet-300">
                    {typeof lastMei?.v === 'number' ? fmtSigned(lastMei.v) : '-'}
                  </span>
                  {' · '}−SOI ={' '}
                  <span className="font-mono text-emerald-300">
                    {typeof lastSoi?.v === 'number' ? fmtSigned(lastSoi.v) : '-'}
                  </span>
                  {' '}(SOI raw ={' '}
                  <span className="font-mono">
                    {typeof (lastSoi as any)?.raw === 'number' ? fmtSigned((lastSoi as any).raw, 1) : '-'}
                  </span>
                  ). {verdict}
                </p>
              );
            })()}
            <p className="text-xs text-gray-500 mt-3">
              Sources:{' '}
              <a
                href="https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D0A65E] hover:underline"
              >
                NOAA CPC weekly Niño-region SSTs
              </a>
              ,{' '}
              <a
                href="https://psl.noaa.gov/enso/mei/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D0A65E] hover:underline"
              >
                NOAA PSL MEI v2
              </a>
              , and{' '}
              <a
                href="https://www.cpc.ncep.noaa.gov/data/indices/soi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D0A65E] hover:underline"
              >
                NOAA CPC SOI
              </a>
              .
            </p>
          </SectionCard>
        );
      })()}

      {/* ═══ MAPS ═══════════════════════════════════════════════ */}
      <Divider icon={<MapIcon className="h-5 w-5" />} title="Live tropical Pacific maps" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard
          icon={<Waves className="text-sky-300" />}
          title="Weekly SST anomaly"
          subtitle="Tropical Pacific sea-surface temperature anomaly relative to the 1991–2020 climatology. Red = warmer; blue = cooler."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images.sstAnomalyMap}
            alt="Tropical Pacific weekly SST anomaly"
            className="w-full rounded-lg border border-gray-700/50 bg-gray-900"
            loading="lazy"
          />
          <p className="text-xs text-gray-500 mt-2">
            Live image:{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_update/sstweek_c.gif"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA CPC
            </a>
          </p>
        </SectionCard>

        <SectionCard
          icon={<Wind className="text-amber-300" />}
          title="Subsurface ocean heat"
          subtitle="Equatorial Pacific temperature anomaly with depth (cross-section). A warm pulse moving east at depth often precedes an El Niño at the surface a few months later."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images.subsurfaceAnomaly}
            alt="Equatorial Pacific subsurface temperature anomaly cross-section"
            className="w-full rounded-lg border border-gray-700/50 bg-gray-900"
            loading="lazy"
          />
          <p className="text-xs text-gray-500 mt-2">
            Live image:{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/products/GODAS/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA CPC GODAS
            </a>
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="Time-longitude SST anomaly (Hovmöller)"
        subtitle="The last several months of equatorial Pacific SST anomalies, shown as a strip from west to east. Red plumes drifting east are the canonical El Niño signature."
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images.hovmollerSst}
          alt="Time-longitude (Hovmöller) of equatorial Pacific SST anomalies"
          className="w-full rounded-lg border border-gray-700/50 bg-gray-900"
          loading="lazy"
        />
        <p className="text-xs text-gray-500 mt-2">
          Live image:{' '}
          <a
            href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_update/ssttlon5_c.gif"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D0A65E] hover:underline"
          >
            NOAA CPC
          </a>
        </p>
      </SectionCard>

      {/* CPC probability bars removed - the hero past+future chart and
          narrative already convey the season-by-season probabilities. */}

      {/* ═══ GLOBAL IMPACTS ════════════════════════════ */}
      <Divider icon={<Globe2 className="h-5 w-5" />} title="Global impacts" />

      <SectionCard
        title="What does each phase do to weather around the world?"
        subtitle="Toggle between El Niño and La Niña to see the typical regional response. Probabilities are based on Davey et al. (2013) and NOAA composites - they describe how often the impact has occurred when the phase is active, not how likely the phase itself is."
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setPhase('el-nino')}
            className={`px-4 py-2 rounded-lg text-sm font-mono font-bold transition ${
              phase === 'el-nino'
                ? 'bg-rose-500/30 border-2 border-rose-400 text-rose-200'
                : 'bg-gray-800/40 border-2 border-gray-700/50 text-gray-300 hover:border-rose-400/50'
            }`}
          >
            El Niño impacts
          </button>
          <button
            onClick={() => setPhase('la-nina')}
            className={`px-4 py-2 rounded-lg text-sm font-mono font-bold transition ${
              phase === 'la-nina'
                ? 'bg-sky-500/30 border-2 border-sky-400 text-sky-200'
                : 'bg-gray-800/40 border-2 border-gray-700/50 text-gray-300 hover:border-sky-400/50'
            }`}
          >
            La Niña impacts
          </button>
          <span className="text-xs text-gray-500 ml-2">
            Phase currently active: <span className={oni ? ENSO_TEXT[oni.state] : 'text-gray-300'}>{oni?.state || '-'}</span>
          </span>
        </div>

        {/* Continent filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {['All', 'Africa', 'Asia', 'Europe', 'N. America', 'C. America', 'S. America', 'Oceania', 'Pacific Is.'].map((c) => (
            <button
              key={c}
              onClick={() => setContinentFilter(c)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition ${
                continentFilter === c
                  ? 'bg-[#D0A65E]/20 border border-[#D0A65E] text-[#D0A65E]'
                  : 'bg-gray-800/40 border border-gray-700/50 text-gray-400 hover:border-[#D0A65E]/40'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Region cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REGION_IMPACTS.filter((r) => continentFilter === 'All' || r.continent === continentFilter)
            .filter((r) => r.impacts[phase] && (r.impacts[phase]!.temp || r.impacts[phase]!.precip))
            .map((r) => {
              const imp = r.impacts[phase]!;
              const tempColor = imp.temp === 'warmer' ? 'text-rose-300 bg-rose-900/30 border-rose-700/40' : imp.temp === 'cooler' ? 'text-sky-300 bg-sky-900/30 border-sky-700/40' : '';
              const precipColor = imp.precip === 'wetter' ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700/40' : imp.precip === 'drier' ? 'text-amber-300 bg-amber-900/30 border-amber-700/40' : '';
              return (
                <div key={r.id} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 hover:border-[#D0A65E]/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{r.region}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{r.continent} · {r.area}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-900/60 border border-gray-700/50 text-gray-300">
                      {imp.season}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {imp.temp && (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${tempColor} inline-flex items-center gap-1`}>
                        {imp.temp === 'warmer' ? <Sun className="h-3 w-3" /> : <Thermometer className="h-3 w-3" />}
                        {imp.temp}
                      </span>
                    )}
                    {imp.precip && (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${precipColor} inline-flex items-center gap-1`}>
                        <CloudRain className="h-3 w-3" />
                        {imp.precip}
                      </span>
                    )}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-900/60 border border-gray-700/50 text-gray-300">
                      ~{Math.round(imp.prob * 100)}% chance
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{imp.notes}</p>
                </div>
              );
            })}
        </div>
      </SectionCard>

      {/* Met Office schematic maps - the canonical reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard
          icon={<Thermometer className="text-rose-300" />}
          title={phase === 'el-nino' ? 'El Niño temperature impacts' : 'La Niña temperature impacts'}
          subtitle="Met Office schematic, based on Davey et al. (2013). Coloured regions are likely warmer (red) or cooler (blue) than normal during the labelled season when the phase is active."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={phase === 'el-nino' ? images.metOfficeImpactElNinoTemp : images.metOfficeImpactLaNinaTemp}
            alt={`${phase === 'el-nino' ? 'El Niño' : 'La Niña'} temperature impacts schematic`}
            className="w-full rounded-lg border border-gray-700/50 bg-white"
            loading="lazy"
          />
        </SectionCard>
        <SectionCard
          icon={<CloudRain className="text-emerald-300" />}
          title={phase === 'el-nino' ? 'El Niño rainfall impacts' : 'La Niña rainfall impacts'}
          subtitle="Met Office schematic. Wetter regions in green, drier in brown. Precipitation teleconnections are noisier than temperature, so probabilities are typically lower."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={phase === 'el-nino' ? images.metOfficeImpactElNinoPrecip : images.metOfficeImpactLaNinaPrecip}
            alt={`${phase === 'el-nino' ? 'El Niño' : 'La Niña'} precipitation impacts schematic`}
            className="w-full rounded-lg border border-gray-700/50 bg-white"
            loading="lazy"
          />
        </SectionCard>
      </div>
      <p className="text-xs text-gray-500 px-4">
        Schematic maps:{' '}
        <a href="https://www.metoffice.gov.uk/research/climate/seasonal-to-decadal/gpc-outlooks/el-nino-la-nina" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Met Office GPC outlooks (Davey et al. 2013)</a>. © Crown Copyright.
      </p>

      {/* Met Office plume forecasts removed - the IRI/CCSR plume already
          drives the forecast curve in the hero past+future chart. */}

      {/* ═══ PAST EVENTS ═════════════════════════ */}
      <Divider icon={<History className="h-5 w-5" />} title="Past major events" />

      <SectionCard
        title="What happened the last time?"
        subtitle="The eight most consequential ENSO events since 1980. Bar height shows peak ONI; colour shows phase."
      >
        {/* Mini bar chart of peak amplitudes */}
        <div className="h-[200px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={PAST_EVENTS.map((e) => ({ ...e, label: `${e.start.slice(0, 4)}–${e.end.slice(2, 4)}` }))} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} />
              <YAxis stroke="#9CA3AF" fontSize={10} width={40} domain={[-3, 3]} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
              <Tooltip
                contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} cursor={TT_CURSOR}
                formatter={(v: any) => [typeof v === 'number' ? `${fmtSigned(v, 1)}°C peak ONI` : '-', '']}
              />
              <ReferenceLine y={0.5} stroke="#f43f5e" strokeDasharray="3 3" />
              <ReferenceLine y={-0.5} stroke="#0ea5e9" strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke="#6B7280" />
              <Bar dataKey="peakOni" isAnimationActive={false}>
                {PAST_EVENTS.map((e, i) => (
                  <Cell key={i} fill={e.phase === 'el-nino' ? '#f43f5e' : '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Event timeline cards */}
        <div className="space-y-3">
          {PAST_EVENTS.slice().reverse().map((e) => {
            const phaseColor = e.phase === 'el-nino' ? 'border-rose-700/40 bg-rose-900/10' : 'border-sky-700/40 bg-sky-900/10';
            const phaseText = e.phase === 'el-nino' ? 'text-rose-300' : 'text-sky-300';
            return (
              <div key={`${e.start}-${e.end}`} className={`border-l-4 ${phaseColor} rounded-r-xl p-3`}>
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className={`text-base font-bold font-mono ${phaseText}`}>
                    {e.start.slice(0, 4)}–{e.end.slice(0, 4)} {e.phase === 'el-nino' ? 'El Niño' : 'La Niña'}
                  </p>
                  <span className="text-xs font-mono text-gray-400">
                    {e.strength} · peak ONI {fmtSigned(e.peakOni, 1)}°C
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">{e.summary}</p>
                <ul className="mt-2 space-y-0.5 text-xs text-gray-400 list-disc pl-5">
                  {e.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ═══ CLIMATE CHANGE ══════════════════════ */}
      <Divider icon={<Wind className="h-5 w-5" />} title="ENSO and climate change" />

      <SectionCard
        title="How does ENSO interact with the long-term warming trend?"
        subtitle="ENSO is a natural mode of climate variability that has existed for thousands of years (proven by coral and tree-ring records). But human-driven warming is changing the backdrop on which it operates."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm font-bold text-rose-300 mb-2">El Niño + warming = record temperatures</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Every El Niño now adds its temporary warming on top of a baseline that's already ~1.3 °C above pre-industrial.
              The 1997-98, 2015-16 and 2023-24 El Niños each set new global temperature records; 2024 became the first calendar year above 1.5 °C.
              Without continued greenhouse-gas warming, the same ENSO events would have produced much smaller temperature spikes.
            </p>
          </div>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm font-bold text-sky-300 mb-2">La Niña no longer cools the planet below the trend</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Strong La Niña years used to deliver global mean temperatures below the long-term average. Today, even the deepest La Niñas (2020-22) sit
              well above any 20th-century year. La Niña buys a temporary pause in record-breaking - it doesn't reverse the warming.
            </p>
          </div>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm font-bold text-amber-300 mb-2">Compound impacts are getting worse</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Drought regions (Amazon, Southern Africa, Australia) are now drier in El Niño years than the same ENSO state would have produced 50 years ago,
              because evaporative demand has risen. Flood regions (Pakistan 2022, Horn of Africa) see heavier short-duration rainfall on top of La Niña triggers because
              a warmer atmosphere holds more moisture (~7 % per °C, Clausius-Clapeyron).
            </p>
          </div>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm font-bold text-emerald-300 mb-2">Will ENSO itself change?</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              IPCC AR6 (2021) concluded with high confidence that ENSO sea-surface temperature variability has been larger over the past 50 years than at any time in
              the previous 400 years. Most CMIP6 climate models project that ENSO rainfall variability will <em>increase</em> with further warming, even if the SST swings
              themselves change less. Translation: bigger droughts and bigger floods in the same teleconnection regions, regardless of phase.
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Sources: IPCC AR6 WGI Chapter 4, Box TS.13;{' '}
          <a href="https://www.science.org/doi/10.1126/science.aax6925" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Grothe et al. 2020 (coral records of ENSO amplification)</a>;{' '}
          <a href="https://www.nature.com/articles/s41558-020-00963-x" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Cai et al. 2021 (Nature Climate Change)</a>.
        </p>
      </SectionCard>

      {/* ─── Footer / methodology ───────────────────────────── */}
      <SectionCard title="Methodology & sources">
        <ul className="space-y-2 text-sm text-gray-300 list-disc pl-5">
          <li>
            <strong className="text-white">Oceanic Niño Index (ONI)</strong> - 3-month running mean of
            ERSSTv5 SST anomalies in the Niño 3.4 box (5°S–5°N, 170°W–120°W) relative to a centred
            30-year base period that updates every 5 years. NOAA's official ENSO yardstick.
          </li>
          <li>
            <strong className="text-white">Weekly Niño-region SSTs</strong> - OISSTv2-based weekly
            mean SST and SST anomaly (1991–2020 baseline) for Niño 1+2, 3, 3.4 and 4.
          </li>
          <li>
            <strong className="text-white">Multivariate ENSO Index v2</strong> - bi-monthly principal-
            component combination of SST, sea-level pressure, zonal & meridional surface winds and
            outgoing longwave radiation over the tropical Pacific. Captures atmospheric coupling.
          </li>
          <li>
            <strong className="text-white">Southern Oscillation Index</strong> - standardised
            difference in sea-level pressure between Tahiti and Darwin. The classical atmospheric
            measure of ENSO; persistent negative SOI accompanies El Niño.
          </li>
        </ul>
        <p className="text-xs text-gray-500 mt-4">
          Snapshot generated {new Date(generatedAt).toUTCString()}. Refreshed monthly.
        </p>
      </SectionCard>

      {/* ─── Related ─────────────────────────────────────────── */}
      <SectionCard title="Explore further">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { href: '/climate/global', label: 'Global Climate Update', desc: 'Whole-planet temperature & trend update' },
            { href: '/climate', label: 'Country, State & Region Updates', desc: '144 regions tracked monthly' },
            { href: '/climate/shifting-seasons', label: 'Shifting Seasons', desc: 'How season timing is moving worldwide' },
            { href: '/sea-levels-ice', label: 'Sea Levels & Ice', desc: 'Ocean heat, sea level rise & polar ice' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 hover:border-[#D0A65E]/60 transition-colors"
            >
              <p className="text-sm font-semibold text-white group-hover:text-[#D0A65E] transition-colors flex items-center gap-1">
                {l.label} <ArrowRight className="h-3 w-3" />
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{l.desc}</p>
            </Link>
          ))}
        </div>
      </SectionCard>

      <p className="text-center text-xs text-gray-500 mt-6">
        <Link href="/climate" className="text-teal-300 hover:text-teal-200 inline-flex items-center gap-1">
          Back to climate hub <ArrowRight className="h-3 w-3" />
        </Link>
      </p>
    </main>
  );
}
