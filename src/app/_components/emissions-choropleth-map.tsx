"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { GeoJSON, useMap, useMapEvents, Marker } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import L from "leaflet";
import { WorldMapShell } from "./world-map-shell";
import "leaflet/dist/leaflet.css";
import { ChipDropdown } from "@/app/_components/responsive-segmented-control";

/* ─── Geometry helpers ──────────────────────────────────────────────────── */

function featureCentroid(feature: Feature): [number, number] | null {
  const geom = feature.geometry;
  if (geom.type === "Polygon") return ringCentroid((geom as any).coordinates[0]);
  if (geom.type === "MultiPolygon") {
    let best: number[][] = [];
    let bestArea = 0;
    for (const poly of (geom as any).coordinates as number[][][][]) {
      const ring = poly[0];
      const a = Math.abs(ringArea(ring));
      if (a > bestArea) { bestArea = a; best = ring; }
    }
    return best.length ? ringCentroid(best) : null;
  }
  return null;
}
function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return a / 2;
}
function ringCentroid(ring: number[][]): [number, number] {
  let x = 0, y = 0;
  for (const c of ring) { x += c[0]; y += c[1]; }
  return [y / ring.length, x / ring.length];
}

/* ─── Label overrides & config ──────────────────────────────────────────── */

const LABEL_OVERRIDES: Record<string, [number, number]> = {
  "United States of America": [40, -98], Canada: [56, -96], Russia: [62, 95],
  France: [47, 2.5], Norway: [65, 13], Indonesia: [-2, 118], Malaysia: [4, 109],
  Chile: [-35, -71], "New Zealand": [-42, 174], Japan: [36, 138], Antarctica: [-82, 0],
};

const CONTINENT_LABELS: { name: string; pos: [number, number] }[] = [
  { name: "North America", pos: [45, -100] }, { name: "South America", pos: [-15, -58] },
  { name: "Europe", pos: [52, 15] }, { name: "Africa", pos: [5, 20] },
  { name: "Asia", pos: [42, 85] }, { name: "Oceania", pos: [-25, 135] },
];

const MAJOR_COUNTRIES = new Set([
  "United States of America", "Canada", "Mexico", "Brazil", "Argentina",
  "Colombia", "Peru", "Chile", "Venezuela",
  "Russia", "China", "India", "Japan", "Australia",
  "Indonesia", "Saudi Arabia", "Iran", "Kazakhstan",
  "United Kingdom", "France", "Germany", "Spain", "Italy",
  "Turkey", "Ukraine", "Poland", "Sweden", "Norway", "Finland",
  "Egypt", "South Africa", "Nigeria", "Algeria", "Libya",
  "Dem. Rep. Congo", "Sudan", "Ethiopia", "Tanzania", "Kenya",
  "Mongolia", "Pakistan", "Afghanistan", "Thailand", "Myanmar",
  "Greenland", "Iceland", "New Zealand",
]);

const NAME_MAP: Record<string, string> = {
  "United States of America": "United States",
  "Dem. Rep. Congo": "Democratic Republic of Congo",
  "Dominican Rep.": "Dominican Republic",
  "Central African Rep.": "Central African Republic",
  "S. Sudan": "South Sudan",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Czech Rep.": "Czechia",
  "W. Sahara": "Western Sahara",
  "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern Territories",
  "French Guiana": "France",
  "Eq. Guinea": "Equatorial Guinea",
  eSwatini: "Eswatini",
  "Solomon Is.": "Solomon Islands",
  "Timor-Leste": "Timor",
  "N. Cyprus": "North Cyprus",
  Somaliland: "Somalia",
  "Côte d'Ivoire": "Cote d'Ivoire",
  Macedonia: "North Macedonia",
  Kosovo: "Kosovo",
  Taiwan: "Taiwan",
  Myanmar: "Myanmar",
  "Lao PDR": "Laos",
  Brunei: "Brunei",
};

/* ─── Antimeridian fix ──────────────────────────────────────────────────── */

