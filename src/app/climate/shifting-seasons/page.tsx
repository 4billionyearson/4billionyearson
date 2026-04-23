'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Calendar,
  Activity,
  TrendingDown,
  Info,
} from 'lucide-react';

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

type ApiResponse = {
  kyoto: KyotoData;
  snow: SnowData;
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

function StatBlock({ label, value, sub, color = 'text-orange-300' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-3">
      <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function ShiftingSeasonsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
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
                The most personal way climate change shows up isn&apos;t in headlines — it&apos;s in
                the timing of the year. Spring arrives earlier. Snow leaves sooner. The
                growing season stretches. Here are two of the longest, cleanest records
                we have of that shift.
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
              <SectionCard icon={<Activity className="text-emerald-400" />} title="At a glance">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatBlock
                    label="Kyoto cherry blossom"
                    value={`${data.kyoto.shiftDays > 0 ? '−' : '+'}${Math.abs(data.kyoto.shiftDays).toFixed(1)} days`}
                    sub={`recent 30-yr mean vs pre-1850`}
                    color="text-pink-300"
                  />
                  <StatBlock
                    label="Earliest bloom on record"
                    value={`${data.kyoto.earliestYear}`}
                    sub={`DOY ${data.kyoto.earliestDoy} (${doyToLabel(data.kyoto.earliestDoy)})`}
                    color="text-pink-300"
                  />
                  <StatBlock
                    label="NH snow, latest month"
                    value={data.snow.latest ? `${(data.snow.latest.areaKm2 / 1e6).toFixed(2)} M km²` : '—'}
                    sub={data.snow.latest ? `${MONTHS_SHORT[data.snow.latest.month - 1]} ${data.snow.latest.year}` : ''}
                    color="text-cyan-300"
                  />
                  <StatBlock
                    label="vs 1981–2010 normal"
                    value={snowLatestAnomPct != null ? `${snowLatestAnomPct > 0 ? '+' : ''}${snowLatestAnomPct.toFixed(1)}%` : '—'}
                    sub="for the same calendar month"
                    color={snowLatestAnomPct != null && snowLatestAnomPct < 0 ? 'text-orange-300' : 'text-blue-300'}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Updated {new Date(data.manifest.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
                </p>
              </SectionCard>

              {/* ─── Kyoto cherry-blossom record ─────────────────────────── */}
              <SectionCard
                icon={<Flower2 className="text-pink-400" />}
                title="Kyoto cherry blossom — 1,200 years of spring"
              >
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  Court diaries, monastery records, and weather observations have logged
                  the day each spring when Kyoto&apos;s cherry trees reach <em>full bloom</em> (満開,
                  <em>mankai</em>) almost every year since 812&nbsp;CE. It&apos;s the longest
                  continuous biological record of climate anywhere on Earth — and the
                  signal of recent warming is unmistakable.
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
                    pre-1850 — a shift of <span className="text-pink-300 font-bold">{Math.abs(data.kyoto.shiftDays).toFixed(1)} days earlier</span>.
                    The earliest bloom in the entire 1,200-year record is{' '}
                    <span className="text-pink-300 font-bold">{data.kyoto.earliestYear}</span>{' '}
                    ({doyToLabel(data.kyoto.earliestDoy)}).
                  </p>
                </div>

                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      <Legend wrapperStyle={{ fontSize: 12 }} />
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
                title="Northern Hemisphere snow cover"
              >
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  Satellites have mapped Northern Hemisphere snow cover every week since
                  late 1966. Winter snow extent has held up reasonably well, but{' '}
                  <strong className="text-orange-300">spring snow is collapsing</strong> —
                  the meltout now happens weeks earlier across vast areas, exposing
                  darker land that absorbs more sunlight and accelerates regional warming.
                </p>

                {/* Spring vs winter trend */}
                <SubSection title="Spring snow is shrinking, winter is holding up">
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
                <SubSection title="Last two years, month by month">
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
                    Rutgers University Global Snow Lab — NOAA NESDIS satellite analyses
                  </a>
                  . Climatology baseline {data.snow.climatologyBaseline}.
                </div>
              </SectionCard>

              {/* ─── What's next ────────────────────────────────────────── */}
              <SectionCard icon={<Calendar className="text-amber-400" />} title="Coming next">
                <ul className="text-sm text-gray-300 leading-relaxed space-y-2 list-disc pl-5">
                  <li>
                    <strong className="text-[#FFF5E7]">Live US spring map</strong> — daily
                    USA-NPN Spring Leaf Index anomaly during Feb–May.
                  </li>
                  <li>
                    <strong className="text-[#FFF5E7]">Growing-season length per US state</strong>{' '}
                    from the EPA climate indicators series, 1895–present.
                  </li>
                  <li>
                    <strong className="text-[#FFF5E7]">Thermal-season bars</strong> for
                    every country, US state and UK region — first day of sustained
                    spring/summer/autumn temperatures derived from ERA5.
                  </li>
                </ul>
              </SectionCard>

              {/* ─── Methods / About ────────────────────────────────────── */}
              <SectionCard icon={<Info className="text-gray-400" />} title="About this page">
                <div className="text-sm text-gray-300 leading-relaxed space-y-3">
                  <p>
                    Phenology — the study of recurring biological events like flowering,
                    leaf-out, and migration — provides some of the strongest, longest,
                    and most personally relatable evidence of climate change.
                  </p>
                  <p>
                    The Kyoto cherry-blossom record is unique because the same species at
                    the same site has been observed for over a millennium. Pre-1850 dates
                    sit in a tight band centred on roughly{' '}
                    {doyToLabel(Math.round(data.kyoto.climatologyPre1850Mean))}; modern
                    dates have shifted to a new, earlier band as Kyoto&apos;s March
                    temperatures have warmed.
                  </p>
                  <p>
                    Snow cover anomalies use Rutgers Global Snow Lab&apos;s monthly
                    snow-covered area for Northern Hemisphere land, expressed as a percent
                    deviation from the 1981–2010 mean for the same calendar month — so a
                    January reading is compared to other Januaries, not to summer.
                  </p>
                </div>
              </SectionCard>
            </>
          )}

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
