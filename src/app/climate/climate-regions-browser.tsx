"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin, X } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import {
  continentForCountryApiCode,
  usRegionForStateApiCode,
  type Continent,
  type USRegion,
} from '@/lib/climate/editorial';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ClimateRegionsBrowserProps {
  title: string;
  icon: React.ReactNode;
  regions: ClimateRegion[];
  /**
   * 'country' uses NOAA's 7-continent groupings; 'us-state' uses NOAA's 9 US Climate Regions.
   */
  mode: 'country' | 'us-state';
  /** Optional preface text under the gold banner when expanded. */
  intro?: string;
  defaultExpanded?: boolean;
  /** When true, render the body directly without the gold header / collapse toggle (tab-panel mode). */
  headless?: boolean;
}

// ─── Styling ─────────────────────────────────────────────────────────────────

const FILTER_BUTTON_BASE = 'inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors';
const FILTER_BUTTON_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]';
const FILTER_BUTTON_INACTIVE = 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupFor(region: ClimateRegion, mode: 'country' | 'us-state'): string | null {
  if (mode === 'country') return continentForCountryApiCode(region.apiCode);
  if (mode === 'us-state') return usRegionForStateApiCode(region.apiCode);
  return null;
}

const CONTINENT_ORDER: Continent[] = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania', 'Antarctica'];
const US_REGION_ORDER: USRegion[] = [
  'Northeast',
  'Upper Midwest',
  'Ohio Valley',
  'Southeast',
  'South',
  'Northern Rockies and Plains',
  'Southwest',
  'Northwest',
  'West',
];

// ─── Region card ─────────────────────────────────────────────────────────────

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

