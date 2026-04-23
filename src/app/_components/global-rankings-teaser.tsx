"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';

interface RankingRow {
  slug: string;
  name: string;
  emoji?: string;
  anomaly1m: number | null;
  latestLabel: string | null;
}

interface RankingsResponse {
  rows: RankingRow[];
}

export default function GlobalRankingsTeaser() {
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
  const valid = rows.filter((r) => typeof r.anomaly1m === 'number');
  const top3 = [...valid].sort((a, b) => (b.anomaly1m as number) - (a.anomaly1m as number)).slice(0, 3);
  if (!top3.length) return null;

  return (
    <Link
      href="/climate/rankings"
      className="mt-3 inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-[#D0A65E]/30 bg-[#D0A65E]/5 px-3 py-2 text-xs md:text-sm text-gray-300 hover:border-[#D0A65E]/55 hover:bg-[#D0A65E]/10 transition-colors"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-[#D0A65E]">
        <Trophy className="h-3.5 w-3.5" />
        Warmest this month
      </span>
      {top3.map((r, i) => (
        <span key={r.slug} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-500">·</span>}
          <span>
            <span className="mr-1">{r.emoji}</span>
            <span className="font-semibold text-white">{r.name}</span>{' '}
            <span className="font-mono text-red-300">+{(r.anomaly1m as number).toFixed(2)}°C</span>
          </span>
        </span>
      ))}
      <span className="ml-auto text-[11px] text-teal-300">Rankings, movers & monthly analysis →</span>
    </Link>
  );
}
