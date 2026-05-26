"use client";

import React, { useMemo, useState } from 'react';
import ClimateSpiralCard, { type ClimateSpiralHudMetric } from '@/app/_components/climate-spiral-card';
import { DEFAULT_SCHEME } from '@/lib/climate/season-scheme';
import type { SeriesMap } from '@/app/_components/monthly-spaghetti-card';

// Tabbed Helix card for the Global page. The world has multiple useful
// temperature series (land+ocean, land-only, NH, SH); a single Helix with a
// tab strip is friendlier than four side-by-side dials.
export interface HelixSeriesTab {
  key: string;
  label: string;
  series: SeriesMap;
  dataSource: string;
  regionName: string;
  embedSlug: string;
  parisReference?: { monthly: number[]; label?: string };
  supplementalHudMetrics?: ClimateSpiralHudMetric[];
  orbitalOverlay?: {
    label: string;
    unit: string;
    color: string;
    note?: string;
    series: { year: number; month: number; value: number }[];
  };
}

export default function GlobalHelixCard({
  tabs,
  provisionalAfterMonth,
  hideUpdateLink = false,
}: {
  tabs: HelixSeriesTab[];
  provisionalAfterMonth?: { year: number; month: number } | null;
  hideUpdateLink?: boolean;
}) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? '');
  const active = useMemo(() => tabs.find((t) => t.key === activeKey) ?? tabs[0], [tabs, activeKey]);
  if (!active) return null;

  // Global / hemispheric series mix temperate NH + SH and tropical regions, so
  // the season wedges are not meaningful — force the aseasonal scheme so the
  // dial just shows the ring + monthly traces without a 4-season overlay.
  const scheme = active.key === 'nh' ? { ...DEFAULT_SCHEME, kind: 'temperate-NH' as const }
    : active.key === 'sh' ? { kind: 'temperate-SH' as const, isNH: false, isWetDry: false, isAseasonal: false, seasonCount: 4 as const }
    : { kind: 'aseasonal' as const, isNH: true, isWetDry: false, isAseasonal: true, seasonCount: 1 as const };

  const renderSeriesControl = (floating: boolean) => (
    <div
      role="group"
      aria-label="Series"
      className={`inline-flex items-center rounded-full border overflow-hidden${floating ? ' backdrop-blur-sm' : ''}`}
      style={{ borderColor: '#D0A65E8c', background: floating ? 'rgba(11,14,22,0.72)' : '#D0A65E1f' }}
    >
      {tabs.map((t, index) => {
        const isActive = t.key === active.key;
        return (
          <React.Fragment key={t.key}>
            {index > 0 && (
              <div aria-hidden className="h-3.5 w-px self-center shrink-0" style={{ background: '#D0A65E55' }} />
            )}
            <button
              type="button"
              onClick={() => setActiveKey(t.key)}
              className="inline-flex h-7 items-center gap-1 px-3 text-[12px] font-medium transition-colors hover:bg-white/[0.04]"
              style={{ color: isActive ? '#FFF5E7' : '#9CA3AF' }}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{
                  background: isActive ? '#D0A65E' : 'transparent',
                  border: `1px solid ${isActive ? '#D0A65E' : '#4B5563'}`,
                }}
              />
              <span className="leading-none whitespace-nowrap">{t.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <ClimateSpiralCard
      key={active.key}
      series={active.series}
      regionName={active.regionName}
      dataSource={active.dataSource}
      provisionalAfterMonth={provisionalAfterMonth}
      embedSlug={active.embedSlug}
      share={{ pageUrl: 'https://4billionyearson.org/climate/helix', sectionId: 'climate-spiral' }}
      showEnso
      chartOverlayAccessory={tabs.length > 1 ? renderSeriesControl(true) : undefined}
      chartInlineAccessory={tabs.length > 1 ? renderSeriesControl(false) : undefined}
      seasonScheme={scheme}
      parisReference={active.parisReference}
      tempScaleMode="auto"
      supplementalHudMetrics={active.supplementalHudMetrics}
      orbitalOverlay={active.orbitalOverlay}
      hideUpdateLink={hideUpdateLink}
    />
  );
}
