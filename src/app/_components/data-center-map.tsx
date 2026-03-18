"use client";

import React from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

interface SiteData {
  name: string;
  owner: string;
  powerMW: number;
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
  if (powerMW <= 0) return "#f59e0b"; // amber — planned
  if (powerMW <= 200) return "#06b6d4"; // cyan
  if (powerMW <= 500) return "#3b82f6"; // blue
  return "#8b5cf6"; // violet — largest
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

/* ─── Dynamic map (needs leaflet + geoData for labels) ─────────────────── */

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

      const US_STATES_ZOOM = 4;

      function USStateLabels() {
        const map = useMap();
        const [visible, setVisible] = React.useState(map.getZoom() >= US_STATES_ZOOM);
        const [statesGeo, setStatesGeo] = React.useState<any>(null);
        const fetched = React.useRef(false);

        useMapEvents({ zoomend: () => setVisible(map.getZoom() >= US_STATES_ZOOM) });

        React.useEffect(() => {
          if (visible && !fetched.current) {
            fetched.current = true;
            fetch("/data/us-states.json")
              .then(r => r.json())
              .then(geo => setStatesGeo(geo))
              .catch(() => {});
          }
        }, [visible]);

        if (!visible || !statesGeo) return null;

        const stateLabels: { name: string; pos: [number, number] }[] = [];
        for (const f of statesGeo.features) {
          const name = f.properties?.name;
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
                icon={L.default.divIcon({
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

      function FitSites({ sites }: { sites: SiteData[] }) {
        const map = useMap();
        React.useEffect(() => {
          if (!sites.length) return;
          const validSites = sites.filter(s => s.lat && s.lon);
          if (!validSites.length) return;
          const width = map.getContainer().clientWidth;
          if (width < 500) {
            map.setView([20, 30], 1);
          } else {
            const bounds = L.default.latLngBounds(validSites.map((s: SiteData) => [s.lat, s.lon]));
            map.fitBounds(bounds, {
              padding: [40, 40],
              maxZoom: width < 768 ? 3 : 5,
            });
          }
        }, [sites, map]);
        return null;
      }

      return function DCMap({ sites }: Props) {
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
            <USStateLabels />
            <FitSites sites={sites} />
            {sites.map((site, i) => {
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
                        paddingTop: "14px",
                        color: "#e5e7eb",
                        minWidth: 170,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{site.name}</div>
                      <div style={{ opacity: 0.7 }}>{site.owner}</div>
                      {site.powerMW > 0 ? (
                        <div style={{ color: "#06b6d4", marginTop: 4 }}>{site.powerMW.toLocaleString()} MW</div>
                      ) : (
                        <div style={{ color: "#f59e0b", marginTop: 4 }}>Planned</div>
                      )}
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

export default function DataCenterMap({ sites }: Props) {
  return (
    <div className="relative w-full">
      <InnerMap sites={sites} />

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
