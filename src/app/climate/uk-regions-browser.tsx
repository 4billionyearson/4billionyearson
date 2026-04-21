'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, LayoutGrid, Map as MapIcon, MapPin, Search, X } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import { UK_CITY_REGION_MAP } from '@/lib/climate/locations';

type RegionGroupFilter = 'all' | 'england' | 'wales' | 'scotland' | 'northern-ireland' | 'ireland' | 'cross-border';
type BrowserView = 'list' | 'map';

type UKRegionCardData = {
  region: ClimateRegion;
  group: Exclude<RegionGroupFilter, 'all'>;
  searchableCities: string[];
  representativeCities: string[];
};

const UKRegionsLeafletMap = dynamic(() => import('./uk-regions-leaflet-map'), {
  ssr: false,
  loading: () => <div className="h-[420px] md:h-[520px] w-full rounded-[28px] bg-gray-900 animate-pulse" />,
});

const FILTER_LABELS: Record<RegionGroupFilter, string> = {
  all: 'All',
  england: 'England',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland',
  ireland: 'Ireland',
  'cross-border': 'Cross-border',
};

const GROUP_ORDER: Array<Exclude<RegionGroupFilter, 'all'>> = [
  'england',
  'wales',
  'scotland',
  'northern-ireland',
  'ireland',
  'cross-border',
];

const GROUP_TITLES: Record<Exclude<RegionGroupFilter, 'all'>, string> = {
  england: 'England',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland',
  ireland: 'Ireland',
  'cross-border': 'Cross-border Regions',
};

const VIEW_LABELS: Record<BrowserView, string> = {
  list: 'List',
  map: 'Map',
};

const URL_PARAM_KEYS = {
  query: 'ukq',
  filter: 'ukfilter',
  view: 'ukview',
  region: 'ukregion',
} as const;

const REGION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  england: { lat: 52.7, lng: -1.6 },
  wales: { lat: 52.3, lng: -3.7 },
  scotland: { lat: 56.5, lng: -4.1 },
  'northern-ireland': { lat: 54.7, lng: -6.8 },
  ireland: { lat: 53.35, lng: -8.1 },
  'england-and-wales': { lat: 52.4, lng: -2.6 },
  'england-north': { lat: 54.9, lng: -2.1 },
  'england-south': { lat: 51.6, lng: -1.2 },
  'scotland-east': { lat: 56.3, lng: -2.7 },
  'scotland-north': { lat: 57.8, lng: -4.1 },
  'scotland-west': { lat: 56.0, lng: -5.0 },
  'england-east-and-north-east': { lat: 53.9, lng: -0.9 },
  'england-nw-and-north-wales': { lat: 53.5, lng: -3.1 },
  midlands: { lat: 52.5, lng: -1.6 },
  'east-anglia': { lat: 52.4, lng: 0.8 },
  'england-sw-and-south-wales': { lat: 51.3, lng: -3.9 },
  'england-se-central-south': { lat: 51.3, lng: -0.7 },
};

