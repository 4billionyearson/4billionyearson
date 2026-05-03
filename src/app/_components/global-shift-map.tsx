"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { useMap, useMapEvents } from "react-leaflet";
import type { GeoJSON as LeafletGeoJSON, Layer, LatLngExpression, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";
import InfoTooltip from "./info-tooltip";
import { ChipDropdown } from "@/app/_components/responsive-segmented-control";
import type {
  KoppenGroup,
  KoppenResult,
  SeasonalityKind,
  TempShift,
  RainShift,
} from "@/lib/climate/shift-analysis";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

/** Zoom thresholds at which subregional layers appear over their host country. */
const US_STATES_ZOOM = 4;
const UK_NATIONS_ZOOM = 5;

export type GlobalShiftRecord = {
  kind: "country" | "us-state" | "uk-region";
  code?: string;
  name: string;
  geojsonName?: string;
  hemisphere: "N" | "S";
  seasonality: SeasonalityKind;
  koppen: KoppenResult | null;
  windows: {
    baselineStart: number;
    baselineEnd: number;
    recentStart: number;
    recentEnd: number;
  };
  yearsCoverage: number;
  temp: TempShift;
  rain: RainShift | null;
};

type GlobalShiftData = {
  generatedAt: string;
  globalStats: {
    totalAnalysed: number;
    countriesAnalysed: number;
    usStatesAnalysed: number;
    ukRegionsAnalysed: number;
    seasonalityCounts: {
      warmCold: number;
      wetDry: number;
      mixed: number;
      aseasonal: number;
    };
    warmColdStats: {
      total: number;
      withCrossings: number;
      earlierSprings: number;
      laterAutumns: number;
      meanSpringShift: number | null;
      meanAutumnShift: number | null;
      meanNetShiftMonths: number | null;
      warmestMonthShifted: number;
    };
    wetDryStats: {
      total: number;
      withRainData: number;
      wetSeasonsShorter: number;
      wetSeasonsLonger: number;
      meanWetSeasonOnsetShiftDays: number | null;
      meanAnnualRainfallShiftPct: number | null;
    };
  };
  countries: GlobalShiftRecord[];
  usStates: GlobalShiftRecord[];
  ukRegions: GlobalShiftRecord[];
};

type MetricId = "spring" | "autumn" | "net" | "wet-onset" | "wet-peak" | "wet-length" | "annual-rain" | "koppen";

type MetricMeta = {
  label: string;
  short: string;
  group: "warm-cold" | "wet-dry" | "classification";
  unit: string;
  domain?: [number, number];
  leftLabel?: string;
  rightLabel?: string;
  accessor: (r: GlobalShiftRecord) => number | null;
  format: (v: number) => string;
  /** If returns a color string, bypasses the diverging scale (used for Köppen). */
  customColor?: (r: GlobalShiftRecord) => string | null;
  invertForWarmer?: boolean;
};

const KIND_COLOR: Record<SeasonalityKind, string> = {
  "warm-cold": "#f97316",
  "wet-dry": "#38bdf8",
  mixed: "#10b981",
  aseasonal: "#6b7280",
};

// Standard-ish Köppen map palette (close to the Peel 2007 Wikipedia colours).
const KOPPEN_COLOR: Record<KoppenGroup, string> = {
  A: "#1b7837", // tropical - deep green
  B: "#e6a23c", // arid - sand/amber
  C: "#7fbc41", // temperate - olive-green
  D: "#6a5acd", // continental - indigo
  E: "#b0bec5", // polar - pale blue-grey
};

const KOPPEN_GROUP_LABEL: Record<KoppenGroup, string> = {
  A: "Tropical",
  B: "Arid",
  C: "Temperate",
  D: "Continental",
  E: "Polar",
};

const METRIC_META: Record<MetricId, MetricMeta> = {
  spring: {
    label: "Spring arriving earlier",
    short: "Spring Shift",
    group: "warm-cold",
    unit: "days",
    domain: [-30, 30],
    leftLabel: "Earlier",
    rightLabel: "Later",
    accessor: (r) => r.temp.springShiftDays,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} d`,
    invertForWarmer: true,
  },
  autumn: {
    label: "Autumn arriving later",
    short: "Autumn Shift",
    group: "warm-cold",
    unit: "days",
    domain: [-30, 30],
    leftLabel: "Earlier",
    rightLabel: "Later",
    accessor: (r) => r.temp.autumnShiftDays,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} d`,
  },
  net: {
    label: "Warm-season length change",
    short: "Warm-Season",
    group: "warm-cold",
    unit: "months/yr",
    domain: [-1.5, 1.5],
    leftLabel: "Shorter",
    rightLabel: "Longer",
    accessor: (r) => r.temp.netShiftMonths,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} mo`,
  },
  "wet-onset": {
    label: "Wet-season onset shift",
    short: "Wet Onset",
    group: "wet-dry",
    unit: "days",
    domain: [-30, 30],
    leftLabel: "Earlier",
    rightLabel: "Later",
    accessor: (r) =>
      r.seasonality === "wet-dry" || r.seasonality === "mixed"
        ? r.rain?.wetSeasonOnsetShiftDays ?? null
        : null,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} d`,
  },
  "wet-peak": {
    label: "Peak-rain month shift",
    short: "Peak-Rain",
    group: "wet-dry",
    unit: "months",
    domain: [-3, 3],
    leftLabel: "Earlier",
    rightLabel: "Later",
    accessor: (r) =>
      r.seasonality === "wet-dry" || r.seasonality === "mixed"
        ? r.rain?.peakRainMonthShiftIndex ?? null
        : null,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)} mo`,
  },
  "wet-length": {
    label: "Wet-season length change",
    short: "Wet Length",
    group: "wet-dry",
    unit: "months",
    domain: [-3, 3],
    leftLabel: "Shorter",
    rightLabel: "Longer",
    accessor: (r) =>
      r.seasonality === "wet-dry" || r.seasonality === "mixed"
        ? r.rain?.wetSeasonShiftMonths ?? null
        : null,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)} mo`,
  },
  "annual-rain": {
    label: "Annual rainfall change",
    short: "Annual Rain",
    group: "wet-dry",
    unit: "%",
    domain: [-25, 25],
    leftLabel: "Drier",
    rightLabel: "Wetter",
    accessor: (r) => r.rain?.annualTotalShiftPct ?? null,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  koppen: {
    label: "Köppen–Geiger climate class",
    short: "Köppen",
    group: "classification",
    unit: "",
    accessor: () => 1,
    format: () => "",
    customColor: (r) => (r.koppen ? KOPPEN_COLOR[r.koppen.group] : null),
  },
};

