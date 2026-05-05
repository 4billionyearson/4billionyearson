"use client";

import Link from 'next/link';
import { ChevronRight, Layers, Flag } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';

interface Props {
  groups: ClimateRegion[];
  kind?: 'continent' | 'us-climate-region';
}

function GroupCard({ region }: { region: ClimateRegion }) {
  const isContinent = region.groupKind === 'continent';
  const accent = isContinent
    ? { card: 'border-emerald-500/40 bg-emerald-950/20', hover: 'hover:border-emerald-400/70 hover:bg-emerald-950/35' }
    : { card: 'border-orange-500/40 bg-orange-950/15', hover: 'hover:border-orange-400/70 hover:bg-orange-950/30' };

  return (
    <Link
      href={`/climate/${region.slug}`}
      className={`group flex flex-col rounded-xl border p-3.5 transition-all duration-200 ${accent.card} ${accent.hover}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl leading-none shrink-0" aria-hidden>{region.emoji}</span>
        <h4 className="flex-1 min-w-0 text-sm font-semibold text-[#FFF5E7] group-hover:text-white leading-tight truncate">
          {region.name}
        </h4>
        {region.isAggregate ? (
          <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-900/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">agg</span>
        ) : null}
      </div>
      <p className="text-[12px] text-gray-400 line-clamp-2 flex-1">{region.tagline}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#D0A65E]/80 group-hover:text-[#D0A65E]">
        Open update <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

export default function GroupsBrowserPanel({ groups, kind }: Props) {
  const continents = groups.filter((g) => g.groupKind === 'continent');
  const usRegions = groups.filter((g) => g.groupKind === 'us-climate-region');
  const showContinents = !kind || kind === 'continent';
  const showUsRegions = !kind || kind === 'us-climate-region';

  return (
    <section className="px-4 pt-3 pb-5 md:px-6 md:pt-4 md:pb-6 space-y-6">

      {showContinents && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Layers className="h-4 w-4 text-[#D0A65E]" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFF5E7]/65">Continents</h3>
            <span className="flex-1 h-px bg-[#D0A65E]/15" />
            <span className="text-[11px] text-gray-500">{continents.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {continents.map((g) => (
              <GroupCard key={g.slug} region={g} />
            ))}
          </div>
        </div>
      )}

      {showUsRegions && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Flag className="h-4 w-4 text-[#D0A65E]" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFF5E7]/65">US Climate Regions</h3>
            <span className="flex-1 h-px bg-[#D0A65E]/15" />
            <span className="text-[11px] text-gray-500">{usRegions.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {usRegions.map((g) => (
              <Link
                key={g.slug}
                href={`/climate/${g.slug}`}
                className="inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/40 hover:bg-[#D0A65E]/10 hover:text-[#FFF5E7] whitespace-nowrap"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
