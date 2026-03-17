"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Marker } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import L from "leaflet";

/* ─── Geometry helpers ──────────────────────────────────────────────────── */

function featureCentroid(feature: Feature): [number, number] | null {
  const geom = feature.geometry;
  if (geom.type === "Polygon") return ringCentroid((geom as any).coordinates[0]);
  if (geom.type === "MultiPolygon") {
    let best: number[][] = [];
    let bestArea = 0;
    for (const poly of (geom as any).coordinates as number[][][][]) {
      const ring = poly[0];
      const a = Math.abs(ringArea(ring));
      if (a > bestArea) { bestArea = a; best = ring; }
    }
    return best.length ? ringCentroid(best) : null;
  }
  return null;
}
function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return a / 2;
}
function ringCentroid(ring: number[][]): [number, number] {
  let x = 0, y = 0;
  for (const c of ring) { x += c[0]; y += c[1]; }
  return [y / ring.length, x / ring.length];
}

/* ─── Label overrides & config ──────────────────────────────────────────── */

const LABEL_OVERRIDES: Record<string, [number, number]> = {
  "United States of America": [40, -98], Canada: [56, -96], Russia: [62, 95],
  France: [47, 2.5], Norway: [65, 13], Indonesia: [-2, 118], Malaysia: [4, 109],
  Chile: [-35, -71], "New Zealand": [-42, 174], Japan: [36, 138], Antarctica: [-82, 0],
};

const CONTINENT_LABELS: { name: string; pos: [number, number] }[] = [
  { name: "North America", pos: [45, -100] }, { name: "South America", pos: [-15, -58] },
  { name: "Europe", pos: [52, 15] }, { name: "Africa", pos: [5, 20] },
  { name: "Asia", pos: [42, 85] }, { name: "Oceania", pos: [-25, 135] },
];

const MAJOR_COUNTRIES = new Set([
  "United States of America", "Canada", "Mexico", "Brazil", "Argentina",
  "Colombia", "Peru", "Chile", "Venezuela",
  "Russia", "China", "India", "Japan", "Australia",
  "Indonesia", "Saudi Arabia", "Iran", "Kazakhstan",
  "United Kingdom", "France", "Germany", "Spain", "Italy",
  "Turkey", "Ukraine", "Poland", "Sweden", "Norway", "Finland",
  "Egypt", "South Africa", "Nigeria", "Algeria", "Libya",
  "Dem. Rep. Congo", "Sudan", "Ethiopia", "Tanzania", "Kenya",
  "Mongolia", "Pakistan", "Afghanistan", "Thailand", "Myanmar",
  "Greenland", "Iceland", "New Zealand",
]);

const NAME_MAP: Record<string, string> = {
  "United States of America": "United States",
  "Dem. Rep. Congo": "Democratic Republic of Congo",
  "Dominican Rep.": "Dominican Republic",
  "Central African Rep.": "Central African Republic",
  "S. Sudan": "South Sudan",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Czech Rep.": "Czechia",
  "W. Sahara": "Western Sahara",
  "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern Territories",
  "Eq. Guinea": "Equatorial Guinea",
  eSwatini: "Eswatini",
  "Solomon Is.": "Solomon Islands",
  "Timor-Leste": "Timor",
  "N. Cyprus": "North Cyprus",
  Somaliland: "Somalia",
  "Côte d'Ivoire": "Cote d'Ivoire",
  Macedonia: "North Macedonia",
  Kosovo: "Kosovo",
  Taiwan: "Taiwan",
  Myanmar: "Myanmar",
  "Lao PDR": "Laos",
  Brunei: "Brunei",
};

/* ─── Antimeridian fix ──────────────────────────────────────────────────── */

