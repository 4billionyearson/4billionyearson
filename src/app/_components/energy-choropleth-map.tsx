"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Marker } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import L from "leaflet";

/* Compute the visual centroid of a GeoJSON feature */
function featureCentroid(feature: Feature): [number, number] | null {
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    return ringCentroid((geom as any).coordinates[0]);
  }
  if (geom.type === "MultiPolygon") {
    // Use the largest polygon
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
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return a / 2;
}
function ringCentroid(ring: number[][]): [number, number] {
  let x = 0, y = 0;
  for (const c of ring) { x += c[0]; y += c[1]; }
  return [y / ring.length, x / ring.length]; // [lat, lng]
}

/* Manual centroid overrides for countries whose auto-centroid lands poorly */
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

/* Continent labels shown at low zoom */
const CONTINENT_LABELS: { name: string; pos: [number, number] }[] = [
  { name: "North America", pos: [45, -100] },
  { name: "South America", pos: [-15, -58] },
  { name: "Europe", pos: [52, 15] },
  { name: "Africa", pos: [5, 20] },
  { name: "Asia", pos: [42, 85] },
  { name: "Oceania", pos: [-25, 135] },
];

/* Major countries shown at mid zoom (3) – skip small countries */
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

/* Render English-only country labels on a custom pane above the GeoJSON fill */
function CountryLabels({ geo }: { geo: FeatureCollection }) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

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

  // Zoom 2: continents only
  // Zoom 3: major countries
  // Zoom 4+: all countries
  const visibleLabels =
    zoom <= 2
      ? CONTINENT_LABELS
      : zoom <= 3
        ? countryLabels.filter(({ name }) => MAJOR_COUNTRIES.has(name))
        : countryLabels;

  const fontSize = zoom <= 2 ? 13 : zoom <= 3 ? 10 : 10;
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
            html: `<span style="font-size:${fontSize}px">${NAME_MAP[name] ? NAME_MAP[name] : name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

// Map from GeoJSON names → OWID names (where they differ)
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

interface EnergyEntry {
  name: string;
  renewablesShare: number;
}

// Fix GeoJSON features crossing the antimeridian (Russia, Fiji, Antarctica)
// by splitting rings that span both sides into separate polygons
function fixAntimeridian(geo: FeatureCollection): FeatureCollection {
  const ANTI_COUNTRIES = new Set(["Russia", "Fiji", "Antarctica"]);
  return {
    ...geo,
    features: geo.features.map((f) => {
      if (!ANTI_COUNTRIES.has(f.properties?.name)) return f;
      if (f.geometry.type === "MultiPolygon") {
        const fixed: number[][][][] = [];
        for (const polygon of (f.geometry as any).coordinates as number[][][][]) {
          for (const ring of polygon) {
            const hasHigh = ring.some((c: number[]) => c[0] > 170);
            const hasLow = ring.some((c: number[]) => c[0] < -170);
            if (hasHigh && hasLow) {
              // Split into east and west halves
              const east = ring.map((c: number[]) => c[0] < 0 ? [c[0] + 360, c[1]] : [...c]);
              const west = ring.map((c: number[]) => c[0] > 0 ? [c[0] - 360, c[1]] : [...c]);
              fixed.push([east], [west]);
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

// Color scale: red (0%) → yellow (25%) → green (50%) → cyan (75%+)
function getColor(value: number | undefined) {
  if (value == null) return "#1e293b"; // no data = dark slate
  if (value >= 75) return "#06b6d4";
  if (value >= 60) return "#14b8a6";
  if (value >= 45) return "#22c55e";
  if (value >= 30) return "#84cc16";
  if (value >= 20) return "#eab308";
  if (value >= 10) return "#f59e0b";
  if (value >= 5) return "#ef4444";
  return "#991b1b";
}

const US_STATES_ZOOM = 4; // show state outlines at zoom ≥ 4

/* Lazily load US states GeoJSON + energy data and show coloured states when zoomed in */
function USStatesLayer() {
  const map = useMap();
  const [statesGeo, setStatesGeo] = useState<FeatureCollection | null>(null);
  const [stateEnergy, setStateEnergy] = useState<Record<string, number> | null>(null);
  const [visible, setVisible] = useState(map.getZoom() >= US_STATES_ZOOM);
  const fetched = useRef(false);

  useMapEvents({
    zoomend: () => setVisible(map.getZoom() >= US_STATES_ZOOM),
  });

  useEffect(() => {
    if (visible && !fetched.current) {
      fetched.current = true;
      Promise.all([
        fetch("/data/us-states.json").then((r) => r.json()),
        fetch("/data/us-state-energy.json").then((r) => r.json()),
      ])
        .then(([geo, energy]) => {
          setStatesGeo(geo as FeatureCollection);
          setStateEnergy(energy.states as Record<string, number>);
        })
        .catch(() => {});
    }
  }, [visible]);

  const stateStyle = useCallback(
    (feature: Feature | undefined): PathOptions => {
      const name = feature?.properties?.name || "";
      const value = stateEnergy?.[name];
      return {
        fillColor: getColor(value),
        fillOpacity: 0.85,
        weight: 1,
        color: "#475569",
        opacity: 0.8,
      };
    },
    [stateEnergy]
  );

  const onEachState = useCallback(
    (feature: Feature, layer: Layer) => {
      const name = feature.properties?.name || "";
      const value = stateEnergy?.[name];
      const html = `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 12px;color:#e2e8f0;font-size:12px;min-width:140px">
          <div style="font-weight:700;margin-bottom:2px">${name}</div>
          <div style="color:${getColor(value)};font-weight:600">
            ${value != null ? `${value.toFixed(1)}% renewable` : "No data"}
          </div>
        </div>
      `;
      layer.bindTooltip(html, { sticky: true, direction: "top", offset: [0, -10] });
    },
    [stateEnergy]
  );

  if (!visible || !statesGeo || !stateEnergy) return null;

  const stateLabels: { name: string; pos: [number, number] }[] = [];
  for (const f of statesGeo.features) {
    const name = f.properties?.name;
    if (!name) continue;
    const pos = featureCentroid(f);
    if (pos) stateLabels.push({ name, pos });
  }

  return (
    <>
      <GeoJSON
        data={statesGeo}
        style={stateStyle}
        onEachFeature={onEachState}
      />
      {stateLabels.map(({ name, pos }) => (
        <Marker
          key={`state-${name}`}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: "country-label",
            html: `<span style="font-size:9px">${name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

// Reverse NAME_MAP: OWID name → GeoJSON name
const OWID_TO_GEO: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_MAP).map(([geo, owid]) => [owid, geo])
);