/** Diverging red→grey→blue scale, clamped to [-1, 1]. */
function divergingColor(t: number, invert: boolean): string {
  const signed = invert ? -t : t;
  const clamped = Math.max(-1, Math.min(1, signed));
  const stops: [number, [number, number, number]][] = [
    [-1.0, [33, 102, 172]],
    [-0.5, [103, 169, 207]],
    [-0.15, [209, 229, 240]],
    [0.0, [245, 245, 245]],
    [0.15, [253, 219, 199]],
    [0.5, [239, 138, 98]],
    [1.0, [178, 24, 43]],
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

/**
 * Our climate analysis covers METROPOLITAN France / European Netherlands only,
 * but the default world geojson bundles overseas territories into the same
 * feature. That causes French Guiana (equatorial) and the Dutch Caribbean
 * islands to be coloured with the European country's classification, which is
 * misleading. We strip those polygons at load time using metropolitan bboxes.
 */
const METROPOLITAN_BBOX: Record<
  string,
  { lonMin: number; lonMax: number; latMin: number; latMax: number }
> = {
  France: { lonMin: -5.5, lonMax: 10, latMin: 41, latMax: 52 },
  Netherlands: { lonMin: 3, lonMax: 7.5, latMin: 50, latMax: 54 },
};

function polygonInBbox(
  poly: number[][][],
  bb: { lonMin: number; lonMax: number; latMin: number; latMax: number },
): boolean {
  for (const ring of poly) {
    for (const [lon, lat] of ring) {
      if (lon >= bb.lonMin && lon <= bb.lonMax && lat >= bb.latMin && lat <= bb.latMax) {
        return true;
      }
    }
  }
  return false;
}

function stripOverseasTerritories(fc: FeatureCollection): FeatureCollection {
  const features = fc.features.map((f) => {
    const name = (f.properties as { name?: string } | null)?.name ?? "";
    const bb = METROPOLITAN_BBOX[name];
    if (!bb) return f;
    const g = f.geometry;
    if (g.type !== "MultiPolygon") return f;
    const kept = g.coordinates.filter((poly) => polygonInBbox(poly, bb));
    if (kept.length === g.coordinates.length) return f;
    return {
      ...f,
      geometry: { type: "MultiPolygon" as const, coordinates: kept },
    };
  });
  return { ...fc, features };
}

/* ─── Zoom-aware place labels ────────────────────────────────────────── */

const LABEL_OVERRIDES: Record<string, [number, number]> = {
  "United States of America": [40, -98],
  Canada: [56, -96],
  Russia: [62, 95],
  France: [47, 2.5],
  Norway: [65, 13],
  Indonesia: [-2, 118],
  Malaysia: [4, 109],
  Chile: [-35, -71],
  "New Zealand": [-42, 174],
  Japan: [36, 138],
  Antarctica: [-82, 0],
};

const CONTINENT_LABELS: { name: string; pos: [number, number] }[] = [
  { name: "North America", pos: [45, -100] },
  { name: "South America", pos: [-15, -58] },
  { name: "Europe", pos: [52, 15] },
  { name: "Africa", pos: [5, 20] },
  { name: "Asia", pos: [42, 85] },
  { name: "Oceania", pos: [-25, 135] },
];

const MAJOR_COUNTRIES = new Set([
  "United States of America", "Canada", "Mexico", "Brazil", "Argentina",
  "Russia", "China", "India", "Japan", "Australia",
  "Indonesia", "Saudi Arabia", "Iran", "Kazakhstan",
  "United Kingdom", "France", "Germany", "Spain", "Italy",
  "Turkey", "Ukraine", "Poland", "Sweden", "Norway", "Finland",
  "Egypt", "South Africa", "Nigeria", "Algeria", "Libya",
  "Dem. Rep. Congo", "Sudan", "Ethiopia", "Kenya",
  "Mongolia", "Pakistan", "Thailand",
  "Greenland", "Iceland", "New Zealand",
]);

const LABEL_DISPLAY_NAME: Record<string, string> = {
  "United States of America": "United States",
  "Dem. Rep. Congo": "DR Congo",
  "Dominican Rep.": "Dominican Rep.",
  "Central African Rep.": "Central African Rep.",
  "S. Sudan": "South Sudan",
  "Bosnia and Herz.": "Bosnia & Herz.",
  "Czech Rep.": "Czechia",
  "W. Sahara": "Western Sahara",
  "Eq. Guinea": "Equatorial Guinea",
};

function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return a / 2;
}
function ringCentroid(ring: number[][]): [number, number] {
  let x = 0, y = 0;
  for (const c of ring) { x += c[0]; y += c[1]; }
  return [y / ring.length, x / ring.length];
}
function featureCentroid(feature: Feature): [number, number] | null {
  const g = feature.geometry as unknown as { type: string; coordinates: unknown };
  if (!g) return null;
  if (g.type === "Polygon") return ringCentroid((g.coordinates as number[][][])[0]);
  if (g.type === "MultiPolygon") {
    let best: number[][] = [];
    let bestArea = 0;
    for (const poly of g.coordinates as number[][][][]) {
      const ring = poly[0];
      const a = Math.abs(ringArea(ring));
      if (a > bestArea) { bestArea = a; best = ring; }
    }
    return best.length ? ringCentroid(best) : null;
  }
  return null;
}

type LeafletMod = typeof import("leaflet");

function MapLabels({
  world,
  statesGeo,
  ukGeo,
}: {
  world: FeatureCollection | null;
  statesGeo: FeatureCollection | null;
  ukGeo: FeatureCollection | null;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [L, setL] = useState<LeafletMod | null>(null);

  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (!cancelled) setL((mod.default ?? mod) as LeafletMod);
    });
    if (!map.getPane("labels")) {
      const pane = map.createPane("labels");
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
    }
    const tp = map.getPane("tooltipPane");
    if (tp) tp.style.zIndex = "700";
    return () => {
      cancelled = true;
    };
  }, [map]);

  const countryLabels = useMemo(() => {
    if (!world) return [] as { name: string; pos: [number, number] }[];
    const out: { name: string; pos: [number, number] }[] = [];
    for (const f of world.features) {
      const name = (f.properties as { name?: string } | null)?.name;
      if (!name) continue;
      const pos = LABEL_OVERRIDES[name] ?? featureCentroid(f);
      if (pos) out.push({ name, pos });
    }
    return out;
  }, [world]);

  const stateLabels = useMemo(() => {
    if (!statesGeo) return [] as { name: string; pos: [number, number] }[];
    const out: { name: string; pos: [number, number] }[] = [];
    for (const f of statesGeo.features) {
      const name = (f.properties as { name?: string } | null)?.name;
      if (!name) continue;
      const pos = featureCentroid(f);
      if (pos) out.push({ name, pos });
    }
    return out;
  }, [statesGeo]);

  const ukLabels = useMemo(() => {
    if (!ukGeo) return [] as { name: string; pos: [number, number] }[];
    const out: { name: string; pos: [number, number] }[] = [];
    for (const f of ukGeo.features) {
      const name = (f.properties as { name?: string } | null)?.name;
      if (!name) continue;
      const pos = featureCentroid(f);
      if (pos) out.push({ name, pos });
    }
    return out;
  }, [ukGeo]);

  if (!L) return null;

  const visibleCountry =
    zoom <= 2
      ? CONTINENT_LABELS
      : zoom <= 3
        ? countryLabels.filter(({ name }) => MAJOR_COUNTRIES.has(name))
        : countryLabels;

  const countryFont = zoom <= 2 ? 13 : 10;
  const countryCls = zoom <= 2 ? "continent-label" : "country-label";

  const showStates = zoom >= US_STATES_ZOOM;
  const showUk = zoom >= UK_NATIONS_ZOOM;

  return (
    <>
      {visibleCountry.map(({ name, pos }) => {
        const display = LABEL_DISPLAY_NAME[name] ?? name;
        // Hide the country label for US / UK when their sub-region labels take over
        if (showStates && name === "United States of America") return null;
        if (showUk && name === "United Kingdom") return null;
        return (
          <Marker
            key={`c-${name}`}
            position={pos}
            pane="labels"
            interactive={false}
            icon={L.divIcon({
              className: countryCls,
              html: `<span style="font-size:${countryFont}px">${display}</span>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        );
      })}
      {showStates &&
        stateLabels.map(({ name, pos }) => (
          <Marker
            key={`s-${name}`}
            position={pos}
            pane="labels"
            interactive={false}
            icon={L.divIcon({
              className: "country-label",
              html: `<span style="font-size:9px;opacity:0.85">${name}</span>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        ))}
      {showUk &&
        ukLabels.map(({ name, pos }) => (
          <Marker
            key={`u-${name}`}
            position={pos}
            pane="labels"
            interactive={false}
            icon={L.divIcon({
              className: "country-label",
              html: `<span style="font-size:9px;opacity:0.9">${name}</span>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        ))}
    </>
  );
}

/**
 * Subregional overlay for US states. Visible only when the map is zoomed to
 * `US_STATES_ZOOM` or closer; below that threshold the country polygon from
 * the world layer does the work.
 */
function USStatesOverlay({
  statesGeo,
  byName,
  styleForRecord,
  bindRecordHover,
}: {
  statesGeo: FeatureCollection | null;
  byName: Map<string, GlobalShiftRecord>;
  styleForRecord: (rec: GlobalShiftRecord | undefined, subregion?: boolean) => PathOptions;
  bindRecordHover: (rec: GlobalShiftRecord | null, fallbackName: string, layer: Layer) => void;
}) {
  const map = useMap();
  const [visible, setVisible] = useState(map.getZoom() >= US_STATES_ZOOM);
  useMapEvents({ zoomend: () => setVisible(map.getZoom() >= US_STATES_ZOOM) });

  const style = useCallback(
    (feature?: Feature<Geometry, { name: string }>): PathOptions => {
      const name = feature?.properties?.name ?? "";
      return styleForRecord(byName.get(name.toLowerCase()), true);
    },
    [byName, styleForRecord],
  );

  const onEach = useCallback(
    (feature: Feature<Geometry, { name: string }>, layer: Layer) => {
      const name = feature.properties?.name ?? "";
      const rec = byName.get(name.toLowerCase());
      bindRecordHover(rec ?? null, name, layer);
    },
    [byName, bindRecordHover],
  );

  if (!visible || !statesGeo) return null;
  return (
    <GeoJSON
      data={statesGeo}
      style={style as unknown as LeafletGeoJSON["options"]["style"]}
      onEachFeature={onEach as never}
    />
  );
}

/** Subregional overlay for the four UK nations. Visible at `UK_NATIONS_ZOOM` or closer. */
function UKNationsOverlay({
  ukGeo,
  bySlug,
  styleForRecord,
  bindRecordHover,
}: {
  ukGeo: FeatureCollection | null;
  bySlug: Map<string, GlobalShiftRecord>;
  styleForRecord: (rec: GlobalShiftRecord | undefined, subregion?: boolean) => PathOptions;
  bindRecordHover: (rec: GlobalShiftRecord | null, fallbackName: string, layer: Layer) => void;
}) {
  const map = useMap();
  const [visible, setVisible] = useState(map.getZoom() >= UK_NATIONS_ZOOM);
  useMapEvents({ zoomend: () => setVisible(map.getZoom() >= UK_NATIONS_ZOOM) });

  const style = useCallback(
    (feature?: Feature<Geometry, { slug?: string; name?: string }>): PathOptions => {
      const slug = feature?.properties?.slug ?? "";
      return styleForRecord(bySlug.get(slug), true);
    },
    [bySlug, styleForRecord],
  );

  const onEach = useCallback(
    (feature: Feature<Geometry, { slug?: string; name?: string }>, layer: Layer) => {
      const slug = feature.properties?.slug ?? "";
      const name = feature.properties?.name ?? slug;
      const rec = bySlug.get(slug);
      bindRecordHover(rec ?? null, name, layer);
    },
    [bySlug, bindRecordHover],
  );

  if (!visible || !ukGeo) return null;
  return (
    <GeoJSON
      data={ukGeo}
      style={style as unknown as LeafletGeoJSON["options"]["style"]}
      onEachFeature={onEach as never}
    />
  );
}

export default function GlobalShiftMap() {
  const [world, setWorld] = useState<FeatureCollection | null>(null);
  const [statesGeo, setStatesGeo] = useState<FeatureCollection | null>(null);
  const [ukGeo, setUkGeo] = useState<FeatureCollection | null>(null);
  const [shifts, setShifts] = useState<GlobalShiftData | null>(null);
  const [metric, setMetric] = useState<MetricId>("koppen");
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
        setWorld(stripOverseasTerritories(w as FeatureCollection));
        setShifts(s);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load global shift data");
      });
    // Subregional layers load in parallel and independently - failures here
    // don't disable the main map.
    fetch("/data/us-states.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => {
        if (!cancelled && g) setStatesGeo(g as FeatureCollection);
      })
      .catch(() => {});
    fetch("/data/uk-nations.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => {
        if (!cancelled && g) setUkGeo(g as FeatureCollection);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const byName = useMemo(() => {
    const m = new Map<string, GlobalShiftRecord>();
    if (!shifts) return m;
    for (const r of shifts.countries) {
      m.set(r.geojsonName || r.name, r);
    }
    return m;
  }, [shifts]);

  /** US state name (lowercased) → record. */
  const usStatesByName = useMemo(() => {
    const m = new Map<string, GlobalShiftRecord>();
    if (!shifts) return m;
    for (const r of shifts.usStates) {
      m.set(r.name.toLowerCase(), r);
    }
    return m;
  }, [shifts]);

  /** UK nation slug → record. Only the four primary nations get their own polygons. */
  const ukNationsBySlug = useMemo(() => {
    const m = new Map<string, GlobalShiftRecord>();
    if (!shifts) return m;
    const nationNames: Record<string, string> = {
      england: "England",
      scotland: "Scotland",
      wales: "Wales",
      "northern-ireland": "Northern Ireland",
    };
    for (const r of shifts.ukRegions) {
      for (const [slug, name] of Object.entries(nationNames)) {
        if (r.name === name) m.set(slug, r);
      }
    }
    return m;
  }, [shifts]);

  const meta = METRIC_META[metric];

  /** Compute a leaflet path style for any record (country, US state, UK nation). */
  const styleForRecord = useCallback(
    (rec: GlobalShiftRecord | undefined, subregion = false): PathOptions => {
      const baseWeight = subregion ? 0.6 : 0.4;
      const none: PathOptions = {
        color: subregion ? "#0b1220" : "#4b5563",
        weight: baseWeight,
        fillColor: "#1f2937",
        fillOpacity: 0.45,
      };
      if (!rec) return none;
      if (meta.customColor) {
        const c = meta.customColor(rec);
        if (!c) return none;
        return { color: "#111827", weight: baseWeight, fillColor: c, fillOpacity: 0.75 };
      }
      const v = meta.accessor(rec);
      if (v === null || Number.isNaN(v)) return none;
      const dom = meta.domain ?? [-1, 1];
      const t = v / Math.max(Math.abs(dom[0]), Math.abs(dom[1]));
      return {
        color: "#111827",
        weight: baseWeight,
        fillColor: divergingColor(t, !!meta.invertForWarmer),
        fillOpacity: 0.85,
      };
    },
    [meta],
  );

  /** Hover info shown in a horizontal panel under the map. */
  type Hovered = {
    name: string;
    rec: GlobalShiftRecord | null;
  };
  const [hovered, setHovered] = useState<Hovered | null>(null);

  /** Bind hover/click/touch handlers that drive the bottom info panel. */
  const bindRecordHover = useCallback(
    (rec: GlobalShiftRecord | null, fallbackName: string, layer: Layer) => {
      const show = () => setHovered({ name: rec?.name ?? fallbackName, rec });
      const hide = () => setHovered(null);
      // `as unknown as { on: ... }` because Layer's typed event names don't
      // include "click"/"mouseover" but the leaflet runtime supports them.
      (layer as unknown as { on: (ev: string, fn: () => void) => void }).on("mouseover", show);
      (layer as unknown as { on: (ev: string, fn: () => void) => void }).on("click", show);
      (layer as unknown as { on: (ev: string, fn: () => void) => void }).on("mouseout", hide);
    },
    [],
  );

  const styleForFeature = (feature?: Feature<Geometry, { name: string }>) => {
    if (!feature) return {};
    return styleForRecord(byName.get(feature.properties?.name || ""));
  };

  const onEachFeature = (feature: Feature<Geometry, { name: string }>, layer: Layer) => {
    const name = feature.properties?.name || "Unknown";
    const rec = byName.get(name) ?? null;
    bindRecordHover(rec, name, layer);
  };

  if (error) {
    return (
      <div className="h-[460px] rounded-xl border border-gray-800/60 bg-gray-900/50 flex items-center justify-center text-sm text-gray-400">
        {error}
      </div>
    );
  }

  // Tropic lines: straight latitude lines across the world
  const tropicCancer: LatLngExpression[] = [[23.4368, -180], [23.4368, 180]];
  const equator: LatLngExpression[] = [[0, -180], [0, 180]];
  const tropicCapricorn: LatLngExpression[] = [[-23.4368, -180], [-23.4368, 180]];

  const metricOptions = (Object.keys(METRIC_META) as MetricId[]).map((id) => ({
    key: id,
    label: METRIC_META[id].short,
  }));

  return (
    <div className="global-shift-map relative rounded-xl border border-gray-800/60 bg-gray-900/50">
      {/* Controls */}
      <div className="p-3 border-b border-gray-800/60 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ChipDropdown
            label="Metric"
            ariaLabel="Map metric"
            value={metric}
            onChange={(id) => setMetric(id as MetricId)}
            options={metricOptions}
          />
        </div>

      </div>

      {/* Map */}
      <div className="h-[500px] w-full relative z-0 overflow-hidden rounded-b-xl">
        {world && shifts && (
          <MapContainer
            center={[20, 10]}
            zoom={2}
            minZoom={2}
            maxZoom={7}
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
            {/* Subregional overlays - visible only when zoomed in. */}
            <USStatesOverlay
              key={`us-${metric}`}
              statesGeo={statesGeo}
              byName={usStatesByName}
              styleForRecord={styleForRecord}
              bindRecordHover={bindRecordHover}
            />
            <UKNationsOverlay
              key={`uk-${metric}`}
              ukGeo={ukGeo}
              bySlug={ukNationsBySlug}
              styleForRecord={styleForRecord}
              bindRecordHover={bindRecordHover}
            />
            {/* Tropic reference lines */}
            <Polyline
              positions={tropicCancer}
              pathOptions={{ color: "#D0A65E", weight: 1, opacity: 0.45, dashArray: "4 6" }}
            />
            <Polyline
              positions={equator}
              pathOptions={{ color: "#D0A65E", weight: 1.2, opacity: 0.6, dashArray: "2 4" }}
            />
            <Polyline
              positions={tropicCapricorn}
              pathOptions={{ color: "#D0A65E", weight: 1, opacity: 0.45, dashArray: "4 6" }}
            />
            <MapLabels world={world} statesGeo={statesGeo} ukGeo={ukGeo} />
          </MapContainer>
        )}

        {/* Hover info panel pinned to the bottom of the map (replaces popups). */}
        {hovered && (
          <HoverInfoPanel hovered={hovered} />
        )}
      </div>

      {/* Footer / legend */}
      <div className="p-3 border-t border-gray-800/60 text-xs text-gray-400 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-gray-200">{meta.label}</span>
        </div>
        {meta.group !== "classification" ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                {meta.leftLabel}
              </span>
              <div
                className="h-2 flex-1 max-w-sm rounded"
                style={{
                  background: meta.invertForWarmer
                    ? "linear-gradient(to right, #b2182b, #ef8a62, #fddbc7, #f5f5f5, #d1e5f0, #67a9cf, #2166ac)"
                    : "linear-gradient(to right, #2166ac, #67a9cf, #d1e5f0, #f5f5f5, #fddbc7, #ef8a62, #b2182b)",
                }}
              />
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                {meta.rightLabel}
              </span>
            </div>
            <div className="text-[11px] text-gray-500">
              Gold dashed lines mark the Tropic of Cancer (23.4°N), Equator, and Tropic of Capricorn
              (23.4°S). Between the tropics, wet/dry seasonality usually dominates. Outside them,
              warm/cold seasonality dominates. Grey = insufficient data or metric doesn&apos;t apply
              to this region&apos;s seasonality type. Hover any country for its individual shift.
            </div>
          </>
        ) : (
          <>
            {metric === "koppen" ? (
              <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap">
                {(["A", "B", "C", "D", "E"] as KoppenGroup[]).map((g) => (
                  <span key={g} className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block w-3 h-3 rounded"
                      style={{ backgroundColor: KOPPEN_COLOR[g] }}
                    />
                    <span className="text-[11px]">
                      <strong className="text-gray-200">{g}</strong> · {KOPPEN_GROUP_LABEL[g]}
                    </span>
                  </span>
                ))}
                <InfoTooltip
                  title="Köppen–Geiger climate classes"
                  body={
                    <>
                      The standard climate grouping used in atlases and peer-reviewed
                      science (Peel, Finlayson &amp; McMahon 2007). Hover any country
                      for its full code, e.g. Cfb (oceanic temperate), Aw (tropical
                      savanna), BWh (hot desert).
                    </>
                  }
                >
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200">
                    <Info className="h-3.5 w-3.5" />
                    <span>About</span>
                  </span>
                </InfoTooltip>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 flex-wrap">
                  {(["warm-cold", "mixed", "wet-dry", "aseasonal"] as SeasonalityKind[]).map((k) => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block w-3 h-3 rounded"
                        style={{ backgroundColor: KIND_COLOR[k] }}
                      />
                      <span className="text-[11px]">
                        {k === "warm-cold"
                          ? "Warm/cold"
                          : k === "wet-dry"
                          ? "Wet/dry"
                          : k === "mixed"
                          ? "Both (mixed)"
                          : "Weakly seasonal"}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-gray-500">
                  Each country coloured by the dominant annual-cycle type. Hover to see its
                  individual numbers.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Bottom info panel rendered over the map on hover/tap. Mirrors the pattern
 * used on the global anomaly map – avoids leaflet popups going off-screen on
 * mobile.
 */
function HoverInfoPanel({
  hovered,
}: {
  hovered: { name: string; rec: GlobalShiftRecord | null };
}) {
  const { name, rec } = hovered;
  const fmtDays = (v: number | null) =>
    v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)} d`;
  const fmtMonths = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)} mo/yr`;
  const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/60 px-3 py-2 text-sm pointer-events-none">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-bold text-gray-100">{name}</span>
        {rec?.koppen && (
          <span
            className="text-[10px] uppercase tracking-wider font-mono"
            style={{ color: KOPPEN_COLOR[rec.koppen.group] }}
          >
            Köppen {rec.koppen.code} · {rec.koppen.label}
          </span>
        )}
        {rec ? (
          <>
            <span className="text-gray-300">
              <span className="text-gray-500">Spring</span>{" "}
              <span className="font-mono text-gray-100">{fmtDays(rec.temp.springShiftDays)}</span>
            </span>
            <span className="text-gray-300">
              <span className="text-gray-500">Autumn</span>{" "}
              <span className="font-mono text-gray-100">{fmtDays(rec.temp.autumnShiftDays)}</span>
            </span>
            <span className="text-gray-300">
              <span className="text-gray-500">Warm season</span>{" "}
              <span className="font-mono text-gray-100">{fmtMonths(rec.temp.netShiftMonths)}</span>
            </span>
            {rec.rain && (rec.seasonality === "wet-dry" || rec.seasonality === "mixed") && (
              <>
                <span className="text-gray-300">
                  <span className="text-gray-500">Wet onset</span>{" "}
                  <span className="font-mono text-gray-100">
                    {rec.rain.wetSeasonOnsetShiftDays !== null
                      ? `${rec.rain.wetSeasonOnsetShiftDays > 0 ? "+" : ""}${rec.rain.wetSeasonOnsetShiftDays.toFixed(0)} d`
                      : "—"}
                  </span>
                </span>
                <span className="text-gray-300">
                  <span className="text-gray-500">Annual rain</span>{" "}
                  <span className="font-mono text-gray-100">
                    {fmtPct(rec.rain.annualTotalShiftPct)}
                  </span>
                </span>
              </>
            )}
            <span className="text-gray-500 text-xs ml-auto font-mono">
              {rec.windows.baselineStart}–{rec.windows.baselineEnd} → {rec.windows.recentStart}–
              {rec.windows.recentEnd}
            </span>
          </>
        ) : (
          <span className="text-gray-400 italic">no long-term monthly data on this site</span>
        )}
      </div>
    </div>
  );
}
