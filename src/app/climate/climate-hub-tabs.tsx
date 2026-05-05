'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, Search, Sparkles, X, List, Map as MapIcon, Globe, BookmarkCheck, Trophy } from 'lucide-react';
import { ChipDropdown } from '@/app/_components/responsive-segmented-control';
import type { ClimateRegion } from '@/lib/climate/regions';
import type { CountryAnomalyRow, ClimateMapPreset } from './global/ClimateMapCard';

const ClimateMapCard = dynamic(() => import('./global/ClimateMapCard'), { ssr: false });

export type ClimateTabId =
  | 'editors-picks'
  | 'continents'
  | 'countries'
  | 'uk-countries'
  | 'uk-regions'
  | 'us-states'
  | 'us-climate-regions'
  | 'rankings';

type CountKey = 'countries' | 'usStates' | 'ukCountries' | 'ukRegions' | 'continents' | 'usClimateRegions';

type TabDef = {
  id: ClimateTabId;
  label: string;
  countKey?: CountKey;
};

const TABS: TabDef[] = [
  { id: 'editors-picks', label: "Editor's Picks" },
  { id: 'continents', label: 'Continents', countKey: 'continents' },
  { id: 'countries', label: 'Countries', countKey: 'countries' },
  { id: 'uk-countries', label: 'UK Countries', countKey: 'ukCountries' },
  { id: 'uk-regions', label: 'UK Regions', countKey: 'ukRegions' },
  { id: 'us-states', label: 'US States', countKey: 'usStates' },
  { id: 'us-climate-regions', label: 'US Climate Regions', countKey: 'usClimateRegions' },
  { id: 'rankings', label: 'Climate Ranking' },
];

type Counts = {
  countries: number;
  usStates: number;
  ukRegions: number;
  ukCountries: number;
  continents: number;
  usClimateRegions: number;
};

type Panels = Record<ClimateTabId, ReactNode>;

function isTabId(value: string): value is ClimateTabId {
  return TABS.some((t) => t.id === value);
}

type Ctx = {
  active: ClimateTabId;
  setActive: (id: ClimateTabId) => void;
  counts: Counts;
  panels: Panels;
  query: string;
  setQuery: (q: string) => void;
  regions: ClimateRegion[];
  countryAnomalies: CountryAnomalyRow[];
  view: 'list' | 'map';
  setView: (v: 'list' | 'map') => void;
};

const ClimateTabsCtx = createContext<Ctx | null>(null);

function useClimateTabs(): Ctx {
  const v = useContext(ClimateTabsCtx);
  if (!v) throw new Error('ClimateTabsProvider missing');
  return v;
}

