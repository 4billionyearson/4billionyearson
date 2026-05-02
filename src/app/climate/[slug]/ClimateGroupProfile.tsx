import { promises as fs } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { BarChart3, ExternalLink, MapPin, Layers, Scale, AlertTriangle, FileText, BookOpen, TrendingUp, TrendingDown, Thermometer, CloudRain } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import { CLIMATE_REGIONS, getProfileSlugForLocation, getClimateUpdateDateLabel } from '@/lib/climate/regions';
import { ALL_LOCATIONS } from '@/lib/climate/locations';
import { CONTINENT_BY_ISO } from '@/lib/climate/editorial';
import ClimateRankPill from '@/app/_components/climate-rank-pill';
import GroupSummaryPanel from './GroupSummaryPanel';
import MonthlySpaghettiCard from '@/app/_components/monthly-spaghetti-card';
import SeasonalShiftCard from '@/app/_components/seasonal-shift-card';
import EmissionsCard from '@/app/_components/emissions-card';
import EnergyMixCard from '@/app/_components/energy-mix-card';
import { OverviewGrid } from '@/app/climate/_shared/overview-grid';
import { buildOverviewRow, type OverviewPanel, type OverviewRow, type RankedPeriodStat } from '@/app/climate/_shared/overview-grid-types';
import ClimateMapCard, { type CountryAnomalyRow } from '../global/ClimateMapCard';

// ─── Server-side data loaders ───────────────────────────────────────────────

const DATA_ROOT = path.join(process.cwd(), 'public', 'data', 'climate');

