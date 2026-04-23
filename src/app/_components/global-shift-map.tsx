"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { GeoJSON as LeafletGeoJSON, Layer } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

export type GlobalShiftRecord = {
  code?: string;
  slug?: string;
  id?: string;
  name: string;
  geojsonName?: string;
  baselineStart: number;
  baselineEnd: number;
  recentStart: number;
  recentEnd: number;
  baselineAnnualMean: number;
  baselineAmplitude?: number;
  weaklySeasonal?: boolean;
  baselineLen: number;
  recentLen: number;
  netShiftMonths: number | null;
  springShiftDays: number | null;
  autumnShiftDays: number | null;
  biggestMonth: string;
  biggestMonthWarming: number;
  yearsCoverage: number;
};

type GlobalShiftData = {
  generatedAt: string;
  globalStats: {
    totalAnalysed: number;
    countriesAnalysed: number;
    usStatesAnalysed: number;
    ukRegionsAnalysed: number;
    withSeasonalCrossings: number;
    earlierSprings: number;
    laterAutumns: number;
    longerWarmSeasons: number;
    meanSpringShift: number | null;
    meanAutumnShift: number | null;
    meanNetShiftMonths: number | null;
  };
  countries: GlobalShiftRecord[];
  usStates: GlobalShiftRecord[];
  ukRegions: GlobalShiftRecord[];
};

type MetricId = "spring" | "autumn" | "net";

const METRIC_META: Record<
  MetricId,
  {
    label: string;
    short: string;
    unit: string;
    domain: [number, number];
    leftLabel: string;
    rightLabel: string;
    accessor: (r: GlobalShiftRecord) => number | null;
    format: (v: number) => string;
  }
