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
  Loader2,
  Map as MapIcon,
  TrendingUp,
  Waves,
  Wind,
} from 'lucide-react';

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

type EnsoSnapshot = {
  oni: OniData | null;
  weekly: WeeklyData | null;
  mei: MeiData | null;
  soi: SoiData | null;
  sources: Record<string, string>;
  images: {
    sstAnomalyMap: string;
    tropicalSstAnimation: string;
    subsurfaceAnomaly: string;
    hovmollerSst: string;
    cpcProbabilityForecast: string;
  };
  generatedAt: string;
};

/* ─── Shared styling ──────────────────────────────────────────────────────── */

const ACCENT = '#D0A65E';

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
                  contentStyle={{ backgroundColor: '#111827', border: `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 12 }}
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
                  contentStyle={{ backgroundColor: '#111827', border: `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 12 }}
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
                  contentStyle={{ backgroundColor: '#111827', border: `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 12 }}
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
                  contentStyle={{ backgroundColor: '#111827', border: `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 12 }}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images.cpcProbabilityForecast}
          alt="NOAA CPC probability forecast for ENSO over the next 9 overlapping 3-month seasons"
          className="w-full rounded-lg border border-gray-700/50 bg-gray-900"
          loading="lazy"
        />
        <p className="text-xs text-gray-500 mt-2">
          Live image:{' '}
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
