"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoArea } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface IceData {
  [year: string]: FeatureCollection;
}

export const ICE_YEARS = ["1979","1985","1990","1995","2000","2005","2010","2012","2015","2020","2024"];
const YEARS = ICE_YEARS;

const YEAR_COLORS: Record<string, string> = {
  "1979": "#e0f2fe",
  "1985": "#bae6fd",
  "1990": "#7dd3fc",
  "1995": "#38bdf8",
  "2000": "#0ea5e9",
  "2005": "#0284c7",
  "2010": "#0369a1",
  "2012": "#075985",
  "2015": "#0c4a6e",
  "2020": "#164e63",
  "2024": "#134e4a",
};

const STROKE_COLORS: Record<string, string> = {
  "1979": "#bae6fd",
  "1985": "#7dd3fc",
  "1990": "#38bdf8",
  "1995": "#0ea5e9",
  "2000": "#0284c7",
  "2005": "#0369a1",
  "2010": "#075985",
  "2012": "#0c4a6e",
  "2015": "#164e63",
  "2020": "#134e4a",
  "2024": "#115e59",
};

/* ─── Fix spherical winding using D3's geoArea ─────────────────────────── */
function reverseRings(geom: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geom.type === "Polygon") {
    return { ...geom, coordinates: geom.coordinates.map((r) => [...r].reverse()) };
  }
  if (geom.type === "MultiPolygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly) =>
        poly.map((r) => [...r].reverse()),
      ),
    };
  }
  return geom;
}

function fixIceWinding(data: IceData): IceData {
  const fixed: IceData = {};
  for (const year of Object.keys(data)) {
    const fc = data[year];
    const fixedFeatures = fc.features.map((f) => {
      const area = geoArea(f.geometry as any);
      if (area > 2 * Math.PI) {
        return { ...f, geometry: reverseRings(f.geometry) };
      }
      return f;
    });
    fixed[year] = { ...fc, features: fixedFeatures } as FeatureCollection;
  }
  return fixed;
}

/* ─── Single-pole globe renderer ───────────────────────────────────────── */

interface PoleGlobeProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  iceData: IceData;
  landData: FeatureCollection;
  yearIdx: number;
  rotation: [number, number];
  label: string;
}

function PoleGlobe({ canvasRef, iceData, landData, yearIdx, rotation, label }: PoleGlobeProps) {
  const currentYear = YEARS[yearIdx];

  // Render on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = canvas.parentElement;
    const w = container ? container.clientWidth : 400;
    const h = w; // square
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const size = Math.min(w, h);
    const projection = geoOrthographic()
      .rotate(rotation)
      .translate([w / 2, h / 2])
      .scale(size * 0.46)
      .clipAngle(90);

    const path = geoPath(projection, ctx);
    const graticule = geoGraticule().step([30, 10]);

    ctx.clearRect(0, 0, w, h);

    // Ocean
    const center = projection.translate();
    const r = projection.scale();
    ctx.beginPath();
    ctx.arc(center[0], center[1], r, 0, Math.PI * 2);
    ctx.fillStyle = "#0c1222";
    ctx.fill();

    // Graticule
    ctx.beginPath();
    path(graticule());
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Land
    ctx.beginPath();
    path(landData as any);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Ice
    const geo = iceData[currentYear];
    if (geo) {
      ctx.beginPath();
      path(geo as any);
      ctx.fillStyle = "#e0f2fe";
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }

    // Globe outline
    ctx.beginPath();
    ctx.arc(center[0], center[1], r, 0, Math.PI * 2);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [canvasRef, iceData, landData, yearIdx, rotation, currentYear]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-[#060d1a] flex-1 min-w-0">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ aspectRatio: "1/1" }}
      />
      {/* Label */}
      <div className="absolute top-1.5 left-1.5 z-10 bg-gray-950/70 backdrop-blur-sm border border-gray-700/50 rounded px-1.5 py-0.5">
        <div className="text-[8px] text-gray-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

/* ─── Main dual-globe component ────────────────────────────────────────── */

export default function ArcticIceMap({ onYearChange }: { onYearChange?: (year: string) => void } = {}) {
  const arcticCanvasRef = useRef<HTMLCanvasElement>(null);
  const antarcticCanvasRef = useRef<HTMLCanvasElement>(null);
  const [arcticIce, setArcticIce] = useState<IceData | null>(null);
  const [antarcticIce, setAntarcticIce] = useState<IceData | null>(null);
  const [landData, setLandData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearIdx, setYearIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [arcticRot] = useState<[number, number]>([0, -90]);
  const [antarcticRot] = useState<[number, number]>([0, 90]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load data
  useEffect(() => {
    Promise.all([
      fetch("/data/arctic-ice-extent.json").then((r) => r.json()),
      fetch("/data/antarctic-ice-extent.json").then((r) => r.json()),
      fetch("/data/world-countries.json").then((r) => r.json()),
    ])
      .then(([arctic, antarctic, land]) => {
        setArcticIce(arctic);
        setAntarcticIce(fixIceWinding(antarctic));
        setLandData(land);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Playback
  const stopPlay = useCallback(() => {
    setPlaying(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startPlay = useCallback(() => {
    stopPlay();
    setPlaying(true);
    intervalRef.current = setInterval(() => {
      setYearIdx((prev) => (prev >= YEARS.length - 1 ? 0 : prev + 1));
    }, 1200);
  }, [stopPlay]);

  // Notify parent of year changes
  useEffect(() => { onYearChange?.(YEARS[yearIdx]); }, [yearIdx, onYearChange]);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const currentYear = YEARS[yearIdx];

  if (loading) {
    return (
      <div className="h-[300px] w-full rounded-xl bg-gray-900/50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!arcticIce || !antarcticIce || !landData) {
    return (
      <div className="h-[300px] w-full rounded-xl bg-gray-900/50 flex items-center justify-center text-gray-500">
        Failed to load ice extent data
      </div>
    );
  }

  return (
    <div>
      {/* Dual globes */}
      <div className="flex gap-3">
        <PoleGlobe
          canvasRef={arcticCanvasRef}
          iceData={arcticIce}
          landData={landData}
          yearIdx={yearIdx}
          rotation={arcticRot}
          label="Arctic (North)"
        />
        <PoleGlobe
          canvasRef={antarcticCanvasRef}
          iceData={antarcticIce}
          landData={landData}
          yearIdx={yearIdx}
          rotation={antarcticRot}
          label="Antarctic (South)"
        />
      </div>

      {/* Shared controls */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { stopPlay(); setYearIdx(0); }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            aria-label="Go to start"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => { stopPlay(); setYearIdx((p) => Math.max(0, p - 1)); }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            aria-label="Previous year"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
          </button>
          <button
            onClick={playing ? stopPlay : startPlay}
            className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg shadow-cyan-900/50"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            onClick={() => { stopPlay(); setYearIdx((p) => Math.min(YEARS.length - 1, p + 1)); }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            aria-label="Next year"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
          </button>
          <button
            onClick={() => { stopPlay(); setYearIdx(YEARS.length - 1); }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            aria-label="Go to end"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline slider */}
        <div className="px-1">
          <input
            type="range"
            min={0}
            max={YEARS.length - 1}
            value={yearIdx}
            onChange={(e) => { stopPlay(); setYearIdx(Number(e.target.value)); }}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1 px-0.5">
            {YEARS.map((y) => (
              <span key={y} className={y === currentYear ? "text-cyan-400 font-bold" : ""}>{y}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