async function readJson<T>(rel: string): Promise<T | null> {
  try {
    const txt = await fs.readFile(path.join(DATA_ROOT, rel), 'utf-8');
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

interface ContinentMonthly { year: number; month: number; nativeAnomaly?: number | null; anomaly?: number | null }
interface ContinentRow {
  key: string;
  label: string;
  sourceUrl?: string | null;
  nativeBaseline?: string | null;
  comparisonBaseline?: string | null;
  latestMonth?: { year: number; month: number; anomaly: number };
  rank?: number;
  total?: number;
  anomaly1m?: number | null;
  anomaly3m?: number | null;
  anomaly12m?: number | null;
  label1m?: string | null;
  label12m?: string | null;
  nativeAnomaly1m?: number | null;
  nativeAnomaly3m?: number | null;
  nativeAnomaly12m?: number | null;
  monthly?: ContinentMonthly[];
  aggregate?: boolean;
  members?: string[];
  memberCount?: number;
  note?: string | null;
}
interface GlobalHistory {
  continentStats: ContinentRow[];
  aggregatedContinents: ContinentRow[];
  noaaStats?: {
    landOcean?: {
      yearly?: { year: number; avgTemp?: number; rollingAvg?: number }[];
      latestMonthStats?: RankedPeriodStat;
      latestThreeMonthStats?: RankedPeriodStat;
    };
  };
}

interface UsRegionParam {
  label: string;
  units: string;
  yearly: { year: number; value: number }[];
  monthlyComparison: { monthLabel: string; month: number; year: number; recent: number | null; historicAvg: number | null; diff: number | null }[];
  monthlyAll: { year: number; month: number; value: number }[];
  latestMonthStats?: { label: string; value: number; diff: number | null; rank: number; total: number; recordLabel: string; recordValue: number };
  latestThreeMonthStats?: { label: string; value: number; diff: number | null; rank: number; total: number; recordLabel: string; recordValue: number };
  nativeStats?: { latestMonth?: { value: number; nativeAnomaly: number; label: string }; latestThreeMonth?: { value: number; nativeAnomaly: number; label: string }; baseline?: string } | null;
}
interface UsRegionData {
  region: string;
  id: string;
  noaaCode: number;
  sourceUrl: string;
  paramData: { tavg: UsRegionParam; pcp: UsRegionParam };
  lastUpdated: string;
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtSigned(v: number | null | undefined, digits = 2, units = '°C'): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)} ${units}`;
}

function isoToCountryRegion(iso3: string): ClimateRegion | undefined {
  const slug = getProfileSlugForLocation('', iso3) ?? undefined;
  if (!slug) return undefined;
  return CLIMATE_REGIONS.find((r) => r.slug === slug);
}

function isoToCountryName(iso3: string): string {
  const loc = ALL_LOCATIONS.find((l) => l.type === 'country' && l.owidCode === iso3);
  return loc?.name ?? iso3;
}

// Build yearly + latestMonthStats + latestThreeMonthStats from a monthlyAll
// series of absolute monthly mean temperatures (°C). Mirrors the shape produced
// by the US-state / US-region snapshot builders so the result can be fed into
// the shared OverviewGrid via buildOverviewRow().
function buildClimatologyStats(monthlyAll: { year: number; month: number; value: number }[]): {
  yearly: { year: number; value: number }[];
  latestMonthStats: RankedPeriodStat;
  latestThreeMonthStats: RankedPeriodStat | null;
} | null {
  if (!monthlyAll?.length) return null;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const sorted = [...monthlyAll].sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
  const latest = sorted[sorted.length - 1];

  // Yearly mean (only complete years, except include the in-progress latest year if it has ≥1 month)
  const byYear = new Map<number, number[]>();
  for (const p of sorted) {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year)!.push(p.value);
  }
  const yearly = Array.from(byYear.entries())
    .filter(([y, arr]) => y === latest.year || arr.length === 12)
    .map(([y, arr]) => ({ year: y, value: arr.reduce((s, v) => s + v, 0) / arr.length }))
    .sort((a, b) => a.year - b.year);

  // Latest month stats — rank within same calendar month across all years
  const sameMonth = sorted.filter((p) => p.month === latest.month);
  const baseline = sameMonth.filter((p) => p.year >= 1961 && p.year <= 1990).map((p) => p.value);
  const baseAvg = baseline.length ? baseline.reduce((s, v) => s + v, 0) / baseline.length : null;
  const sortedSame = [...sameMonth].sort((a, b) => b.value - a.value);
  const rank = sortedSame.findIndex((p) => p.year === latest.year) + 1;
  const record = sortedSame[0];
  const latestMonthStats: RankedPeriodStat = {
    label: `${months[latest.month - 1]} ${latest.year}`,
    value: latest.value,
    diff: baseAvg == null ? null : latest.value - baseAvg,
    rank,
    total: sameMonth.length,
    recordLabel: `${months[record.month - 1]} ${record.year}`,
    recordValue: record.value,
  };

  // 3-month rolling means ending at each month, then rank by ending month-of-year
  const ymKey = (y: number, m: number) => y * 12 + m;
  const valByKey = new Map<number, number>();
  for (const p of sorted) valByKey.set(ymKey(p.year, p.month), p.value);
  const rolling: { year: number; month: number; value: number }[] = [];
  for (const p of sorted) {
    const k = ymKey(p.year, p.month);
    const v0 = valByKey.get(k - 2);
    const v1 = valByKey.get(k - 1);
    const v2 = p.value;
    if (v0 != null && v1 != null) rolling.push({ year: p.year, month: p.month, value: (v0 + v1 + v2) / 3 });
  }

  let latestThreeMonthStats: RankedPeriodStat | null = null;
  const latestRoll = rolling.find((p) => p.year === latest.year && p.month === latest.month);
  if (latestRoll) {
    const sameEnd = rolling.filter((p) => p.month === latest.month);
    const base3 = sameEnd.filter((p) => p.year >= 1961 && p.year <= 1990).map((p) => p.value);
    const base3Avg = base3.length ? base3.reduce((s, v) => s + v, 0) / base3.length : null;
    const sortedEnd = [...sameEnd].sort((a, b) => b.value - a.value);
    const rank3 = sortedEnd.findIndex((p) => p.year === latest.year) + 1;
    const rec3 = sortedEnd[0];
    const startMonth = (m: number) => { let sm = m - 2; if (sm <= 0) sm += 12; return sm; };
    const sm = startMonth(latest.month);
    const recSm = startMonth(rec3.month);
    latestThreeMonthStats = {
      label: `${months[sm - 1]}–${months[latest.month - 1]} ${latest.year}`,
      value: latestRoll.value,
      diff: base3Avg == null ? null : latestRoll.value - base3Avg,
      rank: rank3,
      total: sameEnd.length,
      recordLabel: `${months[recSm - 1]}–${months[rec3.month - 1]} ${rec3.year}`,
      recordValue: rec3.value,
    };
  }

  return { yearly, latestMonthStats, latestThreeMonthStats };
}

// ─── Section / card primitives (match other climate pages) ──────────────────

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <span className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1">{icon}</span>
        <span className="min-w-0 flex-1">{title}</span>
      </h2>
      {children}
    </section>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold text-[#FFF5E7]">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-gray-500">{sub}</div> : null}
    </div>
  );
}

// Three-column "snapshot" table mirroring the country update page layout:
// 1-month / 3-month / 12-month windows with the comparison anomaly,
// optionally a source-native row, and a footnote.
interface SnapshotCol { window: string; period: string; anomaly: number | null | undefined; nativeAnomaly?: number | null; }
function SnapshotTable({ columns, comparisonBaseline = '1961–1990', nativeBaseline, footnote }: {
  columns: SnapshotCol[];
  comparisonBaseline?: string;
  nativeBaseline?: string | null;
  footnote?: React.ReactNode;
}) {
  const showNative = columns.some((c) => c.nativeAnomaly != null && Number.isFinite(c.nativeAnomaly as number));
  const gridStyle = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` };
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 overflow-hidden">
      <div className="grid border-b border-gray-600/40" style={gridStyle}>
        {columns.map((c) => (
          <div key={c.window} className="px-2 py-2 text-center border-r border-gray-700/40 last:border-r-0">
            <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-gray-300">{c.window}</div>
            <div className="text-[10px] md:text-[11px] text-gray-500 font-mono">{c.period || '—'}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={gridStyle}>
        {columns.map((c) => (
          <div key={`v-${c.window}`} className="px-2 py-3 text-center border-r border-gray-700/40 last:border-r-0">
            <div className="font-mono text-lg md:text-xl font-bold text-[#FFF5E7]">{fmtSigned(c.anomaly)}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">vs {comparisonBaseline}</div>
          </div>
        ))}
      </div>
      {showNative && (
        <div className="grid border-t border-gray-600/40 bg-gray-900/40" style={gridStyle}>
          {columns.map((c) => (
            <div key={`n-${c.window}`} className="px-2 py-2 text-center border-r border-gray-700/40 last:border-r-0">
              <div className="font-mono text-sm font-semibold text-gray-200">{fmtSigned(c.nativeAnomaly)}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">vs {nativeBaseline ?? '1901–2000'}</div>
            </div>
          ))}
        </div>
      )}
      {footnote ? (
        <div className="border-t border-gray-700/40 bg-gray-900/30 px-3 py-2 text-[11px] text-gray-400">
          {footnote}
        </div>
      ) : null}
    </div>
  );
}

// ─── Member rankings panel ─────────────────────────────────────────────────

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  emoji?: string;
  apiCode?: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
}

