"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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

const EnsoRegionMapInner = dynamic<{ anoms: RegionAnoms; state: EnsoMapState; isMobile: boolean }>(
  () =>
    Promise.all([import("react-leaflet"), import("leaflet")]).then(
      ([mod, L]) => {
        const {
          MapContainer,
          TileLayer,
          Rectangle,
          Marker,
          useMap,
        } = mod;

        // Refits the map when the breakpoint changes so we can use a
        // narrower bounds on mobile and a wider, more contextual view on
        // desktop without remounting the MapContainer. Also calls
        // invalidateSize so leaflet picks up any container size change after
        // the breakpoint flips.
        function BoundsController({ bounds }: { bounds: [[number, number], [number, number]] }) {
          const map = useMap();
          useEffect(() => {
            map.invalidateSize();
            map.fitBounds(bounds, { animate: false });
          }, [map, bounds]);
          return null;
        }

        function Map({ anoms, state, isMobile }: { anoms: RegionAnoms; state: EnsoMapState; isMobile: boolean }) {
          // Mobile: very tight focus on the equatorial Pacific so the four
          // Niño boxes dominate the view without colliding labels. We pull
          // the lat band right in (±8°) so the four rectangles fill the
          // narrow viewport vertically.
          // Desktop: wider extent so the surrounding continents are visible
          // for spatial context.
          const bounds: [[number, number], [number, number]] = isMobile
            ? [[-10, 155], [10, 285]]
            : [[-26, 120], [26, 305]];

          const labelW = isMobile ? 44 : 80;
          const labelH = isMobile ? 24 : 36;
          const labelFont = isMobile ? 8 : 12;
          const labelAnomFont = isMobile ? 7 : 11;

          const labelIcon = (label: string, anom: number) =>
            (L as any).divIcon({
              className: "enso-region-label",
              html: `<div style="
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                font-size: ${labelFont}px;
                font-weight: 700;
                color: #0f172a;
                text-shadow: 0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff;
                text-align: center;
                white-space: nowrap;
                pointer-events: none;
              ">
                ${label}
                <div style="
                  font-size: ${labelAnomFont}px;
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
              iconSize: [labelW, labelH],
              iconAnchor: [labelW / 2, labelH / 2],
            });

          const continentFont = isMobile ? 9 : 12;
          const continentIcon = (label: string) =>
            (L as any).divIcon({
              className: "enso-continent-label",
              html: `<div style="
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                font-size: ${continentFont}px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #475569;
                text-shadow: 0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0.85;
              ">${label}</div>`,
              iconSize: [120, 16],
              iconAnchor: [60, 8],
            });

          // Continent labels only on desktop — on mobile they crowd the
          // tight equatorial-Pacific view and overlap the Niño rectangles.
          const CONTINENTS: Array<{ label: string; pos: [number, number] }> = isMobile
            ? []
            : [
                { label: "Asia", pos: [22, 125] },
                { label: "Australia", pos: [-22, 140] },
                { label: "North America", pos: [22, 260] },
                { label: "South America", pos: [-15, 290] },
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
          const arrowSize: [number, number] = isMobile ? [22, 14] : [50, 32];
          const tradeArrowIcon = (dir: "east" | "west") =>
            (L as any).divIcon({
              className: "enso-trade-arrow",
              html: `<div style=\"pointer-events: none; width:${arrowSize[0]}px; height:${arrowSize[1]}px; display:flex; align-items:center; justify-content:center;\"><div style=\"transform: scale(${arrowSize[0] / 50}); transform-origin: center center;\">${arrowSvg(dir)}</div></div>`,
              iconSize: arrowSize,
              iconAnchor: [arrowSize[0] / 2, arrowSize[1] / 2],
            });
          // Three arrows along the equator. Use latitude 0 (centre line) so
          // they sit between the Niño-region rectangles and stay visible.
          const arrowDir: "east" | "west" = isElNino ? "east" : "west";
          const ARROWS: Array<[number, number]> = [
            [-12, 175],
            [-12, 215],
            [-12, 255],
          ];
          // Warm-pool centre marker: the Indo-Pacific Warm Pool sits in the
          // far west Pacific (~150°E). Under La Niña/Neutral the pool stays
          // pinned to the west; under El Niño warm water spreads east toward
          // the dateline. On mobile we tuck it inside the tighter bounds.
          const warmPoolPos: [number, number] = isMobile
            ? (isElNino ? [8, 200] : [8, 162])
            : (isElNino ? [11, 195] : [11, 152]);
          const warmPoolFont = isMobile ? 7 : 10;
          const warmPoolIcon = (L as any).divIcon({
            className: "enso-warm-pool",
            html: `<div style=\"\n              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;\n              font-size: ${warmPoolFont}px;\n              font-weight: 700;\n              letter-spacing: 0.05em;\n              text-transform: uppercase;\n              color: #b91c1c;\n              text-shadow: 0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff;\n              white-space: nowrap;\n              pointer-events: none;\n            \">\u2600 Warm pool</div>`,
            iconSize: [110, 14],
            iconAnchor: [55, 7],
          });

          return (
            <MapContainer
              bounds={bounds}
              minZoom={1}
              maxZoom={5}
              scrollWheelZoom={false}
              dragging={false}
              doubleClickZoom={false}
              zoomControl={false}
              attributionControl={false}
              maxBounds={[
                [-55, 80],
                [55, 330],
              ]}
              maxBoundsViscosity={1.0}
              className="h-[200px] md:h-[340px] w-full z-0"
              style={{ background: "#BEEEF9" }}
            >
              <BoundsController bounds={bounds} />
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
      <div className="h-[200px] md:h-[340px] w-full rounded-lg bg-gray-900/40 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
      </div>
    ),
  },
);

export default function EnsoRegionMap({ anoms, state }: { anoms: RegionAnoms; state: EnsoMapState }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/50">
      <EnsoRegionMapInner anoms={anoms} state={state} isMobile={isMobile} />
    </div>
  );
}