/* Manual bounds for countries whose GeoJSON bounds are broken or too wide */
const COUNTRY_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  "United States": [[24, -125], [50, -66]],       // contiguous US
  "Russia": [[41, 27], [72, 180]],
  "Canada": [[42, -141], [72, -52]],
  "France": [[41, -5.5], [51.5, 10]],             // mainland France
  "Indonesia": [[-11, 95], [6, 141]],
  "New Zealand": [[-47, 166], [-34, 179]],
  "Fiji": [[-21, 177], [-12, -179]],
  "Antarctica": [[-85, -180], [-60, 180]],
};

/* Fly to a country or US state when selected */
function FlyToCountry({ name, stateName, geo }: { name: string | undefined; stateName?: string; geo: FeatureCollection }) {
  const map = useMap();

  useEffect(() => {
    if (stateName) {
      fetch("/data/us-states.json")
        .then((r) => r.json())
        .then((statesGeo: FeatureCollection) => {
          const feature = statesGeo.features.find(
            (f) => f.properties?.name === stateName
          );
          if (feature) {
            const bounds = L.geoJSON(feature).getBounds();
            if (bounds.isValid()) {
              map.flyToBounds(bounds, { padding: [20, 20], maxZoom: 8, duration: 1.2 });
            }
          }
        })
        .catch(() => {});
      return;
    }

    if (!name) return;

    // Use manual bounds for problematic countries
    const manual = COUNTRY_BOUNDS[name];
    if (manual) {
      map.flyToBounds(manual, { padding: [20, 20], maxZoom: 8, duration: 1.2 });
      return;
    }

    const geoName = OWID_TO_GEO[name] || name;
    const feature = geo.features.find(
      (f) => {
        const n = f.properties?.name;
        return n === geoName || n === name || NAME_MAP[n] === name;
      }
    );
    if (feature) {
      const bounds = L.geoJSON(feature).getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [20, 20], maxZoom: 8, duration: 1.2 });
      }
    }
  }, [name, stateName, geo, map]);

  return null;
}

