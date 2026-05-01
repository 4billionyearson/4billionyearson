"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';

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
  prevRank1m?: number | null;
  prevRank3m?: number | null;
  prevRank12m?: number | null;
}

type SortKey = 'anomaly1m' | 'anomaly3m' | 'anomaly12m' | 'name';
type TypeFilter = 'all' | 'country' | 'us-state' | 'uk-region' | 'group';

const TYPE_LABEL: Record<Exclude<TypeFilter, 'all' | 'group'>, string> = {
  'country': 'Country',
  'us-state': 'US State',
  'uk-region': 'UK Region',
};

const TYPE_LABEL_PLURAL: Record<Exclude<TypeFilter, 'all' | 'group'>, string> = {
  'country': 'Countries',
  'us-state': 'US States',
  'uk-region': 'UK Regions',
};

export interface GroupTableRow {
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

function tone(diff: number | null | undefined): string {
  if (diff == null) return 'text-gray-500';
  if (diff >= 1.5) return 'text-red-300';
  if (diff >= 0.8) return 'text-orange-300';
  if (diff >= 0.2) return 'text-amber-300';
  if (diff <= -0.8) return 'text-sky-300';
  if (diff <= -0.2) return 'text-sky-200';
  return 'text-gray-200';
}

function fmt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
}

