'use client';

/**
 * WorldMapShell — single source of truth for every world choropleth on the site.
 *
 * Strategy: rather than picking a fixed integer zoom (which only fits the
 * world correctly at one specific container width — wider containers get sea
 * margins, narrower containers crop the edges), we let Leaflet compute a
 * *fractional* zoom that fits a fixed world rectangle into whatever container
 * size we have. fitBounds re-runs on every resize, so rotating the device,
 * dragging the browser window, or opening DevTools all keep the whole world
 * visible at the right size with no margins or cropping.
 *
 * Owns:
 *   - <MapContainer> with fractional-zoom support (zoomSnap=0, zoomDelta=0.5).
 *   - <TileLayer> (CARTO light or dark, with noWrap to kill horizontal repeats).
 *   - WorldFitter: on mount and on container resize, fitBounds to WORLD_BOUNDS.
 *   - Mobile-friendly aspect-ratio container (2:1 on phones, fixed 500px desktop).
 *   - Initial regional-preset override (preset='usa' | 'uk') that switches
 *     the fit target to USA / UK bounds. Continents/countries use 'world'.
 *
 * Per-map customisation is done with props, not by re-implementing the shell.
 *
 * Usage:
 *   <WorldMapShell preset="world" theme="dark">
 *     <GeoJSON data={geo} style={…} />
 *     <CountryLabels geo={geo} />
 *   </WorldMapShell>
 */

