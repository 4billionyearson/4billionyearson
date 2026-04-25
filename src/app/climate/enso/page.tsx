'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
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

type EnsoSnapshot = {
  oni: OniData | null;
  weekly: WeeklyData | null;
  mei: MeiData | null;
  soi: SoiData | null;
  forecast: ForecastData | null;
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
  'El Niño': '#fb7185',
  'La Niña': '#60a5fa',
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

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-4">
      {/* ─── Hero ───────────────────────────────────────────────── */}
      <header className="bg-[#D0A65E] rounded-2xl p-6 md:p-8 shadow-xl">
        <h1 className="text-3xl md:text-5xl font-bold font-mono text-white tracking-tight">
          El Niño / La Niña — Live ENSO Tracker
        </h1>
        <p className="text-white/85 mt-3 max-w-3xl text-sm md:text-base">
          The El Niño-Southern Oscillation (ENSO) is the single biggest year-to-year driver of
          global temperature and rainfall after the long-term warming trend itself. This page
          combines the four most-watched indicators - Niño 3.4 SST, the Oceanic Niño Index,
          the Multivariate ENSO Index and the Southern Oscillation Index - with live
          tropical Pacific maps and the official NOAA forecast.
        </p>
      </header>

      {/* ─── Hero state ──────────────────────────────────────── */}
      {oni && (
        <SectionCard
          icon={<Activity className="text-sky-300" />}
          title={`Current state — ${oni.state}${oni.strength ? `, ${oni.strength}` : ''}`}
          subtitle={`Based on the latest 3-month NOAA Oceanic Niño Index (Niño 3.4 SST anomaly)`}
        >
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
                <p className="text-3xl font-bold font-mono text-white">
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
                <span className="text-rose-300">≥ +0.5°C</span> El Niño
              </p>
              <p className="text-sm text-gray-200 font-mono">
                <span className="text-sky-300">≤ −0.5°C</span> La Niña
              </p>
              <p className="text-sm text-gray-200 font-mono">otherwise Neutral</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            El Niño years tend to push global temperature higher (El Niño 2023-24 helped make
            2024 the hottest year on record). La Niña years temporarily damp the long-term
            warming trend - but the underlying greenhouse-gas-driven trend continues either way.
          </p>
        </SectionCard>
      )}

      {/* ═══ PAST + FUTURE HERO STORY ════════════════════════════ */}
      {oni && (() => {
        // Build combined dataset on a SINGLE yearly timescale.
        // Past = solid yearly peak ONI bars (1980→last historical year).
        // Future = a single dashed "predicted 2026 El Niño" bar at the average
        // of past El Niño peaks, labelled with the season window when probability
        // crosses 50% and 90%.
        const yearsBack = 46;
        const lastHistYear = oni.history[oni.history.length - 1]?.year || new Date().getFullYear();
        const minYear = lastHistYear - yearsBack + 1;
        const peaksByYear = new Map<number, number>();
        for (const p of oni.history) {
          if (p.year < minYear) continue;
          const cur = peaksByYear.get(p.year);
          if (cur === undefined || Math.abs(p.anom) > Math.abs(cur)) peaksByYear.set(p.year, p.anom);
        }
        const past = [...peaksByYear.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([year, peak]) => ({
            key: String(year),
            label: `${year}`,
            isForecast: false,
            peak,
            phase: peak >= 0.5 ? 'el-nino' : peak <= -0.5 ? 'la-nina' : 'neutral',
          }));

        // Forecast analysis — find when El Niño probability crosses 50% and ≥90%.
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

        // Predicted peak ONI = mean of historical El Niño peaks (those ≥ +0.5°C).
        const elNinoPeaks = past.filter((p) => p.peak >= 0.5).map((p) => p.peak);
        const predictedPeakOni = elNinoPeaks.length
          ? elNinoPeaks.reduce((a, b) => a + b, 0) / elNinoPeaks.length
          : 1.5;

        // Add the 2026 forecast bar to the same yearly axis.
        const forecastYear = lastHistYear + 1;
        const combined = [
          ...past,
          ...(isForecastingElNino
            ? [{
                key: String(forecastYear),
                label: `${forecastYear} (forecast)`,
                isForecast: true,
                peak: predictedPeakOni,
                phase: 'el-nino' as const,
              }]
            : []),
        ];

        return (
        <SectionCard
          icon={<History className="text-[#D0A65E]" />}
          title="Past & future — the central thread of the ENSO story"
          subtitle="Every El Niño (red) and La Niña (blue) since 1980 on one timeline — plus NOAA's forecast for the next event, drawn dashed at its expected strength. The 'today' line marks where measurement ends and prediction begins."
        >
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combined} margin={{ top: 10, right: 14, left: 0, bottom: 18 }}>
                <defs>
                  <pattern id="enso-forecast-stripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="rgba(251,113,133,0.18)" />
                    <rect width="3" height="6" fill="rgba(251,113,133,0.45)" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="key"
                  stroke="#9CA3AF"
                  fontSize={10}
                  interval={4}
                  angle={-90}
                  textAnchor="end"
                  height={50}
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
                  cursor={TT_CURSOR}
                  formatter={(value: any) => [`${fmtSigned(value, 1)}°C`, 'Peak ONI']}
                  labelFormatter={(_label: any, p: any) => {
                    const pl = p?.[0]?.payload;
                    if (!pl) return '';
                    if (pl.isForecast) return `${pl.label} — predicted El Niño`;
                    return `${pl.label} · ${pl.phase === 'el-nino' ? 'El Niño' : pl.phase === 'la-nina' ? 'La Niña' : 'Neutral'} year`;
                  }}
                />
                <ReferenceLine y={0.5} stroke="#fb7185" strokeDasharray="3 3" />
                <ReferenceLine y={-0.5} stroke="#60a5fa" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#6B7280" />
                {/* "Today" boundary between history and forecast */}
                {isForecastingElNino && (
                  <ReferenceLine
                    x={String(lastHistYear)}
                    stroke="#D0A65E"
                    strokeDasharray="4 4"
                    label={{ value: 'today', fill: '#D0A65E', fontSize: 11, position: 'top' }}
                  />
                )}
                <Bar dataKey="peak" name="Peak ONI" isAnimationActive={false}>
                  {combined.map((d, i) => {
                    if (d.isForecast) {
                      return (
                        <Cell
                          key={i}
                          fill="url(#enso-forecast-stripes)"
                          stroke="#fb7185"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                        />
                      );
                    }
                    return (
                      <Cell
                        key={i}
                        fill={d.phase === 'el-nino' ? '#fb7185' : d.phase === 'la-nina' ? '#60a5fa' : '#6b7280'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend strip */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-400" /> El Niño peak (≥ +0.5°C)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-sky-400" /> La Niña peak (≤ −0.5°C)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-gray-500" /> Neutral year
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm border border-rose-400"
                style={{ background: 'repeating-linear-gradient(45deg, rgba(251,113,133,0.15) 0 2px, rgba(251,113,133,0.45) 2px 4px)' }}
              />{' '}
              Forecast (dashed)
            </span>
          </div>

          {/* Headline forecast narrative */}
          {isForecastingElNino && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 to-gray-900/30 p-4">
              <p className="text-xs uppercase tracking-wider text-rose-300/80 font-mono mb-1">NOAA forecast — what's coming</p>
              <p className="text-sm text-gray-100 leading-relaxed">
                A new <span className="font-semibold text-rose-300">El Niño</span> looks increasingly likely.{' '}
                {first50 && (
                  <>
                    Probability first crosses{' '}
                    <span className="font-mono font-semibold text-rose-200">50%</span> in{' '}
                    <span className="font-mono">{first50.label}</span>
                    {' '}({first50.pElNino}% chance)
                    {first90 && (
                      <>
                        , climbs above <span className="font-mono font-semibold text-rose-200">90%</span> in{' '}
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
                The dashed bar shows the expected peak intensity — drawn at{' '}
                <span className="font-mono font-semibold text-rose-200">{fmtSigned(predictedPeakOni, 1)}°C</span>,
                the average of every El Niño peak since {past.find((p) => p.phase === 'el-nino')?.label || '1980'}.
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
            Forecast source:{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA CPC ENSO probability outlook
            </a>
            . Past peaks computed from{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              ONI v5
            </a>
            .
          </p>
        </SectionCard>
        );
      })()}

      {/* ═══ WEEKLY ═══════════════════════════════════════════════ */}
      <Divider icon={<TrendingUp className="h-5 w-5" />} title="Weekly Niño 3.4" />

      {weekly && (
        <SectionCard
          title="Niño 3.4 SST anomaly — last 5 years"
          subtitle="Weekly sea-surface temperature anomaly in the Niño 3.4 box (5°S–5°N, 170°W–120°W) relative to the 1991–2020 baseline."
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly.weekly} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="elnino-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={10}
                  tickFormatter={(d: string) => d.slice(0, 7)}
                  interval={Math.max(1, Math.floor(weekly.weekly.length / 10))}
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
                  contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} cursor={TT_CURSOR}
                  formatter={(v: any) => [
                    typeof v === 'number' ? `${fmtSigned(v)}°C` : '—',
                    'Niño 3.4 anomaly',
                  ]}
                  labelFormatter={(d: any) => `Week of ${d}`}
                />
                <ReferenceLine y={0.5} stroke="#fb7185" strokeDasharray="3 3" label={{ value: 'El Niño', position: 'right', fill: '#fb7185', fontSize: 10 }} />
                <ReferenceLine y={-0.5} stroke="#60a5fa" strokeDasharray="3 3" label={{ value: 'La Niña', position: 'right', fill: '#60a5fa', fontSize: 10 }} />
                <ReferenceLine y={0} stroke="#6B7280" />
                <Area
                  type="monotone"
                  dataKey="nino34.anom"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  fill="url(#elnino-fill)"
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Source:{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA CPC weekly Niño-region SSTs
            </a>
          </p>
        </SectionCard>
      )}

      {/* ─── Niño-region snapshot ──────────────────────────── */}
      {weekly && (
        <SectionCard
          title="All four Niño regions — latest week"
          subtitle="Each region samples a different stretch of the equatorial Pacific. Niño 3.4 is the official ENSO yardstick; Niño 1+2 (off Peru) often leads coastal El Niño signals; Niño 4 reflects warm-pool dynamics."
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                ['Niño 1+2', 'nino12', 'Coastal Peru/Ecuador (10°S–0°, 90°W–80°W)'],
                ['Niño 3', 'nino3', 'Eastern Pacific (5°S–5°N, 150°W–90°W)'],
                ['Niño 3.4', 'nino34', 'Central Pacific (5°S–5°N, 170°W–120°W)'],
                ['Niño 4', 'nino4', 'Western Pacific warm pool (5°S–5°N, 160°E–150°W)'],
              ] as const
            ).map(([label, key, area]) => {
              const v = (weekly.latest as any)[key] as { sst: number; anom: number };
              const color = v.anom >= 0.5 ? 'text-rose-300' : v.anom <= -0.5 ? 'text-sky-300' : 'text-gray-200';
              return (
                <div key={key} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-2xl font-bold font-mono ${color}`}>{fmtSigned(v.anom)}°C</p>
                  <p className="text-xs text-gray-400 mt-0.5">SST {v.sst.toFixed(1)}°C</p>
                  <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">{area}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ═══ HISTORY ═════════════════════════════════════════════ */}
      <Divider icon={<Activity className="h-5 w-5" />} title="Historical indices" />

      {oni && (
        <SectionCard
          title="Oceanic Niño Index — last 30 seasons"
          subtitle="3-month overlapping seasons (DJF, JFM, FMA …). Bars above +0.5°C are El Niño months; below −0.5°C are La Niña."
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={oni.history.slice(-30).map((p, i) => ({ ...p, label: `${p.season}\n${p.year}`, i }))}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="season" stroke="#9CA3AF" fontSize={9} interval={2} />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={10}
                  width={36}
                  domain={[-3, 3]}
                  ticks={[-2, -1, 0, 1, 2]}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
                />
                <Tooltip
                  contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} cursor={TT_CURSOR}
                  formatter={(v: any) => [typeof v === 'number' ? `${fmtSigned(v)}°C` : '—', 'ONI']}
                  labelFormatter={(_, p: any) => (p?.[0]?.payload ? `${p[0].payload.season} ${p[0].payload.year}` : '')}
                />
                <ReferenceLine y={0.5} stroke="#fb7185" strokeDasharray="3 3" />
                <ReferenceLine y={-0.5} stroke="#60a5fa" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#6B7280" />
                <Bar dataKey="anom" isAnimationActive={false}>
                  {oni.history.slice(-30).map((p, i) => (
                    <Cell key={i} fill={p.anom >= 0.5 ? '#fb7185' : p.anom <= -0.5 ? '#60a5fa' : '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Source:{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA CPC ONI v5
            </a>
          </p>
        </SectionCard>
      )}

      {mei && (
        <SectionCard
          title="Multivariate ENSO Index v2"
          subtitle="MEI v2 combines five variables — SST, sea-level pressure, surface winds (zonal & meridional) and outgoing longwave radiation — into a single bi-monthly index. A useful cross-check on Niño 3.4 because it captures the atmospheric coupling, not just the ocean."
        >
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mei.history.map((p, i) => ({ ...p, x: `${p.year}-${p.season}`, i }))}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="x"
                  stroke="#9CA3AF"
                  fontSize={9}
                  interval={Math.max(1, Math.floor(mei.history.length / 8))}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={10}
                  width={36}
                  domain={[-3, 3]}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
                />
                <Tooltip
                  contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} cursor={TT_CURSOR}
                  formatter={(v: any) => [typeof v === 'number' ? fmtSigned(v) : '—', 'MEI v2']}
                  labelFormatter={(_, p: any) => (p?.[0]?.payload ? `${p[0].payload.season} ${p[0].payload.year}` : '')}
                />
                <ReferenceLine y={0.5} stroke="#fb7185" strokeDasharray="3 3" />
                <ReferenceLine y={-0.5} stroke="#60a5fa" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#6B7280" />
                <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Source:{' '}
            <a
              href="https://psl.noaa.gov/enso/mei/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA PSL MEI v2
            </a>
          </p>
        </SectionCard>
      )}

      {soi && (
        <SectionCard
          title="Southern Oscillation Index — last 5 years"
          subtitle="Standardised pressure difference between Tahiti and Darwin. Negative SOI = El Niño-favourable (weakened trades); positive SOI = La Niña-favourable. The atmospheric mirror of Niño 3.4."
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={soi.history.slice(-60).map((p, i) => ({
                  ...p,
                  label: `${MONTH_NAMES[p.month - 1]} ${String(p.year).slice(2)}`,
                  i,
                }))}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={9} interval={5} />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={10}
                  width={36}
                  domain={[-3, 3]}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
                />
                <Tooltip
                  contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} cursor={TT_CURSOR}
                  formatter={(v: any) => [typeof v === 'number' ? fmtSigned(v, 1) : '—', 'SOI']}
                  labelFormatter={(_, p: any) =>
                    p?.[0]?.payload ? `${MONTH_NAMES[p[0].payload.month - 1]} ${p[0].payload.year}` : ''
                  }
                />
                <ReferenceLine y={0} stroke="#6B7280" />
                <Bar dataKey="value" isAnimationActive={false}>
                  {soi.history.slice(-60).map((p, i) => (
                    <Cell key={i} fill={p.value >= 0.5 ? '#60a5fa' : p.value <= -0.5 ? '#fb7185' : '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Source:{' '}
            <a
              href="https://www.cpc.ncep.noaa.gov/data/indices/soi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D0A65E] hover:underline"
            >
              NOAA CPC SOI
            </a>
          </p>
        </SectionCard>
      )}

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

      {/* ═══ FORECAST ════════════════════════════════════════════ */}
      <Divider icon={<TrendingUp className="h-5 w-5" />} title="Forecast" />

      <SectionCard
        title="Probability of El Niño / Neutral / La Niña — next 9 seasons"
        subtitle="Official NOAA Climate Prediction Center forecast probabilities, based on the operational dynamical and statistical model ensemble. Updated mid-month."
      >
        {data?.forecast?.seasons?.length ? (
          <>
            {/* Stacked horizontal-ish bar table */}
            <div className="space-y-1.5">
              {data.forecast.seasons.map((s) => {
                const dominant = s.pElNino >= s.pLaNina && s.pElNino >= s.pNeutral
                  ? 'El Niño'
                  : s.pLaNina >= s.pNeutral
                  ? 'La Niña'
                  : 'Neutral';
                return (
                  <div key={s.season} className="flex items-center gap-2">
                    <span className="w-32 shrink-0 text-xs font-mono text-gray-300">{s.label}</span>
                    <div className="flex-1 h-7 flex rounded overflow-hidden bg-gray-800/40 border border-gray-700/50">
                      {s.pLaNina > 0 && (
                        <div
                          className="bg-sky-500 flex items-center justify-center text-[10px] font-mono font-bold text-sky-50"
                          style={{ width: `${s.pLaNina}%` }}
                          title={`La Niña ${s.pLaNina}%`}
                        >
                          {s.pLaNina >= 8 ? `${s.pLaNina}%` : ''}
                        </div>
                      )}
                      {s.pNeutral > 0 && (
                        <div
                          className="bg-gray-500 flex items-center justify-center text-[10px] font-mono font-bold text-gray-50"
                          style={{ width: `${s.pNeutral}%` }}
                          title={`Neutral ${s.pNeutral}%`}
                        >
                          {s.pNeutral >= 8 ? `${s.pNeutral}%` : ''}
                        </div>
                      )}
                      {s.pElNino > 0 && (
                        <div
                          className="bg-rose-500 flex items-center justify-center text-[10px] font-mono font-bold text-rose-50"
                          style={{ width: `${s.pElNino}%` }}
                          title={`El Niño ${s.pElNino}%`}
                        >
                          {s.pElNino >= 8 ? `${s.pElNino}%` : ''}
                        </div>
                      )}
                    </div>
                    <span className="w-20 shrink-0 text-right text-xs font-mono text-gray-400">{dominant}</span>
                  </div>
                );
              })}
            </div>
            {/* Mini legend */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-rose-500" /> El Niño
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-gray-500" /> Neutral
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-sky-500" /> La Niña
              </span>
            </div>
          </>
        ) : images.cpcProbabilityForecast ? (
          // Fallback to live image if structured data missing this run.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images.cpcProbabilityForecast}
            alt="NOAA CPC probability forecast for ENSO over the next 9 overlapping 3-month seasons"
            className="w-full rounded-lg border border-gray-700/50 bg-gray-900"
            loading="lazy"
          />
        ) : (
          <p className="text-sm text-gray-400">Forecast data unavailable this update.</p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Source:{' '}
          <a
            href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities.php"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D0A65E] hover:underline"
          >
            NOAA CPC ENSO probabilities
          </a>{' '}
          ·{' '}
          <a
            href="https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D0A65E] hover:underline"
          >
            IRI/CPC plume
          </a>
        </p>
      </SectionCard>

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
            Phase currently active: <span className={oni ? ENSO_TEXT[oni.state] : 'text-gray-300'}>{oni?.state || '—'}</span>
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

      {/* ═══ MET OFFICE PLUME FORECASTS ═════════════════ */}
      <Divider icon={<TrendingUp className="h-5 w-5" />} title="Met Office plume forecasts" />

      <SectionCard
        title="Forecast SST anomaly across the four Niño regions"
        subtitle="Each red line is one member of the Met Office GloSea dynamical ensemble; black is the recent observed trajectory. Spread between members shows the forecast uncertainty - tighter spread means more confidence."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            ['Niño 3.4 (canonical ENSO yardstick)', images.metOfficePlumeNino34],
            ['Niño 3 (eastern Pacific)', images.metOfficePlumeNino3],
            ['Niño 4 (warm-pool edge)', images.metOfficePlumeNino4],
            ['Niño 1+2 (coastal Peru/Ecuador)', images.metOfficePlumeNino12],
          ] as const).filter(([, src]) => !!src).map(([label, src]) => (
            <div key={label}>
              <p className="text-xs text-gray-300 font-mono mb-1">{label}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src!}
                alt={`Met Office plume forecast for ${label}`}
                className="w-full rounded-lg border border-gray-700/50 bg-white"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Source:{' '}
          <a href="https://www.metoffice.gov.uk/research/climate/seasonal-to-decadal/gpc-outlooks/el-nino-la-nina" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">
            Met Office GloSea ENSO forecasts
          </a>. Updated around the 11th of each month. Image displays nothing if a new month's plumes haven't been published yet.
        </p>
      </SectionCard>

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
                formatter={(v: any) => [typeof v === 'number' ? `${fmtSigned(v, 1)}°C peak ONI` : '—', '']}
              />
              <ReferenceLine y={0.5} stroke="#fb7185" strokeDasharray="3 3" />
              <ReferenceLine y={-0.5} stroke="#60a5fa" strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke="#6B7280" />
              <Bar dataKey="peakOni" isAnimationActive={false}>
                {PAST_EVENTS.map((e, i) => (
                  <Cell key={i} fill={e.phase === 'el-nino' ? '#fb7185' : '#60a5fa'} />
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
            <strong className="text-white">Oceanic Niño Index (ONI)</strong> — 3-month running mean of
            ERSSTv5 SST anomalies in the Niño 3.4 box (5°S–5°N, 170°W–120°W) relative to a centred
            30-year base period that updates every 5 years. NOAA's official ENSO yardstick.
          </li>
          <li>
            <strong className="text-white">Weekly Niño-region SSTs</strong> — OISSTv2-based weekly
            mean SST and SST anomaly (1991–2020 baseline) for Niño 1+2, 3, 3.4 and 4.
          </li>
          <li>
            <strong className="text-white">Multivariate ENSO Index v2</strong> — bi-monthly principal-
            component combination of SST, sea-level pressure, zonal & meridional surface winds and
            outgoing longwave radiation over the tropical Pacific. Captures atmospheric coupling.
          </li>
          <li>
            <strong className="text-white">Southern Oscillation Index</strong> — standardised
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
