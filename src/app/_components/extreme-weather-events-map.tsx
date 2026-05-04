"use client";

/**
 * Extreme Weather live-events map. Wraps WorldMapShell so the aspect ratio,
 * fractional-zoom strategy, attribution sizing and label conventions match
 * every other choropleth/marker map on the site.
 */

import React, { useEffect, useMemo, useState } from "react";
import { CircleMarker, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import { WorldMapShell } from "./world-map-shell";
import "leaflet/dist/leaflet.css";

export interface GDACSEvent {
  type: string;
  name: string;
  alertLevel: string;
  country: string;
  fromDate: string;
  toDate: string;
  severity: string;
  population: number;
  lat: number;
  lon: number;
  url: string;
}

const ALERT_FILL: Record<string, string> = {
  Red: "#dc2626",
  Orange: "#ea580c",
  Green: "#059669",
};
const ALERT_BG: Record<string, string> = {
  Red: "#1a0505",
  Orange: "#1a0f05",
  Green: "#051a0f",
};
const ALERT_BORDER: Record<string, string> = {
  Red: "#ef4444",
  Orange: "#f97316",
  Green: "#10b981",
};

const LABEL_OVERRIDES: Record<string, [number, number]> = {
  "United States of America": [40, -98],
  Canada: [56, -96],
  Russia: [62, 95],
  France: [47, 2.5],
  Norway: [65, 13],
  Indonesia: [-2, 118],
  Malaysia: [4, 109],
  Chile: [-35, -71],
  "New Zealand": [-42, 174],
  Japan: [36, 138],
  Antarctica: [-82, 0],
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
  "Lao PDR": "Laos",
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

interface Props {
  events: GDACSEvent[];
}

export default function ExtremeWeatherEventsMap({ events }: Props) {
  return (
    <WorldMapShell preset="world" theme="light">
      <MapLabels />
      {events.map((e, i) => (
        <CircleMarker
          key={i}
          center={[e.lat, e.lon]}
          radius={e.alertLevel === "Red" ? 14 : e.alertLevel === "Orange" ? 11 : 9}
          pathOptions={{
            color: "#1e293b",
            fillColor: ALERT_FILL[e.alertLevel] || "#6b7280",
            fillOpacity: 0.75,
            weight: 2,
          }}
        >
          <Popup>
            <div
              style={{
                background: ALERT_BG[e.alertLevel] || "#111827",
                border: `1px solid ${ALERT_BORDER[e.alertLevel] || "#374151"}`,
                borderRadius: "8px",
                padding: "10px 12px",
                paddingTop: "18px",
                paddingRight: "24px",
                color: ALERT_FILL[e.alertLevel] || "#9ca3af",
                minWidth: 160,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{e.name}</div>
              {e.country && <div style={{ opacity: 0.8 }}>{e.country}</div>}
              {e.severity && <div style={{ opacity: 0.6, marginTop: 2 }}>{e.severity}</div>}
              <a
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  color: ALERT_FILL[e.alertLevel] || "#9ca3af",
                  textDecoration: "underline",
                  fontWeight: 600,
                }}
              >
                View GDACS report →
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </WorldMapShell>
  );
}
