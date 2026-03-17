"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Brush, Cell,
} from "recharts";
import {
  Loader2, AlertTriangle, CloudLightning, Flame, Waves,
  Thermometer, Wind, Activity, ExternalLink, Link2, MapPin,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface YearlyByType {
  year: number;
  [type: string]: number;
}

interface YearlyTotal {
  year: number;
  value: number;
}

interface GDACSEvent {
  type: string;
  name: string;
  alertLevel: string;
  country: string;
  fromDate: string;
  toDate: string;
  severity: string;
  population: number;
  lat: number;
  lon: number;
  url: string;
}

interface ExtremeWeatherData {
  disastersByType: YearlyByType[];
  deathsByType: YearlyByType[];
  totalDisasters: YearlyTotal[];
  totalDeaths: YearlyTotal[];
  totalAffected: YearlyTotal[];
  totalDamages: YearlyTotal[];
  gdacsEvents: GDACSEvent[];
  fetchedAt: string;
}

/* ─── Chart config ───────────────────────────────────────────────────────── */

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;

const formatYAxis = (v: number) =>
  v >= 1_000_000_000 ? `${Math.round(v / 1_000_000_000)}B`
  : v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M`
  : v >= 1_000 ? `${Math.round(v / 1_000)}K`
  : String(v);

const TYPE_COLORS: Record<string, string> = {
  Flood: "#3b82f6",
  "Extreme weather": "#a855f7",
  Drought: "#eab308",
  "Extreme temperature": "#ef4444",
  Wildfire: "#f59e0b",
  "Wet mass movement": "#14b8a6",
  "Glacial lake outburst flood": "#06b6d4",
};

const ALERT_COLORS: Record<string, string> = {
  Red: "bg-red-500/20 text-red-400 border-red-500/30",
  Orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  TC: <Wind className="w-4 h-4" />,
  FL: <Waves className="w-4 h-4" />,
  DR: <Thermometer className="w-4 h-4" />,
  WF: <Flame className="w-4 h-4" />,
};

const EVENT_LABELS: Record<string, string> = {
  TC: "Tropical Cyclone",
  FL: "Flood",
  DR: "Drought",
  WF: "Wildfire",
};

/* ─── Tooltips ───────────────────────────────────────────────────────────── */

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="text-sm">
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── Layout components ──────────────────────────────────────────────────── */

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-800">
      <h2 className="text-xl font-bold font-mono text-white mb-5 flex items-center gap-2 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  subtext,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700/50">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

/* ─── Stacked bar chart ──────────────────────────────────────────────────── */

const MAIN_TYPES = [
  "Flood",
  "Extreme weather",
  "Drought",
  "Extreme temperature",
  "Wildfire",
  "Wet mass movement",
  "Glacial lake outburst flood",
];

function StackedTypeChart({
  data,
  title,
  yLabel,
}: {
  data: YearlyByType[];
  title: string;
  yLabel: string;
}) {
  const filtered = data.filter((d) => d.year >= 1960);
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{title}</h3>
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={formatYAxis} />
            <Tooltip content={<DarkTooltip />} cursor={{ fill: "#1F2937" }} />
            <Legend wrapperStyle={{ color: "#D3C8BB", fontSize: 11, left: 0, right: 0, paddingTop: 12 }} />
            {MAIN_TYPES.map((type) => (
              <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type] || "#6b7280"} />
            ))}
            <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Total trend chart ──────────────────────────────────────────────────── */

function TotalTrendChart({
  data,
  title,
  yLabel,
  color,
  fillColor,
}: {
  data: YearlyTotal[];
  title: string;
  yLabel: string;
  color: string;
  fillColor: string;
}) {
  const filtered = data.filter((d) => d.year >= 1960);
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id={`grad-ew-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fillColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={formatYAxis} />
            <Tooltip content={<DarkTooltip />} cursor={{ stroke: "#6B7280" }} />
            <Area
              type="monotone"
              dataKey="value"
              name={yLabel}
              stroke={color}
              fill={`url(#grad-ew-${title.replace(/\s/g, "")})`}
              strokeWidth={2}
            />
            <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Top 10 Most-Hit Countries ──────────────────────────────────────────── */

const RANK_COLOURS = [
  "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5",
  "#fef3c7", "#fef9c3", "#fefce8", "#ecfccb", "#dcfce7",
];

const EW_EXCLUDE = new Set([
  "World", "Africa", "Asia", "Europe", "North America", "South America", "Oceania",
  "European Union (27)", "High-income countries", "Upper-middle-income countries",
  "Lower-middle-income countries", "Low-income countries",
]);

function Top10Countries() {
  const [ranking, setRanking] = useState<{ name: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [dataRes, metaRes] = await Promise.all([
          fetch("https://api.ourworldindata.org/v1/indicators/1119245.data.json"),
          fetch("https://api.ourworldindata.org/v1/indicators/1119245.metadata.json"),
        ]);
        const data = await dataRes.json();
        const meta = await metaRes.json();
        const entityMap: Record<number, string> = {};
        for (const e of meta?.dimensions?.entities?.values ?? []) entityMap[e.id] = e.name;

        // Sum disasters in last 20 years per country
        const cutoff = new Date().getFullYear() - 20;
        const totals: Record<string, number> = {};
        for (let i = 0; i < data.years.length; i++) {
          if (data.years[i] < cutoff) continue;
          const name = entityMap[data.entities[i]];
          if (!name || EW_EXCLUDE.has(name)) continue;
          totals[name] = (totals[name] || 0) + (data.values[i] || 0);
        }
        const sorted = Object.entries(totals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
        setRanking(sorted);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <SectionCard icon={<AlertTriangle className="h-5 w-5 text-orange-400" />} title="Most-Affected Countries (Last 20 Years)">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      </SectionCard>
    );
  }
  if (!ranking || ranking.length === 0) return null;

  return (
    <SectionCard icon={<AlertTriangle className="h-5 w-5 text-orange-400" />} title="Most-Affected Countries (Last 20 Years)">
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ranking} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#D3C8BB" }} tickLine={false} axisLine={false} />
            <Tooltip content={({ active, payload, label: l }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                  <p className="font-semibold text-gray-200 text-sm">{l}</p>
                  <p className="text-orange-400 text-sm">{payload[0]?.value?.toLocaleString()} events</p>
                </div>
              );
            }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {ranking.map((_, i) => (
                <Cell key={i} fill={RANK_COLOURS[i] || "#f97316"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Top countries by reported extreme weather events over the past two decades. Source:{" "}
        <a href="https://www.emdat.be/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">EM-DAT</a>.
      </p>
    </SectionCard>
  );
}

/* ─── Map (SSR-safe dynamic import) ──────────────────────────────────────── */

/* Manual centroid overrides for countries whose auto-centroid lands poorly */
const LABEL_OVERRIDES: Record<string, [number, number]> = {
  "United States of America": [40, -98],
  "Canada": [56, -96],
  "Russia": [62, 95],
  "France": [47, 2.5],
  "Norway": [65, 13],
  "Indonesia": [-2, 118],
  "Malaysia": [4, 109],
  "Chile": [-35, -71],
  "New Zealand": [-42, 174],
  "Japan": [36, 138],
  "Antarctica": [-82, 0],
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

const MAP_NAME_MAP: Record<string, string> = {
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
  "Eq. Guinea": "Equatorial Guinea",
  "eSwatini": "Eswatini",
  "Solomon Is.": "Solomon Islands",
  "Timor-Leste": "Timor",
  "N. Cyprus": "North Cyprus",
  "Somaliland": "Somalia",
  "Côte d'Ivoire": "Cote d'Ivoire",
  "Macedonia": "North Macedonia",
  "Kosovo": "Kosovo",
  "Taiwan": "Taiwan",
  "Myanmar": "Myanmar",
  "Lao PDR": "Laos",
  "Brunei": "Brunei",
};

function featureCentroidEW(feature: any): [number, number] | null {
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    let x = 0, y = 0;
    for (const c of ring) { x += c[0]; y += c[1]; }
    return [y / ring.length, x / ring.length];
  }
  if (geom.type === "MultiPolygon") {
    let best: number[][] = [];
    let bestArea = 0;
    for (const poly of geom.coordinates) {
      const ring = poly[0];
      let a = 0;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
      }
      a = Math.abs(a / 2);
      if (a > bestArea) { bestArea = a; best = ring; }
    }
    if (best.length) {
      let x = 0, y = 0;
      for (const c of best) { x += c[0]; y += c[1]; }
      return [y / best.length, x / best.length];
    }
  }
  return null;
}

const EventsMap = dynamic(
  () =>
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      fetch("/data/world-countries.json").then((r) => r.json()).catch(() => null),
    ]).then(([mod, L, geoData]) => {
      const { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap, useMapEvents } = mod;
      const ALERT_FILL: Record<string, string> = {
        Red: "#ef4444",
        Orange: "#f97316",
        Green: "#10b981",
      };
      const ALERT_BG: Record<string, string> = {
        Red: "#1a0505",
        Orange: "#1a0f05",
        Green: "#051a0f",
      };
      const ALERT_BORDER: Record<string, string> = {
        Red: "#ef4444",
        Orange: "#f97316",
        Green: "#10b981",
      };

      function MapLabels() {
        const map = useMap();
        const [ready, setReady] = React.useState(false);
        const [zoom, setZoom] = React.useState(map.getZoom());

        useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

        React.useEffect(() => {
          if (!map.getPane("labels")) {
            const pane = map.createPane("labels");
            pane.style.zIndex = "350";
            pane.style.pointerEvents = "none";
          }
          const tooltipPane = map.getPane("tooltipPane");
          if (tooltipPane) tooltipPane.style.zIndex = "700";
          setReady(true);
        }, [map]);

        const countryLabels = React.useMemo(() => {
          if (!geoData) return [];
          const result: { name: string; pos: [number, number] }[] = [];
          for (const f of geoData.features) {
            const name = f.properties?.name;
            if (!name) continue;
            const pos = LABEL_OVERRIDES[name] ?? featureCentroidEW(f);
            if (pos) result.push({ name, pos });
          }
          return result;
        }, []);

        if (!ready || !geoData) return null;

        const visibleLabels =
          zoom <= 2
            ? CONTINENT_LABELS
            : zoom <= 3
              ? countryLabels.filter(({ name }) => MAJOR_COUNTRIES.has(name))
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
                icon={L.default.divIcon({
                  className: cls,
                  html: `<span style="font-size:${fontSize}px">${MAP_NAME_MAP[name] || name}</span>`,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                })}
              />
            ))}
          </>
        );
      }

      return function Map({ events }: { events: GDACSEvent[] }) {
        return (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={2}
            maxZoom={8}
            scrollWheelZoom={true}
            className="h-[350px] md:h-[420px] w-full rounded-xl z-0"
            style={{ background: "#111827" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            />
            <MapLabels />
            {events.map((e, i) => (
              <CircleMarker
                key={i}
                center={[e.lat, e.lon]}
                radius={e.alertLevel === "Red" ? 8 : e.alertLevel === "Orange" ? 6 : 4}
                pathOptions={{
                  color: ALERT_FILL[e.alertLevel] || "#6b7280",
                  fillColor: ALERT_FILL[e.alertLevel] || "#6b7280",
                  fillOpacity: 0.6,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div
                    style={{
                      background: ALERT_BG[e.alertLevel] || "#111827",
                      border: `1px solid ${ALERT_BORDER[e.alertLevel] || "#374151"}`,
                      borderRadius: "8px",
                      padding: "8px 10px",
                      color: ALERT_FILL[e.alertLevel] || "#9ca3af",
                      minWidth: 160,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{e.name}</div>
                    {e.country && <div style={{ opacity: 0.8 }}>{e.country}</div>}
                    {e.severity && <div style={{ opacity: 0.6, marginTop: 2 }}>{e.severity}</div>}
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 6,
                        color: ALERT_FILL[e.alertLevel] || "#9ca3af",
                        textDecoration: "underline",
                        fontWeight: 600,
                      }}
                    >
                      View GDACS report →
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        );
      };
    }),
  { ssr: false, loading: () => <div className="h-[350px] md:h-[420px] w-full rounded-xl bg-gray-900 animate-pulse" /> },
);

/* ─── GDACS Live Events ──────────────────────────────────────────────────── */

function LiveEventsSection({ events }: { events: GDACSEvent[] }) {
  const [filter, setFilter] = useState<string>("all");

  const sorted = useMemo(() => {
    const alertOrder: Record<string, number> = { Red: 0, Orange: 1, Green: 2 };
    let filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
    return [...filtered].sort((a, b) => {
      const al = (alertOrder[a.alertLevel] ?? 3) - (alertOrder[b.alertLevel] ?? 3);
      if (al !== 0) return al;
      return new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime();
    });
  }, [events, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.type] = (c[e.type] || 0) + 1;
    return c;
  }, [events]);

  const alertCounts = useMemo(() => {
    const c: Record<string, number> = { Red: 0, Orange: 0, Green: 0 };
    for (const e of events) c[e.alertLevel] = (c[e.alertLevel] || 0) + 1;
    return c;
  }, [events]);

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{alertCounts.Red}</div>
          <div className="text-xs text-red-400/70 uppercase">Red Alert</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{alertCounts.Orange}</div>
          <div className="text-xs text-orange-400/70 uppercase">Orange Alert</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{alertCounts.Green}</div>
          <div className="text-xs text-emerald-400/70 uppercase">Green Alert</div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            filter === "all" ? "bg-gray-700 text-white" : "bg-gray-800/50 text-gray-400 hover:text-white"
          }`}
        >
          All ({events.length})
        </button>
        {Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                filter === type ? "bg-gray-700 text-white" : "bg-gray-800/50 text-gray-400 hover:text-white"
              }`}
            >
              {EVENT_ICONS[type]} {EVENT_LABELS[type] || type} ({count})
            </button>
          ))}
      </div>

      {/* Map */}
      <div className="mb-4">
        <EventsMap events={sorted} />
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[600px] overflow-y-auto pr-1">
        {sorted.slice(0, 50).map((e, i) => (
          <a
            key={i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block rounded-xl border p-2.5 transition-colors hover:bg-gray-800/50 ${ALERT_COLORS[e.alertLevel] || "bg-gray-800/30 text-gray-400 border-gray-700"}`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5">{EVENT_ICONS[e.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{e.name}</div>
                <div className="text-xs opacity-70 mt-0.5">
                  {e.country && <span>{e.country} · </span>}
                  {new Date(e.fromDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {e.toDate !== e.fromDate && (
                    <> → {new Date(e.toDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
                  )}
                </div>
                {e.severity && <div className="text-xs opacity-60 mt-0.5 truncate">{e.severity}</div>}
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-40 flex-shrink-0 mt-1" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function ExtremeWeatherPage() {
  const [data, setData] = useState<ExtremeWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/climate/extreme-weather")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message || "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  // Compute summary stats
  const stats = useMemo(() => {
    if (!data) return null;
    const latest = data.totalDisasters[data.totalDisasters.length - 1];
    const latestDeaths = data.totalDeaths[data.totalDeaths.length - 1];
    const latestDamages = data.totalDamages[data.totalDamages.length - 1];
    const latestAffected = data.totalAffected[data.totalAffected.length - 1];

    // Decade average (2010-2019)
    const decadeDisasters = data.totalDisasters.filter((d) => d.year >= 2010 && d.year <= 2019);
    const decadeAvg = decadeDisasters.length
      ? Math.round(decadeDisasters.reduce((s, d) => s + d.value, 0) / decadeDisasters.length)
      : 0;

    return { latest, latestDeaths, latestDamages, latestAffected, decadeAvg };
  }, [data]);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ─── Hero ─────────────────────────────────────────────── */}
          <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border border-gray-800 p-4 md:p-6 shadow-xl">
            <p
              className="text-sm uppercase tracking-[0.3em] font-mono mb-4"
              style={{
                background: "linear-gradient(to right, #ef4444, #f97316, #eab308)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Climate Change
            </p>
            <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide text-white leading-tight mb-4">
              Extreme Weather{" "}
              <span
                style={{
                  background: "linear-gradient(to right, #ef4444, #f97316, #eab308)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Events
              </span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              Tracking extreme weather events worldwide – from historical trends over the past century to live alerts today.
              Data sourced from{" "}
              <a href="https://www.emdat.be/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                EM-DAT
              </a>{" "}
              (via{" "}
              <a href="https://ourworldindata.org/natural-disasters" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                Our World in Data
              </a>
              ) for historical records and{" "}
              <a href="https://www.gdacs.org/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                GDACS
              </a>{" "}
              (EU/JRC) for live global alerts.
            </p>
          </div>

          {/* ─── Loading / Error ───────────────────────────────────── */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              <span className="ml-3 text-gray-400 text-sm">Loading extreme weather data…</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
              <AlertTriangle className="inline w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          {data && stats && (
            <>
              {/* ─── Summary Stats ──────────────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label={`Disasters (${stats.latest?.year || "–"})`}
                  value={stats.latest?.value?.toLocaleString() || "–"}
                  unit="events"
                  subtext={`2010–2019 avg: ${stats.decadeAvg}`}
                  color="text-orange-400"
                />
                <StatCard
                  label={`Deaths (${stats.latestDeaths?.year || "–"})`}
                  value={stats.latestDeaths?.value?.toLocaleString() || "–"}
                  unit="people"
                  color="text-red-400"
                />
                <StatCard
                  label={`Affected (${stats.latestAffected?.year || "–"})`}
                  value={
                    stats.latestAffected?.value
                      ? stats.latestAffected.value >= 1e9
                        ? `${(stats.latestAffected.value / 1e9).toFixed(1)}B`
                        : stats.latestAffected.value >= 1e6
                        ? `${(stats.latestAffected.value / 1e6).toFixed(1)}M`
                        : stats.latestAffected.value.toLocaleString()
                      : "–"
                  }
                  unit="people"
                  color="text-amber-400"
                />
                <StatCard
                  label={`Damages (${stats.latestDamages?.year || "–"})`}
                  value={
                    stats.latestDamages?.value
                      ? `$${(stats.latestDamages.value / 1e9).toFixed(0)}B`
                      : "–"
                  }
                  unit="USD"
                  color="text-emerald-400"
                />
              </div>

              {/* ─── Live GDACS Alerts ──────────────────────────────── */}
              {data.gdacsEvents.length > 0 && (
                <SectionCard icon={<Activity />} title="Live Extreme Weather Alerts">
                  <LiveEventsSection events={data.gdacsEvents} />
                  <p className="text-xs text-gray-500 mt-4">
                    Real-time alerts from{" "}
                    <a href="https://www.gdacs.org/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                      GDACS <ExternalLink className="inline w-3 h-3" />
                    </a>{" "}
                    (EU/JRC) – last 12 months.
                  </p>
                </SectionCard>
              )}

              {/* ─── Disasters by Type ─────────────────────────────── */}
              <SectionCard icon={<CloudLightning />} title="Extreme Weather by Type">
                <StackedTypeChart data={data.disastersByType} title="Recorded Extreme Weather Events per Year" yLabel="Events" />
                <p className="text-xs text-gray-500 mt-4">
                  Annual events by type from{" "}
                  <a href="https://www.emdat.be/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                    EM-DAT <ExternalLink className="inline w-3 h-3" />
                  </a>{" "}
                  via{" "}
                  <a href="https://ourworldindata.org/natural-disasters" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                    Our World in Data <ExternalLink className="inline w-3 h-3" />
                  </a>.
                </p>
              </SectionCard>

              {/* ─── Deaths by Type ────────────────────────────────── */}
              <SectionCard icon={<AlertTriangle />} title="Deaths from Extreme Weather">
                <StackedTypeChart data={data.deathsByType} title="Deaths from Extreme Weather per Year" yLabel="Deaths" />
                <p className="text-xs text-gray-500 mt-4">
                  Annual death toll by type. Source:{" "}
                  <a href="https://www.emdat.be/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                    EM-DAT <ExternalLink className="inline w-3 h-3" />
                  </a>.
                </p>
              </SectionCard>

              {/* ─── Total trends ──────────────────────────────────── */}
              <SectionCard icon={<Activity />} title="Long-Term Trends">
                <div className="space-y-8">
                  <TotalTrendChart
                    data={data.totalDisasters}
                    title="Total Recorded Disasters per Year"
                    yLabel="Disasters"
                    color="#f97316"
                    fillColor="#f97316"
                  />
                  <TotalTrendChart
                    data={data.totalDeaths}
                    title="Total Deaths from Extreme Weather per Year"
                    yLabel="Deaths"
                    color="#ef4444"
                    fillColor="#ef4444"
                  />
                  <TotalTrendChart
                    data={data.totalAffected}
                    title="Total People Affected per Year"
                    yLabel="People affected"
                    color="#eab308"
                    fillColor="#eab308"
                  />
                  <TotalTrendChart
                    data={data.totalDamages}
                    title="Total Economic Damage per Year (Current US$)"
                    yLabel="Damage (US$)"
                    color="#10b981"
                    fillColor="#10b981"
                  />
                </div>
              </SectionCard>

              {/* ─── Top 10 Most-Hit Countries ──────────────────── */}
              <Top10Countries />

              {/* ─── Data Sources ──────────────────────────────────── */}
              <div className="bg-gray-950/70 rounded-xl border border-gray-800/50 p-4 text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-1.5 mb-2 text-gray-400 font-semibold">
                  <Link2 className="w-3.5 h-3.5" /> Data Sources
                </div>
                <p>
                  <a href="https://www.emdat.be/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">EM-DAT</a>{" "}
                  – The International Disaster Database, Centre for Research on the Epidemiology of Disasters (CRED), UCLouvain, Brussels.
                </p>
                <p>
                  <a href="https://ourworldindata.org/natural-disasters" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Our World in Data</a>{" "}
                  – Extreme Weather dataset, based on EM-DAT data.
                </p>
                <p>
                  <a href="https://www.gdacs.org/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">GDACS</a>{" "}
                  – Global Disaster Alert and Coordination System, European Commission Joint Research Centre (JRC).
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
