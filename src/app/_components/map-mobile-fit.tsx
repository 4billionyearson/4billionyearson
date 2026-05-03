'use client';

/**
 * Single source of truth for the initial map view on mobile.
 *
 * All Leaflet maps in the site share the same mount-time behaviour:
 *   1. After 250ms (so the container has its real height), call
 *      invalidateSize() to fix any tiles laid out at the wrong dimensions.
 *   2. On screens narrower than 500px, snap to a preset view that fits the
 *      relevant region without scrolling.
 *
 * The component is only active *on mobile*. Desktop keeps whatever
 * center/zoom the parent <MapContainer> declares.
 *
 * IMPORTANT: the host <MapContainer> must allow `minZoom={1}` for the
 * `'world'` preset to render at full-globe; otherwise the call below is
 * silently clamped and the map appears too zoomed-in on phones.
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export type MapMobilePreset =
  | 'world'      // full-globe choropleth / point map (zoom 1)
  | 'usa'        // contiguous United States (CONUS)
  | 'uk'         // British Isles
  | 'world-noop' // mobile invalidate-only, no setView (when caller fitBounds)
  ;

const PRESETS: Record<Exclude<MapMobilePreset, 'world-noop'>, [[number, number], number]> = {
  // [lat, lon], zoom
  world: [[20, 10], 1],
  usa:   [[39.5, -98], 2],
  uk:    [[54.5, -3], 4],
};

export function MapMobileFit({ preset = 'world' }: { preset?: MapMobilePreset }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (preset === 'world-noop') return;
      if (map.getContainer().clientWidth < 500) {
        const [center, zoom] = PRESETS[preset];
        map.setView(center, zoom);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [map, preset]);
  return null;
}