interface RankingsResponse { rows: RankingRow[] }

const CONTINENT_KEY_TO_NAME: Record<string, string> = {
  africa: 'Africa', asia: 'Asia', europe: 'Europe', oceania: 'Oceania',
  northAmerica: 'North America', southAmerica: 'South America',
};

async function loadMembersForRegion(region: ClimateRegion): Promise<RankingRow[]> {
  const rk = await readJson<RankingsResponse>('rankings.json');
  if (!rk?.rows?.length) return [];

  if (region.groupKind === 'continent') {
    const targetContinent = CONTINENT_KEY_TO_NAME[region.groupKey ?? ''];
    if (!targetContinent) return [];
    // Build slug→ISO3 lookup from CLIMATE_REGIONS
    const slugToIso = new Map<string, string>();
    for (const r of CLIMATE_REGIONS) {
      if (r.type === 'country') slugToIso.set(r.slug, r.apiCode);
    }
    return rk.rows.filter((row) => {
      if (row.type !== 'country') return false;
      const iso = slugToIso.get(row.slug);
      if (!iso) return false;
      return CONTINENT_BY_ISO[iso] === targetContinent;
    });
  }

  if (region.groupKind === 'us-climate-region') {
    const memberSlugs = new Set(region.memberSlugs ?? []);
    return rk.rows.filter((row) => row.type === 'us-state' && memberSlugs.has(row.slug));
  }

  return [];
}