function fixAntimeridian(geo: FeatureCollection): FeatureCollection {
  const targets = new Set(["Russia", "Fiji", "Antarctica"]);
  return {
    ...geo,
    features: geo.features.map((f) => {
      if (!targets.has(f.properties?.name)) return f;
      if (f.geometry.type === "MultiPolygon") {
        const fixed: number[][][][] = [];
        for (const polygon of (f.geometry as any).coordinates as number[][][][]) {
          for (const ring of polygon) {
            const hasHigh = ring.some((c: number[]) => c[0] > 170);
            const hasLow = ring.some((c: number[]) => c[0] < -170);
            if (hasHigh && hasLow) {
              fixed.push([ring.map((c: number[]) => (c[0] < 0 ? [c[0] + 360, c[1]] : [...c]))]);
              fixed.push([ring.map((c: number[]) => (c[0] > 0 ? [c[0] - 360, c[1]] : [...c]))]);
            } else {
              fixed.push([ring]);
            }
          }
        }
        return { ...f, geometry: { type: "MultiPolygon", coordinates: fixed } };
      }
      return f;
    }),
  };
}

/* ─── Color scales ──────────────────────────────────────────────────────── */

type MetricMode = "perCapita" | "annual";

function getPerCapitaColor(v: number | undefined): string {
  if (v == null) return "#1e293b";
  if (v >= 20) return "#7f1d1d"; // very dark red
  if (v >= 15) return "#991b1b";
  if (v >= 10) return "#dc2626";
  if (v >= 7) return "#ef4444";
  if (v >= 5) return "#f97316";
  if (v >= 3) return "#fbbf24";
  if (v >= 1) return "#facc15";
  return "#a3e635";
}

function getAnnualColor(v: number | undefined): string {
  if (v == null) return "#1e293b";
  if (v >= 5e9) return "#7f1d1d";
  if (v >= 1e9) return "#991b1b";
  if (v >= 500e6) return "#dc2626";
  if (v >= 200e6) return "#ef4444";
  if (v >= 100e6) return "#f97316";
  if (v >= 50e6) return "#fbbf24";
  if (v >= 10e6) return "#facc15";
  return "#a3e635";
}

function getColor(mode: MetricMode, v: number | undefined): string {
  return mode === "perCapita" ? getPerCapitaColor(v) : getAnnualColor(v);
}

const PER_CAPITA_LEGEND = [
  { color: "#a3e635", label: "<1" },
  { color: "#facc15", label: "1–3" },
  { color: "#fbbf24", label: "3–5" },
  { color: "#f97316", label: "5–7" },
  { color: "#ef4444", label: "7–10" },
  { color: "#dc2626", label: "10–15" },
  { color: "#991b1b", label: "15–20" },
  { color: "#7f1d1d", label: "20+" },
];

const ANNUAL_LEGEND = [
  { color: "#a3e635", label: "<10M" },
  { color: "#facc15", label: "10–50M" },
  { color: "#fbbf24", label: "50–100M" },
  { color: "#f97316", label: "100–200M" },
  { color: "#ef4444", label: "200–500M" },
  { color: "#dc2626", label: "500M–1B" },
  { color: "#991b1b", label: "1–5B" },
  { color: "#7f1d1d", label: "5B+" },
];

/* ─── Country labels ────────────────────────────────────────────────────── */

