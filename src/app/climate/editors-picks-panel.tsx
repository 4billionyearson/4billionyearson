"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import { EDITORS_PICKS } from '@/lib/climate/editorial';

function typeAccent(type: ClimateRegion['type']): { card: string; hover: string } {
  switch (type) {
    case 'country':
      return { card: 'border-sky-500/40 bg-sky-950/20', hover: 'hover:border-sky-400/70 hover:bg-sky-950/35' };
    case 'us-state':
      return { card: 'border-orange-500/40 bg-orange-950/15', hover: 'hover:border-orange-400/70 hover:bg-orange-950/30' };
    case 'uk-region':
      return { card: 'border-[#D0A65E]/45 bg-[#3a2a12]/30', hover: 'hover:border-[#D0A65E]/75 hover:bg-[#3a2a12]/45' };
    default:
      return { card: 'border-emerald-500/40 bg-emerald-950/20', hover: 'hover:border-emerald-400/70 hover:bg-emerald-950/35' };
  }
}

function PickCard({ region }: { region: ClimateRegion }) {
  const accent = typeAccent(region.type);
  return (
    <Link
      href={`/climate/${region.slug}`}
      className={`group flex flex-col rounded-xl border p-3 transition-all duration-200 ${accent.card} ${accent.hover}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl leading-none shrink-0" aria-hidden>{region.emoji}</span>
        <h4 className="flex-1 min-w-0 text-sm font-semibold text-[#FFF5E7] group-hover:text-white leading-tight truncate">{region.name}</h4>
      </div>
      <p className="text-[12px] text-gray-400 line-clamp-2 flex-1">{region.tagline}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#D0A65E]/80 group-hover:text-[#D0A65E]">
        Open climate update <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

export default function EditorsPicksPanel({ regions }: { regions: ClimateRegion[] }) {
  const pickedRegions = useMemo<ClimateRegion[]>(() => {
    const bySlug = new Map(regions.map((r) => [r.slug, r]));
    return EDITORS_PICKS
      .map((slug) => bySlug.get(slug))
      .filter((r): r is ClimateRegion => !!r);
  }, [regions]);

  return (
    <section className="rounded-2xl border-2 border-[#D0A65E]/80 bg-gray-950/90 backdrop-blur-md px-4 py-5 md:px-6 md:py-6 space-y-4 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
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
    </section>
  );
}
