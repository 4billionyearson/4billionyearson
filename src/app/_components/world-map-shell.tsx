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

// ─────────────────────────────────────────────────────────────────────────────
// Constants — change these in one place to affect every world map on the site.
// ─────────────────────────────────────────────────────────────────────────────

/** Latitude/longitude rectangles we fit the map to.
 *
 *  - World: ±58° lat trims Antarctica's straggly bottom edge so it doesn't
 *    bleed into a green band on wide containers; ±180° lon is the full
 *    width with `noWrap` killing horizontal repeats.
 *  - USA: contiguous United States (CONUS) bounding box.
 *  - UK:  British Isles bounding box.
 */
const WORLD_FIT_BOUNDS: LatLngBoundsExpression = [
  [-58, -180],
  [84, 180],
];
const USA_FIT_BOUNDS: LatLngBoundsExpression = [
  [24.5, -125],
  [49.5, -66.5],
];
const UK_FIT_BOUNDS: LatLngBoundsExpression = [
  [49.7, -8.7],
  [60.9, 1.9],
];

/** Pan-restriction: a touch outside the fit bounds so users can drag a few
 *  degrees past the edge without snapping back instantly. */
const WORLD_MAX_BOUNDS: LatLngBoundsExpression = [
  [-65, -190],
  [88, 190],
];

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
const SHELL_HEIGHT_CLASS = 'aspect-[4/3]';

// ─────────────────────────────────────────────────────────────────────────────

export type WorldMapPreset = 'world' | 'usa' | 'uk';

export interface WorldMapShellProps {
  /** Initial-fit preset. 'world' = whole globe; 'usa' / 'uk' = regional fit. */
  preset?: WorldMapPreset;
  /** 'light' = CARTO voyager (default), 'dark' = CARTO dark_nolabels. */
  theme?: 'light' | 'dark';
  /** Tile layer opacity. Climate Map dims its tiles to let choropleth pop. */
  tileOpacity?: number;
  /** Min zoom. Default `0` (allows fractional zoom below 1 on wide-short
   *  containers where the world wouldn't otherwise fit). */
  minZoom?: number;
  /** Max zoom. Default `10`. */
  maxZoom?: number;
  /** Allow scroll-wheel zoom. Default `true`. */
  scrollWheelZoom?: boolean;
  /** Extra classes appended to the container. */
  className?: string;
  /** Children rendered inside the MapContainer (overlays, GeoJSON, labels). */
  children?: ReactNode;
}

const PRESET_BOUNDS: Record<WorldMapPreset, LatLngBoundsExpression> = {
  world: WORLD_FIT_BOUNDS,
  usa: USA_FIT_BOUNDS,
  uk: UK_FIT_BOUNDS,
};

/**
 * Width-first fit for the world preset: compute a (fractional) zoom such
 * that the world is exactly as wide as the container. This guarantees the
 * world *fills the width* on every device — no sea margins on the sides
 * (which the old "fixed zoom 1" approach gave on wide containers) and no
 * cropped continents (which it gave on narrow ones).
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
  useEffect(() => {
    const fit = () => {
      const animate = !firstFitRef.current;
      firstFitRef.current = false;
      map.invalidateSize();
      if (preset === 'world') {
        const w = map.getContainer().clientWidth;
        // Mercator world is 256 px wide at zoom 0. Find fractional zoom
        // where 256 × 2^z = container width → z = log2(w / 256).
        const z = Math.max(0, Math.log2(Math.max(64, w) / 256));
        map.setMinZoom(z);
        map.setView([20, 0], z, { animate, duration: 0.5 });
      } else {
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
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => map.invalidateSize());
    });
    ro.observe(map.getContainer());
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [map, preset]);
  return null;
}

export function WorldMapShell({
  preset = 'world',
  theme = 'light',
  tileOpacity = 1,
  minZoom = 0,
  maxZoom = 10,
  scrollWheelZoom = true,
  className = '',
  children,
}: WorldMapShellProps) {
  const tileUrl = theme === 'dark' ? TILE_DARK_URL : TILE_LIGHT_URL;
  const bg = theme === 'dark' ? BG_DARK : BG_LIGHT;
  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${SHELL_HEIGHT_CLASS} ${className}`}>
      <MapContainer
        // Initial center/zoom are placeholders — WorldFitter overrides on mount.
        center={[20, 0]}
        zoom={2}
        minZoom={minZoom}
        maxZoom={maxZoom}
        zoomSnap={0}
        zoomDelta={0.5}
        scrollWheelZoom={scrollWheelZoom}
        maxBounds={WORLD_MAX_BOUNDS}
        maxBoundsViscosity={1}
        worldCopyJump={false}
        className="h-full w-full z-0"
        style={{ background: bg }}
      >
        <WorldFitter preset={preset} />
        <TileLayer
          attribution={TILE_ATTRIBUTION}
          url={tileUrl}
          opacity={tileOpacity}
          noWrap
        />
        {children}
      </MapContainer>
    </div>
  );
}

