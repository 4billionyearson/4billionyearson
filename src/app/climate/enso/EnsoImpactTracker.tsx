'use client';

/**
 * ENSO Global Impact Tracker
 * ──────────────────────────
 * A scrubbable timeline of the ENSO ONI index (1950→present) tied to a
 * world choropleth showing per-country temperature or rainfall anomalies
 * for the selected year. Four Niño SST regions are overlaid on top of
 * the equatorial Pacific so the reader can see *where* ENSO sits while
 * watching its global imprint.
 *
 * Data:
 *   - `/data/climate/enso-impact.json` — pre-computed anomalies per
 *     country, US state and UK region. Built by
 *     `scripts/build-enso-impact.mjs`. Contains two windows:
 *       annual — Jan–Dec mean (°C) / sum (% of baseline)
 *       mam    — Mar–May,  the lagged spring window after a DJF ENSO peak
 *   - ONI history is read from the `oniHistory` prop passed in from the
 *     ENSO page (already fetched there).
 *
 * Anomaly baseline: 1961–1990 (locked in build script).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Play, Pause, SkipBack, Thermometer, CloudRain } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

type OniRow = { season: string; year: number; anom: number };

type ImpactData = {
  baseline: [number, number];
  years: number[];
  countryNames: Record<string, string>; // ISO3 → geojson feature.name
  annual: {
    temp:   { country: Record<string, (number | null)[]> };
    precip: { country: Record<string, (number | null)[]> };
  };
  mam: {
    temp:   { country: Record<string, (number | null)[]> };
    precip: { country: Record<string, (number | null)[]> };
  };
};

type Metric = 'temp' | 'precip';
type AggWindow = 'annual' | 'mam';

/* ─────────────────────────────────────────────────────────────────────────
 *  Colour scale — diverging red/blue, transparent at zero so neutral land
 *  fades to the basemap. Temp scale: ±3°C. Rain scale: ±100% of baseline.
 * ───────────────────────────────────────────────────────────────────────── */
function fillFromAnomaly(v: number | null | undefined, metric: Metric): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return 'rgba(120,120,120,0.10)';
  const max = metric === 'temp' ? 3 : 100;
  // For precip, swap sign: more rain = blue (cool/wet), drought = red.
  const x = metric === 'precip' ? -v : v;
  const t = Math.max(-1, Math.min(1, x / max));
  if (t > 0) {
    // warm: 0 → rgba(255,255,255,0)  ·  1 → #b91c1c (rgb 185,28,28)
    const a = 0.15 + 0.65 * t;
    return `rgba(185,28,28,${a.toFixed(2)})`;
  } else {
    // cool: 0 → 0  ·  -1 → #1e40af (30,64,175)
    const a = 0.15 + 0.65 * (-t);
    return `rgba(30,64,175,${a.toFixed(2)})`;
  }
}

/** For a given calendar year, find the most extreme (by |anom|) seasonal ONI
 *  value in the history. Used to colour the four Niño rectangles for the
 *  scrubbed year. */
function peakOniForYear(history: OniRow[], year: number): number {
  let peak = 0;
  for (const r of history) {
    if (r.year !== year) continue;
    if (Math.abs(r.anom) > Math.abs(peak)) peak = r.anom;
  }
  return peak;
}

