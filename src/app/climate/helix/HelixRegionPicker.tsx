'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  List,
  Map as MapIcon,
  Search,
  X,
  Globe2,
  Flag,
  MapPin,
} from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import type { CountryAnomalyRow, ClimateMapPreset } from '../global/ClimateMapCard';

// Countries with no direct CRU TS data that proxy to a neighbouring country.
// Only these should ever show the NEAREST DATA badge in search results.
const PROXY_PLACE_NAMES = new Set([
  'singapore', 'hong kong', 'macau', 'macao',
  'monaco', 'liechtenstein', 'san marino', 'vatican', 'andorra',
]);
import ClimateMapCard from '../global/ClimateMapCard';
import { ChipDropdown } from '@/app/_components/responsive-segmented-control';

type PickerSection =
  | 'continents'
  | 'countries'
  | 'uk-countries'
  | 'uk-regions'
  | 'us-states'
  | 'us-climate-regions';

type PickerMapLevel = 'continents' | 'countries' | 'uk-countries' | 'uk-regions' | 'us-states' | 'us-regions';

const UK_NATION_API_CODES = new Set(['uk-eng', 'uk-wal', 'uk-sco', 'uk-ni']);

const SECTION_META: Record<PickerSection, { label: string; icon: React.ReactNode }> = {
  continents: { label: 'Continents', icon: <Globe2 className="h-4 w-4 text-[#D0A65E]" /> },
  countries: { label: 'Countries', icon: <Globe2 className="h-4 w-4 text-[#D0A65E]" /> },
  'uk-countries': { label: 'UK Countries', icon: <MapPin className="h-4 w-4 text-[#D0A65E]" /> },
  'uk-regions': { label: 'UK Regions', icon: <MapPin className="h-4 w-4 text-[#D0A65E]" /> },
  'us-states': { label: 'US States', icon: <Flag className="h-4 w-4 text-[#D0A65E]" /> },
  'us-climate-regions': { label: 'US Climate Regions', icon: <Flag className="h-4 w-4 text-[#D0A65E]" /> },
};

function regionMatches(region: ClimateRegion, q: string): boolean {
  const haystack = [region.name, region.tagline, ...(region.coveragePlaces ?? [])]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function cardAccent(section: PickerSection): { card: string; hover: string } {
  if (section === 'countries') {
    return {
      card: 'border-sky-500/40 bg-sky-950/20',
      hover: 'hover:border-sky-400/70 hover:bg-sky-950/35',
    };
  }
  if (section === 'us-states' || section === 'us-climate-regions') {
    return {
      card: 'border-orange-500/40 bg-orange-950/15',
      hover: 'hover:border-orange-400/70 hover:bg-orange-950/30',
    };
  }
  if (section === 'uk-countries' || section === 'uk-regions') {
    return {
      card: 'border-[#D0A65E]/45 bg-[#3a2a12]/30',
      hover: 'hover:border-[#D0A65E]/75 hover:bg-[#3a2a12]/45',
    };
  }
  return {
    card: 'border-emerald-500/40 bg-emerald-950/20',
    hover: 'hover:border-emerald-400/70 hover:bg-emerald-950/35',
  };
}

function HelixResultCard({
  region,
  section,
  onSelect,
}: {
  region: ClimateRegion;
  section: PickerSection;
  onSelect?: (region: ClimateRegion) => void;
}) {
  const accent = cardAccent(section);
  const inner = (
    <>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl leading-none shrink-0" aria-hidden>
          {region.emoji}
        </span>
        <h4 className="flex-1 min-w-0 text-sm font-semibold text-[#FFF5E7] group-hover:text-white leading-tight truncate">
          {region.name}
        </h4>
      </div>
      <p className="text-[12px] text-gray-400 line-clamp-2 flex-1">{region.tagline}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#D0A65E]/80 group-hover:text-[#D0A65E]">
        View helix <ChevronRight className="h-3 w-3" />
      </span>
    </>
  );
  const cls = `group flex flex-col rounded-xl border p-3.5 transition-all duration-200 text-left ${accent.card} ${accent.hover}`;
  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(region)} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={`/climate/${region.slug}#climate-spiral`} className={cls}>
      {inner}
    </Link>
  );
}