import React, { useEffect, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { FeatureCollection, Feature } from 'geojson';

// ─────────────────────────────────────────────────────────────────────────────
// Constants — change these in one place to affect every world map on the site.
// ─────────────────────────────────────────────────────────────────────────────

/** Latitude/longitude rectangles we fit the map to.
 *
 *  - USA: contiguous United States (CONUS) bounding box.
 *  - UK:  British Isles bounding box.
 *
 *  (World / Pacific presets don't use a fitBounds — they use a width-first
 *  fractional zoom so the world fills the container exactly.)
 */
const USA_FIT_BOUNDS: LatLngBoundsExpression = [
  [24.5, -125],
  [49.5, -66.5],
];
const UK_FIT_BOUNDS: LatLngBoundsExpression = [
  [49.7, -8.7],
  [60.9, 1.9],
];

/** Pan-restriction: a touch outside the fit bounds so users can drag a few
 *  degrees past the edge without snapping back instantly. Eastern bound
 *  extended to give the world preset room to bias its centre east. */
const WORLD_MAX_BOUNDS: LatLngBoundsExpression = [
  [-65, -185],
  [88, 205],
];
/** Pacific preset maxBounds keep one world-width view centred on the ENSO
 *  window, with a small pan allowance on either side. This is expressed as
 *  half-span from the Pacific centre so changing the centre constant also
 *  moves the allowed bounds. */
const PACIFIC_MAX_BOUNDS_HALF_SPAN = 190;

const TILE_LIGHT_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
const TILE_DARK_URL =
  'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const BG_LIGHT = '#BEEEF9';
const BG_DARK = '#0b1220';

/**
 * Aspect-ratio strategy: at width-fit zoom (z = log2(w/256)) the world is
 * exactly the container width. Container HEIGHT therefore controls how
 * much of the Mercator north/south is visible. A square container shows
 * the entire ±85° Mercator, which exposes the polar regions where
 * CARTO tiles run out and the GeoJSON continues — you get a cyan ocean
 * band at the top and a green Antarctica blob at the bottom. A 4:3
 * container shows ~75% of Mercator height (~±67° lat), which trims those
 * bands while still keeping Greenland, Iceland and the southern tip of
 * South America visible.
 */
const SHELL_HEIGHT_CLASS = 'aspect-[3/2]';

// ─────────────────────────────────────────────────────────────────────────────

export type WorldMapPreset = 'world' | 'usa' | 'uk' | 'pacific';

export interface WorldMapShellProps {
  /** Initial-fit preset. 'world' = whole globe centred on the prime
   *  meridian; 'pacific' = world centred on the Niño region (lon -150);
   *  'usa' / 'uk' = regional fit. */
  preset?: WorldMapPreset;
  /** 'light' = CARTO voyager (default), 'dark' = CARTO dark_nolabels. */
  theme?: 'light' | 'dark';
  /** Render the raster tile basemap. Disable for maps whose vector layer
   *  already carries the full geography and where tile seams are undesirable. */
  showTiles?: boolean;
  /** Tile layer opacity. Climate Map dims its tiles to let choropleth pop. */
  tileOpacity?: number;
  /** Min zoom. Default `0` (allows fractional zoom below 1 on wide-short
   *  containers where the world wouldn't otherwise fit). */
  minZoom?: number;
  /** Max zoom. Default `10`. */
  maxZoom?: number;
  /** Allow scroll-wheel zoom. Default `true`. */
  scrollWheelZoom?: boolean;
  /** Override the default `aspect-[4/3]` height. Pass e.g. `'h-[460px]'`
   *  to set a fixed pixel height (used by the ENSO playback card where the
   *  surrounding controls dictate the height budget). */
  heightClass?: string;
  /** Extra classes appended to the container. */
  className?: string;
  /** Children rendered inside the MapContainer (overlays, GeoJSON, labels). */
  children?: ReactNode;
}

const PRESET_BOUNDS: Record<'usa' | 'uk', LatLngBoundsExpression> = {
  usa: USA_FIT_BOUNDS,
  uk: UK_FIT_BOUNDS,
};

/** Pacific preset puts longitude -160 in the centre so Africa remains visible
 *  on the left edge while the Niño region stays central. */
const PACIFIC_CENTER_LON = -205;
/** Atlantic ('world') preset is slightly width-sensitive: mobile stays at
 *  +15°E (the framing you approved), while wider desktop maps get a tiny
 *  extra eastward bias so the content shifts left a touch without changing
 *  the mobile composition. */
const WORLD_CENTER_LON = 15;
const WORLD_CENTER_LON_DESKTOP = 22;
const WORLD_CENTER_DESKTOP_MIN_VIEWPORT = 1100;
const WORLD_CENTER_LAT = 20;
const WORLD_CENTER_LAT_NARROW = 45;

/**
 * Width-first fit for the world/pacific presets: compute a (fractional)
 * zoom such that the world is exactly as wide as the container. This
 * guarantees the world *fills the width* on every device — no sea margins
 * on the sides (which the old "fixed zoom 1" approach gave on wide
 * containers) and no cropped continents (which it gave on narrow ones).
 *
 * On mount and on preset change we re-fit. On simple resize we only
 * invalidateSize (so a user who has manually zoomed to a region doesn't
 * get yanked back to the world view every time the address bar collapses
 * on iOS or the user opens DevTools).
 *
 * We also lock minZoom to the width-fit zoom: the user cannot zoom out
 * beyond "world fills width", which prevents the strange Antarctica /
 * polar-region band that appeared at very low zooms.
 */
function WorldFitter({ preset }: { preset: WorldMapPreset }) {
  const map = useMap();
  // First fit on mount is instant; subsequent fits (preset changes) animate.
  const firstFitRef = React.useRef(true);
  const responsiveModeRef = React.useRef<string | null>(null);
  const viewConfigKey = `${preset}:${PACIFIC_CENTER_LON}:${WORLD_CENTER_LON}:${WORLD_CENTER_LON_DESKTOP}:${WORLD_CENTER_DESKTOP_MIN_VIEWPORT}:${WORLD_CENTER_LAT}:${WORLD_CENTER_LAT_NARROW}`;
  useEffect(() => {
    const fit = () => {
      const animate = !firstFitRef.current;
      firstFitRef.current = false;
      map.invalidateSize();
      if (preset === 'world' || preset === 'pacific') {
        const w = map.getContainer().clientWidth;
        const viewportW = typeof window === 'undefined' ? w : window.innerWidth;
        const responsiveMode =
          preset === 'pacific'
            ? 'pacific'
            : viewportW >= WORLD_CENTER_DESKTOP_MIN_VIEWPORT
              ? 'desktop'
              : 'default';
        // Mercator world is 256 px wide at zoom 0. Find fractional zoom
        // where 256 × 2^z = container width → z = log2(w / 256).
        const z = Math.max(0, Math.log2(Math.max(64, w) / 256));
        map.setMinZoom(z);
        const lon =
          preset === 'pacific'
            ? PACIFIC_CENTER_LON
            : viewportW >= WORLD_CENTER_DESKTOP_MIN_VIEWPORT
              ? WORLD_CENTER_LON_DESKTOP
              : WORLD_CENTER_LON;
        const lat =
          preset === 'world' && viewportW < WORLD_CENTER_DESKTOP_MIN_VIEWPORT
            ? WORLD_CENTER_LAT_NARROW
            : WORLD_CENTER_LAT;
        responsiveModeRef.current = responsiveMode;
        map.setView([lat, lon], z, { animate, duration: 0.5 });
      } else {
        responsiveModeRef.current = 'regional';
        const bounds = PRESET_BOUNDS[preset];
        // Reset min zoom for regional presets — the user may legitimately
        // want to zoom out from a regional fit to see context.
        map.setMinZoom(0);
        if (animate) {
          map.flyToBounds(bounds, { duration: 0.6, padding: [10, 10] });
        } else {
          map.fitBounds(bounds, { animate: false, padding: [10, 10] });
        }
      }
    };

    let raf = 0;
    const fitDeferred = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    // Initial fit (preset change also triggers this).
    fitDeferred();

    // Resize: only invalidateSize. Preserves the user's current view.
    let firstObservation = true;
    const ro = new ResizeObserver(() => {
      if (firstObservation) {
        firstObservation = false; // ignore the synthetic initial observe
        return;
      }
      if (preset === 'world' || preset === 'pacific') {
        const viewportW = typeof window === 'undefined' ? map.getContainer().clientWidth : window.innerWidth;
        const nextMode =
          preset === 'pacific'
            ? 'pacific'
            : viewportW >= WORLD_CENTER_DESKTOP_MIN_VIEWPORT
              ? 'desktop'
              : 'default';
        if (nextMode !== responsiveModeRef.current) {
          fitDeferred();
          return;
        }
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => map.invalidateSize());
    });
    ro.observe(map.getContainer());
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [map, preset, viewConfigKey]);
  return null;
}

export function WorldMapShell({
  preset = 'world',
  theme = 'light',
  showTiles = true,
  tileOpacity = 1,
  minZoom = 0,
  maxZoom = 10,
  scrollWheelZoom = true,
  heightClass = SHELL_HEIGHT_CLASS,
  className = '',
  children,
}: WorldMapShellProps) {
  const tileUrl = theme === 'dark' ? TILE_DARK_URL : TILE_LIGHT_URL;
  const bg = theme === 'dark' ? BG_DARK : BG_LIGHT;
  const pacificMaxBounds: LatLngBoundsExpression = [
    [-65, PACIFIC_CENTER_LON - PACIFIC_MAX_BOUNDS_HALF_SPAN],
    [88, PACIFIC_CENTER_LON + PACIFIC_MAX_BOUNDS_HALF_SPAN],
  ];
  const maxBounds = preset === 'pacific' ? pacificMaxBounds : WORLD_MAX_BOUNDS;
  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${heightClass} ${className}`}>
      <MapContainer
        // Initial center/zoom are placeholders — WorldFitter overrides on mount.
        center={[20, preset === 'pacific' ? PACIFIC_CENTER_LON : 0]}
        zoom={2}
        minZoom={minZoom}
        maxZoom={maxZoom}
        zoomSnap={0}
        zoomDelta={0.5}
        scrollWheelZoom={scrollWheelZoom}
        maxBounds={maxBounds}
        maxBoundsViscosity={1}
        worldCopyJump={false}
        className="h-full w-full z-0"
        style={{ background: bg }}
      >
        <WorldFitter preset={preset} />
        {showTiles ? (
          <TileLayer
            attribution={TILE_ATTRIBUTION}
            url={tileUrl}
            opacity={tileOpacity}
            // The `pacific` view spans one world width starting at lon -330,
            // so the western half of the visible canvas needs a wrap copy.
            // The `world` view is biased a few degrees east of the prime
            // meridian to fit the shifted Chukotka peninsula (~+190°) inside
            // the right edge, so it also needs wrap so the basemap doesn't
            // disappear into a black strip past +180. Only `usa` and `uk`
            // (which sit comfortably within a single world copy) use noWrap.
            noWrap={preset === 'usa' || preset === 'uk'}
          />
        ) : null}
        {children}
      </MapContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared GeoJSON helpers — single source of truth so every world map on the
// site renders Russia / Fiji / Antarctica the same way across the antimeridian.
// ─────────────────────────────────────────────────────────────────────────────

/** Countries with rings that span the antimeridian. */
const ANTIMERIDIAN_TARGETS = new Set(['Russia', 'Fiji', 'Antarctica']);

/**
 * Make polygons that cross the antimeridian render as a single continuous
 * shape rather than a giant horizontal strip across the equirectangular
 * projection.
 *
 * `wrap` controls which side the wrap copy is emitted to:
 *   - `'east'` (default): every vertex with lon < 0 is shifted +360, so
 *     the polygon lives in the 170°…185° range on the right side of an
 *     Atlantic-centred map. No left-side splinter.
 *   - `'west'`: every vertex with lon > 0 is shifted -360, so the polygon
 *     lives in the -185°…-170° range — appropriate for a Pacific-centred
 *     map where Russia/Fiji sit to the left of the Americas.
 *   - `'both'`: emit both copies (legacy behaviour; only useful when the
 *     map is wide enough to show two world copies side-by-side).
 *
 * Previously the function emitted both copies unconditionally, which on an
 * Atlantic-centred world map produced a thin sliver of Russia/Fiji on the
 * left edge with no basemap tile behind it.
 */
export function fixAntimeridian(
  geo: FeatureCollection,
  wrap: 'east' | 'west' | 'both' = 'east',
): FeatureCollection {
  return {
    ...geo,
    features: geo.features.map((f: Feature) => {
      const name = (f.properties as { name?: string } | null)?.name;
      if (!name || !ANTIMERIDIAN_TARGETS.has(name)) return f;
      if (f.geometry?.type !== 'MultiPolygon') return f;
      const fixed: number[][][][] = [];
      let wrappedDateline = false;
      for (const polygon of (f.geometry as unknown as { coordinates: number[][][][] }).coordinates) {
        const outer = polygon[0] ?? [];
        const hasHigh = outer.some((c) => c[0] > 170);
        const hasLow = outer.some((c) => c[0] < -170);
        const allWest = outer.every((c) => c[0] < -150);
        const allEast = outer.every((c) => c[0] > 150);
        if (hasHigh && hasLow) {
          wrappedDateline = true;
          if (wrap === 'east' || wrap === 'both') {
            fixed.push(
              polygon.map((ring) => ring.map((c) => (c[0] < 0 ? [c[0] + 360, c[1]] : [...c]))),
            );
          }
          if (wrap === 'west' || wrap === 'both') {
            fixed.push(
              polygon.map((ring) => ring.map((c) => (c[0] > 0 ? [c[0] - 360, c[1]] : [...c]))),
            );
          }
        } else if (wrap === 'east' && allWest) {
          // Orphan polygon sitting in the far-western longitudes (e.g.
          // Russia's Chukotka peninsula at ~-169° to -180°). On an
          // Atlantic-centred map this would render as a thin sliver
          // floating against the left edge with no body of the country
          // attached. Shift it +360° so it joins the rest of Russia on
          // the right side of the map.
          wrappedDateline = true;
          fixed.push(polygon.map((ring) => ring.map((c) => [c[0] + 360, c[1]])));
        } else if (wrap === 'west' && allEast) {
          // Mirror of the above for Pacific-centred maps: orphan polygon in
          // the far-eastern longitudes gets shifted -360° so it joins
          // the rest of the country sitting to the left of the Americas.
          wrappedDateline = true;
          fixed.push(polygon.map((ring) => ring.map((c) => [c[0] - 360, c[1]])));
        } else {
          fixed.push(polygon.map((ring) => ring.map((c) => [...c])));
        }
      }
      return {
        ...f,
        properties: wrappedDateline
          ? { ...(f.properties ?? {}), __wrappedDateline: true }
          : f.properties,
        geometry: { type: 'MultiPolygon', coordinates: fixed },
      };
    }),
  };
}

function meanGeometryLongitude(coords: any): { lon: number; n: number } {
  if (typeof coords[0] === 'number') return { lon: coords[0], n: 1 };
  let sum = 0;
  let n = 0;
  for (const coord of coords) {
    const m = meanGeometryLongitude(coord);
    sum += m.lon * m.n;
    n += m.n;
  }
  return { lon: sum / Math.max(1, n), n };
}

function shiftGeometryLongitude(geometry: Feature['geometry'], delta: number): Feature['geometry'] {
  if (!geometry) return geometry;
  const shiftCoords = (coords: any): any => {
    if (typeof coords[0] === 'number') return [coords[0] + delta, coords[1]];
    return coords.map(shiftCoords);
  };
  return {
    ...geometry,
    coordinates: shiftCoords((geometry as any).coordinates),
  } as Feature['geometry'];
}

function shiftFeatureLongitude(feature: Feature, delta: number): Feature {
  if (!feature.geometry) return feature;
  return {
    ...feature,
    geometry: shiftGeometryLongitude(feature.geometry, delta),
  };
}

export function projectToPacificView(geo: FeatureCollection): FeatureCollection {
  const fixed = fixAntimeridian(geo, 'west');
  const splitLon = PACIFIC_CENTER_LON + 180;
  const projectedFeatures = fixed.features.map((feature) => {
    if (!feature.geometry) return feature;
    const meanLon = meanGeometryLongitude((feature.geometry as any).coordinates).lon;
    if (meanLon < splitLon) return feature;
    return shiftFeatureLongitude(feature, -360);
  });
  return {
    ...fixed,
    // Tile layers wrap horizontally for the Pacific preset, so the choropleth
    // needs matching ±360 copies or edge countries can appear unfilled on the
    // wrapped copy even though the main copy is coloured.
    features: projectedFeatures.flatMap((feature) => (
      feature.geometry
        ? [shiftFeatureLongitude(feature, -360), feature, shiftFeatureLongitude(feature, 360)]
        : [feature]
    )),
  };
}

