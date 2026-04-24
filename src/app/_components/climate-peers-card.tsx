"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  emoji?: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
}

interface RankingsResponse {
  rows: RankingRow[];
}

function tone(diff: number | null | undefined): string {
  if (diff == null) return 'text-gray-500';
  if (diff >= 1.5) return 'text-red-300';
  if (diff >= 0.8) return 'text-orange-300';
  if (diff >= 0.2) return 'text-amber-300';
  if (diff <= -0.2) return 'text-sky-300';
  return 'text-gray-200';
}

function fmt(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}°C`;
}

export default function ClimatePeersCard({ slug }: { slug: string }) {
  const [rows, setRows] = useState<RankingRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/climate/rankings.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RankingsResponse | null) => {
        if (!cancelled && d?.rows) setRows(d.rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows?.length) return null;
  const me = rows.find((r) => r.slug === slug);
  if (!me) return null;

  // Use 12-month as the primary peer metric (most stable); fall back to 3m / 1m.
  const key: 'anomaly12m' | 'anomaly3m' | 'anomaly1m' =
    me.anomaly12m != null ? 'anomaly12m' : me.anomaly3m != null ? 'anomaly3m' : 'anomaly1m';
  const myVal = me[key];
  if (myVal == null) return null;

  const keyLabel =
    key === 'anomaly12m' ? '12-month' : key === 'anomaly3m' ? '3-month' : '1-month';

  const peers = rows
    .filter((r) => r.slug !== slug && typeof r[key] === 'number')
    .map((r) => ({ row: r, dist: Math.abs((r[key] as number) - myVal) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5);

  if (!peers.length) return null;

  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <Users className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
        <span className="min-w-0 flex-1">Climate Peers</span>
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        The five regions with the most similar {keyLabel} temperature anomaly right now ({fmt(myVal)}). Similar anomalies suggest comparable exposure to the recent climate regime - useful for benchmarking policy responses and impacts.
      </p>
      <div className="rounded-xl border border-gray-800 bg-gray-950/60 divide-y divide-gray-800">
        {peers.map(({ row, dist }) => (
          <Link
            key={row.slug}
            href={`/climate/${row.slug}`}
            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-900/60 transition-colors"
          >
            <span className="text-xl">{row.emoji || ''}</span>
            <span className="flex-1 text-sm font-semibold text-white">{row.name}</span>
            <span className={`font-mono text-sm ${tone(row[key])}`}>{fmt(row[key])}</span>
            <span className="hidden sm:inline font-mono text-[11px] text-gray-500 w-14 text-right">
              ±{dist.toFixed(2)}°C
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/climate/rankings"
        className="inline-block mt-3 text-xs font-semibold text-[#D0A65E] hover:text-[#E8C97A] transition-colors"
      >
        See the full league table →
      </Link>
    </section>
  );
}
