'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  Loader2,
  Flower2,
  Snowflake,
  Activity,
  TrendingDown,
  MapPin,
  Leaf,
  Thermometer,
  Globe,
  BookOpen,
} from 'lucide-react';
import type { GlobalShiftRecord } from '@/app/_components/global-shift-map';
import { countryFlag } from '@/lib/climate/locations';
import GlobalSeasonalSummary from '@/app/_components/global-seasonal-summary';
import { StaticFAQPanel, FaqJsonLd } from '@/app/_components/seo/StaticFAQPanel';
import { SHIFTING_SEASONS_FAQ } from './seasons-faq';

const SpringIndexMap = dynamic(() => import('@/app/_components/spring-index-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] rounded-xl border border-gray-800/60 bg-gray-900/50 flex items-center justify-center text-gray-400 text-sm">
      <Loader2 className="h-5 w-5 animate-spin mr-2 text-pink-400" /> Loading map…
    </div>
  ),
});

const GlobalShiftMap = dynamic(() => import('@/app/_components/global-shift-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] rounded-xl border border-gray-800/60 bg-gray-900/50 flex items-center justify-center text-gray-400 text-sm">
      <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#D0A65E]" /> Loading global map…
    </div>
  ),
});

/* ─── Types ───────────────────────────────────────────────────────────────── */

type KyotoPoint = { year: number; doy: number; label: string };

type KyotoData = {
  source: string;
  sourceUrl: string;
  description: string;
  climatologyPre1850Mean: number;
  recent30YearMean: number;
  shiftDays: number;
  earliestYear: number;
  earliestDoy: number;
  firstYear: number;
  lastYear: number;
  count: number;
  points: KyotoPoint[];
};

type SnowMonthly = { year: number; month: number; areaKm2: number; anomPct: number | null };
type SnowSeasonal = { year: number; season: 'winter' | 'spring'; anomPct: number };
type SnowClim = { month: number; meanKm2: number };

type SnowData = {
  source: string;
  sourceUrl: string;
  description: string;
  climatologyBaseline: string;
  latest: { year: number; month: number; areaKm2: number } | null;
  monthly: SnowMonthly[];
  climatology: SnowClim[];
  seasonalAnomaly: SnowSeasonal[];
};

type EpaNational = { year: number; deviationDays: number };
type EpaWestEast = { year: number; east: number; west: number };
type EpaByState = { state: string; changeDays: number };
type EpaFrost = { year: number; lastSpringFrost: number; firstFallFrost: number };

type EpaData = {
  source: string;
  sourceUrl: string;
  description: string;
  coverage: string;
  headline: {
    first30YearMean: number;
    last10YearMean: number;
    shiftDays: number;
    first30YearWindow: string;
    last10YearWindow: string;
  };
  national: EpaNational[];
  westEast: EpaWestEast[];
  byState: EpaByState[];
  frost: EpaFrost[];
};

type GlobalShiftData = {
  generatedAt: string;
  globalStats: {
    totalAnalysed: number;
    countriesAnalysed: number;
    usStatesAnalysed: number;
    ukRegionsAnalysed: number;
    seasonalityCounts: {
      warmCold: number;
      wetDry: number;
      mixed: number;
      aseasonal: number;
    };
    koppenGroupCounts?: Record<'A' | 'B' | 'C' | 'D' | 'E', number>;
    koppenCodeCounts?: Record<string, number>;
    warmColdStats: {
      total: number;
      withCrossings: number;
      earlierSprings: number;
      laterAutumns: number;
      meanSpringShift: number | null;
      meanAutumnShift: number | null;
      meanNetShiftMonths: number | null;
      warmestMonthShifted: number;
    };
    wetDryStats: {
      total: number;
      withRainData: number;
      wetSeasonsShorter: number;
      wetSeasonsLonger: number;
      meanWetSeasonOnsetShiftDays: number | null;
      meanAnnualRainfallShiftPct: number | null;
    };
  };
  countries: GlobalShiftRecord[];
  usStates: GlobalShiftRecord[];
  ukRegions: GlobalShiftRecord[];
};

