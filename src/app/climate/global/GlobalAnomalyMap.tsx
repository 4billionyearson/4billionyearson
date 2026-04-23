"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { FeatureCollection, Feature } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Country-name aliases: snapshot name → geojson name (lowercased match)
const NAME_ALIAS: Record<string, string> = {
  'united states': 'united states of america',
  'dr congo': 'democratic republic of the congo',
  'singapore': 'singapore', // geojson omits it (tiny country)
  'south sudan': 'south sudan',
};

interface CountryAnomaly {
  iso3: string;
  name: string;
  anomaly: number;
  value: number;
  monthLabel: string;
  rank: number;
  total: number;
  // Optional windowed anomalies (populated by scripts/patch-country-anomalies.mjs)
  anomaly1m?: number | null;
  label1m?: string | null;
  anomaly3m?: number | null;
  label3m?: string | null;
  anomaly12m?: number | null;
  label12m?: string | null;
}

export type AnomalyWindow = '1m' | '3m' | '12m';

// Antimeridian fix (reused from emissions-choropleth-map).
// Without this, Russia / Fiji / Antarctica render a giant horizontal
// strip across the equirectangular projection because the ring wraps
// from +170°E to −170°W.
function fixAntimeridian(geo: FeatureCollection): FeatureCollection {
  const targets = new Set(['Russia', 'Fiji', 'Antarctica']);
  return {
    ...geo,
    features: geo.features.map((f) => {
      if (!targets.has((f.properties as any)?.name)) return f;
      if (f.geometry.type === 'MultiPolygon') {
        const fixed: number[][][][] = [];
        for (const polygon of (f.geometry as any).coordinates as number[][][][]) {
          for (const ring of polygon) {
            const hasHigh = ring.some((c) => c[0] > 170);
            const hasLow = ring.some((c) => c[0] < -170);
            if (hasHigh && hasLow) {
              fixed.push([ring.map((c) => (c[0] < 0 ? [c[0] + 360, c[1]] : [...c]))]);
              fixed.push([ring.map((c) => (c[0] > 0 ? [c[0] - 360, c[1]] : [...c]))]);
            } else {
              fixed.push([ring]);
            }
          }
        }
        return { ...f, geometry: { type: 'MultiPolygon', coordinates: fixed } };
      }
      return f;
    }),
  };
}

// Color ramp: anomaly (°C) → hex. Blue below 0, orange/red above.
function anomalyColor(anom: number | null | undefined): string {
  if (anom == null || !Number.isFinite(anom)) return '#1f2937';
  const v = Math.max(-5, Math.min(5, anom));
  if (v >= 0) {
    if (v < 1) return lerp('#fef3c7', '#fde68a', v);
    if (v < 2) return lerp('#fde68a', '#fb923c', v - 1);
    if (v < 3) return lerp('#fb923c', '#ea580c', v - 2);
    if (v < 4) return lerp('#ea580c', '#b91c1c', v - 3);
    return lerp('#b91c1c', '#7f1d1d', v - 4);
  } else {
    const a = -v;
    if (a < 1) return lerp('#e0f2fe', '#bae6fd', a);
    if (a < 2) return lerp('#bae6fd', '#60a5fa', a - 1);
    if (a < 3) return lerp('#60a5fa', '#2563eb', a - 2);
    return lerp('#2563eb', '#1e3a8a', Math.min(1, a - 3));
  }
}

function lerp(a: string, b: string, t: number): string {
  const ta = Math.max(0, Math.min(1, t));
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.slice(0, 2), 16), ag = parseInt(ah.slice(2, 4), 16), ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16), bg = parseInt(bh.slice(2, 4), 16), bb = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * ta);
  const g = Math.round(ag + (bg - ag) * ta);
  const b2 = Math.round(ab + (bb - ab) * ta);
  return `rgb(${r},${g},${b2})`;
}

function normalizeName(s: string): string {
  const lower = s.trim().toLowerCase();
  return NAME_ALIAS[lower] ?? lower;
}

function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/* ─── Zoom-aware labels (continent → country → US state) ─────────────── */

const LABEL_OVERRIDES: Record<string, [number, number]> = {
  'United States of America': [40, -98],
  'Canada': [56, -96],
  'Russia': [62, 95],
  'France': [47, 2.5],
  'Norway': [65, 13],
  'Indonesia': [-2, 118],
  'Malaysia': [4, 109],
  'Chile': [-35, -71],
  'New Zealand': [-42, 174],
  'Japan': [36, 138],
  'Antarctica': [-82, 0],
};