function RegionCard({ region }: { region: ClimateRegion }) {
  const accent = typeAccent(region.type);
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
      </div>
      <p className="text-[12px] text-gray-400 line-clamp-2 flex-1">{region.tagline}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#D0A65E]/80 group-hover:text-[#D0A65E]">
        Open climate update <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ClimateRegionsBrowser({
  title,
  icon,
  regions,
  mode,
  intro,
  defaultExpanded = false,
  headless = false,
}: ClimateRegionsBrowserProps) {
  const [isExpanded, setIsExpanded] = useState(headless ? true : defaultExpanded);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | string>('all');

  // Available groups present in this region list
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    for (const r of regions) {
      const g = groupFor(r, mode);
      if (g) set.add(g);
    }
    const order = mode === 'country' ? CONTINENT_ORDER : US_REGION_ORDER;
    return order.filter((g) => set.has(g as string));
  }, [regions, mode]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredRegions = useMemo(() => {
    return regions.filter((region) => {
      if (filter !== 'all') {
        const g = groupFor(region, mode);
        if (g !== filter) return false;
      }
      if (!normalizedQuery) return true;
      const haystack = [
        region.name.toLowerCase(),
        region.tagline.toLowerCase(),
        ...(region.coveragePlaces ?? []).map((p) => p.toLowerCase()),
      ];
      return haystack.some((h) => h.includes(normalizedQuery));
    });
  }, [regions, normalizedQuery, filter, mode]);

  const groupedRegions = useMemo(() => {
    const map = new Map<string, ClimateRegion[]>();
    for (const region of filteredRegions) {
      const g = groupFor(region, mode) ?? 'Other';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(region);
    }
    return map;
  }, [filteredRegions, mode]);

  const orderedGroupKeys = useMemo(() => {
    const order = mode === 'country' ? CONTINENT_ORDER : US_REGION_ORDER;
    const present = new Set(groupedRegions.keys());
    const ordered = order.filter((g) => present.has(g as string));
    // Append "Other" at the end if present
    if (present.has('Other')) ordered.push('Other' as any);
    return ordered;
  }, [groupedRegions, mode]);

  if (headless) {
    return (
      <section className="relative">
        <div className="px-4 pt-3 pb-5 md:px-6 md:pt-4 md:pb-6 space-y-5">
          {intro ? (
            <p className="text-sm text-gray-400 max-w-3xl">{intro}</p>
          ) : null}

          <div className="relative max-w-2xl">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'rgba(208, 166, 94, 0.8)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'country' ? 'Search by country or major city' : 'Search by state or city'}
              className="w-full rounded-xl border border-[#D0A65E]/35 bg-gray-900/50 py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-[#FFF5E7]/35 outline-none transition-all focus:border-[#D0A65E]/55 focus:ring-2 focus:ring-[#D0A65E]/20"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-700 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="border-t border-gray-800/80 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`${FILTER_BUTTON_BASE} ${filter === 'all' ? FILTER_BUTTON_ACTIVE : FILTER_BUTTON_INACTIVE}`}
              >
                All
              </button>
              {availableGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setFilter(group)}
                  className={`${FILTER_BUTTON_BASE} ${filter === group ? FILTER_BUTTON_ACTIVE : FILTER_BUTTON_INACTIVE}`}
                >
                  {group}
                </button>
              ))}
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 sm:ml-auto">
                {filteredRegions.length} region{filteredRegions.length === 1 ? '' : 's'}
                {normalizedQuery ? ` matching "${query.trim()}"` : ''}
              </span>
            </div>
          </div>

          {filteredRegions.length ? (
            <div className="space-y-6">
              {orderedGroupKeys.map((group) => {
                const items = groupedRegions.get(group as string) ?? [];
                if (!items.length) return null;
                return (
                  <div key={group} className="space-y-3">
                    {filter !== 'all' && (
                      <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFF5E7]/65">
                          {group}
                        </h3>
                        <span className="flex-1 h-px bg-[#D0A65E]/15" />
                        <span className="text-[11px] text-gray-500">{items.length}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((region) => (
                        <RegionCard key={region.slug} region={region} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-gray-200">No regions match that search.</p>
              <p className="mt-1 text-sm text-gray-500">Try a broader term or switch back to All.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative rounded-2xl border-2 transition-all duration-500 ease-out overflow-hidden"
      style={{
        borderColor: '#D0A65E',
        background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)',
        boxShadow: isExpanded ? '0 4px 24px rgba(208,166,94,0.2)' : '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <button type="button" onClick={() => setIsExpanded((prev) => !prev)} className="w-full text-left group">
        <div className="px-4 py-3 md:px-5 md:py-4 flex items-center gap-2" style={{ backgroundColor: '#D0A65E' }}>
          <div className={`transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'scale-110' : 'group-hover:scale-105'}`} style={{ color: '#FFF5E7' }}>
            {icon}
          </div>
          <h2 className="flex-1 min-w-0 font-mono font-bold text-base md:text-lg tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
            {title}
          </h2>
          <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'rgba(255,245,231,0.7)' }}>
            {regions.length} region{regions.length === 1 ? '' : 's'}
          </span>
          <ChevronRight
            className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-0.5'}`}
            style={{ color: 'rgba(255,245,231,0.7)' }}
          />
        </div>
      </button>

      <div className={`grid transition-all duration-500 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="bg-gray-950/90 backdrop-blur-md px-4 py-5 md:px-6 md:py-6 space-y-5">
            {intro ? (
              <p className="text-sm text-gray-400 max-w-3xl">{intro}</p>
            ) : null}

            {/* Search */}
            <div className="relative max-w-2xl">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'rgba(208, 166, 94, 0.8)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === 'country' ? 'Search by country or major city' : 'Search by state or city'}
                className="w-full rounded-xl border border-[#D0A65E]/35 bg-gray-900/50 py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-[#FFF5E7]/35 outline-none transition-all focus:border-[#D0A65E]/55 focus:ring-2 focus:ring-[#D0A65E]/20"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-700 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Group filter pills */}
            <div className="border-t border-gray-800/80 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`${FILTER_BUTTON_BASE} ${filter === 'all' ? FILTER_BUTTON_ACTIVE : FILTER_BUTTON_INACTIVE}`}
                >
                  All
                </button>
                {availableGroups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setFilter(group)}
                    className={`${FILTER_BUTTON_BASE} ${filter === group ? FILTER_BUTTON_ACTIVE : FILTER_BUTTON_INACTIVE}`}
                  >
                    {group}
                  </button>
                ))}
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 sm:ml-auto">
                  {filteredRegions.length} region{filteredRegions.length === 1 ? '' : 's'}
                  {normalizedQuery ? ` matching "${query.trim()}"` : ''}
                </span>
              </div>
            </div>

            {/* Grouped list */}
            {filteredRegions.length ? (
              <div className="space-y-6">
                {orderedGroupKeys.map((group) => {
                  const items = groupedRegions.get(group as string) ?? [];
                  if (!items.length) return null;
                  return (
                    <div key={group} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFF5E7]/65">
                          {group}
                        </h3>
                        <span className="flex-1 h-px bg-[#D0A65E]/15" />
                        <span className="text-[11px] text-gray-500">{items.length}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items.map((region) => (
                          <RegionCard key={region.slug} region={region} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-6 text-center">
                <p className="text-sm font-medium text-gray-200">No regions match that search.</p>
                <p className="mt-1 text-sm text-gray-500">Try a broader term or switch back to All.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
