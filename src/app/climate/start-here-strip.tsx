"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, TrendingUp, ChevronRight, Loader2, AlertCircle, MapPin } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import { EDITORS_PICKS } from '@/lib/climate/editorial';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'picks' | 'shift';
type Window = '1m' | '3m' | '12m';

interface RankingRow {
  slug: string;
  name: string;
  type: ClimateRegion['type'];
  emoji: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
  dataAsOf: string | null;
}

interface RankingsResponse {
  rows: RankingRow[];
  cacheMonth: string;
  generatedAt: string;
  count: number;
}

interface StartHereStripProps {
  regions: ClimateRegion[];
  title?: string;
  description?: string;
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const TAB_BASE = 'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors';
const TAB_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/10 text-[#FFF5E7]';
const TAB_INACTIVE = 'border-gray-800 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';

const SUB_TOGGLE_BASE = 'inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-medium transition-colors';
const SUB_TOGGLE_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#D0A65E]';
const SUB_TOGGLE_INACTIVE = 'border-gray-800 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAnomaly(diff: number | null): string {
  if (diff == null) return '—';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(2)}°C`;
}

function anomalyTone(diff: number | null): string {
  if (diff == null) return 'text-gray-500';
  if (diff >= 1.5) return 'text-red-300';
  if (diff >= 0.8) return 'text-orange-300';
  if (diff >= 0.2) return 'text-amber-300';
  if (diff <= -0.8) return 'text-sky-300';
  if (diff <= -0.2) return 'text-sky-200';
  return 'text-gray-300';
}

function monthLabel(asOf: string | null): string | null {
  if (!asOf) return null;
  const [yearStr, monthStr] = asOf.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return null;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month - 1]} ${year}`;
}