const CONTINENT_LABELS: { name: string; pos: [number, number] }[] = [
  { name: 'North America', pos: [45, -100] },
  { name: 'South America', pos: [-15, -58] },
  { name: 'Europe', pos: [52, 15] },
  { name: 'Africa', pos: [5, 20] },
  { name: 'Asia', pos: [42, 85] },
  { name: 'Oceania', pos: [-25, 135] },
];

const MAJOR_COUNTRIES = new Set([
  'United States of America', 'Canada', 'Mexico', 'Brazil', 'Argentina',
  'Colombia', 'Peru', 'Chile', 'Venezuela',
  'Russia', 'China', 'India', 'Japan', 'Australia',
  'Indonesia', 'Saudi Arabia', 'Iran', 'Kazakhstan',
  'United Kingdom', 'France', 'Germany', 'Spain', 'Italy',
  'Turkey', 'Ukraine', 'Poland', 'Sweden', 'Norway', 'Finland',
  'Egypt', 'South Africa', 'Nigeria', 'Algeria', 'Libya',
  'Dem. Rep. Congo', 'Sudan', 'Ethiopia', 'Tanzania', 'Kenya',
  'Mongolia', 'Pakistan', 'Afghanistan', 'Thailand', 'Myanmar',
  'Greenland', 'Iceland', 'New Zealand',
]);

const DISPLAY_NAME: Record<string, string> = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'DR Congo',
  'Dominican Rep.': 'Dominican Republic',
  'Central African Rep.': 'Central African Republic',
  'S. Sudan': 'South Sudan',
  'Bosnia and Herz.': 'Bosnia & Herz.',
  'Czech Rep.': 'Czechia',
  'W. Sahara': 'Western Sahara',
  'Eq. Guinea': 'Equatorial Guinea',
  'Solomon Is.': 'Solomon Is.',
};

function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return a / 2;
}
function ringCentroid(ring: number[][]): [number, number] {
  let x = 0, y = 0;
  for (const c of ring) { x += c[0]; y += c[1]; }
  return [y / ring.length, x / ring.length];
}
function featureCentroid(feature: Feature): [number, number] | null {
  const g: any = feature.geometry;
  if (!g) return null;
  if (g.type === 'Polygon') return ringCentroid(g.coordinates[0]);
  if (g.type === 'MultiPolygon') {
    let best: number[][] = [];
    let bestArea = 0;
    for (const poly of g.coordinates as number[][][][]) {
      const ring = poly[0];
      const a = Math.abs(ringArea(ring));
      if (a > bestArea) { bestArea = a; best = ring; }
    }
    return best.length ? ringCentroid(best) : null;
  }
  return null;
}

const US_STATE_LABEL_ZOOM = 4;

