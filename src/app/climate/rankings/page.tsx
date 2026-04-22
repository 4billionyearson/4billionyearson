import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Link from 'next/link';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Globe2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import RankingsTable from './RankingsTable';
import RankingsAnalysis from './RankingsAnalysis';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';
import { CONTINENT_BY_ISO, US_REGION_BY_ID } from '@/lib/climate/editorial';

export const metadata: Metadata = {
  title: 'Climate Rankings & Monthly Trends — 144 Regions Compared',
  description:
    'Sortable league table and monthly trend analysis for every country, US state and UK region we track. See who is warmest this month, the biggest rank movers since last month, continent-level roll-ups, and how your region compares against its climate peers — all against the 1961–1990 baseline.',
  alternates: { canonical: 'https://4billionyearson.org/climate/rankings' },
  keywords: [
    'climate rankings',
    'country temperature rankings',
    'warmest countries this month',
    'climate league table',
    'climate trends monthly',
    'temperature anomaly comparison',
    'biggest climate movers',
    'continent temperature anomaly',
  ],
  openGraph: {
    title: 'Climate Rankings & Monthly Trends — Who is warmest this month?',
    description:
      'Live league table and trend analysis across 144 countries, US states and UK regions — anomalies, movers, peers and continent roll-ups, updated monthly.',
    url: 'https://4billionyearson.org/climate/rankings',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  emoji?: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
  dataAsOf: string | null;
}

interface RankingsResponse {
  generatedAt: string;
  cacheMonth: string;
  count: number;
  rows: RankingRow[];
}

async function loadRankings(): Promise<RankingsResponse | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'rankings.json');
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadPreviousRankings(): Promise<RankingsResponse | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'rankings-previous.json');
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

interface Mover {
  slug: string;
  name: string;
  emoji?: string;
  prevRank: number;
  currentRank: number;
  delta: number; // positive = climbed (rank went down numerically)
  currentAnomaly: number;
}