type ApiResponse = {
  kyoto: KyotoData;
  snow: SnowData;
  epa: EpaData;
  manifest: { updatedAt: string };
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function doyToLabel(doy: number) {
  const d = new Date(Date.UTC(2001, 0, 1));
  d.setUTCDate(d.getUTCDate() + doy - 1);
  return `${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}`;
}

function rollingMean(points: KyotoPoint[], windowYears: number) {
  // Centered rolling mean by year (rather than by index, so gaps don't bias).
  const byYear = new Map(points.map((p) => [p.year, p.doy]));
  const out: { year: number; doy: number }[] = [];
  for (const p of points) {
    const half = Math.floor(windowYears / 2);
    let sum = 0;
    let count = 0;
    for (let y = p.year - half; y <= p.year + half; y++) {
      const v = byYear.get(y);
      if (v != null) {
        sum += v;
        count++;
      }
    }
    if (count >= Math.max(5, windowYears * 0.3)) {
      out.push({ year: p.year, doy: sum / count });
    }
  }
  return out;
}

/* ─── Tooltips ────────────────────────────────────────────────────────────── */

function KyotoTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: KyotoPoint & { rollDoy?: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="font-semibold text-gray-200">{p.year} CE</p>
      <p className="text-pink-300">Full bloom: {doyToLabel(p.doy)} (DOY {p.doy})</p>
      {p.rollDoy != null && (
        <p className="text-amber-300">30-yr mean: DOY {p.rollDoy.toFixed(1)} ({doyToLabel(Math.round(p.rollDoy))})</p>
      )}
    </div>
  );
}

function SnowTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="font-semibold text-gray-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}%
        </p>
      ))}
    </div>
  );
}

function SnowMonthlyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { year: number; month: number; anomPct: number | null; areaKm2: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="font-semibold text-gray-200">{MONTHS_SHORT[p.month - 1]} {p.year}</p>
      <p className="text-cyan-300">{(p.areaKm2 / 1e6).toFixed(2)} M km²</p>
      {p.anomPct != null && (
        <p className={p.anomPct < 0 ? 'text-orange-300' : 'text-blue-300'}>
          {p.anomPct > 0 ? '+' : ''}{p.anomPct.toFixed(1)}% vs 1981–2010
        </p>
      )}
    </div>
  );
}

/* ─── Layout helpers (consistent with other climate pages) ────────────────── */

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-xl font-bold font-mono text-white mb-5 flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
        {icon}
        <span className="min-w-0 flex-1">{title}</span>
      </h2>
      {children}
    </div>
  );
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