function MemberRankingsCard({ members, regionName }: { members: RankingRow[]; regionName: string }) {
  const valid = members.filter((m) => typeof m.anomaly1m === 'number');
  if (valid.length < 2) return null;
  const sorted = [...valid].sort((a, b) => (b.anomaly1m as number) - (a.anomaly1m as number));
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();
  const slugForMember = (m: RankingRow): string => m.slug;
  return (
    <Card icon={<BarChart3 className="h-5 w-5" />} title={`Hottest & Coolest in ${regionName} this Month`}>
      <p className="text-sm text-gray-400 mb-3">
        1-month anomaly vs 1961–1990 across the {valid.length} {regionName === 'United States' ? 'states' : 'members'} we cover. Click a name to open its profile.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-red-300 font-semibold mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Warmest
          </p>
          <ol className="space-y-1 text-sm">
            {top.map((m, i) => (
              <li key={m.slug} className="flex items-center gap-2">
                <span className="w-5 text-right font-mono text-gray-500">{i + 1}.</span>
                {m.emoji && <span>{m.emoji}</span>}
                <Link href={`/climate/${slugForMember(m)}`} className="flex-1 text-white hover:text-[#E8C97A] transition-colors">{m.name}</Link>
                <span className="font-mono text-red-300">{(m.anomaly1m as number) > 0 ? '+' : ''}{(m.anomaly1m as number).toFixed(2)}°C</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-sky-900/40 bg-sky-950/10 p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-sky-300 font-semibold mb-2">
            <TrendingDown className="h-3.5 w-3.5" /> Coolest
          </p>
          <ol className="space-y-1 text-sm">
            {bottom.map((m, i) => (
              <li key={m.slug} className="flex items-center gap-2">
                <span className="w-5 text-right font-mono text-gray-500">{i + 1}.</span>
                {m.emoji && <span>{m.emoji}</span>}
                <Link href={`/climate/${slugForMember(m)}`} className="flex-1 text-white hover:text-[#E8C97A] transition-colors">{m.name}</Link>
                <span className="font-mono text-sky-300">{(m.anomaly1m as number) > 0 ? '+' : ''}{(m.anomaly1m as number).toFixed(2)}°C</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}

// ─── Related links ─────────────────────────────────────────────────────────

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

function ExploreCard() {
  return (
    <Card icon={<BookOpen className="h-5 w-5" />} title="Explore Climate Data">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <RelatedLink href="/climate/shifting-seasons" label="Shifting Seasons" desc="How the timing of the seasons is moving worldwide" />
        <RelatedLink href="/climate/enso" label="El Niño / La Niña" desc="Live ENSO state, weekly Niño 3.4 SST and NOAA forecast" />
        <RelatedLink href="/climate/rankings" label="Climate Rankings" desc="League table of anomalies across 144 regions" />
        <RelatedLink href="/climate-dashboard" label="Climate Dashboard" desc="Headline global climate indicators in one view" />
        <RelatedLink href="/emissions" label="CO₂ Emissions" desc="Global and per-country emissions" />
        <RelatedLink href="/extreme-weather" label="Extreme Weather" desc="Live disaster and weather alerts" />
        <RelatedLink href="/climate-explained" label="Climate Explained" desc="ENSO, greenhouse effect, glossary" />
      </div>
    </Card>
  );
}

// ─── Continent renderer ────────────────────────────────────────────────────

async function ContinentBody({ region }: { region: ClimateRegion }) {
  const [history, members, absolutes] = await Promise.all([
    readJson<GlobalHistory>('global-history.json'),
    loadMembersForRegion(region),
    readJson<{ monthlyAll: { year: number; month: number; value: number }[] }>(`continent-absolutes/${region.slug}.json`),
  ]);
  if (!history) {
    return <Card icon={<AlertTriangle className="h-5 w-5" />} title="Data unavailable">
      <p className="text-sm text-gray-400">Global continent dataset could not be loaded.</p>
    </Card>;
  }

  const all = [...(history.continentStats ?? []), ...(history.aggregatedContinents ?? [])];
  const row = all.find((r) => r.key === region.groupKey);
  if (!row) {
    return <Card icon={<AlertTriangle className="h-5 w-5" />} title="Continent not found">
      <p className="text-sm text-gray-400">No data row for <code>{region.groupKey}</code> in global-history.json.</p>
    </Card>;
  }

  const isAgg = !!row.aggregate;
  const sourceLabel = isAgg
    ? '4BYO aggregate (NOAA does not publish a standalone continental land series for this region)'
    : 'NOAA Climate at a Glance — continental land temperature';

  // Build the 1m / 3m / 12m window labels for the snapshot table.
  const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const lm = row.latestMonth;
  const window1Period = row.label1m ?? (lm ? `${monthShort[lm.month - 1]} ${lm.year}` : '');
  const window3Period = lm
    ? (() => {
        // 3-month rolling ending at latest month → start = month-2
        let sm = lm.month - 2; let sy = lm.year;
        if (sm <= 0) { sm += 12; sy -= 1; }
        if (sy === lm.year) return `${monthShort[sm - 1]}–${monthShort[lm.month - 1]} ${lm.year}`;
        return `${monthShort[sm - 1]} ${sy}–${monthShort[lm.month - 1]} ${lm.year}`;
      })()
    : '';
  const window12Period = row.label12m ?? (lm ? (() => {
    let sm = lm.month + 1; let sy = lm.year - 1;
    if (sm > 12) { sm -= 12; sy += 1; }
    return `${monthShort[sm - 1]} ${sy}–${monthShort[lm.month - 1]} ${lm.year}`;
  })() : '');

  return (
    <>
      {/* At a Glance — climate map preview (continent groups use the global preset). */}
      <ClimateMapCard
        countryAnomalies={[] as CountryAnomalyRow[]}
        preset="global"
        share={{ pageUrl: `https://4billionyearson.org/climate/${region.slug}`, sectionId: 'climate-map' }}
      />

      {/* Temperature – Average panel (matches country / US-region update pages).
         Uses 4BYO continent-absolutes (CRU TS aggregate) so we get absolute °C +
         rank-within-record stats; falls back to the anomaly-only snapshot when
         the absolute series is unavailable (e.g. for some 4BYO aggregates). */}
      {(() => {
        const continentStats = absolutes?.monthlyAll?.length ? buildClimatologyStats(absolutes.monthlyAll) : null;
        const globalLandOcean = history.noaaStats?.landOcean;
        const continentOverviewRow = continentStats
          ? buildOverviewRow(region.name, continentStats.yearly, continentStats.latestMonthStats, continentStats.latestThreeMonthStats ?? undefined, '°C', 1, false, true)
          : null;
        const globalOverviewRow = globalLandOcean
          ? (() => {
              const r = buildOverviewRow('Global', globalLandOcean.yearly, globalLandOcean.latestMonthStats, globalLandOcean.latestThreeMonthStats, '°C', 1);
              return r ? { ...r, sublabel: 'Land + Ocean' } : null;
            })()
          : null;
        const tempRows: OverviewRow[] = [continentOverviewRow, globalOverviewRow].filter((r): r is OverviewRow => Boolean(r));

        if (tempRows.length >= 1 && continentOverviewRow) {
          const tempPanel: OverviewPanel = {
            title: 'Temperature – Average',
            icon: <Thermometer className="text-orange-400" />,
            accentClass: 'bg-orange-600',
            accentBg: 'bg-orange-600/50',
            accentBorder: 'border-orange-400/80',
            sections: [{ rows: tempRows }],
          };
          return <OverviewGrid panels={[tempPanel]} />;
        }

        // Fallback: anomaly-only 1m / 3m / 12m snapshot (legacy layout).
        return (
          <Card icon={<Thermometer className="h-5 w-5 text-orange-400" />} title="Temperature – Average">
            <SnapshotTable
              columns={[
                { window: '1-Month', period: window1Period, anomaly: row.anomaly1m, nativeAnomaly: row.nativeAnomaly1m },
                { window: '3-Month', period: window3Period, anomaly: row.anomaly3m, nativeAnomaly: row.nativeAnomaly3m },
                { window: '12-Month', period: window12Period, anomaly: row.anomaly12m, nativeAnomaly: row.nativeAnomaly12m },
              ]}
              nativeBaseline={row.nativeBaseline}
              footnote={isAgg ? (
                <span className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>{row.note ?? 'NOAA does not publish a standalone continental land series; values aggregate the country anomalies in our coverage.'}</span>
                </span>
              ) : null}
            />
          </Card>
        );
      })()}

      {/* Spaghetti chart + seasonal-shift cards (member-country aggregate absolutes) */}
      {absolutes?.monthlyAll?.length ? (
        <>
          <MonthlySpaghettiCard
            series={{ temp: absolutes.monthlyAll }}
            regionName={region.name}
            dataSource={`4BYO continent aggregate · equal-weight mean of ${row.memberCount ?? 'member'} country monthly absolute temperatures (OWID/CRU TS).`}
            embedSlug={region.slug}
            share={{ pageUrl: `https://4billionyearson.org/climate/${region.slug}`, sectionId: 'monthly-history' }}
          />
          <SeasonalShiftCard monthlyAll={absolutes.monthlyAll} regionName={region.name} dataSource="4BYO continent aggregate · OWID/CRU TS country monthly temperatures." />
        </>
      ) : null}

      {/* Emissions + energy mix (OWID continent aggregates) */}
      {region.groupKind === 'continent' && CONTINENT_KEY_TO_NAME[region.groupKey ?? ''] && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmissionsCard
            continentName={CONTINENT_KEY_TO_NAME[region.groupKey ?? '']}
            deepLinkHref="/emissions"
          />
          <EnergyMixCard
            countryName={CONTINENT_KEY_TO_NAME[region.groupKey ?? '']}
            deepLinkHref="/energy-rankings"
          />
        </div>
      )}

      {/* Members */}
      {isAgg && row.members && row.members.length > 0 && (
        <Card icon={<MapPin className="h-5 w-5" />} title={`Member countries (${row.members.length})`}>
          <p className="text-sm text-gray-400 mb-3">
            These are the country snapshots aggregated into the {region.name} series.
          </p>
          <div className="flex flex-wrap gap-2">
            {row.members.map((iso) => {
              const member = isoToCountryRegion(iso);
              const name = isoToCountryName(iso);
              if (!member) {
                return (
                  <span key={iso} className="rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1 text-xs text-gray-400">
                    {name}
                  </span>
                );
              }
              return (
                <Link
                  key={iso}
                  href={`/climate/${member.slug}`}
                  className="rounded-full border border-[#D0A65E]/40 bg-gray-900/60 px-3 py-1 text-xs text-[#FFF5E7] hover:border-[#D0A65E] hover:bg-gray-900"
                >
                  {member.emoji} {name}
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {!isAgg && (
        <Card icon={<MapPin className="h-5 w-5" />} title="Explore Countries on this Continent">
          <p className="text-sm text-gray-400 mb-3">
            This page shows the NOAA continental series. To browse country-level pages within {region.name}, use the
            countries tab on the Climate Updates hub and filter by continent.
          </p>
          <Link
            href="/climate#countries"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D0A65E]/55 bg-[#D0A65E]/10 px-3 py-1.5 text-xs font-medium text-[#FFF5E7] hover:bg-[#D0A65E]/20"
          >
            Open Climate Updates → Countries
          </Link>
        </Card>
      )}

      {/* Hottest / coolest member countries this month */}
      <MemberRankingsCard members={members} regionName={region.name} />

      {/* Sources */}
      <Card icon={<FileText className="h-5 w-5" />} title="Data Sources">
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <Layers className="h-4 w-4 shrink-0 text-[#D0A65E] mt-0.5" />
            <span>
              <strong className="text-white">{sourceLabel}</strong>
              {row.sourceUrl ? (
                <>
                  {' · '}
                  <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#E8C97A] hover:underline inline-flex items-center gap-1">
                    Open at NOAA <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              ) : null}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Scale className="h-4 w-4 shrink-0 text-[#D0A65E] mt-0.5" />
            <span>
              <strong className="text-white">Two-baseline model</strong> — comparison baseline 1961–1990; native baseline {row.nativeBaseline ?? (isAgg ? 'n/a (aggregate)' : '1901–2000')}.
              {' '}
              <Link href="/climate/methodology" className="text-[#E8C97A] hover:underline">Methodology →</Link>
            </span>
          </li>
        </ul>
      </Card>
    </>
  );
}

// ─── US climate region renderer ────────────────────────────────────────────

async function UsClimateRegionBody({ region }: { region: ClimateRegion }) {
  const [data, usNational, members, history] = await Promise.all([
    readJson<UsRegionData>(`us-climate-region/${region.slug}.json`),
    readJson<UsRegionData>('us-national.json'),
    loadMembersForRegion(region),
    readJson<GlobalHistory>('global-history.json'),
  ]);
  if (!data) {
    return <Card icon={<AlertTriangle className="h-5 w-5" />} title="Data unavailable">
      <p className="text-sm text-gray-400">Region snapshot for <code>{region.slug}</code> could not be loaded.</p>
    </Card>;
  }

  const tavg = data.paramData.tavg;
  const pcp = data.paramData.pcp;
  const usTavg = usNational?.paramData.tavg;
  const usPcp = usNational?.paramData.pcp;
  const globalLandOcean = history?.noaaStats?.landOcean;

  // ── Build OverviewGrid panels (same shape as country / global pages) ──
  const tempRows = [
    buildOverviewRow(region.name, tavg.yearly, tavg.latestMonthStats, tavg.latestThreeMonthStats, '°C', 1, false, true),
    usTavg ? buildOverviewRow('United States', usTavg.yearly, usTavg.latestMonthStats, usTavg.latestThreeMonthStats, '°C', 1) : null,
    globalLandOcean ? (() => {
      const r = buildOverviewRow('Global', globalLandOcean.yearly, globalLandOcean.latestMonthStats, globalLandOcean.latestThreeMonthStats, '°C', 1);
      return r ? { ...r, sublabel: 'Land + Ocean' } : null;
    })() : null,
  ].filter((r): r is OverviewRow => Boolean(r));
  const tempPanel: OverviewPanel | null = tempRows.length ? {
    title: 'Temperature – Average',
    icon: <Thermometer className="text-orange-400" />,
    accentClass: 'bg-orange-600',
    accentBg: 'bg-orange-600/50',
    accentBorder: 'border-orange-400/80',
    sections: [{ rows: tempRows }],
  } : null;

  const rainRows = [
    pcp ? buildOverviewRow(region.name, pcp.yearly, pcp.latestMonthStats, pcp.latestThreeMonthStats, ' mm', 0, false, true) : null,
    usPcp ? buildOverviewRow('United States', usPcp.yearly, usPcp.latestMonthStats, usPcp.latestThreeMonthStats, ' mm', 0) : null,
  ].filter((r): r is OverviewRow => Boolean(r));
  const rainPanel: OverviewPanel | null = rainRows.length ? {
    title: 'Rainfall & Rain Days – Totals',
    icon: <CloudRain className="text-blue-400" />,
    accentClass: 'bg-blue-600',
    accentBg: 'bg-blue-950/50',
    accentBorder: 'border-blue-400/80',
    sections: [{ title: 'Rainfall / Precipitation', rows: rainRows }],
  } : null;

  return (
    <>
      {/* At a Glance — US states / climate-regions map. */}
      <ClimateMapCard
        countryAnomalies={[] as CountryAnomalyRow[]}
        preset="usa"
        share={{ pageUrl: `https://4billionyearson.org/climate/${region.slug}`, sectionId: 'climate-map' }}
      />

      {/* Temperature – Average (region + US national rows) */}
      {tempPanel ? <OverviewGrid panels={[tempPanel]} /> : null}

      {/* Spaghetti chart + seasonal-shift card (NOAA regional tavg monthlyAll) */}
      {tavg.monthlyAll?.length ? (
        <>
          <MonthlySpaghettiCard
            series={{ temp: tavg.monthlyAll, precip: pcp?.monthlyAll }}
            regionName={region.name}
            dataSource="NOAA Climate at a Glance — regional tavg / pcp (monthly absolutes)."
            embedSlug={region.slug}
            share={{ pageUrl: `https://4billionyearson.org/climate/${region.slug}`, sectionId: 'monthly-history' }}
          />
          <SeasonalShiftCard
            monthlyAll={tavg.monthlyAll}
            regionName={region.name}
            dataSource="NOAA Climate at a Glance — regional tavg."
          />
        </>
      ) : null}

      {/* Rainfall – Totals (region + US national rows) */}
      {rainPanel ? <OverviewGrid panels={[rainPanel]} /> : null}

      {/* Member states */}
      {region.memberSlugs && region.memberSlugs.length > 0 && (
        <Card icon={<MapPin className="h-5 w-5" />} title={`Member States (${region.memberSlugs.length})`}>
          <div className="flex flex-wrap gap-2">
            {region.memberSlugs.map((slug) => {
              const member = CLIMATE_REGIONS.find((r) => r.slug === slug);
              if (!member) {
                return (
                  <span key={slug} className="rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1 text-xs text-gray-400">
                    {slug}
                  </span>
                );
              }
              return (
                <Link
                  key={slug}
                  href={`/climate/${slug}`}
                  className="rounded-full border border-[#D0A65E]/40 bg-gray-900/60 px-3 py-1 text-xs text-[#FFF5E7] hover:border-[#D0A65E] hover:bg-gray-900"
                >
                  {member.emoji} {member.name}
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Hottest / coolest member states this month */}
      <MemberRankingsCard members={members} regionName={region.name} />

      {/* Aggregate fossil-fuel CO₂ emissions across the region's member states */}
      <EmissionsCard
        usClimateRegionSlug={region.slug}
        usClimateRegionName={region.name}
      />

      {/* Sources */}
      <Card icon={<FileText className="h-5 w-5" />} title="Data Sources">
        <ul className="space-y-1.5 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <Layers className="h-4 w-4 shrink-0 text-[#D0A65E] mt-0.5" />
            <span>
              <strong className="text-white">NOAA Climate at a Glance — Regional time series</strong> · NOAA code {data.noaaCode}
              {' · '}
              <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#E8C97A] hover:underline inline-flex items-center gap-1">
                Open at NOAA <ExternalLink className="h-3 w-3" />
              </a>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Scale className="h-4 w-4 shrink-0 text-[#D0A65E] mt-0.5" />
            <span>
              <strong className="text-white">Two-baseline model</strong> — comparison baseline 1961–1990; native baseline 1901–2000.
              {' '}
              <Link href="/climate/methodology" className="text-[#E8C97A] hover:underline">Methodology →</Link>
            </span>
          </li>
        </ul>
      </Card>
    </>
  );
}

// ─── Public component ──────────────────────────────────────────────────────

export default async function ClimateGroupProfile({ region }: { region: ClimateRegion }) {
  const isContinent = region.groupKind === 'continent';

  // Title parity with country / global pages: "<Region> Climate – <Month Year> Update"
  // with dynamic font sizing so longer names (e.g. "US Northeast Climate – April 2026 Update") still fit.
  const updateLabel = getClimateUpdateDateLabel();
  const combinedTitle = `${region.name} Climate – ${updateLabel} Update`;
  const h1SizeClass =
    combinedTitle.length > 38 ? 'text-xl md:text-2xl' :
    combinedTitle.length > 28 ? 'text-2xl md:text-3xl' :
    combinedTitle.length > 20 ? 'text-2xl md:text-4xl' :
    'text-3xl md:text-5xl';

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

        {/* Hero */}
        <div
          className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden"
          style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
        >
          <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
            <h1
              className={`${h1SizeClass} font-bold font-mono tracking-wide leading-tight`}
              style={{ color: '#FFF5E7' }}
            >
              {combinedTitle}
            </h1>
          </div>
          <div className="bg-gray-950/90 backdrop-blur-md px-4 pt-0 pb-3 md:px-6 md:pb-4">
            {region.isAggregate ? (
              <p className="mb-3 text-xs text-amber-200/80 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  This is a 4BYO aggregate. NOAA does not publish a standalone continental land series for {region.name},
                  so we average country anomalies in our coverage. See{' '}
                  <Link href="/climate/methodology" className="text-[#E8C97A] hover:underline">methodology</Link>.
                </span>
              </p>
            ) : null}
            <div className="mb-3">
              <ClimateRankPill slug={region.slug} />
            </div>
            <GroupSummaryPanel slug={region.slug} regionName={region.name} />
          </div>
        </div>

        {/* Body */}
        {isContinent ? <ContinentBody region={region} /> : <UsClimateRegionBody region={region} />}

        {/* Explore */}
        <ExploreCard />
        </div>
      </div>
    </main>
  );
}
