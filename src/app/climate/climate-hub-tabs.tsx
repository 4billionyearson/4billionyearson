'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Sparkles, Globe2, Flag, MapPin, Trophy, type LucideIcon } from 'lucide-react';

type TabId = 'editors-picks' | 'countries' | 'us-states' | 'uk-regions' | 'rankings';

type TabDef = {
  id: TabId;
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

type Panels = Record<TabId, ReactNode>;

function isTabId(value: string): value is TabId {
  return TABS.some((t) => t.id === value);
}

export default function ClimateHubTabs({ counts, panels }: { counts: Counts; panels: Panels }) {
  const [active, setActive] = useState<TabId>('editors-picks');

  // Sync with URL hash on mount + on back/forward
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && isTabId(hash)) setActive(hash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const handleSelect = (id: TabId) => {
    setActive(id);
    if (history.replaceState) history.replaceState(null, '', `#${id}`);
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Climate hub sections"
        className="sticky top-0 z-30 -mx-3 md:-mx-4 border-b border-[#D0A65E]/30 bg-gray-950/92 px-3 md:px-4 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
      >
        <nav
          className="flex gap-2 overflow-x-auto py-2 md:py-2.5"
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
                onClick={() => handleSelect(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 h-8 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'border-[#D0A65E] bg-[#D0A65E] text-[#1A0E00]'
                    : 'border-gray-800 bg-gray-900/60 text-gray-300 hover:border-[#D0A65E]/45 hover:bg-gray-900 hover:text-[#FFF5E7]'
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
        </nav>
      </div>

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
