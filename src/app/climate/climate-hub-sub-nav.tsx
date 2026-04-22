'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Globe2, Flag, MapPin, type LucideIcon } from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  countKey?: 'countries' | 'usStates' | 'ukRegions';
};

const ITEMS: NavItem[] = [
  { id: 'editors-picks', label: "Editor's Picks", icon: Sparkles },
  { id: 'countries', label: 'Countries', icon: Globe2, countKey: 'countries' },
  { id: 'us-states', label: 'US States', icon: Flag, countKey: 'usStates' },
  { id: 'uk-regions', label: 'UK & Ireland', icon: MapPin, countKey: 'ukRegions' },
];

type Counts = { countries: number; usStates: number; ukRegions: number };

export default function ClimateHubSubNav({ counts }: { counts: Counts }) {
  const [active, setActive] = useState<string>('editors-picks');

  useEffect(() => {
    const els = ITEMS
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: y, behavior: 'smooth' });
    if (history.replaceState) {
      history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="sticky top-0 z-30 -mx-3 md:-mx-4 border-b border-[#D0A65E]/30 bg-gray-950/92 px-3 md:px-4 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
      <nav
        aria-label="Climate hub sections"
        className="flex gap-2 overflow-x-auto py-2 md:py-2.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const count = item.countKey ? counts[item.countKey] : null;
          const isActive = active === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 h-8 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'border-[#D0A65E] bg-[#D0A65E] text-[#1A0E00]'
                  : 'border-gray-800 bg-gray-900/60 text-gray-300 hover:border-[#D0A65E]/45 hover:bg-gray-900 hover:text-[#FFF5E7]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {count != null && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-semibold ${
                    isActive ? 'bg-[#1A0E00]/15 text-[#1A0E00]' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
