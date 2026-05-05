'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Sparkles, Globe2, Flag, MapPin, Trophy, Layers, type LucideIcon } from 'lucide-react';

export type ClimateTabId = 'editors-picks' | 'continents' | 'countries' | 'uk-countries' | 'uk-regions' | 'us-states' | 'us-climate-regions' | 'rankings';

type TabDef = {
  id: ClimateTabId;
  label: string;
  icon: LucideIcon;
  countKey?: 'countries' | 'usStates' | 'ukCountries' | 'ukRegions' | 'continents' | 'usClimateRegions';
};

const TABS: TabDef[] = [
  { id: 'editors-picks', label: "Editor's Picks", icon: Sparkles },
  { id: 'continents', label: 'Continents', icon: Layers, countKey: 'continents' },
  { id: 'countries', label: 'Countries', icon: Globe2, countKey: 'countries' },
  { id: 'uk-countries', label: 'UK Countries', icon: MapPin, countKey: 'ukCountries' },
  { id: 'uk-regions', label: 'UK Regions', icon: MapPin, countKey: 'ukRegions' },
  { id: 'us-states', label: 'US States', icon: Flag, countKey: 'usStates' },
  { id: 'us-climate-regions', label: 'US Climate Regions', icon: Flag, countKey: 'usClimateRegions' },
  { id: 'rankings', label: 'Climate Ranking', icon: Trophy },
];

type Counts = { countries: number; usStates: number; ukRegions: number; ukCountries: number; continents: number; usClimateRegions: number };
type Panels = Record<ClimateTabId, ReactNode>;

function isTabId(value: string): value is ClimateTabId {
  return TABS.some((t) => t.id === value);
}

type Ctx = {
  active: ClimateTabId;
  setActive: (id: ClimateTabId) => void;
  counts: Counts;
  panels: Panels;
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
  children,
}: {
  counts: Counts;
  panels: Panels;
  children: ReactNode;
}) {
  const [active, setActive] = useState<ClimateTabId>('editors-picks');

  useEffect(() => {
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
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <ClimateTabsCtx.Provider value={{ active, setActive: handleSetActive, counts, panels }}>
      {children}
    </ClimateTabsCtx.Provider>
  );
}

export function ClimateTabsBar() {
  const { active, setActive, counts } = useClimateTabs();
  return (
    <div
      role="tablist"
      aria-label="Climate hub sections"
      className="flex flex-wrap gap-1.5"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const count = tab.countKey ? counts[tab.countKey] : null;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-[12px] sm:text-[13px] font-medium transition-colors ${
              isActive
                ? 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]'
                : 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {count != null && (
              <span
                className={`hidden sm:inline rounded-full px-1.5 text-[10px] font-semibold ${
                  isActive ? 'bg-[#D0A65E]/20 text-[#FFF5E7]' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ClimateTabsPanels() {
  const { active, panels } = useClimateTabs();
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
