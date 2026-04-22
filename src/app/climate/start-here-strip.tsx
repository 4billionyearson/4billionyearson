"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, Trophy, ChevronRight } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import { EDITORS_PICKS } from '@/lib/climate/editorial';

interface StartHereStripProps {
  regions: ClimateRegion[];
  title?: string;
  description?: string;
}

function TypeBadge({ type }: { type: ClimateRegion['type'] }) {
  const { label, cls } =
    type === 'country'
      ? { label: 'Country', cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' }
      : type === 'us-state'
        ? { label: 'US State', cls: 'border-orange-500/40 bg-orange-500/10 text-orange-300' }
        : type === 'uk-region'
          ? { label: 'UK Region', cls: 'border-[#D0A65E]/45 bg-[#D0A65E]/10 text-[#D0A65E]' }
          : { label: 'Global', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function PickCard({ region }: { region: ClimateRegion }) {
  return (
    <Link
      href={`/climate/${region.slug}`}
      className="group flex flex-col rounded-xl border border-[#D0A65E]/30 bg-gray-900/85 p-3 transition-all duration-200 hover:border-[#D0A65E]/60 hover:bg-gray-800"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl leading-none shrink-0" aria-hidden>{region.emoji}</span>
        <h4 className="flex-1 min-w-0 text-sm font-semibold text-[#FFF5E7] group-hover:text-white leading-tight truncate">{region.name}</h4>
        <TypeBadge type={region.type} />
      </div>
      <p className="text-[12px] text-gray-400 line-clamp-2 flex-1">{region.tagline}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#D0A65E]/80 group-hover:text-[#D0A65E]">
        Open climate update <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

export default function StartHereStrip({ regions, title, description }: StartHereStripProps) {
  const pickedRegions = useMemo<ClimateRegion[]>(() => {
    const bySlug = new Map(regions.map((r) => [r.slug, r]));
    return EDITORS_PICKS
      .map((slug) => bySlug.get(slug))
      .filter((r): r is ClimateRegion => !!r);
  }, [regions]);

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
        <div className="bg-gray-950/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-4 border-b border-gray-800/60">
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">{description}</p>
        </div>
      ) : null}

      <div className="bg-gray-950/90 backdrop-blur-md px-4 py-4 md:px-6 md:py-5 space-y-4" id="editors-picks" style={{ scrollMarginTop: '72px' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FFF5E7]">
            <Sparkles className="h-4 w-4 text-[#D0A65E]" />
            Editor&apos;s picks
          </span>
          <span className="text-[11px] text-gray-500 ml-auto">Curated starting points</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {pickedRegions.map((region) => (
            <PickCard key={region.slug} region={region} />
          ))}
        </div>

        {/* Rankings teaser — replaces the old "Biggest shift" tab. Full
            league table, movers and monthly analysis live at /climate/rankings. */}
        <Link
          href="/climate/rankings"
          className="group flex items-center gap-3 rounded-xl border border-[#D0A65E]/40 bg-[#D0A65E]/8 px-4 py-3 transition-colors hover:border-[#D0A65E]/70 hover:bg-[#D0A65E]/12"
        >
          <Trophy className="h-5 w-5 shrink-0 text-[#D0A65E]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#FFF5E7]">Climate Rankings &amp; Monthly Trends</p>
            <p className="text-[12px] text-gray-400">
              Full league table across 144 regions — warmest this month, biggest rank movers, continent roll-ups &amp; AI-drafted monthly analysis.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[12px] font-medium text-[#D0A65E]/80 group-hover:text-[#D0A65E]">
            See rankings <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
