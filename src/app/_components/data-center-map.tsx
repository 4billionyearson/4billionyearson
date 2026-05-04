"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import { WorldMapShell } from "./world-map-shell";
import "leaflet/dist/leaflet.css";

interface SiteData {
  name: string;
  owner: string;
  users?: string;
  powerMW: number;
  h100Equiv?: number;
  costBillions?: number;
  country: string;
  lat: number;
  lon: number;
}

interface Props {
  sites: SiteData[];
}

function getPinRadius(powerMW: number): number {
  if (powerMW <= 0) return 9;
  if (powerMW <= 100) return 9;
  if (powerMW <= 300) return 11;
  if (powerMW <= 500) return 13;
  return 16;
}

function getPinColor(powerMW: number): string {
  if (powerMW <= 0) return "#f59e0b"; // amber - planned
  if (powerMW <= 200) return "#06b6d4"; // cyan
  if (powerMW <= 500) return "#3b82f6"; // blue
  return "#8b5cf6"; // violet - largest
}

/* ─── Label constants (shared with climate events map) ─────────────────── */

const LABEL_OVERRIDES: Record<string, [number, number]> = {
  "United States of America": [40, -98],
  "Canada": [56, -96],
  "Russia": [62, 95],
  "France": [47, 2.5],
  "Norway": [65, 13],
  "Indonesia": [-2, 118],
  "Malaysia": [4, 109],
  "Chile": [-35, -71],
  "New Zealand": [-42, 174],
  "Japan": [36, 138],
  "Antarctica": [-82, 0],
};

const CONTINENT_LABELS: { name: string; pos: [number, number] }[] = [
  { name: "North America", pos: [45, -100] },
  { name: "South America", pos: [-15, -58] },
  { name: "Europe", pos: [52, 15] },
  { name: "Africa", pos: [5, 20] },
  { name: "Asia", pos: [42, 85] },
  { name: "Oceania", pos: [-25, 135] },
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

const MAP_NAME_MAP: Record<string, string> = {
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
  "eSwatini": "Eswatini",
  "Solomon Is.": "Solomon Islands",
  "Timor-Leste": "Timor",
  "N. Cyprus": "North Cyprus",
  "Somaliland": "Somalia",
  "Côte d'Ivoire": "Cote d'Ivoire",
  "Macedonia": "North Macedonia",
  "Kosovo": "Kosovo",
  "Taiwan": "Taiwan",
  "Myanmar": "Myanmar",
  "Lao PDR": "Laos",
  "Brunei": "Brunei",
};

function featureCentroid(feature: any): [number, number] | null {
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    let x = 0, y = 0;
    for (const c of ring) { x += c[0]; y += c[1]; }
    return [y / ring.length, x / ring.length];
  }
  if (geom.type === "MultiPolygon") {
    let best: number[][] = [];
    let bestArea = 0;
    for (const poly of geom.coordinates) {
      const ring = poly[0];
      let a = 0;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
      }
      a = Math.abs(a / 2);
      if (a > bestArea) { bestArea = a; best = ring; }
    }
    if (best.length) {
      let x = 0, y = 0;
      for (const c of best) { x += c[0]; y += c[1]; }
      return [y / best.length, x / best.length];
    }
  }
  return null;
}

/* ─── Labels (siblings of WorldMapShell) ───────────────────────────────── */