function StatBlock({ label, value, unit, sub, color = 'text-orange-300' }: {
  label: string; value: string; unit?: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/60 p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function ShiftingSeasonsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [globalShift, setGlobalShift] = useState<GlobalShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/climate/seasonal-shift')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load seasonal shift data');
        return r.json() as Promise<ApiResponse>;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/data/seasons/shift-global.json')
      .then((r) => (r.ok ? (r.json() as Promise<GlobalShiftData>) : null))
      .then((d) => setGlobalShift(d))
      .catch(() => {});
  }, []);

  /* Top-N leaderboards across all region types combined. */
  const leaderboards = useMemo(() => {
    if (!globalShift) return null;
    type Row = GlobalShiftRecord & { kind: 'country' | 'us-state' | 'uk-region' };
    const all: Row[] = [
      ...globalShift.countries.map((r) => ({ ...r, kind: 'country' as const })),
      ...globalShift.usStates.map((r) => ({ ...r, kind: 'us-state' as const })),
      ...globalShift.ukRegions.map((r) => ({ ...r, kind: 'uk-region' as const })),
    ];
    // Warm-season metrics only apply to temperate (C), continental (D) and
    // polar (E) Köppen groups. A (tropical) and B (arid) are monitored via
    // the wet/dry leaderboards below.
    const tempSeasonal = all.filter(
      (r) => r.koppen && (r.koppen.group === 'C' || r.koppen.group === 'D' || r.koppen.group === 'E'),
    );
    const withCross = tempSeasonal.filter(
      (r) => r.temp.springShiftDays !== null && r.temp.autumnShiftDays !== null,
    );
    const spring = [...withCross]
      .sort((a, b) => (a.temp.springShiftDays ?? 0) - (b.temp.springShiftDays ?? 0))
      .slice(0, 8);
    const autumn = [...withCross]
      .sort((a, b) => (b.temp.autumnShiftDays ?? 0) - (a.temp.autumnShiftDays ?? 0))
      .slice(0, 8);
    const net = [...tempSeasonal]
      .sort((a, b) => (b.temp.netShiftMonths ?? 0) - (a.temp.netShiftMonths ?? 0))
      .slice(0, 8);

    // Wet/dry metrics apply to the whole A + B universe plus any C/D region
    // whose rainfall seasonality passed the 2× peak/trough test.
    const wetRegions = all.filter(
      (r) => r.rain && (r.koppen?.group === 'A' || r.koppen?.group === 'B' || r.seasonality === 'wet-dry' || r.seasonality === 'mixed'),
    );
    const annualRainUp = [...wetRegions]
      .sort((a, b) => (b.rain?.annualTotalShiftPct ?? 0) - (a.rain?.annualTotalShiftPct ?? 0))
      .slice(0, 8);
    const annualRainDown = [...wetRegions]
      .sort((a, b) => (a.rain?.annualTotalShiftPct ?? 0) - (b.rain?.annualTotalShiftPct ?? 0))
      .slice(0, 8);
    const onsetShift = [...wetRegions]
      .filter((r) => r.rain?.wetSeasonOnsetShiftDays !== null)
      .sort(
        (a, b) =>
          Math.abs(b.rain?.wetSeasonOnsetShiftDays ?? 0) -
          Math.abs(a.rain?.wetSeasonOnsetShiftDays ?? 0),
      )
      .slice(0, 8);
    return { spring, autumn, net, annualRainUp, annualRainDown, onsetShift };
  }, [globalShift]);

  /* Kyoto derived series */
  const kyotoChartData = useMemo(() => {
    if (!data) return [];
    const roll = rollingMean(data.kyoto.points, 30);
    const rollMap = new Map(roll.map((r) => [r.year, r.doy]));
    return data.kyoto.points.map((p) => ({
      ...p,
      rollDoy: rollMap.get(p.year),
    }));
  }, [data]);

  /* Snow derived */
  const snowSpring = useMemo(() => {
    if (!data) return [];
    return data.snow.seasonalAnomaly.filter((s) => s.season === 'spring');
  }, [data]);
  const snowWinter = useMemo(() => {
    if (!data) return [];
    return data.snow.seasonalAnomaly.filter((s) => s.season === 'winter');
  }, [data]);
  const snowHeadline = useMemo(() => {
    if (!snowSpring.length || !snowWinter.length) return null;
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const springRecent = mean(snowSpring.slice(-10).map((s) => s.anomPct).filter((v): v is number => v != null));
    const winterRecent = mean(snowWinter.slice(-10).map((s) => s.anomPct).filter((v): v is number => v != null));
    const springFirst = mean(snowSpring.slice(0, 10).map((s) => s.anomPct).filter((v): v is number => v != null));
    return {
      springRecent,
      winterRecent,
      springChange: springRecent - springFirst,
    };
  }, [snowSpring, snowWinter]);
  const snowLast24 = useMemo(() => {
    if (!data) return [];
    return data.snow.monthly.slice(-24);
  }, [data]);

  /* Headline numbers */
  const kyotoLatest = data?.kyoto.points[data.kyoto.points.length - 1];
  const snowLatestAnomPct = useMemo(() => {
    if (!data?.snow.latest) return null;
    const m = data.snow.monthly.find(
      (r) => r.year === data.snow.latest!.year && r.month === data.snow.latest!.month,
    );
    return m?.anomPct ?? null;
  }, [data]);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Hero ─────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
                Shifting Seasons
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4 space-y-3">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Climate change shows up in the timing of the year. Spring arrives
                earlier, snow leaves sooner, and the growing season stretches. This
                page pulls together the longest, cleanest records of that shift:
                a global analysis of hundreds of regions, Kyoto&apos;s 1,200-year
                cherry-blossom archive, the Northern Hemisphere snow record,
                a live US spring tracker, and the US growing season since 1895.
              </p>
            </div>
          </div>

          {/* ─── Loading / Error ──────────────────────────────────────────── */}
          {loading && (
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#D0A65E] flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-pink-400" />
              <p className="text-gray-400">Loading seasonal shift data…</p>
            </div>
          )}
          {error && !loading && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-6 text-red-400 text-center">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* ─── Headline numbers ───────────────────────────────────── */}
              <SectionCard icon={<Activity className="text-emerald-400" />} title="Key Facts">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {globalShift && (
                    <>
                      <StatBlock
                        label="Earlier Springs"
                        value={
                          globalShift.globalStats.warmColdStats.meanSpringShift !== null
                            ? `${globalShift.globalStats.warmColdStats.meanSpringShift > 0 ? '+' : ''}${globalShift.globalStats.warmColdStats.meanSpringShift.toFixed(1)}`
                            : '-'
                        }
                        unit={globalShift.globalStats.warmColdStats.meanSpringShift !== null ? 'days' : undefined}
                        sub={`mean across ${globalShift.globalStats.warmColdStats.withCrossings} temperate regions (${globalShift.globalStats.warmColdStats.earlierSprings} earlier)`}
                        color="text-rose-300"
                      />
                      <StatBlock
                        label="Later Autumns"
                        value={
                          globalShift.globalStats.warmColdStats.meanAutumnShift !== null
                            ? `${globalShift.globalStats.warmColdStats.meanAutumnShift > 0 ? '+' : ''}${globalShift.globalStats.warmColdStats.meanAutumnShift.toFixed(1)}`
                            : '-'
                        }
                        unit={globalShift.globalStats.warmColdStats.meanAutumnShift !== null ? 'days' : undefined}
                        sub={`mean across ${globalShift.globalStats.warmColdStats.withCrossings} temperate regions (${globalShift.globalStats.warmColdStats.laterAutumns} later)`}
                        color="text-amber-300"
                      />
                    </>
                  )}
                  <StatBlock
                    label="Kyoto Cherry Blossom"
                    value={`${data.kyoto.shiftDays > 0 ? '+' : '−'}${Math.abs(data.kyoto.shiftDays).toFixed(1)}`}
                    unit="days"
                    sub={`recent 30-yr mean vs pre-1850 (${data.kyoto.shiftDays < 0 ? 'earlier' : 'later'})`}
                    color="text-pink-300"
                  />
                  <StatBlock
                    label="NH Spring Snow"
                    value={
                      snowHeadline
                        ? `${snowHeadline.springChange > 0 ? '+' : ''}${snowHeadline.springChange.toFixed(1)}`
                        : snowLatestAnomPct != null
                          ? `${snowLatestAnomPct > 0 ? '+' : ''}${snowLatestAnomPct.toFixed(1)}`
                          : '-'
                    }
                    unit={
                      snowHeadline
                        ? 'pp'
                        : snowLatestAnomPct != null
                          ? '%'
                          : undefined
                    }
                    sub={
                      snowHeadline && snowLatestAnomPct != null && data.snow.latest
                        ? `spring lost vs 1967-1976; latest ${MONTHS_SHORT[data.snow.latest.month - 1]} ${data.snow.latest.year}: ${snowLatestAnomPct > 0 ? '+' : ''}${snowLatestAnomPct.toFixed(1)}%`
                        : 'recent 10-yr spring vs 1967-1976'
                    }
                    color="text-rose-300"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Updated {new Date(data.manifest.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
                </p>
              </SectionCard>

              {/* Visual summary of seasonal shifts: hemispheres, Köppen zones,
                  and notable Northern-Hemisphere records. Mirrors the
                  Shifting-Seasons block on /climate/global. */}
              <SectionCard icon={<Leaf className="text-emerald-400" />} title="Shifting Seasons Worldwide">
                <GlobalSeasonalSummary hideExploreLink />
              </SectionCard>

              {/* ═══ THE GLOBAL PICTURE ═══ */}
              <Divider icon={<Globe className="h-5 w-5" />} title="The Global Picture" />

              {globalShift && leaderboards && (
                <SectionCard
                  icon={<Globe className="text-[#D0A65E]" />}
                  title="How Seasons Have Shifted"
                >
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">
                    Each region&apos;s first 30 years on record are compared with the
                    most recent 10 - tracking when monthly temperatures cross the
                    baseline annual mean to reveal earlier springs, later autumns
                    and shifting wet seasons.
                  </p>

                  <SubSection title="World Map: Pick a Metric">
                    <GlobalShiftMap />
                  </SubSection>

                  <SubSection title="Where the Warm-Season Shift Is Biggest (Köppen C + D Regions)">
                    <p className="text-[11px] text-gray-500 mb-2">
                      Spring / autumn crossings are only meaningful where the
                      climate has a genuine winter, i.e. Köppen temperate (C) or
                      continental (D) groups. Tropical (A) and arid (B) regions
                      are ranked by wet-season metrics below.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      <Leaderboard
                        title="Spring Advancing Fastest"
                        accent="text-rose-300"
                        rows={leaderboards.spring}
                        format={(r) => `${r.temp.springShiftDays! > 0 ? '+' : ''}${r.temp.springShiftDays!.toFixed(1)} d`}
                      />
                      <Leaderboard
                        title="Autumn Extending Latest"
                        accent="text-amber-300"
                        rows={leaderboards.autumn}
                        format={(r) => `${r.temp.autumnShiftDays! > 0 ? '+' : ''}${r.temp.autumnShiftDays!.toFixed(1)} d`}
                      />
                      <Leaderboard
                        title="Warm Season Gaining Most Months"
                        accent="text-emerald-300"
                        rows={leaderboards.net}
                        format={(r) => `${(r.temp.netShiftMonths ?? 0) > 0 ? '+' : ''}${(r.temp.netShiftMonths ?? 0).toFixed(2)} mo`}
                      />
                    </div>
                  </SubSection>

                  {(leaderboards.onsetShift.length > 0 || leaderboards.annualRainUp.length > 0) && (
                    <SubSection title="Where the Wet/Dry Rhythm Is Shifting Most (Köppen A + B Regions)">
                      <p className="text-[11px] text-gray-500 mb-2">
                        For tropical (A) and arid (B) climates the rains define
                        the year. Onset shift (when the wet season now starts
                        vs baseline) and annual-total change are the signals
                        that matter most for agriculture.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Leaderboard
                          title="Biggest Wet-Season Onset Shift"
                          accent="text-sky-300"
                          rows={leaderboards.onsetShift}
                          format={(r) => {
                            const d = r.rain?.wetSeasonOnsetShiftDays ?? 0;
                            return `${d > 0 ? '+' : ''}${d.toFixed(0)} d`;
                          }}
                        />
                        <Leaderboard
                          title="Biggest Annual-Rainfall Change"
                          accent="text-sky-300"
                          rows={[...leaderboards.annualRainUp, ...leaderboards.annualRainDown]
                            .sort(
                              (a, b) =>
                                Math.abs(b.rain?.annualTotalShiftPct ?? 0) -
                                Math.abs(a.rain?.annualTotalShiftPct ?? 0),
                            )
                            .slice(0, 8)}
                          format={(r) => {
                            const v = r.rain?.annualTotalShiftPct ?? 0;
                            return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
                          }}
                        />
                      </div>
                    </SubSection>
                  )}

                  <div className="mt-4 text-xs text-gray-500 leading-relaxed">
                    Method: baseline = first 30 complete years of record;
                    recent = last 10 complete years. Warm-season length = months
                    per year whose mean exceeds the baseline annual mean;
                    spring/autumn crossings = interpolated day-of-year where
                    the monthly climatology crosses that threshold. Wet-season
                    onset = day of year where cumulative rainfall from 1 Jan
                    first passes 25 % of baseline annual total. Rainfall data:
                    World Bank CCKP (CRU TS 4.08, 1901–2023). Köppen codes
                    follow Peel, Finlayson &amp; McMahon 2007.
                  </div>
                </SectionCard>
              )}

              {/* ═══ HISTORICAL RECORDS ═══ */}
              <Divider icon={<Flower2 className="h-5 w-5" />} title="Historical Records" />

              {/* ─── Kyoto cherry-blossom record ───────────────────── */}
              <SectionCard
                icon={<Flower2 className="text-pink-400" />}
                title="Kyoto, Japan: 1,200 Years of Cherry Blossom"
              >
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  In Kyoto, Japan, court diaries, monastery records, and weather
                  observations have logged the day each spring when the city&apos;s
                  cherry trees reach <em>full bloom</em> (満開, <em>mankai</em>) almost
                  every year since 812&nbsp;CE. It&apos;s the longest continuous
                  biological record of climate anywhere on Earth, and the signal of
                  recent warming is unmistakable.
                </p>

                <div className="rounded-xl border border-pink-900/40 bg-gradient-to-br from-pink-950/30 to-pink-900/10 p-4 mb-4">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-3xl font-bold font-mono text-pink-300">
                      {doyToLabel(Math.round(data.kyoto.recent30YearMean))}
                    </span>
                    <span className="text-sm text-gray-400">recent 30-year mean full-bloom date</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-2">
                    versus <span className="text-amber-300 font-mono">{doyToLabel(Math.round(data.kyoto.climatologyPre1850Mean))}</span>{' '}
                    pre-1850, a shift of <span className="text-pink-300 font-bold">{Math.abs(data.kyoto.shiftDays).toFixed(1)} days earlier</span>.
                    The earliest bloom in the entire 1,200-year record is{' '}
                    <span className="text-pink-300 font-bold">{data.kyoto.earliestYear}</span>{' '}
                    ({doyToLabel(data.kyoto.earliestDoy)}).
                  </p>
                </div>

                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 24 }}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="year"
                        domain={[800, 2030]}
                        ticks={[900, 1100, 1300, 1500, 1700, 1900, 2025]}
                        tickFormatter={(v) => `${v}`}
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Year (CE)', position: 'insideBottom', offset: -2, fill: '#9ca3af', fontSize: 11 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="doy"
                        domain={[80, 130]}
                        reversed
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => doyToLabel(v)}
                        label={{ value: 'Full-bloom date', angle: -90, position: 'insideLeft', offset: 15, fill: '#9ca3af', fontSize: 11 }}
                        width={70}
                      />
                      <Tooltip content={<KyotoTooltip />} cursor={{ stroke: '#D0A65E', strokeOpacity: 0.3 }} />
                      <ReferenceLine
                        y={data.kyoto.climatologyPre1850Mean}
                        stroke="#fbbf24"
                        strokeDasharray="4 4"
                        label={{ value: `pre-1850 mean (${doyToLabel(Math.round(data.kyoto.climatologyPre1850Mean))})`, position: 'insideTopRight', fill: '#fbbf24', fontSize: 10 }}
                      />
                      <Scatter
                        name="Annual full-bloom date"
                        data={kyotoChartData}
                        fill="#ec4899"
                        fillOpacity={0.45}
                        shape="circle"
                      />
                      <Scatter
                        name="30-year rolling mean"
                        data={kyotoChartData.filter((p) => p.rollDoy != null).map((p) => ({ year: p.year, doy: p.rollDoy }))}
                        fill="#fde047"
                        line={{ stroke: '#fde047', strokeWidth: 2 }}
                        lineType="joint"
                        shape={() => <></>}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 18 }} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Each pink dot is one year&apos;s full-bloom date. The yellow line is a 30-year centred rolling mean.
                  The dashed line is the pre-1850 long-term mean ({doyToLabel(Math.round(data.kyoto.climatologyPre1850Mean))}).
                  Y-axis is reversed so that &ldquo;earlier in the year&rdquo; is up.
                </p>

                <div className="mt-4 text-xs text-gray-500 leading-relaxed">
                  Source:{' '}
                  <a href={data.kyoto.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">
                    Aono &amp; Kazui (2008) and Aono &amp; Saito (2010), via NOAA NCEI Paleoclimatology
                  </a>
                  ; recent decade extended from JMA Kyoto sakura observation records.
                </div>
              </SectionCard>

              {/* ─── NH snow cover ──────────────────────────────────────── */}
              <SectionCard
                icon={<Snowflake className="text-cyan-400" />}
                title="Northern Hemisphere Snow Cover"
              >
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  Satellites have mapped Northern Hemisphere snow cover every week since
                  late 1966. Winter snow extent has held up reasonably well, but{' '}
                  <strong className="text-orange-300">spring snow is collapsing</strong>:
                  the meltout now happens weeks earlier across vast areas, exposing
                  darker land that absorbs more sunlight and accelerates regional warming.
                </p>

                {snowHeadline && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    <div className="rounded-xl border border-gray-700/50 bg-gray-800/60 p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                        Recent 10-yr Anomaly vs 1981–2010
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">Spring (MAM)</div>
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span className="text-2xl font-bold font-mono text-orange-300">
                              {snowHeadline.springRecent.toFixed(1)}
                            </span>
                            <span className="text-sm text-gray-400">%</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">Winter (DJF)</div>
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span className={`text-2xl font-bold font-mono ${snowHeadline.winterRecent < 0 ? 'text-orange-300' : 'text-blue-300'}`}>
                              {snowHeadline.winterRecent >= 0 ? '+' : ''}{snowHeadline.winterRecent.toFixed(1)}
                            </span>
                            <span className="text-sm text-gray-400">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <StatBlock
                      label="Spring Snow Lost"
                      value={snowHeadline.springChange.toFixed(1)}
                      unit="pp"
                      sub={`vs first 10 years on record (1967-1976)`}
                      color="text-rose-300"
                    />
                  </div>
                )}

                {/* Spring vs winter trend */}
                <SubSection title="Spring Snow Is Shrinking, Winter Is Holding Up">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={(() => {
                          // Combine the two series on a shared year axis.
                          const map = new Map<number, { year: number; spring?: number; winter?: number }>();
                          for (const s of snowWinter) {
                            const e = map.get(s.year) ?? { year: s.year };
                            e.winter = s.anomPct;
                            map.set(s.year, e);
                          }
                          for (const s of snowSpring) {
                            const e = map.get(s.year) ?? { year: s.year };
                            e.spring = s.anomPct;
                            map.set(s.year, e);
                          }
                          return [...map.values()].sort((a, b) => a.year - b.year);
                        })()}
                        margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                      >
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                        <XAxis dataKey="year" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                        <YAxis
                          stroke="#9ca3af"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v}%`}
                          label={{ value: 'Anomaly vs 1981–2010', angle: -90, position: 'insideLeft', offset: 0, fill: '#9ca3af', fontSize: 11 }}
                        />
                        <Tooltip content={<SnowTooltip />} cursor={{ stroke: '#D0A65E', strokeOpacity: 0.3 }} />
                        <ReferenceLine y={0} stroke="#6b7280" />
                        <Line
                          dataKey="winter"
                          name="Winter (DJF)"
                          stroke="#60a5fa"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                        <Line
                          dataKey="spring"
                          name="Spring (MAM)"
                          stroke="#fb923c"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Anomaly = % difference from the 1981–2010 monthly mean, averaged over the three months of each season.
                  </p>
                </SubSection>

                {/* Last 24 months bars */}
                <SubSection title="Last Two Years, Month by Month">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={snowLast24.map((m) => ({
                          ...m,
                          xlabel: `${MONTHS_SHORT[m.month - 1]} '${String(m.year).slice(-2)}`,
                        }))}
                        margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                      >
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                        <XAxis dataKey="xlabel" stroke="#9ca3af" tick={{ fontSize: 10 }} interval={1} />
                        <YAxis
                          stroke="#9ca3af"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip content={<SnowMonthlyTooltip />} cursor={{ fill: 'rgba(208, 166, 94, 0.05)' }} />
                        <ReferenceLine y={0} stroke="#6b7280" />
                        <Bar dataKey="anomPct" name="Anomaly">
                          {snowLast24.map((m, i) => (
                            <Cell key={i} fill={(m.anomPct ?? 0) < 0 ? '#fb923c' : '#60a5fa'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Orange bars = below 1981–2010 normal, blue bars = above. Updates monthly from Rutgers Global Snow Lab.
                  </p>
                </SubSection>

                <div className="mt-4 text-xs text-gray-500 leading-relaxed">
                  Source:{' '}
                  <a href={data.snow.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">
                    Rutgers University Global Snow Lab (NOAA NESDIS satellite analyses)
                  </a>
                  . Climatology baseline {data.snow.climatologyBaseline}.
                </div>
              </SectionCard>

              {/* ═══ UNITED STATES ═══ */}
              <Divider icon={<MapPin className="h-5 w-5" />} title="United States" />

              {/* ─── USA-NPN live spring map ───────────────────── */}
              <SectionCard
                icon={<MapPin className="text-pink-400" />}
                title="Live: How Early Is Spring Arriving Across the US?"
              >
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  The USA National Phenology Network runs a daily-updated model that
                  tracks how many days early or late spring is arriving compared to
                  the 1991–2020 average, based on the thermal thresholds that trigger
                  leaf-out and first-bloom in temperate woody plants. During Feb–May
                  each year, the map below updates every day.
                </p>
                <SpringIndexMap />
              </SectionCard>

              {/* ─── EPA growing season (US historical) ─────────────────── */}
              <SectionCard
                icon={<Leaf className="text-emerald-400" />}
                title="The CONUS Growing Season"
              >
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  Since 1895 the contiguous-US growing season (the stretch between the
                  last spring frost and the first autumn frost) has lengthened
                  dramatically. The shift is largest in the West, where earlier springs
                  and later autumns compound.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                  <StatBlock
                    label="Recent 10-yr Avg"
                    value={`${data.epa.headline.last10YearMean >= 0 ? '+' : ''}${data.epa.headline.last10YearMean.toFixed(1)}`}
                    unit="days"
                    sub={`vs 1895-2020 mean (${data.epa.headline.last10YearWindow})`}
                    color="text-emerald-300"
                  />
                  <StatBlock
                    label="Net Lengthening"
                    value={`${data.epa.headline.shiftDays >= 0 ? '+' : ''}${data.epa.headline.shiftDays.toFixed(1)}`}
                    unit="days"
                    sub={`recent 10y minus first 30y (${data.epa.headline.first30YearWindow})`}
                    color="text-orange-300"
                  />
                </div>

                <SubSection title="CONUS Growing-Season Length, 1895–2020">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.epa.national}
                        margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                      >
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                        <XAxis dataKey="year" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                        <YAxis
                          stroke="#9ca3af"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}d`}
                          label={{ value: 'Deviation (days)', angle: -90, position: 'insideLeft', offset: 0, fill: '#9ca3af', fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12, color: '#e5e7eb' }}
                          labelStyle={{ color: '#f3f4f6', fontWeight: 600, marginBottom: 2 }}
                          itemStyle={{ color: '#e5e7eb' }}
                          formatter={(v) => [`${typeof v === 'number' ? (v > 0 ? '+' : '') + v.toFixed(1) : v} days`, 'Deviation']}
                        />
                        <ReferenceLine y={0} stroke="#6b7280" />
                        <Bar dataKey="deviationDays" name="Deviation">
                          {data.epa.national.map((p, i) => (
                            <Cell key={i} fill={p.deviationDays >= 0 ? '#10b981' : '#fb923c'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Green = longer than the 1895–2020 mean, orange = shorter. The
                    direction of change is unambiguous from around the 1980s onward.
                  </p>
                </SubSection>

                <div className="mt-4 text-xs text-gray-500 leading-relaxed">
                  Source:{' '}
                  <a href={data.epa.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">
                    EPA Climate Change Indicators: Length of Growing Season
                  </a>
                  . Underlying data: Kunkel (2021). Coverage: {data.epa.coverage}.
                  The EPA suspended updates to this indicator after April 2021, so the
                  series is authoritative historically but ends in 2020. We plan to
                  supplement with current-year figures from NOAA&apos;s xmACIS in a
                  follow-up.
                </div>
              </SectionCard>
            </>
          )}

          {/* Frequently Asked Questions — always rendered for AI / non-JS
              crawlers; mirrors FAQPage JSON-LD below. */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
            <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg [&>svg]:shrink-0">
              <BookOpen className="h-5 w-5" />
              <span>Frequently Asked Questions</span>
            </h2>
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
          </div>
          <StaticFAQPanel headingId="shifting-seasons-faq-heading" qa={SHIFTING_SEASONS_FAQ} />
          <FaqJsonLd qa={SHIFTING_SEASONS_FAQ} />

        </div>
      </div>
    </main>
  );
}

/* ─── Reused subsection ───────────────────────────────────────────────────── */

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-orange-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}

const KIND_FALLBACK_FLAG: Record<'country' | 'us-state' | 'uk-region', string> = {
  country: '🌍',
  'us-state': '🇺🇸',
  'uk-region': '🇬🇧',
};

function Leaderboard({
  title,
  accent,
  rows,
  format,
}: {
  title: string;
  accent: string;
  rows: Array<GlobalShiftRecord & { kind: 'country' | 'us-state' | 'uk-region' }>;
  format: (r: GlobalShiftRecord) => string;
}) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/60 p-4">
      <div className="text-xs text-gray-300 uppercase tracking-wider font-semibold mb-3">{title}</div>
      <ol className="space-y-2">
        {rows.map((r, i) => {
          const flag = r.kind === 'country' ? countryFlag(r.code) : KIND_FALLBACK_FLAG[r.kind];
          return (
            <li key={`${r.kind}-${r.code ?? r.name}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-xs text-gray-400 text-right tabular-nums">{i + 1}</span>
              <span className="text-lg leading-none" aria-hidden>{flag}</span>
              <span className="flex-1 truncate text-gray-100">{r.name}</span>
              <span className={`font-mono tabular-nums text-sm font-semibold ${accent}`}>
                {format(r)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
