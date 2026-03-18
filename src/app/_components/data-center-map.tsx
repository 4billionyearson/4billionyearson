"use client";

import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
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

function FitSites({ sites }: { sites: SiteData[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (!sites.length) return;
    const L = require("leaflet");
    const validSites = sites.filter(s => s.lat && s.lon);
    if (!validSites.length) return;
    const width = map.getContainer().clientWidth;
    if (width < 500) {
      map.setView([38, -97], 3);
    } else {
      const bounds = L.latLngBounds(validSites.map((s: SiteData) => [s.lat, s.lon]));
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: width < 768 ? 3 : 5,
      });
    }
  }, [sites, map]);
  return null;
}

export default function DataCenterMap({ sites }: Props) {
  return (
    <div className="relative w-full">
      <MapContainer
        center={[38, -97]}
        zoom={4}
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
