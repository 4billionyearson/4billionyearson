'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, X } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import { UK_CITY_REGION_MAP } from '@/lib/climate/locations';

type UkCountryFilter = 'all' | 'england' | 'wales' | 'scotland' | 'northern-ireland' | 'cross-border';

type UKRegionCardData = {
  region: ClimateRegion;
  group: Exclude<UkCountryFilter, 'all'>;
  searchableCities: string[];
  representativeCities: string[];
};

const FILTER_LABELS: Record<UkCountryFilter, string> = {
  all: 'All',
  england: 'England',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland',
  'cross-border': 'Cross-border',
};

const GROUP_ORDER: Array<Exclude<UkCountryFilter, 'all'>> = [
  'england',
  'wales',
  'scotland',
  'northern-ireland',
  'cross-border',
];

const GROUP_TITLES: Record<Exclude<UkCountryFilter, 'all'>, string> = {
  england: 'England',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland',
  'cross-border': 'Cross-border Regions',
};

function titleCaseCity(value: string): string {
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getUKGroup(region: ClimateRegion): Exclude<UkCountryFilter, 'all'> {
  switch (region.apiCode) {
    case 'uk-wal':
      return 'wales';
    case 'uk-sco':
    case 'uk-se':
    case 'uk-sn':
    case 'uk-sw':
      return 'scotland';
    case 'uk-ni':
      return 'northern-ireland';
    case 'uk-ew':
    case 'uk-nww':
    case 'uk-sws':
      return 'cross-border';
    default:
      return 'england';
  }
}

function buildSearchableCities(apiCode: string, fallbackCities: string[]): string[] {
  const mappedCities = Object.entries(UK_CITY_REGION_MAP)
    .filter(([, regionCode]) => regionCode === apiCode)
    .map(([city]) => titleCaseCity(city));

  return Array.from(new Set([...fallbackCities, ...mappedCities]));
}

function representativeCityText(cities: string[]): string {
  if (!cities.length) return 'Regional coverage';
  if (cities.length <= 4) return cities.join(', ');
  return `${cities.slice(0, 4).join(', ')} + more`;
}

function regionMatches(region: UKRegionCardData, query: string): boolean {
  if (!query) return true;
  const haystack = [
    region.region.name,
    region.region.tagline,
    region.region.description,
    ...region.searchableCities,
  ].join(' ').toLowerCase();
  return haystack.includes(query);
}

function getMatchedCities(region: UKRegionCardData, query: string): string[] {
  if (!query) return [];
  return region.searchableCities.filter((city) => city.toLowerCase().includes(query)).slice(0, 3);
}

export default function UKRegionsBrowser({ regions }: { regions: ClimateRegion[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UkCountryFilter>('all');

  const browserRegions = useMemo<UKRegionCardData[]>(() => (
    regions.map((region) => {
      const representativeCities = region.coveragePlaces ?? [];
      return {
        region,
        group: getUKGroup(region),
        representativeCities,
        searchableCities: buildSearchableCities(region.apiCode, representativeCities),
      };
    })
  ), [regions]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRegions = useMemo(() => (
    browserRegions.filter((region) => {
      if (filter !== 'all' && region.group !== filter) return false;
      return regionMatches(region, normalizedQuery);
    })
  ), [browserRegions, filter, normalizedQuery]);

  const groupedRegions = useMemo(() => {
    const grouped = new Map<Exclude<UkCountryFilter, 'all'>, UKRegionCardData[]>();
    for (const group of GROUP_ORDER) grouped.set(group, []);
    for (const region of filteredRegions) {
      grouped.get(region.group)?.push(region);
    }
    return grouped;
  }, [filteredRegions]);

  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <div className="flex flex-col gap-4 md:gap-5">
        <div>
          <h2 className="text-xl font-bold font-mono text-white flex items-start gap-2">
            <span className="shrink-0 mt-1">🇬🇧</span>
            <span className="min-w-0 flex-1">UK Regions</span>
          </h2>
          <p className="mt-2 text-sm text-gray-400 max-w-3xl">
            Search by city or region, or browse by country. Some Met Office regions overlap national borders; those remain listed as cross-border because that is how the source data is published.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D0A65E]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by city or region"
              className="w-full rounded-xl border border-[#D0A65E]/40 bg-gray-900/70 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-[#D0A65E]/55 outline-none transition-all focus:border-[#D0A65E] focus:ring-2 focus:ring-[#D0A65E]/30"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
                aria-label="Clear UK region search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as UkCountryFilter[]).map((option) => {
              const active = filter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-[#D0A65E] bg-[#D0A65E]/15 text-[#FFF5E7]'
                      : 'border-gray-700 bg-gray-900/60 text-gray-400 hover:border-[#D0A65E]/40 hover:text-white'
                  }`}
                >
                  {FILTER_LABELS[option]}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>{filteredRegions.length} region{filteredRegions.length === 1 ? '' : 's'}</span>
            {normalizedQuery && <span>Matching “{query.trim()}”</span>}
            <span>Representative cities shown on cards; profiles contain fuller coverage</span>
          </div>
        </div>

        <div className="space-y-5">
          {GROUP_ORDER.map((group) => {
            const items = groupedRegions.get(group) ?? [];
            if (!items.length) return null;

            return (
              <div key={group} className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-gray-800 pb-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D0A65E]">{GROUP_TITLES[group]}</h3>
                  <span className="text-xs text-gray-600">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {items.map((item) => (
                    <UKRegionCard
                      key={item.region.slug}
                      region={item.region}
                      representativeCities={item.representativeCities}
                      matchedCities={getMatchedCities(item, normalizedQuery)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {!filteredRegions.length && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-gray-200">No UK regions match that search.</p>
              <p className="mt-1 text-sm text-gray-500">Try a city name like Cambridge, Glasgow or Bangor, or switch back to All.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function UKRegionCard({
  region,
  representativeCities,
  matchedCities,
}: {
  region: ClimateRegion;
  representativeCities: string[];
  matchedCities: string[];
}) {
  const cityPreview = representativeCityText(representativeCities);

  return (
    <Link
      href={`/climate/${region.slug}`}
      className="group block rounded-xl border border-gray-700/50 bg-gray-900/60 p-4 hover:border-[#D0A65E]/50 hover:bg-gray-900 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{region.emoji}</span>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-gray-100 group-hover:text-white">{region.name}</h4>
          <p className="mt-1 text-sm font-medium text-gray-200">{cityPreview}</p>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{region.tagline}</p>
          {matchedCities.length > 0 && (
            <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-[#D0A65E]/25 bg-[#D0A65E]/5 px-2.5 py-1.5 text-xs text-[#D0A65E]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Matches: {matchedCities.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}