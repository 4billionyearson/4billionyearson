"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Thermometer,
  Trees,
  Droplets,
  Bug,
  Waves,
  Wind,
  Shield,
  FlaskConical,
  Cloudy,
  Activity,
  ExternalLink,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface LiveData {
  co2: { value: number; trend: number; date: string } | null;
  temperature: { anomaly: number; date: string; history: { year: number; anomaly: number }[] } | null;
  methane: { value: number; trend: number; date: string } | null;
  n2o: { value: number; trend: number; date: string } | null;
  arcticIce: { extent: number; anomaly: number; date: string } | null;
  oceanWarming: { anomaly: number; year: string } | null;
  fetchedAt: string;
}

type Status = "transgressed" | "increasing-risk" | "safe";

interface Boundary {
  id: number;
  name: string;
  status: Status;
  icon: React.ReactNode;
  controlVariable: string;
  boundaryValue: string;
  currentValue: string;
  preindustrial: string;
  description: string;
  details: string;
  liveKey?: keyof LiveData;
  color: string;
}

/* ─── Static boundary data ───────────────────────────────────────────────── */

const boundaries: Boundary[] = [
  {
    id: 1,
    name: "Carbon Dioxide (CO\u2082)",
    status: "transgressed",
    icon: <Thermometer className="w-7 h-7" />,
    controlVariable: "Atmospheric CO₂ concentration",
    boundaryValue: "350 ppm",
    currentValue: "423 ppm",
    preindustrial: "280 ppm",
    description:
      "The concentration of carbon dioxide in the atmosphere has surpassed safe limits, driving unprecedented global warming and destabilising Earth's climate systems.",
    details:
      "CO₂ levels have risen 51% above pre-industrial levels and are 21% beyond the safe boundary of 350 ppm. The associated radiative forcing of +2.97 W/m² is nearly three times the boundary of +1 W/m². This is driving accelerating ice sheet loss, sea level rise, and extreme weather events.",
    liveKey: "co2",
    color: "#ef4444",
  },
  {
    id: 2,
    name: "Biosphere Integrity",
    status: "transgressed",
    icon: <Bug className="w-7 h-7" />,
    controlVariable: "Extinction rate (E/MSY)",
    boundaryValue: "<10 E/MSY",
    currentValue: ">100 E/MSY",
    preindustrial: "1 E/MSY",
    description:
      "Species are going extinct at more than 100 times the natural background rate — the most dramatic loss of life since the dinosaurs disappeared 66 million years ago.",
    details:
      "Both genetic diversity (extinction rate >100x backdrop) and functional diversity (30% of net primary production appropriated by humans vs 10% boundary) are critically transgressed. Biodiversity underpins every ecosystem service humanity depends on, from pollination to water purification.",
    color: "#a855f7",
  },
  {
    id: 3,
    name: "Land-System Change",
    status: "transgressed",
    icon: <Trees className="w-7 h-7" />,
    controlVariable: "Global forest cover remaining",
    boundaryValue: "75%",
    currentValue: "59%",
    preindustrial: "~100%",
    description:
      "Forests, wetlands and other natural ecosystems are being converted to farmland and urban areas faster than they can recover, disrupting carbon, water and nutrient cycles.",
    details:
      "Only 59% of the world's original forest cover remains intact, well below the 75% boundary. Tropical and boreal forests — critical carbon sinks and biodiversity reservoirs — are under the greatest pressure. Deforestation accounts for ~10% of global CO₂ emissions.",
    color: "#22c55e",
  },
  {
    id: 4,
    name: "Freshwater Change",
    status: "transgressed",
    icon: <Droplets className="w-7 h-7" />,
    controlVariable: "Blue & green water deviation",
    boundaryValue: "Blue: 12.9% / Green: 12.4%",
    currentValue: "Blue: 22.6% / Green: 22.0%",
    preindustrial: "Blue: 9.4% / Green: 9.8%",
    description:
      "Human alteration of river flows, groundwater extraction, and disruption of soil moisture is destabilising the global freshwater cycle far beyond safe limits.",
    details:
      "Both blue water (rivers, lakes, groundwater) and green water (soil moisture, rainfall) boundaries are transgressed. Over-extraction for agriculture, industry and urban use is depleting aquifers, drying rivers and shifting precipitation patterns at regional and global scales.",
    color: "#3b82f6",
  },
  {
    id: 5,
    name: "Biogeochemical Flows",
    status: "transgressed",
    icon: <FlaskConical className="w-7 h-7" />,
    controlVariable: "Nitrogen & phosphorus flows",
    boundaryValue: "N: 62 Tg/yr · P: 11 Tg/yr",
    currentValue: "N: 165 Tg/yr · P: 18.2 Tg/yr (regional)",
    preindustrial: "0",
    description:
      "Industrial fertiliser production has flooded ecosystems with reactive nitrogen and phosphorus, creating ocean dead zones and toxic algal blooms worldwide.",
    details:
      "Nitrogen fixation is 2.7× the safe boundary, making this one of the most severely transgressed boundaries. Phosphorus flows to soils exceed the boundary by 3×. Excess nutrients drive eutrophication, creating over 400 coastal dead zones globally and threatening drinking water sources.",
    color: "#f97316",
  },
  {
    id: 6,
    name: "Ocean Acidification",
    status: "transgressed",
    icon: <Waves className="w-7 h-7" />,
    controlVariable: "Aragonite saturation state (Ω)",
    boundaryValue: "≥2.86 Ω",
    currentValue: "2.84 Ω",
    preindustrial: "3.44 Ω",
    description:
      "The ocean has absorbed so much CO₂ that its chemistry is changing, becoming more acidic and threatening the survival of coral reefs, shellfish and marine food chains.",
    details:
      "As of 2025, ocean acidification has crossed the planetary boundary for the first time. Surface ocean pH has fallen by 0.1 units since pre-industrial times (a 26% increase in acidity). Coral reefs, which support ~25% of all marine species, face dissolution if trends continue. This is now the 7th confirmed transgressed boundary.",
    liveKey: "oceanWarming",
    color: "#06b6d4",
  },
  {
    id: 7,
    name: "Novel Entities",
    status: "transgressed",
    icon: <FlaskConical className="w-7 h-7" />,
    controlVariable: "Chemical pollution release",
    boundaryValue: "Within safe testing limits",
    currentValue: "Transgressed",
    preindustrial: "0",
    description:
      "Over 350,000 synthetic chemicals — plastics, pesticides, PFAS 'forever chemicals' and more — are being released into the environment faster than we can assess their safety.",
    details:
      "Chemical production has increased 50-fold since 1950 and is projected to triple again by 2050. PFAS contamination is now found in rainwater worldwide at levels exceeding safety guidelines. Plastics alone contain >10,000 chemicals. In January 2022, scientists confirmed this boundary has been exceeded.",
    color: "#ec4899",
  },
  {
    id: 8,
    name: "Atmospheric Aerosol Loading",
    status: "safe",
    icon: <Cloudy className="w-7 h-7" />,
    controlVariable: "Interhemispheric difference in AOD",
    boundaryValue: "0.1",
    currentValue: "0.063",
    preindustrial: "0.03",
    description:
      "Airborne particles from burning fossil fuels and biomass affect climate, monsoon patterns and human health — but globally this boundary remains within safe limits.",
    details:
      "While the global boundary is not yet transgressed (0.063 vs 0.1 limit), aerosol pollution causes ~800,000 premature deaths per year. Regional hotspots in South and East Asia experience severe air quality issues that affect monsoon patterns and crop yields. This boundary is difficult to quantify globally.",
    color: "#64748b",
  },
  {
    id: 9,
    name: "Stratospheric Ozone Depletion",
    status: "safe",
    icon: <Shield className="w-7 h-7" />,
    controlVariable: "Stratospheric O₃ concentration",
    boundaryValue: "277 DU",
    currentValue: "285.7 DU",
    preindustrial: "290 DU",
    description:
      "Thanks to the 1987 Montreal Protocol — the most successful environmental treaty in history — the ozone layer is recovering and this boundary remains within safe limits.",
    details:
      "The ozone layer protects life from harmful UV radiation. After the discovery of the Antarctic ozone hole, the Montreal Protocol banned CFCs and related chemicals. The ozone layer is now on track to fully recover by ~2066. This success story demonstrates that coordinated global action on planetary boundaries is possible.",
    color: "#8b5cf6",
  },
];

