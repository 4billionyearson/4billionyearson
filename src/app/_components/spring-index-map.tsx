"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { ChipDropdown } from "@/app/_components/responsive-segmented-control";

// Dynamic imports so Leaflet never loads on the server.
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const WMSTileLayer = dynamic(() => import("react-leaflet").then((m) => m.WMSTileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

type LayerId = "leaf_anomaly" | "bloom_anomaly";

const LAYER_META: Record<LayerId, { title: string; short: string; desc: string }> = {
  leaf_anomaly: {
    title: "Spring Leaf-Out anomaly",
    short: "Leaf-out",
    desc: "Days earlier (red) or later (blue) than the 1991–2020 average for this date.",
  },
  bloom_anomaly: {
    title: "Spring Bloom anomaly",
    short: "Bloom",
    desc: "Days earlier (red) or later (blue) than the 1991–2020 average - first flowering stage.",
  },
};

/**
 * Maps the USA-NPN daily Spring Index Leaf/Bloom anomaly rasters as a WMS
 * layer over a dark basemap, with US state outlines on top.
 *
 * Data source: USA-NPN / U.S. Geological Survey - refreshed daily during the
 * spring season. https://www.usanpn.org/data/maps
 */
export default function SpringIndexMap() {
  const [date, setDate] = useState<string>("");
  const [layerId, setLayerId] = useState<LayerId>("leaf_anomaly");
  const [states, setStates] = useState<GeoJSON.FeatureCollection | null>(null);

  // Default to yesterday (UTC) - NPN publishes the previous day's anomaly.
  useEffect(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    setDate(d.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/us-states.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setStates(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Pick a sensible default date during or just after spring; if a user picks
  // something outside the NPN window the layer simply shows "no data".
  const params = useMemo(
    () => ({
      layers: layerId,
      format: "image/png",
      transparent: true,
      time: date ? `${date}T07:00:00.000Z` : undefined,
    }),
    [layerId, date],
  );

  const meta = LAYER_META[layerId];

  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-800/60">
        <ChipDropdown
          label="Layer"
          ariaLabel="USA-NPN layer"
          value={layerId}
          onChange={(id) => setLayerId(id as LayerId)}
          options={(Object.keys(LAYER_META) as LayerId[]).map((id) => ({
            key: id,
            label: LAYER_META[id].title,
          }))}
        />
        <div className="ml-auto flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider text-gray-400">Date</label>
          <input
            type="date"
            value={date}
            min="2016-01-01"
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-700/50 bg-gray-800/60 px-2 py-1 text-sm text-gray-200 focus:border-[#D0A65E]/55 focus:outline-none"
          />
        </div>
      </div>

      {/* Map */}
      <div className="h-[460px] w-full relative z-0">
        {date && (
          <MapContainer
            center={[39.5, -98]}
            zoom={4}
            minZoom={3}
            maxZoom={7}
            scrollWheelZoom={false}
            className="h-full w-full"
            style={{ background: "#0a0f1a" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {/* USA-NPN WMS anomaly layer (only re-mounts when date/layer changes) */}
            <WMSTileLayer
              key={`${layerId}-${date}`}
              url="https://geoserver.usanpn.org/geoserver/si-x/wms"
              params={params as never}
              opacity={0.75}
            />
            {states && (
              <GeoJSON
                data={states as never}
                style={() => ({
                  color: "#D0A65E",
                  weight: 0.6,
                  opacity: 0.55,
                  fillOpacity: 0,
                })}
              />
            )}
          </MapContainer>
        )}
      </div>

      {/* Footer / legend */}
      <div className="p-3 border-t border-gray-800/60 text-xs text-gray-400 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-gray-200">{meta.title}</span>
          <span>{meta.desc}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Earlier</span>
          <div className="h-2 flex-1 max-w-xs rounded" style={{ background: "linear-gradient(to right, #67001f, #d73027, #fdae61, #fee090, #ffffff, #abd9e9, #74add1, #4575b4, #313695)" }} />
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Later</span>
        </div>
        <div className="text-[11px] text-gray-500">
          Data refreshes daily from{" "}
          <a
            href="https://www.usanpn.org/data/maps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D0A65E] hover:underline"
          >
            USA National Phenology Network
          </a>
          . Outside of spring the map will show the most recent available day.
        </div>
      </div>
    </div>
  );
}