export function ClimateTabsProvider({
  counts,
  panels,
  regions,
  countryAnomalies,
  children,
}: {
  counts: Counts;
  panels: Panels;
  regions: ClimateRegion[];
  countryAnomalies: CountryAnomalyRow[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<ClimateTabId>('editors-picks');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');

  // On mount: restore view + active from sessionStorage (so the back button
  // returns the user to the same state they left).
  useEffect(() => {
    try {
      const savedView = sessionStorage.getItem('climate-hub-view');
      if (savedView === 'map' || savedView === 'list') setView(savedView);
      const savedActive = sessionStorage.getItem('climate-hub-active');
      if (savedActive && isTabId(savedActive)) setActive(savedActive);
    } catch { /* sessionStorage unavailable (private browsing etc.) */ }

    const sync = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && isTabId(hash)) setActive(hash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const handleSetActive = (id: ClimateTabId) => {
    setActive(id);
    try { sessionStorage.setItem('climate-hub-active', id); } catch { /* ignore */ }
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', `#${id}`);
    }
  };

  const handleSetView = (v: 'list' | 'map') => {
    setView(v);
    try { sessionStorage.setItem('climate-hub-view', v); } catch { /* ignore */ }
  };

  return (
    <ClimateTabsCtx.Provider
      value={{ active, setActive: handleSetActive, counts, panels, query, setQuery, regions, countryAnomalies, view, setView: handleSetView }}
    >
      {children}
    </ClimateTabsCtx.Provider>
  );
}

/**
 * Top-level controls for the Climate Updates hub:
 *   • Section ChipDropdown (replaces the wrapping 8-chip tab row).
 *   • Global search input that searches across every system at once.
 *
 * When the search input has text, ClimateTabsPanels renders unified
 * results across all systems instead of the active section's panel.
 */
export function ClimateHubControls() {
  const { active, setActive, counts, query, setQuery, view, setView } = useClimateTabs();

  const sectionOptions = useMemo(
    () =>
      TABS.map((tab) => {
        const count = tab.countKey ? counts[tab.countKey] : null;
        return {
          key: tab.id,
          label: count != null ? `${tab.label} (${count})` : tab.label,
        };
      }),
    [counts],
  );

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2.5">
      {/* View toggle (List/Map) — first, then Section, then Search. All h-9. */}
      <div
        role="tablist"
        aria-label="View"
        className="inline-flex h-9 shrink-0 rounded-full border border-[#D0A65E]/35 bg-gray-900/40 p-0.5 text-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          onClick={() => setView('list')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 font-medium transition-colors ${view === 'list' ? 'bg-[#D0A65E] text-gray-950' : 'text-[#FFF5E7]/75 hover:text-white'}`}
        >
          <List className="h-3.5 w-3.5" /> List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'map'}
          onClick={() => setView('map')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 font-medium transition-colors ${view === 'map' ? 'bg-[#D0A65E] text-gray-950' : 'text-[#FFF5E7]/75 hover:text-white'}`}
        >
          <MapIcon className="h-3.5 w-3.5" /> Map
        </button>
      </div>

      <div className="shrink-0">
        <ChipDropdown
          label="Section"
          ariaLabel="Climate hub section"
          value={active}
          onChange={(k) => setActive(k as ClimateTabId)}
          options={sectionOptions}
          triggerClassName="h-9 px-3 text-[13px]"
        />
      </div>

      <div className="relative flex-1 min-w-0">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: 'rgba(208, 166, 94, 0.8)' }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any country, US state, UK region or city…"
          className="h-9 w-full rounded-full border border-[#D0A65E]/35 bg-gray-900/50 pl-9 pr-10 text-[13px] text-white placeholder:text-[#FFF5E7]/35 outline-none transition-all focus:border-[#D0A65E]/55 focus:ring-2 focus:ring-[#D0A65E]/20"
          autoComplete="off"
          aria-label="Search any region across all systems"
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
    </div>
  );
}

export function ClimateTabsPanels() {
  const { active, setActive, panels, query, regions, view, setView, countryAnomalies } = useClimateTabs();
  const router = useRouter();
  const trimmed = query.trim();

  // Build slug-resolution maps from CLIMATE_REGIONS so a click on a polygon
  // can navigate to the right /climate/{slug} page. Names are normalised to
  // lowercase; iso3 codes (apiCode for countries) are used as-is.
  const slugMaps = useMemo(() => {
    const continentBySlug = new Map<string, string>();
    const countryByIso3 = new Map<string, string>();
    const countryByName = new Map<string, string>();
    const usStateByName = new Map<string, string>();
    const ukRegionBySlug = new Map<string, string>();
    for (const r of regions) {
      if (r.type === 'group' && r.groupKind === 'continent') continentBySlug.set(r.slug, r.slug);
      else if (r.type === 'country') {
        if (r.apiCode) countryByIso3.set(r.apiCode.toUpperCase(), r.slug);
        countryByName.set(r.name.toLowerCase(), r.slug);
      } else if (r.type === 'us-state') usStateByName.set(r.name.toLowerCase(), r.slug);
      else if (r.type === 'uk-region') ukRegionBySlug.set(r.slug, r.slug);
    }
    return { continentBySlug, countryByIso3, countryByName, usStateByName, ukRegionBySlug };
  }, [regions]);

  const handleMapSelect = useCallback(
    (info: { level: MapLevel; name: string; slug?: string; iso3?: string }) => {
      const lower = info.name.toLowerCase();
      let slug: string | undefined;
      switch (info.level) {
        case 'continents': {
          // Feature names are 'North America', 'Europe', etc. — kebab-case
          // and confirm the slug exists in CLIMATE_REGIONS.
          const candidate = lower.replace(/\s+/g, '-');
          slug = slugMaps.continentBySlug.get(candidate);
          break;
        }
        case 'countries': {
          if (info.iso3) slug = slugMaps.countryByIso3.get(info.iso3.toUpperCase());
          if (!slug) slug = slugMaps.countryByName.get(lower);
          break;
        }
        case 'us-states': {
          slug = slugMaps.usStateByName.get(lower);
          break;
        }
        case 'us-regions': {
          // Feature carries the climate-region slug directly.
          slug = info.slug;
          break;
        }
        case 'uk-countries':
        case 'uk-regions': {
          // Feature carries the slug directly (e.g. 'england', 'midlands').
          slug = info.slug && slugMaps.ukRegionBySlug.get(info.slug);
          break;
        }
      }
      if (slug) router.push(`/climate/${slug}`);
    },
    [router, slugMaps],
  );

  if (trimmed.length >= 1) {
    return <UnifiedSearchResults query={trimmed} regions={regions} />;
  }

  if (view === 'map') {
    // Choose a sensible map config for the active section. For sections
    // without an obvious map (Editor's Picks, Rankings) fall back to the
    // global continents view so the map still renders.
    const cfg = SECTION_MAP_CONFIG[active] ?? { preset: 'global' as ClimateMapPreset, level: 'continents' as MapLevel };
    return (
      <div className="px-4 pt-3 pb-5 md:px-6 md:pt-4 md:pb-6">
        <ClimateMapCard
          key={`${cfg.preset}-${cfg.level}`}
          countryAnomalies={countryAnomalies}
          preset={cfg.preset}
          initialLevel={cfg.level}
          initialMetric="temp-actual"
          hideShare
          embedded
          onSelect={handleMapSelect}
          extraControls={<MapQuickPicks setActive={setActive} setView={setView} />}
        />
      </div>
    );
  }

  return (
    <>
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
        >
          {panels[tab.id]}
        </div>
      ))}
    </>
  );
}

// ─── Section → map config ────────────────────────────────────────────────────

type MapLevel = 'continents' | 'countries' | 'uk-countries' | 'uk-regions' | 'us-states' | 'us-regions';

const SECTION_MAP_CONFIG: Partial<Record<ClimateTabId, { preset: ClimateMapPreset; level: MapLevel }>> = {
  continents: { preset: 'global', level: 'continents' },
  countries: { preset: 'global', level: 'countries' },
  'uk-countries': { preset: 'uk', level: 'uk-countries' },
  'uk-regions': { preset: 'uk', level: 'uk-regions' },
  'us-states': { preset: 'usa', level: 'us-states' },
  'us-climate-regions': { preset: 'usa', level: 'us-regions' },
};

// Quick-pick pills shown above the map for sections that aren't pickable
// from a polygon: the worldwide ("Global") update, Editor's Picks and the
// Climate Ranking. The map view is great for choosing a continent / country /
// state, but you still need a path to these three.
function MapQuickPicks({
  setActive,
  setView,
}: {
  setActive: (id: ClimateTabId) => void;
  setView: (v: 'list' | 'map') => void;
}) {
  const pillCls =
    'inline-flex h-8 items-center gap-1.5 rounded-full border border-[#D0A65E]/35 bg-gray-900/40 px-2.5 text-[12px] font-medium text-[#FFF5E7] hover:border-[#D0A65E]/60 hover:bg-white/[0.04] transition-colors';
  return (
    <>
      <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 ml-1">
        Or jump to
      </span>
      <Link href="/climate/global" className={pillCls}>
        <Globe className="h-3.5 w-3.5 text-[#D0A65E]" /> Global
      </Link>
      <button
        type="button"
        onClick={() => { setActive('editors-picks'); setView('list'); }}
        className={pillCls}
      >
        <BookmarkCheck className="h-3.5 w-3.5 text-[#D0A65E]" /> Editor&rsquo;s Picks
      </button>
      <button
        type="button"
        onClick={() => { setActive('rankings'); setView('list'); }}
        className={pillCls}
      >
        <Trophy className="h-3.5 w-3.5 text-[#D0A65E]" /> Ranking
      </button>
    </>
  );
}

// ─── Unified search ──────────────────────────────────────────────────────────

type ResultGroupKey =
  | 'continents'
  | 'countries'
  | 'us-states'
  | 'uk-regions'
  | 'us-climate-regions'
  | 'special';

const RESULT_GROUP_ORDER: ResultGroupKey[] = [
  'countries',
  'us-states',
  'uk-regions',
  'continents',
  'us-climate-regions',
  'special',
];

const RESULT_GROUP_LABELS: Record<ResultGroupKey, string> = {
  continents: 'Continents',
  countries: 'Countries',
  'us-states': 'US States',
  'uk-regions': 'UK Regions',
  'us-climate-regions': 'US Climate Regions',
  special: 'Other',
};

function resultGroupFor(region: ClimateRegion): ResultGroupKey {
  if (region.type === 'country') return 'countries';
  if (region.type === 'us-state') return 'us-states';
  if (region.type === 'uk-region') return 'uk-regions';
  if (region.type === 'group' && region.groupKind === 'continent') return 'continents';
  if (region.type === 'group' && region.groupKind === 'us-climate-region') return 'us-climate-regions';
  return 'special';
}

function regionMatches(region: ClimateRegion, q: string): boolean {
  const haystack = [region.name, region.tagline, ...(region.coveragePlaces ?? [])]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function UnifiedSearchResults({ query, regions }: { query: string; regions: ClimateRegion[] }) {
  const q = query.toLowerCase();

  const grouped = useMemo(() => {
    const map = new Map<ResultGroupKey, ClimateRegion[]>();
    for (const r of regions) {
      if (!regionMatches(r, q)) continue;
      const key = resultGroupFor(r);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [regions, q]);

  const total = useMemo(() => {
    let n = 0;
    for (const list of grouped.values()) n += list.length;
    return n;
  }, [grouped]);

  return (
    <section className="px-4 pt-3 pb-5 md:px-6 md:pt-4 md:pb-6 space-y-5">
      <div className="flex items-center gap-3">
        <Sparkles className="h-4 w-4 text-[#D0A65E]" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFF5E7]/65">
          Search results
        </h3>
        <span className="flex-1 h-px bg-[#D0A65E]/15" />
        <span className="text-[11px] text-gray-500">
          {total} match{total === 1 ? '' : 'es'} for &ldquo;{query}&rdquo;
        </span>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-gray-200">No regions match &ldquo;{query}&rdquo;.</p>
          <p className="mt-1 text-sm text-gray-500">
            Try a country, city, US state or UK region name.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {RESULT_GROUP_ORDER.map((groupKey) => {
            const items = grouped.get(groupKey);
            if (!items || !items.length) return null;
            return (
              <div key={groupKey} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFF5E7]/65">
                    {RESULT_GROUP_LABELS[groupKey]}
                  </h4>
                  <span className="flex-1 h-px bg-[#D0A65E]/15" />
                  <span className="text-[11px] text-gray-500">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((r) => (
                    <ResultCard key={r.slug} region={r} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function typeAccent(region: ClimateRegion): { card: string; hover: string } {
  if (region.type === 'country') {
    return {
      card: 'border-sky-500/40 bg-sky-950/20',
      hover: 'hover:border-sky-400/70 hover:bg-sky-950/35',
    };
  }
  if (region.type === 'us-state') {
    return {
      card: 'border-orange-500/40 bg-orange-950/15',
      hover: 'hover:border-orange-400/70 hover:bg-orange-950/30',
    };
  }
  if (region.type === 'uk-region') {
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

function ResultCard({ region }: { region: ClimateRegion }) {
  const accent = typeAccent(region);
  return (
    <Link
      href={`/climate/${region.slug}`}
      className={`group flex flex-col rounded-xl border p-3.5 transition-all duration-200 ${accent.card} ${accent.hover}`}
    >
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
        Open climate update <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

/** @deprecated Replaced by ClimateHubControls. Kept as no-op for any stragglers. */
export function ClimateTabsBar() {
  return null;
}