export default function HelixRegionPicker({
  regions,
  onRegionSelect,
  onSelectGlobal,
  isGlobalActive = true,
}: {
  regions: ClimateRegion[];
  onRegionSelect?: (region: ClimateRegion) => void;
  onSelectGlobal?: () => void;
  isGlobalActive?: boolean;
}) {
  const router = useRouter();
  const [panelMode, setPanelMode] = useState<null | 'list' | 'map'>(null);
  const [active, setActive] = useState<PickerSection>('countries');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const [countryAnomalies, setCountryAnomalies] = useState<CountryAnomalyRow[] | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const sections = useMemo(() => {
    const countries = regions.filter((r) => r.type === 'country' && r.slug !== 'ireland');
    const usStates = regions.filter((r) => r.type === 'us-state');
    const ukCountries = regions.filter(
      (r) => (r.type === 'uk-region' && UK_NATION_API_CODES.has(r.apiCode)) || r.slug === 'ireland',
    );
    const ukRegions = regions.filter(
      (r) => r.type === 'uk-region' && !UK_NATION_API_CODES.has(r.apiCode),
    );
    const continents = regions.filter((r) => r.type === 'group' && r.groupKind === 'continent');
    const usClimateRegions = regions.filter((r) => r.type === 'group' && r.groupKind === 'us-climate-region');
    return {
      continents,
      countries,
      'uk-countries': ukCountries,
      'uk-regions': ukRegions,
      'us-states': usStates,
      'us-climate-regions': usClimateRegions,
    } satisfies Record<PickerSection, ClimateRegion[]>;
  }, [regions]);

  const sectionSlugSets = useMemo(() => {
    return Object.fromEntries(
      (Object.keys(sections) as PickerSection[]).map((key) => [key, new Set(sections[key].map((region) => region.slug))]),
    ) as Record<PickerSection, Set<string>>;
  }, [sections]);

  const levelOptions = useMemo(
    () =>
      (Object.keys(sections) as PickerSection[]).map((key) => ({
        key,
        label: `${SECTION_META[key].label} (${sections[key].length})`,
      })),
    [sections],
  );

  const visibleRegions = sections[active];
  const trimmedQuery = query.trim().toLowerCase();

  // Autocomplete dropdown — capped at 5 items per group to keep overlay compact
  const dropdownResults = useMemo(() => {
    if (!trimmedQuery) return [] as Array<{ key: PickerSection; items: ClimateRegion[] }>;
    return (Object.keys(sections) as PickerSection[])
      .map((key) => ({
        key,
        items: sections[key].filter((region) => regionMatches(region, trimmedQuery)).slice(0, 5),
      }))
      .filter((group) => group.items.length > 0);
  }, [sections, trimmedQuery]);

  const totalDropdownResults = dropdownResults.reduce((n, g) => n + g.items.length, 0);

  // Close panel + call parent callback when a region is picked from any source
  const handleSelect = useCallback((region: ClimateRegion) => {
    setPanelMode(null);
    onRegionSelect?.(region);
  }, [onRegionSelect]);

  // Close dropdown when user clicks outside the search container
  useEffect(() => {
    if (!trimmedQuery) return;
    function onDocClick(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) setQuery('');
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [trimmedQuery]);

  const mapConfig = useMemo((): { preset: ClimateMapPreset; level: PickerMapLevel } => {
    switch (active) {
      case 'continents':
        return { preset: 'global', level: 'continents' };
      case 'countries':
        return { preset: 'global', level: 'countries' };
      case 'uk-countries':
        return { preset: 'uk', level: 'uk-countries' };
      case 'uk-regions':
        return { preset: 'uk', level: 'uk-regions' };
      case 'us-states':
        return { preset: 'usa', level: 'us-states' };
      case 'us-climate-regions':
        return { preset: 'usa', level: 'us-regions' };
    }
  }, [active]);

  const slugMaps = useMemo(() => {
    const continentBySlug = new Map<string, string>();
    const countryByIso3 = new Map<string, string>();
    const countryByName = new Map<string, string>();
    const usStateByName = new Map<string, string>();
    const ukRegionBySlug = new Map<string, string>();
    for (const region of regions) {
      if (region.type === 'group' && region.groupKind === 'continent') continentBySlug.set(region.slug, region.slug);
      else if (region.type === 'country') {
        if (region.apiCode) countryByIso3.set(region.apiCode.toUpperCase(), region.slug);
        countryByName.set(region.name.toLowerCase(), region.slug);
      } else if (region.type === 'us-state') usStateByName.set(region.name.toLowerCase(), region.slug);
      else if (region.type === 'uk-region') ukRegionBySlug.set(region.slug, region.slug);
      else if (region.type === 'group' && region.groupKind === 'us-climate-region') ukRegionBySlug.set(region.slug, region.slug);
    }
    return { continentBySlug, countryByIso3, countryByName, usStateByName, ukRegionBySlug };
  }, [regions]);

  useEffect(() => {
    if (panelMode !== 'map') return;
    if (mapConfig.preset !== 'global') return;
    if (countryAnomalies || mapLoading || mapError) return;

    const controller = new AbortController();
    setMapLoading(true);
    fetch(`/api/climate/global?_t=${Date.now()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        setCountryAnomalies(Array.isArray(payload?.countryAnomalies) ? payload.countryAnomalies : []);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'AbortError') return;
        setMapError('The region map could not be loaded right now.');
      })
      .finally(() => setMapLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelMode, mapConfig]);

  const handleMapSelect = useCallback(
    (info: { level: PickerMapLevel; name: string; slug?: string; iso3?: string }) => {
      const lower = info.name.toLowerCase();
      let slug: string | undefined;
      switch (info.level) {
        case 'continents':
          slug = info.slug && slugMaps.continentBySlug.get(info.slug);
          break;
        case 'countries':
          if (info.iso3) slug = slugMaps.countryByIso3.get(info.iso3.toUpperCase());
          if (!slug) slug = slugMaps.countryByName.get(lower);
          break;
        case 'us-states':
          slug = slugMaps.usStateByName.get(lower);
          break;
        case 'us-regions':
        case 'uk-countries':
        case 'uk-regions':
          slug = info.slug && slugMaps.ukRegionBySlug.get(info.slug);
          break;
      }
      if (slug) {
        const region = regions.find((r) => r.slug === slug);
        if (region && onRegionSelect) {
          setPanelMode(null);
          onRegionSelect(region);
        } else {
          router.push(`/climate/${slug}#climate-spiral`);
        }
      }
    },
    [router, slugMaps, regions, onRegionSelect],  // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="pt-3">
      {/* Control bar — always visible */}
      <div className="flex flex-row flex-wrap items-center gap-2.5">

        {/* Global button */}
        <button
          type="button"
          onClick={() => { setPanelMode(null); onSelectGlobal?.(); }}
          className={`inline-flex shrink-0 items-center gap-1.5 h-9 rounded-full px-3 text-xs font-medium border transition-colors ${
            isGlobalActive
              ? 'bg-[#D0A65E] border-[#D0A65E] text-gray-950'
              : 'border-[#D0A65E]/35 bg-gray-900/40 text-[#FFF5E7]/75 hover:text-white hover:border-[#D0A65E]/60'
          }`}
        >
          <Globe2 className="h-3.5 w-3.5" />
          Global
        </button>

        {/* List / Map toggle — clicking the active mode again closes the panel */}
        <div
          role="tablist"
          aria-label="View"
          className="inline-flex h-9 shrink-0 rounded-full border border-[#D0A65E]/35 bg-gray-900/40 p-0.5 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={panelMode === 'list'}
            onClick={() => setPanelMode(panelMode === 'list' ? null : 'list')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 font-medium transition-colors ${panelMode === 'list' ? 'bg-[#D0A65E] text-gray-950' : 'text-[#FFF5E7]/75 hover:text-white'}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panelMode === 'map'}
            onClick={() => setPanelMode(panelMode === 'map' ? null : 'map')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 font-medium transition-colors ${panelMode === 'map' ? 'bg-[#D0A65E] text-gray-950' : 'text-[#FFF5E7]/75 hover:text-white'}`}
          >
            <MapIcon className="h-3.5 w-3.5" /> Map
          </button>
        </div>

        {panelMode !== null && (
          <div className="shrink-0">
            <ChipDropdown
              label="Level"
              ariaLabel="Helix picker level"
              value={active}
              onChange={(key) => setActive(key as PickerSection)}
              options={levelOptions}
              triggerClassName="h-9 px-3 text-[13px]"
            />
          </div>
        )}

        {/* Search with inline autocomplete dropdown */}
        <div ref={searchRef} className="relative w-full sm:flex-1 sm:w-auto sm:min-w-0">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none"
            style={{ color: 'rgba(208, 166, 94, 0.8)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any country, US state or UK region…"
            className="h-9 w-full rounded-full border border-[#D0A65E]/35 bg-gray-900/50 pl-9 pr-10 text-[13px] text-white placeholder:text-[#FFF5E7]/35 outline-none transition-all focus:border-[#D0A65E]/55 focus:ring-2 focus:ring-[#D0A65E]/20"
            autoComplete="off"
            aria-label="Search any helix region"
            aria-expanded={trimmedQuery.length > 0}
            aria-haspopup="listbox"
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

          {/* Autocomplete dropdown overlay */}
          {trimmedQuery.length > 0 && (
            <div
              role="listbox"
              aria-label="Search results"
              className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-[#D0A65E]/30 bg-gray-900 shadow-2xl overflow-hidden max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#D0A65E]/5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D0A65E]/40 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-color:rgba(208,166,94,0.4)_rgba(208,166,94,0.05)] [scrollbar-width:thin]"
            >
              {totalDropdownResults === 0 ? (
                <p className="px-4 py-5 text-sm text-gray-400 text-center">
                  No regions match &ldquo;{query}&rdquo;
                </p>
              ) : (
                <div className="py-1">
                  {dropdownResults.map((group) => (
                    <div key={group.key}>
                      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                        {SECTION_META[group.key].icon}
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          {SECTION_META[group.key].label}
                        </span>
                      </div>
                      {group.items.map((region) => {
                        const q = trimmedQuery.toLowerCase();
                        const matchedPlace = (region.coveragePlaces ?? []).find(
                          (p) => {
                            const pLower = p.toLowerCase();
                            return PROXY_PLACE_NAMES.has(pLower) && pLower.includes(q);
                          }
                        );
                        return (
                          <button
                            key={region.slug}
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              setQuery('');
                              if (onRegionSelect) {
                                handleSelect(region);
                              } else {
                                router.push(`/climate/${region.slug}#climate-spiral`);
                              }
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#D0A65E]/10"
                          >
                            <span className="text-lg leading-none shrink-0">{region.emoji}</span>
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#FFF5E7] truncate">{region.name}</span>
                                {matchedPlace && (
                                  <span className="shrink-0 text-[10px] font-semibold tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">NEAREST DATA</span>
                                )}
                              </span>
                              {matchedPlace ? (
                                <span className="block text-[11px] text-amber-400/70 truncate">No direct data for {matchedPlace}</span>
                              ) : (
                                <span className="block text-[11px] text-gray-500 truncate">{region.tagline}</span>
                              )}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#D0A65E]/60" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* List / Map panel — only renders when a mode is active */}
      {panelMode !== null && (
        <div className="mt-4 rounded-xl border border-[#D0A65E]/25 bg-gray-950/70 px-4 py-4 md:px-5 md:py-5">
          {panelMode === 'map' ? (
            mapLoading && mapConfig.preset === 'global' && !countryAnomalies ? (
              <div className="h-[320px] md:h-[500px] rounded-xl bg-gray-900/40 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
              </div>
            ) : mapError && mapConfig.preset === 'global' && !countryAnomalies ? (
              <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-6 text-sm text-amber-200">
                {mapError}
              </div>
            ) : (
              <ClimateMapCard
                key={`${mapConfig.preset}-${mapConfig.level}`}
                countryAnomalies={countryAnomalies ?? []}
                preset={mapConfig.preset}
                initialLevel={mapConfig.level}
                initialMetric="temp-anomaly"
                embedded
                hideShare
                onSelect={handleMapSelect}
              />
            )
          ) : (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                {SECTION_META[active].icon}
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFF5E7]/65">
                  {SECTION_META[active].label}
                </h3>
                <span className="flex-1 h-px bg-[#D0A65E]/15" />
                <span className="text-[11px] text-gray-500">{visibleRegions.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleRegions.map((region) => (
                  <HelixResultCard
                    key={region.slug}
                    region={region}
                    section={
                      (Object.keys(sectionSlugSets) as PickerSection[]).find(
                        (key) => sectionSlugSets[key].has(region.slug),
                      ) ?? active
                    }
                    onSelect={onRegionSelect ? handleSelect : undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}