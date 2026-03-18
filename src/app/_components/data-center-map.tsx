"use client";

import React, { useState, useEffect } from "react";

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

// Pre-computed projection coordinates for each site (AlbersUSA fitSize [960,600])
// Sites outside the US (null projection) are excluded from the map
const US_PROJECTION: Record<string, [number, number]> = {};

function getPinRadius(powerMW: number): number {
  if (powerMW <= 0) return 5;
  if (powerMW <= 100) return 6;
  if (powerMW <= 300) return 8;
  if (powerMW <= 500) return 10;
  return 12;
}

function getPinColor(powerMW: number): string {
  if (powerMW <= 0) return "#f59e0b"; // amber — planned
  if (powerMW <= 200) return "#22d3ee"; // cyan
  if (powerMW <= 500) return "#3b82f6"; // blue
  return "#a855f7"; // purple — largest
}

export default function DataCenterMap({ sites }: Props) {
  const [paths, setPaths] = useState<Record<string, string> | null>(null);
  const [projCoords, setProjCoords] = useState<Record<string, [number, number]>>(US_PROJECTION);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/us-state-paths.json")
      .then((r) => r.json())
      .then(setPaths)
      .catch(() => {});
  }, []);

  // Compute projections client-side using the same projection params as generate_paths.js
  // fitSize([960,600], geo) → scale ≈ 1054.95, translate ≈ [480, 300]
  useEffect(() => {
    if (!sites.length) return;
    import("d3-geo").then(({ geoAlbersUsa }) => {
      const proj = geoAlbersUsa().scale(1054.95).translate([480, 300]);
      const coords: Record<string, [number, number]> = {};
      for (const s of sites) {
        if (s.lat && s.lon) {
          const p = proj([s.lon, s.lat]);
          if (p) coords[s.name] = [p[0], p[1]];
        }
      }
      setProjCoords(coords);
    });
  }, [sites]);

  if (!paths) return <div className="h-[400px] animate-pulse bg-gray-800/50 rounded-xl" />;

  const stateNames = Object.keys(paths);
  const hoveredSite = hovered ? sites.find(s => s.name === hovered) : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 960 600"
        className="w-full h-auto"
        style={{ maxHeight: 500 }}
      >
        <rect width="960" height="600" fill="#0d1520" rx="8" />
        {stateNames.map((name) => (
          <path
            key={name}
            d={paths[name]}
            fill="#1a2332"
            stroke="#2a3f52"
            strokeWidth={0.5}
          />
        ))}
        {/* Site pins */}
        {sites.map((site) => {
          const coord = projCoords[site.name];
          if (!coord) return null;
          const r = getPinRadius(site.powerMW);
          const isHovered = hovered === site.name;
          return (
            <g key={site.name}>
              <circle
                cx={coord[0]}
                cy={coord[1]}
                r={isHovered ? r + 3 : r}
                fill={getPinColor(site.powerMW)}
                fillOpacity={0.7}
                stroke={isHovered ? "#fff" : getPinColor(site.powerMW)}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={0.9}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(site.name)}
                onMouseLeave={() => setHovered(null)}
              />
              {isHovered && (
                <circle cx={coord[0]} cy={coord[1]} r={r + 8} fill="none" stroke="#88DDFC" strokeWidth={1.5} strokeOpacity={0.5} />
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && hoveredSite && (
        <div className="absolute top-3 right-3 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-sm pointer-events-none">
          <p className="font-semibold text-gray-200">{hoveredSite.name}</p>
          <p className="text-gray-400">{hoveredSite.owner}</p>
          {hoveredSite.powerMW > 0 ? (
            <p className="text-cyan-400">{hoveredSite.powerMW.toLocaleString()} MW</p>
          ) : (
            <p className="text-amber-400">Planned</p>
          )}
        </div>
      )}

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