function titleCaseCity(value: string): string {
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getRegionGroup(region: ClimateRegion): Exclude<RegionGroupFilter, 'all'> {
  if (region.slug === 'ireland') {
    return 'ireland';
  }

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RegionGroupFilter>('all');
  const [view, setView] = useState<BrowserView>('list');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const browserRegions = useMemo<UKRegionCardData[]>(() => (
    regions.map((region) => {
      const representativeCities = region.coveragePlaces ?? [];
      return {
        region,
        group: getRegionGroup(region),
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
    const grouped = new Map<Exclude<RegionGroupFilter, 'all'>, UKRegionCardData[]>();
    for (const group of GROUP_ORDER) grouped.set(group, []);
    for (const region of filteredRegions) {
      grouped.get(region.group)?.push(region);
    }
    return grouped;
  }, [filteredRegions]);

  const selectedRegion = useMemo(() => {
    if (!filteredRegions.length) return null;
    return filteredRegions.find((item) => item.region.slug === selectedSlug) ?? filteredRegions[0];
  }, [filteredRegions, selectedSlug]);

  const mapMarkers = useMemo(() => (
    filteredRegions
      .map((item) => {
        const coords = REGION_COORDINATES[item.region.slug];
        if (!coords) return null;
        return {
          slug: item.region.slug,
          name: item.region.name,
          lat: coords.lat,
          lng: coords.lng,
        };
      })
      .filter((item): item is { slug: string; name: string; lat: number; lng: number } => Boolean(item))
  ), [filteredRegions]);

  useEffect(() => {
    const nextQuery = searchParams.get(URL_PARAM_KEYS.query) ?? '';
    const nextFilterParam = searchParams.get(URL_PARAM_KEYS.filter);
    const nextViewParam = searchParams.get(URL_PARAM_KEYS.view);
    const nextRegion = searchParams.get(URL_PARAM_KEYS.region);

    const nextFilter = (nextFilterParam && nextFilterParam in FILTER_LABELS)
      ? nextFilterParam as RegionGroupFilter
      : 'all';
    const nextView = (nextViewParam && nextViewParam in VIEW_LABELS)
      ? nextViewParam as BrowserView
      : 'list';

    setQuery((current) => current === nextQuery ? current : nextQuery);
    setFilter((current) => current === nextFilter ? current : nextFilter);
    setView((current) => current === nextView ? current : nextView);
    setSelectedSlug((current) => current === nextRegion ? current : nextRegion);
  }, [searchParams]);

  useEffect(() => {
    const effectiveSelectedSlug = selectedRegion?.region.slug ?? null;
    if (selectedSlug !== effectiveSelectedSlug) {
      setSelectedSlug(effectiveSelectedSlug);
    }
  }, [selectedRegion, selectedSlug]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) params.set(URL_PARAM_KEYS.query, query);
    else params.delete(URL_PARAM_KEYS.query);

    if (filter !== 'all') params.set(URL_PARAM_KEYS.filter, filter);
    else params.delete(URL_PARAM_KEYS.filter);

    if (view !== 'list') params.set(URL_PARAM_KEYS.view, view);
    else params.delete(URL_PARAM_KEYS.view);

    if (selectedSlug) params.set(URL_PARAM_KEYS.region, selectedSlug);
    else params.delete(URL_PARAM_KEYS.region);

    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [query, filter, view, selectedSlug, pathname, router, searchParams]);

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
            <MapIcon className="h-6 w-6" />
          </div>
          <h2 className="flex-1 min-w-0 font-mono font-bold text-base md:text-lg tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
            UK and Ireland
          </h2>
          <ChevronRight
            className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-0.5'}`}
            style={{ color: 'rgba(255,245,231,0.7)' }}
          />
        </div>
      </button>

      <div className={`grid transition-all duration-500 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="bg-gray-900 px-4 py-5 md:px-6 md:py-6 space-y-5">
            <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">
              Search by city, country or region, or browse by nation. Some Met Office regions overlap national borders; those remain listed as cross-border because that is how the source data is published.
            </p>

            <div className="flex flex-col gap-3">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by city, country or region"
              className="w-full rounded-xl border border-gray-700 bg-gray-800/80 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 outline-none transition-all focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
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

          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as RegionGroupFilter[]).map((option) => {
              const active = filter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                      : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:border-sky-500/40 hover:text-sky-300'
                  }`}
                >
                  {FILTER_LABELS[option]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {(Object.keys(VIEW_LABELS) as BrowserView[]).map((option) => {
              const active = view === option;
              const Icon = option === 'list' ? LayoutGrid : MapIcon;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-[#D0A65E] bg-[#D0A65E]/10 text-[#D0A65E]'
                      : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:border-gray-600 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {VIEW_LABELS[option]}
                </button>
              );
            })}
            <span className="ml-auto text-xs text-gray-600">
              {filteredRegions.length} region{filteredRegions.length === 1 ? '' : 's'}
              {normalizedQuery ? ` matching "${query.trim()}"` : ''}
            </span>
          </div>

            </div>

            {view === 'list' ? (
              <div className="space-y-6">
            {GROUP_ORDER.map((group) => {
              const items = groupedRegions.get(group) ?? [];
              if (!items.length) return null;

              return (
                <div key={group} className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">{GROUP_TITLES[group]}</h3>
                    <span className="flex-1 h-px bg-gray-800" />
                    <span className="text-xs text-gray-600">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((item) => (
                      <UKRegionCard
                        key={item.region.slug}
                        region={item.region}
                        representativeCities={item.representativeCities}
                        matchedCities={getMatchedCities(item, normalizedQuery)}
                        selected={item.region.slug === selectedRegion?.region.slug}
                        onPointerEnter={() => setSelectedSlug(item.region.slug)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {!filteredRegions.length && <EmptyState />}
          </div>
        ) : filteredRegions.length ? (
          <UKMapView
            filteredRegions={filteredRegions}
            normalizedQuery={normalizedQuery}
            selectedRegion={selectedRegion}
            mapMarkers={mapMarkers}
            onSelectRegion={(slug) => setSelectedSlug(slug)}
          />
        ) : (
          <EmptyState />
        )}
          </div>
        </div>
      </div>
    </section>
  );
}

function UKRegionCard({
  region,
  representativeCities,
  matchedCities,
  selected,
  onPointerEnter,
}: {
  region: ClimateRegion;
  representativeCities: string[];
  matchedCities: string[];
  selected?: boolean;
  onPointerEnter?: () => void;
}) {
  const cityPreview = representativeCityText(representativeCities);

  return (
    <Link
      href={`/climate/${region.slug}`}
      className={`group block rounded-xl border p-4 transition-all duration-200 ${
        selected ? 'border-sky-600/50 bg-sky-950/30' : 'border-gray-700/60 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/70'
      }`}
      onMouseEnter={onPointerEnter}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-600 bg-gray-700/50 text-sky-400">
          <MapPin className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-gray-100 group-hover:text-white">{region.name}</h4>
          <p className="mt-1 text-sm font-medium text-gray-200">{cityPreview}</p>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{region.tagline}</p>
          {matchedCities.length > 0 && (
            <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-sky-800/40 bg-sky-900/20 px-2.5 py-1.5 text-xs text-sky-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Matches: {matchedCities.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function UKMapView({
  filteredRegions,
  normalizedQuery,
  selectedRegion,
  mapMarkers,
  onSelectRegion,
}: {
  filteredRegions: UKRegionCardData[];
  normalizedQuery: string;
  selectedRegion: UKRegionCardData | null;
  mapMarkers: Array<{ slug: string; name: string; lat: number; lng: number }>;
  onSelectRegion: (slug: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
        <UKRegionsLeafletMap
          markers={mapMarkers}
          selectedSlug={selectedRegion?.region.slug ?? null}
          onSelectRegion={onSelectRegion}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr] items-start">
        {selectedRegion ? (
          <>
            <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-700/40 bg-sky-900/30 text-sky-400">
                  <MapPin className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Selected region</p>
                  <h3 className="mt-1 text-xl font-bold text-white">{selectedRegion.region.name}</h3>
                  <p className="mt-2 text-sm font-medium text-gray-200">{representativeCityText(selectedRegion.representativeCities)}</p>
                  <p className="mt-2 text-sm text-gray-400">{selectedRegion.region.tagline}</p>
                  {normalizedQuery ? (
                    <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-sky-800/40 bg-sky-900/20 px-2.5 py-1.5 text-xs text-sky-400">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Matches: {getMatchedCities(selectedRegion, normalizedQuery).join(', ') || 'Region name match'}</span>
                    </div>
                  ) : null}
                  <Link
                    href={`/climate/${selectedRegion.region.slug}`}
                    className="inline-flex items-center gap-2 mt-4 rounded-lg border border-[#D0A65E]/35 bg-[#D0A65E]/10 px-3 py-2 text-sm font-semibold text-[#D0A65E] transition-colors hover:bg-[#D0A65E]/20 hover:text-[#E8C97A]"
                  >
                    Open climate update
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Visible regions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {filteredRegions.map((item) => {
                  const active = item.region.slug === selectedRegion.region.slug;
                  return (
                    <button
                      key={item.region.slug}
                      type="button"
                      onClick={() => onSelectRegion(item.region.slug)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                          : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:border-sky-500/40 hover:text-sky-300'
                      }`}
                    >
                      {item.region.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-6 text-center">
      <p className="text-sm font-medium text-gray-200">No UK regions match that search.</p>
      <p className="mt-1 text-sm text-gray-500">Try a city name like Cambridge, Glasgow or Bangor, or switch back to All.</p>
    </div>
  );
}