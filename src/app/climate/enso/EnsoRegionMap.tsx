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

export type EnsoMapState = 'el-nino' | 'la-nina' | 'neutral';

// Map uses 0–360° longitude so the Pacific is contiguous (no antimeridian
// split for Niño 4, which spans 160°E–150°W).
const REGIONS = [
  {
    key: "nino4" as const,
    label: "Niño 4",
    bounds: [
      [-8, 160],
      [8, 210],
    ] as [[number, number], [number, number]],
    centroid: [0, 185] as [number, number],
  },
  {
    key: "nino34" as const,
    label: "Niño 3.4",
    bounds: [
      [-8, 190],
      [8, 240],
    ] as [[number, number], [number, number]],
    centroid: [0, 215] as [number, number],
  },
  {
    key: "nino3" as const,
    label: "Niño 3",
    bounds: [
      [-8, 210],
      [8, 270],
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

const EnsoRegionMapInner = dynamic<{ anoms: RegionAnoms; state: EnsoMapState }>(
  () =>
    Promise.all([import("react-leaflet"), import("leaflet")]).then(
      ([mod, L]) => {
        const {
          MapContainer,
          TileLayer,
          Rectangle,
          Marker,
        } = mod;

        function Map({ anoms, state }: { anoms: RegionAnoms; state: EnsoMapState }) {
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

          // Trade-wind arrows along the equator. The Pacific normally has
          // east→west trade winds that pile warm water in the western warm
          // pool. La Niña intensifies that flow; El Niño weakens or reverses
          // it, sending warm water east.
          const isLaNina = state === "la-nina";
          const isElNino = state === "el-nino";
          const arrowColor = isElNino ? "#be123c" : isLaNina ? "#0369a1" : "#475569";
          const arrowStrokeWidth = isLaNina ? 3.2 : isElNino ? 2.6 : 2;
          // Arrow direction: El Niño = eastward (▶), otherwise westward (◀).
          const arrowSvg = (dir: "east" | "west") => {
            const points = dir === "east" ? "4,12 36,12 36,6 50,16 36,26 36,20 4,20" : "46,12 14,12 14,6 0,16 14,26 14,20 46,20";
            return `\n              <svg width=\"50\" height=\"32\" viewBox=\"0 0 50 32\" xmlns=\"http://www.w3.org/2000/svg\">\n                <polygon points=\"${points}\" fill=\"${arrowColor}\" stroke=\"#ffffff\" stroke-width=\"${arrowStrokeWidth * 0.4}\" opacity=\"0.92\" />\n              </svg>`;
          };
          const tradeArrowIcon = (dir: "east" | "west") =>
            (L as any).divIcon({
              className: "enso-trade-arrow",
              html: `<div style=\"pointer-events: none;\">${arrowSvg(dir)}</div>`,
              iconSize: [50, 32],
              iconAnchor: [25, 16],
            });
          // Three arrows along the equator. Use latitude 0 (centre line) so
          // they sit between the Niño-region rectangles and stay visible.
          const arrowDir: "east" | "west" = isElNino ? "east" : "west";
          const ARROWS: Array<[number, number]> = [
            [-12, 175],
            [-12, 215],
            [-12, 255],
          ];
          // Warm-pool centre marker: sits west under La Niña/Neutral, drifts
          // east under El Niño. Lat 13 keeps it clear of the (now taller)
          // Niño rectangles whose top edge is at lat 8.
          const warmPoolPos: [number, number] = isElNino ? [13, 230] : [13, 165];
          const warmPoolIcon = (L as any).divIcon({
            className: "enso-warm-pool",
            html: `<div style=\"\n              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;\n              font-size: 10px;\n              font-weight: 700;\n              letter-spacing: 0.05em;\n              text-transform: uppercase;\n              color: #b91c1c;\n              text-shadow: 0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff;\n              white-space: nowrap;\n              pointer-events: none;\n            \">\u2600 Warm pool</div>`,
            iconSize: [110, 14],
            iconAnchor: [55, 7],
          });

          return (
            <MapContainer
              bounds={[
                [-18, 150],
                [18, 290],
              ]}
              minZoom={1}
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
              className="h-[200px] md:h-[320px] w-full z-0"
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
                  />
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
              {ARROWS.map((pos, i) => (
                <Marker
                  key={`trade-arrow-${i}`}
                  position={pos}
                  icon={tradeArrowIcon(arrowDir)}
                  interactive={false}
                />
              ))}
              <Marker
                position={warmPoolPos}
                icon={warmPoolIcon}
                interactive={false}
              />
            </MapContainer>
          );
        }

        return Map;
      },
    ) as any,
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] md:h-[320px] w-full rounded-lg bg-gray-900/40 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
      </div>
    ),
  },
);

export default function EnsoRegionMap({ anoms, state }: { anoms: RegionAnoms; state: EnsoMapState }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/50">
      <EnsoRegionMapInner anoms={anoms} state={state} />
    </div>
  );
}
