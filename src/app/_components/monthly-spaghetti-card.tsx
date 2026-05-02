"use client";

import React, { useEffect, useState } from 'react';
import { Thermometer, CloudRain, Sun, Snowflake } from 'lucide-react';
import MonthlySpaghettiChart, {
  type MonthlyPoint,
  type SpaghettiMetric,
  getMetricConfig,
} from './monthly-spaghetti-chart';
import ShareBar from '@/app/climate/enso/_components/ShareBar';

const TOGGLE_BASE = 'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors';
const TOGGLE_ACTIVE = 'bg-[#D0A65E]/15 border-[#D0A65E] text-[#FFF5E7]';
const TOGGLE_INACTIVE = 'bg-gray-900/60 border-gray-700 text-gray-400 hover:border-[#D0A65E]/55 hover:text-[#FFF5E7]';

const TAB_ICON: Record<SpaghettiMetric, React.ReactNode> = {
  temp: <Thermometer className="h-3.5 w-3.5" />,
  precip: <CloudRain className="h-3.5 w-3.5" />,
  sunshine: <Sun className="h-3.5 w-3.5" />,
  frost: <Snowflake className="h-3.5 w-3.5" />,
};

const TAB_LABEL: Record<SpaghettiMetric, string> = {
  temp: 'Temperature',
  precip: 'Rainfall',
  sunshine: 'Sunshine',
  frost: 'Frost',
};

const TAB_ORDER: SpaghettiMetric[] = ['temp', 'precip', 'sunshine', 'frost'];

export type SeriesMap = Partial<Record<SpaghettiMetric, MonthlyPoint[]>>;

interface MonthlySpaghettiCardProps {
  /** Series for each metric supported by this region. */
  series: SeriesMap;
  /** Region or area name shown in the heading. */
  regionName: string;
  /** Source / attribution line under the chart. */
  dataSource?: string;
  /** Initial active metric tab. Falls back to first available. */
  initialMetric?: SpaghettiMetric;
  /** Optional copy under the chart, shared across all tabs. */
  footer?: React.ReactNode;
  /** Embed slug used to construct the share URL: /climate/embed/monthly/<embedSlug>. */
  embedSlug?: string;
  /** Anchor + canonical URL for the ShareBar. When omitted ShareBar is hidden. */
  share?: { pageUrl: string; sectionId: string };
  /** Hide the ShareBar entirely (used by the embed route itself). */
  hideShare?: boolean;
  /** When true, the card chrome (border, background) is suppressed - useful inside an existing card. */
  inline?: boolean;
}

export default function MonthlySpaghettiCard({
  series,
  regionName,
  dataSource,
  initialMetric,
  footer,
  embedSlug,
  share,
  hideShare = false,
  inline = false,
}: MonthlySpaghettiCardProps) {
  const available = TAB_ORDER.filter((m) => (series[m]?.length ?? 0) > 0);
  const fallback: SpaghettiMetric = available[0] ?? 'temp';
  const [metric, setMetric] = useState<SpaghettiMetric>(
    initialMetric && available.includes(initialMetric) ? initialMetric : fallback
  );

  // If the available set changes (e.g. async hydration on a profile page),
  // make sure the active tab is still valid.
  useEffect(() => {
    if (!series[metric]?.length) {
      setMetric(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series]);

  // Scroll-to-anchor when the URL hash matches our section id but the card
  // mounted later (async profile pages).
  useEffect(() => {
    if (!share?.sectionId) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#' + share.sectionId) return;
    const el = document.getElementById(share.sectionId);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [share?.sectionId]);

  const cfg = getMetricConfig(metric);
  const cardTitle = `${regionName} – ${cfg.longLabel} – All Years`;

  // Build embed URL/code (only meaningful when the card knows its own slug).
  const embedUrl = embedSlug
    ? `https://4billionyearson.org/climate/embed/monthly/${encodeURIComponent(embedSlug)}?metric=${metric}`
    : undefined;
  const embedCode = embedUrl
    ? `<iframe\n  src="${embedUrl}"\n  width="100%" height="640"\n  style="border:none;"\n  title="${cardTitle} - 4 Billion Years On"\n></iframe>`
    : undefined;

  const wrapperClass = inline
    ? ''
    : 'bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]';

  const data = series[metric] ?? [];

  return (
    <div id={share?.sectionId} className={`${wrapperClass} scroll-mt-24`}>
      <h3 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <span className="shrink-0 mt-1 text-[#D0A65E]">{cfg.icon}</span>
        <span className="min-w-0 flex-1">{cardTitle}</span>
      </h3>
      {available.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mr-1">Metric</span>
          {available.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              aria-pressed={metric === m}
              className={`${TOGGLE_BASE} ${metric === m ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
            >
              {TAB_ICON[m]}
              {TAB_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      <MonthlySpaghettiChart
        monthlyAll={data}
        regionName={regionName}
        metric={metric}
        dataSource={dataSource}
        hideTitle
      />

      {footer && (
        <div className="text-xs text-gray-400 mt-3">{footer}</div>
      )}

      {share && !hideShare && (
        <ShareBar
          pageUrl={`${share.pageUrl}#${share.sectionId}`}
          shareText={encodeURIComponent(`${cardTitle} - live data on 4 Billion Years On`)}
          emailSubject={`${cardTitle} - 4 Billion Years On`}
          embedUrl={embedUrl}
          embedCode={embedCode}
        />
      )}
    </div>
  );
}
