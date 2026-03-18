"use client";

import React, { useState, useEffect, useMemo } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import type { FeatureCollection, Feature } from "geojson";

interface StateData {
  name: string;
  value: number;
  sqft: number;
}

interface Props {
  data: StateData[];
}

const COLOR_SCALE = [
  "#0e2433", // 0
  "#0f3d5c", // 1-5
  "#115e8a", // 6-15
  "#1a7fb8", // 16-30
  "#2ba0d4", // 31-50
  "#4dc4ef", // 51-80
  "#7dd8f5", // 81-120
  "#a6e6fa", // 121-200
  "#d0f1fd", // 201-290
  "#ffffff", // 291+
];

function getColor(count: number): string {
  if (count === 0) return COLOR_SCALE[0];
  if (count <= 5) return COLOR_SCALE[1];
  if (count <= 15) return COLOR_SCALE[2];
  if (count <= 30) return COLOR_SCALE[3];
  if (count <= 50) return COLOR_SCALE[4];
  if (count <= 80) return COLOR_SCALE[5];
  if (count <= 120) return COLOR_SCALE[6];
  if (count <= 200) return COLOR_SCALE[7];
  if (count <= 290) return COLOR_SCALE[8];
  return COLOR_SCALE[9];
}

const LEGEND_ITEMS = [
  { label: "0", color: COLOR_SCALE[0] },
  { label: "1–5", color: COLOR_SCALE[1] },
  { label: "6–15", color: COLOR_SCALE[2] },
  { label: "16–30", color: COLOR_SCALE[3] },
  { label: "31–50", color: COLOR_SCALE[4] },
  { label: "51–80", color: COLOR_SCALE[5] },
  { label: "81–120", color: COLOR_SCALE[6] },
  { label: "121–200", color: COLOR_SCALE[7] },
  { label: "201–290", color: COLOR_SCALE[8] },
  { label: "291+", color: COLOR_SCALE[9] },
];

export default function DataCenterMap({ data }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/us-states.json")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => {});
  }, []);

  const dataMap = useMemo(() => {
    const map = new Map<string, StateData>();
    for (const d of data) map.set(d.name, d);
    return map;
  }, [data]);

  const projection = useMemo(
    () => geoAlbersUsa().scale(1000).translate([480, 300]),
    []
  );
  const pathGen = useMemo(() => geoPath().projection(projection), [projection]);

  if (!geo) return <div className="h-[400px] animate-pulse bg-gray-800/50 rounded-xl" />;

  const hoveredData = hovered ? dataMap.get(hovered) : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 960 600"
        className="w-full h-auto"
        style={{ maxHeight: 500 }}
      >
        {geo.features.map((feature: Feature) => {
          const name = feature.properties?.name || "";
          const stateData = dataMap.get(name);
          const count = stateData?.value ?? 0;
          const d = pathGen(feature as any) || "";
          const isHovered = hovered === name;
          return (
            <path
              key={name}
              d={d}
              fill={getColor(count)}
              stroke={isHovered ? "#88DDFC" : "#1e3a4f"}
              strokeWidth={isHovered ? 2 : 0.5}
              className="transition-colors duration-150 cursor-pointer"
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && hoveredData && (
        <div className="absolute top-3 right-3 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-sm pointer-events-none">
          <p className="font-semibold text-gray-200">{hovered}</p>
          <p className="text-cyan-400">{hoveredData.value.toLocaleString()} data centers</p>
          {hoveredData.sqft > 0 && (
            <p className="text-gray-400">
              {(hoveredData.sqft / 1e6).toFixed(1)}M sq ft
            </p>
          )}
        </div>
      )}
      {hovered && !hoveredData && (
        <div className="absolute top-3 right-3 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-sm pointer-events-none">
          <p className="font-semibold text-gray-200">{hovered}</p>
          <p className="text-gray-500">No data centers</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-1 gap-y-1 mt-2 text-xs text-gray-400">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm border border-gray-700"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
