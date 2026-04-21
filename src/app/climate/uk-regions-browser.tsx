'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Map as MapIcon, MapPin, Search, X } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import { UK_CITY_REGION_MAP } from '@/lib/climate/locations';

type UkCountryFilter = 'all' | 'england' | 'wales' | 'scotland' | 'northern-ireland' | 'cross-border';
type BrowserView = 'list' | 'map';

type UKRegionCardData = {
  region: ClimateRegion;
  group: Exclude<UkCountryFilter, 'all'>;
  searchableCities: string[];
  representativeCities: string[];
};

const UKRegionsLeafletMap = dynamic(() => import('./uk-regions-leaflet-map'), {
  ssr: false,
  loading: () => <div className="h-[420px] md:h-[520px] w-full rounded-[28px] bg-gray-900 animate-pulse" />,
});

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UkCountryFilter>('all');
  const [view, setView] = useState<BrowserView>('list');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

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
      ? nextFilterParam as UkCountryFilter
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
    <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <div className="flex flex-col gap-4 md:gap-5">
        <div>
          <h2 className="text-xl font-bold font-mono text-white flex items-start gap-2">
            <MapIcon className="h-5 w-5 shrink-0 mt-1 text-[#D0A65E]" />
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

          <div className="flex flex-wrap gap-2">
            {(Object.keys(VIEW_LABELS) as BrowserView[]).map((option) => {
              const active = view === option;
              const Icon = option === 'list' ? LayoutGrid : MapIcon;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-[#D0A65E] bg-[#D0A65E]/15 text-[#FFF5E7]'
                      : 'border-gray-700 bg-gray-900/60 text-gray-400 hover:border-[#D0A65E]/40 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {VIEW_LABELS[option]}
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

        {view === 'list' ? (
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
      className={`group block rounded-xl border bg-gray-900/60 p-4 transition-all duration-200 hover:border-[#D0A65E]/50 hover:bg-gray-900 ${
        selected ? 'border-[#D0A65E]/45 shadow-[0_0_0_1px_rgba(208,166,94,0.18)]' : 'border-gray-700/50'
      }`}
      onMouseEnter={onPointerEnter}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D0A65E]/25 bg-[#D0A65E]/8 text-[#D0A65E]">
          <MapPin className="h-4.5 w-4.5" />
        </span>
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
      <div className="rounded-2xl border border-[#D0A65E]/30 bg-[radial-gradient(circle_at_top,_rgba(208,166,94,0.12),_transparent_38%),linear-gradient(180deg,rgba(18,24,38,0.95),rgba(7,11,22,0.98))] p-4 lg:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Region locator</p>
            <p className="text-xs text-gray-500">Click a marker on the map to focus a region, then open its climate update.</p>
          </div>
          <div className="text-xs text-gray-500">Leaflet basemap</div>
        </div>
        <UKRegionsLeafletMap
          markers={mapMarkers}
          selectedSlug={selectedRegion?.region.slug ?? null}
          onSelectRegion={onSelectRegion}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] items-start">
        {selectedRegion ? (
          <>
            <div className="rounded-2xl border border-[#D0A65E]/30 bg-gray-900/70 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D0A65E]/25 bg-[#D0A65E]/8 text-[#D0A65E]">
                  <MapPin className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D0A65E]">Selected region</p>
                  <h3 className="mt-1 text-xl font-bold text-white">{selectedRegion.region.name}</h3>
                  <p className="mt-2 text-sm font-medium text-gray-200">{representativeCityText(selectedRegion.representativeCities)}</p>
                  <p className="mt-2 text-sm text-gray-400">{selectedRegion.region.tagline}</p>
                  {normalizedQuery ? (
                    <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-[#D0A65E]/25 bg-[#D0A65E]/5 px-2.5 py-1.5 text-xs text-[#D0A65E]">
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
                          ? 'border-[#D0A65E] bg-[#D0A65E]/15 text-[#FFF5E7]'
                          : 'border-gray-700 bg-gray-950/60 text-gray-400 hover:border-[#D0A65E]/40 hover:text-white'
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