import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Link from 'next/link';
import { Trophy, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import RankingsTable from './RankingsTable';
import RankingsAnalysis from './RankingsAnalysis';
import RollupsSection from './RollupsSection';
import ClimateMapCard, { type CountryAnomalyRow } from '../global/ClimateMapCard';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';
import { CONTINENT_BY_ISO, US_REGION_BY_ID } from '@/lib/climate/editorial';

export const metadata: Metadata = {
  title: 'Climate Rankings & Monthly Trends - 144 Regions Compared',
  description:
    'Sortable league table and monthly trend analysis for every country, US state and UK region we track. See who is warmest this month, the biggest rank movers since last month, continent-level roll-ups, and how your region compares against its climate peers - all against the 1961–1990 baseline.',
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
    title: 'Climate Rankings & Monthly Trends - Who is warmest this month?',
    description:
      'Live league table and trend analysis across 144 countries, US states and UK regions - anomalies, movers, peers and continent roll-ups, updated monthly.',
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

interface GroupRow {
  key: string;
  slug: string;
  label: string;
  kind: 'continent' | 'us-climate-region';
  memberCount: number | null;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
  nativeAnomaly1m: number | null;
  nativeAnomaly12m: number | null;
  nativeBaseline: string | null;
  sourceUrl: string | null;
  note: string | null;
  aggregate: boolean;
}

interface RankingsResponse {
  generatedAt: string;
  cacheMonth: string;
  count: number;
  rows: RankingRow[];
  groups?: {
    continents: GroupRow[];
    usClimateRegions: GroupRow[];
  };
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

async function loadCountryAnomalies(): Promise<CountryAnomalyRow[] | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const raw = await readFile(p, 'utf8');
    const parsed = JSON.parse(raw);
    const rows = parsed?.countryAnomalies;
    return Array.isArray(rows) && rows.length ? rows : null;
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

// Expand short month abbreviations ("Mar 2026") to full names ("March 2026")
// while leaving already-full or unrecognised labels untouched.
function expandMonthLabel(label: string | null | undefined): string {
  if (!label) return '';
  const SHORT_TO_FULL: Record<string, string> = {
    Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
    May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
    Sep: 'September', Sept: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
  };
  return label.replace(/^([A-Za-z]{3,4})(\b)/, (_m, p1: string, p2: string) => (SHORT_TO_FULL[p1] ?? p1) + p2);
}

interface RollupGroup {
  label: string;
  count: number;
  means: { anomaly1m: number | null; anomaly3m: number | null; anomaly12m: number | null };
  note?: string | null;
  aggregate?: boolean;
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

  const continents = Object.entries(continentBuckets).map(([k, v]) => toGroup(k, v));
  const usRegions = Object.entries(usBuckets).map(([k, v]) => toGroup(k, v));
  const types = [
    toGroup('Countries', typeBuckets.country),
    toGroup('US States', typeBuckets['us-state']),
    toGroup('UK Regions', typeBuckets['uk-region']),
  ].filter((g) => g.count > 0);

  return { continents, usRegions, types };
}

export default async function RankingsPage() {
  const [data, previous, countryAnomalies] = await Promise.all([
    loadRankings(),
    loadPreviousRankings(),
    loadCountryAnomalies(),
  ]);

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

  // Prefer NOAA-authoritative groups from build-rankings when present;
  // fall back to the sample-mean rollups computed from the row table.
  const groupRowToRollup = (g: GroupRow): RollupGroup => ({
    label: g.label,
    count: g.memberCount ?? 0,
    means: { anomaly1m: g.anomaly1m, anomaly3m: g.anomaly3m, anomaly12m: g.anomaly12m },
    note: g.note,
    aggregate: g.aggregate,
  });
  const continentsForCard: RollupGroup[] = data.groups?.continents?.length
    ? data.groups.continents.map(groupRowToRollup)
    : rollups.continents;
  const usRegionsForCard: RollupGroup[] = data.groups?.usClimateRegions?.length
    ? data.groups.usClimateRegions.map(groupRowToRollup)
    : rollups.usRegions;
  const movers = computeMovers(data, previous);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-8 md:pt-4 md:pb-10 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero */}
          <div
            className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden"
            style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
          >
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-2xl md:text-4xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
                Climate Rankings{latestLabel ? ` - ${expandMonthLabel(latestLabel)}` : ''}
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-4 py-4 md:px-6 md:py-5 space-y-4">
              <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                <strong className="text-white">144 regions</strong> ranked by this month’s temperature anomaly vs their 1961–1990 baseline - every country, US state and UK region we track.
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
          <RollupsSection
            continents={continentsForCard}
            usRegions={usRegionsForCard}
            types={rollups.types}
          />

          {/* Temperature anomaly map - geographic view of the same rankings */}
          {countryAnomalies && <ClimateMapCard countryAnomalies={countryAnomalies} />}

          {/* Table */}
          <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
              <Trophy className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
              <span className="min-w-0 flex-1">Full League Table</span>
            </h2>
            <RankingsTable
              rows={data.rows}
              generatedAt={data.generatedAt}
              groups={[
                ...(data.groups?.continents ?? []),
                ...(data.groups?.usClimateRegions ?? []),
              ]}
            />
          </section>

          {/* Footer - methodology summary + link to full page */}
          <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
              <Info className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
              <span className="min-w-0 flex-1">Methodology &amp; Baselines</span>
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Anomaly = monthly mean temperature − 1961–1990 mean for the same calendar month. The 12-month figure is the trailing 12-month mean minus the 12-month baseline. Country data is from Our World in Data / NOAA; UK regions from the Met Office Regional Series; US states &amp; climate regions from NOAA Climate at a Glance. NOAA values are re-baselined from their native 1901–2000 to 1961–1990 for cross-region comparison; the source-native figure is shown alongside for verification.
            </p>
            <p className="mt-3 text-sm text-gray-300 leading-relaxed">
              See the <Link href="/climate/methodology" className="text-[#E8C97A] underline hover:text-white">full methodology &amp; data sources</Link> page for the complete two-baseline model, source timeline and known caveats.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