/* ─── Status helpers ─────────────────────────────────────────────────────── */

function statusLabel(s: Status) {
  switch (s) {
    case "transgressed":
      return "Boundary Crossed";
    case "increasing-risk":
      return "Increasing Risk";
    case "safe":
      return "Within Safe Limits";
  }
}

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "transgressed":
      return <XCircle className="w-5 h-5 text-red-400" />;
    case "increasing-risk":
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    case "safe":
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  }
}

function statusBorder(s: Status) {
  switch (s) {
    case "transgressed":
      return "border-red-500/40";
    case "increasing-risk":
      return "border-yellow-500/40";
    case "safe":
      return "border-emerald-500/40";
  }
}

function statusGlow(s: Status) {
  switch (s) {
    case "transgressed":
      return "shadow-red-500/10";
    case "increasing-risk":
      return "shadow-yellow-500/10";
    case "safe":
      return "shadow-emerald-500/10";
  }
}

function statusText(s: Status) {
  switch (s) {
    case "transgressed":
      return "text-red-400";
    case "increasing-risk":
      return "text-yellow-400";
    case "safe":
      return "text-emerald-400";
  }
}

/* ─── Live metric display ────────────────────────────────────────────────── */

function LiveMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2">
      <Activity className="w-4 h-4 text-green-400 animate-pulse" />
      <span className="text-xs text-gray-400">{label}:</span>
      <span className="text-sm font-semibold text-white">
        {value}
        {unit && <span className="text-gray-400 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

/* ─── Gauge bar ──────────────────────────────────────────────────────────── */

function GaugeBar({
  preindustrial,
  boundary,
  current,
  color,
}: {
  preindustrial: number;
  boundary: number;
  current: number;
  color: string;
}) {
  const max = Math.max(current, boundary) * 1.15;
  const boundaryPct = ((boundary - preindustrial) / (max - preindustrial)) * 100;
  const currentPct = Math.min(
    ((current - preindustrial) / (max - preindustrial)) * 100,
    100
  );

  return (
    <div className="w-full mt-3">
      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
        {/* Safe zone */}
        <div
          className="absolute inset-y-0 left-0 bg-emerald-900/60 rounded-l-full"
          style={{ width: `${boundaryPct}%` }}
        />
        {/* Current level */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{
            width: `${currentPct}%`,
            background: `linear-gradient(90deg, ${color}44, ${color})`,
          }}
        />
        {/* Boundary marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white/80"
          style={{ left: `${boundaryPct}%` }}
        />
      </div>
      {/* Boundary label */}
      <div className="relative h-4 mt-0.5 text-[10px]">
        <span
          className="absolute text-gray-400 whitespace-nowrap"
          style={{ left: `${boundaryPct}%`, transform: 'translateX(-50%)' }}
        >
          Boundary
        </span>
      </div>
    </div>
  );
}

/* ─── Gauge-compatible boundaries ────────────────────────────────────────── */

const gaugeData: Record<
  number,
  { preindustrial: number; boundary: number; current: number }
> = {
  1: { preindustrial: 280, boundary: 350, current: 423 }, // CO2 ppm
  2: { preindustrial: 1, boundary: 10, current: 100 }, // Extinction rate E/MSY
  3: { preindustrial: 100, boundary: 75, current: 59 }, // Forest % — inverse
  5: { preindustrial: 0, boundary: 62, current: 165 }, // Nitrogen Tg/yr
  6: { preindustrial: 3.44, boundary: 2.86, current: 2.84 }, // Aragonite — inverse
  9: { preindustrial: 290, boundary: 277, current: 285.7 }, // Ozone DU — inverse
};

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function PlanetaryBoundariesPage() {
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/climate/planetary-boundaries")
      .then((r) => r.json())
      .then((d) => setLiveData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const transgressedCount = boundaries.filter(
    (b) => b.status === "transgressed"
  ).length;

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section>
        <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 text-gray-200">
         <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border border-gray-800 p-4 md:p-6 shadow-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-red-400 font-mono mb-4">
            Climate Change
          </p>
          <h1 className="text-4xl md:text-6xl font-bold font-mono tracking-wide text-white leading-tight mb-6">
            The Nine Planetary{" "}
            <span className="bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
              Boundaries
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl leading-relaxed mb-8">
            In 2009, a team of Earth system scientists led by{" "}
            <span className="text-white font-medium">Johan Rockström</span>{" "}
            identified nine processes that regulate the stability of the Earth
            system. Together they define a{" "}
            <span className="text-white font-medium">
              &ldquo;safe operating space&rdquo;
            </span>{" "}
            for humanity — thresholds that, once crossed, risk triggering
            abrupt, irreversible environmental change.
          </p>

          {/* Summary counters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-red-950/50 border border-red-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-400" />
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {transgressedCount}
                </div>
                <div className="text-xs text-red-300/70 uppercase tracking-wider">
                  Boundaries Crossed
                </div>
              </div>
            </div>
            <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-emerald-400">
                  {9 - transgressedCount}
                </div>
                <div className="text-xs text-emerald-300/70 uppercase tracking-wider">
                  Within Safe Limits
                </div>
              </div>
            </div>
          </div>

          {/* ── Temperature Anomaly expanded section ── */}
          {liveData?.temperature && (
            <div className="mt-6 bg-gray-900/60 border border-orange-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Thermometer className="w-5 h-5 text-orange-400" />
                <h3 className="text-white font-semibold font-mono">
                  Global Temperature Anomaly
                </h3>
              </div>

              {/* Context & targets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    Paris Target
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    +1.5 <span className="text-xs font-normal text-gray-400">°C</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Above pre-industrial
                  </div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    Paris Upper Limit
                  </div>
                  <div className="text-lg font-bold text-amber-400">
                    +2.0 <span className="text-xs font-normal text-gray-400">°C</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    &ldquo;Well below&rdquo; goal
                  </div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3 border border-orange-500/30">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    Current Anomaly
                  </div>
                  <div className="text-lg font-bold text-orange-400">
                    +{Math.abs(liveData.temperature.anomaly).toFixed(2)}{" "}
                    <span className="text-xs font-normal text-gray-400">°C</span>
                  </div>
                  <div className="text-[10px] text-orange-400/70">
                    {liveData.temperature.anomaly >= 1.5 ? "Exceeds Paris 1.5°C target" : `${(1.5 - liveData.temperature.anomaly).toFixed(2)}°C from Paris target`}
                  </div>
                </div>
              </div>

              {/* Mini sparkline chart using SVG */}
              {liveData.temperature.history?.length > 5 && (() => {
                const hist = liveData.temperature!.history;
                const minY = Math.min(...hist.map(h => h.anomaly));
                const maxY = Math.max(...hist.map(h => h.anomaly), 2);
                const range = maxY - minY || 1;
                const w = 100; // percentage-based viewBox
                const h = 40;
                const points = hist.map((p, i) => {
                  const x = (i / (hist.length - 1)) * w;
                  const y = h - ((p.anomaly - minY) / range) * (h - 4) - 2;
                  return `${x},${y}`;
                });
                const parisY = h - ((1.5 - minY) / range) * (h - 4) - 2;
                const upperY = h - ((2.0 - minY) / range) * (h - 4) - 2;
                const firstYear = hist[0].year;
                const lastYear = hist[hist.length - 1].year;
                const midYear = hist[Math.floor(hist.length / 2)].year;
                return (
                  <div>
                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
                      Annual Global Temperature Anomaly ({firstYear}–{lastYear})
                    </div>
                    <svg viewBox={`0 0 ${w} ${h + 6}`} className="w-full h-28" preserveAspectRatio="none">
                      {/* 1.5°C Paris target line */}
                      <line x1="0" y1={parisY} x2={w} y2={parisY} stroke="#10b981" strokeWidth="0.3" strokeDasharray="2,1" />
                      <text x={w - 1} y={parisY - 1} textAnchor="end" className="fill-emerald-500" style={{ fontSize: '2.5px' }}>1.5°C</text>
                      {/* 2.0°C upper limit line */}
                      <line x1="0" y1={upperY} x2={w} y2={upperY} stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="2,1" />
                      <text x={w - 1} y={upperY - 1} textAnchor="end" className="fill-amber-500" style={{ fontSize: '2.5px' }}>2.0°C</text>
                      {/* 0°C baseline */}
                      {minY < 0 && (() => {
                        const zeroY = h - ((0 - minY) / range) * (h - 4) - 2;
                        return <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#7A6E63" strokeWidth="0.2" strokeDasharray="1,1" />;
                      })()}
                      {/* Area fill */}
                      <polygon
                        points={`0,${h} ${points.join(' ')} ${w},${h}`}
                        fill="url(#tempGradient)"
                        opacity="0.3"
                      />
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#f9731600" />
                        </linearGradient>
                      </defs>
                      {/* Line */}
                      <polyline points={points.join(' ')} fill="none" stroke="#f97316" strokeWidth="0.5" />
                    </svg>
                    <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                      <span>{firstYear}</span>
                      <span>{midYear}</span>
                      <span>{lastYear}</span>
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-gray-500 mt-3">
                Data: NASA GISS Surface Temperature Analysis (GISTEMP) via NOAA &middot; Anomaly relative to 1951–1980 average
              </p>
            </div>
          )}

          <p className="text-sm text-gray-500 italic mt-6">
            Source: Stockholm Resilience Centre &middot; Planetary Health Check
            2025 &middot; Richardson et al. (2023)
          </p>
         </div>

      {/* ── Boundary cards ───────────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {boundaries.map((b) => {
            const expanded = expandedId === b.id;
            const gauge = gaugeData[b.id];
            // For inverted gauges (lower = worse), swap so bar makes visual sense
            const showGauge =
              gauge && b.id !== 3 && b.id !== 6 && b.id !== 9;
            return (
              <div
                key={b.id}
                className={`group rounded-2xl border ${statusBorder(
                  b.status
                )} bg-gray-950/90 backdrop-blur-md border-gray-800 shadow-lg ${statusGlow(
                  b.status
                )} hover:shadow-xl transition-all duration-300 cursor-pointer`}
                onClick={() => setExpandedId(expanded ? null : b.id)}
              >
                {/* Card header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-xl"
                        style={{ backgroundColor: `${b.color}20` }}
                      >
                        <span style={{ color: b.color }}>{b.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold font-mono text-white">
                          {b.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <StatusIcon status={b.status} />
                          <span
                            className={`text-xs font-medium ${statusText(
                              b.status
                            )}`}
                          >
                            {statusLabel(b.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 font-mono">
                      #{b.id}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300 leading-relaxed mb-4">
                    {b.description}
                  </p>

                  {/* Metric row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-900/80 rounded-lg py-2 px-1">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                        Pre-industrial
                      </div>
                      <div className="text-xs font-semibold text-gray-300">
                        {b.preindustrial}
                      </div>
                    </div>
                    <div className="bg-gray-900/80 rounded-lg py-2 px-1 border border-gray-700/50">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                        Boundary
                      </div>
                      <div className="text-xs font-semibold text-white">
                        {b.boundaryValue}
                      </div>
                    </div>
                    <div
                      className="rounded-lg py-2 px-1"
                      style={{
                        backgroundColor: `${b.color}15`,
                        border: `1px solid ${b.color}30`,
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                        Current
                      </div>
                      <div
                        className="text-xs font-semibold"
                        style={{ color: b.color }}
                      >
                        {b.liveKey === "co2" && liveData?.co2
                          ? `${liveData.co2.value.toFixed(1)} ppm`
                          : b.currentValue}
                      </div>
                    </div>
                  </div>

                  {/* Gauge bar for select boundaries */}
                  {showGauge && (
                    <GaugeBar
                      preindustrial={gauge.preindustrial}
                      boundary={gauge.boundary}
                      current={
                        b.liveKey === "co2" && liveData?.co2
                          ? liveData.co2.value
                          : gauge.current
                      }
                      color={b.color}
                    />
                  )}

                  {/* Live data indicators */}
                  {b.liveKey && liveData && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {b.liveKey === "co2" && liveData.co2 && (
                        <>
                          <LiveMetric
                            label="Live CO₂"
                            value={liveData.co2.value.toFixed(1)}
                            unit="ppm"
                          />
                          <LiveMetric
                            label="Trend"
                            value={liveData.co2.trend.toFixed(1)}
                            unit="ppm"
                          />
                        </>
                      )}
                      {b.liveKey === "oceanWarming" &&
                        liveData.oceanWarming && (
                          <LiveMetric
                            label={`Ocean anomaly (${liveData.oceanWarming.year})`}
                            value={`+${liveData.oceanWarming.anomaly.toFixed(
                              2
                            )}`}
                            unit="°C"
                          />
                        )}
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="px-6 pb-6 border-t border-gray-800 pt-4">
                    <p className="text-sm text-gray-400 leading-relaxed mb-3">
                      {b.details}
                    </p>
                    <div className="text-xs text-gray-600">
                      <span className="text-gray-500">Control variable:</span>{" "}
                      {b.controlVariable}
                    </div>

                    {/* Extra live data for climate change card */}
                    {b.id === 1 && liveData && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {liveData.methane && (
                          <LiveMetric
                            label="Methane"
                            value={liveData.methane.value.toFixed(1)}
                            unit="ppb"
                          />
                        )}
                        {liveData.n2o && (
                          <LiveMetric
                            label="N₂O"
                            value={liveData.n2o.value.toFixed(1)}
                            unit="ppb"
                          />
                        )}
                        {liveData.arcticIce && (
                          <LiveMetric
                            label="Sea ice extent"
                            value={liveData.arcticIce.extent.toFixed(1)}
                            unit="M km²"
                          />
                        )}
                        {liveData.temperature && (
                          <LiveMetric
                            label="Temp anomaly"
                            value={`+${Math.abs(
                              liveData.temperature.anomaly
                            ).toFixed(2)}`}
                            unit="°C"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Expand indicator */}
                <div className="px-6 pb-3 flex justify-center">
                  <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
                    {expanded ? "Click to collapse" : "Click for details"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Framework context ────────────────────────────────────────────── */}
      <div className="mt-6 bg-gray-950/90 backdrop-blur-md rounded-2xl border border-gray-800 p-4 md:p-6 shadow-xl">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold font-mono text-white mb-6">
              About the Planetary Boundaries Framework
            </h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                The Planetary Boundaries framework was first published in 2009
                by a group of 28 Earth system scientists led by{" "}
                <strong className="text-white">Johan Rockström</strong> of the
                Stockholm Resilience Centre and{" "}
                <strong className="text-white">Will Steffen</strong> of the
                Australian National University.
              </p>
              <p>
                For the past 10,000 years — the{" "}
                <strong className="text-white">Holocene</strong> epoch — Earth
                has remained in a remarkably stable environmental state. Human
                civilisation, agriculture, and technology all developed within
                this narrow window of stability. The framework identifies nine
                biophysical processes that maintain this stability and proposes
                quantitative limits for each.
              </p>
              <p>
                As of the latest scientific assessment (2025), seven of the
                nine boundaries have been transgressed: climate change,
                biosphere integrity, land-system change, freshwater change,
                biogeochemical flows, ocean acidification, and novel entities.
                Only atmospheric aerosol loading and stratospheric ozone
                depletion remain within safe limits.
              </p>
              <p>
                Crucially, these boundaries{" "}
                <strong className="text-white">interact</strong>. Crossing one
                boundary increases the risk of crossing others. Climate change
                and biosphere integrity are considered the two &ldquo;core
                boundaries&rdquo; because they fundamentally influence the
                state of all other processes.
              </p>
              <p>
                The ozone layer recovery — driven by the{" "}
                <strong className="text-white">Montreal Protocol</strong>{" "}
                (1987) — provides a powerful precedent: when the world acts
                decisively with clear scientific evidence, we can pull back
                from the brink.
              </p>
            </div>

            {/* Live data status */}
            {liveData && (
              <div className="mt-10 bg-gray-900/80 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                  <h3 className="text-white font-semibold font-mono">
                    Live Earth System Data
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {liveData.co2 && (
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Atmospheric CO₂
                      </div>
                      <div className="text-lg font-bold text-white">
                        {liveData.co2.value.toFixed(1)}{" "}
                        <span className="text-sm text-gray-400">ppm</span>
                      </div>
                    </div>
                  )}
                  {liveData.temperature && (
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Global Temp Anomaly
                      </div>
                      <div className="text-lg font-bold text-white">
                        +
                        {Math.abs(liveData.temperature.anomaly).toFixed(2)}{" "}
                        <span className="text-sm text-gray-400">°C</span>
                      </div>
                    </div>
                  )}
                  {liveData.methane && (
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Methane (CH₄)
                      </div>
                      <div className="text-lg font-bold text-white">
                        {liveData.methane.value.toFixed(0)}{" "}
                        <span className="text-sm text-gray-400">ppb</span>
                      </div>
                    </div>
                  )}
                  {liveData.n2o && (
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Nitrous Oxide (N₂O)
                      </div>
                      <div className="text-lg font-bold text-white">
                        {liveData.n2o.value.toFixed(1)}{" "}
                        <span className="text-sm text-gray-400">ppb</span>
                      </div>
                    </div>
                  )}
                  {liveData.arcticIce && (
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Sea Ice Extent
                      </div>
                      <div className="text-lg font-bold text-white">
                        {liveData.arcticIce.extent.toFixed(1)}{" "}
                        <span className="text-sm text-gray-400">M km²</span>
                      </div>
                      <div className="text-xs text-blue-400">
                        {liveData.arcticIce.anomaly > 0 ? "+" : ""}
                        {liveData.arcticIce.anomaly.toFixed(1)} vs avg
                      </div>
                    </div>
                  )}
                  {liveData.oceanWarming && (
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Ocean Warming ({liveData.oceanWarming.year})
                      </div>
                      <div className="text-lg font-bold text-white">
                        +{liveData.oceanWarming.anomaly.toFixed(2)}{" "}
                        <span className="text-sm text-gray-400">°C</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-4">
                  Data from NOAA, NASA GISS, and global monitoring stations
                  &middot; Updated{" "}
                  {loading
                    ? "..."
                    : liveData.fetchedAt
                    ? new Date(liveData.fetchedAt).toLocaleDateString()
                    : "recently"}
                </p>
              </div>
            )}

            {/* Attribution */}
            <div className="mt-10 pt-8 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Key References
              </h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Rockström et al. (2009). &ldquo;A safe operating space for
                    humanity.&rdquo; <em>Nature</em> 461, 472–475.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Steffen et al. (2015). &ldquo;Planetary boundaries: Guiding
                    human development on a changing planet.&rdquo;{" "}
                    <em>Science</em> 347(6223).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Richardson et al. (2023). &ldquo;Earth beyond six of nine
                    planetary boundaries.&rdquo; <em>Science Advances</em>{" "}
                    9(37).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Sakschewski et al. (2025). Planetary Health Check 2025.
                    Potsdam Institute for Climate Impact Research.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        </div>
      </section>
    </main>

  );
}