function CountryLabels({ geo }: { geo: FeatureCollection }) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  useEffect(() => {
    if (!map.getPane("labels")) {
      const pane = map.createPane("labels");
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
    }
    const tooltipPane = map.getPane("tooltipPane");
    if (tooltipPane) tooltipPane.style.zIndex = "700";
    setReady(true);
  }, [map]);

  const countryLabels = useMemo(() => {
    const result: { name: string; pos: [number, number] }[] = [];
    for (const f of geo.features) {
      const name = f.properties?.name;
      if (!name) continue;
      const pos = LABEL_OVERRIDES[name] ?? featureCentroid(f);
      if (pos) result.push({ name, pos });
    }
    return result;
  }, [geo]);

  if (!ready) return null;

  const visibleLabels =
    zoom <= 2 ? CONTINENT_LABELS
    : zoom <= 3 ? countryLabels.filter(({ name }) => MAJOR_COUNTRIES.has(name))
    : countryLabels;
  const fontSize = zoom <= 2 ? 13 : 10;
  const cls = zoom <= 2 ? "continent-label" : "country-label";

  return (
    <>
      {visibleLabels.map(({ name, pos }) => (
        <Marker
          key={name}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: cls,
            html: `<span style="font-size:${fontSize}px">${NAME_MAP[name] || name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

/* ─── Format helpers ────────────────────────────────────────────────────── */

function formatTonnes(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Tt`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Bt`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} Mt`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} Kt`;
  return `${v.toFixed(0)} t`;
}

/* ─── Main component ────────────────────────────────────────────────────── */

interface CountryEmissions {
  annual: number;
  perCapita: number;
}

interface Props {
  countryMapData: Record<string, CountryEmissions>;
}

export default function EmissionsChoroplethMap({ countryMapData }: Props) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<MetricMode>("perCapita");

  useEffect(() => {
    fetch("/data/world-countries.json")
      .then((r) => r.json())
      .then((geo) => setGeoData(fixAntimeridian(geo)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dataMap = useMemo(() => {
    const m = new Map<string, CountryEmissions>();
    for (const [name, vals] of Object.entries(countryMapData)) {
      m.set(name, vals);
    }
    return m;
  }, [countryMapData]);

  const style = useCallback(
    (feature: Feature | undefined): PathOptions => {
      if (!feature) return { fillColor: "#1e293b", fillOpacity: 0.7, weight: 0.5, color: "#475569" };
      const geoName = feature.properties?.name || "";
      const owidName = NAME_MAP[geoName] || geoName;
      const entry = dataMap.get(owidName);
      const value = entry ? (mode === "perCapita" ? entry.perCapita : entry.annual) : undefined;
      return {
        fillColor: getColor(mode, value),
        fillOpacity: 0.8,
        weight: 0.5,
        color: "#334155",
      };
    },
    [dataMap, mode],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const geoName = feature.properties?.name || "";
      const owidName = NAME_MAP[geoName] || geoName;
      const entry = dataMap.get(owidName);
      const annual = entry?.annual;
      const perCap = entry?.perCapita;
      const color = getColor(mode, mode === "perCapita" ? perCap : annual);
      const html = `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 12px;color:#e2e8f0;font-size:12px;min-width:160px">
          <div style="font-weight:700;margin-bottom:4px">${owidName}</div>
          <div style="color:${color};font-weight:600">
            ${annual != null ? formatTonnes(annual) + ' / year' : 'No data'}
          </div>
          <div style="color:#94a3b8;margin-top:2px">
            ${perCap != null ? perCap.toFixed(1) + ' t CO₂ per person' : ''}
          </div>
        </div>
      `;
      layer.bindTooltip(html, { sticky: true, direction: "top", offset: [0, -10] });
    },
    [dataMap, mode],
  );

  if (loading) {
    return (
      <div className="h-[400px] md:h-[500px] w-full rounded-xl bg-gray-900/50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-red-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="h-[400px] md:h-[500px] w-full rounded-xl bg-gray-900/50 flex items-center justify-center text-gray-500">
        Failed to load map data
      </div>
    );
  }

  const legend = mode === "perCapita" ? PER_CAPITA_LEGEND : ANNUAL_LEGEND;
  const legendLabel = mode === "perCapita" ? "CO₂ per capita (t/person):" : "Annual CO₂ emissions:";

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode("perCapita")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            mode === "perCapita" ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-gray-800/50 text-gray-400 hover:text-white border border-transparent"
          }`}
        >
          Per Capita
        </button>
        <button
          onClick={() => setMode("annual")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            mode === "annual" ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-gray-800/50 text-gray-400 hover:text-white border border-transparent"
          }`}
        >
          Total Annual
        </button>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={10}
          scrollWheelZoom={true}
          maxBounds={[[-60, -180], [85, 180]]}
          maxBoundsViscosity={1.0}
          className="h-[400px] md:h-[500px] w-full rounded-xl z-0"
          style={{ background: "#262626" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          />
          <GeoJSON
            key={mode}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
          <CountryLabels geo={geoData} />
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-gray-400">
        <span className="font-semibold text-gray-300">{legendLabel}</span>
        {legend.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-800 border border-gray-600" />
          No data
        </span>
      </div>
    </div>
  );
}