export default function EnergyChoroplethMap({ selectedCountry, selectedState }: { selectedCountry?: string; selectedState?: string }) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [energyData, setEnergyData] = useState<Map<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const geoRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/world-countries.json").then((r) => r.json()),
      fetch("/api/climate/energy/top10").then((r) => r.json()),
    ])
      .then(([geo, top10]) => {
        setGeoData(fixAntimeridian(geo));
        // The top10 endpoint doesn't return all countries' renewable share
        // So let's fetch directly from the OWID dataset
        return fetch("https://owid-public.owid.io/data/energy/owid-energy-data.json").then((r) => r.json());
      })
      .then((owid) => {
        const map = new Map<string, number>();
        for (const [name, countryObj] of Object.entries(owid as Record<string, any>)) {
          if (!countryObj?.data?.length) continue;
          // Get latest renewables_share_energy
          for (let i = countryObj.data.length - 1; i >= 0; i--) {
            const val = countryObj.data[i].renewables_share_energy;
            if (val != null && val > 0) {
              map.set(name, val);
              break;
            }
          }
        }
        setEnergyData(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const style = useCallback(
    (feature: Feature | undefined): PathOptions => {
      if (!feature || !energyData) {
        return { fillColor: "#1e293b", fillOpacity: 0.7, weight: 0.5, color: "#475569" };
      }
      const geoName = feature.properties?.name || "";
      const owidName = NAME_MAP[geoName] || geoName;
      const value = energyData.get(owidName);
      return {
        fillColor: getColor(value),
        fillOpacity: 0.8,
        weight: 0.5,
        color: "#334155",
      };
    },
    [energyData]
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      if (!energyData) return;
      const geoName = feature.properties?.name || "";
      const owidName = NAME_MAP[geoName] || geoName;
      const value = energyData.get(owidName);
      const html = `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 12px;color:#e2e8f0;font-size:12px;min-width:140px">
          <div style="font-weight:700;margin-bottom:2px">${owidName}</div>
          <div style="color:${getColor(value)};font-weight:600">
            ${value != null ? `${value.toFixed(1)}% renewable` : "No data"}
          </div>
        </div>
      `;
      layer.bindTooltip(html, { sticky: true, direction: "top", offset: [0, -10] });
    },
    [energyData]
  );

  if (loading) {
    return (
      <div className="h-[400px] md:h-[500px] w-full rounded-xl bg-gray-900/50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!geoData || !energyData) {
    return (
      <div className="h-[400px] md:h-[500px] w-full rounded-xl bg-gray-900/50 flex items-center justify-center text-gray-500">
        Failed to load map data
      </div>
    );
  }

  return (
    <div>
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
            ref={geoRef}
            key={energyData.size}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
          <USStatesLayer />
          <CountryLabels geo={geoData} />
          <FlyToCountry name={selectedCountry} stateName={selectedState} geo={geoData} />
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-gray-400">
        <span className="font-semibold text-gray-300">Renewable energy share:</span>
        {[
          { color: "#991b1b", label: "<5%" },
          { color: "#ef4444", label: "5-10%" },
          { color: "#f59e0b", label: "10-20%" },
          { color: "#eab308", label: "20-30%" },
          { color: "#84cc16", label: "30-45%" },
          { color: "#22c55e", label: "45-60%" },
          { color: "#14b8a6", label: "60-75%" },
          { color: "#06b6d4", label: "75%+" },
        ].map(({ color, label }) => (
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