export default function RankingsTable({ rows, generatedAt, groups }: { rows: RankingRow[]; generatedAt: string; groups?: GroupTableRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('anomaly1m');
  const [desc, setDesc] = useState(true);
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.type !== filter) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortKey === 'name') {
        return desc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return desc ? bv - av : av - bv;
    });
    return arr;
  }, [filtered, sortKey, desc]);

  // Global ranks across ALL rows (not filtered) per window for consistency
  const globalRanks = useMemo(() => {
    const ranksFor = (key: 'anomaly1m' | 'anomaly3m' | 'anomaly12m') => {
      const valid = rows.filter((r) => typeof r[key] === 'number');
      valid.sort((a, b) => (b[key] as number) - (a[key] as number));
      const map = new Map<string, number>();
      valid.forEach((r, i) => map.set(r.slug, i + 1));
      return map;
    };
    return {
      anomaly1m: ranksFor('anomaly1m'),
      anomaly3m: ranksFor('anomaly3m'),
      anomaly12m: ranksFor('anomaly12m'),
    };
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="inline h-3 w-3 opacity-50" />;
    return desc ? <ArrowDown className="inline h-3 w-3" /> : <ArrowUp className="inline h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>
        {(['all', 'country', 'us-state', 'uk-region', ...((groups && groups.length) ? ['group' as const] : [])] as TypeFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === t
                ? 'border-[#D0A65E] bg-[#D0A65E]/15 text-[#E8C97A]'
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
          >
            {t === 'all'
              ? `All (${rows.length})`
              : t === 'group'
                ? `Groups (${groups?.length ?? 0})`
                : `${TYPE_LABEL_PLURAL[t]} (${rows.filter((r) => r.type === t).length})`}
          </button>
        ))}
        <input
          type="search"
          placeholder="Search region…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-auto w-full sm:w-56 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:border-[#D0A65E] focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/60">
        {filter === 'group' ? (
          <GroupTable groups={groups ?? []} sortKey={sortKey} desc={desc} toggleSort={toggleSort} />
        ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-1.5 md:px-3 py-2 text-left font-semibold">#</th>
              <th className="px-1.5 md:px-3 py-2 text-left font-semibold">
                <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-white">
                  Region <SortIcon k="name" />
                </button>
              </th>
              <th className="hidden sm:table-cell px-3 py-2 text-left font-semibold">Type</th>
              <th className="px-1.5 md:px-3 py-2 text-right font-semibold">
                <button onClick={() => toggleSort('anomaly1m')} className="inline-flex items-center gap-1 hover:text-white">
                  1-mo <SortIcon k="anomaly1m" />
                </button>
              </th>
              <th className="px-1.5 md:px-3 py-2 text-right font-semibold">
                <button onClick={() => toggleSort('anomaly3m')} className="inline-flex items-center gap-1 hover:text-white">
                  3-mo <SortIcon k="anomaly3m" />
                </button>
              </th>
              <th className="px-1.5 md:px-3 py-2 text-right font-semibold">
                <button onClick={() => toggleSort('anomaly12m')} className="inline-flex items-center gap-1 hover:text-white">
                  12-mo <SortIcon k="anomaly12m" />
                </button>
              </th>
              <th className="hidden lg:table-cell px-3 py-2 text-left font-semibold">Latest</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => {
              const gRank = globalRanks[sortKey === 'name' ? 'anomaly1m' : sortKey].get(r.slug);
              return (
                <tr key={r.slug} className={`border-t border-gray-800 hover:bg-gray-900/60 ${idx % 2 === 0 ? 'bg-gray-950/40' : ''}`}>
                  <td className="px-1.5 md:px-3 py-2 text-gray-400 font-mono text-xs">{gRank ?? '—'}</td>
                  <td className="px-1.5 md:px-3 py-2">
                    <Link href={`/climate/${r.slug}`} className="inline-flex items-center gap-1.5 md:gap-2 font-semibold text-white hover:text-[#E8C97A] transition-colors">
                      <span className="hidden sm:inline text-base">{r.emoji || ''}</span>
                      <span>{r.name}</span>
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2 text-xs text-gray-400">{TYPE_LABEL[r.type]}</td>
                  <td className={`px-1.5 md:px-3 py-2 text-right font-mono ${tone(r.anomaly1m)}`}>{fmt(r.anomaly1m)}</td>
                  <td className={`px-1.5 md:px-3 py-2 text-right font-mono ${tone(r.anomaly3m)}`}>{fmt(r.anomaly3m)}</td>
                  <td className={`px-1.5 md:px-3 py-2 text-right font-mono ${tone(r.anomaly12m)}`}>{fmt(r.anomaly12m)}</td>
                  <td className="hidden lg:table-cell px-3 py-2 text-xs text-gray-400">{r.latestLabel ?? '—'}</td>
                </tr>
              );
            })}
            {!sorted.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No regions match.</td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>

      <p className="text-[11px] text-gray-500">
        All anomalies vs 1961–1990 baseline. {rows.length} regions total.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------
// Group table — shown when the "Groups" filter is selected. Lists NOAA
// continent and US-climate-region rollups side-by-side with both the
// 1961–1990 anomaly (used everywhere on the site) and the source-native
// (NOAA 1901–2000) verification anomaly where available.
// ----------------------------------------------------------------------

function GroupTable({
  groups,
  sortKey,
  desc,
  toggleSort,
}: {
  groups: GroupTableRow[];
  sortKey: SortKey;
  desc: boolean;
  toggleSort: (k: SortKey) => void;
}) {
  const sorted = useMemo(() => {
    const arr = [...groups];
    arr.sort((a, b) => {
      if (sortKey === 'name') {
        return desc ? b.label.localeCompare(a.label) : a.label.localeCompare(b.label);
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return desc ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
    return arr;
  }, [groups, sortKey, desc]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="inline h-3 w-3 opacity-50" />;
    return desc ? <ArrowDown className="inline h-3 w-3" /> : <ArrowUp className="inline h-3 w-3" />;
  };

  return (
    <table className="min-w-full text-sm">
      <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-400">
        <tr>
          <th className="px-1.5 md:px-3 py-2 text-left font-semibold">#</th>
          <th className="px-1.5 md:px-3 py-2 text-left font-semibold">
            <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-white">
              Group <SortIcon k="name" />
            </button>
          </th>
          <th className="hidden sm:table-cell px-3 py-2 text-left font-semibold">Kind</th>
          <th className="px-1.5 md:px-3 py-2 text-right font-semibold">
            <button onClick={() => toggleSort('anomaly1m')} className="inline-flex items-center gap-1 hover:text-white">
              1-mo <SortIcon k="anomaly1m" />
            </button>
          </th>
          <th className="px-1.5 md:px-3 py-2 text-right font-semibold">
            <button onClick={() => toggleSort('anomaly3m')} className="inline-flex items-center gap-1 hover:text-white">
              3-mo <SortIcon k="anomaly3m" />
            </button>
          </th>
          <th className="px-1.5 md:px-3 py-2 text-right font-semibold">
            <button onClick={() => toggleSort('anomaly12m')} className="inline-flex items-center gap-1 hover:text-white">
              12-mo <SortIcon k="anomaly12m" />
            </button>
          </th>
          <th className="hidden md:table-cell px-3 py-2 text-right font-semibold" title="NOAA-native (source baseline) verification anomaly">
            Native 1-mo
          </th>
          <th className="hidden lg:table-cell px-3 py-2 text-left font-semibold">Latest</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((g, idx) => (
          <tr key={g.key} className={`border-t border-gray-800 hover:bg-gray-900/60 ${idx % 2 === 0 ? 'bg-gray-950/40' : ''}`}>
            <td className="px-1.5 md:px-3 py-2 text-gray-400 font-mono text-xs">{idx + 1}</td>
            <td className="px-1.5 md:px-3 py-2">
              <span className="font-semibold text-white">{g.label}</span>
              {g.aggregate && (
                <span
                  className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-500"
                  title={g.note ?? '4BYO aggregate'}
                >
                  · agg
                </span>
              )}
            </td>
            <td className="hidden sm:table-cell px-3 py-2 text-xs text-gray-400">
              {g.kind === 'continent' ? 'Continent' : 'US Climate Region'}
            </td>
            <td className={`px-1.5 md:px-3 py-2 text-right font-mono ${tone(g.anomaly1m)}`}>{fmt(g.anomaly1m)}</td>
            <td className={`px-1.5 md:px-3 py-2 text-right font-mono ${tone(g.anomaly3m)}`}>{fmt(g.anomaly3m)}</td>
            <td className={`px-1.5 md:px-3 py-2 text-right font-mono ${tone(g.anomaly12m)}`}>{fmt(g.anomaly12m)}</td>
            <td
              className={`hidden md:table-cell px-3 py-2 text-right font-mono ${tone(g.nativeAnomaly1m)}`}
              title={g.nativeBaseline ? `vs ${g.nativeBaseline} (NOAA-native)` : undefined}
            >
              {fmt(g.nativeAnomaly1m)}
            </td>
            <td className="hidden lg:table-cell px-3 py-2 text-xs text-gray-400">{g.latestLabel ?? '—'}</td>
          </tr>
        ))}
        {!sorted.length && (
          <tr>
            <td colSpan={8} className="px-3 py-6 text-center text-gray-500">No groups available.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
