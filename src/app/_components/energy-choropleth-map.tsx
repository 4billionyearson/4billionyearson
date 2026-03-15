"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { Layer, PathOptions } from "leaflet";

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

export default function EnergyChoroplethMap() {
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
        setGeoData(geo);
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
          maxZoom={6}
          scrollWheelZoom={true}
          className="h-[400px] md:h-[500px] w-full rounded-xl z-0"
          style={{ background: "#0c1222" }}
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
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            className="leaflet-labels-bright"
          />
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
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
