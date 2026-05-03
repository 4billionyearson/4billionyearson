'use client';

/**
 * Single source of truth for the initial mobile map view.
 *
 * Behaviour on mount (and when `preset` changes):
 *   1. If the container is < 500px wide, snap to the preset center/zoom
 *      *immediately* (no setTimeout) so phones don't flash from the
 *      desktop-sized starting view to the mobile view 250ms later.
 *   2. After 250ms, call invalidateSize() so any tiles laid out before the
 *      container reached its real height get re-measured.
 *
 * Desktop is left alone: the host <MapContainer center=… zoom=…> values stand.
 *
 * NOTE: the host map must allow the preset's zoom (i.e. `minZoom={1}` for
 * the `'world'` preset). Otherwise Leaflet silently clamps and the map
 * appears too zoomed-in.
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';

export type MapMobilePreset =
  | 'world'      // full-globe choropleth / point map
  | 'usa'        // contiguous United States
  | 'uk'         // British Isles
  | 'world-noop' // invalidateSize only; caller controls initial view
  ;

export const MAP_MOBILE_PRESETS: Record<
  Exclude<MapMobilePreset, 'world-noop'>,
  { center: [number, number]; zoom: number }
> = {
  world: { center: [20, 10], zoom: 1 },
  usa:   { center: [39.5, -98], zoom: 3 },
  uk:    { center: [54.5, -3], zoom: 5 },
};

export function isMobileMap(map: LeafletMap): boolean {
  return map.getContainer().clientWidth < 500;
}

export function MapMobileFit({ preset = 'world' }: { preset?: MapMobilePreset }) {
  const map = useMap();
  useEffect(() => {
    // Snap synchronously so the mobile view is correct from the first paint.
    if (preset !== 'world-noop' && isMobileMap(map)) {
      const v = MAP_MOBILE_PRESETS[preset];
      map.setView(v.center, v.zoom);
    }
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map, preset]);
  return null;
}
