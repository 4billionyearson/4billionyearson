import { promises as fs } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { ArrowLeft, BarChart3, ExternalLink, MapPin, Layers, Scale, AlertTriangle, FileText } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import { CLIMATE_REGIONS, getProfileSlugForLocation } from '@/lib/climate/regions';
import { ALL_LOCATIONS } from '@/lib/climate/locations';
import GroupAnomalyChart, { type MonthlyPoint } from './GroupAnomalyChart';

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

function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Compute calendar-month climatology (mean per month) over a year range, returning `{1: mean, 2: mean, ...}`. */
function climatology(monthly: { year: number; month: number; value: number }[], startYear: number, endYear: number): Record<number, number> {
  const sums: Record<number, { s: number; n: number }> = {};
  for (const m of monthly) {
    if (m.year < startYear || m.year > endYear || m.value == null) continue;
    if (!sums[m.month]) sums[m.month] = { s: 0, n: 0 };
    sums[m.month].s += m.value;
    sums[m.month].n += 1;
  }
  const out: Record<number, number> = {};
  for (const k of Object.keys(sums)) {
    const m = Number(k);
    if (sums[m].n > 0) out[m] = sums[m].s / sums[m].n;
  }
  return out;
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

// ─── Continent renderer ────────────────────────────────────────────────────

async function ContinentBody({ region }: { region: ClimateRegion }) {
  const history = await readJson<GlobalHistory>('global-history.json');
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

  // Build chart data — native series available for 4 NOAA continents.
  const monthly: MonthlyPoint[] = (row.monthly ?? []).map((m) => ({
    ym: ymKey(m.year, m.month),
    year: m.year,
    month: m.month,
    anomaly: m.anomaly ?? null,
    nativeAnomaly: m.nativeAnomaly ?? null,
  }));

  const isAgg = !!row.aggregate;
  const sourceLabel = isAgg
    ? '4BYO aggregate (NOAA does not publish a standalone continental land series for this region)'
    : 'NOAA Climate at a Glance — continental land temperature';

  return (
    <>
      {/* Latest stats */}
      <Card icon={<BarChart3 className="h-5 w-5" />} title="Latest temperature anomaly">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatTile
            label={`1-month (${row.label1m ?? '—'})`}
            value={fmtSigned(row.anomaly1m)}
            sub="vs 1961–1990"
          />
          <StatTile
            label="3-month rolling"
            value={fmtSigned(row.anomaly3m)}
            sub="vs 1961–1990"
          />
          <StatTile
            label={`12-month (${row.label12m ?? '—'})`}
            value={fmtSigned(row.anomaly12m)}
            sub="vs 1961–1990"
          />
          {!isAgg && (
            <StatTile
              label="1-month (native)"
              value={fmtSigned(row.nativeAnomaly1m)}
              sub={`vs ${row.nativeBaseline ?? '1901–2000'}`}
            />
          )}
        </div>
        {isAgg && (
          <p className="mt-3 text-xs text-amber-200/80 flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>
              {row.note ?? 'NOAA does not publish a standalone continental land series; values aggregate the country anomalies in our coverage.'}
            </span>
          </p>
        )}
      </Card>

      {/* Chart */}
      {monthly.length > 0 && (
        <Card icon={<BarChart3 className="h-5 w-5" />} title="Monthly temperature anomaly history">
          <p className="text-sm text-gray-400 mb-3 leading-relaxed">
            {isAgg
              ? '4BYO aggregate of country anomalies vs the 1961–1990 baseline.'
              : 'NOAA continental series. Gold line is rebased to the 1961–1990 comparison baseline; the lighter line shows the source-native 1901–2000 anomaly published by NOAA.'}
          </p>
          <GroupAnomalyChart data={monthly} showNative={!isAgg} />
        </Card>
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
        <Card icon={<MapPin className="h-5 w-5" />} title="Explore countries on this continent">
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

      {/* Sources */}
      <Card icon={<FileText className="h-5 w-5" />} title="Data source">
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
  const data = await readJson<UsRegionData>(`us-climate-region/${region.slug}.json`);
  if (!data) {
    return <Card icon={<AlertTriangle className="h-5 w-5" />} title="Data unavailable">
      <p className="text-sm text-gray-400">Region snapshot for <code>{region.slug}</code> could not be loaded.</p>
    </Card>;
  }

  const tavg = data.paramData.tavg;
  const pcp = data.paramData.pcp;

  // Build comparison-baseline (1961–1990) monthly anomaly series from monthlyAll.
  const climComparison = climatology(tavg.monthlyAll, 1961, 1990);
  const climNative = climatology(tavg.monthlyAll, 1901, 2000);
  const monthly: MonthlyPoint[] = tavg.monthlyAll
    .filter((m) => Number.isFinite(m.value))
    .map((m) => {
      const cBase = climComparison[m.month];
      const nBase = climNative[m.month];
      return {
        ym: ymKey(m.year, m.month),
        year: m.year,
        month: m.month,
        anomaly: cBase != null ? +(m.value - cBase).toFixed(3) : null,
        nativeAnomaly: nBase != null ? +(m.value - nBase).toFixed(3) : null,
      };
    });

  const latestComp = tavg.latestMonthStats;
  const latestComp3 = tavg.latestThreeMonthStats;
  const native1 = tavg.nativeStats?.latestMonth;
  const native3 = tavg.nativeStats?.latestThreeMonth;

  return (
    <>
      <Card icon={<BarChart3 className="h-5 w-5" />} title="Latest temperature anomaly">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {latestComp && (
            <StatTile
              label={`1-month (${latestComp.label})`}
              value={fmtSigned(latestComp.diff)}
              sub={`Rank ${latestComp.rank}/${latestComp.total} · vs 1961–1990`}
            />
          )}
          {latestComp3 && (
            <StatTile
              label={`3-month (${latestComp3.label})`}
              value={fmtSigned(latestComp3.diff)}
              sub={`Rank ${latestComp3.rank}/${latestComp3.total} · vs 1961–1990`}
            />
          )}
          {native1 && (
            <StatTile
              label={`1-month (native)`}
              value={fmtSigned(native1.nativeAnomaly)}
              sub={`vs ${tavg.nativeStats?.baseline ?? '1901–2000'}`}
            />
          )}
          {native3 && (
            <StatTile
              label={`3-month (native)`}
              value={fmtSigned(native3.nativeAnomaly)}
              sub={`vs ${tavg.nativeStats?.baseline ?? '1901–2000'}`}
            />
          )}
        </div>
      </Card>

      {/* Chart */}
      {monthly.length > 0 && (
        <Card icon={<BarChart3 className="h-5 w-5" />} title="Monthly temperature anomaly history">
          <p className="text-sm text-gray-400 mb-3 leading-relaxed">
            Computed from NOAA Climate at a Glance regional <code>tavg</code>. Gold line uses the 1961–1990 comparison baseline; the lighter line uses NOAA&apos;s 1901–2000 source-native baseline.
          </p>
          <GroupAnomalyChart data={monthly} />
        </Card>
      )}

      {/* Precipitation */}
      {pcp && pcp.latestMonthStats && (
        <Card icon={<BarChart3 className="h-5 w-5" />} title="Latest precipitation anomaly">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile
              label={`1-month (${pcp.latestMonthStats.label})`}
              value={fmtSigned(pcp.latestMonthStats.diff, 1, 'mm')}
              sub={`Rank ${pcp.latestMonthStats.rank}/${pcp.latestMonthStats.total} · vs 1961–1990`}
            />
            {pcp.latestThreeMonthStats && (
              <StatTile
                label={`3-month (${pcp.latestThreeMonthStats.label})`}
                value={fmtSigned(pcp.latestThreeMonthStats.diff, 1, 'mm')}
                sub={`Rank ${pcp.latestThreeMonthStats.rank}/${pcp.latestThreeMonthStats.total} · vs 1961–1990`}
              />
            )}
          </div>
        </Card>
      )}

      {/* Member states */}
      {region.memberSlugs && region.memberSlugs.length > 0 && (
        <Card icon={<MapPin className="h-5 w-5" />} title={`Member states (${region.memberSlugs.length})`}>
          <p className="text-sm text-gray-400 mb-3">
            States grouped under the NOAA {data.region} climate region (NOAA code {data.noaaCode}).
          </p>
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

      {/* Sources */}
      <Card icon={<FileText className="h-5 w-5" />} title="Data source">
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

  return (
    <main className="container mx-auto px-3 md:px-4 pt-2 pb-8 md:pt-4 md:pb-12 max-w-5xl font-sans text-gray-200">
      <nav className="mb-3 text-xs text-gray-400">
        <Link href="/climate" className="inline-flex items-center gap-1 hover:text-[#E8C97A]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Climate hub
        </Link>
      </nav>

      <div className="space-y-6">
        {/* Hero */}
        <div
          className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden"
          style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
        >
          <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
            <h1
              className="text-2xl md:text-4xl font-bold font-mono tracking-wide leading-tight flex items-center gap-3"
              style={{ color: '#FFF5E7' }}
            >
              <span className="text-3xl md:text-4xl shrink-0" aria-hidden>{region.emoji}</span>
              <span>{region.name} Climate Update</span>
            </h1>
          </div>
          <div className="bg-gray-950/90 backdrop-blur-md px-4 py-4 md:px-6 md:py-5">
            <p className="text-sm md:text-base text-gray-300 leading-relaxed">{region.tagline}</p>
            {region.isAggregate ? (
              <p className="mt-2 text-xs text-amber-200/80 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  This is a 4BYO aggregate. NOAA does not publish a standalone continental land series for {region.name},
                  so we average country anomalies in our coverage. See{' '}
                  <Link href="/climate/methodology" className="text-[#E8C97A] hover:underline">methodology</Link>.
                </span>
              </p>
            ) : null}
          </div>
        </div>

        {/* Body */}
        {isContinent ? <ContinentBody region={region} /> : <UsClimateRegionBody region={region} />}
      </div>
    </main>
  );
}
