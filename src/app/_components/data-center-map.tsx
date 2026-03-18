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
  if (powerMW <= 0) return 6;
  if (powerMW <= 100) return 7;
  if (powerMW <= 300) return 9;
  if (powerMW <= 500) return 11;
  return 14;
}

function getPinColor(powerMW: number): string {
  if (powerMW <= 0) return "#f59e0b"; // amber — planned
  if (powerMW <= 200) return "#22d3ee"; // cyan
  if (powerMW <= 500) return "#3b82f6"; // blue
  return "#a855f7"; // purple — largest
}

function FitSites({ sites }: { sites: SiteData[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (!sites.length) return;
    const L = require("leaflet");
    const validSites = sites.filter(s => s.lat && s.lon);
    if (!validSites.length) return;
    const bounds = L.latLngBounds(validSites.map(s => [s.lat, s.lon]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 5 });
  }, [sites, map]);
  return null;
}

export default function DataCenterMap({ sites }: Props) {
  return (
    <div className="relative w-full">
      <MapContainer
        center={[38, -97]}
        zoom={4}
        minZoom={2}
        maxZoom={10}
        scrollWheelZoom={true}
        className="h-[320px] md:h-[440px] w-full rounded-xl z-0"
        style={{ background: "#0d1520" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
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
                fillOpacity: 0.75,
                weight: 2,
              }}
            >
              <Popup>
                <div
                  style={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "#e5e7eb",
                    minWidth: 160,
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{site.name}</div>
                  <div style={{ opacity: 0.7 }}>{site.owner}</div>
                  {site.powerMW > 0 ? (
                    <div style={{ color: "#22d3ee", marginTop: 4 }}>{site.powerMW.toLocaleString()} MW</div>
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
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#a855f7" }} />
          <span>500+ MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
          <span>200–500 MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#22d3ee" }} />
          <span>&lt;200 MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
          <span>Planned</span>
        </div>
      </div>
    </div>
  );
}
