"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  emoji?: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
}

interface RankingsResponse {
  generatedAt: string;
  count: number;
  rows: RankingRow[];
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const TYPE_LABEL: Record<RankingRow['type'], string> = {
  'country': 'countries',
  'us-state': 'US states',
  'uk-region': 'UK regions',
};

export default function ClimateRankPill({ slug }: { slug: string }) {
  const [rankings, setRankings] = useState<RankingsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/climate/rankings.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setRankings(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rankings?.rows?.length) return null;
  const rows = rankings.rows;
  const me = rows.find((r) => r.slug === slug);
  if (!me) return null;

  // Use the best available window: 1m → 3m → 12m
  const windowKey: 'anomaly1m' | 'anomaly3m' | 'anomaly12m' | null =
    me.anomaly1m != null ? 'anomaly1m' : me.anomaly3m != null ? 'anomaly3m' : me.anomaly12m != null ? 'anomaly12m' : null;
  if (!windowKey) return null;
  const windowLabel =
    windowKey === 'anomaly1m' ? '1-month' : windowKey === 'anomaly3m' ? '3-month' : '12-month';

  const valid = rows.filter((r) => typeof r[windowKey] === 'number');
  const sorted = [...valid].sort((a, b) => (b[windowKey] as number) - (a[windowKey] as number));
  const globalIdx = sorted.findIndex((r) => r.slug === slug);
  if (globalIdx === -1) return null;
  const myAnom = me[windowKey] as number;
  const globalRank = globalIdx + 1;
  const globalTotal = sorted.length;

  const peers = sorted.filter((r) => r.type === me.type);
  const peerIdx = peers.findIndex((r) => r.slug === slug);
  const peerRank = peerIdx + 1;
  const peerTotal = peers.length;
  const peerLabel = TYPE_LABEL[me.type];

  const sign = myAnom > 0 ? '+' : '';
  const tone =
    myAnom >= 1.5 ? 'text-red-300'
    : myAnom >= 0.8 ? 'text-orange-300'
    : myAnom >= 0.2 ? 'text-amber-300'
    : myAnom <= -0.2 ? 'text-sky-300'
    : 'text-gray-200';

  return (
    <Link
      href="/climate/rankings"
      className="mt-3 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#D0A65E]/30 bg-[#D0A65E]/5 px-3 py-2 text-xs md:text-sm text-gray-300 hover:border-[#D0A65E]/55 hover:bg-[#D0A65E]/10 transition-colors"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-[#D0A65E]">
        <TrendingUp className="h-3.5 w-3.5" />
        Ranking
      </span>
      <span>
        <span className={`font-mono font-semibold ${tone}`}>{sign}{myAnom.toFixed(2)}°C</span>{' '}
        <span className="text-gray-400">({windowLabel} anomaly)</span>
      </span>
      <span className="text-gray-400">·</span>
      <span>
        <span className="font-semibold text-white">{ordinal(globalRank)}</span>{' '}
        <span className="text-gray-400">of {globalTotal} regions</span>
      </span>
      {peerTotal > 1 && (
        <>
          <span className="text-gray-400">·</span>
          <span>
            <span className="font-semibold text-white">{ordinal(peerRank)}</span>{' '}
            <span className="text-gray-400">of {peerTotal} {peerLabel}</span>
          </span>
        </>
      )}
      <span className="ml-auto text-[11px] text-[#D0A65E]">See all 144 regions →</span>
    </Link>
  );
}