function TypeBadge({ type }: { type: ClimateRegion['type'] }) {
  const label = type === 'country' ? 'Country' : type === 'us-state' ? 'US State' : type === 'uk-region' ? 'UK Region' : 'Special';
  return (
    <span className="inline-flex items-center rounded-full border border-gray-800 bg-gray-900/60 px-2 py-0.5 text-[10px] font-medium text-gray-400">
      {label}
    </span>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PickCard({ region }: { region: ClimateRegion }) {
  return (
    <Link
      href={`/climate/${region.slug}`}
      className="group flex items-start gap-3 rounded-xl border border-gray-800/80 bg-gray-900/40 p-3 transition-all duration-200 hover:border-[#D0A65E]/40 hover:bg-white/[0.03]"
    >
      <span className="text-xl leading-none mt-0.5">{region.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-[#FFF5E7] truncate group-hover:text-white">{region.name}</h4>
          <TypeBadge type={region.type} />
        </div>
        <p className="text-[12px] text-gray-400 line-clamp-2">{region.tagline}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#D0A65E]/60 group-hover:text-[#D0A65E]" />
    </Link>
  );
}

function ShiftRow({ row, window, rank }: { row: RankingRow; window: Window; rank: number }) {
  const diff = window === '1m' ? row.anomaly1m : window === '3m' ? row.anomaly3m : row.anomaly12m;
  const tone = anomalyTone(diff);
  const asOf = monthLabel(row.dataAsOf);
  return (
    <Link
      href={`/climate/${row.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-gray-800/80 bg-gray-900/40 px-3 py-2.5 transition-colors hover:border-[#D0A65E]/40 hover:bg-white/[0.03]"
    >
      <span className="w-5 text-right text-[11px] font-mono tabular-nums text-gray-500">{rank}</span>
      <span className="text-lg leading-none">{row.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#FFF5E7] truncate group-hover:text-white">{row.name}</span>
          <TypeBadge type={row.type} />
        </div>
        {asOf ? (
          <p className="text-[11px] text-gray-500 mt-0.5">Data as of {asOf}</p>
        ) : null}
      </div>
      <span className={`font-mono tabular-nums text-sm font-semibold ${tone}`}>
        {formatAnomaly(diff)}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#D0A65E]/50 group-hover:text-[#D0A65E]" />
    </Link>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function StartHereStrip({ regions, title, description }: StartHereStripProps) {
  const [tab, setTab] = useState<Tab>('picks');
  const [windowSel, setWindowSel] = useState<Window>('3m');
  const [rankings, setRankings] = useState<RankingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load rankings the first time the Shift tab opens. A 55s client-side
  // abort stops the spinner hanging forever if the endpoint itself takes
  // longer than Vercel's 60s function cap on a cold cache.
  useEffect(() => {
    if (tab !== 'shift' || rankings || loading) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/climate/rankings', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: RankingsResponse) => {
        if (!cancelled) setRankings(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.name === 'AbortError'
          ? 'Rankings took too long to load. Please try again in a moment.'
          : err?.message || 'Unable to load rankings';
        setError(msg);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [tab, rankings, loading]);

  const pickedRegions = useMemo<ClimateRegion[]>(() => {
    const bySlug = new Map(regions.map((r) => [r.slug, r]));
    return EDITORS_PICKS
      .map((slug) => bySlug.get(slug))
      .filter((r): r is ClimateRegion => !!r);
  }, [regions]);

  const shiftRows = useMemo<RankingRow[]>(() => {
    if (!rankings?.rows?.length) return [];
    const metric = (row: RankingRow): number | null =>
      windowSel === '1m' ? row.anomaly1m : windowSel === '3m' ? row.anomaly3m : row.anomaly12m;
    return [...rankings.rows]
      .filter((row) => metric(row) != null)
      .sort((a, b) => Math.abs(metric(b)!) - Math.abs(metric(a)!))
      .slice(0, 10);
  }, [rankings, windowSel]);

  const rankingsAsOf = rankings?.cacheMonth ? monthLabel(`${rankings.cacheMonth}-01`) : null;

  return (
    <section
      className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
    >
      <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
        {title ? (
          <h1
            className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight"
            style={{ color: '#FFF5E7' }}
          >
            {title}
          </h1>
        ) : (
          <h2
            className="flex items-center gap-2 text-base md:text-lg font-bold font-mono tracking-wide leading-tight"
            style={{ color: '#FFF5E7' }}
          >
            <Sparkles className="h-5 w-5" />
            Start here
          </h2>
        )}
      </div>

      {description ? (
        <div className="bg-gray-950/90 backdrop-blur-md px-4 py-4 md:px-6 md:py-5 border-b border-gray-800/60">
          <p className="text-sm md:text-lg text-gray-300 leading-relaxed">{description}</p>
        </div>
      ) : null}

      <div className="bg-gray-950/90 backdrop-blur-md px-4 py-5 md:px-6 md:py-6 space-y-4">
        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('picks')}
            className={`${TAB_BASE} ${tab === 'picks' ? TAB_ACTIVE : TAB_INACTIVE}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Editor&apos;s picks
          </button>
          <button
            type="button"
            onClick={() => setTab('shift')}
            className={`${TAB_BASE} ${tab === 'shift' ? TAB_ACTIVE : TAB_INACTIVE}`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Biggest shift
          </button>
          {tab === 'shift' && rankingsAsOf ? (
            <span className="ml-auto text-[11px] text-gray-500">Across {rankings?.count ?? 0} regions</span>
          ) : (
            <span className="ml-auto text-[11px] text-gray-500">
              {tab === 'picks' ? 'Curated starting points' : ''}
            </span>
          )}
        </div>

        {tab === 'picks' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pickedRegions.map((region) => (
              <PickCard key={region.slug} region={region} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mr-1">
                Window
              </span>
              {([
                { key: '1m', label: '1 month' },
                { key: '3m', label: '3 months' },
                { key: '12m', label: '12 months' },
              ] as Array<{ key: Window; label: string }>).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setWindowSel(opt.key)}
                  className={`${SUB_TOGGLE_BASE} ${windowSel === opt.key ? SUB_TOGGLE_ACTIVE : SUB_TOGGLE_INACTIVE}`}
                >
                  {opt.label}
                </button>
              ))}
              <span className="text-[11px] text-gray-500 sm:ml-auto">
                Top 10 by anomaly vs 1961–1990 baseline
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading rankings…</span>
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-200">Couldn&apos;t load rankings</p>
                  <p className="text-[12px] text-red-300/70 mt-0.5">{error}</p>
                </div>
              </div>
            ) : shiftRows.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {shiftRows.map((row, index) => (
                  <ShiftRow key={row.slug} row={row} window={windowSel} rank={index + 1} />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3 text-gray-400">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">No ranking data available yet for this window.</span>
              </div>
            )}

            <p className="text-[11px] text-gray-500">
              Ranked across every country, US state and UK region we publish. Each row uses the region&apos;s most recent available data month, so sources may differ.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