/** Convert a peak ONI anomaly into an ENSO state label. */
function ensoState(anom: number): 'El Niño' | 'La Niña' | 'Neutral' {
  if (anom >= 0.5) return 'El Niño';
  if (anom <= -0.5) return 'La Niña';
  return 'Neutral';
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Niño 1+2 / 3 / 3.4 / 4 region boxes (matches EnsoRegionMap.tsx).
 *  Longitudes use 0–360° so the Pacific stays contiguous.
 * ───────────────────────────────────────────────────────────────────────── */
const NINO_REGIONS = [
  { key: 'nino4',  label: 'Niño 4',   bounds: [[-5, 160], [5, 210]] as [[number, number], [number, number]] },
  { key: 'nino34', label: 'Niño 3.4', bounds: [[-5, 190], [5, 240]] as [[number, number], [number, number]] },
  { key: 'nino3',  label: 'Niño 3',   bounds: [[-5, 210], [5, 270]] as [[number, number], [number, number]] },
  { key: 'nino12', label: 'Niño 1+2', bounds: [[-10, 270], [0, 280]] as [[number, number], [number, number]] },
];

/* ─────────────────────────────────────────────────────────────────────────
 *  Dynamic Leaflet inner — must not SSR. Re-renders the GeoJSON choropleth
 *  and the four Niño rectangles when the parent updates `year`, `values`
 *  or `ensoAnom`. The map container itself never remounts.
 * ───────────────────────────────────────────────────────────────────────── */
type InnerProps = {
  values: Record<string, number | null>; // featureName → anomaly
  metric: Metric;
  year: number;
  ensoAnom: number;
};

const Inner = dynamic<InnerProps>(
  () => Promise.all([import('react-leaflet'), import('leaflet')]).then(([mod, L]) => {
    const { MapContainer, TileLayer, GeoJSON, Rectangle, Tooltip, useMap } = mod;
    type FC = GeoJSON.FeatureCollection;
    type Feature = GeoJSON.Feature;

    function FitOnce() {
      const map = useMap();
      useEffect(() => {
        map.invalidateSize();
        map.setView([15, 10], 2);
      }, [map]);
      return null;
    }

    function MapInner({ values, metric, year, ensoAnom }: InnerProps) {
      const [geo, setGeo] = useState<FC | null>(null);
      // Force the GeoJSON layer to re-paint when values change, because
      // Leaflet caches feature styles. We bump a key per year/metric.
      const styleKey = `${year}-${metric}`;

      useEffect(() => {
        fetch('/data/world-countries.json')
          .then((r) => r.json())
          .then((g: FC) => setGeo(g))
          .catch(() => undefined);
      }, []);

      const ensoFill = (() => {
        const mag = Math.min(1, Math.abs(ensoAnom) / 2.5);
        const a = 0.20 + 0.55 * mag;
        return ensoAnom >= 0 ? `rgba(244,63,94,${a.toFixed(2)})` : `rgba(14,165,233,${a.toFixed(2)})`;
      })();
      const ensoStroke = ensoAnom >= 0.5 ? '#fb7185' : ensoAnom <= -0.5 ? '#38bdf8' : '#94a3b8';

      const styleFor = (f: Feature | undefined) => {
        const name = (f?.properties as any)?.name as string | undefined;
        const v = name ? values[name] ?? null : null;
        return {
          fillColor: fillFromAnomaly(v, metric),
          fillOpacity: 1,
          color: 'rgba(255,255,255,0.25)',
          weight: 0.4,
        };
      };

      const onEach = (feature: Feature, layer: any) => {
        const name = (feature.properties as any)?.name as string | undefined;
        if (!name) return;
        const v = values[name];
        const label = v === null || v === undefined
          ? `${name} — no data`
          : metric === 'temp'
            ? `${name}: ${v >= 0 ? '+' : ''}${v.toFixed(2)}°C`
            : `${name}: ${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
        layer.bindTooltip(label, { sticky: true, className: 'enso-impact-tooltip' });
      };

      return (
        <MapContainer
          center={[15, 10]}
          zoom={2}
          minZoom={2}
          maxZoom={6}
          worldCopyJump={false}
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          scrollWheelZoom={true}
        >
          <FitOnce />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          {geo && (
            <GeoJSON
              key={styleKey}
              data={geo as any}
              style={styleFor as any}
              onEachFeature={onEach as any}
            />
          )}
          {NINO_REGIONS.map((r) => (
            <Rectangle
              key={r.key}
              bounds={r.bounds}
              pathOptions={{
                color: ensoStroke,
                weight: r.key === 'nino34' ? 2.2 : 1.2,
                fillColor: ensoFill,
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95} className="enso-nino-tooltip">
                {r.label} · {ensoState(ensoAnom)} {ensoAnom >= 0 ? '+' : ''}{ensoAnom.toFixed(2)}°C
              </Tooltip>
            </Rectangle>
          ))}
        </MapContainer>
      );
    }

    return MapInner;
  }),
  { ssr: false },
);

/* ─────────────────────────────────────────────────────────────────────────
 *  Scrubber strip — ONI bars 1950→present with a draggable playhead. Click
 *  or drag anywhere along the strip to jump. Bars are red/blue per the
 *  standard ENSO colour code, with brightness reflecting magnitude.
 * ───────────────────────────────────────────────────────────────────────── */
function Scrubber({
  history,
  year,
  onChange,
}: {
  history: OniRow[];
  year: number;
  onChange: (y: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Group ONI seasons by year to compute one peak-|anom| value per year so
  // each year gets one bar in the scrubber.
  const yearly = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of history) {
      const cur = m.get(r.year);
      if (cur === undefined || Math.abs(r.anom) > Math.abs(cur)) m.set(r.year, r.anom);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([y, v]) => ({ year: y, value: v }));
  }, [history]);

  const minY = yearly.length ? yearly[0].year : 1950;
  const maxY = yearly.length ? yearly[yearly.length - 1].year : 2025;
  const span = maxY - minY || 1;
  const W = 800;
  const H = 56;
  const mid = H / 2;
  const absMax = Math.max(...yearly.map((d) => Math.abs(d.value)), 2.5);
  const xFor = (y: number) => ((y - minY) / span) * W;

  // Convert a mouse/touch event into a year, clamped to [minY, maxY].
  const yearFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return year;
    const rect = el.getBoundingClientRect();
    const t = (clientX - rect.left) / Math.max(1, rect.width);
    const y = Math.round(minY + Math.max(0, Math.min(1, t)) * span);
    return Math.max(minY, Math.min(maxY, y));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    onChange(yearFromClientX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    onChange(yearFromClientX(e.clientX));
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className="relative w-full select-none cursor-ew-resize"
      style={{ height: H, touchAction: 'none' }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="block"
      >
        <line x1={0} y1={mid} x2={W} y2={mid} stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />
        {yearly.map((d) => {
          const x = xFor(d.year);
          const yTop = mid - (d.value / absMax) * (mid * 0.9);
          const c = d.value > 0.5 ? '#fb7185' : d.value < -0.5 ? '#38bdf8' : 'rgba(180,180,180,0.55)';
          return <line key={d.year} x1={x} y1={mid} x2={x} y2={yTop} stroke={c} strokeWidth={W / span * 0.7} strokeLinecap="butt" />;
        })}
        {/* Playhead */}
        <line x1={xFor(year)} y1={2} x2={xFor(year)} y2={H - 2} stroke="#D0A65E" strokeWidth={1.5} />
      </svg>
      {/* Year ticks (decade labels) over the SVG, in real pixels so they don't stretch. */}
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-gray-500 font-mono px-1 pointer-events-none">
        {[1950, 1970, 1990, 2010, maxY].map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Main tracker component
 * ───────────────────────────────────────────────────────────────────────── */
export default function EnsoImpactTracker({
  oniHistory,
}: {
  oniHistory: OniRow[];
}) {
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [year, setYear] = useState(1998); // super-El-Niño aftermath as default
  const [metric, setMetric] = useState<Metric>('temp');
  const [aggWindow, setAggWindow] = useState<AggWindow>('annual');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4); // years per second

  // Load pre-computed impact dataset.
  useEffect(() => {
    let cancelled = false;
    fetch('/data/climate/enso-impact.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setImpact(j as ImpactData); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Playback loop — advance one year per (1000/speed) ms; auto-stop at end.
  useEffect(() => {
    if (!playing || !impact) return;
    const maxYear = impact.years[impact.years.length - 1];
    const id = setInterval(() => {
      setYear((y) => {
        if (y >= maxYear) {
          setPlaying(false);
          return y;
        }
        return y + 1;
      });
    }, Math.max(60, 1000 / speed));
    return () => clearInterval(id);
  }, [playing, speed, impact]);

  // Build a featureName → anomaly lookup for the current year/metric/window.
  const valuesByName = useMemo(() => {
    if (!impact) return {};
    const yIdx = impact.years.indexOf(year);
    if (yIdx < 0) return {};
    const bucket = (impact as any)[aggWindow]?.[metric]?.country as Record<string, (number | null)[]> | undefined;
    if (!bucket) return {};
    const out: Record<string, number | null> = {};
    for (const iso3 of Object.keys(bucket)) {
      const name = impact.countryNames[iso3];
      if (!name) continue;
      const arr = bucket[iso3];
      out[name] = arr?.[yIdx] ?? null;
    }
    return out;
  }, [impact, year, metric, aggWindow]);

  const ensoAnom = useMemo(() => peakOniForYear(oniHistory, year), [oniHistory, year]);
  const state = ensoState(ensoAnom);
  const stateCls = state === 'El Niño'
    ? 'border-rose-400/60 bg-rose-500/15 text-rose-200'
    : state === 'La Niña'
      ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
      : 'border-gray-600 text-gray-300';

  const minYear = impact?.years[0] ?? 1950;
  const maxYear = impact?.years[impact.years.length - 1] ?? 2025;
  const stepYear = (delta: number) => setYear((y) => Math.max(minYear, Math.min(maxYear, y + delta)));

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-3 sm:p-4">
      {/* Header — title + ENSO state chip + metric/window toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-white font-mono">
            Global Impact · <span className="text-[#D0A65E]">{year}</span>
          </h3>
          <span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${stateCls}`}>
            {state} {ensoAnom >= 0 ? '+' : ''}{ensoAnom.toFixed(2)}°
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric: Temp / Rain */}
          <div className="inline-flex rounded-md border border-gray-700 bg-gray-900/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setMetric('temp')}
              className={`text-[11px] font-mono px-2.5 py-1 flex items-center gap-1 ${metric === 'temp' ? 'bg-[#D0A65E]/20 text-[#FFE5B4]' : 'text-gray-400 hover:text-white'}`}
              aria-pressed={metric === 'temp'}
            >
              <Thermometer className="h-3 w-3" /> Temp
            </button>
            <button
              type="button"
              onClick={() => setMetric('precip')}
              className={`text-[11px] font-mono px-2.5 py-1 flex items-center gap-1 border-l border-gray-700 ${metric === 'precip' ? 'bg-[#D0A65E]/20 text-[#FFE5B4]' : 'text-gray-400 hover:text-white'}`}
              aria-pressed={metric === 'precip'}
            >
              <CloudRain className="h-3 w-3" /> Rain
            </button>
          </div>
          {/* Window: Annual / MAM */}
          <div className="inline-flex rounded-md border border-gray-700 bg-gray-900/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setAggWindow('annual')}
              className={`text-[11px] font-mono px-2.5 py-1 ${aggWindow === 'annual' ? 'bg-[#D0A65E]/20 text-[#FFE5B4]' : 'text-gray-400 hover:text-white'}`}
              aria-pressed={aggWindow === 'annual'}
              title="Jan–Dec average for that calendar year"
            >
              Annual
            </button>
            <button
              type="button"
              onClick={() => setAggWindow('mam')}
              className={`text-[11px] font-mono px-2.5 py-1 border-l border-gray-700 ${aggWindow === 'mam' ? 'bg-[#D0A65E]/20 text-[#FFE5B4]' : 'text-gray-400 hover:text-white'}`}
              aria-pressed={aggWindow === 'mam'}
              title="Mar–May average — captures the lagged ENSO response on land"
            >
              MAM
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-gray-800" style={{ height: 460 }}>
        <Inner values={valuesByName} metric={metric} year={year} ensoAnom={ensoAnom} />
      </div>

      {/* Legend strip */}
      <div className="flex items-center justify-between gap-2 mt-2 text-[10px] font-mono text-gray-400">
        <div className="flex items-center gap-2">
          <span>{metric === 'temp' ? 'Cooler' : 'Drier'}</span>
          <span
            className="inline-block h-2 w-40 rounded"
            style={{
              background: metric === 'temp'
                ? 'linear-gradient(90deg, rgba(30,64,175,0.8), rgba(120,120,120,0.10), rgba(185,28,28,0.8))'
                : 'linear-gradient(90deg, rgba(185,28,28,0.8), rgba(120,120,120,0.10), rgba(30,64,175,0.8))',
            }}
          />
          <span>{metric === 'temp' ? 'Warmer' : 'Wetter'}</span>
          <span className="text-gray-500 ml-2">
            scale ±{metric === 'temp' ? '3°C' : '100%'} vs 1961–1990
          </span>
        </div>
        <div className="hidden sm:block text-gray-500">Niño boxes coloured by peak ONI in selected year</div>
      </div>

      {/* Scrubber + playback controls */}
      <div className="mt-3">
        <Scrubber history={oniHistory} year={year} onChange={setYear} />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded border border-[#D0A65E]/60 bg-[#D0A65E]/15 text-[#FFE5B4] hover:bg-[#D0A65E]/25"
          >
            {playing ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Play</>}
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); setYear(minYear); }}
            className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded border border-gray-700 text-gray-300 hover:text-white"
          >
            <SkipBack className="h-3 w-3" /> Reset
          </button>
          <button
            type="button"
            onClick={() => stepYear(-1)}
            className="text-[11px] font-mono px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-white"
            aria-label="Previous year"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => stepYear(1)}
            className="text-[11px] font-mono px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-white"
            aria-label="Next year"
          >
            ▶
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Speed</span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-24 accent-[#D0A65E]"
            />
            <span className="text-[11px] font-mono text-gray-300 tabular-nums w-8">{speed}×</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 mt-3 leading-snug">
        Colour shows each country&rsquo;s anomaly vs the 1961–1990 baseline for the selected year
        ({aggWindow === 'annual' ? 'Jan–Dec mean' : 'Mar–May mean — captures the lagged spring response after a DJF ENSO peak'}).
        The four boxes over the equatorial Pacific are the Niño SST regions used to track ENSO; their colour reflects that year&rsquo;s peak ONI.
        Data: Berkeley Earth (temperature), World Bank CKP (rainfall), NOAA CPC (ONI).
      </p>
    </div>
  );
}
