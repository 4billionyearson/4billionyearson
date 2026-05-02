import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { notFound } from 'next/navigation';
import ClimateMapCard, { type CountryAnomalyRow } from '../../../global/ClimateMapCard';
import type { ClimateMapPreset } from '../../../global/ClimateMapCard';
import {
  ALL_METRICS,
  GLOBAL_METRICS,
  USA_METRICS,
  UK_METRICS,
  isMetric,
  type MetricKey,
} from '../../../global/climate-map-metrics';

type AnomalyWindow = '1m' | '3m' | '12m';
type MapLevel = 'continents' | 'countries' | 'uk-countries' | 'uk-regions' | 'us-states' | 'us-regions';

const PRESETS: ClimateMapPreset[] = ['global', 'usa', 'uk'];
const VALID_LEVELS: MapLevel[] = ['continents', 'countries', 'uk-countries', 'uk-regions', 'us-states', 'us-regions'];
const VALID_WINDOWS: AnomalyWindow[] = ['1m', '3m', '12m'];

const PRESET_METRICS: Record<ClimateMapPreset, MetricKey[]> = {
  global: GLOBAL_METRICS,
  usa: USA_METRICS,
  uk: UK_METRICS,
};

const PRESET_PAGE: Record<ClimateMapPreset, string> = {
  global: 'https://4billionyearson.org/climate/global',
  usa: 'https://4billionyearson.org/climate/usa',
  uk: 'https://4billionyearson.org/climate/uk',
};

async function loadCountryAnomalies(): Promise<CountryAnomalyRow[]> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const raw = await readFile(p, 'utf8');
    const parsed = JSON.parse(raw);
    const rows = parsed?.countryAnomalies;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export default async function ClimateMapEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ preset: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { preset: rawPreset } = await params;
  const sp = await searchParams;
  const preset = PRESETS.includes(rawPreset as ClimateMapPreset)
    ? (rawPreset as ClimateMapPreset)
    : null;
  if (!preset) notFound();

  const metricRaw = typeof sp.metric === 'string' ? sp.metric : undefined;
  const levelRaw = typeof sp.level === 'string' ? sp.level : undefined;
  const windowRaw = typeof sp.window === 'string' ? sp.window : undefined;
  const stretchRaw = typeof sp.stretch === 'string' ? sp.stretch : undefined;

  const allowed = PRESET_METRICS[preset];
  const initialMetric: MetricKey =
    metricRaw && isMetric(metricRaw) && allowed.includes(metricRaw) ? metricRaw : 'temp-anomaly';
  const initialLevel: MapLevel | undefined =
    levelRaw && (VALID_LEVELS as string[]).includes(levelRaw) ? (levelRaw as MapLevel) : undefined;
  const initialWindow: AnomalyWindow =
    windowRaw && (VALID_WINDOWS as string[]).includes(windowRaw) ? (windowRaw as AnomalyWindow) : '1m';
  const initialAutoStretch = stretchRaw === '1' || stretchRaw === 'true';

  const countryAnomalies = preset === 'global' ? await loadCountryAnomalies() : [];

  return (
    <div className="p-3">
      <ClimateMapCard
        countryAnomalies={countryAnomalies}
        preset={preset}
        initialMetric={initialMetric}
        initialLevel={initialLevel}
        initialWindow={initialWindow}
        initialAutoStretch={initialAutoStretch}
        hideShare
      />
      <div className="mt-2 flex justify-end">
        <a
          href={`${PRESET_PAGE[preset]}#climate-map`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-[#D0A65E]/60 hover:text-[#D0A65E] transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="4 Billion Years On" className="h-4 w-4 rounded-sm opacity-60" />
          4 Billion Years On - Climate Map ↗
        </a>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return PRESETS.map((preset) => ({ preset }));
}
