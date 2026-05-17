'use client';

/**
 * ENSO Global Impact Tracker
 * ──────────────────────────
 * A scrubbable timeline of the ENSO ONI index (1950→present) tied to a
 * world choropleth showing per-country temperature or rainfall anomalies
 * for the selected year. Four Niño SST regions are overlaid on top of
 * the equatorial Pacific so the reader can see *where* ENSO sits while
 * watching its global imprint.
 *
 * Data:
 *   - `/data/climate/enso-impact.json` — pre-computed anomalies per
 *     country, US state and UK region. Built by
 *     `scripts/build-enso-impact.mjs`. Contains two windows:
 *       annual — Jan–Dec mean (°C) / sum (% of baseline)
 *       mam    — Mar–May,  the lagged spring window after a DJF ENSO peak
 *   - ONI history is read from the `oniHistory` prop passed in from the
 *     ENSO page (already fetched there).
 *
 * Anomaly baseline: 1961–1990 (locked in build script).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Play, Pause, Thermometer, CloudRain } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

/* ── Small in-app tooltip — avoids browser-native title= overflow issues — */
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-md border border-gray-700/80 bg-gray-900/95 px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug text-gray-200 shadow-xl"
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/* ── Shared toggle-button design tokens (matches Climate Helix style) ─── */
const TOGGLE_BASE = 'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-mono transition-colors';
const TOGGLE_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]';
const TOGGLE_INACTIVE = 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';

