"use client";

import React from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface DiseaseOutbreak {
  disease: string;
  country: string;
  date: string;
  summary: string;
  url: string;
  lat: number;
  lon: number;
}

interface Props {
  outbreaks: DiseaseOutbreak[];
}

/* ─── Disease → colour lookup ─────────────────────────────────────────────── */

const DISEASE_COLORS: [string, string][] = [
  ["influenza", "#dc2626"],
  ["ebola", "#f97316"],
  ["marburg", "#ea580c"],
  ["sudan virus", "#f97316"],
  ["mers", "#ef4444"],
  ["sars", "#ef4444"],
  ["covid", "#ef4444"],
  ["mpox", "#a855f7"],
  ["monkeypox", "#a855f7"],
  ["nipah", "#eab308"],
  ["cholera", "#3b82f6"],
  ["measles", "#06b6d4"],
  ["polio", "#14b8a6"],
  ["zika", "#84cc16"],
  ["dengue", "#facc15"],
  ["plague", "#78716c"],
  ["yellow fever", "#eab308"],
  ["meningococcal", "#8b5cf6"],
  ["hiv", "#ec4899"],
  ["lassa", "#fb923c"],
  ["rift valley", "#22d3ee"],
  ["hepatitis", "#f59e0b"],
  ["typhoid", "#64748b"],
  ["diphtheria", "#a8a29e"],
];

function getDiseaseColor(disease: string): string {
  const lower = disease.toLowerCase();
  for (const [key, color] of DISEASE_COLORS) {
    if (lower.includes(key)) return color;
  }
  return "#6b7280";
}

/* ─── Label constants ─────────────────────────────────────────────────────── */

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

/* ─── Dynamic map ─────────────────────────────────────────────────────────── */

const InnerMap = dynamic(
  () =>
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      fetch("/data/world-countries.json").then(r => r.json()).catch(() => null),
    ]).then(([mod, L, geoData]) => {
      const { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap, useMapEvents } = mod;

      function MapLabels() {
        const map = useMap();
        const [ready, setReady] = React.useState(false);
        const [zoom, setZoom] = React.useState(map.getZoom());

        useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

        React.useEffect(() => {
          if (!map.getPane("labels")) {
            const pane = map.createPane("labels");
            pane.style.zIndex = "450";
            pane.style.pointerEvents = "none";
          }
          const tooltipPane = map.getPane("tooltipPane");
          if (tooltipPane) tooltipPane.style.zIndex = "700";
          setReady(true);
        }, [map]);

        const countryLabels = React.useMemo(() => {
          if (!geoData) return [];
          const result: { name: string; pos: [number, number] }[] = [];
          for (const f of geoData.features) {
            const name = f.properties?.name;
            if (!name) continue;
            const pos = LABEL_OVERRIDES[name] ?? featureCentroid(f);
            if (pos) result.push({ name, pos });
          }
          return result;
        }, []);

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
                icon={L.default.divIcon({
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

      function FitBounds({ outbreaks }: { outbreaks: DiseaseOutbreak[] }) {
        const map = useMap();
        React.useEffect(() => {
          if (outbreaks.length === 0) return;
          const width = map.getContainer().clientWidth;
          if (width < 500) {
            map.setView([20, 30], 1);
          } else {
            const bounds = L.default.latLngBounds(outbreaks.map(o => [o.lat, o.lon]));
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: width < 768 ? 3 : 5 });
          }
        }, [outbreaks, map]);
        return null;
      }

      return function OutbreakMap({ outbreaks }: Props) {
        return (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={1}
            maxZoom={8}
            scrollWheelZoom={true}
            className="h-[280px] md:h-[420px] w-full rounded-xl z-0"
            style={{ background: "#BEEEF9" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            />
            <MapLabels />
            <FitBounds outbreaks={outbreaks} />
            {outbreaks.map((o, i) => {
              const fill = getDiseaseColor(o.disease);
              return (
                <CircleMarker
                  key={i}
                  center={[o.lat, o.lon]}
                  radius={11}
                  pathOptions={{
                    color: "#1e293b",
                    fillColor: fill,
                    fillOpacity: 0.75,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div
                      style={{
                        background: "#0c1222",
                        border: `1px solid ${fill}40`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        paddingTop: 18,
                        paddingRight: 24,
                        color: "#e5e7eb",
                        minWidth: 200,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: fill, marginBottom: 2, fontSize: 13 }}>
                        {o.disease}
                      </div>
                      <div style={{ opacity: 0.8 }}>{o.country}</div>
                      <div style={{ opacity: 0.5, marginTop: 2, fontSize: 11 }}>
                        {new Date(o.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      {o.summary && (
                        <div style={{ opacity: 0.6, marginTop: 6, fontSize: 11, lineHeight: 1.4, maxHeight: 60, overflow: "hidden" }}>
                          {o.summary.slice(0, 150)}{o.summary.length > 150 ? "…" : ""}
                        </div>
                      )}
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          color: fill,
                          textDecoration: "underline",
                          fontWeight: 600,
                        }}
                      >
                        WHO report →
                      </a>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        );
      };
    }),
  { ssr: false, loading: () => <div className="h-[280px] md:h-[420px] w-full rounded-xl bg-gray-900 animate-pulse" /> },
);

/* ─── Exported wrapper ────────────────────────────────────────────────────── */

export default function DiseaseOutbreakMap({ outbreaks }: Props) {
  return <InnerMap outbreaks={outbreaks} />;
}
