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
type Mode = 'year' | 'corr' | 'simulate';

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
  'Canada', 'United States of America', 'Brazil', 'Peru',
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
 *  Main tracker component
 * ───────────────────────────────────────────────────────────────────────── */
export default function EnsoImpactTracker({
  oniHistory,
}: {
  oniHistory: OniRow[];
}) {
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [year, setYear] = useState(() => (loadFootprintPrefs().year as number) ?? 1998);
  const [metric, setMetric] = useState<Metric>(() => (loadFootprintPrefs().metric as Metric) ?? 'temp');
  const [aggWindow, setAggWindow] = useState<AggWindow>(() => (loadFootprintPrefs().aggWindow as AggWindow) ?? 'mam');
  const [mode, setMode] = useState<Mode>(() => (loadFootprintPrefs().mode as Mode) ?? 'year');
  // ENSO strength slider for Composite mode — units are °C of ONI (Niño-3.4
  // SST anomaly). Standard event thresholds: ±0.5 = weak, ±1 = moderate,
  // ±1.5 = strong, ±2 = very strong (e.g. 1997, 2015).
  const [oniSlider, setOniSlider] = useState(() => (loadFootprintPrefs().oniSlider as number) ?? 1.5);
  // Season slider for Composite mode — 12 NOAA-style overlapping 3-month
  // windows. JFM is the canonical post-peak window where the lagged land
  // response to a DJF SST peak is cleanest worldwide.
  const [season, setSeason] = useState<Season>(() => (loadFootprintPrefs().season as Season) ?? 'JFM');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => (loadFootprintPrefs().speed as number) ?? 4); // years per second
  const [hovered, setHovered] = useState<{ name: string; value: number | null } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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
        year, metric, aggWindow, mode, oniSlider, season, speed,
      }));
    } catch { /* storage unavailable */ }
  }, [year, metric, aggWindow, mode, oniSlider, season, speed]);

  // Load pre-computed impact dataset.
  useEffect(() => {
    let cancelled = false;
    fetch('/data/climate/enso-impact.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setImpact(j as ImpactData); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

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

  // Build a featureName → anomaly lookup for the current year/metric/window.
  const valuesByName = useMemo(() => {
    if (!impact) return {};
    const yIdx = impact.years.indexOf(year);
    if (yIdx < 0) return {};
    const w = aggWindow === 'annual' ? 'annual' : 'MAM';
    const seasonal = (impact as any).seasonal as Record<string, any> | undefined;
    const bucket =
      (seasonal?.[w]?.[metric]?.country
        ?? (aggWindow === 'annual'
          ? (impact as any).annual?.[metric]?.country
          : (impact as any).mam?.[metric]?.country)) as Record<string, (number | null)[]> | undefined;
    if (!bucket) return {};
    const out: Record<string, number | null> = {};
    for (const iso3 of Object.keys(bucket)) {
      const name = impact.countryNames[iso3] ? mapEnsoCountryName(impact.countryNames[iso3]) : null;
      if (!name) continue;
      const arr = bucket[iso3];
      out[name] = arr?.[yIdx] ?? null;
    }
    return out;
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
    () => {
      const earlyYear = new Set(['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ']);
      const lag = earlyYear.has(season) ? 1 : 0;
      return computeEnsoStats(season, lag);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [impact, metric, season, oniByYear],
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

  const activeValues = mode === 'corr'
    ? correlationByName
    : mode === 'simulate'
      ? compositeByName
      : valuesByName;

  const ensoAnom = useMemo(() => peakOniForYear(oniHistory, year), [oniHistory, year]);
  const state = ensoState(ensoAnom);
  const stateCls = state === 'El Niño'
    ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
    : state === 'La Niña'
      ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
      : 'border-gray-600 text-gray-300';

  const minYear = impact?.years[0] ?? 1950;
  // Cap at last full calendar year so partial-year data doesn't show at end of playback
  const dataMaxYear = impact?.years[impact.years.length - 1] ?? new Date().getFullYear();
  const maxYear = Math.min(dataMaxYear, new Date().getFullYear() - 1);
  const stepYear = (delta: number) => setYear((y) => Math.max(minYear, Math.min(maxYear, y + delta)));

  return (
    <div>
      {/* Header — prominent year/state + metric/window toggles (no title — page heading above is sufficient) */}
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {mode === 'year' && (
            <>
              <span className="font-mono font-black tabular-nums text-2xl sm:text-5xl text-[#D0A65E] leading-none">{year}</span>
              <span className={`inline-flex self-end mb-0.5 items-center rounded-full border px-1 sm:px-2 py-[2px] sm:py-0.5 leading-none text-[7px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.08em] ${stateCls}`}>
                {state} {ensoAnom >= 0 ? '+' : ''}{ensoAnom.toFixed(2)}°
              </span>
            </>
          )}
          {mode === 'corr' && (
            <span className="font-mono font-semibold text-base text-[#D0A65E]">ENSO Teleconnection · 1950–{maxYear}</span>
          )}
          {mode === 'simulate' && (
            <span className="font-mono font-semibold text-base text-[#D0A65E]">{season} · ONI {oniSlider >= 0 ? '+' : ''}{oniSlider.toFixed(1)}°C</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode: Year / Correlation / Simulate */}
          <button
            type="button"
            onClick={() => setMode('year')}
            aria-pressed={mode === 'year'}
            className={`${TOGGLE_BASE} ${mode === 'year' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >Year</button>
          <button
            type="button"
            onClick={() => setMode('corr')}
            aria-pressed={mode === 'corr'}
            className={`${TOGGLE_BASE} ${mode === 'corr' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >Correlation</button>
          <button
            type="button"
            onClick={() => setMode('simulate')}
            aria-pressed={mode === 'simulate'}
            className={`${TOGGLE_BASE} ${mode === 'simulate' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >Simulate</button>
          {/* Metric: Temp / Rain */}
          <span className="inline-block h-4 w-px bg-gray-700 mx-0.5 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={() => setMetric('temp')}
            aria-pressed={metric === 'temp'}
            className={`${TOGGLE_BASE} ${metric === 'temp' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >
            <Thermometer className="h-3 w-3" /> Temp
          </button>
          <button
            type="button"
            onClick={() => setMetric('precip')}
            aria-pressed={metric === 'precip'}
            className={`${TOGGLE_BASE} ${metric === 'precip' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}
          >
            <CloudRain className="h-3 w-3" /> Rain
          </button>
          {/* Window: Annual / MAM (hidden in Simulate mode — the season
              slider replaces it) */}
          {mode !== 'simulate' && (
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

      {/* ENSO strength + season sliders — only visible in Simulate mode */}
      {mode === 'simulate' && (() => {
        const s = oniSlider;
        const phase = s >= 0.5 ? 'El Niño' : s <= -0.5 ? 'La Niña' : 'Neutral';
        const strength =
          Math.abs(s) >= 2 ? 'Very strong' :
          Math.abs(s) >= 1.5 ? 'Strong' :
          Math.abs(s) >= 1 ? 'Moderate' :
          Math.abs(s) >= 0.5 ? 'Weak' : '—';
        const chipCls = s >= 0.5
          ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
          : s <= -0.5
            ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
            : 'border-gray-600 text-gray-300';

        // Season slider is expressed as an offset from the ENSO peak month (DJF = 0).
        // Negative offsets = build-up phase; positive = aftermath/land response.
        // Mapping: offset → SEASONS index (DJF is index 0, wrapping circularly).
        // Range: −4 (ASO, 4 months before peak) .. +7 (JAS, 7 months after peak)
        // covering all 12 NOAA windows.
        const DJF_IDX = 0; // DJF is index 0 in SEASONS
        const seasonOffset = ((SEASONS.indexOf(season) - DJF_IDX + 12) % 12);
        // Map raw index difference to signed offset: 0..5 = +0..+5; 6..11 = -6..-1
        const signedOffset = seasonOffset <= 7 ? seasonOffset : seasonOffset - 12;
        // Offset label helpers
        const offsetLabel = (o: number) => {
          const idx = ((DJF_IDX + o) % 12 + 12) % 12;
          return SEASONS[idx];
        };

        return (
          <div className="rounded-lg border border-gray-700/60 bg-gray-900/40 p-3 mb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-0 gap-4">

              {/* ── Strength slider ── */}
              <div className="md:pr-5">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div>
                    <div className="text-[13px] font-semibold text-gray-200 font-mono">ENSO Strength</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">How strong is the event?</div>
                  </div>
                  <span className={`text-[12px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-semibold ${chipCls}`}>
                    {phase !== 'Neutral' ? `${phase} · ${strength}` : 'Neutral'} &nbsp;{s >= 0 ? '+' : ''}{s.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-sky-400 whitespace-nowrap">La Niña<br/><span className="text-[10px] text-sky-400/70">(cooler)</span></span>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={oniSlider}
                    onChange={(e) => setOniSlider(Number(e.target.value))}
                    className="flex-1 accent-[#D0A65E]"
                    aria-label="ENSO strength (ONI in °C)"
                  />
                  <span className="text-[11px] font-mono text-rose-400 whitespace-nowrap text-right">El Niño<br/><span className="text-[10px] text-rose-400/70">(warmer)</span></span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1 px-14">
                  <span>−2</span><span>−1</span><span>0</span><span>+1</span><span>+2</span>
                </div>
              </div>

              {/* ── Season / timing slider ── */}
              <div className="md:pl-5 md:border-l md:border-gray-700/40">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div>
                    <div className="text-[13px] font-semibold text-gray-200 font-mono">Time of Year</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Before or after the event peaks?</div>
                  </div>
                  <span className="text-[12px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#D0A65E]/50 bg-[#D0A65E]/10 text-[#FFE5B4]">
                    {season} · {SEASON_LABEL[season]}
                  </span>
                </div>
                {/* Slider: min=−4 (ASO, 4 months before peak), max=+7 (JAS, 7 months after) */}
                {/* Simple edge labels only — ▼ in tick row marks the DJF peak position */}
                <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1 select-none">
                  <span>← Build-up</span>
                  <span>Aftermath →</span>
                </div>
                <input
                  type="range"
                  min={-4}
                  max={7}
                  step={1}
                  value={signedOffset}
                  onChange={(e) => {
                    const o = Number(e.target.value);
                    setSeason(SEASONS[((DJF_IDX + o) % 12 + 12) % 12]);
                  }}
                  className="w-full accent-[#D0A65E]"
                  aria-label="Season offset from ENSO peak (DJF)"
                />
                {/* Tick labels — ▼ marks DJF (the ENSO peak), first letter otherwise */}
                <div className="flex text-[9px] font-mono text-gray-500 mt-0.5 select-none">
                  {[-4,-3,-2,-1,0,1,2,3,4,5,6,7].map((o) => {
                    const lbl = offsetLabel(o);
                    const isActive = lbl === season;
                    const isPeak = o === 0;
                    return (
                      <span
                        key={o}
                        className={`flex-1 text-center ${isPeak ? 'text-[#D0A65E] font-bold' : isActive ? 'text-[#FFF5E7]' : ''}`}
                      >
                        {isPeak ? '▼' : lbl[0]}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-1.5 text-[10px] font-mono text-gray-500">
                  ▼ = DJF (Dec–Jan–Feb) — the typical peak of an El Niño or La Niña
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Map — the WorldMapShell inside `Inner` handles sizing, tiles and
          the Pacific-centred fit. The relative wrapper is needed so the
          absolute-positioned hover info panel stays inside the map area. */}
      <div className="relative">
        <Inner values={activeValues} metric={metric} mode={mode} year={year} ensoAnom={mode === 'simulate' ? oniSlider : ensoAnom} isMobile={isMobile} onHover={setHovered} />
        {/* Bottom hover info panel — replaces mouse-following Leaflet tooltips,
            works on both desktop and mobile touch. */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-[1001] bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/60 px-3 py-2 pointer-events-none transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}
        >
          {hovered ? (() => {
            const { name, value } = hovered;
            let valStr = '';
            if (value === null || value === undefined) {
              valStr = 'no data';
            } else if (mode === 'corr') {
              const dir = (metric === 'temp' ? value : -value) >= 0 ? 'in phase with El Niño' : 'in phase with La Niña';
              valStr = `r = ${value >= 0 ? '+' : ''}${value.toFixed(2)} · ${dir}`;
            } else if (metric === 'temp') {
              valStr = `${value >= 0 ? '+' : ''}${value.toFixed(2)}°C vs 1961–90 baseline`;
            } else {
              valStr = `${value >= 0 ? '+' : ''}${value.toFixed(0)}% precipitation vs 1961–90 baseline`;
            }
            const modeCtx = mode === 'year' ? `${year}` : mode === 'corr' ? 'Correlation with ONI' : 'Simulated response';
            return (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-white">{name}</span>
                <span className="text-[12px] font-mono text-gray-300">{valStr}</span>
                <span className="text-[10px] text-gray-500 ml-auto">{modeCtx}</span>
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
          <span className="text-sky-400">
            {mode === 'corr'
              ? <>La Niña&ndash;like{metric === 'temp' ? ' (cooler)' : ' (wetter)'}</>
              : (metric === 'temp' ? 'Cooler' : 'Drier')}
          </span>
          <span
            className="inline-block h-2 w-36 rounded"
            style={{
              background: (metric === 'temp')
                ? 'linear-gradient(90deg, rgba(14,165,233,0.85), rgba(100,116,139,0.15), rgba(244,63,94,0.85))'
                : 'linear-gradient(90deg, rgba(244,63,94,0.85), rgba(100,116,139,0.15), rgba(14,165,233,0.85))',
            }}
          />
          <span className="text-rose-400">
            {mode === 'corr'
              ? <>El Niño&ndash;like{metric === 'temp' ? ' (warmer)' : ' (drier)'}</>
              : (metric === 'temp' ? 'Warmer' : 'Wetter')}
          </span>
          <span className="text-gray-500 ml-1">
            {mode === 'corr'
              ? 'Pearson r vs ONI (±0.6) · faded = |r|<0.2'
              : `scale ±${metric === 'temp' ? '3°C' : '100%'} vs 1961–1990`}
          </span>
        </div>
        <div className="hidden sm:block text-gray-500">
          {mode === 'corr' ? 'Map fixed; year scrubber inactive'
            : mode === 'simulate' ? 'Map driven by ENSO strength slider'
            : null}
        </div>
      </div>

      {/* Top correlations panel — only in correlation mode. Shows the
          countries with the strongest positive and negative Pearson r so
          readers can see which teleconnections drive the map. */}
      {mode === 'corr' && (() => {
        const entries = Object.entries(correlationByName)
          .filter(([, v]) => typeof v === 'number' && Number.isFinite(v as number)) as Array<[string, number]>;
        // For precip we display r as-is (sign represents wetter-with-El-Niño
        // when positive, since the colour function flips it). For temp, positive
        // r already means warmer-with-El-Niño.
        const sorted = [...entries].sort((a, b) => b[1] - a[1]);
        const topPos = sorted.slice(0, 6);
        const topNeg = sorted.slice(-6).reverse();
        const label = metric === 'temp'
          ? { pos: 'Warmer in El Niño / cooler in La Niña', neg: 'Cooler in El Niño / warmer in La Niña' }
          : { pos: 'Drier in El Niño / wetter in La Niña',  neg: 'Wetter in El Niño / drier in La Niña' };
        const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="rounded border border-rose-900/40 bg-rose-950/20 p-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400/80 mb-1">
                Strongest El Niño–like · {label.pos}
              </div>
              <ul className="space-y-0.5 text-[11px] font-mono text-gray-300">
                {topPos.map(([n, v]) => (
                  <li key={n} className="flex justify-between gap-2">
                    <span className="truncate">{n}</span>
                    <span className="text-rose-400 tabular-nums">{fmt(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-sky-900/40 bg-sky-950/20 p-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400/80 mb-1">
                Strongest La Niña–like · {label.neg}
              </div>
              <ul className="space-y-0.5 text-[11px] font-mono text-gray-300">
                {topNeg.map(([n, v]) => (
                  <li key={n} className="flex justify-between gap-2">
                    <span className="truncate">{n}</span>
                    <span className="text-sky-400 tabular-nums">{fmt(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

      {/* Scrubber + playback controls — shown in Year mode only */}
      {mode === 'year' && (
      <div className="rounded-lg border border-[#D0A65E]/40 bg-gray-900/40 px-3 py-2 mt-1">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Playback · {mode === 'year' ? year : mode === 'simulate' ? `ONI ${oniSlider >= 0 ? '+' : ''}${oniSlider.toFixed(1)}°C` : '1950-present'}</span>
        </div>
        <Scrubber history={oniHistory} year={year} onChange={setYear} />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {/* Step back */}
          <button
            type="button"
            onClick={() => stepYear(-1)}
            className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-3`}
            aria-label="Previous year"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5L9 12l11 7V5z"/></svg>
          </button>
          {/* Play / Pause */}
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={`${TOGGLE_BASE} px-4 font-semibold`}
            style={playing
              ? { borderColor: '#D0A65E', background: '#D0A65E22', color: '#FFF5E7' }
              : { borderColor: '#D0A65E', background: '#D0A65E', color: '#0b0e16' }}
            aria-label={playing ? 'Pause animation' : 'Play animation'}
          >
            {playing
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg> Pause</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7-11-7z"/></svg> Play</>}
          </button>
          {/* Step forward */}
          <button
            type="button"
            onClick={() => stepYear(1)}
            className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-3`}
            aria-label="Next year"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5l11 7-11 7zM16 5h2v14h-2z"/></svg>
          </button>
          {/* Reset */}
          <button
            type="button"
            onClick={() => { setPlaying(false); setYear(minYear); }}
            className={`${TOGGLE_BASE} ${TOGGLE_INACTIVE} px-3`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
            Reset
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Speed</span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-20 accent-[#D0A65E]"
              aria-label="Playback speed (years per second)"
            />
            <span className="font-mono text-[11px] text-[#FFF5E7] tabular-nums min-w-[3ch]">{speed}×</span>
          </div>
        </div>
      </div>
      )}

      <p className="text-[11px] text-gray-500 mt-3 leading-snug">
        {mode === 'corr' ? (
          <>
            <strong className="text-gray-300">Correlation.</strong>{' '}
            How closely does each country track ENSO? Colour shows the Pearson r between its{' '}
            {aggWindow === 'annual' ? 'Jan-Dec' : 'Mar-May'} {metric === 'temp' ? 'temperature' : 'rainfall'} anomaly
            and that year&rsquo;s peak ONI (1950-present, both series detrended).
            Red = in phase with El Nino; blue = opposite. Faded = weak link (|r|&nbsp;&lt;&nbsp;0.2).
          </>
        ) : mode === 'simulate' ? (
          <>
            <strong className="text-gray-300">Simulate.</strong>{' '}
            Expected {metric === 'temp' ? 'temperature' : 'rainfall'} anomaly in{' '}
            <strong className="text-gray-300">{season}</strong> at the selected ONI level,
            estimated from each country&rsquo;s detrended historical response to ENSO.
            Season slider shows how the imprint shifts across the calendar year.
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
