'use client';

/**
 * WorldMapShell — single source of truth for every world choropleth on the site.
 *
 * Owns:
 *   - <MapContainer> with the standard projection / interaction config.
 *   - <TileLayer> with the standard CARTO basemap (light or dark variant).
 *   - Mobile aspect-ratio container so the world fits at every viewport
 *     (portrait / landscape / desktop / ultrawide) without horizontal repeats
 *     or polar-tile bands.
 *   - Initial mobile view (via <MapMobileFit>): preset = 'world' | 'usa' | 'uk'.
 *   - ResizeObserver that calls invalidateSize() whenever the container
 *     resizes (drag the window, rotate the device, open DevTools, etc.)
 *     so tiles stay correctly laid out.
 *   - noWrap on the basemap: kills the horizontal world repeats that
 *     happen at low zoom on wide viewports.
 *   - maxBounds slightly inside the world (no white bands top/bottom).
 *
 * Per-map customisation is done with props, not by re-implementing the shell.
 *
 * Usage:
 *   <WorldMapShell preset="world" theme="dark">
 *     <GeoJSON data={geo} style={…} />
 *     <CountryLabels geo={geo} />
 *   </WorldMapShell>
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import {
  MapMobileFit,
  type MapMobilePreset,
} from './map-mobile-fit';

// ─────────────────────────────────────────────────────────────────────────────
// Constants — change these in one place to affect every world map on the site.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The world clipped to ±60° latitude top, ±75° bottom (Antarctica visible
 * but not stretched into a band) and a touch outside ±180 longitude so
 * users can pan a few degrees past the dateline without snapping back.
 */
const WORLD_MAX_BOUNDS: LatLngBoundsExpression = [
  [-60, -190],
  [85, 190],
];

const TILE_LIGHT_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
const TILE_DARK_URL =
  'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

/** Sea/space colour shown in gaps between tiles. Light theme = ocean blue,
 * dark theme = near-black to match the rest of the dark UI. */
const BG_LIGHT = '#BEEEF9';
const BG_DARK = '#0b1220';

/**
 * Mobile uses 2:1 aspect ratio (Web Mercator world is ~2:1, so the whole
 * planet fits without bands or cropping at every phone width AND every
 * orientation). Capped at 360px so it never dominates a tablet in landscape.
 *
 * Desktop (md+) uses fixed 500px because the card width is bounded by the
 * page max-width, giving a predictable ~2.4:1 aspect.
 */
const SHELL_HEIGHT_CLASS =
  'aspect-[2/1] max-h-[360px] md:aspect-auto md:max-h-none md:h-[500px]';

// ─────────────────────────────────────────────────────────────────────────────

export interface WorldMapShellProps {
  /** Initial mobile view preset. Pass via state for level-toggling maps. */
  preset?: MapMobilePreset;
  /** 'light' = CARTO voyager (default), 'dark' = CARTO dark_nolabels. */
  theme?: 'light' | 'dark';
  /** Tile layer opacity. Climate Map dims its tiles to let choropleth pop. */
  tileOpacity?: number;
  /** Initial center on desktop (mobile uses preset). Default `[20, 0]`. */
  center?: [number, number];
  /** Initial zoom on desktop. Default `2`. */
  zoom?: number;
  /** Min zoom. Default `1` so users can fully zoom out on wide screens. */
  minZoom?: number;
  /** Max zoom. Default `8`. */
  maxZoom?: number;
  /** Allow scroll-wheel zoom. Default `true`. */
  scrollWheelZoom?: boolean;
  /** Extra classes appended to the container. */
  className?: string;
  /** Children rendered inside the MapContainer (overlays, GeoJSON, labels). */
  children?: ReactNode;
}

/**
 * Resize observer that calls invalidateSize whenever the map's container
 * changes width or height. Without this, dragging the browser window or
 * rotating a device leaves stale tiles laid out at the wrong dimensions.
 */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => map.invalidateSize());
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [map]);
  return null;
}

export function WorldMapShell({
  preset = 'world',
  theme = 'light',
  tileOpacity = 1,
  center = [20, 0],
  zoom = 2,
  minZoom = 1,
  maxZoom = 8,
  scrollWheelZoom = true,
  className = '',
  children,
}: WorldMapShellProps) {
  const tileUrl = theme === 'dark' ? TILE_DARK_URL : TILE_LIGHT_URL;
  const bg = theme === 'dark' ? BG_DARK : BG_LIGHT;
  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${SHELL_HEIGHT_CLASS} ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        scrollWheelZoom={scrollWheelZoom}
        maxBounds={WORLD_MAX_BOUNDS}
        maxBoundsViscosity={1}
        worldCopyJump={false}
        className="h-full w-full z-0"
        style={{ background: bg }}
      >
        <MapMobileFit preset={preset} />
        <ResizeWatcher />
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
