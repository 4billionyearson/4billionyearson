"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { Globe2 } from 'lucide-react';
import type { default as ClimateMapType } from './ClimateMap';
import ShareBar from '@/app/climate/enso/_components/ShareBar';
import { ResponsiveSegmentedControl, ChipDropdown } from '@/app/_components/responsive-segmented-control';
import {
  METRICS,
  GLOBAL_METRICS,
  USA_METRICS,
  UK_METRICS,
  METRIC_LEVELS,
  metricSupportsLevel,
  type MetricKey,
} from './climate-map-metrics';

const ClimateMap = dynamic(() => import('./ClimateMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] md:h-[500px] w-full rounded-xl bg-gray-900/40 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
    </div>
  ),
}) as ComponentType<React.ComponentProps<typeof ClimateMapType>>;

export interface CountryAnomalyRow {
  iso3: string;
  name: string;
  anomaly: number;
  value: number;
  monthLabel: string;
  rank: number;
  total: number;
  anomaly1m?: number | null;
  label1m?: string | null;
  anomaly3m?: number | null;
  label3m?: string | null;
  anomaly12m?: number | null;
  label12m?: string | null;
}

type AnomalyWindow = '1m' | '3m' | '12m';
type MapLevel = 'continents' | 'countries' | 'uk-countries' | 'uk-regions' | 'us-states' | 'us-regions';

const WINDOW_OPTS = [
  { key: '1m', label: '1 Month' },
  { key: '3m', label: '3 Months' },
  { key: '12m', label: '12 Months' },
] as const;

const LEVEL_OPTS: Array<{ key: MapLevel; label: string }> = [
  { key: 'continents', label: 'Continents' },
  { key: 'countries', label: 'Countries' },
  { key: 'uk-countries', label: 'UK Countries' },
  { key: 'uk-regions', label: 'UK Regions' },
  { key: 'us-states', label: 'US States' },
  { key: 'us-regions', label: 'US Climate Regions' },
];

export type ClimateMapPreset = 'global' | 'usa' | 'uk';

const PRESET_LEVELS: Record<ClimateMapPreset, MapLevel[]> = {
  global: ['continents', 'countries', 'uk-countries', 'uk-regions', 'us-states', 'us-regions'],
  usa: ['us-states', 'us-regions'],
  uk: ['uk-countries', 'uk-regions'],
};

const PRESET_METRICS: Record<ClimateMapPreset, MetricKey[]> = {
  global: GLOBAL_METRICS,
  usa: USA_METRICS,
  uk: UK_METRICS,
};

const PRESET_INITIAL_LEVEL: Record<ClimateMapPreset, MapLevel> = {
  global: 'continents',
  usa: 'us-states',
  uk: 'uk-countries',
};

const PRESET_TITLE: Record<ClimateMapPreset, string> = {
  global: 'Climate Map – Global',
  usa: 'Climate Map – USA',
  uk: 'Climate Map – UK',
};