function MapLabels({
  countriesGeo,
  statesGeo,
}: {
  countriesGeo: FeatureCollection | null;
  statesGeo: FeatureCollection | null;
}) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  useEffect(() => {
    if (!map.getPane('labels')) {
      const pane = map.createPane('labels');
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }
    const tooltipPane = map.getPane('tooltipPane');
    if (tooltipPane) tooltipPane.style.zIndex = '700';
    setReady(true);
  }, [map]);

  const countryLabels = useMemo(() => {
    if (!countriesGeo) return [] as { name: string; pos: [number, number] }[];
    const result: { name: string; pos: [number, number] }[] = [];
    for (const f of countriesGeo.features) {
      const name = (f.properties as any)?.name as string | undefined;
      if (!name) continue;
      const pos = LABEL_OVERRIDES[name] ?? featureCentroid(f);
      if (pos) result.push({ name, pos });
    }
    return result;
  }, [countriesGeo]);

  const stateLabels = useMemo(() => {
    if (!statesGeo) return [] as { name: string; pos: [number, number] }[];
    const result: { name: string; pos: [number, number] }[] = [];
    for (const f of statesGeo.features) {
      const name = (f.properties as any)?.name as string | undefined;
      if (!name) continue;
      const pos = featureCentroid(f);
      if (pos) result.push({ name, pos });
    }
    return result;
  }, [statesGeo]);

  if (!ready) return null;

  const visibleCountries =
    zoom <= 2
      ? CONTINENT_LABELS
      : zoom <= 3
        ? countryLabels.filter(({ name }) => MAJOR_COUNTRIES.has(name))
        : countryLabels;

  const fontSize = zoom <= 2 ? 13 : 10;
  const cls = zoom <= 2 ? 'continent-label-dark' : 'country-label-dark';

  return (
    <>
      {visibleCountries.map(({ name, pos }) => (
        <Marker
          key={`c-${name}`}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: cls,
            html: `<span style="font-size:${fontSize}px">${DISPLAY_NAME[name] ?? name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
      {zoom >= US_STATE_LABEL_ZOOM && stateLabels.map(({ name, pos }) => (
        <Marker
          key={`s-${name}`}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: 'country-label-dark',
            html: `<span style="font-size:9px;opacity:0.85">${name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

/* ─── Sub-national overlays (US states + UK nations) ─────────────────────── */

const US_STATES_ZOOM = 3;
const UK_NATIONS_ZOOM = 4;
const UK_NATION_SLUGS = new Set(['england', 'scotland', 'wales', 'northern-ireland']);

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
}

function rankingValue(row: RankingRow | undefined, win: AnomalyWindow): number | null {
  if (!row) return null;
  if (win === '3m') return row.anomaly3m;
  if (win === '12m') return row.anomaly12m;
  return row.anomaly1m;
}

// UK-nation slugs — kept for potential future re-introduction of the overlay.
// Currently unused; the map renders UK as a single country polygon.
// const UK_NATION_SLUGS = new Set(['england', 'scotland', 'wales', 'northern-ireland']);

function UKNationsOverlay({
  rankings,
  windowSel,
  onInfo,
  ukGeo,
}: {
  rankings: RankingRow[] | null;
  windowSel: AnomalyWindow;
  onInfo: (info: { name: string; anomaly: number | null; label: string | null; color: string } | null) => void;
  ukGeo: FeatureCollection | null;
}) {
  const map = useMap();
  const [visible, setVisible] = useState(map.getZoom() >= UK_NATIONS_ZOOM);

  useMapEvents({ zoomend: () => setVisible(map.getZoom() >= UK_NATIONS_ZOOM) });

  const bySlug = useMemo(() => {
    const m = new Map<string, RankingRow>();
    if (rankings) {
      for (const r of rankings) {
        if (r.type === 'uk-region' && UK_NATION_SLUGS.has(r.slug)) m.set(r.slug, r);
      }
    }
    return m;
  }, [rankings]);

  const style = useCallback(
    (feature: Feature | undefined): PathOptions => {
      const slug = ((feature?.properties as any)?.slug as string) ?? '';
      const row = bySlug.get(slug);
      const v = rankingValue(row, windowSel);
      return {
        fillColor: v != null ? anomalyColor(v) : '#1f2937',
        fillOpacity: 0.9,
        weight: 0.8,
        color: '#0b1220',
      };
    },
    [bySlug, windowSel],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const slug = ((feature.properties as any)?.slug as string) ?? '';
      const name = ((feature.properties as any)?.name as string) ?? slug;
      const row = bySlug.get(slug);
      const v = rankingValue(row, windowSel);
      const color = v != null ? anomalyColor(v) : '#1f2937';
      const show = () => onInfo({ name, anomaly: v, label: row?.latestLabel ?? null, color });
      layer.on('mouseover', show);
      layer.on('click', show);
      layer.on('mouseout', () => onInfo(null));
    },
    [bySlug, windowSel, onInfo],
  );

  if (!visible || !ukGeo) return null;
  return (
    <GeoJSON
      key={`uk-nations-${windowSel}-${bySlug.size}`}
      data={ukGeo}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

function USStatesOverlay({
  rankings,
  windowSel,
  onInfo,
  statesGeo,
}: {
  rankings: RankingRow[] | null;
  windowSel: AnomalyWindow;
  onInfo: (info: { name: string; anomaly: number | null; label: string | null; color: string } | null) => void;
  statesGeo: FeatureCollection | null;
}) {
  const map = useMap();
  const [visible, setVisible] = useState(map.getZoom() >= US_STATES_ZOOM);

  useMapEvents({ zoomend: () => setVisible(map.getZoom() >= US_STATES_ZOOM) });

  const byName = useMemo(() => {
    const m = new Map<string, RankingRow>();
    if (rankings) {
      for (const r of rankings) {
        if (r.type === 'us-state') m.set(r.name.toLowerCase(), r);
      }
    }
    return m;
  }, [rankings]);

  const style = useCallback(
    (feature: Feature | undefined): PathOptions => {
      const name = ((feature?.properties as any)?.name as string) ?? '';
      const row = byName.get(name.toLowerCase());
      const v = rankingValue(row, windowSel);
      return {
        fillColor: v != null ? anomalyColor(v) : '#1f2937',
        fillOpacity: 0.9,
        weight: 0.6,
        color: '#0b1220',
      };
    },
    [byName, windowSel],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const name = ((feature.properties as any)?.name as string) ?? '';
      const row = byName.get(name.toLowerCase());
      const v = rankingValue(row, windowSel);
      const color = v != null ? anomalyColor(v) : '#1f2937';
      const show = () => onInfo({ name, anomaly: v, label: row?.latestLabel ?? null, color });
      layer.on('mouseover', show);
      layer.on('click', show);
      layer.on('mouseout', () => onInfo(null));
    },
    [byName, windowSel, onInfo],
  );

  if (!visible || !statesGeo) return null;
  return (
    <GeoJSON
      key={`us-states-${windowSel}-${byName.size}`}
      data={statesGeo}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

// UKRegionsOverlay removed — the map now shows UK as a single country polygon to
// avoid mismatched sub-polygon coverage. Re-introduce from git history if needed.

export default function GlobalAnomalyMap({ countryAnomalies, window: windowSel = '1m' }: { countryAnomalies: CountryAnomaly[]; window?: AnomalyWindow }) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [statesGeo, setStatesGeo] = useState<FeatureCollection | null>(null);
  const [ukGeo, setUkGeo] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankingRow[] | null>(null);
  const [selected, setSelected] = useState<{
    name: string;
    anomaly: number | null;
    monthLabel?: string;
    value?: number;
    rank?: number;
    total?: number;
    color: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/world-countries.json')
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setGeo(fixAntimeridian(j)); })
      .catch((e) => { if (!cancelled) setLoadError(String(e?.message ?? e)); });
    fetch('/data/us-states.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => { if (!cancelled && g) setStatesGeo(g as FeatureCollection); })
      .catch(() => {});
    fetch('/data/uk-nations.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => { if (!cancelled && g) setUkGeo(g as FeatureCollection); })
      .catch(() => {});
    fetch('/data/climate/rankings.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.rows) setRankings(d.rows as RankingRow[]); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Build lookup: normalized geojson name → anomaly record
  const lookup = useMemo(() => {
    const map = new Map<string, CountryAnomaly>();
    for (const c of countryAnomalies) {
      map.set(normalizeName(c.name), c);
    }
    return map;
  }, [countryAnomalies]);

  // Resolve the anomaly/label for the chosen window. Falls back to the
  // legacy 1-month fields so this component still works against older
  // snapshots that don't yet have 3m/12m data.
  const pick = useCallback((c: CountryAnomaly | undefined) => {
    if (!c) return { anomaly: null as number | null, label: null as string | null };
    if (windowSel === '3m') return { anomaly: c.anomaly3m ?? null, label: c.label3m ?? null };
    if (windowSel === '12m') return { anomaly: c.anomaly12m ?? null, label: c.label12m ?? null };
    return { anomaly: c.anomaly1m ?? c.anomaly ?? null, label: c.label1m ?? c.monthLabel ?? null };
  }, [windowSel]);

  const style = useCallback((feature: Feature | undefined): PathOptions => {
    if (!feature) return { fillColor: '#1f2937', fillOpacity: 0.8, weight: 0.4, color: '#0b1220' };
    const name = ((feature.properties as any)?.name as string) ?? '';
    const rec = lookup.get(name.toLowerCase());
    const { anomaly } = pick(rec);
    return {
      fillColor: anomaly != null ? anomalyColor(anomaly) : '#1f2937',
      fillOpacity: 0.85,
      weight: 0.4,
      color: '#0b1220',
    };
  }, [lookup, pick]);

  const onEachFeature = useCallback((feature: Feature, layer: Layer) => {
    const name = ((feature.properties as any)?.name as string) ?? '';
    const rec = lookup.get(name.toLowerCase());
    const { anomaly, label } = pick(rec);
    const color = anomaly != null ? anomalyColor(anomaly) : '#1f2937';
    const show = () => setSelected({
      name,
      anomaly,
      monthLabel: label ?? undefined,
      value: rec?.value,
      rank: rec?.rank,
      total: rec?.total,
      color,
    });
    layer.on('mouseover', show);
    layer.on('click', show);
    layer.on('mouseout', () => setSelected(null));
  }, [lookup, pick]);

  const headlineLabel = pick(countryAnomalies[0]).label ?? '';
  const windowPhrase = windowSel === '12m' ? '12-month rolling' : windowSel === '3m' ? '3-month rolling' : 'monthly';

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">
        Map could not load: {loadError}
      </div>
    );
  }
  if (!geo) {
    return (
      <div className="h-[320px] md:h-[500px] w-full rounded-xl bg-gray-900/40 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden border border-gray-800">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={1}
          maxZoom={8}
          scrollWheelZoom
          maxBounds={[[-60, -180], [85, 180]]}
          maxBoundsViscosity={1.0}
          worldCopyJump
          className="h-[320px] md:h-[500px] w-full z-0"
          style={{ background: '#0b1220' }}
        >
          <InvalidateOnMount />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            opacity={0.55}
          />
          <GeoJSON
            key={`anomaly-${windowSel}-${lookup.size}`}
            data={geo}
            style={style}
            onEachFeature={onEachFeature}
          />
          <USStatesOverlay
            rankings={rankings}
            windowSel={windowSel}
            statesGeo={statesGeo}
            onInfo={(info) =>
              setSelected(
                info
                  ? { name: info.name, anomaly: info.anomaly, monthLabel: info.label ?? undefined, color: info.color }
                  : null,
              )
            }
          />
          <UKNationsOverlay
            rankings={rankings}
            windowSel={windowSel}
            ukGeo={ukGeo}
            onInfo={(info) =>
              setSelected(
                info
                  ? { name: info.name, anomaly: info.anomaly, monthLabel: info.label ?? undefined, color: info.color }
                  : null,
              )
            }
          />
          <MapLabels countriesGeo={geo} statesGeo={statesGeo} />
          {/* UK nations overlay disabled — map is country-level; UK renders as a single polygon
              from world-countries.json to avoid mismatched sub-polygon coverage. */}
        </MapContainer>

        {selected && (
          <div className="absolute bottom-0 left-0 right-0 z-[500] bg-gray-950/90 backdrop-blur-sm border-t border-gray-700/60 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pointer-events-none">
            <span className="font-bold text-gray-100">{selected.name}</span>
            {selected.anomaly != null ? (
              <>
                <span className="font-mono font-semibold" style={{ color: selected.color }}>
                  {selected.anomaly > 0 ? '+' : ''}{selected.anomaly.toFixed(2)}°C vs 1961–1990
                </span>
                <span className="text-gray-300">
                  {selected.value != null ? `${selected.value.toFixed(2)}°C absolute` : ''}
                  {selected.monthLabel ? ` · ${selected.monthLabel}` : ''}
                </span>
                {selected.rank && selected.total ? (
                  <span className="text-gray-300">Rank {selected.rank} of {selected.total}</span>
                ) : null}
              </>
            ) : (
              <span className="text-gray-300">No monthly data on this site</span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-300">
        <span className="font-semibold text-gray-200">
          {headlineLabel ? `${headlineLabel} land anomaly (${windowPhrase}) vs 1961–1990` : `Land anomaly (${windowPhrase}) vs 1961–1990`}
        </span>
        <div className="flex items-center gap-2">
          <span>-5°C</span>
          <div
            className="h-3 w-40 rounded"
            style={{
              background:
                'linear-gradient(to right, #1e3a8a 0%, #2563eb 20%, #60a5fa 35%, #bae6fd 48%, #fef3c7 52%, #fde68a 58%, #fb923c 70%, #ea580c 78%, #b91c1c 88%, #7f1d1d 100%)',
            }}
          />
          <span>+5°C</span>
        </div>
        <span className="text-gray-400">Grey = no data · scroll / pinch to zoom, drag to pan</span>
      </div>
    </div>
  );
}