function MapLabels() {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);

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

  useEffect(() => {
    fetch("/data/world-countries.json")
      .then((r) => r.json())
      .then((g) => setGeoData(g))
      .catch(() => {});
  }, []);

  const countryLabels = useMemo(() => {
    if (!geoData) return [];
    const result: { name: string; pos: [number, number] }[] = [];
    for (const f of geoData.features) {
      const name = (f.properties as any)?.name;
      if (!name) continue;
      const pos = LABEL_OVERRIDES[name] ?? featureCentroid(f);
      if (pos) result.push({ name, pos });
    }
    return result;
  }, [geoData]);

  if (!ready || !geoData) return null;

  const visibleLabels =
    zoom <= 2
      ? CONTINENT_LABELS
      : zoom <= 3
        ? countryLabels.filter(({ name }) => MAJOR_COUNTRIES.has(name))
        : countryLabels;

  const fontSize = zoom <= 2 ? 13 : 10;
  const cls = zoom <= 2 ? "continent-label-dark" : "country-label-dark";

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
            html: `<span style="font-size:${fontSize}px">${MAP_NAME_MAP[name] || name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

const US_STATES_ZOOM = 4;

function USStateLabels() {
  const map = useMap();
  const [visible, setVisible] = useState(map.getZoom() >= US_STATES_ZOOM);
  const [statesGeo, setStatesGeo] = useState<FeatureCollection | null>(null);
  const fetched = useRef(false);

  useMapEvents({ zoomend: () => setVisible(map.getZoom() >= US_STATES_ZOOM) });

  useEffect(() => {
    if (visible && !fetched.current) {
      fetched.current = true;
      fetch("/data/us-states.json")
        .then((r) => r.json())
        .then((g) => setStatesGeo(g))
        .catch(() => {});
    }
  }, [visible]);

  if (!visible || !statesGeo) return null;

  const stateLabels: { name: string; pos: [number, number] }[] = [];
  for (const f of statesGeo.features) {
    const name = (f.properties as any)?.name;
    if (!name) continue;
    const pos = featureCentroid(f);
    if (pos) stateLabels.push({ name, pos });
  }

  return (
    <>
      {stateLabels.map(({ name, pos }) => (
        <Marker
          key={`state-${name}`}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: "country-label-dark",
            html: `<span style="font-size:9px">${name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

/* ─── Pin offsetting ───────────────────────────────────────────────────── */

function offsetOverlapping(sites: SiteData[]): SiteData[] {
  const posMap = new Map<string, number>();
  const OFFSET = 1.0; // degrees per ring
  return sites.map((site) => {
    if (!site.lat || !site.lon) return site;
    const key = `${site.lat.toFixed(1)},${site.lon.toFixed(1)}`;
    const count = posMap.get(key) || 0;
    posMap.set(key, count + 1);
    if (count === 0) return site;
    const angle = (count * 2 * Math.PI) / 6;
    const r = OFFSET * Math.ceil(count / 6);
    return { ...site, lat: site.lat + r * Math.sin(angle), lon: site.lon + r * Math.cos(angle) };
  });
}

/* ─── Public wrapper ───────────────────────────────────────────────────── */

export default function DataCenterMap({ sites }: Props) {
  const offsetSites = useMemo(() => offsetOverlapping(sites), [sites]);

  return (
    <div className="relative w-full">
      <WorldMapShell preset="world" theme="light">
        <MapLabels />
        <USStateLabels />
        {offsetSites.map((site, i) => {
          if (!site.lat || !site.lon) return null;
          return (
            <CircleMarker
              key={i}
              center={[site.lat, site.lon]}
              radius={getPinRadius(site.powerMW)}
              pathOptions={{
                color: "#1e293b",
                fillColor: getPinColor(site.powerMW),
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <div
                  style={{
                    background: "#0c1222",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    paddingRight: "24px",
                    color: "#e5e7eb",
                    minWidth: 200,
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13, borderBottom: "1px solid #334155", paddingBottom: 4 }}>{site.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px", opacity: 0.8, marginTop: 4 }}>
                    <span style={{ color: "#94a3b8" }}>Owner:</span><span>{site.owner || "—"}</span>
                    {site.users && <><span style={{ color: "#94a3b8" }}>Users:</span><span>{site.users}</span></>}
                    <span style={{ color: "#94a3b8" }}>Status:</span>
                    <span style={{ color: site.powerMW > 0 ? "#10b981" : "#f59e0b" }}>
                      {site.powerMW > 0 ? "Operational" : "Planned"}
                    </span>
                    {site.powerMW > 0 && <><span style={{ color: "#94a3b8" }}>Power:</span><span style={{ color: "#06b6d4", fontFamily: "monospace", fontSize: 11 }}>{site.powerMW.toLocaleString()} MW</span></>}
                    {site.h100Equiv && site.h100Equiv > 0 ? <><span style={{ color: "#94a3b8" }}>H100 Eq:</span><span style={{ fontFamily: "monospace", fontSize: 11 }}>{(site.h100Equiv / 1000).toFixed(0)}K</span></> : null}
                    {site.costBillions && site.costBillions > 0 ? <><span style={{ color: "#94a3b8" }}>Cost:</span><span style={{ fontFamily: "monospace", fontSize: 11 }}>${site.costBillions}B</span></> : null}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </WorldMapShell>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
          <span>500+ MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
          <span>200–500 MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#06b6d4" }} />
          <span>&lt;200 MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
          <span>Planned</span>
        </div>
      </div>
    </div>
  );
}