const FOOTPRINT_PREFS_KEY = 'enso-footprint-prefs';
function loadFootprintPrefs(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(FOOTPRINT_PREFS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

type OniRow = { season: string; year: number; anom: number };

type ImpactData = {
  baseline: [number, number];
  years: number[];
  countryNames: Record<string, string>; // ISO3 → geojson feature.name
  annual: {
    temp:   { country: Record<string, (number | null)[]> };
    precip: { country: Record<string, (number | null)[]> };
  };
  mam: {
    temp:   { country: Record<string, (number | null)[]> };
    precip: { country: Record<string, (number | null)[]> };
  };
};

type Metric = 'temp' | 'precip';
type AggWindow = 'annual' | 'mam';
type Mode = 'year' | 'corr' | 'simulate' | 'forecast';
type TempLayerMode = 'signal' | 'total';

/** Forecast-related types — mirror the shapes already on `EnsoSnapshot` in page.tsx. */
type ForecastSeasonProp = {
  season: string;       // 'DJF'..'NDJ'
  label: string;        // e.g. 'Oct–Dec 2026'
  pLaNina: number;      // %
  pNeutral: number;     // %
  pElNino: number;      // %
  anchorYear: number;   // calendar year of the season's reference month
  modelOni?: number | null; // IRI plume multi-model mean Niño-3.4 anomaly, if available
};

type CnnForecastProp = {
  issueYearMonth: number;        // YYYYMM the CNN forecast was issued
  points: { yyyymm: number; nino34: number }[];
};

type ForecastSource = 'noaa' | 'cnn';

const ENSO_GEOJSON_NAME_ALIASES: Record<string, string> = {
  'Ivory Coast': "Côte d'Ivoire",
  'Democratic Republic of the Congo': 'Dem. Rep. Congo',
  Eswatini: 'eSwatini',
};

function mapEnsoCountryName(name: string): string {
  return ENSO_GEOJSON_NAME_ALIASES[name] ?? name;
}

/** 12 NOAA-style overlapping 3-month seasonal windows, in calendar order.
 *  Used by the season slider in Composite mode. */
const SEASONS = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'] as const;
type Season = typeof SEASONS[number];

/** Human-readable month range labels for the seasons. */
const SEASON_LABEL: Record<Season, string> = {
  DJF: 'Dec–Feb', JFM: 'Jan–Mar', FMA: 'Feb–Apr', MAM: 'Mar–May',
  AMJ: 'Apr–Jun', MJJ: 'May–Jul', JJA: 'Jun–Aug', JAS: 'Jul–Sep',
  ASO: 'Aug–Oct', SON: 'Sep–Nov', OND: 'Oct–Dec', NDJ: 'Nov–Jan',
};

type SimPhase = {
  id: string;
  season: Season;
  lag: number;
  offset: number;
  phase: 'build' | 'peak' | 'after';
};

const SIM_PHASES: SimPhase[] = [
  { id: 'JJA_BUILD', season: 'JJA', lag: 0, offset: -6, phase: 'build' },
  { id: 'JAS_BUILD', season: 'JAS', lag: 0, offset: -5, phase: 'build' },
  { id: 'ASO_BUILD', season: 'ASO', lag: 0, offset: -4, phase: 'build' },
  { id: 'SON_BUILD', season: 'SON', lag: 0, offset: -3, phase: 'build' },
  { id: 'OND_BUILD', season: 'OND', lag: 0, offset: -2, phase: 'build' },
  { id: 'NDJ_BUILD', season: 'NDJ', lag: 0, offset: -1, phase: 'build' },
  { id: 'DJF_PEAK', season: 'DJF', lag: 1, offset: 0, phase: 'peak' },
  { id: 'JFM_AFTER', season: 'JFM', lag: 1, offset: 1, phase: 'after' },
  { id: 'FMA_AFTER', season: 'FMA', lag: 1, offset: 2, phase: 'after' },
  { id: 'MAM_AFTER', season: 'MAM', lag: 1, offset: 3, phase: 'after' },
  { id: 'AMJ_AFTER', season: 'AMJ', lag: 1, offset: 4, phase: 'after' },
  { id: 'MJJ_AFTER', season: 'MJJ', lag: 1, offset: 5, phase: 'after' },
  { id: 'JJA_AFTER', season: 'JJA', lag: 1, offset: 6, phase: 'after' },
  { id: 'JAS_AFTER', season: 'JAS', lag: 1, offset: 7, phase: 'after' },
];

const DEFAULT_SIM_PHASE_ID = 'MAM_AFTER';

function simPhaseIdFromLegacySeason(season: Season | undefined): string {
  switch (season) {
    case 'DJF': return 'DJF_PEAK';
    case 'JFM': return 'JFM_AFTER';
    case 'FMA': return 'FMA_AFTER';
    case 'MAM': return 'MAM_AFTER';
    case 'AMJ': return 'AMJ_AFTER';
    case 'MJJ': return 'MJJ_AFTER';
    case 'JJA': return 'JJA_AFTER';
    case 'JAS': return 'JAS_AFTER';
    case 'ASO': return 'ASO_BUILD';
    case 'SON': return 'SON_BUILD';
    case 'OND': return 'OND_BUILD';
    case 'NDJ': return 'NDJ_BUILD';
    default: return DEFAULT_SIM_PHASE_ID;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Colour scale — diverging red/blue, transparent at zero so neutral land
 *  fades to the basemap.
 *  Year mode — temp: ±3°C, rain: ±100% (inverted so drought=red).
 *  Corr mode — Pearson r vs that year's peak ONI; scale ±0.6.
 *    For temp:  r > 0 → warmer with El Niño   → red
 *    For rain:  r > 0 → wetter with El Niño   → blue (sign flipped)
 * ───────────────────────────────────────────────────────────────────────── */
function fillFromValue(
  v: number | null | undefined,
  metric: Metric,
  mode: Mode,
): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return 'rgba(120,120,120,0.10)';
  // In correlation mode, fade out countries whose |r| is below a weak-link
  // threshold (≈ not statistically meaningful). This is the visualisation
  // equivalent of the stippling/hatching used on standard NOAA/IRI ENSO
  // teleconnection maps to suppress noise.
  if (mode === 'corr' && Math.abs(v) < 0.2) return 'rgba(120,120,120,0.08)';
  // Composite values are in the same physical units as Year mode (°C / %)
  // so reuse the Year-mode scale.
  const max = (mode === 'corr')
    ? 0.6
    : (metric === 'temp' ? 3 : 100);
  const x = metric === 'precip' ? -v : v;
  const t = Math.max(-1, Math.min(1, x / max));
  if (t > 0) {
    const a = 0.15 + 0.65 * t;
    return `rgba(244,63,94,${a.toFixed(2)})`; // rose-500 = El Niño
  } else {
    const a = 0.15 + 0.65 * (-t);
    return `rgba(14,165,233,${a.toFixed(2)})`; // sky-500 = La Niña
  }
}

/** For a given calendar year, find the most extreme (by |anom|) seasonal ONI
 *  value in the history. Used to colour the four Niño rectangles for the
 *  scrubbed year. */
function peakOniForYear(history: OniRow[], year: number): number {
  let peak = 0;
  for (const r of history) {
    if (r.year !== year) continue;
    if (Math.abs(r.anom) > Math.abs(peak)) peak = r.anom;
  }
  return peak;
}

/** Convert a peak ONI anomaly into an ENSO state label. */
function ensoState(anom: number): 'El Niño' | 'La Niña' | 'Neutral' {
  if (anom >= 0.5) return 'El Niño';
  if (anom <= -0.5) return 'La Niña';
  return 'Neutral';
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Niño 1+2 / 3 / 3.4 / 4 region boxes.
 *  Longitudes are kept in standard Leaflet -180..180. Niño 4 (160°E–10°E
 *  of antimeridian ≡ 160..210 in 0–360 convention) crosses the dateline, so
 *  it is rendered as TWO rectangles sharing the same style and label.
 * ─────────────────────────────────────────────────────────────────── */
const NINO_REGIONS: Array<{
  key: string;
  label: string;
  bounds: [[number, number], [number, number]];
  emphasised?: boolean;
  showLabel?: boolean; // only one rectangle of a split pair shows the tooltip label
}> = [
  // Niña 4 splits across the antimeridian.
  { key: 'nino4-west',  label: 'Niño 4',   bounds: [[-5, 160], [5, 180]],   showLabel: true },
  { key: 'nino4-east',  label: 'Niño 4',   bounds: [[-5, -180], [5, -150]] },
  { key: 'nino34',      label: 'Niño 3.4', bounds: [[-5, -170], [5, -120]], emphasised: true, showLabel: true },
  { key: 'nino3',       label: 'Niño 3',   bounds: [[-5, -150], [5, -90]],  showLabel: true },
  { key: 'nino12',      label: 'Niño 1+2', bounds: [[-10, -90], [0, -80]],  showLabel: true },
];

/* ─────────────────────────────────────────────────────────────────────────
 *  Curated shortlist of "classic teleconnection" countries that get a
 *  permanent number label drawn on top of the choropleth. Lon values are
 *  pre-shifted by −360 for places east of −25° so the labels sit on the
 *  Pacific-centred copy of the world (matching geoEast above).
 * ───────────────────────────────────────────────────────────────────────── */
// Classic ENSO teleconnection countries that get permanent numeric data badges
// on the map.  One entry per major world region, prioritising countries with
// strong, well-documented teleconnection signals and non-overlapping placement.
// Names must match the GeoJSON feature `name` property (Natural Earth).
// Lon values east of ~−15° are shifted by −360 so labels sit on the
// Pacific-centred copy of the world (see geoEast / projectToPacificView).
const LABELED_PLACES: Array<{ name: string; lat: number; lon: number }> = [
  // ── North America ──────────────────────────────────────────────────────
  { name: 'Canada',                   lat: 57,  lon: -97  },          // boreal warming
  { name: 'United States of America', lat: 39,  lon: -100 },
  { name: 'Mexico',                   lat: 23,  lon: -102 },
  // ── South America ──────────────────────────────────────────────────────
  { name: 'Brazil',                   lat: -5,  lon: -40  },          // NE Brazil drought
  { name: 'Peru',                     lat: -6,  lon: -76  },          // Niño coast
  { name: 'Argentina',                lat: -34, lon: -62  },
  // ── Europe / Russia ────────────────────────────────────────────────────
  { name: 'United Kingdom',           lat: 53,  lon: -2  - 360 },     // -362
  { name: 'Russia',                   lat: 60,  lon: 97  - 360 },     // -263 — Siberian warming
  // ── Africa ─────────────────────────────────────────────────────────────
  { name: 'Egypt',                    lat: 27,  lon: 30  - 360 },     // -330 — North Africa
  { name: 'Nigeria',                  lat: 13,  lon: 8   - 360 },     // -352 — West Africa / Sahel
  { name: 'Kenya',                    lat: 0,   lon: 38  - 360 },     // -322 — East Africa (El Niño → wetter)
  { name: 'South Africa',             lat: -29, lon: 24  - 360 },     // -336 — Southern Africa (El Niño → drier)
  // ── Middle East / Central Asia ─────────────────────────────────────────
  { name: 'Saudi Arabia',             lat: 22,  lon: 45  - 360 },     // -315
  { name: 'Kazakhstan',               lat: 47,  lon: 67  - 360 },     // -293 — Central Asia warming
  // ── South / East Asia ──────────────────────────────────────────────────
  { name: 'India',                    lat: 22,  lon: 78  - 360 },     // -282 — monsoon suppression
  { name: 'China',                    lat: 35,  lon: 105 - 360 },     // -255
  { name: 'Japan',                    lat: 36,  lon: 138 - 360 },     // -222
  // ── Southeast Asia / Oceania ───────────────────────────────────────────
  { name: 'Indonesia',                lat: -2,  lon: 118 - 360 },     // -242 — strongest El Niño drought
  { name: 'Philippines',              lat: 13,  lon: 122 - 360 },     // -238
  { name: 'Australia',                lat: -33, lon: 135 - 360 },     // -225 — El Niño → drought
];

// Reduced badge set for mobile — 10 well-spaced countries with the clearest
// ENSO signals, one per major region to avoid crowding the narrow viewport.
const MOBILE_LABELED_NAMES = new Set([
  'Canada', 'United States of America', 'Peru',
  'Russia', 'Kenya', 'India', 'Indonesia', 'Australia', 'South Africa',
]);

function labelTextFor(
  v: number | null | undefined,
  metric: Metric,
  mode: Mode,
): string | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  if (mode === 'corr') {
    if (Math.abs(v) < 0.2) return null; // hide weak r — matches the fade
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
  }
  // For composite + year (physical units) hide values that are essentially
  // zero so labels don't crowd a near-neutral map.
  if (metric === 'temp') {
    if (Math.abs(v) < 0.15) return null;
    return `${v >= 0 ? '+' : ''}${v.toFixed(1)}°`;
  }
  if (Math.abs(v) < 3) return null;
  return `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Dynamic Leaflet inner — must not SSR. Re-renders the GeoJSON choropleth
 *  and the four Niño rectangles when the parent updates `year`, `values`
 *  or `ensoAnom`. The map container itself never remounts.
 * ───────────────────────────────────────────────────────────────────────── */
type InnerProps = {
  values: Record<string, number | null>; // featureName → anomaly OR correlation
  metric: Metric;
  mode: Mode;
  year: number;
  ensoAnom: number;
  isMobile: boolean;
  onHover: (info: { name: string; value: number | null } | null) => void;
};

// Pacific-centred label positions.
// Eastern-hemisphere longitudes use (standard_lon − 360) so they fall inside
// the Leaflet view that is centred at −205° longitude.
const PACIFIC_CONTINENT_LABELS: { name: string; pos: [number, number] }[] = [
  { name: 'North America', pos: [47, -100] },
  { name: 'South America', pos: [-24, -100] },
  { name: 'Europe',        pos: [54, 15 - 360] },   // −345
  { name: 'Africa',        pos: [3,  28 - 360] },   // −332
  { name: 'Asia',          pos: [40, 115 - 360] },  // −245
  { name: 'Oceania',       pos: [-22, 134 - 360] }, // −226
];
// Countries shown at the intermediate zoom level (zoom 2.4–3.8).
// Keep to the largest / most climatically relevant nations.
// Names here must match the GeoJSON `name` property (Natural Earth full names),
// because allCountryLabels is now derived from the projected GeoJSON centroids.
const MAJOR_PACIFIC_COUNTRIES = new Set([
  // Americas
  'Canada', 'United States of America', 'Mexico', 'Brazil', 'Argentina', 'Peru', 'Colombia',
  // Europe / Russia
  'Russia', 'United Kingdom', 'France', 'Germany', 'Spain', 'Italy', 'Ukraine', 'Poland',
  // Africa
  'Egypt', 'Nigeria', 'Ethiopia', 'South Africa', 'Kenya', 'Algeria', 'Sudan', 'Tanzania',
  // Middle East / Central Asia
  'Saudi Arabia', 'Iran', 'Kazakhstan', 'Iraq', 'Turkey',
  // Asia
  'China', 'India', 'Japan', 'Pakistan', 'Bangladesh', 'Indonesia', 'Philippines',
  // Oceania
  'Australia', 'New Zealand',
]);

// NOTE: Pacific view maxBounds east edge is at ~−15°. Any label with a
// standard western-hemisphere longitude > −15° (UK, Spain, Ireland, Morocco,
// Ghana) must subtract 360 so it falls inside the bounds at −361…−366 etc.
const PACIFIC_COUNTRY_LABELS: { name: string; pos: [number, number] }[] = [
  // Americas (standard negative lons are within bounds)
  { name: 'Canada',      pos: [57,  -97] },
  { name: 'USA',         pos: [38,  -98] },
  { name: 'Mexico',      pos: [23, -103] },
  { name: 'Cuba',        pos: [22,  -79] },
  { name: 'Colombia',    pos: [4,   -73] },
  { name: 'Venezuela',   pos: [8,   -66] },
  { name: 'Ecuador',     pos: [-2,  -78] },
  { name: 'Peru',        pos: [-9,  -75] },
  { name: 'Brazil',      pos: [-10, -53] },
  { name: 'Bolivia',     pos: [-17, -65] },
  { name: 'Chile',       pos: [-30, -71] },
  { name: 'Argentina',   pos: [-34, -65] },
  // Europe — all need -360 offset; UK/Spain/Ireland/Iceland too (> -15°)
  { name: 'Iceland',     pos: [65, -19 - 360] },  // -379
  { name: 'UK',          pos: [54,  -2 - 360] },  // -362
  { name: 'Ireland',     pos: [53,  -8 - 360] },  // -368
  { name: 'Spain',       pos: [40,  -4 - 360] },  // -364
  { name: 'Portugal',    pos: [39,  -8 - 360] },  // -368
  { name: 'France',      pos: [47,  2 - 360] },   // -358
  { name: 'Germany',     pos: [51, 10 - 360] },   // -350
  { name: 'Poland',      pos: [52, 20 - 360] },   // -340
  { name: 'Sweden',      pos: [62, 16 - 360] },   // -344
  { name: 'Norway',      pos: [65, 10 - 360] },   // -350
  { name: 'Ukraine',     pos: [49, 32 - 360] },   // -328
  { name: 'Romania',     pos: [46, 25 - 360] },   // -335
  { name: 'Italy',       pos: [43, 12 - 360] },   // -348
  { name: 'Turkey',      pos: [39, 35 - 360] },   // -325
  // Africa — Morocco/Ghana > -15° need -360 offset
  { name: 'Morocco',     pos: [31,  -6 - 360] },  // -366
  { name: 'Algeria',     pos: [28,  3 - 360] },   // -357
  { name: 'Libya',       pos: [27, 17 - 360] },   // -343
  { name: 'Egypt',       pos: [27, 30 - 360] },   // -330
  { name: 'Sudan',       pos: [15, 30 - 360] },   // -330
  { name: 'Nigeria',     pos: [9,   8 - 360] },   // -352
  { name: 'Ethiopia',    pos: [9,  40 - 360] },   // -320
  { name: 'Ghana',       pos: [8,  -1 - 360] },   // -361
  { name: 'Kenya',       pos: [0,  38 - 360] },   // -322
  { name: 'DR Congo',    pos: [-4, 24 - 360] },   // -336
  { name: 'Tanzania',    pos: [-6, 35 - 360] },   // -325
  { name: 'Angola',      pos: [-12, 18 - 360] },  // -342
  { name: 'Mozambique',  pos: [-15, 35 - 360] },  // -325
  { name: 'S. Africa',   pos: [-29, 25 - 360] },  // -335
  { name: 'Madagascar',  pos: [-19, 47 - 360] },  // -313
  // Asia
  { name: 'Russia',      pos: [62, 97 - 360] },   // -263
  { name: 'Kazakhstan',  pos: [47, 67 - 360] },   // -293
  { name: 'Iran',        pos: [32, 54 - 360] },   // -306
  { name: 'Saudi Arabia',pos: [24, 45 - 360] },   // -315
  { name: 'Pakistan',    pos: [30, 70 - 360] },   // -290
  { name: 'India',       pos: [22, 78 - 360] },   // -282
  { name: 'Bangladesh',  pos: [24, 90 - 360] },   // -270
  { name: 'Myanmar',     pos: [20, 96 - 360] },   // -264
  { name: 'China',       pos: [35, 103 - 360] },  // -257
  { name: 'Thailand',    pos: [15, 101 - 360] },  // -259
  { name: 'Vietnam',     pos: [16, 107 - 360] },  // -253
  { name: 'Philippines', pos: [13, 122 - 360] },  // -238
  { name: 'Malaysia',    pos: [3,  110 - 360] },  // -250
  { name: 'Indonesia',   pos: [-2, 116 - 360] },  // -244
  { name: 'S. Korea',    pos: [36, 128 - 360] },  // -232
  { name: 'Japan',       pos: [36, 138 - 360] },  // -222
  // Oceania
  { name: 'Papua N.G.',  pos: [-6,  143 - 360] }, // -217
  { name: 'Australia',   pos: [-25, 134 - 360] }, // -226
  { name: 'New Zealand', pos: [-42, 172 - 360] }, // -188
];

const Inner = dynamic<InnerProps>(
  () => Promise.all([
    import('react-leaflet'),
    import('leaflet'),
    import('../../_components/world-map-shell'),
  ]).then(([mod, L, wms]) => {
    const { GeoJSON, Rectangle, Tooltip, Marker, useMap, useMapEvents } = mod;
    // dynamic import returns the namespace; pull the actual leaflet module out.
    const Lm: any = (L as any).default || L;
    const { WorldMapShell, projectToPacificView } = wms as any;
    type FC = GeoJSON.FeatureCollection;
    type Feature = GeoJSON.Feature;

    // Zoom-responsive continent → country labels.
    // Three tiers: ≤2.4 = continents | 2.4–3.8 = major countries | >3.8 = all countries
    // allCountryLabels is derived dynamically from the projected GeoJSON centroids
    // so every country is covered, not just the ~60 hardcoded entries.
    // Implemented imperatively (layerGroup + clearLayers) so that label removal
    // on zoom-out is instant — React reconciliation during an active Leaflet
    // zoom animation is unreliable for marker unmounting.
    function PacificMapLabels({ allCountryLabels }: { allCountryLabels: { name: string; pos: [number, number] }[] }) {
      const map = useMap();
      useEffect(() => {
        const group = Lm.layerGroup().addTo(map);
        let lastTier = -1;

        const rebuild = () => {
          const z = map.getZoom();
          const tier = z <= 2.4 ? 0 : z <= 3.8 ? 1 : 2;
          if (tier === lastTier) return; // no tier change — skip work
          lastTier = tier;
          group.clearLayers();
          const isCont = tier === 0;
          const isMajor = tier === 1;
          const items = isCont
            ? PACIFIC_CONTINENT_LABELS
            : isMajor
              ? allCountryLabels.filter(({ name }) => MAJOR_PACIFIC_COUNTRIES.has(name))
              : allCountryLabels;
          const cls = isCont ? 'continent-label-dark' : 'country-label-dark';
          const fz  = isCont ? 11 : isMajor ? 10 : 9;
          items.forEach(({ name, pos }) => {
            Lm.marker(pos as [number, number], {
              interactive: false,
              icon: Lm.divIcon({
                className: cls,
                html: `<span style="font-size:${fz}px">${name}</span>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
              }),
            }).addTo(group);
          });
        };

        rebuild();
        map.on('zoom zoomend moveend', rebuild);
        return () => {
          map.off('zoom zoomend moveend', rebuild);
          group.remove();
        };
      // Re-run whenever the label data changes (initial load null → data)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [map, allCountryLabels]);

      return null;
    }

    function MapInner({ values, metric, mode, year, ensoAnom, isMobile, onHover }: InnerProps) {
      const [geo, setGeo] = useState<FC | null>(null);
      // Only remount the GeoJSON layer when mode or metric changes.
      // Year changes are handled imperatively via geoRef so the DOM elements
      // persist and the CSS `fill 280ms ease` transition in globals.css fires.
      const styleKey = `${mode}-${metric}`;
      const geoRef = useRef<any>(null);

      useEffect(() => {
        fetch('/data/world-countries.json')
          .then((r) => r.json())
          .then((g: FC) => setGeo(g))
          .catch(() => undefined);
      }, []);

      const projectedGeo = useMemo<FC | null>(() => {
        if (!geo) return null;
        return projectToPacificView(geo as any) as FC;
      }, [geo]);

      // Derive country label positions from the projected GeoJSON centroids.
      // This gives a label for every country, using the same coordinate space
      // as the map (already pacific-shifted by projectToPacificView).
      const allCountryLabels = useMemo<{ name: string; pos: [number, number] }[]>(() => {
        if (!projectedGeo) return [];
        const overrides: Record<string, [number, number]> = {
          // Elongated/awkward-centroid countries
          'United States of America': [39, -100],
          'Russia':    [60,  97 - 360],
          'Canada':    [57,  -97],
          'Brazil':    [-10, -53],
          'Chile':     [-35, -71],
          'Norway':    [64,  10 - 360],
          'Kazakhstan':[47,  67 - 360],
          'Indonesia': [-2, 116 - 360],
          'New Zealand':[-42, 172 - 360],
          'France':    [47,   2 - 360],
          // Tiny/coastal names that need nudging off the coast
          'United Kingdom': [53,  -2 - 360],
          'Japan':     [36, 138 - 360],
          'Philippines':[13, 122 - 360],
        };
        const result: { name: string; pos: [number, number] }[] = [];
        for (const f of projectedGeo.features) {
          const name = (f.properties as any)?.name as string | undefined;
          // Skip dateline-wrap duplicates
          if (!name || (f.properties as any)?.__wrappedDateline) continue;
          const pos = overrides[name] ?? (() => {
            const g: any = f.geometry;
            if (!g) return null;
            // For MultiPolygon pick the largest ring
            let ring: number[][] = [];
            if (g.type === 'Polygon') ring = g.coordinates[0];
            else if (g.type === 'MultiPolygon') {
              let bestA = 0;
              for (const poly of g.coordinates as number[][][][]) {
                let a = 0;
                const r = poly[0];
                for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
                  a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
                }
                if (Math.abs(a) > bestA) { bestA = Math.abs(a); ring = r; }
              }
            }
            if (!ring.length) return null;
            let x = 0, y = 0;
            for (const c of ring) { x += c[0]; y += c[1]; }
            return [y / ring.length, x / ring.length] as [number, number];
          })();
          if (pos) result.push({ name, pos });
        }
        return result;
      }, [projectedGeo]);

      const ensoFill = (() => {
        const mag = Math.min(1, Math.abs(ensoAnom) / 2.5);
        const a = 0.34 + 0.42 * mag;
        return ensoAnom >= 0 ? `rgba(244,63,94,${a.toFixed(2)})` : `rgba(14,165,233,${a.toFixed(2)})`;
      })();
      const ensoStroke = ensoAnom >= 0.5 ? '#f43f5e' : ensoAnom <= -0.5 ? '#0ea5e9' : '#475569';

      const styleFor = (f: Feature | undefined) => {
        const name = (f?.properties as any)?.name as string | undefined;
        const v = name ? values[name] ?? null : null;
        const wrappedDateline = Boolean((f?.properties as any)?.__wrappedDateline);
        return {
          fillColor: fillFromValue(v, metric, mode),
          fillOpacity: 1,
          stroke: !wrappedDateline,
          color: 'rgba(15,23,42,0.30)',
          weight: wrappedDateline ? 0 : 0.4,
        };
      };

      const onEach = (feature: Feature, layer: any) => {
        const name = (feature.properties as any)?.name as string | undefined;
        if (!name) return;
        const show = () => onHover({ name, value: values[name] ?? null });
        const hide = () => onHover(null);
        (layer as any).on('mouseover', show);
        (layer as any).on('click', show);
        (layer as any).on('mouseout', hide);
      };

      // Imperatively update fill colours + hover tooltip content on each values change
      // (year scrub) without remounting the GeoJSON. This lets the CSS fill
      // transition animate smoothly across years during playback.
      useEffect(() => {
        const lg = geoRef.current;
        if (!lg) return;
        lg.eachLayer((l: any) => {
          const name = (l.feature?.properties as any)?.name as string | undefined;
          if (!name) return;
          l.setStyle(styleFor(l.feature));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [values]);

      // Also update hover callbacks imperatively when values change (so
      // the info panel shows fresh data after a year scrub without remounting).
      useEffect(() => {
        const lg = geoRef.current;
        if (!lg) return;
        lg.eachLayer((l: any) => {
          const name = (l.feature?.properties as any)?.name as string | undefined;
          if (!name) return;
          (l as any).off('mouseover').off('click').off('mouseout');
          const show = () => onHover({ name, value: values[name] ?? null });
          const hide = () => onHover(null);
          (l as any).on('mouseover', show).on('click', show).on('mouseout', hide);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [values, onHover]);

      return (
        <WorldMapShell
          preset="pacific"
          theme="light"
          showTiles={false}
          maxZoom={6}
          className="border border-gray-800"
        >
          {projectedGeo && (
            <GeoJSON
              ref={geoRef}
              key={styleKey}
              data={projectedGeo as any}
              style={styleFor as any}
              onEachFeature={onEach as any}
            />
          )}
          {NINO_REGIONS.map((r) => (
            <Rectangle
              key={r.key}
              bounds={r.bounds}
              pathOptions={{
                color: ensoStroke,
                weight: r.emphasised ? 2.2 : 1.2,
                fillColor: ensoFill,
                fillOpacity: 1,
              }}
            >
              {r.showLabel && (
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95} className="enso-nino-tooltip">
                  {r.label} · {ensoState(ensoAnom)} {ensoAnom >= 0 ? '+' : ''}{ensoAnom.toFixed(2)}°C
                </Tooltip>
              )}
            </Rectangle>
          ))}
          {/* Country name labels from projected GeoJSON centroids — full coverage,
              zoom-aware sizing. Rendered before data badges so badges appear on top. */}
          <PacificMapLabels allCountryLabels={allCountryLabels} />
          {/* Permanent numeric data badges for classic teleconnection countries.
              Rendered after PacificMapLabels so they appear above name labels.
              In corr mode the value is r; in year/simulate mode it is the anomaly. */}
          {(isMobile ? LABELED_PLACES.filter(p => MOBILE_LABELED_NAMES.has(p.name)) : LABELED_PLACES).map((p) => {
            const v = values[p.name];
            const text = labelTextFor(v, metric, mode);
            if (!text) return null;
            const positive = (metric === 'precip' && mode !== 'corr' ? -(v as number) : (v as number)) >= 0;
            // Dark-glass badge matching the site's dark-card aesthetic.
            // Rose (El Niño–like / warm) or sky (La Niña–like / cool) text on a
            // near-opaque dark background with a matching border tint.
            const colour = positive ? '#fb7185' : '#38bdf8'; // rose-400/sky-400 — readable on dark glass
            const borderClr = positive ? 'rgba(244,63,94,0.50)' : 'rgba(14,165,233,0.50)';
            const background = 'rgba(9,13,21,0.88)';
            return (
              <Marker
                key={`lbl-${p.name}`}
                position={[p.lat, p.lon]}
                interactive={false}
                icon={Lm.divIcon({
                  className: 'enso-r-label',
                  html: `<span style="display:inline-block;padding:1px 4px;border-radius:4px;background:${background};border:1px solid ${borderClr};box-shadow:0 1px 4px rgba(15,23,42,0.30);color:${colour};font:600 9px ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap">${text}</span>`,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                })}
              />
            );
          })}
          {/* ENSO region label — sits just above the Niño boxes */}
          <Marker
            position={[11, -148]}
            interactive={false}
            icon={Lm.divIcon({
              className: '',
              html: `<span style="display:block;white-space:nowrap;font:700 9px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:1px;color:rgba(30,41,59,0.75);text-shadow:0 0 3px rgba(255,255,255,0.7);transform:translate(-50%,-50%)">ENSO region</span>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        </WorldMapShell>
      );
    }

    return MapInner;
  }),
  { ssr: false },
);

/* ─────────────────────────────────────────────────────────────────────────
 *  Scrubber strip — ONI bars 1950→present with a draggable playhead. Click
 *  or drag anywhere along the strip to jump. Bars are red/blue per the
 *  standard ENSO colour code, with brightness reflecting magnitude.
 * ───────────────────────────────────────────────────────────────────────── */
function Scrubber({
  history,
  year,
  onChange,
}: {
  history: OniRow[];
  year: number;
  onChange: (y: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Group ONI seasons by year to compute one peak-|anom| value per year so
  // each year gets one bar in the scrubber.
  const yearly = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of history) {
      const cur = m.get(r.year);
      if (cur === undefined || Math.abs(r.anom) > Math.abs(cur)) m.set(r.year, r.anom);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([y, v]) => ({ year: y, value: v }));
  }, [history]);

  const minY = yearly.length ? yearly[0].year : 1950;
  const maxY = yearly.length ? yearly[yearly.length - 1].year : 2025;
  const span = maxY - minY || 1;
  const W = 800;
  const H = 56;
  const mid = H / 2;
  const absMax = Math.max(...yearly.map((d) => Math.abs(d.value)), 2.5);
  const xFor = (y: number) => ((y - minY) / span) * W;

  // Convert a mouse/touch event into a year, clamped to [minY, maxY].
  const yearFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return year;
    const rect = el.getBoundingClientRect();
    const t = (clientX - rect.left) / Math.max(1, rect.width);
    const y = Math.round(minY + Math.max(0, Math.min(1, t)) * span);
    return Math.max(minY, Math.min(maxY, y));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    onChange(yearFromClientX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    onChange(yearFromClientX(e.clientX));
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className="relative w-full select-none cursor-ew-resize"
      style={{ height: H, touchAction: 'none' }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="block"
      >
        <line x1={0} y1={mid} x2={W} y2={mid} stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />
        {yearly.map((d) => {
          const x = xFor(d.year);
          const yTop = mid - (d.value / absMax) * (mid * 0.9);
          const c = d.value > 0.5 ? '#f43f5e' : d.value < -0.5 ? '#0ea5e9' : 'rgba(180,180,180,0.55)';
          return <line key={d.year} x1={x} y1={mid} x2={x} y2={yTop} stroke={c} strokeWidth={W / span * 0.7} strokeLinecap="butt" />;
        })}
        {/* Playhead */}
        <line x1={xFor(year)} y1={2} x2={xFor(year)} y2={H - 2} stroke="#D0A65E" strokeWidth={1.5} />
      </svg>
      {/* Year ticks (decade labels) over the SVG, in real pixels so they don't stretch. */}
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-gray-500 font-mono px-1 pointer-events-none">
        {[1950, 1970, 1990, 2010, maxY].map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Forecast strip — compact two-line plot rendered inside the Forecast
 *  control panel. Always shows BOTH NOAA (probabilistic plume → expected
 *  ONI line) and SNU CNN (deterministic monthly ONI) so the reader can
 *  see where the two models agree or diverge, with the inactive source
 *  dimmed. An amber playhead marks the active forecast horizon.
 * ───────────────────────────────────────────────────────────────────────── */
function ForecastStrip({
  forecast,
  cnn,
  activeIdx,
  onPick,
  activeSrc,
  hidePill = false,
}: {
  forecast: ForecastSeasonProp[];
  cnn: CnnForecastProp | null;
  activeIdx: number;
  onPick: (i: number) => void;
  activeSrc: ForecastSource;
  hidePill?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 800, H = 60, padX = 8, padY = 6;
  // NOAA / IRI plume ONI per horizon: prefer the joined plume value so the
  // strip matches the main forecast section, and fall back to a coarse
  // probability-difference proxy only when the plume value is absent.
  const noaaPts = forecast.map((s, i) => {
    const oni = (typeof s.modelOni === 'number' && Number.isFinite(s.modelOni))
      ? s.modelOni
      : ((s.pElNino - s.pLaNina) / 100);
    return { i, label: s.label, season: s.season, anchorYear: s.anchorYear, oni };
  });
  // CNN: align CNN ONI to each forecast horizon by computing the same
  // 3-month rolling average as the map uses.
  const SEASON_MONTHS_LOCAL: Record<string, number[]> = {
    DJF: [12, 1, 2], JFM: [1, 2, 3], FMA: [2, 3, 4], MAM: [3, 4, 5],
    AMJ: [4, 5, 6], MJJ: [5, 6, 7], JJA: [6, 7, 8], JAS: [7, 8, 9],
    ASO: [8, 9, 10], SON: [9, 10, 11], OND: [10, 11, 12], NDJ: [11, 12, 1],
  };
  const cnnLookup = new Map(cnn?.points.map((p) => [p.yyyymm, p.nino34]) ?? []);
  const cnnPts: { i: number; oni: number | null }[] = forecast.map((s, i) => {
    const months = SEASON_MONTHS_LOCAL[s.season];
    if (!months || !cnn) return { i, oni: null };
    const ym = (y: number, m: number) => y * 100 + m;
    let targets: number[];
    if (s.season === 'DJF') targets = [ym(s.anchorYear - 1, 12), ym(s.anchorYear, 1), ym(s.anchorYear, 2)];
    else if (s.season === 'NDJ') targets = [ym(s.anchorYear, 11), ym(s.anchorYear, 12), ym(s.anchorYear + 1, 1)];
    else targets = months.map((m) => ym(s.anchorYear, m));
    let sum = 0; let n = 0;
    for (const t of targets) {
      const v = cnnLookup.get(t);
      if (v === undefined || !Number.isFinite(v)) return { i, oni: null };
      sum += v; n++;
    }
    return { i, oni: n === 3 ? sum / 3 : null };
  });

  const allVals: number[] = [
    ...noaaPts.map((p) => p.oni),
    ...cnnPts.map((p) => p.oni).filter((v): v is number => v !== null && Number.isFinite(v)),
  ];
  const absMax = Math.max(1.5, ...allVals.map((v) => Math.abs(v)));
  const xFor = (i: number) => padX + (i / Math.max(1, forecast.length - 1)) * (W - 2 * padX);
  const yFor = (v: number) => H / 2 - (v / absMax) * (H / 2 - padY);

  // Polyline path strings
  const noaaPath = noaaPts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${xFor(p.i).toFixed(1)} ${yFor(p.oni).toFixed(1)}`).join(' ');
  // CNN path may have gaps for missing months — split into runs of finite values
  const cnnRuns: string[] = [];
  let run: string[] = [];
  for (const p of cnnPts) {
    if (p.oni === null) {
      if (run.length) cnnRuns.push(run.join(' '));
      run = [];
    } else {
      run.push(`${run.length === 0 ? 'M' : 'L'} ${xFor(p.i).toFixed(1)} ${yFor(p.oni).toFixed(1)}`);
    }
  }
  if (run.length) cnnRuns.push(run.join(' '));

  const noaaDim = activeSrc !== 'noaa';
  const cnnDim = activeSrc !== 'cnn';
  const focusIdx = hoverIdx ?? activeIdx;
  const focusSeason = forecast[focusIdx];
  const focusNoaa = noaaPts[focusIdx]?.oni ?? null;
  const focusCnn = cnnPts[focusIdx]?.oni ?? null;
  const fmtOni = (v: number | null | undefined) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return '—';
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}°C`;
  };
  const focusDelta = (typeof focusNoaa === 'number' && typeof focusCnn === 'number')
    ? focusCnn - focusNoaa
    : null;

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const t = (xPx - padX) / Math.max(1, rect.width - 2 * padX);
    const i = Math.round(Math.max(0, Math.min(1, t)) * (forecast.length - 1));
    onPick(i);
  };

  return (
    <div className="relative select-none">
      {!hidePill && (
        <div className="mb-0.5 min-h-[30px] flex items-center justify-center">
          <div className="max-w-full overflow-x-auto rounded-md border border-gray-700/70 bg-gray-900/90 px-2 py-0.5 shadow-lg">
            <div className="flex items-center gap-2 whitespace-nowrap text-[10px] sm:text-[11px] font-mono">
              <span className="text-[#FFF5E7]">{focusSeason ? `${focusSeason.season} ${focusSeason.anchorYear}` : 'Forecast'}</span>
              <span className="text-rose-300">NOAA {fmtOni(focusNoaa)}</span>
              <span className="text-violet-300">CNN {fmtOni(focusCnn)}</span>
              {focusDelta !== null && (
                <span className="text-amber-300">Δ {focusDelta >= 0 ? '+' : ''}{focusDelta.toFixed(2)}°C</span>
              )}
            </div>
          </div>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" onClick={onClick} className="block cursor-pointer">
        {/* Threshold guides */}
        <line x1={padX} y1={yFor(0.5)}  x2={W - padX} y2={yFor(0.5)}  stroke="rgba(244,63,94,0.25)" strokeWidth={0.5} strokeDasharray="3 3" />
        <line x1={padX} y1={yFor(-0.5)} x2={W - padX} y2={yFor(-0.5)} stroke="rgba(14,165,233,0.25)" strokeWidth={0.5} strokeDasharray="3 3" />
        <line x1={padX} y1={H / 2} x2={W - padX} y2={H / 2} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
        {/* NOAA expected-ONI line */}
        <path d={noaaPath} fill="none" stroke={noaaDim ? 'rgba(248,113,113,0.45)' : '#f87171'} strokeWidth={noaaDim ? 1.5 : 2.2} strokeDasharray="5 3" />
        {/* CNN deterministic line */}
        {cnnRuns.map((d, k) => (
          <path key={k} d={d} fill="none" stroke={cnnDim ? 'rgba(196,181,253,0.45)' : '#c4b5fd'} strokeWidth={cnnDim ? 1.5 : 2.2} />
        ))}
        {hoverIdx !== null && (
          <line x1={xFor(hoverIdx)} y1={2} x2={xFor(hoverIdx)} y2={H - 2} stroke="rgba(208,166,94,0.45)" strokeWidth={0.9} strokeDasharray="2 2" />
        )}
        {/* Points + invisible hit-areas so every horizon has a proper in-app
            hover readout instead of relying on native browser titles. */}
        {noaaPts.map((p) => {
          const emphasized = p.i === activeIdx || p.i === hoverIdx;
          return (
            <circle
              key={`n${p.i}`}
              cx={xFor(p.i)}
              cy={yFor(p.oni)}
              r={emphasized ? (noaaDim ? 2.8 : 3.4) : (noaaDim ? 2.1 : 2.7)}
              fill={noaaDim ? 'rgba(244,63,94,0.5)' : '#f43f5e'}
            />
          );
        })}
        {cnnPts.filter((p) => p.oni !== null).map((p) => {
          const emphasized = p.i === activeIdx || p.i === hoverIdx;
          return (
            <circle
              key={`c${p.i}`}
              cx={xFor(p.i)}
              cy={yFor(p.oni as number)}
              r={emphasized ? (cnnDim ? 2.8 : 3.4) : (cnnDim ? 2.1 : 2.7)}
              fill={cnnDim ? 'rgba(167,139,250,0.5)' : '#a78bfa'}
            />
          );
        })}
        {forecast.map((s, i) => {
          const cn = cnnPts[i]?.oni;
          const no = noaaPts[i]?.oni;
          const noStr = fmtOni(no);
          const cnStr = fmtOni(cn);
          return (
            <g key={`hit${i}`}>
              <rect
                x={xFor(i) - (W / Math.max(1, forecast.length)) / 2}
                y={0}
                width={W / Math.max(1, forecast.length)}
                height={H}
                fill="transparent"
                focusable="false"
                style={{ cursor: 'pointer' }}
                aria-label={`${s.label}: NOAA/IRI ${noStr}, CNN ${cnStr}`}
                onClick={(e) => { e.stopPropagation(); onPick(i); }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseMove={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((current) => (current === i ? null : current))}
              />
            </g>
          );
        })}
        {/* Playhead */}
        <line x1={xFor(activeIdx)} y1={2} x2={xFor(activeIdx)} y2={H - 2} stroke="#D0A65E" strokeWidth={1.5} />
      </svg>
      <div className="relative mt-1 text-[9px] font-mono" style={{ height: '28px' }}>
        {forecast.map((s, i) => {
          const tone = i === hoverIdx ? 'text-[#FFF5E7]' : i === activeIdx ? 'text-[#D0A65E]' : 'text-gray-500';
          const yearBreak = i === 0 || s.anchorYear !== forecast[i - 1]?.anchorYear;
          return (
            <div
              key={`lbl${i}`}
              className="absolute -translate-x-1/2 text-center pointer-events-none"
              style={{ left: `${(xFor(i) / W) * 100}%` }}
            >
              <div className={`whitespace-nowrap leading-none ${tone}`}>{s.season}</div>
              <div className="mt-0.5 text-[8px] leading-none text-gray-600">{yearBreak ? s.anchorYear : '\u00a0'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Main tracker component
 * ───────────────────────────────────────────────────────────────────────── */
export default function EnsoImpactTracker({
  oniHistory,
  forecast,
  cnnForecast,
}: {
  oniHistory: OniRow[];
  forecast?: ForecastSeasonProp[];
  cnnForecast?: CnnForecastProp | null;
}) {
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [year, setYear] = useState(() => (loadFootprintPrefs().year as number) ?? 1998);
  const [metric, setMetric] = useState<Metric>(() => (loadFootprintPrefs().metric as Metric) ?? 'temp');
  const [aggWindow, setAggWindow] = useState<AggWindow>(() => (loadFootprintPrefs().aggWindow as AggWindow) ?? 'mam');
  const [mode, setMode] = useState<Mode>(() => (loadFootprintPrefs().mode as Mode) ?? 'year');
  const [tempLayerMode, setTempLayerMode] = useState<TempLayerMode>(() => (loadFootprintPrefs().tempLayerMode as TempLayerMode) ?? 'signal');
  const [yearTempLayerMode, setYearTempLayerMode] = useState<TempLayerMode>(() => (loadFootprintPrefs().yearTempLayerMode as TempLayerMode) ?? 'total');
  // ENSO strength slider for Composite mode — units are °C of ONI (Niño-3.4
  // SST anomaly). Standard event thresholds: ±0.5 = weak, ±1 = moderate,
  // ±1.5 = strong, ±2 = very strong (e.g. 1997, 2015).
  const [oniSlider, setOniSlider] = useState(() => (loadFootprintPrefs().oniSlider as number) ?? 1.5);
  const [simPhaseId, setSimPhaseId] = useState<string>(() => {
    const prefs = loadFootprintPrefs();
    const saved = prefs.simPhaseId as string | undefined;
    if (saved && SIM_PHASES.some((phase) => phase.id === saved)) return saved;
    return simPhaseIdFromLegacySeason(prefs.season as Season | undefined);
  });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => (loadFootprintPrefs().speed as number) ?? 4); // years per second
  // Forecast mode — slider over NOAA's published forecast horizons + active
  // source (NOAA probabilistic plume vs SNU CNN deterministic).
  const [forecastIdx, setForecastIdx] = useState<number>(0);
  const [forecastSrc, setForecastSrc] = useState<ForecastSource>(() => (loadFootprintPrefs().forecastSrc as ForecastSource) ?? 'noaa');
  const [forecastSpeed, setForecastSpeed] = useState(() => (loadFootprintPrefs().forecastSpeed as number) ?? 1);
  const [forecastPlaying, setForecastPlaying] = useState(false);
  const forecastHeaderRef = useRef<HTMLDivElement | null>(null);
  const forecastSourceRef = useRef<HTMLDivElement | null>(null);
  const forecastDataPillRef = useRef<HTMLDivElement | null>(null);
  const [forecastPillLayout, setForecastPillLayout] = useState<'stacked' | 'row' | 'overlay'>('stacked');
  const [hovered, setHovered] = useState<{ name: string; value: number | null } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const simPhase = SIM_PHASES.find((phase) => phase.id === simPhaseId) ?? SIM_PHASES.find((phase) => phase.id === DEFAULT_SIM_PHASE_ID)!;
  const activeTempLayerMode = mode === 'year' ? yearTempLayerMode : tempLayerMode;
  const simPhaseText = simPhase.phase === 'peak'
    ? `${simPhase.season} peak`
    : `${simPhase.season} ${simPhase.phase === 'build' ? 'Build-up' : 'Aftermath'}`;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Persist display preferences whenever they change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(FOOTPRINT_PREFS_KEY, JSON.stringify({
        year, metric, aggWindow, mode, tempLayerMode, yearTempLayerMode, oniSlider, season: simPhase.season, simPhaseId, speed, forecastSrc, forecastSpeed,
      }));
    } catch { /* storage unavailable */ }
  }, [year, metric, aggWindow, mode, tempLayerMode, yearTempLayerMode, oniSlider, simPhase.season, simPhaseId, speed, forecastSrc, forecastSpeed]);

  // Load pre-computed impact dataset.
  useEffect(() => {
    let cancelled = false;
    fetch('/data/climate/enso-impact.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setImpact(j as ImpactData); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const minYear = impact?.years[0] ?? 1950;
  // Cap at last full calendar year so partial-year data doesn't show at end of playback
  const dataMaxYear = impact?.years[impact.years.length - 1] ?? new Date().getFullYear();
  const maxYear = Math.min(dataMaxYear, new Date().getFullYear() - 1);

  // Playback loop — advance one year per (1000/speed) ms; auto-stop at last
  // FULL year. We cap at (currentCalendarYear - 1) so partial-year data for
  // the ongoing year is never displayed at the end of a playback run.
  useEffect(() => {
    if (!playing || !impact) return;
    const dataMax = impact.years[impact.years.length - 1];
    const lastFull = Math.min(dataMax, new Date().getFullYear() - 1);
    const id = setInterval(() => {
      setYear((y) => {
        if (y >= lastFull) {
          setPlaying(false);
          return y;
        }
        return y + 1;
      });
    }, Math.max(60, 1000 / speed));
    return () => clearInterval(id);
  }, [playing, speed, impact]);

  useEffect(() => {
    if (!forecastPlaying || mode !== 'forecast' || !forecast || forecast.length === 0) return;
    const id = setInterval(() => {
      setForecastIdx((idx) => {
        if (idx >= forecast.length - 1) {
          setForecastPlaying(false);
          return idx;
        }
        return idx + 1;
      });
    }, Math.max(220, 1100 / forecastSpeed));
    return () => clearInterval(id);
  }, [forecastPlaying, mode, forecast, forecastSpeed]);

  useEffect(() => {
    if (mode !== 'forecast') setForecastPlaying(false);
  }, [mode]);

  // Build a featureName → anomaly lookup for the current year/metric/window.
  const countryBucketForWindow = (window: string, wantedMetric: Metric): Record<string, (number | null)[]> | undefined => {
    if (!impact) return undefined;
    const seasonal = (impact as any).seasonal as Record<string, any> | undefined;
    return (
      seasonal?.[window]?.[wantedMetric]?.country
      ?? (window === 'annual'
        ? (impact as any).annual?.[wantedMetric]?.country
        : window === 'MAM'
          ? (impact as any).mam?.[wantedMetric]?.country
          : undefined)
    ) as Record<string, (number | null)[]> | undefined;
  };

  const valuesByName = useMemo(() => {
    if (!impact) return {};
    const yIdx = impact.years.indexOf(year);
    if (yIdx < 0) return {};
    const w = aggWindow === 'annual' ? 'annual' : 'MAM';
    const bucket = countryBucketForWindow(w, metric);
    if (!bucket) return {};
    const out: Record<string, number | null> = {};
    for (const iso3 of Object.keys(bucket)) {
      const name = impact.countryNames[iso3] ? mapEnsoCountryName(impact.countryNames[iso3]) : null;
      if (!name) continue;
      const arr = bucket[iso3];
      out[name] = arr?.[yIdx] ?? null;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impact, year, metric, aggWindow]);

  // Per-year peak ONI across the full history, aligned to impact.years.
  // Used as the x-series for Pearson correlation.
  const oniByYear = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of oniHistory) {
      const cur = m.get(r.year);
      if (cur === undefined || Math.abs(r.anom) > Math.abs(cur)) m.set(r.year, r.anom);
    }
    return m;
  }, [oniHistory]);

  // Per-country Pearson r between annual peak ONI and the country's anomaly
  // for the current metric/window. Both series are LINEARLY DETRENDED before
  // correlation — this is critical for temperature, whose raw 1950→present
  // series is dominated by the global-warming trend (and would otherwise
  // swamp the ENSO signal). Precip series have weak trends so detrending
  // changes them little.
  // r > 0 → country anomaly moves with ONI (warmer/wetter when El Niño).
  // For precip we keep the raw sign here; the colour function flips it so
  // "in-phase with El Niño" still reads blue (wetter) on the map.

  // Linear-regression detrend: returns the array with a best-fit a + b·t
  // subtracted (NaN-safe). Empty/short inputs return as-is.
  const detrend = (arr: (number | null)[]): number[] => {
    const ys: number[] = [];
    const ts: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v === null || v === undefined || !Number.isFinite(v)) continue;
      ys.push(v as number); ts.push(i);
    }
    if (ys.length < 3) return arr.map((v) => (typeof v === 'number' ? v : NaN));
    const n = ys.length;
    const sx = ts.reduce((a, b) => a + b, 0);
    const sy = ys.reduce((a, b) => a + b, 0);
    const sxx = ts.reduce((a, b) => a + b * b, 0);
    const sxy = ts.reduce((a, b, k) => a + b * ys[k], 0);
    const denom = n * sxx - sx * sx;
    const b = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    const a = (sy - b * sx) / n;
    return arr.map((v, i) => (v === null || v === undefined || !Number.isFinite(v as number)
      ? NaN
      : (v as number) - (a + b * i)));
  };

  const yearSignalByName = useMemo(() => {
    if (!impact) return {};
    const yIdx = impact.years.indexOf(year);
    if (yIdx < 0) return {};
    const windowKey = aggWindow === 'annual' ? 'annual' : 'MAM';
    const bucket = countryBucketForWindow(windowKey, 'temp');
    if (!bucket) return {};
    const out: Record<string, number | null> = {};
    for (const iso3 of Object.keys(bucket)) {
      const name = impact.countryNames[iso3] ? mapEnsoCountryName(impact.countryNames[iso3]) : null;
      if (!name) continue;
      const series = detrend(bucket[iso3] ?? []);
      const value = series[yIdx];
      out[name] = Number.isFinite(value) ? value : null;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impact, year, aggWindow]);

  /**
   * Compute per-country Pearson r AND regression slope β between each
   * country's anomaly series (in the chosen window) and the year-aligned
   * peak ONI series (with the given lag). Both inputs are linearly detrended.
   *
   * window:   'annual' | 'DJF' | 'JFM' | ... | 'NDJ' (key into seasonal block)
   * lag:      years to subtract from country-year to find the ONI year for
   *           pairing. Use 1 for early-year windows (Jan–Jun, response to
   *           previous NDJ peak); 0 for late-year windows (Jul–Dec, leading
   *           up to that year's NDJ peak).
   */
  const computeEnsoStats = (
    window: string,
    lag: number,
  ): { r: Record<string, number | null>; slope: Record<string, number | null> } => {
    if (!impact) return { r: {}, slope: {} };
    // Read from the new seasonal block; fall back to legacy `annual` / `mam`
    // keys so older deployed data files don't break the page mid-rollout.
    const seasonal = (impact as any).seasonal as Record<string, any> | undefined;
    const bucket =
      (seasonal?.[window]?.[metric]?.country
        ?? (window === 'annual'
          ? (impact as any).annual?.[metric]?.country
          : window === 'MAM'
            ? (impact as any).mam?.[metric]?.country
            : undefined)) as Record<string, (number | null)[]> | undefined;
    if (!bucket) return { r: {}, slope: {} };
    const oniSeries: number[] = impact.years.map((y) => oniByYear.get(y - lag) ?? NaN);
    const oniDetrended = detrend(oniSeries);
    const r: Record<string, number | null> = {};
    const slope: Record<string, number | null> = {};
    for (const iso3 of Object.keys(bucket)) {
      const name = impact.countryNames[iso3] ? mapEnsoCountryName(impact.countryNames[iso3]) : null;
      if (!name) continue;
      const series = detrend(bucket[iso3] ?? []);
      let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (let i = 0; i < series.length; i++) {
        const x = oniDetrended[i];
        const y = series[i];
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        n++;
        sx += x; sy += y;
        sxx += x * x; syy += y * y;
        sxy += x * y;
      }
      if (n < 20) { r[name] = null; slope[name] = null; continue; }
      const num = n * sxy - sx * sy;
      const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
      r[name] = den === 0 ? null : num / den;
      const sd = n * sxx - sx * sx;
      slope[name] = sd === 0 ? null : (n * sxy - sx * sy) / sd;
    }
    return { r, slope };
  };

  // Correlation mode uses the toggle window (annual or MAM). MAM responds
  // to the previous winter's DJF peak (NDJ Y−1 is labelled to year Y−1 in
  // NOAA's convention) so we pair MAM(Y) with peak-ONI(Y−1). Annual mode
  // averages across the whole year and pairs with same-year peak ONI.
  const corrStats = useMemo(
    () => computeEnsoStats(aggWindow === 'annual' ? 'annual' : 'MAM', aggWindow === 'mam' ? 1 : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [impact, metric, aggWindow, oniByYear],
  );
  const correlationByName = corrStats.r;

  // Composite mode uses the season slider. Windows in the first half of
  // the calendar year (DJF…MJJ) are responding to the previous NDJ peak so
  // they pair with peak-ONI(Y−1); late-year windows (JJA…NDJ) are leading
  // up to that year's NDJ peak, so they pair with peak-ONI(Y).
  const compositeStats = useMemo(
    () => computeEnsoStats(simPhase.season, simPhase.lag),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [impact, metric, simPhase.season, simPhase.lag, oniByYear],
  );
  const slopeByName = compositeStats.slope;

  // Composite mode: per-country expected anomaly at the slider's ONI value.
  // β·s, where β is in (°C land / °C ONI) for temp, (% / °C ONI) for rain.
  const compositeByName = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const [name, beta] of Object.entries(slopeByName)) {
      out[name] = (typeof beta === 'number' && Number.isFinite(beta)) ? beta * oniSlider : null;
    }
    return out;
  }, [slopeByName, oniSlider]);

  /* ──────────────────────────────────────────────────────────────────────
   *  Forecast mode — categorical historical composites
   * ──────────────────────────────────────────────────────────────────────
   *  For each (window, country) we precompute three composite anomalies:
   *    C_EN  = mean detrended anomaly across years where peak ONI ≥ +0.5
   *    C_LN  = mean detrended anomaly across years where peak ONI ≤ −0.5
   *    C_N   = mean detrended anomaly across neutral years
   *  We then blend by probability:
   *    value = P_EN·C_EN + P_LN·C_LN + P_N·C_N
   *  This is the standard NOAA "composite analogue" approach. It saturates
   *  cleanly at extreme ONI (no linear extrapolation issues) and works
   *  identically for the NOAA probabilistic plume and an SNU CNN
   *  deterministic forecast (whose ONI is converted to soft probabilities
   *  via a sigmoid).
   * ────────────────────────────────────────────────────────────────────── */
  const compositesByWindow = useMemo(() => {
    if (!impact) return {} as Record<string, { countries: Record<string, { en: number | null; ln: number | null; n: number | null }>; meanONI: { en: number; ln: number; n: number } }>;
    const seasonal = (impact as any).seasonal as Record<string, any> | undefined;
    const earlyYear = new Set(['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ']);
    const out: Record<string, { countries: Record<string, { en: number | null; ln: number | null; n: number | null }>; meanONI: { en: number; ln: number; n: number } }> = {};
    for (const w of SEASONS) {
      const bucket = (seasonal?.[w]?.[metric]?.country
        ?? (w === 'MAM' ? (impact as any).mam?.[metric]?.country : undefined)) as Record<string, (number | null)[]> | undefined;
      if (!bucket) continue;
      const lag = earlyYear.has(w) ? 1 : 0;
      // Compute mean ONI within each bucket once for this window (same set
      // of years for every country). Used downstream to rescale composites
      // so a deterministic forecast (e.g. CNN ONI = +2°C) produces map
      // magnitudes consistent with Simulate at +2, rather than the historical
      // EN-event average (~+1.2°C).
      let mEnS = 0, mEnN = 0, mLnS = 0, mLnN = 0, mNuS = 0, mNuN = 0;
      for (let i = 0; i < impact.years.length; i++) {
        const oni = oniByYear.get(impact.years[i] - lag);
        if (oni === undefined || !Number.isFinite(oni)) continue;
        if (oni >= 0.5)      { mEnS += oni; mEnN++; }
        else if (oni <= -0.5){ mLnS += oni; mLnN++; }
        else                 { mNuS += oni; mNuN++; }
      }
      const meanONI = {
        en: mEnN > 0 ? mEnS / mEnN : 1.2,
        ln: mLnN > 0 ? mLnS / mLnN : -1.0,
        n:  mNuN > 0 ? mNuS / mNuN : 0,
      };
      const perWindow: Record<string, { en: number | null; ln: number | null; n: number | null }> = {};
      for (const iso3 of Object.keys(bucket)) {
        const name = impact.countryNames[iso3] ? mapEnsoCountryName(impact.countryNames[iso3]) : null;
        if (!name) continue;
        const series = detrend(bucket[iso3] ?? []);
        let enS = 0, enN = 0, lnS = 0, lnN = 0, nuS = 0, nuN = 0;
        for (let i = 0; i < series.length; i++) {
          const v = series[i];
          if (!Number.isFinite(v)) continue;
          const oni = oniByYear.get(impact.years[i] - lag);
          if (oni === undefined || !Number.isFinite(oni)) continue;
          if (oni >= 0.5)      { enS += v; enN++; }
          else if (oni <= -0.5){ lnS += v; lnN++; }
          else                 { nuS += v; nuN++; }
        }
        perWindow[name] = {
          en: enN >= 5 ? enS / enN : null,
          ln: lnN >= 5 ? lnS / lnN : null,
          n:  nuN >= 5 ? nuS / nuN : null,
        };
      }
      out[w] = { countries: perWindow, meanONI };
    }
    return out;
    // detrend is stable; impact / metric / oniByYear are the dependencies that
    // actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impact, metric, oniByYear]);

  /** Sigmoid mapping a deterministic Niño-3.4 anomaly to soft EN/LN/Neutral
   *  probabilities. The 0.5°C threshold and 0.4°C transition width are
   *  loosely calibrated to NOAA's own categorical thresholds, so a +0.5°C
   *  forecast yields ~50% El Niño probability and a +1.5°C forecast yields
   *  >95% El Niño. Returns probabilities summing to 1. */
  const oniToProbs = (oni: number): { en: number; ln: number; n: number } => {
    if (!Number.isFinite(oni)) return { en: 0, ln: 0, n: 1 };
    const sig = (z: number) => 1 / (1 + Math.exp(-z));
    // Narrower transition (0.25 vs 0.4) so the CNN probability vector
    // diverges more sharply from NOAA's plume when the two disagree.
    const W = 0.25;
    let pEN = sig((oni - 0.5) / W);
    let pLN = sig((-oni - 0.5) / W);
    // EN+LN can mildly overlap near zero — clip overlap by renormalising
    // against neutral.
    let pN = Math.max(0, 1 - pEN - pLN);
    const sum = pEN + pLN + pN;
    if (sum > 0) { pEN /= sum; pLN /= sum; pN /= sum; }
    return { en: pEN, ln: pLN, n: pN };
  };

  /** Convert the CNN monthly Niño-3.4 trajectory into a 3-month rolling
   *  average aligned with a NOAA season label (e.g. 'OND') for a given
   *  anchor year. Returns null if any of the three months is missing. */
  const cnnAnomForSeason = (sourcePoints: { yyyymm: number; nino34: number }[] | undefined, label: string, anchorYear: number): number | null => {
    if (!sourcePoints || sourcePoints.length === 0) return null;
    const SEASON_MONTHS_LOCAL: Record<string, number[]> = {
      DJF: [12, 1, 2], JFM: [1, 2, 3], FMA: [2, 3, 4], MAM: [3, 4, 5],
      AMJ: [4, 5, 6], MJJ: [5, 6, 7], JJA: [6, 7, 8], JAS: [7, 8, 9],
      ASO: [8, 9, 10], SON: [9, 10, 11], OND: [10, 11, 12], NDJ: [11, 12, 1],
    };
    const months = SEASON_MONTHS_LOCAL[label];
    if (!months) return null;
    const ym = (y: number, m: number) => y * 100 + m;
    // NOAA naming: DJF/NDJ are anchored to the year of January / December
    // respectively. For simplicity, build the calendar year/month for each
    // of the three months relative to `anchorYear`. We assume `anchorYear`
    // is the seasonMiddleMonth's year (matches forecastWithYear in page.tsx).
    let targets: number[];
    if (label === 'DJF') targets = [ym(anchorYear - 1, 12), ym(anchorYear, 1), ym(anchorYear, 2)];
    else if (label === 'NDJ') targets = [ym(anchorYear, 11), ym(anchorYear, 12), ym(anchorYear + 1, 1)];
    else targets = months.map((m) => ym(anchorYear, m));
    const lookup = new Map(sourcePoints.map((p) => [p.yyyymm, p.nino34]));
    let sum = 0; let n = 0;
    for (const t of targets) {
      const v = lookup.get(t);
      if (v === undefined || !Number.isFinite(v)) return null;
      sum += v; n++;
    }
    return n === 3 ? sum / 3 : null;
  };

  // Forecast state — slider position over the NOAA forecast horizons + active source.
  const forecastHorizon = (forecast && forecast.length > 0)
    ? forecast[Math.max(0, Math.min(forecast.length - 1, forecastIdx))]
    : null;

  // Probabilities used by the map for the active source × horizon.
  // `oni` is the implied / forecast Niño-3.4 anomaly for that horizon:
  //  • NOAA: actual IRI plume multi-model mean when available, otherwise
  //    a probability-weighted bucket mean as a fallback.
  //  • CNN: the actual deterministic 3-month rolling forecast value.
  const forecastProbs = useMemo(() => {
    if (!forecastHorizon) return null;
    const win = compositesByWindow[forecastHorizon.season];
    const meanONI = win?.meanONI ?? { en: 1.2, ln: -1.0, n: 0 };
    if (forecastSrc === 'noaa') {
      const en = forecastHorizon.pElNino / 100;
      const ln = forecastHorizon.pLaNina / 100;
      const n  = forecastHorizon.pNeutral / 100;
      const impliedOni = en * meanONI.en + ln * meanONI.ln + n * meanONI.n;
      const oni = (typeof forecastHorizon.modelOni === 'number' && Number.isFinite(forecastHorizon.modelOni))
        ? forecastHorizon.modelOni
        : impliedOni;
      return { en, ln, n, oni };
    }
    // CNN: read the rolling 3-month nino34 for that season, then sigmoid.
    const cnnAnom = cnnAnomForSeason(cnnForecast?.points, forecastHorizon.season, forecastHorizon.anchorYear);
    if (cnnAnom === null) return null;
    return { ...oniToProbs(cnnAnom), oni: cnnAnom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastHorizon, forecastSrc, cnnForecast, compositesByWindow]);

  useEffect(() => {
    if (!forecastHorizon) {
      setForecastPillLayout('stacked');
      return;
    }
    const container = forecastHeaderRef.current;
    const source = forecastSourceRef.current;
    const pill = forecastDataPillRef.current;
    if (!container || !source || !pill || typeof ResizeObserver === 'undefined') {
      setForecastPillLayout('stacked');
      return;
    }
    let rafId = 0;
    const measure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const containerWidth = container.clientWidth;
        const sourceWidth = source.offsetWidth;
        const pillWidth = pill.offsetWidth;
        const canOverlay = !isMobile && ((containerWidth - pillWidth) / 2) >= (sourceWidth + 12);
        const canShareRow = !isMobile && containerWidth >= (sourceWidth + pillWidth + 24);
        const nextLayout = canOverlay ? 'overlay' : canShareRow ? 'row' : 'stacked';
        setForecastPillLayout((prev) => (prev === nextLayout ? prev : nextLayout));
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(source);
    observer.observe(pill);
    measure();
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [forecastHorizon, isMobile]);

  /** Helper: build the (probability-blended) composite-map values for a
   *  specific source + horizon. Returns name → anomaly in physical units
   *  (°C for temp, % for precip). */
  const blendedComposite = (src: ForecastSource, horizon: ForecastSeasonProp | null): Record<string, number | null> => {
    if (!horizon) return {};
    const win = compositesByWindow[horizon.season];
    if (!win) return {};
    const perWindow = win.countries;
    const meanONI = win.meanONI;
    let probs: { en: number; ln: number; n: number } | null;
    let expectedONI: number | null = null;
    if (src === 'noaa') {
      probs = { en: horizon.pElNino / 100, ln: horizon.pLaNina / 100, n: horizon.pNeutral / 100 };
      // When the IRI plume's model-mean ONI is available for this horizon,
      // treat it as the deterministic "expected" Niño-3.4 and rescale the
      // composite to match — so NOAA Forecast magnitudes line up with
      // Simulate at that ONI rather than with the historical EN/LN mean.
      if (typeof horizon.modelOni === 'number' && Number.isFinite(horizon.modelOni)) {
        expectedONI = horizon.modelOni;
      }
    } else {
      const a = cnnAnomForSeason(cnnForecast?.points, horizon.season, horizon.anchorYear);
      probs = a !== null ? oniToProbs(a) : null;
      expectedONI = a;
    }
    if (!probs) return {};
    // Blended bucket-mean ONI consistent with this probability vector.
    const blendONI = probs.en * meanONI.en + probs.ln * meanONI.ln + probs.n * meanONI.n;
    let scale = 1;
    if (expectedONI !== null && Math.abs(blendONI) > 0.1
        && Math.sign(expectedONI) === Math.sign(blendONI)) {
      scale = Math.max(0.3, Math.min(2.5, expectedONI / blendONI));
    }
    const out: Record<string, number | null> = {};
    for (const [name, c] of Object.entries(perWindow)) {
      let pSum = 0; let vSum = 0;
      if (c.en !== null) { vSum += c.en * probs.en; pSum += probs.en; }
      if (c.ln !== null) { vSum += c.ln * probs.ln; pSum += probs.ln; }
      if (c.n  !== null) { vSum += c.n  * probs.n;  pSum += probs.n; }
      out[name] = pSum >= 0.5 ? (vSum / pSum) * scale : null;
    }
    return out;
  };

  // Active-source map (driving the choropleth).
  const forecastByName = useMemo(
    () => blendedComposite(forecastSrc, forecastHorizon),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forecastSrc, forecastHorizon, compositesByWindow, cnnForecast],
  );
  // Shadow map (the *other* source) — used for the dual tooltip.
  const forecastByNameShadow = useMemo(
    () => blendedComposite(forecastSrc === 'noaa' ? 'cnn' : 'noaa', forecastHorizon),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forecastSrc, forecastHorizon, compositesByWindow, cnnForecast],
  );

  const showTempLayerControls = mode === 'year' || mode === 'simulate' || mode === 'forecast';
  const useYearSignalLayer = mode === 'year'
    && metric === 'temp'
    && activeTempLayerMode === 'signal';
  const showBackgroundWarming = metric === 'temp'
    && activeTempLayerMode === 'total'
    && (mode === 'simulate' || mode === 'forecast');

  const fitTrendAtYear = (arr: (number | null)[], targetYear: number): number | null => {
    if (!impact) return null;
    let n = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v === null || v === undefined || !Number.isFinite(v)) continue;
      const x = impact.years[i];
      n++;
      sx += x;
      sy += v;
      sxx += x * x;
      sxy += x * v;
    }
    if (n < 10) return null;
    const denom = n * sxx - sx * sx;
    const b = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    const a = (sy - b * sx) / n;
    const y = a + b * targetYear;
    return Number.isFinite(y) ? y : null;
  };

  const warmingWindow = mode === 'forecast'
    ? forecastHorizon?.season ?? null
    : mode === 'simulate'
      ? simPhase.season
      : null;
  const warmingTargetYear = mode === 'forecast'
    ? forecastHorizon?.anchorYear ?? null
    : mode === 'simulate'
      ? maxYear
      : null;

  const warmingByName = useMemo(() => {
    if (!impact || !showBackgroundWarming || !warmingWindow || warmingTargetYear === null) return {};
    const bucket = countryBucketForWindow(warmingWindow, 'temp');
    if (!bucket) return {};
    const out: Record<string, number | null> = {};
    for (const iso3 of Object.keys(bucket)) {
      const name = impact.countryNames[iso3] ? mapEnsoCountryName(impact.countryNames[iso3]) : null;
      if (!name) continue;
      out[name] = fitTrendAtYear(bucket[iso3] ?? [], warmingTargetYear);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impact, showBackgroundWarming, warmingWindow, warmingTargetYear]);

  const mergeSignalWithBackground = (
    signal: Record<string, number | null>,
    background: Record<string, number | null>,
  ) => {
    if (!showBackgroundWarming) return signal;
    const out: Record<string, number | null> = {};
    for (const [name, value] of Object.entries(signal)) {
      if (value === null || value === undefined || !Number.isFinite(value)) {
        out[name] = null;
        continue;
      }
      const bg = background[name];
      out[name] = (typeof bg === 'number' && Number.isFinite(bg)) ? value + bg : value;
    }
    return out;
  };

  const compositeByNameWithWarming = useMemo(
    () => mergeSignalWithBackground(compositeByName, warmingByName),
    [compositeByName, warmingByName, showBackgroundWarming],
  );

  const forecastByNameWithWarming = useMemo(
    () => mergeSignalWithBackground(forecastByName, warmingByName),
    [forecastByName, warmingByName, showBackgroundWarming],
  );

  const forecastByNameShadowWithWarming = useMemo(
    () => mergeSignalWithBackground(forecastByNameShadow, warmingByName),
    [forecastByNameShadow, warmingByName, showBackgroundWarming],
  );

  const activeValues = mode === 'corr'
    ? correlationByName
    : mode === 'simulate'
      ? compositeByNameWithWarming
      : mode === 'forecast'
        ? forecastByNameWithWarming
        : useYearSignalLayer
          ? yearSignalByName
          : valuesByName;

  const ensoAnom = useMemo(() => peakOniForYear(oniHistory, year), [oniHistory, year]);
  const state = ensoState(ensoAnom);
  const stateCls = state === 'El Niño'
    ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
    : state === 'La Niña'
      ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
      : 'border-gray-600 text-gray-300';

  const simState = ensoState(oniSlider);
  const simStateCls = simState === 'El Niño'
    ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
    : simState === 'La Niña'
      ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
      : 'border-gray-600 text-gray-300';
  const fcastState = forecastProbs ? ensoState(forecastProbs.oni) : null;
  const fcastStateCls = fcastState === 'El Niño'
    ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
    : fcastState === 'La Niña'
      ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
      : 'border-gray-600 text-gray-300';

  const stepYear = (delta: number) => setYear((y) => Math.max(minYear, Math.min(maxYear, y + delta)));
  const legendLeftLabel = mode === 'corr'
    ? metric === 'temp' ? 'La Niña-like' : 'Drier in El Niño'
    : metric === 'temp' ? 'Cooler' : 'Drier';
  const legendRightLabel = mode === 'corr'
    ? metric === 'temp' ? 'El Niño-like' : 'Wetter in El Niño'
    : metric === 'temp' ? 'Warmer' : 'Wetter';
  const legendLeftClass = metric === 'temp' ? 'text-sky-400' : 'text-rose-400';
  const legendRightClass = metric === 'temp' ? 'text-rose-400' : 'text-sky-400';
  const legendNote = mode === 'corr'
    ? metric === 'temp'
      ? 'Pearson r vs ONI (±0.6) - faded = |r|<0.2'
      : 'Pearson r vs ONI - red=drier, blue=wetter - faded = |r|<0.2'
    : (mode === 'year' && !useYearSignalLayer) || showBackgroundWarming
      ? `scale ±${metric === 'temp' ? '3°C' : '100%'} vs 1961-1990`
      : `ENSO signal scale ±${metric === 'temp' ? '3°C' : '100%'}`;
  const legendDetail = mode === 'corr'
    ? 'Map fixed; year scrubber inactive'
    : mode === 'simulate'
      ? showBackgroundWarming ? 'Map driven by ENSO strength slider + warming' : 'Map driven by ENSO strength slider'
      : mode === 'forecast'
        ? showBackgroundWarming ? 'Map driven by forecast horizon + warming' : 'Map driven by forecast horizon'
        : null;

  return (
    <div>
      {/* Header — prominent year/state + metric/window toggles (no title — page heading above is sufficient) */}
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div className="flex min-h-[28px] items-center gap-2 flex-wrap">
          {mode === 'year' && (
            <span className="inline-flex max-w-full items-baseline gap-1 sm:gap-2 whitespace-nowrap text-[#D0A65E]">
              <span className="font-mono font-black tabular-nums text-2xl sm:text-5xl leading-none">{year}</span>
              <span className={`relative -translate-y-[2px] sm:-translate-y-[3px] inline-flex items-center rounded-full border px-1 sm:px-2 py-[2px] sm:py-0.5 leading-none text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.08em] ${stateCls}`}>
                {state} {ensoAnom >= 0 ? '+' : ''}{ensoAnom.toFixed(2)}°
              </span>
            </span>
          )}
          {mode === 'corr' && (
            <span className="inline-flex max-w-full items-baseline gap-1 sm:gap-2 flex-wrap text-[#D0A65E]">
              <span className="font-mono font-black tabular-nums text-2xl sm:text-5xl leading-none">1950–{maxYear}</span>
              <span className="font-mono font-semibold text-base sm:text-2xl leading-none text-white">Correlation</span>
            </span>
          )}
          {mode === 'simulate' && (
            <span className="inline-flex max-w-full items-baseline gap-1 sm:gap-2 flex-wrap text-[#D0A65E]">
              <span className="font-mono font-black tabular-nums text-2xl sm:text-5xl leading-none">{simPhase.season}</span>
              <span className="font-mono font-semibold text-base sm:text-2xl leading-none text-white">
                {simPhase.phase === 'peak' ? 'Peak' : simPhase.phase === 'build' ? 'Build-up' : 'Aftermath'}
              </span>
              <span className={`relative -translate-y-[2px] sm:-translate-y-[3px] inline-flex items-center rounded-full border px-1 sm:px-2 py-[2px] sm:py-0.5 leading-none text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.08em] ${simStateCls}`}>
                {simState} {oniSlider >= 0 ? '+' : ''}{oniSlider.toFixed(2)}°
              </span>
            </span>
          )}
          {mode === 'forecast' && forecastHorizon && (
            <span className="inline-flex max-w-full items-baseline gap-1 sm:gap-2 flex-wrap text-[#D0A65E]">
              <span className="font-mono font-black tabular-nums text-2xl sm:text-5xl leading-none">{forecastHorizon.anchorYear}</span>
              <span className="font-mono font-semibold text-base sm:text-2xl leading-none text-white">{forecastHorizon.season}</span>
              {fcastState && (
                <span className={`relative -translate-y-[2px] sm:-translate-y-[3px] inline-flex items-center rounded-full border px-1 sm:px-2 py-[2px] sm:py-0.5 leading-none text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.08em] ${fcastStateCls}`}>
                  {fcastState} {forecastProbs!.oni >= 0 ? '+' : ''}{forecastProbs!.oni.toFixed(2)}°
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode: Year / Forecast / Simulate / Correlation */}
          <button
            type="button"
            onClick={() => setMode('year')}
            aria-pressed={mode === 'year'}
            className={`${TOGGLE_BASE} ${mode === 'year' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >Year</button>
          {(forecast && forecast.length > 0) && (
            <button
              type="button"
              onClick={() => setMode('forecast')}
              aria-pressed={mode === 'forecast'}
              className={`${TOGGLE_BASE} ${mode === 'forecast' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
            >Forecast</button>
          )}
          <button
            type="button"
            onClick={() => setMode('simulate')}
            aria-pressed={mode === 'simulate'}
            className={`${TOGGLE_BASE} ${mode === 'simulate' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >Simulate</button>
          <button
            type="button"
            onClick={() => setMode('corr')}
            aria-pressed={mode === 'corr'}
            className={`${TOGGLE_BASE} ${mode === 'corr' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >Correlation</button>
          {/* Metric: Temp / Rain */}
          <span className="inline-block h-4 w-px bg-gray-700 mx-0.5 shrink-0" aria-hidden />
          {showTempLayerControls ? (
            <div
              className="inline-flex h-7 items-center rounded-full border overflow-hidden"
              style={{
                borderColor: metric === 'temp' ? '#D0A65E8c' : '#374151',
                background: 'rgba(17,24,39,0.45)',
              }}
            >
              <button
                type="button"
                onClick={() => setMetric('temp')}
                aria-pressed={metric === 'temp'}
                className="inline-flex h-full items-center gap-1 px-2.5 text-[11px] sm:text-[12px] font-medium transition-colors hover:bg-white/[0.04]"
                style={{ color: metric === 'temp' ? '#FFF5E7' : '#D1D5DB' }}
              >
                <Thermometer className="h-3 w-3" />
                <span className="leading-none whitespace-nowrap">Temp</span>
              </button>
              <div aria-hidden className="h-3.5 w-px self-center" style={{ background: metric === 'temp' ? '#D0A65E55' : '#4B5563' }} />
              <Tip text="Shows the ENSO teleconnection signal after removing each country's long-term warming trend.">
                <button
                  type="button"
                  onClick={() => {
                    setMetric('temp');
                    if (mode === 'year') setYearTempLayerMode('signal');
                    else setTempLayerMode('signal');
                  }}
                  aria-pressed={metric === 'temp' && activeTempLayerMode === 'signal'}
                  className="inline-flex h-full items-center gap-1 px-2.5 text-[11px] sm:text-[12px] font-medium transition-colors hover:bg-white/[0.04]"
                  style={{
                    color: metric === 'temp' && activeTempLayerMode === 'signal' ? '#FFF5E7' : '#9CA3AF',
                    background: 'transparent',
                  }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: metric === 'temp' && activeTempLayerMode === 'signal' ? '#D0A65E' : 'transparent', border: `1px solid ${metric === 'temp' && activeTempLayerMode === 'signal' ? '#D0A65E' : '#4B5563'}` }}
                  />
                  <span className="leading-none whitespace-nowrap">ENSO</span>
                </button>
              </Tip>
              <div aria-hidden className="h-3.5 w-px self-center" style={{ background: metric === 'temp' ? '#D0A65E33' : '#4B5563' }} />
              <Tip text={mode === 'forecast' && forecastHorizon
                ? `Adds each country's linear background warming trend extrapolated to ${forecastHorizon.anchorYear}, so the map reads as a likely real-world anomaly versus 1961-1990.`
                : mode === 'year'
                  ? `Shows the full observed anomaly for ${year}, including both ENSO's imprint and the background warming trend, versus 1961-1990.`
                  : `Adds each country's linear background warming trend for ${maxYear}, so the map reads as a likely real-world anomaly versus 1961-1990.`}>
                <button
                  type="button"
                  onClick={() => {
                    setMetric('temp');
                    if (mode === 'year') setYearTempLayerMode('total');
                    else setTempLayerMode('total');
                  }}
                  aria-pressed={metric === 'temp' && activeTempLayerMode === 'total'}
                  className="inline-flex h-full items-center gap-1 px-2.5 text-[11px] sm:text-[12px] font-medium transition-colors hover:bg-white/[0.04]"
                  style={{
                    color: metric === 'temp' && activeTempLayerMode === 'total' ? '#FFF5E7' : '#9CA3AF',
                    background: 'transparent',
                  }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: metric === 'temp' && activeTempLayerMode === 'total' ? '#D0A65E' : 'transparent', border: `1px solid ${metric === 'temp' && activeTempLayerMode === 'total' ? '#D0A65E' : '#4B5563'}` }}
                  />
                  <span className="leading-none whitespace-nowrap">ENSO + Warming</span>
                </button>
              </Tip>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMetric('temp')}
              aria-pressed={metric === 'temp'}
              className={`${TOGGLE_BASE} ${metric === 'temp' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
            >
              <Thermometer className="h-3 w-3" /> Temp
            </button>
          )}
          <button
            type="button"
            onClick={() => setMetric('precip')}
            aria-pressed={metric === 'precip'}
            className={`${TOGGLE_BASE} ${metric === 'precip' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >
            <CloudRain className="h-3 w-3" /> Rain
          </button>
          {/* Window: Annual / MAM (hidden in Simulate & Forecast modes — the
              season slider / horizon slider replaces it) */}
          {mode !== 'simulate' && mode !== 'forecast' && (
            <>
              <span className="inline-block h-4 w-px bg-gray-700 mx-0.5" aria-hidden />
          <Tip text="Mar-May average - the 3-month window when ENSO’s lagged impact on land temperatures typically peaks (e.g. UK, East Africa, South Asia)">
              <button
                type="button"
                onClick={() => setAggWindow('mam')}
                aria-pressed={aggWindow === 'mam'}
                className={`${TOGGLE_BASE} ${aggWindow === 'mam' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
              >MAM</button>
              </Tip>
              <Tip text="Full calendar-year average - shows the cumulative signal across all seasons, useful when no single season dominates">
              <button
                type="button"
                onClick={() => setAggWindow('annual')}
                aria-pressed={aggWindow === 'annual'}
                className={`${TOGGLE_BASE} ${aggWindow === 'annual' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
              >Annual</button>
              </Tip>
            </>
          )}
        </div>
      </div>

      {mode === 'year' && (
        <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 px-3 py-2 mb-3">
          <div className="hidden sm:flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Playback - {year}</span>
          </div>
          <Scrubber history={oniHistory} year={year} onChange={setYear} />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 mt-2">
            <button
              type="button"
              onClick={() => stepYear(-1)}
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
              aria-label="Previous year"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5L9 12l11 7V5z"/></svg>
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className={`${TOGGLE_BASE} px-3 sm:px-4 font-semibold shrink-0`}
              style={playing
                ? { borderColor: '#D0A65E', background: '#D0A65E22', color: '#FFF5E7' }
                : { borderColor: '#D0A65E', background: '#D0A65E', color: '#0b0e16' }}
              aria-label={playing ? 'Pause animation' : 'Play animation'}
            >
              {playing
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg><span className="hidden sm:inline">Pause</span></>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7-11-7z"/></svg><span className="hidden sm:inline">Play</span></>}
            </button>
            <button
              type="button"
              onClick={() => stepYear(1)}
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
              aria-label="Next year"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5l11 7-11 7zM16 5h2v14h-2z"/></svg>
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setYear(minYear); }}
              className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
              <span className="hidden sm:inline">Reset</span>
            </button>
            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-gray-500">Speed</span>
              <input
                type="range"
                min={1}
                max={16}
                step={1}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-14 sm:w-20 min-w-0 accent-[#D0A65E]"
                aria-label="Playback speed (years per second)"
              />
              <span className="font-mono text-[10px] sm:text-[11px] text-[#FFF5E7] tabular-nums min-w-[2.5ch] sm:min-w-[3ch] shrink-0">{speed}×</span>
            </div>
          </div>
        </div>
      )}

      {/* ENSO strength + season sliders — only visible in Simulate mode */}
      {mode === 'simulate' && (() => {
        const s = oniSlider;
        const phase = s >= 0.5 ? 'El Niño' : s <= -0.5 ? 'La Niña' : 'Neutral';
        const strength =
          Math.abs(s) >= 2 ? 'Very strong' :
          Math.abs(s) >= 1.5 ? 'Strong' :
          Math.abs(s) >= 1 ? 'Moderate' :
          Math.abs(s) >= 0.5 ? 'Weak' : '—';
        const phaseTextCls = s >= 0.5
          ? 'text-rose-300'
          : s <= -0.5
            ? 'text-sky-300'
            : 'text-gray-300';

        return (
          <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 p-3 mb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-0 gap-4">

              <div className="md:pr-5">
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">ENSO Strength</div>
                  <div className={`mt-1.5 text-[11px] font-mono ${phaseTextCls}`}>
                    {phase !== 'Neutral' ? `${phase} - ${strength}` : 'Neutral'} - {s >= 0 ? '+' : ''}{s.toFixed(1)}°C
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-sky-400 whitespace-nowrap">La Niña</span>
                  <input
                    type="range"
                    min={-2.5}
                    max={3}
                    step={0.1}
                    value={oniSlider}
                    onChange={(e) => setOniSlider(Number(e.target.value))}
                    className="flex-1 accent-[#D0A65E]"
                    aria-label="ENSO strength (ONI in °C)"
                  />
                  <span className="text-[11px] font-mono text-rose-400 whitespace-nowrap text-right">El Niño</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1 px-14">
                  <span>−2</span><span>−1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span>
                </div>
                {Math.abs(oniSlider) > 2.5 && (
                  <div className="mt-1 text-[10px] font-mono text-amber-300/90 leading-snug">
                    Beyond observed range - values past ±2.5°C are linear extrapolations
                    of historical regression. Real teleconnections may saturate.
                  </div>
                )}
              </div>

              <div className="md:pl-5 md:border-l md:border-gray-700/40">
                <div className="mb-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Time of Year</div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1 select-none">
                  <span>← Build-up</span>
                  <span>Aftermath →</span>
                </div>
                <input
                  type="range"
                  min={SIM_PHASES[0].offset}
                  max={SIM_PHASES[SIM_PHASES.length - 1].offset}
                  step={1}
                  value={simPhase.offset}
                  onChange={(e) => {
                    const next = SIM_PHASES.find((phaseDef) => phaseDef.offset === Number(e.target.value));
                    if (next) setSimPhaseId(next.id);
                  }}
                  className="w-full accent-[#D0A65E]"
                  aria-label="Season offset from ENSO peak (DJF)"
                />
                <div className="flex text-[8px] font-mono text-gray-500 mt-0.5 select-none">
                  {SIM_PHASES.map((phaseDef) => {
                    const isActive = phaseDef.id === simPhase.id;
                    const isPeak = phaseDef.phase === 'peak';
                    return (
                      <span
                        key={phaseDef.id}
                        className={`flex-1 text-center ${isPeak ? 'text-[#D0A65E] font-bold' : isActive ? 'text-[#FFF5E7]' : ''}`}
                      >
                        {isPeak ? '▼' : phaseDef.season}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-1.5 text-[9px] sm:text-[10px] font-mono text-gray-500 whitespace-nowrap">
                  ▼ = peak DJF (Dec-Jan-Feb)
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Forecast panel — only visible in Forecast mode. Lets the reader
          drive the map from either the NOAA probabilistic plume or the
          SNU CNN (Ham et al. 2019) deterministic forecast, and scrub
          forward through the published horizons. */}
      {mode === 'forecast' && forecast && forecast.length > 0 && (() => {
        const probs = forecastProbs;

        return (
          <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 p-3 mb-3">
            {/* Source toggle + data pill.
                Stacks on narrow widths, shares the source row at medium
                widths, then becomes a truly centered overlay once the
                full row is wide enough to avoid collisions. */}
            <div
              ref={forecastHeaderRef}
              className={`mb-2 ${forecastPillLayout === 'stacked'
                ? 'flex flex-col gap-y-1.5'
                : forecastPillLayout === 'row'
                  ? 'flex items-center gap-x-3 gap-y-1.5'
                  : 'relative min-h-7'}`}
            >
              <div ref={forecastSourceRef} className={`inline-flex max-w-full self-start items-center gap-1.5 ${forecastPillLayout === 'overlay' ? 'relative z-10' : ''}`}>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500">Source</span>
                <button
                  type="button"
                  onClick={() => setForecastSrc('noaa')}
                  aria-pressed={forecastSrc === 'noaa'}
                  className={`${TOGGLE_BASE} ${forecastSrc === 'noaa' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
                >NOAA/IRI</button>
                <button
                  type="button"
                  onClick={() => setForecastSrc('cnn')}
                  aria-pressed={forecastSrc === 'cnn'}
                  disabled={!cnnForecast || cnnForecast.points.length === 0}
                  className={`${TOGGLE_BASE} ${forecastSrc === 'cnn' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE} disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={!cnnForecast ? 'SNU CNN forecast unavailable' : 'SNU CNN (Ham et al. 2019)'}
                >SNU CNN</button>
              </div>
              {forecastHorizon && (() => {
                const fmtV = (v: number | null | undefined) =>
                  (v == null || !Number.isFinite(v as number)) ? '—' : `${(v as number) >= 0 ? '+' : ''}${(v as number).toFixed(2)}°C`;
                const noaaV = forecastProbs?.oni ?? null;
                const cnnV = cnnAnomForSeason(cnnForecast?.points, forecastHorizon.season, forecastHorizon.anchorYear);
                const delta = (typeof noaaV === 'number' && typeof cnnV === 'number') ? cnnV - noaaV : null;
                return (
                  <div className={forecastPillLayout === 'overlay'
                    ? 'absolute inset-0 flex items-center justify-center'
                    : forecastPillLayout === 'row'
                      ? 'flex flex-1 justify-center'
                      : 'flex justify-center'}>
                    <div ref={forecastDataPillRef} className="flex items-center gap-2 whitespace-nowrap text-[10px] sm:text-[11px] font-mono rounded-md border border-gray-700/70 bg-gray-900/90 px-2 py-0.5">
                      <span className="text-[#FFF5E7]">{forecastHorizon.season} {forecastHorizon.anchorYear}</span>
                      <span className="text-rose-300">NOAA {fmtV(noaaV)}</span>
                      <span className="text-violet-300">CNN {fmtV(cnnV)}</span>
                      {delta !== null && (
                        <span className="text-amber-300">Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)}°C</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Mini forecast strip — both forecasts always plotted; the inactive
                one is dimmed so the reader keeps visual context. */}
            <div className="mt-0.5">
              <ForecastStrip
                forecast={forecast}
                cnn={cnnForecast || null}
                activeIdx={forecastIdx}
                onPick={(i) => setForecastIdx(i)}
                activeSrc={forecastSrc}
                hidePill
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 mt-2.5">
              <button
                type="button"
                onClick={() => setForecastIdx((idx) => Math.max(0, idx - 1))}
                className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
                aria-label="Previous forecast horizon"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5L9 12l11 7V5z"/></svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!forecastPlaying && forecastIdx >= forecast.length - 1) setForecastIdx(0);
                  setForecastPlaying((p) => !p);
                }}
                className={`${TOGGLE_BASE} px-3 sm:px-4 font-semibold shrink-0`}
                style={forecastPlaying
                  ? { borderColor: '#D0A65E', background: '#D0A65E22', color: '#FFF5E7' }
                  : { borderColor: '#D0A65E', background: '#D0A65E', color: '#0b0e16' }}
                aria-label={forecastPlaying ? 'Pause forecast playback' : 'Play forecast playback'}
              >
                {forecastPlaying
                  ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg><span className="hidden sm:inline">Pause</span></>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7-11-7z"/></svg><span className="hidden sm:inline">Play</span></>}
              </button>
              <button
                type="button"
                onClick={() => setForecastIdx((idx) => Math.min(forecast.length - 1, idx + 1))}
                className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
                aria-label="Next forecast horizon"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5l11 7-11 7zM16 5h2v14h-2z"/></svg>
              </button>
              <button
                type="button"
                onClick={() => { setForecastPlaying(false); setForecastIdx(0); }}
                className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-2.5 sm:px-3 shrink-0`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
                <span className="hidden sm:inline">Reset</span>
              </button>
              <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
                <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-gray-500">Speed</span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={forecastSpeed}
                  onChange={(e) => setForecastSpeed(Number(e.target.value))}
                  className="w-12 sm:w-16 min-w-0 accent-[#D0A65E]"
                  aria-label="Forecast playback speed (horizons per second)"
                />
                <span className="font-mono text-[10px] sm:text-[11px] text-[#FFF5E7] tabular-nums min-w-[2.5ch] sm:min-w-[3ch] shrink-0">{forecastSpeed}×</span>
              </div>
            </div>


          </div>
        );
      })()}

      {/* Map — the WorldMapShell inside `Inner` handles sizing, tiles and
          the Pacific-centred fit. The relative wrapper is needed so the
          absolute-positioned hover info panel stays inside the map area. */}
      <div className="relative">
        <Inner values={activeValues} metric={metric} mode={mode} year={year} ensoAnom={mode === 'simulate' ? oniSlider : mode === 'forecast' ? (forecastProbs?.oni ?? 0) : ensoAnom} isMobile={isMobile} onHover={setHovered} />
        {/* Bottom hover info panel — replaces mouse-following Leaflet tooltips,
            works on both desktop and mobile touch. */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-[1001] bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/60 px-3 py-2 pointer-events-none transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}
        >
          {hovered ? (() => {
            const { name, value } = hovered;
            const bgValue = metric === 'temp' ? warmingByName[name] ?? null : null;
            const simSignal = mode === 'simulate' ? compositeByName[name] ?? null : null;
            const yearSignalVal = (mode === 'year' && metric === 'temp') ? (yearSignalByName[name] ?? null) : null;
            const showsYearTempSignal = mode === 'year' && metric === 'temp' && activeTempLayerMode === 'signal';
            let valStr = '';
            if (value === null || value === undefined) {
              valStr = 'no data';
            } else if (mode === 'corr') {
              const dir = metric === 'temp'
                ? (value >= 0 ? 'El Niño-linked' : 'La Niña-linked')
                : (value >= 0 ? 'wetter in El Niño' : 'drier in El Niño');
              valStr = `r = ${value >= 0 ? '+' : ''}${value.toFixed(2)} - ${dir}`;
            } else if (metric === 'temp') {
              valStr = showsYearTempSignal || (!showBackgroundWarming && mode !== 'year')
                ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}°C ENSO signal`
                : `${value >= 0 ? '+' : ''}${value.toFixed(2)}°C vs 1961-90`;
            } else {
              valStr = mode === 'year'
                ? `${value >= 0 ? '+' : ''}${value.toFixed(0)}% vs 1961-90`
                : `${value >= 0 ? '+' : ''}${value.toFixed(0)}% ENSO signal`;
            }
            const modeCtx = mode === 'year'
              ? `${year}${metric === 'temp' ? ` - ${activeTempLayerMode === 'signal' ? 'ENSO' : 'ENSO + Warming'}` : ''}`
              : mode === 'corr'
                ? 'ONI correlation'
                : mode === 'forecast'
                  ? `${forecastHorizon?.season ?? 'Forecast'}${showBackgroundWarming ? ' + warming' : ''}`
                  : showBackgroundWarming
                    ? 'Simulated + warming'
                    : 'Simulated';
              const fmtBreakout = (v: number | null | undefined) => {
                if (v === null || v === undefined || !Number.isFinite(v as number)) return '—';
                if (metric === 'temp') return `${v >= 0 ? '+' : ''}${(v as number).toFixed(2)}°C`;
                return `${v >= 0 ? '+' : ''}${(v as number).toFixed(0)}%`;
              };
              const simulateBreakout = mode === 'simulate' && metric === 'temp' && showBackgroundWarming ? (
                <>
                  <span className="text-[11px] font-mono text-amber-200/90">ENSO {fmtBreakout(simSignal)}</span>
                <span className="text-[11px] font-mono text-gray-400">warm {fmtBreakout(bgValue)}</span>
                  <span className="text-[11px] font-mono text-[#FFF5E7]">total {fmtBreakout(value)}</span>
                </>
              ) : null;
            const yearBreakout = mode === 'year' && metric === 'temp' && activeTempLayerMode === 'total' && yearSignalVal !== null && value !== null ? (
              <>
                <span className="text-[11px] font-mono text-amber-200/90">ENSO {fmtBreakout(yearSignalVal)}</span>
                <span className="text-[11px] font-mono text-[#FFF5E7]">total {fmtBreakout(value)}</span>
              </>
            ) : null;
            // In Forecast mode, show BOTH NOAA & CNN values + delta, so the
            // tooltip itself is the comparison surface (Option C).
            const dualForecast = mode === 'forecast' ? (() => {
                const noaaSignal = forecastSrc === 'noaa' ? (forecastByName[name] ?? null) : (forecastByNameShadow[name] ?? null);
                const cnnSignal  = forecastSrc === 'cnn'  ? (forecastByName[name] ?? null) : (forecastByNameShadow[name] ?? null);
                const noaaTotal = forecastSrc === 'noaa' ? value : forecastByNameShadowWithWarming[name];
                const cnnTotal  = forecastSrc === 'cnn'  ? value : forecastByNameShadowWithWarming[name];
                const dPart = (typeof noaaTotal === 'number' && typeof cnnTotal === 'number') ? (() => {
                  const d = (cnnTotal as number) - (noaaTotal as number);
                  const dStr = metric === 'temp' ? `${d >= 0 ? '+' : ''}${d.toFixed(2)}°C` : `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`;
                  return <span className="text-[11px] font-mono text-amber-300">Δ total {dStr}</span>;
              })() : null;
              return (
                <>
                    {metric === 'temp' && showBackgroundWarming && (
                    <span className="text-[11px] font-mono text-gray-400">warm {fmtBreakout(bgValue)}</span>
                    )}
                    <span className="text-[11px] font-mono text-rose-300/90">
                    NOAA {metric === 'temp' && showBackgroundWarming ? `sig ${fmtBreakout(noaaSignal)} total ${fmtBreakout(noaaTotal)}` : fmtBreakout(noaaTotal)}
                    </span>
                    <span className="text-[11px] font-mono text-violet-300/90">
                    CNN {metric === 'temp' && showBackgroundWarming ? `sig ${fmtBreakout(cnnSignal)} total ${fmtBreakout(cnnTotal)}` : fmtBreakout(cnnTotal)}
                    </span>
                  {dPart}
                </>
              );
            })() : null;
            return (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-white">{name}</span>
                {mode === 'forecast'
                  ? dualForecast
                    : yearBreakout ?? simulateBreakout ?? <span className="text-[12px] font-mono text-gray-300">{valStr}</span>}
                <span className="hidden sm:inline text-[10px] text-gray-500 sm:ml-auto">{modeCtx}</span>
              </div>
            );
          })() : (
            <p className="text-[11px] text-gray-500 italic">Hover or tap a country to see its value</p>
          )}
        </div>
      </div>

      {/* Legend strip */}
      <div className="px-1 py-2 mt-1 flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono text-gray-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={legendLeftClass}>{legendLeftLabel}</span>
          <span
            className="inline-block h-2 w-36 rounded"
            style={{
              background: (metric === 'temp')
                ? 'linear-gradient(90deg, rgba(14,165,233,0.85), rgba(100,116,139,0.15), rgba(244,63,94,0.85))'
                : 'linear-gradient(90deg, rgba(244,63,94,0.85), rgba(100,116,139,0.15), rgba(14,165,233,0.85))',
            }}
          />
          <span className={legendRightClass}>{legendRightLabel}</span>
          <span className="text-gray-500 ml-1">{legendNote}</span>
        </div>
        <div className="hidden sm:block text-gray-500">
          {legendDetail}
        </div>
      </div>

      {/* Top correlations panel — only in correlation mode. Shows the
          countries with the strongest positive and negative Pearson r so
          readers can see which teleconnections drive the map. */}
      {mode === 'corr' && (() => {
        const entries = Object.entries(correlationByName)
          .filter(([, v]) => typeof v === 'number' && Number.isFinite(v as number)) as Array<[string, number]>;
        const sorted = [...entries].sort((a, b) => b[1] - a[1]);
        const topPos = sorted.slice(0, 6);
        const topNeg = sorted.slice(-6).reverse();
        const posMeta = metric === 'temp'
          ? {
              box: 'border-rose-900/40 bg-rose-950/20',
              heading: 'text-rose-400/80',
              value: 'text-rose-400',
              title: 'Strongest El Niño-like',
              desc: 'Warmer in El Niño / cooler in La Niña',
            }
          : {
              box: 'border-sky-900/40 bg-sky-950/20',
              heading: 'text-sky-400/80',
              value: 'text-sky-400',
              title: 'Strongest wetter-with-El Niño',
              desc: 'Wetter in El Niño / drier in La Niña',
            };
        const negMeta = metric === 'temp'
          ? {
              box: 'border-sky-900/40 bg-sky-950/20',
              heading: 'text-sky-400/80',
              value: 'text-sky-400',
              title: 'Strongest La Niña-like',
              desc: 'Cooler in El Niño / warmer in La Niña',
            }
          : {
              box: 'border-rose-900/40 bg-rose-950/20',
              heading: 'text-rose-400/80',
              value: 'text-rose-400',
              title: 'Strongest drier-with-El Niño',
              desc: 'Drier in El Niño / wetter in La Niña',
            };
        const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className={`rounded border p-2 ${posMeta.box}`}>
              <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${posMeta.heading}`}>
                {posMeta.title} · {posMeta.desc}
              </div>
              <ul className="space-y-0.5 text-[11px] font-mono text-gray-300">
                {topPos.map(([n, v]) => (
                  <li key={n} className="flex justify-between gap-2">
                    <span className="truncate">{n}</span>
                    <span className={`${posMeta.value} tabular-nums`}>{fmt(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`rounded border p-2 ${negMeta.box}`}>
              <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${negMeta.heading}`}>
                {negMeta.title} · {negMeta.desc}
              </div>
              <ul className="space-y-0.5 text-[11px] font-mono text-gray-300">
                {topNeg.map(([n, v]) => (
                  <li key={n} className="flex justify-between gap-2">
                    <span className="truncate">{n}</span>
                    <span className={`${negMeta.value} tabular-nums`}>{fmt(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

      <p className="text-[11px] text-gray-500 mt-3 leading-snug">
        {mode === 'corr' ? (
          <>
            <strong className="text-gray-300">Correlation.</strong>{' '}
            How closely does each country track ENSO? Colour shows the Pearson r between its{' '}
            {aggWindow === 'annual' ? 'Jan-Dec' : 'Mar-May'} {metric === 'temp' ? 'temperature' : 'rainfall'} anomaly
            and that year&rsquo;s peak ONI (1950-present, both series detrended).
            {metric === 'temp'
              ? ' Red = in phase with El Nino; blue = opposite.'
              : ' Blue = wetter in El Nino / drier in La Nina; red = drier in El Nino / wetter in La Nina.'}
            {' '}Faded = weak link (|r|&nbsp;&lt;&nbsp;0.2).
          </>
        ) : mode === 'simulate' ? (
          <>
            <strong className="text-gray-300">Simulate.</strong>{' '}
            Expected {metric === 'temp' ? 'temperature' : 'rainfall'} anomaly in{' '}
            <strong className="text-gray-300">{simPhaseText}</strong> at the selected ONI level,
            estimated from each country&rsquo;s detrended historical response to ENSO.
            Season slider spans a typical ENSO cycle from early build-up to late aftermath.
            {metric === 'temp' && ' The ENSO + warming toggle adds each country\'s fitted background warming trend for the latest full observed year.'}
          </>
        ) : mode === 'forecast' ? (
          <>
            <strong className="text-gray-300">Forecast.</strong>{' '}
            Probability-weighted historical composite for the selected horizon —
            P(EN)·C<sub>EN</sub> + P(LN)·C<sub>LN</sub> + P(N)·C<sub>N</sub> per country.
            Switch source to compare the <span className="text-rose-300">NOAA/IRI plume</span> with the{' '}
            <span className="text-violet-300">SNU CNN (Ham et al. 2019)</span> deterministic forecast;
            the tooltip shows both values and their delta.
            {metric === 'temp' && ' The ENSO + warming toggle adds a fitted background warming trend extrapolated to the selected forecast year.'}
            {' '}CNN forecasts: Seoul National University ACE Lab.
          </>
        ) : metric === 'temp' && activeTempLayerMode === 'signal' ? (
          <>
            Detrended observed temperature anomaly for {year}{' '}
            ({aggWindow === 'annual' ? 'Jan-Dec' : 'Mar-May'}), isolating ENSO&rsquo;s signal after removing each country&rsquo;s linear warming trend.
            Switch to <span className="text-gray-300">ENSO + Warming</span> to restore the full anomaly versus the 1961-1990 baseline.
          </>
        ) : (
          <>
            Observed {metric === 'temp' ? 'temperature' : 'rainfall'} anomaly vs the 1961-1990 baseline for {year}{' '}
            ({aggWindow === 'annual' ? 'Jan-Dec' : 'Mar-May'}).
            Includes both ENSO&rsquo;s imprint and the background warming trend -
            switch to Correlation or Simulate to isolate the ENSO signal.
          </>
        )}
        {' '}Data: Berkeley Earth (temperature), World Bank CKP (rainfall), NOAA CPC (ONI).
      </p>
    </div>
  );
}