function fixAntimeridian(geo: FeatureCollection): FeatureCollection {
  const targets = new Set(["Russia", "Fiji", "Antarctica"]);
  return {
    ...geo,
    features: geo.features.map((f) => {
      if (!targets.has(f.properties?.name)) return f;
      if (f.geometry.type === "MultiPolygon") {
        const fixed: number[][][][] = [];
        for (const polygon of (f.geometry as any).coordinates as number[][][][]) {
          for (const ring of polygon) {
            const hasHigh = ring.some((c: number[]) => c[0] > 170);
            const hasLow = ring.some((c: number[]) => c[0] < -170);
            if (hasHigh && hasLow) {
              fixed.push([ring.map((c: number[]) => (c[0] < 0 ? [c[0] + 360, c[1]] : [...c]))]);
              fixed.push([ring.map((c: number[]) => (c[0] > 0 ? [c[0] - 360, c[1]] : [...c]))]);
            } else {
              fixed.push([ring]);
            }
          }
        }
        return { ...f, geometry: { type: "MultiPolygon", coordinates: fixed } };
      }
      return f;
    }),
  };
}

/* ─── Color scales ──────────────────────────────────────────────────────── */

type MetricMode = "perCapita" | "annual";

function getPerCapitaColor(v: number | undefined): string {
  if (v == null) return "#1e293b";
  if (v >= 20) return "#7f1d1d"; // very dark red
  if (v >= 15) return "#991b1b";
  if (v >= 10) return "#dc2626";
  if (v >= 7) return "#ef4444";
  if (v >= 5) return "#f97316";
  if (v >= 3) return "#fbbf24";
  if (v >= 1) return "#facc15";
  return "#a3e635";
}

function getAnnualColor(v: number | undefined): string {
  if (v == null) return "#1e293b";
  if (v >= 5e9) return "#7f1d1d";
  if (v >= 1e9) return "#991b1b";
  if (v >= 500e6) return "#dc2626";
  if (v >= 200e6) return "#ef4444";
  if (v >= 100e6) return "#f97316";
  if (v >= 50e6) return "#fbbf24";
  if (v >= 10e6) return "#facc15";
  return "#a3e635";
}

function getColor(mode: MetricMode, v: number | undefined): string {
  return mode === "perCapita" ? getPerCapitaColor(v) : getAnnualColor(v);
}

/** 8-step palette used by both legends, light → dark. */
const PALETTE = [
  "#a3e635", "#facc15", "#fbbf24", "#f97316",
  "#ef4444", "#dc2626", "#991b1b", "#7f1d1d",
];

/**
 * Quantile thresholds from a list of values. Returns 7 thresholds that
 * divide the values into 8 equal-population buckets, matching PALETTE.
 * Returns null if there are fewer than 2 distinct values.
 */
function quantileThresholds(values: number[]): number[] | null {
  const sorted = [...values].filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (sorted.length < 2) return null;
  const ts: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const idx = Math.min(sorted.length - 1, Math.floor((i / 8) * sorted.length));
    ts.push(sorted[idx]);
  }
  // De-dup — if many ties, fall back to even split between min and max.
  if (new Set(ts).size < 2) {
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    if (max <= min) return null;
    return [1, 2, 3, 4, 5, 6, 7].map((i) => min + ((max - min) * i) / 8);
  }
  return ts;
}

function colorFromThresholds(v: number | undefined, ts: number[]): string {
  if (v == null) return "#1e293b";
  let i = 0;
  while (i < ts.length && v >= ts[i]) i++;
  return PALETTE[Math.min(i, PALETTE.length - 1)];
}

const PER_CAPITA_LEGEND = [
  { color: "#a3e635", label: "<1" },
  { color: "#facc15", label: "1–3" },
  { color: "#fbbf24", label: "3–5" },
  { color: "#f97316", label: "5–7" },
  { color: "#ef4444", label: "7–10" },
  { color: "#dc2626", label: "10–15" },
  { color: "#991b1b", label: "15–20" },
  { color: "#7f1d1d", label: "20+" },
];

const ANNUAL_LEGEND = [
  { color: "#a3e635", label: "<10M" },
  { color: "#facc15", label: "10–50M" },
  { color: "#fbbf24", label: "50–100M" },
  { color: "#f97316", label: "100–200M" },
  { color: "#ef4444", label: "200–500M" },
  { color: "#dc2626", label: "500M–1B" },
  { color: "#991b1b", label: "1–5B" },
  { color: "#7f1d1d", label: "5B+" },
];

/* ─── Country labels ────────────────────────────────────────────────────── */

