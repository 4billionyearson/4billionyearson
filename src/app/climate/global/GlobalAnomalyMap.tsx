"use client";

import React, { useEffect, useMemo, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Country-name aliases: snapshot name → geojson name (lowercased match)
const NAME_ALIAS: Record<string, string> = {
  'united states': 'united states of america',
  'dr congo': 'democratic republic of the congo',
  'singapore': 'singapore', // fallback — geojson omits it (tiny country)
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
}

type GeoJson = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id?: string;
    properties: { id: string; name: string };
    geometry:
      | { type: 'Polygon'; coordinates: number[][][] }
      | { type: 'MultiPolygon'; coordinates: number[][][][] };
  }>;
};

// Equirectangular projection (lat/lng → SVG x/y within a viewBox)
function project(lng: number, lat: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

function ringToPath(ring: number[][], width: number, height: number): string {
  if (!ring.length) return '';
  let d = '';
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    const [x, y] = project(lng, lat, width, height);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2);
  }
  return d + 'Z';
}

function featureToPath(feature: GeoJson['features'][0], width: number, height: number): string {
  const g = feature.geometry;
  if (!g) return '';
  if (g.type === 'Polygon') {
    return g.coordinates.map((ring) => ringToPath(ring, width, height)).join(' ');
  }
  return g.coordinates.flatMap((poly) => poly.map((ring) => ringToPath(ring, width, height))).join(' ');
}

// Color ramp: anomaly (°C) → hex. Blue below 0, orange/red above.
function anomalyColor(anom: number | null | undefined): string {
  if (anom == null || !Number.isFinite(anom)) return '#1f2937'; // slate for missing
  // Clamp to ±5°C
  const v = Math.max(-5, Math.min(5, anom));
  if (v >= 0) {
    // 0 → #fef3c7 (pale), 2.5 → #fb923c, 5 → #7f1d1d
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

export default function GlobalAnomalyMap({ countryAnomalies }: { countryAnomalies: CountryAnomaly[] }) {
  const [geo, setGeo] = useState<GeoJson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    name: string;
    anomaly: number | null;
    monthLabel?: string;
    value?: number;
    rank?: number;
    total?: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/world-countries.json')
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setGeo(j); })
      .catch((e) => { if (!cancelled) setLoadError(String(e?.message ?? e)); });
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

  const WIDTH = 1000;
  const HEIGHT = 500;
  // Trim Antarctica: it adds a huge visual strip but we have no data for it.
  // Viewport covers roughly lat -60 → 85.
  const viewX = 0;
  const viewY = (90 - 85) / 180 * HEIGHT; // top
  const viewH = (145 / 180) * HEIGHT;

  // Latest month label (take first record's month as the canonical label)
  const monthLabel = countryAnomalies[0]?.monthLabel ?? '';

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">
        Map could not load: {loadError}
      </div>
    );
  }
  if (!geo) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 text-center text-sm text-gray-400">
        Loading world map…
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`${viewX} ${viewY} ${WIDTH} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto rounded-xl bg-[#0b1220] border border-gray-800"
        style={{ display: 'block' }}
        aria-label="World map of temperature anomalies"
        role="img"
      >
        {/* Graticule-free ocean background */}
        <rect x={viewX} y={viewY} width={WIDTH} height={viewH} fill="#0b1220" />
        {geo.features.map((f, i) => {
          const rec = lookup.get(f.properties.name.toLowerCase());
          const color = rec ? anomalyColor(rec.anomaly) : '#1f2937';
          const d = featureToPath(f, WIDTH, HEIGHT);
          return (
            <path
              key={f.id ?? f.properties.id ?? i}
              d={d}
              fill={color}
              stroke="#0b1220"
              strokeWidth={0.4}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                const bbox = target.getBoundingClientRect();
                const parentBox = target.ownerSVGElement?.getBoundingClientRect();
                setHover({
                  name: f.properties.name,
                  anomaly: rec?.anomaly ?? null,
                  monthLabel: rec?.monthLabel,
                  value: rec?.value,
                  rank: rec?.rank,
                  total: rec?.total,
                  x: bbox.left + bbox.width / 2 - (parentBox?.left ?? 0),
                  y: bbox.top - (parentBox?.top ?? 0),
                });
              }}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: rec ? 'pointer' : 'default' }}
            >
              <title>
                {f.properties.name}
                {rec ? ` — ${rec.anomaly > 0 ? '+' : ''}${rec.anomaly.toFixed(2)}°C (${rec.monthLabel})` : ' — no data'}
              </title>
            </path>
          );
        })}
      </svg>

      {/* Hover card */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-[#D0A65E]/50 bg-gray-950/95 px-3 py-2 text-xs text-gray-200 shadow-xl"
          style={{
            left: `${Math.min(hover.x, 800)}px`,
            top: `${Math.max(0, hover.y - 70)}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="font-semibold text-white">{hover.name}</p>
          {hover.anomaly != null ? (
            <>
              <p className="font-mono mt-0.5" style={{ color: hover.anomaly > 0 ? '#fb923c' : '#60a5fa' }}>
                {hover.anomaly > 0 ? '+' : ''}{hover.anomaly.toFixed(2)}°C vs 1961–1990
              </p>
              <p className="text-gray-400">
                {hover.value != null ? `${hover.value.toFixed(2)}°C absolute · ` : ''}
                {hover.monthLabel}
              </p>
              {hover.rank && hover.total ? (
                <p className="text-gray-500">Rank {hover.rank} of {hover.total}</p>
              ) : null}
            </>
          ) : (
            <p className="text-gray-500 mt-0.5">No monthly data on this site</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[11px] text-gray-400">
        <span className="font-semibold text-gray-300">{monthLabel ? `${monthLabel} land anomaly vs 1961–1990` : 'Land anomaly vs 1961–1990'}</span>
        <div className="flex items-center gap-2">
          <span>-5°C</span>
          <div
            className="h-3 w-40 rounded"
            style={{
              background: 'linear-gradient(to right, #1e3a8a 0%, #2563eb 20%, #60a5fa 35%, #bae6fd 48%, #fef3c7 52%, #fde68a 58%, #fb923c 70%, #ea580c 78%, #b91c1c 88%, #7f1d1d 100%)',
            }}
          />
          <span>+5°C</span>
        </div>
        <span className="text-gray-500">Grey = no data (country not tracked on this site)</span>
      </div>
    </div>
  );
}