function computeMovers(current: RankingsResponse, previous: RankingsResponse | null): { climbers: Mover[]; fallers: Mover[] } {
  if (!previous?.rows?.length) return { climbers: [], fallers: [] };
  const rankOf = (rows: RankingRow[]): Map<string, number> => {
    const valid = rows.filter((r) => typeof r.anomaly1m === 'number');
    valid.sort((a, b) => (b.anomaly1m as number) - (a.anomaly1m as number));
    const map = new Map<string, number>();
    valid.forEach((r, i) => map.set(r.slug, i + 1));
    return map;
  };
  const prevRanks = rankOf(previous.rows);
  const curRanks = rankOf(current.rows);
  const movers: Mover[] = [];
  for (const row of current.rows) {
    if (row.anomaly1m == null) continue;
    const prev = prevRanks.get(row.slug);
    const cur = curRanks.get(row.slug);
    if (prev == null || cur == null) continue;
    const delta = prev - cur; // positive = moved up (lower rank number is hotter)
    if (delta === 0) continue;
    movers.push({
      slug: row.slug,
      name: row.name,
      emoji: row.emoji,
      prevRank: prev,
      currentRank: cur,
      delta,
      currentAnomaly: row.anomaly1m,
    });
  }
  const climbers = [...movers].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const fallers = [...movers].sort((a, b) => a.delta - b.delta).slice(0, 5);
  return { climbers, fallers };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

type Window = 'anomaly1m' | 'anomaly3m' | 'anomaly12m';

interface RollupGroup {
  label: string;
  count: number;
  means: { anomaly1m: number | null; anomaly3m: number | null; anomaly12m: number | null };
}

function meanOrNull(nums: (number | null)[]): number | null {
  const clean = nums.filter((n): n is number => typeof n === 'number');
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function buildRollups(rows: RankingRow[]): {
  continents: RollupGroup[];
  usRegions: RollupGroup[];
  types: RollupGroup[];
} {
  // slug → apiCode / group lookup
  const slugToRegion = new Map(CLIMATE_REGIONS.map((r) => [r.slug, r]));

  const continentBuckets: Record<string, RankingRow[]> = {};
  const usBuckets: Record<string, RankingRow[]> = {};
  const typeBuckets: Record<string, RankingRow[]> = {
    country: [],
    'us-state': [],
    'uk-region': [],
  };

  for (const row of rows) {
    typeBuckets[row.type]?.push(row);
    const region = slugToRegion.get(row.slug);
    if (!region) continue;
    if (region.type === 'country') {
      const c = CONTINENT_BY_ISO[region.apiCode];
      if (c) (continentBuckets[c] ||= []).push(row);
    } else if (region.type === 'us-state') {
      const u = US_REGION_BY_ID[region.apiCode];
      if (u) (usBuckets[u] ||= []).push(row);
    }
  }

  const toGroup = (label: string, arr: RankingRow[]): RollupGroup => ({
    label,
    count: arr.length,
    means: {
      anomaly1m: meanOrNull(arr.map((r) => r.anomaly1m)),
      anomaly3m: meanOrNull(arr.map((r) => r.anomaly3m)),
      anomaly12m: meanOrNull(arr.map((r) => r.anomaly12m)),
    },
  });

  const continents = Object.entries(continentBuckets)
    .map(([k, v]) => toGroup(k, v))
    .sort((a, b) => (b.means.anomaly1m ?? -99) - (a.means.anomaly1m ?? -99));
  const usRegions = Object.entries(usBuckets)
    .map(([k, v]) => toGroup(k, v))
    .sort((a, b) => (b.means.anomaly1m ?? -99) - (a.means.anomaly1m ?? -99));
  const types = [
    toGroup('Countries', typeBuckets.country),
    toGroup('US states', typeBuckets['us-state']),
    toGroup('UK regions', typeBuckets['uk-region']),
  ].filter((g) => g.count > 0);

  return { continents, usRegions, types };
}

function fmtSigned(v: number | null): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}°C`;
}

function toneBar(v: number | null): string {
  if (v == null) return 'bg-gray-700';
  if (v >= 1.5) return 'bg-red-400';
  if (v >= 0.8) return 'bg-orange-400';
  if (v >= 0.2) return 'bg-amber-400';
  if (v <= -0.2) return 'bg-sky-400';
  return 'bg-gray-500';
}

function RollupCard({ title, groups, windowKey }: { title: string; groups: RollupGroup[]; windowKey: Window }) {
  if (!groups.length) return null;
  const maxAbs = Math.max(...groups.map((g) => Math.abs(g.means[windowKey] ?? 0)), 0.5);
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      <div className="space-y-2">
        {groups.map((g) => {
          const v = g.means[windowKey];
          const pct = v == null ? 0 : Math.min(100, (Math.abs(v) / maxAbs) * 100);
          const positive = (v ?? 0) >= 0;
          return (
            <div key={g.label} className="text-xs">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-semibold text-gray-200">{g.label} <span className="text-gray-500 font-normal">({g.count})</span></span>
                <span className="font-mono text-gray-200">{fmtSigned(v)}</span>
              </div>
              <div className="relative h-2 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`absolute top-0 h-full ${toneBar(v)}`}
                  style={{
                    left: positive ? '50%' : `${50 - pct / 2}%`,
                    width: `${pct / 2}%`,
                  }}
                />
                <div className="absolute top-0 left-1/2 h-full w-px bg-gray-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function RankingsPage() {
  const [data, previous] = await Promise.all([loadRankings(), loadPreviousRankings()]);

  if (!data?.rows?.length) {
    return (
      <main>
        <div className="container mx-auto px-4 py-10 max-w-7xl text-gray-300">
          <p>Climate rankings are temporarily unavailable.</p>
        </div>
      </main>
    );
  }

  // Top 5 / bottom 5 for the 1-month window for the hero
  const with1m = data.rows.filter((r) => typeof r.anomaly1m === 'number');
  const sorted1m = [...with1m].sort((a, b) => (b.anomaly1m as number) - (a.anomaly1m as number));
  const top5 = sorted1m.slice(0, 5);
  const bottom5 = sorted1m.slice(-5).reverse();
  const latestLabel = sorted1m[0]?.latestLabel ?? '';

  const rollups = buildRollups(data.rows);
  const movers = computeMovers(data, previous);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-8 md:pt-4 md:pb-10 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">
          <Link
            href="/climate/global"
            className="inline-flex items-center gap-1.5 text-sm text-[#D0A65E] hover:text-[#E8C97A] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Global Climate
          </Link>

          {/* Hero */}
          <div
            className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden"
            style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
          >
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-2xl md:text-4xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
                Climate Rankings & Monthly Trends{latestLabel ? ` — ${latestLabel}` : ''}
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-4 py-4 md:px-6 md:py-5 space-y-4">
              <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                How <strong className="text-white">144 regions</strong> compare this month — every country, US state and UK region we track, ranked by how far the <strong className="text-white">most recent month</strong> sat above or below its 1961–1990 climatological baseline. Sort, filter or search the league table; see which regions <strong className="text-white">climbed or dropped</strong> the most since last month; and read the continent-level roll-ups below.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Top 5 warmest */}
                <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-4">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-red-300 font-semibold mb-2">
                    <TrendingUp className="h-3.5 w-3.5" /> Warmest this month
                  </p>
                  <ol className="space-y-1 text-sm">
                    {top5.map((r, i) => (
                      <li key={r.slug} className="flex items-center gap-2">
                        <span className="w-5 text-right font-mono text-gray-500">{i + 1}.</span>
                        <span>{r.emoji}</span>
                        <Link href={`/climate/${r.slug}`} className="flex-1 text-white hover:text-[#E8C97A] transition-colors">
                          {r.name}
                        </Link>
                        <span className="font-mono text-red-300">{r.anomaly1m! > 0 ? '+' : ''}{r.anomaly1m!.toFixed(2)}°C</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {/* Coolest */}
                <div className="rounded-xl border border-sky-900/40 bg-sky-950/10 p-4">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-sky-300 font-semibold mb-2">
                    <TrendingDown className="h-3.5 w-3.5" /> Coolest this month
                  </p>
                  <ol className="space-y-1 text-sm">
                    {bottom5.map((r, i) => (
                      <li key={r.slug} className="flex items-center gap-2">
                        <span className="w-5 text-right font-mono text-gray-500">{ordinal(data.rows.length - i)}</span>
                        <span>{r.emoji}</span>
                        <Link href={`/climate/${r.slug}`} className="flex-1 text-white hover:text-[#E8C97A] transition-colors">
                          {r.name}
                        </Link>
                        <span className="font-mono text-sky-300">{r.anomaly1m! > 0 ? '+' : ''}{r.anomaly1m!.toFixed(2)}°C</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly cross-region analysis (Gemini, web-grounded) */}
          <RankingsAnalysis />

          {/* Biggest movers (only shown when a previous snapshot exists) */}
          {(movers.climbers.length || movers.fallers.length) ? (
            <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
              <h2 className="text-xl font-bold font-mono text-white mb-2 flex items-start gap-2">
                <ArrowUpRight className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
                <span className="min-w-0 flex-1">Biggest movers since last month</span>
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Rank changes on the 1-month anomaly league table between the previous snapshot{previous?.cacheMonth ? ` (${previous.cacheMonth})` : ''} and this one{data.cacheMonth ? ` (${data.cacheMonth})` : ''}.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-4">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-red-300 font-semibold mb-2">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Climbed the most (relatively warmer this month)
                  </p>
                  {movers.climbers.length ? (
                    <ol className="space-y-1 text-sm">
                      {movers.climbers.map((m) => (
                        <li key={m.slug} className="flex items-center gap-2">
                          <span>{m.emoji}</span>
                          <Link href={`/climate/${m.slug}`} className="flex-1 text-white hover:text-[#E8C97A] transition-colors">
                            {m.name}
                          </Link>
                          <span className="font-mono text-xs text-gray-400">{m.prevRank} → {m.currentRank}</span>
                          <span className="font-mono text-red-300 w-12 text-right">+{m.delta}</span>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="text-xs text-gray-500">No climbers.</p>}
                </div>
                <div className="rounded-xl border border-sky-900/40 bg-sky-950/10 p-4">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-sky-300 font-semibold mb-2">
                    <ArrowDownRight className="h-3.5 w-3.5" /> Dropped the most (relatively cooler this month)
                  </p>
                  {movers.fallers.length ? (
                    <ol className="space-y-1 text-sm">
                      {movers.fallers.map((m) => (
                        <li key={m.slug} className="flex items-center gap-2">
                          <span>{m.emoji}</span>
                          <Link href={`/climate/${m.slug}`} className="flex-1 text-white hover:text-[#E8C97A] transition-colors">
                            {m.name}
                          </Link>
                          <span className="font-mono text-xs text-gray-400">{m.prevRank} → {m.currentRank}</span>
                          <span className="font-mono text-sky-300 w-12 text-right">{m.delta}</span>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="text-xs text-gray-500">No fallers.</p>}
                </div>
              </div>
            </section>
          ) : null}

          {/* Continent & region roll-ups */}
          <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl font-bold font-mono text-white mb-2 flex items-start gap-2">
              <Globe2 className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
              <span className="min-w-0 flex-1">Roll-ups — average 1-month anomaly by group</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Mean monthly anomaly across each grouping. Useful for seeing whether the latest warmth is global or concentrated in particular regions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <RollupCard title="By continent" groups={rollups.continents} windowKey="anomaly1m" />
              <RollupCard title="By US Census region" groups={rollups.usRegions} windowKey="anomaly1m" />
              <RollupCard title="By region type" groups={rollups.types} windowKey="anomaly1m" />
            </div>
          </section>

          {/* Table */}
          <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
              <Trophy className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
              <span className="min-w-0 flex-1">Full League Table</span>
            </h2>
            <RankingsTable rows={data.rows} generatedAt={data.generatedAt} />
          </section>

          {/* Footer */}
          <section className="bg-gray-950/60 backdrop-blur-md p-4 rounded-2xl border border-gray-800 text-xs text-gray-400 space-y-1.5">
            <p>
              <span className="font-semibold text-gray-300">Methodology:</span> Anomaly = monthly mean temperature − 1961–1990 mean for the same calendar month. The 12-month figure is the trailing 12-month mean minus the 12-month baseline. Country data is from Our World in Data / NOAA; UK regions from the Met Office Regional Series; US states from NOAA Climate at a Glance.
            </p>
            <p>Data snapshot: {new Date(data.generatedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