function CountryLabels({ geo, level }: { geo: FeatureCollection; level: Level }) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  useEffect(() => {
    if (!map.getPane("labels")) {
      const pane = map.createPane("labels");
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
    }
    const tooltipPane = map.getPane("tooltipPane");
    if (tooltipPane) tooltipPane.style.zIndex = "700";
    setReady(true);
  }, [map]);

  const countryLabels = useMemo(() => {
    const result: { name: string; pos: [number, number] }[] = [];
    for (const f of geo.features) {
      const name = f.properties?.name;
      if (!name) continue;
      const pos = LABEL_OVERRIDES[name] ?? featureCentroid(f);
      if (pos) result.push({ name, pos });
    }
    return result;
  }, [geo]);

  if (!ready) return null;

  // Continents level: only the six continent labels at every zoom.
  if (level === 'continents') {
    const fz = zoom <= 2 ? 13 : zoom <= 3 ? 14 : 15;
    return (
      <>
        {CONTINENT_LABELS.map(({ name, pos }) => (
          <Marker
            key={name}
            position={pos}
            pane="labels"
            interactive={false}
            icon={L.divIcon({
              className: 'continent-label',
              html: `<span style="font-size:${fz}px">${name}</span>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        ))}
      </>
    );
  }

  const visibleLabels =
    zoom <= 2 ? CONTINENT_LABELS
    : zoom <= 3 ? countryLabels.filter(({ name }) => MAJOR_COUNTRIES.has(name))
    : countryLabels;
  const fontSize = zoom <= 2 ? 13 : 10;
  const cls = zoom <= 2 ? "continent-label" : "country-label";

  return (
    <>
      {visibleLabels.map(({ name, pos }) => (
        <Marker
          key={name}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: cls,
            html: `<span style="font-size:${fontSize}px">${NAME_MAP[name] || name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

/* ─── Format helpers ────────────────────────────────────────────────────── */

function formatTonnes(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Tt`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Bt`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} Mt`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} Kt`;
  return `${v.toFixed(0)} t`;
}

/* ─── Continent grouping ────────────────────────────────────────────────── */

type Level = 'countries' | 'continents';
const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const;
type ContinentName = (typeof CONTINENTS)[number];

// Country (OWID-style display name) → continent. Used to roll country polygons
// up to the active continent when level === 'continents'. Mirrors the OWID
// continent assignment exposed by /api/climate/emissions/country?continent=.
const CONTINENT_OF: Record<string, ContinentName> = {
  // Africa
  'Algeria': 'Africa', 'Angola': 'Africa', 'Benin': 'Africa', 'Botswana': 'Africa',
  'Burkina Faso': 'Africa', 'Burundi': 'Africa', 'Cameroon': 'Africa', 'Cape Verde': 'Africa',
  'Central African Republic': 'Africa', 'Chad': 'Africa', 'Comoros': 'Africa',
  'Democratic Republic of Congo': 'Africa', 'Congo': 'Africa', "Cote d'Ivoire": 'Africa',
  'Djibouti': 'Africa', 'Egypt': 'Africa', 'Equatorial Guinea': 'Africa', 'Eritrea': 'Africa',
  'Eswatini': 'Africa', 'Ethiopia': 'Africa', 'Gabon': 'Africa', 'Gambia': 'Africa',
  'Ghana': 'Africa', 'Guinea': 'Africa', 'Guinea-Bissau': 'Africa', 'Kenya': 'Africa',
  'Lesotho': 'Africa', 'Liberia': 'Africa', 'Libya': 'Africa', 'Madagascar': 'Africa',
  'Malawi': 'Africa', 'Mali': 'Africa', 'Mauritania': 'Africa', 'Mauritius': 'Africa',
  'Morocco': 'Africa', 'Mozambique': 'Africa', 'Namibia': 'Africa', 'Niger': 'Africa',
  'Nigeria': 'Africa', 'Rwanda': 'Africa', 'Senegal': 'Africa', 'Sierra Leone': 'Africa',
  'Somalia': 'Africa', 'South Africa': 'Africa', 'South Sudan': 'Africa', 'Sudan': 'Africa',
  'Tanzania': 'Africa', 'Togo': 'Africa', 'Tunisia': 'Africa', 'Uganda': 'Africa',
  'Western Sahara': 'Africa', 'Zambia': 'Africa', 'Zimbabwe': 'Africa',
  // Asia
  'Afghanistan': 'Asia', 'Armenia': 'Asia', 'Azerbaijan': 'Asia', 'Bahrain': 'Asia',
  'Bangladesh': 'Asia', 'Bhutan': 'Asia', 'Brunei': 'Asia', 'Cambodia': 'Asia',
  'China': 'Asia', 'Cyprus': 'Asia', 'Georgia': 'Asia', 'India': 'Asia',
  'Indonesia': 'Asia', 'Iran': 'Asia', 'Iraq': 'Asia', 'Israel': 'Asia',
  'Japan': 'Asia', 'Jordan': 'Asia', 'Kazakhstan': 'Asia', 'Kuwait': 'Asia',
  'Kyrgyzstan': 'Asia', 'Laos': 'Asia', 'Lebanon': 'Asia', 'Malaysia': 'Asia',
  'Maldives': 'Asia', 'Mongolia': 'Asia', 'Myanmar': 'Asia', 'Nepal': 'Asia',
  'North Korea': 'Asia', 'Oman': 'Asia', 'Pakistan': 'Asia', 'Palestine': 'Asia',
  'Philippines': 'Asia', 'Qatar': 'Asia', 'Saudi Arabia': 'Asia', 'Singapore': 'Asia',
  'South Korea': 'Asia', 'Sri Lanka': 'Asia', 'Syria': 'Asia', 'Taiwan': 'Asia',
  'Tajikistan': 'Asia', 'Thailand': 'Asia', 'Timor': 'Asia', 'Turkey': 'Asia',
  'Turkmenistan': 'Asia', 'United Arab Emirates': 'Asia', 'Uzbekistan': 'Asia',
  'Vietnam': 'Asia', 'Yemen': 'Asia',
  // Europe
  'Albania': 'Europe', 'Andorra': 'Europe', 'Austria': 'Europe', 'Belarus': 'Europe',
  'Belgium': 'Europe', 'Bosnia and Herzegovina': 'Europe', 'Bulgaria': 'Europe',
  'Croatia': 'Europe', 'Czechia': 'Europe', 'Denmark': 'Europe', 'Estonia': 'Europe',
  'Finland': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Greece': 'Europe',
  'Hungary': 'Europe', 'Iceland': 'Europe', 'Ireland': 'Europe', 'Italy': 'Europe',
  'Kosovo': 'Europe', 'Latvia': 'Europe', 'Liechtenstein': 'Europe', 'Lithuania': 'Europe',
  'Luxembourg': 'Europe', 'Malta': 'Europe', 'Moldova': 'Europe', 'Monaco': 'Europe',
  'Montenegro': 'Europe', 'Netherlands': 'Europe', 'North Cyprus': 'Europe',
  'North Macedonia': 'Europe', 'Norway': 'Europe', 'Poland': 'Europe', 'Portugal': 'Europe',
  'Romania': 'Europe', 'Russia': 'Europe', 'San Marino': 'Europe', 'Serbia': 'Europe',
  'Slovakia': 'Europe', 'Slovenia': 'Europe', 'Spain': 'Europe', 'Sweden': 'Europe',
  'Switzerland': 'Europe', 'Ukraine': 'Europe', 'United Kingdom': 'Europe', 'Vatican': 'Europe',
  // North America
  'Antigua and Barbuda': 'North America', 'Bahamas': 'North America', 'Barbados': 'North America',
  'Belize': 'North America', 'Canada': 'North America', 'Costa Rica': 'North America',
  'Cuba': 'North America', 'Dominica': 'North America', 'Dominican Republic': 'North America',
  'El Salvador': 'North America', 'Greenland': 'North America', 'Grenada': 'North America',
  'Guatemala': 'North America', 'Haiti': 'North America', 'Honduras': 'North America',
  'Jamaica': 'North America', 'Mexico': 'North America', 'Nicaragua': 'North America',
  'Panama': 'North America', 'Saint Kitts and Nevis': 'North America', 'Saint Lucia': 'North America',
  'Saint Vincent and the Grenadines': 'North America', 'Trinidad and Tobago': 'North America',
  'United States': 'North America',
  // South America
  'Argentina': 'South America', 'Bolivia': 'South America', 'Brazil': 'South America',
  'Chile': 'South America', 'Colombia': 'South America', 'Ecuador': 'South America',
  'Falkland Islands': 'South America', 'French Guiana': 'South America',
  'Guyana': 'South America', 'Paraguay': 'South America', 'Peru': 'South America',
  'Suriname': 'South America', 'Uruguay': 'South America', 'Venezuela': 'South America',
  // Oceania
  'Australia': 'Oceania', 'Fiji': 'Oceania', 'Kiribati': 'Oceania', 'Marshall Islands': 'Oceania',
  'Micronesia': 'Oceania', 'Nauru': 'Oceania', 'New Zealand': 'Oceania', 'Palau': 'Oceania',
  'Papua New Guinea': 'Oceania', 'Samoa': 'Oceania', 'Solomon Islands': 'Oceania',
  'Tonga': 'Oceania', 'Tuvalu': 'Oceania', 'Vanuatu': 'Oceania',
};

/* ─── Main component ────────────────────────────────────────────────────── */

interface CountryEmissions {
  annual: number;
  perCapita: number;
}

interface Props {
  countryMapData: Record<string, CountryEmissions>;
}

export default function EmissionsChoroplethMap({ countryMapData }: Props) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<MetricMode>("perCapita");
  const [level, setLevel] = useState<Level>('countries');
  const [stretch, setStretch] = useState(false);
  const [continentData, setContinentData] = useState<Record<string, CountryEmissions> | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<{ name: string; annual: number | null; perCapita: number | null; color: string } | null>(null);

  useEffect(() => {
    fetch("/data/world-countries.json")
      .then((r) => r.json())
      .then((geo) => setGeoData(fixAntimeridian(geo)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch the six OWID continent aggregates the first time the user picks
  // the Continents level. Cached after first load.
  useEffect(() => {
    if (level !== 'continents' || continentData) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, CountryEmissions> = {};
      const results = await Promise.all(
        CONTINENTS.map((c) =>
          fetch(`/api/climate/emissions/country?continent=${encodeURIComponent(c)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );
      results.forEach((r, i) => {
        if (!r?.country) return;
        const c = r.country;
        out[CONTINENTS[i]] = {
          annual: c.latestAnnual ?? 0,
          perCapita: c.latestPerCapita ?? 0,
        };
      });
      if (!cancelled) setContinentData(out);
    })();
    return () => { cancelled = true; };
  }, [level, continentData]);

  const dataMap = useMemo(() => {
    const m = new Map<string, CountryEmissions>();
    for (const [name, vals] of Object.entries(countryMapData)) {
      m.set(name, vals);
    }
    return m;
  }, [countryMapData]);

  // Resolve the value to render for a given world-countries.json feature, taking
  // the active level into account. In continents mode every country in the same
  // continent gets tinted with the continent aggregate so the choropleth reads
  // as six bands rather than ~190 polygons.
  const resolveEntry = useCallback((owidName: string, geoName?: string): { entry: CountryEmissions | undefined; displayName: string } => {
    if (level === 'continents') {
      const cont = (geoName ? CONTINENT_OF[geoName] : undefined) ?? CONTINENT_OF[owidName];
      if (!cont || !continentData) return { entry: undefined, displayName: cont ?? owidName };
      return { entry: continentData[cont], displayName: cont };
    }
    return { entry: dataMap.get(owidName), displayName: owidName };
  }, [level, continentData, dataMap]);

  // Derive quantile thresholds from the values currently being rendered.
  // When `stretch` is on we colour by these thresholds instead of the fixed
  // legend buckets — this is the only way the Continents × Total Annual
  // view shows any colour variation, since every continent falls in the
  // same top bucket of the fixed scale.
  const stretchThresholds = useMemo(() => {
    if (!stretch) return null;
    const values: number[] = [];
    if (level === 'continents') {
      if (!continentData) return null;
      for (const v of Object.values(continentData)) {
        const x = mode === 'perCapita' ? v.perCapita : v.annual;
        if (Number.isFinite(x) && x > 0) values.push(x);
      }
    } else {
      for (const v of dataMap.values()) {
        const x = mode === 'perCapita' ? v.perCapita : v.annual;
        if (Number.isFinite(x) && x > 0) values.push(x);
      }
    }
    return quantileThresholds(values);
  }, [stretch, level, mode, dataMap, continentData]);

  const colorFor = useCallback(
    (v: number | undefined) =>
      stretchThresholds ? colorFromThresholds(v, stretchThresholds) : getColor(mode, v),
    [stretchThresholds, mode],
  );

  const style = useCallback(
    (feature: Feature | undefined): PathOptions => {
      if (!feature) return { fillColor: "#1e293b", fillOpacity: 0.7, weight: 0.5, color: "#475569" };
      const geoName = feature.properties?.name || "";
      const owidName = NAME_MAP[geoName] || geoName;
      const { entry } = resolveEntry(owidName, geoName);
      const value = entry ? (mode === "perCapita" ? entry.perCapita : entry.annual) : undefined;
      return {
        fillColor: colorFor(value),
        fillOpacity: 0.8,
        weight: level === 'continents' ? 0.2 : 0.5,
        color: "#334155",
      };
    },
    [resolveEntry, mode, level, colorFor],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const geoName = feature.properties?.name || "";
      const owidName = NAME_MAP[geoName] || geoName;
      const { entry, displayName } = resolveEntry(owidName, geoName);
      const annual = entry?.annual ?? null;
      const perCap = entry?.perCapita ?? null;
      const color = colorFor(mode === "perCapita" ? perCap ?? undefined : annual ?? undefined);

      const showInfo = () => setSelectedInfo({ name: displayName, annual, perCapita: perCap, color });
      layer.on("mouseover", showInfo);
      layer.on("click", showInfo);
      layer.on("mouseout", () => setSelectedInfo(null));
    },
    [resolveEntry, mode, colorFor],
  );

  if (loading) {
    return (
      <div className="aspect-[4/3] w-full rounded-xl bg-gray-900/50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-red-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="aspect-[4/3] w-full rounded-xl bg-gray-900/50 flex items-center justify-center text-gray-500">
        Failed to load map data
      </div>
    );
  }

  const legend = mode === "perCapita" ? PER_CAPITA_LEGEND : ANNUAL_LEGEND;
  const legendLabel = mode === "perCapita" ? "CO₂ per capita (t/person):" : "Annual CO₂ emissions:";

  return (
    <div>
      {/* Level + Metric chips */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <ChipDropdown
          label="Level"
          ariaLabel="Map level"
          value={level}
          onChange={(v) => setLevel(v as Level)}
          options={[
            { key: 'continents', label: 'Continents' },
            { key: 'countries', label: 'Countries' },
          ]}
        />
        <ChipDropdown
          label="Metric"
          ariaLabel="Emissions metric"
          value={mode}
          onChange={(v) => setMode(v as MetricMode)}
          options={[
            { key: 'perCapita', label: 'Per Capita' },
            { key: 'annual', label: 'Total Annual' },
          ]}
        />
      </div>

      {/* Map */}
      <div className="relative">
        <WorldMapShell preset="world" theme="light">
          <GeoJSON
            key={`${level}-${mode}-${dataMap.size}-${continentData ? Object.keys(continentData).length : 0}`}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
          <CountryLabels geo={geoData} level={level} />
        </WorldMapShell>

        {/* Info bar */}
        {selectedInfo && (
          <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/60 px-4 py-2.5 flex items-center gap-4 text-sm pointer-events-none">
            <span className="font-bold text-gray-100">{selectedInfo.name}</span>
            <span className="font-semibold" style={{ color: selectedInfo.color }}>
              {selectedInfo.annual != null ? formatTonnes(selectedInfo.annual) + " / year" : "No data"}
            </span>
            {selectedInfo.perCapita != null && (
              <span className="text-gray-400">{selectedInfo.perCapita.toFixed(1)} t CO₂ per person</span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-gray-400">
        <span className="font-semibold text-gray-300">{legendLabel}</span>
        {legend.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            {stretch ? '' : label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-800 border border-gray-600" />
          No data
        </span>
        <button
          type="button"
          onClick={() => setStretch((s) => !s)}
          aria-pressed={stretch}
          title={stretch
            ? 'Showing colours stretched to the actual data range. Click to return to fixed thresholds.'
            : 'Stretch colours to the actual data range — useful when every region falls in the same fixed bucket (e.g. continent totals).'}
          className={`ml-2 px-2 py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${
            stretch
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
              : 'bg-gray-800/60 border-gray-600 text-gray-300 hover:bg-gray-700/60'
          }`}
        >
          {stretch ? 'Stretch: On' : 'Stretch: Off'}
        </button>
      </div>
    </div>
  );
}