export default function ClimateMapCard({
  countryAnomalies,
  initialWindow = '1m',
  initialLevel,
  initialMetric = 'temp-anomaly',
  initialAutoStretch = false,
  preset = 'global',
  title,
  share,
  hideShare = false,
}: {
  countryAnomalies: CountryAnomalyRow[];
  initialWindow?: AnomalyWindow;
  initialLevel?: MapLevel;
  initialMetric?: MetricKey;
  initialAutoStretch?: boolean;
  preset?: ClimateMapPreset;
  title?: string;
  /** When provided, render a ShareBar that links to the given page anchor. */
  share?: { pageUrl: string; sectionId: string };
  /** Used by the embed route to suppress the ShareBar. */
  hideShare?: boolean;
}) {
  const cardTitle = title ?? PRESET_TITLE[preset];
  const availableLevels = PRESET_LEVELS[preset];
  const availableMetrics = PRESET_METRICS[preset];
  const [anomalyWindow, setAnomalyWindow] = useState<AnomalyWindow>(initialWindow);
  const [level, setLevel] = useState<MapLevel>(initialLevel ?? PRESET_INITIAL_LEVEL[preset]);
  const [metric, setMetric] = useState<MetricKey>(initialMetric);
  const [autoStretch, setAutoStretch] = useState<boolean>(initialAutoStretch);

  // When the page is opened with a hash that targets this card (e.g.
  // /climate/usa#climate-map from a Share link), the browser tries to scroll
  // to the anchor at parse time, but on async-rendered pages the card
  // doesn't exist yet. Re-run scrollIntoView once the card mounts so the
  // user lands on the map regardless of when the parent finishes loading.
  useEffect(() => {
    if (!share?.sectionId) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#' + share.sectionId) return;
    const el = document.getElementById(share.sectionId);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [share?.sectionId]);

  // If the current (metric, level) combination has no data (e.g. user
  // switches Metric to one not supported at the active Level), pick the
  // first supported level for that metric within this preset's allowed
  // levels so the map never renders empty.
  useEffect(() => {
    if (metricSupportsLevel(metric, level)) return;
    const fallback = METRIC_LEVELS[metric].find((l) => availableLevels.includes(l));
    if (fallback && fallback !== level) setLevel(fallback);
  }, [metric, level, availableLevels]);

  // For the global preset we need countryAnomalies to power the headline
  // tooltip; for usa/uk presets the data comes from rankings.json so an
  // empty array is fine (we still pass it through to ClimateMap).
  if (preset === 'global' && (!countryAnomalies || countryAnomalies.length === 0)) return null;

  const visibleLevels = LEVEL_OPTS.filter((opt) => availableLevels.includes(opt.key));

  // Build embed URL reflecting the current toggle state so embedded copies
  // open with the same view the user is sharing.
  const embedUrl = `https://4billionyearson.org/climate/embed/map/${preset}?metric=${encodeURIComponent(metric)}&level=${encodeURIComponent(level)}&window=${encodeURIComponent(anomalyWindow)}${autoStretch ? '&stretch=1' : ''}`;
  const embedCode = `<iframe\n  src="${embedUrl}"\n  width="100%" height="640"\n  style="border:none;"\n  title="${cardTitle} - 4 Billion Years On"\n></iframe>`;

  return (
    <div id={share?.sectionId} className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E] scroll-mt-24">
      <h3 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <Globe2 className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
        <span className="min-w-0 flex-1">{cardTitle}</span>
      </h3>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {visibleLevels.length > 1 && (
          <ChipDropdown
            label="Level"
            ariaLabel="Map level"
            value={level}
            onChange={(k) => setLevel(k as MapLevel)}
            options={visibleLevels.map((opt) => ({
              key: opt.key,
              label: opt.label,
              disabled: !metricSupportsLevel(metric, opt.key),
              title: metricSupportsLevel(metric, opt.key) ? undefined : `${METRICS[metric].shortLabel} has no data at this level`,
            }))}
          />
        )}
        <ChipDropdown
          label="Metric"
          ariaLabel="Map metric"
          value={metric}
          onChange={(k) => setMetric(k as MetricKey)}
          options={availableMetrics.map((key) => ({
            key,
            label: METRICS[key].shortLabel,
            disabled: !METRIC_LEVELS[key].includes(level),
            title: METRIC_LEVELS[key].includes(level) ? undefined : `No ${METRICS[key].shortLabel.toLowerCase()} data at the current level`,
          }))}
        />
        <ResponsiveSegmentedControl
          forcePills
          label="Window"
          ariaLabel="Anomaly window"
          value={anomalyWindow}
          onChange={(k) => setAnomalyWindow(k as AnomalyWindow)}
          options={WINDOW_OPTS.map((o) => ({ key: o.key, label: o.label }))}
        />
      </div>
      <ClimateMap
        countryAnomalies={countryAnomalies}
        window={anomalyWindow}
        level={level}
        metric={metric}
        autoStretch={autoStretch}
        onToggleAutoStretch={() => setAutoStretch((v) => !v)}
      />
      <p className="text-xs text-gray-500 mt-3">
        {preset === 'uk' ? (
          <>Source: Met Office UK Regional &amp; National series (Tmean, Rainfall, Sunshine, Air Frost) &copy; Crown copyright. Anomalies are vs the 1961&ndash;1990 baseline (temperature) or 1991&ndash;2020 (rainfall, sunshine, frost). See <a className="underline hover:text-[#D0A65E]" href="/climate/methodology">methodology</a>.</>
        ) : preset === 'usa' ? (
          <>Source: NOAA Climate at a Glance &mdash; US states &amp; climate regions (tavg, pcp). Anomalies are vs the 1961&ndash;1990 baseline (temperature) or 1991&ndash;2020 (rainfall). See <a className="underline hover:text-[#D0A65E]" href="/climate/methodology">methodology</a>.</>
        ) : (
          <>Source: NOAA Climate at a Glance (countries &amp; continents) &middot; Met Office (UK) &middot; US states &amp; climate regions. Temperature anomalies are vs the 1961&ndash;1990 baseline. See <a className="underline hover:text-[#D0A65E]" href="/climate/methodology">methodology</a>.</>
        )}
      </p>
      {share && !hideShare && (
        <ShareBar
          pageUrl={`${share.pageUrl}#${share.sectionId}`}
          shareText={encodeURIComponent(`${cardTitle} - live temperature, rainfall and more on 4 Billion Years On`)}
          emailSubject={`${cardTitle} - 4 Billion Years On`}
          embedUrl={embedUrl}
          embedCode={embedCode}
        />
      )}
    </div>
  );
}