> = {
  spring: {
    label: "Spring arriving earlier",
    short: "Spring shift",
    unit: "days",
    domain: [-30, 30],
    leftLabel: "Earlier",
    rightLabel: "Later",
    accessor: (r) => r.springShiftDays,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} d`,
  },
  autumn: {
    label: "Autumn arriving later",
    short: "Autumn shift",
    unit: "days",
    domain: [-30, 30],
    leftLabel: "Earlier",
    rightLabel: "Later",
    accessor: (r) => r.autumnShiftDays,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} d`,
  },
  net: {
    label: "Warm-season length change",
    short: "Warm-season",
    unit: "months/yr",
    domain: [-1.5, 1.5],
    leftLabel: "Shorter",
    rightLabel: "Longer",
    accessor: (r) => r.netShiftMonths,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} mo`,
  },
};

/** Diverging red→grey→blue scale, clamped to [-1, 1]. */
function divergingColor(t: number, metric: MetricId): string {
  // Convention: for spring, negative (earlier) = red/warm; for autumn & net,
  // positive (later / longer) = red/warm. Invert the sign for spring so the
  // "warmer world" direction is always red.
  const signed = metric === "spring" ? -t : t;
  const clamped = Math.max(-1, Math.min(1, signed));
  // 7-stop diverging palette from cool (blue) to warm (red)
  //                       -1          -0.5         0            +0.5         +1
  const stops: [number, [number, number, number]][] = [
    [-1.0, [33, 102, 172]],   // deep blue
    [-0.5, [103, 169, 207]],  // mid blue
    [-0.15, [209, 229, 240]], // near-white blue
    [0.0, [245, 245, 245]],   // neutral grey
    [0.15, [253, 219, 199]],  // near-white red
    [0.5, [239, 138, 98]],    // mid red
    [1.0, [178, 24, 43]],     // deep red
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (clamped <= t1) {
      const f = (clamped - t0) / (t1 - t0);
      const r = Math.round(c0[0] + f * (c1[0] - c0[0]));
      const g = Math.round(c0[1] + f * (c1[1] - c0[1]));
      const b = Math.round(c0[2] + f * (c1[2] - c0[2]));
      return `rgb(${r},${g},${b})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1].join(",")})`;
}

export default function GlobalShiftMap() {
  const [world, setWorld] = useState<FeatureCollection | null>(null);
  const [shifts, setShifts] = useState<GlobalShiftData | null>(null);
  const [metric, setMetric] = useState<MetricId>("spring");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/world-countries.json").then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch("/data/seasons/shift-global.json").then((r) =>
        r.ok ? r.json() : Promise.reject(r),
      ),
    ])
      .then(([w, s]) => {
        if (cancelled) return;
        setWorld(w);
        setShifts(s);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load global shift data");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Map country geojson-name → shift record. */
  const byName = useMemo(() => {
    const m = new Map<string, GlobalShiftRecord>();
    if (!shifts) return m;
    for (const r of shifts.countries) {
      m.set(r.geojsonName || r.name, r);
    }
    return m;
  }, [shifts]);

  const meta = METRIC_META[metric];

  const styleForFeature = (feature?: Feature<Geometry, { name: string }>) => {
    if (!feature) return {};
    const rec = byName.get(feature.properties?.name || "");
    if (!rec) {
      return {
        color: "#4b5563",
        weight: 0.4,
        fillColor: "#1f2937",
        fillOpacity: 0.45,
      };
    }
    const v = meta.accessor(rec);
    if (v === null || Number.isNaN(v)) {
      return {
        color: "#4b5563",
        weight: 0.4,
        fillColor: "#1f2937",
        fillOpacity: 0.45,
      };
    }
    const t = v / Math.max(Math.abs(meta.domain[0]), Math.abs(meta.domain[1]));
    return {
      color: "#111827",
      weight: 0.4,
      fillColor: divergingColor(t, metric),
      fillOpacity: 0.85,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, { name: string }>, layer: Layer) => {
    const name = feature.properties?.name || "Unknown";
    const rec = byName.get(name);
    if (!rec) {
      layer.bindTooltip(`<strong>${name}</strong><br/><span style="color:#9ca3af">no long-term monthly data</span>`, {
        sticky: true,
        className: "global-shift-tooltip",
      });
      return;
    }
    const spring = rec.springShiftDays;
    const autumn = rec.autumnShiftDays;
    const net = rec.netShiftMonths;
    const springTxt = spring === null ? "—" : `${spring > 0 ? "+" : ""}${spring.toFixed(1)} d`;
    const autumnTxt = autumn === null ? "—" : `${autumn > 0 ? "+" : ""}${autumn.toFixed(1)} d`;
    const netTxt = net === null ? "—" : `${net > 0 ? "+" : ""}${net.toFixed(2)} mo/yr`;
    const aseasonalLine = rec.weaklySeasonal
      ? `<div style="color:#9ca3af;margin-top:3px;font-size:10px;font-style:italic">Weakly seasonal (${(rec.baselineAmplitude ?? 0).toFixed(1)}°C annual swing) — seasonal-crossing metrics are not meaningful here.</div>`
      : "";
    layer.bindTooltip(
      `
      <div style="font-size:12px;line-height:1.4">
        <div style="font-weight:600;color:#FFF5E7;margin-bottom:2px">${rec.name}</div>
        <div style="color:#d1d5db">Spring: <strong style="color:#FFF5E7">${springTxt}</strong></div>
        <div style="color:#d1d5db">Autumn: <strong style="color:#FFF5E7">${autumnTxt}</strong></div>
        <div style="color:#d1d5db">Warm season: <strong style="color:#FFF5E7">${netTxt}</strong></div>
        <div style="color:#9ca3af;margin-top:3px;font-size:10px">${rec.baselineStart}–${rec.baselineEnd} → ${rec.recentStart}–${rec.recentEnd}</div>
        ${aseasonalLine}
      </div>`,
      { sticky: true, className: "global-shift-tooltip" },
    );
  };

  if (error) {
    return (
      <div className="h-[460px] rounded-xl border border-gray-800/60 bg-gray-900/50 flex items-center justify-center text-sm text-gray-400">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-800/60">
        <div role="tablist" aria-label="Global shift metric" className="flex gap-2 flex-wrap">
          {(Object.keys(METRIC_META) as MetricId[]).map((id) => {
            const active = metric === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(id)}
                className={`inline-flex items-center rounded-full border px-3 h-8 text-[13px] font-medium transition-colors ${
                  active
                    ? "border-[#D0A65E] bg-[#D0A65E] text-[#1A0E00]"
                    : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-[#D0A65E]/45 hover:text-[#FFF5E7]"
                }`}
              >
                {METRIC_META[id].short}
              </button>
            );
          })}
        </div>
        {shifts && (
          <div className="ml-auto text-[11px] text-gray-400">
            {shifts.globalStats.countriesAnalysed} countries · baseline first 30 complete years vs recent 10
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-[500px] w-full relative z-0">
        {world && shifts && (
          <MapContainer
            center={[20, 10]}
            zoom={2}
            minZoom={2}
            maxZoom={5}
            scrollWheelZoom={false}
            worldCopyJump
            className="h-full w-full"
            style={{ background: "#0a0f1a" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            />
            <GeoJSON
              key={metric}
              data={world as FeatureCollection}
              style={styleForFeature as unknown as LeafletGeoJSON["options"]["style"]}
              onEachFeature={onEachFeature as never}
            />
          </MapContainer>
        )}
      </div>

      {/* Footer / legend */}
      <div className="p-3 border-t border-gray-800/60 text-xs text-gray-400 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-gray-200">{meta.label}</span>
          <span>
            Baseline annual mean temperature → month-count / crossing-date in recent decade vs first 30 years of record.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">{meta.leftLabel}</span>
          <div
            className="h-2 flex-1 max-w-sm rounded"
            style={{
              background:
                metric === "spring"
                  ? "linear-gradient(to right, #b2182b, #ef8a62, #fddbc7, #f5f5f5, #d1e5f0, #67a9cf, #2166ac)"
                  : "linear-gradient(to right, #2166ac, #67a9cf, #d1e5f0, #f5f5f5, #fddbc7, #ef8a62, #b2182b)",
            }}
          />
          <span className="text-[10px] uppercase tracking-wider text-gray-500">{meta.rightLabel}</span>
        </div>
        <div className="text-[11px] text-gray-500">
          Shaded countries have ≥ 30 years of complete monthly temperature data (Our World in Data / Berkeley Earth).
          Grey = insufficient data or tropical/polar regions with no clear seasonal crossing.
          Hover any country for its individual shift.
        </div>
      </div>
    </div>
  );
}
