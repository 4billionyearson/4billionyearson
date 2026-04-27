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
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-xl font-bold font-mono text-white mb-5 flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
        {icon}
        <span className="min-w-0 flex-1">{title}</span>
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
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
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
            <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
              <BarChart data={filtered}>
                <Bar dataKey={MAIN_TYPES[0]} stackId="a" fill={TYPE_COLORS[MAIN_TYPES[0]] || "#6b7280"} />
              </BarChart>
            </Brush>
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
            <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
              <AreaChart data={filtered}>
                <Area type="monotone" dataKey="value" stroke={color} fill={fillColor} fillOpacity={0.2} dot={false} strokeWidth={1} />
              </AreaChart>
            </Brush>
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
      <p className="text-xs text-gray-400 mt-4">
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
        Red: "#dc2626",
        Orange: "#ea580c",
        Green: "#059669",
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
            pane.style.zIndex = "450";
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
        const cls = zoom <= 2 ? "continent-label-dark" : "country-label-dark";

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

      function FitBounds({ events }: { events: GDACSEvent[] }) {
        const map = useMap();
        React.useEffect(() => {
          if (events.length === 0) return;
          const width = map.getContainer().clientWidth;
          if (width < 500) {
            // On mobile, always show full world view
            map.setView([20, 30], 1);
          } else {
            const bounds = L.default.latLngBounds(events.map((e) => [e.lat, e.lon]));
            map.fitBounds(bounds, {
              padding: [40, 40],
              maxZoom: width < 768 ? 3 : 5,
            });
          }
        }, [events, map]);
        return null;
      }

      return function Map({ events }: { events: GDACSEvent[] }) {
        return (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={1}
            maxZoom={8}
            scrollWheelZoom={true}
            className="h-[280px] md:h-[420px] w-full rounded-xl z-0"
            style={{ background: "#BEEEF9" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            />
            <MapLabels />
            <FitBounds events={events} />
            {events.map((e, i) => (
              <CircleMarker
                key={i}
                center={[e.lat, e.lon]}
                radius={e.alertLevel === "Red" ? 14 : e.alertLevel === "Orange" ? 11 : 9}
                pathOptions={{
                  color: "#1e293b",
                  fillColor: ALERT_FILL[e.alertLevel] || "#6b7280",
                  fillOpacity: 0.75,
                  weight: 2,
                }}
              >
                <Popup>
                  <div
                    style={{
                      background: ALERT_BG[e.alertLevel] || "#111827",
                      border: `1px solid ${ALERT_BORDER[e.alertLevel] || "#374151"}`,
                      borderRadius: "8px",
                      padding: "10px 12px",
                      paddingTop: "18px",
                      paddingRight: "24px",
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

// GDACS event type → EM-DAT disaster-type label (for historical baseline lookup)
const GDACS_TO_EMDAT: Record<string, string> = {
  WF: "Wildfire",
  FL: "Flood",
  DR: "Drought",
  TC: "Extreme weather",
};

function LiveEventsSection({
  events,
  disastersByType,
}: {
  events: GDACSEvent[];
  disastersByType: YearlyByType[];
}) {
  const [filter, setFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState<boolean>(false);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

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

  // Hotspot clusters: group by country + event type, then surface the ones that
  // dominate the current feed so duplicate hotspot entries (e.g. 34 identical
  // "Forest fires in Australia" alerts) collapse into a single actionable row.
  const hotspots = useMemo(() => {
    type Cluster = {
      country: string;
      type: string;
      count: number;
      alerts: Record<string, number>;
      earliest: string | null;
      latest: string | null;
      sampleUrl: string;
    };
    const map = new Map<string, Cluster>();
    for (const e of events) {
      const country = e.country || "—";
      const key = `${country}|${e.type}`;
      let c = map.get(key);
      if (!c) {
        c = { country, type: e.type, count: 0, alerts: {}, earliest: null, latest: null, sampleUrl: e.url };
        map.set(key, c);
      }
      c.count++;
      c.alerts[e.alertLevel] = (c.alerts[e.alertLevel] || 0) + 1;
      if (e.fromDate && (!c.earliest || e.fromDate < c.earliest)) c.earliest = e.fromDate;
      if (e.toDate && (!c.latest || e.toDate > c.latest)) c.latest = e.toDate;
    }
    const alertRank = (a: Cluster) =>
      (a.alerts.Red || 0) * 100 + (a.alerts.Orange || 0) * 10 + (a.alerts.Green || 0);
    // Show all clusters of ≥2, plus any singleton that is Red or Amber
    // (those are meaningful events even when they're one-offs). Green
    // singletons are dropped to keep the overview focused.
    return [...map.values()]
      .filter((c) => c.count >= 2 || (c.alerts.Red || 0) > 0 || (c.alerts.Orange || 0) > 0)
      .sort((a, b) => alertRank(b) - alertRank(a) || b.count - a.count)
      .slice(0, 12);
  }, [events]);

  const fmtShort = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : "";

  // Historical context: for each GDACS type currently in the feed, compare
  // EM-DAT's recent-decade annual average to the prior decade so the user can
  // see whether this type of event is trending up or down globally.
  const historicalContext = useMemo(() => {
    if (!disastersByType?.length) return [];
    const years = disastersByType.map((d) => d.year);
    const latestYear = Math.max(...years);
    const recentWindow = disastersByType.filter((d) => d.year >= latestYear - 9 && d.year <= latestYear);
    const priorWindow = disastersByType.filter((d) => d.year >= latestYear - 19 && d.year <= latestYear - 10);
    const avg = (rows: YearlyByType[], key: string) => {
      const vals = rows.map((r) => (typeof r[key] === "number" ? (r[key] as number) : 0));
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };
    // Types currently in the GDACS feed, ordered by count
    const active = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return active
      .map(([gdacsType, currentCount]) => {
        const emdatLabel = GDACS_TO_EMDAT[gdacsType];
        if (!emdatLabel) return null;
        const recentAvg = avg(recentWindow, emdatLabel);
        const priorAvg = avg(priorWindow, emdatLabel);
        if (recentAvg === 0 && priorAvg === 0) return null;
        const pctChange = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : null;
        // Annual series from 1990 for the sparkline
        const series = disastersByType
          .filter((d) => d.year >= 1990 && d.year <= latestYear)
          .map((d) => ({ year: d.year, value: typeof d[emdatLabel] === "number" ? (d[emdatLabel] as number) : 0 }));
        return {
          gdacsType,
          label: EVENT_LABELS[gdacsType] || emdatLabel,
          emdatLabel,
          currentCount,
          recentAvg,
          priorAvg,
          pctChange,
          latestYear,
          series,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [disastersByType, counts]);

  return (
    <div>
      {/* 1. Alert-level summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{alertCounts.Red}</div>
          <div className="text-xs text-red-400/70 uppercase">Red Alert</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{alertCounts.Orange}</div>
          <div className="text-xs text-orange-400/70 uppercase">Amber Alert</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{alertCounts.Green}</div>
          <div className="text-xs text-emerald-400/70 uppercase">Green Alert</div>
        </div>
      </div>

      {/* 2. Map */}
      <div className="mb-6">
        <EventsMap events={sorted} />
      </div>

      {/* 3. Key active events/clusters + Red/Amber singletons, expandable full list */}
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {hotspots.length > 0 ? "Key active events/clusters" : "Active events"}
      </h4>
        {hotspots.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            {hotspots.map((h, i) => {
              const clusterKey = `${h.country}|${h.type}`;
              const isExpanded = expandedCluster === clusterKey;
              const pctOfFeed = Math.round((h.count / events.length) * 100);
              const dominantAlert =
                (h.alerts.Red || 0) > 0 ? "Red" : (h.alerts.Orange || 0) > 0 ? "Orange" : "Green";
              const dateRange =
                h.earliest && h.latest && h.earliest !== h.latest
                  ? `${fmtShort(h.earliest)} → ${fmtShort(h.latest)}`
                  : fmtShort(h.earliest);
              const clusterEvents = events
                .filter((e) => (e.country || "—") === h.country && e.type === h.type)
                .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
              return (
                <div
                  key={i}
                  className={`rounded-xl border ${ALERT_COLORS[dominantAlert] || "bg-gray-800/30 text-gray-300 border-gray-700"}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCluster(isExpanded ? null : clusterKey)}
                    className="w-full text-left p-3 hover:bg-gray-900/30 transition-colors rounded-xl"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0">{EVENT_ICONS[h.type]}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {h.count}× {EVENT_LABELS[h.type] || h.type} - {h.country}
                          </div>
                          <div className="text-xs opacity-70 mt-0.5">
                            {dateRange}
                            {pctOfFeed >= 20 && (
                              <span className="ml-1.5 opacity-80">· {pctOfFeed}% of all active alerts</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(["Red", "Orange", "Green"] as const).map((lvl) =>
                          h.alerts[lvl] ? (
                            <span
                              key={lvl}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${ALERT_COLORS[lvl]}`}
                              title={`${h.alerts[lvl]} ${lvl === "Orange" ? "Amber" : lvl} alert${h.alerts[lvl] === 1 ? "" : "s"}`}
                            >
                              {h.alerts[lvl]}
                            </span>
                          ) : null,
                        )}
                        <span className="text-xs opacity-60 ml-1 font-mono">{isExpanded ? "▾" : "▸"}</span>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-current/10 px-3 pt-2 pb-3 space-y-1.5">
                      {clusterEvents.map((e, j) => (
                        <a
                          key={j}
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs hover:underline"
                        >
                          <span className="opacity-90">{e.name}</span>
                          <span className="opacity-60">
                            {" · "}
                            {new Date(e.fromDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                          <ExternalLink className="inline w-3 h-3 ml-1 opacity-40" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Toggle: show all events */}
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-mono text-[#D0A65E] hover:text-amber-300 underline decoration-dotted underline-offset-2"
        >
          {showAll ? "▾ Hide full list" : `▸ Show all ${events.length} active events`}
        </button>

        {showAll && (
          <div className="mt-4">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 mb-3">
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
        )}
    </div>
  );
}

/* ─── Long-term trends (EM-DAT, decade-vs-decade per active type) ────────── */

function LongTermTrendsSection({
  events,
  disastersByType,
}: {
  events: GDACSEvent[];
  disastersByType: YearlyByType[];
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.type] = (c[e.type] || 0) + 1;
    return c;
  }, [events]);

  const historicalContext = useMemo(() => {
    if (!disastersByType?.length) return [];
    const years = disastersByType.map((d) => d.year);
    const latestYear = Math.max(...years);
    const recentWindow = disastersByType.filter((d) => d.year >= latestYear - 9 && d.year <= latestYear);
    const priorWindow = disastersByType.filter((d) => d.year >= latestYear - 19 && d.year <= latestYear - 10);
    const avg = (rows: YearlyByType[], key: string) => {
      const vals = rows.map((r) => (typeof r[key] === "number" ? (r[key] as number) : 0));
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };
    const active = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return active
      .map(([gdacsType]) => {
        const emdatLabel = GDACS_TO_EMDAT[gdacsType];
        if (!emdatLabel) return null;
        const recentAvg = avg(recentWindow, emdatLabel);
        const priorAvg = avg(priorWindow, emdatLabel);
        if (recentAvg === 0 && priorAvg === 0) return null;
        const pctChange = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : null;
        const series = disastersByType
          .filter((d) => d.year >= 1990 && d.year <= latestYear)
          .map((d) => ({ year: d.year, value: typeof d[emdatLabel] === "number" ? (d[emdatLabel] as number) : 0 }));
        return {
          gdacsType,
          label: EVENT_LABELS[gdacsType] || emdatLabel,
          emdatLabel,
          recentAvg,
          priorAvg,
          pctChange,
          latestYear,
          series,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [disastersByType, counts]);

  if (historicalContext.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-2">
        {historicalContext.map((h) => {
          const trendUp = h.pctChange != null && h.pctChange >= 15;
          const trendDown = h.pctChange != null && h.pctChange <= -15;
          const trendColor = trendUp ? "text-red-400" : trendDown ? "text-emerald-400" : "text-gray-400";
          const sparkStroke = trendUp ? "#f87171" : trendDown ? "#34d399" : "#9ca3af";
          const sparkFill = trendUp ? "#7f1d1d" : trendDown ? "#064e3b" : "#374151";
          const arrow = trendUp ? "↑" : trendDown ? "↓" : "→";
          const pctText =
            h.pctChange == null
              ? "no prior decade data"
              : `${h.pctChange >= 0 ? "+" : ""}${Math.round(h.pctChange)}%`;
          const recent = h.recentAvg < 10 ? h.recentAvg.toFixed(1) : Math.round(h.recentAvg);
          const prior = h.priorAvg < 10 ? h.priorAvg.toFixed(1) : Math.round(h.priorAvg);
          const startYear = h.series[0]?.year;
          const endYear = h.series[h.series.length - 1]?.year;
          return (
            <div key={h.gdacsType} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider mb-2">
                {EVENT_ICONS[h.gdacsType]}
                <span>{h.label}</span>
              </div>
              <div className={`text-xl font-bold leading-tight ${trendColor}`}>
                <span className="font-mono">{arrow}</span> {pctText}
              </div>
              <div className="text-xs text-gray-400 mt-1">vs prior decade</div>
              <div className="text-xs text-gray-300 mt-2 leading-relaxed">
                <span className="font-semibold text-white">{recent}</span>/yr now
                <span className="text-gray-500 mx-1">·</span>
                <span className="text-gray-400">{prior}/yr then</span>
              </div>
              {h.series.length > 0 && (
                <div className="mt-2">
                  <div className="h-[48px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={h.series} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <defs>
                          <linearGradient id={`spark-${h.gdacsType}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={sparkStroke} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={sparkFill} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip
                          cursor={{ stroke: "#4b5563", strokeWidth: 1 }}
                          contentStyle={{ background: "#030712", border: "1px solid #374151", borderRadius: 6, fontSize: 11, padding: "4px 8px" }}
                          labelStyle={{ color: "#e5e7eb" }}
                          itemStyle={{ color: sparkStroke }}
                          formatter={(v: any) => [`${v} events`, h.label]}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={sparkStroke}
                          strokeWidth={1.5}
                          fill={`url(#spark-${h.gdacsType})`}
                          isAnimationActive={false}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-0.5">
                    <span>{startYear}</span>
                    <span>{endYear}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Comparing the last decade ({historicalContext[0].latestYear - 9}–{historicalContext[0].latestYear}) with the ten years before, using annual counts of qualifying disasters (≥10 deaths, ≥100 affected, or state of emergency) from{" "}
        <a href="https://www.emdat.be/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">EM-DAT</a>{" "}
        via{" "}
        <a href="https://ourworldindata.org/natural-disasters" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a>. EM-DAT uses a higher severity threshold than the GDACS live alerts, so the two datasets should not be compared directly.
      </p>
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
          <div className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
            <div className="px-4 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
                Extreme Weather Events
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
            <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
              Tracking extreme weather events worldwide – from historical trends to live alerts today.
            </p>
            </div>
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
              <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D0A65E] p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-orange-400 animate-pulse" />
                  <h2 className="text-lg font-bold font-mono text-white">Key Facts ({stats.latest?.year || "–"})</h2>
                  <span className="ml-auto text-xs text-gray-400">
                    Updated {new Date(data.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Disasters"
                  value={stats.latest?.value?.toLocaleString() || "–"}
                  unit="events"
                  color="text-orange-400"
                />
                <StatCard
                  label="Deaths"
                  value={stats.latestDeaths?.value?.toLocaleString() || "–"}
                  unit="people"
                  color="text-red-400"
                />
                <StatCard
                  label="Affected"
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
                  label="Damages"
                  value={
                    stats.latestDamages?.value
                      ? `$${(stats.latestDamages.value / 1e9).toFixed(0)}B`
                      : "–"
                  }
                  unit="USD"
                  color="text-emerald-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Source:{" "}
                <a href="https://ourworldindata.org/natural-disasters" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a>{" "}
                / <a href="https://www.emdat.be/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">EM-DAT</a>{" "}
                (CRED International Disaster Database).
              </p>
              </div>

              {/* ─── Live GDACS Alerts ──────────────────────────────── */}
              {data.gdacsEvents.length > 0 && (() => {
                const hasRed = data.gdacsEvents.some((e: GDACSEvent) => e.alertLevel === "Red");
                const hasOrange = data.gdacsEvents.some((e: GDACSEvent) => e.alertLevel === "Orange");
                const alertColor = hasRed ? "text-red-400" : hasOrange ? "text-orange-400" : "text-emerald-400";
                return (
                <>
                <SectionCard icon={<Activity className={`${alertColor} animate-pulse`} />} title="Extreme Weather – Live Events">
                  <LiveEventsSection events={data.gdacsEvents} disastersByType={data.disastersByType} />
                  <p className="text-xs text-gray-400 mt-4">
                    Real-time alerts from{" "}
                    <a href="https://www.gdacs.org/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                      GDACS <ExternalLink className="inline w-3 h-3" />
                    </a>{" "}
                    (EU/JRC) – last 12 months.
                  </p>
                </SectionCard>
                <SectionCard icon={<CloudLightning />} title="Extreme Weather – Long-Term Trends">
                  <LongTermTrendsSection events={data.gdacsEvents} disastersByType={data.disastersByType} />
                </SectionCard>
                </>
                );
              })()}

              {/* ─── Disasters by Type ─────────────────────────────── */}
              <SectionCard icon={<CloudLightning />} title="Extreme Weather by Type">
                <StackedTypeChart data={data.disastersByType} title="Recorded Extreme Weather Events per Year" yLabel="Events" />
                <p className="text-xs text-gray-400 mt-4">
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
                <p className="text-xs text-gray-400 mt-4">
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
                <p className="text-xs text-gray-400 mt-4">
                  Annual totals for disasters, deaths, people affected, and economic damage. Source:{" "}
                  <a href="https://www.emdat.be/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">EM-DAT</a>{" "}
                  via{" "}
                  <a href="https://ourworldindata.org/natural-disasters" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Our World in Data</a>.
                </p>
              </SectionCard>

              {/* ─── Top 10 Most-Hit Countries ──────────────────── */}
              <Top10Countries />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
