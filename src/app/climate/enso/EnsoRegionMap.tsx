"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type RegionAnoms = {
  nino12: number;
  nino3: number;
  nino34: number;
  nino4: number;
};

// Map uses 0–360° longitude so the Pacific is contiguous (no antimeridian
// split for Niño 4, which spans 160°E–150°W).
const REGIONS = [
  {
    key: "nino4" as const,
    label: "Niño 4",
    bounds: [
      [-5, 160],
      [5, 210],
    ] as [[number, number], [number, number]],
    centroid: [0, 185] as [number, number],
  },
  {
    key: "nino34" as const,
    label: "Niño 3.4",
    bounds: [
      [-5, 190],
      [5, 240],
    ] as [[number, number], [number, number]],
    centroid: [0, 215] as [number, number],
  },
  {
    key: "nino3" as const,
    label: "Niño 3",
    bounds: [
      [-5, 210],
      [5, 270],
    ] as [[number, number], [number, number]],
    centroid: [0, 240] as [number, number],
  },
  {
    key: "nino12" as const,
    label: "Niño 1+2",
    bounds: [
      [-10, 270],
      [0, 280],
    ] as [[number, number], [number, number]],
    centroid: [-5, 275] as [number, number],
  },
];

const fillFor = (a: number) => {
  const mag = Math.min(1, Math.abs(a) / 2.5);
  const alpha = 0.18 + 0.55 * mag;
  if (a >= 0) return `rgba(244, 63, 94, ${alpha.toFixed(2)})`;
  return `rgba(14, 165, 233, ${alpha.toFixed(2)})`;
};
const strokeFor = (a: number) =>
  a >= 0.5 ? "#fb7185" : a <= -0.5 ? "#38bdf8" : "#94a3b8";

const fmtSigned = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;

const EnsoRegionMapInner = dynamic<{ anoms: RegionAnoms }>(
  () =>
    Promise.all([import("react-leaflet"), import("leaflet")]).then(
      ([mod, L]) => {
        const {
          MapContainer,
          TileLayer,
          Rectangle,
          Tooltip,
          Marker,
        } = mod;

        function Map({ anoms }: { anoms: RegionAnoms }) {
          const labelIcon = (label: string, anom: number) =>
            (L as any).divIcon({
              className: "enso-region-label",
              html: `<div style="
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                font-size: 12px;
                font-weight: 700;
                color: #0f172a;
                text-shadow: 0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff;
                text-align: center;
                white-space: nowrap;
                pointer-events: none;
              ">
                ${label}
                <div style="
                  font-size: 11px;
                  font-weight: 700;
                  color: ${
                    anom >= 0.5
                      ? "#be123c"
                      : anom <= -0.5
                        ? "#0369a1"
                        : "#1f2937"
                  };
                ">${fmtSigned(anom)}°C</div>
              </div>`,
              iconSize: [80, 36],
              iconAnchor: [40, 18],
            });

          const continentIcon = (label: string) =>
            (L as any).divIcon({
              className: "enso-continent-label",
              html: `<div style="
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #475569;
                text-shadow: 0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0.8;
              ">${label}</div>`,
              iconSize: [120, 16],
              iconAnchor: [60, 8],
            });

          const CONTINENTS: Array<{ label: string; pos: [number, number] }> = [
            { label: "Asia", pos: [30, 110] },
            { label: "Australia", pos: [-25, 135] },
            { label: "North America", pos: [30, 260] },
            { label: "South America", pos: [-15, 295] },
          ];

          return (
            <MapContainer
              center={[0, 205]}
              zoom={2}
              minZoom={2}
              maxZoom={5}
              scrollWheelZoom={false}
              dragging={false}
              doubleClickZoom={false}
              zoomControl={false}
              attributionControl={false}
              maxBounds={[
                [-40, 100],
                [40, 310],
              ]}
              maxBoundsViscosity={1.0}
              className="h-[260px] md:h-[320px] w-full z-0"
              style={{ background: "#BEEEF9" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
                noWrap={false}
              />
              {CONTINENTS.map((c) => (
                <Marker
                  key={`continent-${c.label}`}
                  position={c.pos}
                  icon={continentIcon(c.label)}
                  interactive={false}
                />
              ))}
              {REGIONS.map((r) => {
                const a = anoms[r.key];
                return (
                  <Rectangle
                    key={r.key}
                    bounds={r.bounds}
                    pathOptions={{
                      color: strokeFor(a),
                      weight: 2,
                      fillColor: fillFor(a).replace(/rgba?\(([^)]+)\)/, (_m, p) => {
                        const [r1, g1, b1] = p.split(",").map((x: string) => x.trim());
                        return `rgb(${r1},${g1},${b1})`;
                      }),
                      fillOpacity: 0.55,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -4]} sticky>
                      <span style={{ fontFamily: "ui-monospace, monospace" }}>
                        <strong>{r.label}</strong>: {fmtSigned(a)}°C
                      </span>
                    </Tooltip>
                  </Rectangle>
                );
              })}
              {REGIONS.map((r) => (
                <Marker
                  key={`lbl-${r.key}`}
                  position={r.centroid}
                  icon={labelIcon(r.label, anoms[r.key])}
                  interactive={false}
                />
              ))}
            </MapContainer>
          );
        }

        return Map;
      },
    ) as any,
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] md:h-[320px] w-full rounded-lg bg-gray-900/40 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
      </div>
    ),
  },
);

export default function EnsoRegionMap({ anoms }: { anoms: RegionAnoms }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/50">
      <EnsoRegionMapInner anoms={anoms} />
    </div>
  );
}
