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
  BookOpen,
  CloudRain,
  Droplets,
  ExternalLink,
  Flame,
  Globe2,
  History,
  Loader2,
  MapPin,
  Snowflake,
  Sun,
  Thermometer,
  TrendingUp,
  Waves,
  Wind,
  Zap,
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
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// 3-month NOAA season labels in calendar order. Index = first month (0-based).
// e.g. 'MJJ' = May/Jun/Jul, middle month index 5 (June).
const SEASON_LABELS = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'];
// Convert a season label like "MJJ" + anchorYear to the middle calendar month
// as "June 2026". DJF and NDJ straddle the year boundary; the middle month is
// January (next year) and December (anchor year) respectively.
const seasonMiddleMonth = (label: string, anchorYear: number): string => {
  const idx = SEASON_LABELS.indexOf(label);
  if (idx < 0) return `${label} ${anchorYear}`;
  // Middle month = (firstMonth + 1) mod 12. Middle month for DJF (first=Dec
  // of prevYear) is January of anchorYear. NDJ middle month is December of
  // anchorYear. Anchor year already represents the season's reference year
  // (DJF anchored on the year of January), so the middle-month year is just
  // the anchor year for all but NDJ where the anchor is the year of November.
  let monthIdx: number;
  let year = anchorYear;
  if (label === 'DJF') { monthIdx = 0; }
  else if (label === 'NDJ') { monthIdx = 11; }
  else { monthIdx = (idx + 1) % 12; }
  return `${MONTH_NAMES_FULL[monthIdx]} ${year}`;
};

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

  // Top-level forecast summary so the Current State header can hint at the
  // outlook the Past & Future chart confirms in detail.
  const forecastSeasonsTop = data.forecast?.seasons || [];
  // Anchor each forecast season to a calendar year by walking the array and
  // bumping the year when the season index wraps. The first season in the
  // array represents the current/next 3-month period.
  const now = new Date();
  let runYear = now.getUTCFullYear();
  let prevIdx = -1;
  const forecastWithYear = forecastSeasonsTop.map((s) => {
    const idx = SEASON_LABELS.indexOf(s.season);
    if (prevIdx >= 0 && idx >= 0 && idx < prevIdx) runYear += 1;
    if (idx >= 0) prevIdx = idx;
    return { ...s, anchorYear: runYear };
  });
  const forecastFirst50 = forecastWithYear.find((s) => s.pElNino >= 50) || null;
  const forecastFirst50La = forecastWithYear.find((s) => s.pLaNina >= 50) || null;
  const forecastVerdict: { phase: 'el-nino' | 'la-nina' | null; label: string | null } =
    forecastFirst50
      ? {
          phase: 'el-nino',
          label: `El Niño Predicted by ${seasonMiddleMonth(forecastFirst50.season, forecastFirst50.anchorYear)}`,
        }
      : forecastFirst50La
        ? {
            phase: 'la-nina',
            label: `La Niña Predicted by ${seasonMiddleMonth(forecastFirst50La.season, forecastFirst50La.anchorYear)}`,
          }
        : { phase: null, label: 'Neutral conditions favoured through the forecast window' };

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ─── Hero ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
        <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
          <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
            El Niño / La Niña - ENSO Tracker
          </h1>
        </div>
        <div className="bg-gray-950/90 backdrop-blur-md p-4">
          <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
            The El Niño-Southern Oscillation (ENSO) is the single biggest year-to-year driver of
            global temperature and rainfall after the long-term warming trend itself. It is also a
            <span className="text-[#FFF5E7] font-semibold"> natural amplifier of climate change</span>
            {' '}- elevated tropical-ocean heat now stacks on top of every El Niño, fuelling stronger
            droughts, heavier floods and record-breaking global temperatures. This page combines the
            four most-watched indicators - Niño 3.4 SST, the Oceanic Niño Index, the Multivariate
            ENSO Index and the Southern Oscillation Index - with the official NOAA forecast.
          </p>
        </div>
      </div>

      {/* ─── Hero state + Niño-region map ──────────────────────── */}
      {oni && (() => {
        // Anomaly → text-class for headline numbers
        const anomColor = (a: number) =>
          a >= 0.5 ? 'text-rose-300' : a <= -0.5 ? 'text-sky-300' : 'text-gray-200';
        // Short tag explaining what the anomaly colour means, so a hot
        // sub-region (e.g. Niño 1+2 = +1.8°C) isn't misread as "El Niño
        // event in progress" when the headline ENSO state is Neutral.
        const leaningLabel = (a: number) =>
          a >= 0.5
            ? { text: 'El Niño-leaning', cls: 'text-rose-300' }
            : a <= -0.5
              ? { text: 'La Niña-leaning', cls: 'text-sky-300' }
              : { text: 'near baseline', cls: 'text-gray-300' };

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
            title={`Current State - ${oni.state}${oni.strength ? `, ${oni.strength}` : ''}${forecastVerdict.label ? ` · ${forecastVerdict.label}` : ''}`}
            subtitle="Niño 3.4 (central Pacific) is the official ENSO yardstick. Niño 1+2 leads coastal signals off Peru; Niño 4 captures the western warm pool."
          >
            {/* Headline: ONI · Niño 3.4 weekly */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ONI · 3-month mean</p>
                <p className={`text-2xl font-bold font-mono ${ENSO_TEXT[oni.state]}`}>{oni.state}</p>
                <p className="text-sm text-gray-400 mt-1">
                  <span className="font-mono text-white">{fmtSigned(oni.anomaly)}°C</span> ·{' '}
                  {oni.season} {oni.seasonYear}
                </p>
              </div>
              {weekly && (
                <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Niño 3.4 · this week</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className={`text-2xl font-bold font-mono ${anomColor(weekly.latest.nino34.anom)}`}>{fmtSigned(weekly.latest.nino34.anom)}</span>
                    <span className="text-sm text-gray-400">°C</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {(() => { const [y, m, d] = weekly.lastWeek.split('-'); return `SST ${weekly.latest.nino34.sst.toFixed(1)}°C · w/e ${d}-${m}-${y.slice(2)}`; })()}
                  </p>
                </div>
              )}
            </div>

            {/* Live Leaflet map of the four Niño regions over the equatorial Pacific */}
            {weekly && (
              <div className="mt-5 rounded-xl border border-gray-700/50 bg-gray-800/30 p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Equatorial Pacific
                </p>
                <EnsoRegionMap
                  anoms={{
                    nino12: weekly.latest.nino12.anom,
                    nino3: weekly.latest.nino3.anom,
                    nino34: weekly.latest.nino34.anom,
                    nino4: weekly.latest.nino4.anom,
                  }}
                  state={oni.state === 'El Niño' ? 'el-nino' : oni.state === 'La Niña' ? 'la-nina' : 'neutral'}
                />
                <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                  Box colour shows this week&rsquo;s SST anomaly vs the 1991-2020 baseline -{' '}
                  <span className="text-rose-400">warmer</span> (El Niño-leaning) or{' '}
                  <span className="text-sky-400">cooler</span> (La Niña-leaning). Arrows show trade-wind direction. NOAA tracks Niño&nbsp;3.4 for the official ENSO state.
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
                    <div key={r.key} className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{r.label}</p>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className={`text-2xl font-bold font-mono ${anomColor(v.anom)}`}>{fmtSigned(v.anom)}</span>
                        <span className="text-sm text-gray-400">°C</span>
                      </div>
                      <p className={`text-[10px] font-mono uppercase tracking-wider mt-0.5 ${lean.cls}`}>{lean.text}</p>
                      <p className="text-xs text-gray-400 mt-1">SST {v.sst.toFixed(1)}°C</p>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              El Niño years push global temperatures higher; La Niña years temporarily damp them — though the underlying greenhouse-gas trend continues either way.
              Thresholds: <span className="text-rose-400 font-mono">≥ +0.5°C</span> El Niño ·{' '}
              <span className="text-sky-400 font-mono">≤ −0.5°C</span> La Niña · otherwise Neutral.
            </p>
          </SectionCard>
        );
      })()}

      {/* ═══ PREDICTION (forecast vs. history + indicator cross-check) ═══ */}
      <Divider icon={<TrendingUp className="h-5 w-5" />} title="Prediction" />

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

        // Detect past ENSO events. NOAA's strict declaration rule asks for
        // 5 consecutive overlapping 3-month seasons at or beyond ±0.5°C, but
        // even shorter persistent runs are routinely reported as weak events
        // (e.g. NOAA classified mid-2024 → early 2026 as a weak La Niña despite
        // multi-month gaps). We use a 3-season minimum so those are visible,
        // and tag any event whose peak magnitude stays below 1.0°C as 'weak'.
        const MIN_CONSECUTIVE_SEASONS = 3;
        // We also require the event peak to clearly reach the threshold.
        const MIN_PEAK_MAGNITUDE = 0.5;
        const WEAK_PEAK_MAX = 1.0;
        const histInWindow = oni.history.filter((p) => p.year >= minYear && p.year < currentYear);
        type EnsoEvent = {
          phase: 'el-nino' | 'la-nina';
          weak: boolean;
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
            weak: Math.abs(peakRow.anom) < WEAK_PEAK_MAX,
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
          title="Forecast"
          subtitle="Weekly Niño 3.4 anomaly: red above zero (El Niño-leaning), blue below (La Niña). The dashed red curve is NOAA's smoothed forecast."
        >
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 24, right: 28, left: 0, bottom: 0 }}>
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
                  allowDecimals={false}
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

                {/* Past event labels - peak markers (skip events too close to the left edge to avoid label overflow into the y-axis) */}
                {events.filter((ev) => ((ev.startX + ev.endX) / 2) - xMin >= 1).map((ev, i) => {
                  const cx = (ev.startX + ev.endX) / 2;
                  return (
                    <ReferenceLine
                      key={`ev-label-${i}`}
                      x={cx}
                      stroke="transparent"
                      label={{
                        value: `${ev.phase === 'el-nino' ? 'El Niño' : 'La Niña'}${ev.weak ? ' (weak)' : ''}`,
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
                        className: 'hidden md:block',
                      }}
                    />
                  );
                })()}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend strip */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-5 h-0.5 bg-[#fef3c7]" /> Weekly Niño 3.4
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(244,63,94,0.55)' }} /> El Niño shading
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(14,165,233,0.55)' }} /> La Niña shading
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-5 h-0.5"
                style={{ background: 'repeating-linear-gradient(90deg, #f43f5e 0 4px, transparent 4px 8px)' }}
              />{' '}
              Forecast
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
            title="Do the Indicators Agree?"
            subtitle="Three ENSO indicators on one axis: Niño 3.4 (ocean), MEI v2 (ocean+atmosphere) and −SOI (sign-flipped so all three rise together for El Niño). When all three climb past +0.5, the forecast has independent support."
          >
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 10, right: 28, left: 0, bottom: 0 }}>
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
                  />
                  <ReferenceLine
                    y={-0.5}
                    stroke="#0ea5e9"
                    strokeDasharray="3 3"
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
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-300">
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

      {/* ═══ GLOBAL IMPACTS ════════════════════════════ */}
      <Divider icon={<Globe2 className="h-5 w-5" />} title="Global Impacts" />

      <SectionCard
        icon={<Globe2 className="text-[#D0A65E]" />}
        title="Impact on World Weather"
        subtitle="Typical regional response per phase. Probabilities = how often the impact occurs when the phase is active."
      >
        {/* Phase pill toggle (canonical Climate Hub style) */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {([
            { id: 'el-nino' as const, label: 'El Niño Impacts' },
            { id: 'la-nina' as const, label: 'La Niña Impacts' },
          ]).map((p) => {
            const isActive = phase === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhase(p.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-[12px] sm:text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'border-[#D0A65E] bg-[#D0A65E] text-[#1A0E00]'
                    : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-[#D0A65E]/45 hover:bg-gray-900 hover:text-[#FFF5E7]'
                }`}
              >
                <span>{p.label}</span>
              </button>
            );
          })}
          <span className="text-[11px] text-gray-500 ml-1 sm:ml-2">
            Currently active: <span className={oni ? ENSO_TEXT[oni.state] : 'text-gray-300'}>{oni?.state || '-'}</span>
          </span>
        </div>

        {/* Continent filter pills */}
        <div className="border-t border-gray-800/80 pt-4 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Africa', 'Asia', 'Europe', 'N. America', 'C. America', 'S. America', 'Oceania', 'Pacific Is.'].map((c) => {
              const active = continentFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContinentFilter(c)}
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors ${
                    active
                      ? 'border-[#D0A65E]/55 bg-[#D0A65E]/10 text-[#FFF5E7]'
                      : 'border-gray-800 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Region cards grid - canonical Climate Hub card pattern */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REGION_IMPACTS.filter((r) => continentFilter === 'All' || r.continent === continentFilter)
            .filter((r) => r.impacts[phase] && (r.impacts[phase]!.temp || r.impacts[phase]!.precip))
            .map((r) => {
              const imp = r.impacts[phase]!;
              const tempColor = imp.temp === 'warmer' ? 'text-rose-300 bg-rose-900/30 border-rose-700/40' : imp.temp === 'cooler' ? 'text-sky-300 bg-sky-900/30 border-sky-700/40' : '';
              const precipColor = imp.precip === 'wetter' ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700/40' : imp.precip === 'drier' ? 'text-amber-300 bg-amber-900/30 border-amber-700/40' : '';
              const accent = phase === 'el-nino'
                ? 'border-l-4 border-l-rose-500/70 border border-gray-800 bg-gray-900/50 hover:border-[#D0A65E]/45'
                : 'border-l-4 border-l-sky-400/70 border border-gray-800 bg-gray-900/50 hover:border-[#D0A65E]/45';
              return (
                <div key={r.id} className={`group flex flex-col rounded-xl p-3.5 transition-all duration-200 ${accent}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-[#D0A65E]" aria-hidden />
                    <h4 className="flex-1 min-w-0 text-sm font-semibold text-[#FFF5E7] leading-tight truncate">
                      {r.region}
                    </h4>
                    <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-900/60 border border-gray-700/50 text-gray-300">
                      {imp.season}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">{r.continent} · {r.area}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
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
                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{imp.notes}</p>
                </div>
              );
            })}
        </div>
      </SectionCard>

      {/* Met Office schematic maps - the canonical reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard
          icon={<Thermometer className="text-rose-300" />}
          title={phase === 'el-nino' ? 'El Niño Temperature Impacts' : 'La Niña Temperature Impacts'}
          subtitle="Met Office schematic, based on Davey et al. (2013). Coloured regions are likely warmer (red) or cooler (blue) than normal during the labelled season when the phase is active."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={phase === 'el-nino' ? images.metOfficeImpactElNinoTemp : images.metOfficeImpactLaNinaTemp}
            alt={`${phase === 'el-nino' ? 'El Niño' : 'La Niña'} temperature impacts schematic`}
            className="w-full rounded-lg border border-gray-700/50 bg-white"
            loading="lazy"
          />
          <p className="text-[11px] text-gray-500 mt-2">
            Source:{' '}
            <a href="https://www.metoffice.gov.uk/research/climate/seasonal-to-decadal/gpc-outlooks/el-nino-la-nina" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Met Office GPC outlooks (Davey et al. 2013)</a>. © Crown Copyright.
          </p>
        </SectionCard>
        <SectionCard
          icon={<CloudRain className="text-emerald-300" />}
          title={phase === 'el-nino' ? 'El Niño Rainfall Impacts' : 'La Niña Rainfall Impacts'}
          subtitle="Met Office schematic. Wetter regions in green, drier in brown. Precipitation teleconnections are noisier than temperature, so probabilities are typically lower."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={phase === 'el-nino' ? images.metOfficeImpactElNinoPrecip : images.metOfficeImpactLaNinaPrecip}
            alt={`${phase === 'el-nino' ? 'El Niño' : 'La Niña'} precipitation impacts schematic`}
            className="w-full rounded-lg border border-gray-700/50 bg-white"
            loading="lazy"
          />
          <p className="text-[11px] text-gray-500 mt-2">
            Source:{' '}
            <a href="https://www.metoffice.gov.uk/research/climate/seasonal-to-decadal/gpc-outlooks/el-nino-la-nina" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Met Office GPC outlooks (Davey et al. 2013)</a>. © Crown Copyright.
          </p>
        </SectionCard>
      </div>

      {/* Met Office plume forecasts removed - the IRI/CCSR plume already
          drives the forecast curve in the hero past+future chart. */}

      {/* ═══ PAST EVENTS ═════════════════════════ */}
      <Divider icon={<History className="h-5 w-5" />} title="Past Major Events" />

      <SectionCard
        icon={<History className="text-[#D0A65E]" />}
        title="What Happened Last Time?"
        subtitle="The eight most consequential ENSO events since 1980. Bar height shows peak ONI; colour shows phase."
      >
        {/* Mini bar chart of peak amplitudes */}
        <div className="h-[200px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={PAST_EVENTS.map((e) => ({ ...e, label: `${e.start.slice(0, 4)}–${e.end.slice(2, 4)}` }))} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
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
            const phaseAccent = e.phase === 'el-nino' ? 'border-l-rose-500/70' : 'border-l-sky-400/70';
            const phaseText = e.phase === 'el-nino' ? 'text-rose-300' : 'text-sky-300';
            return (
              <div key={`${e.start}-${e.end}`} className={`rounded-xl border border-gray-800 bg-gray-900/50 border-l-4 ${phaseAccent} p-4`}>
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className={`text-base font-bold font-mono ${phaseText}`}>
                    {e.start.slice(0, 4)}-{e.end.slice(0, 4)} {e.phase === 'el-nino' ? 'El Niño' : 'La Niña'}
                  </p>
                  <span className="text-xs font-mono text-gray-400 capitalize">
                    {e.strength} <span className="normal-case">· Peak ONI {fmtSigned(e.peakOni, 1)}°C</span>
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
      <Divider icon={<Wind className="h-5 w-5" />} title="ENSO and Climate Change" />

      <SectionCard
        icon={<Wind className="text-[#D0A65E]" />}
        title="A Natural Amplifier of Climate Change"
        subtitle="ENSO is a natural cycle that has run for thousands of years (proven by coral and tree-ring records). Human-driven warming acts as a force multiplier - elevated tropical-ocean heat now combines with every El Niño, sharpening droughts, floods, heatwaves and record-breaking global temperatures."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-sm font-bold text-rose-300 mb-2 flex items-center gap-2"><Flame className="h-4 w-4" /> Intensification of Extremes</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              ENSO is a natural cycle, but climate change acts as a force multiplier. Higher global temperatures are deepening El Niño droughts in Australia, Brazil and the Amazon, and driving heavier rainfall across the southern US and East Africa - the same teleconnection patterns, but with sharper edges.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-sm font-bold text-amber-300 mb-2 flex items-center gap-2"><Zap className="h-4 w-4" /> More Frequent, More Intense Events</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Warmer sea-surface temperatures favour more rapid ENSO development and a higher occurrence of strong El Niño events. IPCC AR6 (2021) found with high confidence that ENSO SST variability over the past 50 years has been larger than at any time in the previous 400.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-sm font-bold text-orange-300 mb-2 flex items-center gap-2"><Thermometer className="h-4 w-4" /> Temperature Records Stack Up</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Every El Niño now releases its heat onto a baseline already ~1.3 °C above pre-industrial. The 1997-98, 2015-16 and 2023-24 events each set new global temperature records; 2024 became the first calendar year above 1.5 °C. Without continued greenhouse-gas warming the same ENSO events would have produced much smaller spikes.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-sm font-bold text-sky-300 mb-2 flex items-center gap-2"><Snowflake className="h-4 w-4" /> La Niña No Longer Cools Below the Trend</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Strong La Niña years used to deliver global mean temperatures below the long-term average. Today, even the deepest La Niñas (2020-22) sit well above any 20th-century year. La Niña now buys a temporary pause in record-breaking - it does not reverse the warming.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2"><Waves className="h-4 w-4" /> Oceans and Sea Ice Take a Hit</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Warmer ocean waters combined with ENSO trigger more widespread coral bleaching and deeper marine heatwaves. The atmospheric changes also push warmer water to higher latitudes, helping to reduce Arctic sea ice during strong El Niño years.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-sm font-bold text-emerald-300 mb-2 flex items-center gap-2"><Droplets className="h-4 w-4" /> A More Volatile Climate System</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              An accelerated Hadley circulation during El Niño, combined with a warmer atmosphere holding ~7 % more moisture per °C, is making compound extremes harder to predict. Most CMIP6 models project ENSO rainfall variability will <em>increase</em> with further warming - bigger droughts and bigger floods in the same teleconnection regions.
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
      <SectionCard icon={<Activity className="text-[#D0A65E]" />} title="Methodology & Sources">
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

      {/* ─── Explore More ───────────────────────────────────── */}
      <Divider icon={<BookOpen className="h-5 w-5 text-[#D0A65E]" />} title="Explore" />

      <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
        <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-start gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
          <span className="min-w-0 flex-1">Explore Climate Data</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <RelatedLink href="/climate/global" label="Global Climate Update" desc="Whole-planet temperature & trend update" />
          <RelatedLink href="/climate" label="Country, State & Region Updates" desc="144 regions tracked monthly" />
          <RelatedLink href="/climate/shifting-seasons" label="Shifting Seasons" desc="How season timing is moving worldwide" />
          <RelatedLink href="/climate/rankings" label="Climate Rankings" desc="League table of anomalies across 144 regions" />
          <RelatedLink href="/sea-levels-ice" label="Sea Levels & Ice" desc="Ocean heat, sea level rise & polar ice" />
          <RelatedLink href="/climate-explained" label="Climate Explained" desc="ENSO, greenhouse effect, glossary" />
        </div>
      </section>

        </div>
      </div>
    </main>
  );
}
