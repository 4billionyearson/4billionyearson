"use client";

import Link from 'next/link';
import { Trophy, TrendingUp, Map, BarChart3, ChevronRight } from 'lucide-react';

export default function ClimateRankingsPanel() {
  return (
    <section className="px-4 py-5 md:px-6 md:py-6 space-y-5">
      <div className="flex items-start gap-3">
        <Trophy className="h-6 w-6 shrink-0 text-[#D0A65E]" />
        <div className="flex-1">
          <h2 className="text-lg font-bold font-mono text-[#FFF5E7]">Climate Rankings &amp; Monthly Trends</h2>
          <p className="mt-1 text-sm text-gray-400 max-w-3xl">
            Full league table across all 144 regions — warmest this month, biggest rank movers, continent &amp; US-region roll-ups, and an AI-drafted monthly analysis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
          <div className="flex items-center gap-2 text-[#D0A65E]">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">Movers</span>
          </div>
          <p className="mt-1.5 text-[12px] text-gray-400">Biggest monthly rank shifts across every tracked region.</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
          <div className="flex items-center gap-2 text-[#D0A65E]">
            <Map className="h-4 w-4" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">Roll-ups</span>
          </div>
          <p className="mt-1.5 text-[12px] text-gray-400">Continent, UK nation and US-region anomaly summaries.</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
          <div className="flex items-center gap-2 text-[#D0A65E]">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">Analysis</span>
          </div>
          <p className="mt-1.5 text-[12px] text-gray-400">AI-drafted monthly narrative grounded in reputable climate news.</p>
        </div>
      </div>

      <Link
        href="/climate/rankings"
        className="group inline-flex items-center gap-2 rounded-xl border border-[#D0A65E]/60 bg-[#D0A65E]/10 px-4 py-2.5 text-sm font-semibold text-[#FFF5E7] transition-colors hover:border-[#D0A65E] hover:bg-[#D0A65E]/15"
      >
        <Trophy className="h-4 w-4 text-[#D0A65E]" />
        Open the full rankings
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
