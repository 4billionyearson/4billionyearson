'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Sparkles, Globe2, Flag, MapPin, Trophy, type LucideIcon } from 'lucide-react';

export type ClimateTabId = 'editors-picks' | 'countries' | 'us-states' | 'uk-regions' | 'rankings';

type TabDef = {
  id: ClimateTabId;
  label: string;
  icon: LucideIcon;
  countKey?: 'countries' | 'usStates' | 'ukRegions';
};

const TABS: TabDef[] = [
  { id: 'editors-picks', label: "Editor's Picks", icon: Sparkles },
  { id: 'countries', label: 'Countries', icon: Globe2, countKey: 'countries' },
  { id: 'us-states', label: 'US States', icon: Flag, countKey: 'usStates' },
  { id: 'uk-regions', label: 'UK Regions', icon: MapPin, countKey: 'ukRegions' },
  { id: 'rankings', label: 'Climate Ranking', icon: Trophy },
];

type Counts = { countries: number; usStates: number; ukRegions: number };
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
      className="flex gap-2 overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 h-8 text-[13px] font-medium transition-colors ${
              isActive
                ? 'border-[#D0A65E] bg-[#D0A65E] text-[#1A0E00]'
                : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-[#D0A65E]/45 hover:bg-gray-900 hover:text-[#FFF5E7]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {count != null && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-semibold ${
                  isActive ? 'bg-[#1A0E00]/15 text-[#1A0E00]' : 'bg-gray-800 text-gray-400'
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
