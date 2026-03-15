"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush, Cell,
} from 'recharts';
import { Search, Loader2, MapPin, TrendingUp, Droplets, Sun, Snowflake, ThermometerSun, Globe } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocationResult {
  id: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  owidCode?: string;
  parentCountry?: string;
}

// ─── Custom Tooltips ─────────────────────────────────────────────────────────

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke }} className="text-sm">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

const ComparisonTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const recentEntry = payload.find((p: any) => p.dataKey === 'recent' || p.dataKey === 'recentTemp');
  const recent = recentEntry?.value;
  const historic = payload.find((p: any) => p.dataKey === 'historicAvg')?.value;
  const isPending = recentEntry?.payload?.pending;
  let diffEl = null;
  if (recent != null && historic != null && !isPending) {
    const diff = recent - historic;
    const pct = historic !== 0 ? (diff / Math.abs(historic)) * 100 : 0;
    const sign = diff > 0 ? '+' : '';
    const color = diff > 0 ? 'text-red-400' : 'text-blue-400';
    diffEl = (
      <p className={`mt-1 pt-1 border-t border-gray-700 text-sm font-medium ${color}`}>
        Diff: {sign}{diff.toFixed(2)} ({sign}{pct.toFixed(1)}%)
      </p>
    );
  }
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[200px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => {
        if ((p.dataKey === 'recent' || p.dataKey === 'recentTemp') && p.payload?.pending) {
          return <p key={i} style={{ color: p.color || p.fill }} className="text-sm italic">Recent: data not yet available</p>;
        }
        return (
          <p key={i} style={{ color: p.color || p.fill }} className="text-sm">
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </p>
        );
      })}
      {diffEl}
    </div>
  );
};

// ─── Reusable Chart Components ───────────────────────────────────────────────

const CHART_MARGIN = { top: 10, right: 0, left: -20, bottom: 0 };
const BRUSH_HEIGHT = 30;

function YearlyChart({ data, dataKey, rollingKey, label, units, color, rollingColor, thresholds }: {
  data: any[];
  dataKey: string;
  rollingKey?: string;
  label: string;
  units: string;
  color: string;
  rollingColor: string;
  thresholds?: { value: number; label: string; color: string; labelPosition?: string }[];
}) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} allowDecimals={false} domain={[(d: number) => Math.floor(d - 1), (d: number) => Math.ceil(d + 1)]} unit={units === '°C' ? '°' : ''} />
          <Tooltip content={<DarkTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          {thresholds?.map((t, i) => (
            <ReferenceLine key={i} y={t.value} stroke={t.color} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ position: (t.labelPosition || 'insideTopLeft'), value: t.label, fill: t.color, fontSize: 11, fontWeight: 600 } as any} />
          ))}
          <Line type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={1} dot={false} />
          {rollingKey && <Line type="monotone" dataKey={rollingKey} name="10-Yr Rolling Avg" stroke={rollingColor} strokeWidth={3} dot={false} />}
          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
            <LineChart data={data}>
              <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1} />
            </LineChart>
          </Brush>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonChart({ data, recentKey, label, units, barColor }: {
  data: any[];
  recentKey: string;
  label: string;
  units: string;
  barColor: string;
}) {
  // Mark pending months and give them a placeholder value so the bar renders
  const chartData = data.map(d => ({
    ...d,
    pending: d[recentKey] == null,
    [recentKey]: d[recentKey] != null ? d[recentKey] : d.historicAvg ?? 0,
  }));

  // Custom bar shape: dashed outline for pending months, solid fill for real data
  const PendingBarShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload?.pending) return <rect x={x} y={y} width={width} height={height} fill={barColor} rx={4} ry={4} />;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill="none" stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" rx={4} ry={4} />
        <text x={x + width / 2} y={y + height / 2 + 3} textAnchor="middle" fontSize={8} fill="#6b7280" fontStyle="italic">N/A</text>
      </g>
    );
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} allowDecimals={false} domain={[(d: number) => Math.floor(d - 1), (d: number) => Math.ceil(d + 1)]} unit={units === '°C' ? '°' : ''} />
          <Tooltip content={<ComparisonTooltip />} cursor={{ fill: '#1F2937' }} />
          <Legend iconType="circle" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, left: 0, right: 0 }} />
          <Bar dataKey={recentKey} name={`Recent ${label}`} fill={barColor} radius={[4, 4, 0, 0]} shape={<PendingBarShape />} />
          <Bar dataKey="historicAvg" name="Historic Avg (1961-1990)" fill="#7A6E63" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Multi-Series Chart ──────────────────────────────────────────────────────

function MultiLineChart({ data, series, thresholds }: {
  data: any[];
  series: { dataKey: string; rollingKey?: string; label: string; color: string; rollingColor: string }[];
  thresholds?: { value: number; label: string; color: string; labelPosition?: string }[];
}) {
  const lines: React.ReactNode[] = [];
  series.forEach((s, i) => {
    lines.push(
      <Line key={`data-${i}`} type="monotone" dataKey={s.dataKey} name={s.label} stroke={s.color} strokeWidth={1} dot={false} connectNulls />
    );
    if (s.rollingKey) {
      lines.push(
        <Line key={`rolling-${i}`} type="monotone" dataKey={s.rollingKey} name={`${s.label} (10-Yr Avg)`} stroke={s.rollingColor} strokeWidth={3} dot={false} connectNulls />
      );
    }
  });

  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} allowDecimals={false} domain={[(d: number) => Math.floor(d - 1), (d: number) => Math.ceil(d + 1)]} unit="°" />
          <Tooltip content={<DarkTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
          {thresholds?.map((t, i) => (
            <ReferenceLine key={i} y={t.value} stroke={t.color} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ position: (t.labelPosition || 'insideTopLeft'), value: t.label, fill: t.color, fontSize: 11, fontWeight: 600 } as any} />
          ))}
          {lines}
          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
            <LineChart data={data}>
              <Line type="monotone" dataKey={series[0].dataKey} stroke={series[0].color} dot={false} strokeWidth={1} />
            </LineChart>
          </Brush>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Merge helpers ───────────────────────────────────────────────────────────

function mergeTempData(countryYearly: any[], regionYearly: any[], globalYearly?: any[]): any[] {
  const map = new Map<number, any>();
  for (const e of countryYearly) {
    map.set(e.year, { year: e.year, countryTemp: e.avgTemp, countryRolling: e.rollingAvg });
  }
  for (const e of regionYearly) {
    const row = map.get(e.year) || { year: e.year };
    row.regionTemp = e.value;
    row.regionRolling = e.rollingAvg;
    map.set(e.year, row);
  }
  if (globalYearly) {
    for (const e of globalYearly) {
      const row = map.get(e.year) || { year: e.year };
      row.globalTemp = e.absoluteTemp;
      row.globalRolling = e.rollingAvg;
      map.set(e.year, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

function mergeMinMaxData(maxYearly: any[], minYearly: any[]): any[] {
  const map = new Map<number, any>();
  for (const e of maxYearly) {
    map.set(e.year, { year: e.year, maxTemp: e.value, maxRolling: e.rollingAvg });
  }
  for (const e of minYearly) {
    const row = map.get(e.year) || { year: e.year };
    row.minTemp = e.value;
    row.minRolling = e.rollingAvg;
    map.set(e.year, row);
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

function mergeMetricData(regionYearly: any[], countryYearly: any[]): any[] {
  const map = new Map<number, any>();
  for (const e of regionYearly) {
    map.set(e.year, { year: e.year, regionValue: e.value, regionRolling: e.rollingAvg });
  }
  for (const e of countryYearly) {
    const row = map.get(e.year) || { year: e.year };
    row.countryValue = e.value;
    row.countryRolling = e.rollingAvg;
    map.set(e.year, row);
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
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

function Divider({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="h-px bg-gray-700 flex-1" />
      <h2 className="text-lg font-bold font-mono text-gray-200 flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-gray-700 shadow-lg">
        {icon} {title}
      </h2>
      <div className="h-px bg-gray-700 flex-1" />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const CLIMATE_CACHE_KEY = 'climate-dashboard-cache';

export default function ClimateDashboard() {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [countryData, setCountryData] = useState<any>(null);
  const [usStateData, setUsStateData] = useState<any>(null);
  const [ukRegionData, setUkRegionData] = useState<any>(null);
  const [ukCountryData, setUkCountryData] = useState<any>(null);
  const [globalData, setGlobalData] = useState<any>(null);
  const [showGlobalOverlay, setShowGlobalOverlay] = useState(false);

  // Restore cached data on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CLIMATE_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.selectedLocation) setSelectedLocation(cached.selectedLocation);
        if (cached.countryData) setCountryData(cached.countryData);
        if (cached.usStateData) setUsStateData(cached.usStateData);
        if (cached.ukRegionData) setUkRegionData(cached.ukRegionData);
        if (cached.ukCountryData) setUkCountryData(cached.ukCountryData);
        if (cached.globalData) setGlobalData(cached.globalData);
        if (cached.searchInput) setSearchInput(cached.searchInput);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist to sessionStorage whenever data changes
  useEffect(() => {
    if (!selectedLocation) return;
    try {
      sessionStorage.setItem(CLIMATE_CACHE_KEY, JSON.stringify({
        selectedLocation, countryData, usStateData, ukRegionData, ukCountryData, globalData, searchInput,
      }));
    } catch { /* quota exceeded — ignore */ }
  }, [selectedLocation, countryData, usStateData, ukRegionData, ukCountryData, globalData, searchInput]);

  // Debounced search-as-you-type
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/climate/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.results?.length > 0) {
        setSearchResults(data.results);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch {
      // Silently fail for type-ahead; user can retry
    }
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }, [doSearch]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(searchInput);
  }, [searchInput, doSearch]);

  const handleSelectLocation = useCallback(async (location: LocationResult) => {
    setShowDropdown(false);
    setSearchResults([]);
    setSelectedLocation(location);
    setLoading(true);
    setError(null);
    setCountryData(null);
    setUsStateData(null);
    setUkRegionData(null);
    setUkCountryData(null);
    setGlobalData(null);

    try {
      const fetches: Promise<any>[] = [];

      // Always fetch global context
      fetches.push(fetch('/api/climate/global').then(r => r.json()).catch(() => null));

      if (location.type === 'country') {
        fetches.push(fetch(`/api/climate/country/${location.owidCode}`).then(r => r.json()).catch(() => null));
        if (location.owidCode === 'USA') {
          fetches.push(fetch('/api/climate/us-state/us-ca').then(r => r.json()).catch(() => null));
        } else if (location.owidCode === 'GBR') {
          fetches.push(fetch('/api/climate/uk-region/uk-uk').then(r => r.json()).catch(() => null));
        }
      } else if (location.type === 'us-state') {
        fetches.push(fetch(`/api/climate/us-state/${location.id}`).then(r => r.json()).catch(() => null));
        fetches.push(fetch('/api/climate/country/USA').then(r => r.json()).catch(() => null));
      } else if (location.type === 'uk-region') {
        fetches.push(fetch(`/api/climate/uk-region/${location.id}`).then(r => r.json()).catch(() => null));
        fetches.push(fetch('/api/climate/country/GBR').then(r => r.json()).catch(() => null));
        fetches.push(fetch('/api/climate/uk-region/uk-uk').then(r => r.json()).catch(() => null));
      }

      const results = await Promise.all(fetches);

      if (results[0] && !results[0].error) setGlobalData(results[0]);

      if (location.type === 'country') {
        if (results[1] && !results[1].error) setCountryData(results[1]);
        if (location.owidCode === 'USA' && results[2] && !results[2].error) setUsStateData(results[2]);
        if (location.owidCode === 'GBR' && results[2] && !results[2].error) setUkRegionData(results[2]);
      } else if (location.type === 'us-state') {
        if (results[1] && !results[1].error) setUsStateData(results[1]);
        if (results[2] && !results[2].error) setCountryData(results[2]);
      } else if (location.type === 'uk-region') {
        if (results[1] && !results[1].error) setUkRegionData(results[1]);
        if (results[2] && !results[2].error) setCountryData(results[2]);
        if (results[3] && !results[3].error) setUkCountryData(results[3]);
      }

      if (!results.some((r, i) => i > 0 && r && !r.error)) {
        setError('Could not load climate data for this location. Please try another.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const getLocationLabel = () => {
    if (!selectedLocation) return '';
    if (selectedLocation.type === 'uk-region') return `${selectedLocation.name}, UK`;
    if (selectedLocation.type === 'us-state') return `${selectedLocation.name}, USA`;
    return selectedLocation.name;
  };

  // Merged datasets for combined charts
  const countryLabel = countryData?.country || '';
  const regionLabel = usStateData?.state || ukRegionData?.region || '';
  const ukCountryLabel = ukCountryData?.region || 'United Kingdom';

  const combinedAvgTempData = useMemo(() => {
    if (!countryData?.yearlyData) return null;
    const regionYearly = usStateData?.paramData?.tavg?.yearly || ukRegionData?.varData?.Tmean?.yearly;
    // If we have region data OR global overlay is active, use the multi-line merge
    if (!regionYearly && !(showGlobalOverlay && globalData?.yearlyData)) return null;
    return mergeTempData(countryData.yearlyData, regionYearly || [], showGlobalOverlay ? globalData?.yearlyData : undefined);
  }, [countryData, usStateData, ukRegionData, showGlobalOverlay, globalData]);

  const combinedMinMaxData = useMemo(() => {
    const maxYearly = usStateData?.paramData?.tmax?.yearly || ukRegionData?.varData?.Tmax?.yearly;
    const minYearly = usStateData?.paramData?.tmin?.yearly || ukRegionData?.varData?.Tmin?.yearly;
    if (!maxYearly || !minYearly) return null;
    return mergeMinMaxData(maxYearly, minYearly);
  }, [usStateData, ukRegionData]);

  // Combined additional metrics (UK region vs UK-wide)
  const combinedSunshineData = useMemo(() => {
    const regionData = ukRegionData?.varData?.Sunshine?.yearly;
    const countryData = ukCountryData?.varData?.Sunshine?.yearly;
    if (!regionData || !countryData) return null;
    return mergeMetricData(regionData, countryData);
  }, [ukRegionData, ukCountryData]);

  const combinedRainfallData = useMemo(() => {
    const regionData = ukRegionData?.varData?.Rainfall?.yearly;
    const countryData = ukCountryData?.varData?.Rainfall?.yearly;
    if (!regionData || !countryData) return null;
    return mergeMetricData(regionData, countryData);
  }, [ukRegionData, ukCountryData]);

  const combinedFrostData = useMemo(() => {
    const regionData = ukRegionData?.varData?.AirFrost?.yearly;
    const countryData = ukCountryData?.varData?.AirFrost?.yearly;
    if (!regionData || !countryData) return null;
    return mergeMetricData(regionData, countryData);
  }, [ukRegionData, ukCountryData]);

  const combinedRaindaysData = useMemo(() => {
    const regionData = ukRegionData?.varData?.Raindays1mm?.yearly;
    const countryData = ukCountryData?.varData?.Raindays1mm?.yearly;
    if (!regionData || !countryData) return null;
    return mergeMetricData(regionData, countryData);
  }, [ukRegionData, ukCountryData]);

  const hasData = countryData || usStateData || ukRegionData;

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─── Header & Search ──────────────────────────────────────── */}
        <div className="relative z-10 bg-gray-950/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border border-gray-800">
          <p className="text-sm uppercase tracking-[0.3em] font-mono mb-4" style={{ background: 'linear-gradient(to right, #60a5fa, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Climate Change
          </p>
          <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide text-white leading-tight mb-4">
            Global & Local{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Climate Data
            </span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base mb-4">
            Search for any country, US state, or UK city/region.
          </p>

          {!(hasData && !loading) && (
            <div className="relative w-full">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                    placeholder="Search..."
                    className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-gray-800 bg-gray-900/50 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    autoComplete="off"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-sm text-white px-4 py-1.5 rounded-lg font-medium flex items-center justify-center min-w-[100px] transition-colors">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-4 w-4 mr-2" />Search</>}
                </button>
              </form>

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                  {searchResults.map((result, i) => (
                    <button
                      key={result.id + i}
                      onClick={() => { setSearchInput(result.name.split(' → ')[0]); handleSelectLocation(result); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-800 flex items-center gap-3 border-b border-gray-800 last:border-0 transition-colors"
                      type="button"
                    >
                      <span className="text-lg">
                        {result.type === 'country' ? '🌍' : result.type === 'us-state' ? '🇺🇸' : '🇬🇧'}
                      </span>
                      <div>
                        <span className="font-medium text-gray-200">{result.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {result.type === 'country' ? 'Country' : result.type === 'us-state' ? 'US State' : 'UK Region'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-orange-900/30 text-orange-400 border border-orange-800/50 rounded-lg text-sm">
              {error}
            </div>
          )}

          {hasData && !loading && (
            <div className="flex gap-2 mt-3">
              <div className="flex items-center gap-1.5 flex-1 text-green-400 bg-green-950/40 py-1.5 px-4 rounded-lg border border-green-800/50">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium text-sm">{getLocationLabel()}</span>
              </div>
              <button
                onClick={() => {
                  setCountryData(null);
                  setUsStateData(null);
                  setUkRegionData(null);
                  setSelectedLocation(null);
                  setSearchInput('');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-sm text-white px-4 py-1.5 rounded-lg font-medium min-w-[100px] transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* ─── Loading ──────────────────────────────────────────────── */}
        {loading && (
          <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-gray-800 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <p className="text-gray-400">Loading climate data — this may take a moment for first-time locations...</p>
          </div>
        )}

        {/* ─── Data Display ─────────────────────────────────────────── */}
        {hasData && !loading && (
          <>
            {/* ═══ TEMPERATURE ═══ */}
            <Divider icon={<ThermometerSun className="h-5 w-5" />} title="Temperature" />

            {(countryData?.yearlyData || usStateData?.paramData?.tavg || ukRegionData?.varData?.Tmean) && (
              <SectionCard
                icon={<TrendingUp className="h-5 w-5 text-red-400" />}
                title={combinedAvgTempData
                  ? `${countryLabel} + ${regionLabel} — Average Temperature`
                  : countryData?.yearlyData
                    ? `${countryLabel} — Average Temperature`
                    : `${regionLabel} — Average Temperature`
                }
              >
                {/* Global overlay toggle */}
                {globalData?.yearlyData && (
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setShowGlobalOverlay(v => !v)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        showGlobalOverlay
                          ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300'
                          : 'bg-gray-900/40 border-gray-700 text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      }`}
                      type="button"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {showGlobalOverlay ? 'Hide' : 'Show'} Global Temperature
                    </button>
                  </div>
                )}

                {/* Annual average — combined or standalone */}
                {combinedAvgTempData ? (
                  <SubSection title="Annual average — full history (drag slider to zoom)">
                    <MultiLineChart
                      data={combinedAvgTempData}
                      series={[
                        { dataKey: 'countryTemp', rollingKey: 'countryRolling', label: countryLabel, color: '#fca5a5', rollingColor: '#dc2626' },
                        ...((usStateData?.paramData?.tavg?.yearly || ukRegionData?.varData?.Tmean?.yearly) ? [{ dataKey: 'regionTemp', rollingKey: 'regionRolling', label: regionLabel, color: '#fdcc74', rollingColor: '#f59e0b' }] : []),
                        ...(showGlobalOverlay ? [{ dataKey: 'globalTemp', rollingKey: 'globalRolling', label: 'Global', color: '#6ee7b7', rollingColor: '#10b981' }] : []),
                      ]}
                      thresholds={showGlobalOverlay && globalData ? [
                        { value: globalData.keyThresholds.plus1_5, label: '+1.5°C Paris limit', color: '#f59e0b', labelPosition: 'insideTopLeft' },
                        { value: globalData.keyThresholds.plus2_0, label: '+2.0°C Critical limit', color: '#ef4444', labelPosition: 'insideBottomLeft' },
                      ] : undefined}
                    />
                  </SubSection>
                ) : countryData?.yearlyData ? (
                  <SubSection title="Annual average — full history (drag slider to zoom)">
                    <YearlyChart
                      data={countryData.yearlyData}
                      dataKey="avgTemp"
                      rollingKey="rollingAvg"
                      label="Avg Temperature"
                      units="°C"
                      color="#fca5a5"
                      rollingColor="#ef4444"
                    />
                  </SubSection>
                ) : (
                  <SubSection title="Annual average temperature">
                    <YearlyChart
                      data={(usStateData?.paramData?.tavg || ukRegionData?.varData?.Tmean).yearly}
                      dataKey="value" rollingKey="rollingAvg"
                      label="Avg Temperature" units="°C" color="#fdcc74" rollingColor="#f59e0b"
                    />
                  </SubSection>
                )}

                {/* Monthly comparisons */}
                {countryData?.monthlyComparison && (
                  <SubSection title={`${countryLabel} — Last 12 months vs 1961-1990 baseline`}>
                    <ComparisonChart data={countryData.monthlyComparison} recentKey="recentTemp" label="Temperature" units="°C" barColor="#ef4444" />
                  </SubSection>
                )}
                {usStateData?.paramData?.tavg?.monthlyComparison && (
                  <SubSection title={`${usStateData.state} — Last 12 months vs historic average`}>
                    <ComparisonChart data={usStateData.paramData.tavg.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#ea580c" />
                  </SubSection>
                )}
                {ukRegionData?.varData?.Tmean?.monthlyComparison && (
                  <SubSection title={`${ukRegionData.region} — Last 12 months vs historic average`}>
                    <ComparisonChart data={ukRegionData.varData.Tmean.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#d97706" />
                  </SubSection>
                )}

                {/* Combined Min/Max temperature */}
                {combinedMinMaxData && (
                  <SubSection title={`${regionLabel} — Max & Min temperature trends`}>
                    <MultiLineChart
                      data={combinedMinMaxData}
                      series={[
                        { dataKey: 'maxTemp', rollingKey: 'maxRolling', label: 'Max Temp', color: '#fca5a5', rollingColor: '#dc2626' },
                        { dataKey: 'minTemp', rollingKey: 'minRolling', label: 'Min Temp', color: '#93c5fd', rollingColor: '#2563eb' },
                      ]}
                    />
                  </SubSection>
                )}
              </SectionCard>
            )}

            {/* ═══ SUNSHINE ═══ */}
            {(ukRegionData?.varData?.Sunshine) && (
              <>
                <Divider icon={<Sun className="h-5 w-5" />} title="Sunshine" />

                <SectionCard
                  icon={<Sun className="h-5 w-5 text-yellow-400" />}
                  title={combinedSunshineData
                    ? `${regionLabel} + ${ukCountryLabel} — Sunshine Hours`
                    : `${ukRegionData.region} — Sunshine Hours`
                  }
                >
                  <SubSection title="Annual total sunshine hours">
                    {combinedSunshineData ? (
                      <MultiLineChart
                        data={combinedSunshineData}
                        series={[
                          { dataKey: 'regionValue', rollingKey: 'regionRolling', label: regionLabel, color: '#fde047', rollingColor: '#ca8a04' },
                          { dataKey: 'countryValue', rollingKey: 'countryRolling', label: ukCountryLabel, color: '#fdba74', rollingColor: '#ea580c' },
                        ]}
                      />
                    ) : (
                      <YearlyChart data={ukRegionData.varData.Sunshine.yearly} dataKey="value" rollingKey="rollingAvg" label="Sunshine" units="hours" color="#fde047" rollingColor="#ca8a04" />
                    )}
                  </SubSection>
                  {ukRegionData.varData.Sunshine.monthlyComparison && (
                    <SubSection title={`${ukRegionData.region} — Last 12 months vs historic average`}>
                      <ComparisonChart data={ukRegionData.varData.Sunshine.monthlyComparison} recentKey="recent" label="Sunshine" units="hours" barColor="#eab308" />
                    </SubSection>
                  )}
                  {ukCountryData?.varData?.Sunshine?.monthlyComparison && (
                    <SubSection title={`${ukCountryLabel} — Last 12 months vs historic average`}>
                      <ComparisonChart data={ukCountryData.varData.Sunshine.monthlyComparison} recentKey="recent" label="Sunshine" units="hours" barColor="#ea580c" />
                    </SubSection>
                  )}
                </SectionCard>
              </>
            )}

            {/* ═══ RAINFALL & PRECIPITATION ═══ */}
            {(usStateData?.paramData?.pcp || ukRegionData?.varData?.Rainfall) && (
              <>
                <Divider icon={<Droplets className="h-5 w-5" />} title="Rainfall & Precipitation" />

                {usStateData?.paramData?.pcp && (
                  <SectionCard icon={<Droplets className="h-5 w-5 text-blue-400" />} title={`${usStateData.state} — Precipitation`}>
                    <SubSection title="Annual total precipitation (mm)">
                      <YearlyChart data={usStateData.paramData.pcp.yearly} dataKey="value" rollingKey="rollingAvg" label="Precipitation" units="mm" color="#60a5fa" rollingColor="#2563eb" />
                    </SubSection>
                    <SubSection title="Last 12 months vs historic average">
                      <ComparisonChart data={usStateData.paramData.pcp.monthlyComparison} recentKey="recent" label="Precipitation" units="mm" barColor="#3b82f6" />
                    </SubSection>
                  </SectionCard>
                )}

                {ukRegionData?.varData?.Rainfall && (
                  <SectionCard
                    icon={<Droplets className="h-5 w-5 text-blue-400" />}
                    title={combinedRainfallData
                      ? `${regionLabel} + ${ukCountryLabel} — Rainfall`
                      : `${ukRegionData.region} — Rainfall`
                    }
                  >
                    <SubSection title="Annual total rainfall (mm)">
                      {combinedRainfallData ? (
                        <MultiLineChart
                          data={combinedRainfallData}
                          series={[
                            { dataKey: 'regionValue', rollingKey: 'regionRolling', label: regionLabel, color: '#60a5fa', rollingColor: '#2563eb' },
                            { dataKey: 'countryValue', rollingKey: 'countryRolling', label: ukCountryLabel, color: '#a78bfa', rollingColor: '#7c3aed' },
                          ]}
                        />
                      ) : (
                        <YearlyChart data={ukRegionData.varData.Rainfall.yearly} dataKey="value" rollingKey="rollingAvg" label="Rainfall" units="mm" color="#60a5fa" rollingColor="#2563eb" />
                      )}
                    </SubSection>
                    {ukRegionData.varData.Rainfall.monthlyComparison && (
                      <SubSection title={`${ukRegionData.region} — Last 12 months vs historic average`}>
                        <ComparisonChart data={ukRegionData.varData.Rainfall.monthlyComparison} recentKey="recent" label="Rainfall" units="mm" barColor="#3b82f6" />
                      </SubSection>
                    )}
                    {ukCountryData?.varData?.Rainfall?.monthlyComparison && (
                      <SubSection title={`${ukCountryLabel} — Last 12 months vs historic average`}>
                        <ComparisonChart data={ukCountryData.varData.Rainfall.monthlyComparison} recentKey="recent" label="Rainfall" units="mm" barColor="#7c3aed" />
                      </SubSection>
                    )}
                  </SectionCard>
                )}

                {ukRegionData?.varData?.Raindays1mm && (
                  <SectionCard
                    icon={<Droplets className="h-5 w-5 text-indigo-400" />}
                    title={combinedRaindaysData
                      ? `${regionLabel} + ${ukCountryLabel} — Rain Days (≥1mm)`
                      : `${ukRegionData.region} — Rain Days (≥1mm)`
                    }
                  >
                    <SubSection title="Annual total rain days">
                      {combinedRaindaysData ? (
                        <MultiLineChart
                          data={combinedRaindaysData}
                          series={[
                            { dataKey: 'regionValue', rollingKey: 'regionRolling', label: regionLabel, color: '#a5b4fc', rollingColor: '#6366f1' },
                            { dataKey: 'countryValue', rollingKey: 'countryRolling', label: ukCountryLabel, color: '#c4b5fd', rollingColor: '#8b5cf6' },
                          ]}
                        />
                      ) : (
                        <YearlyChart data={ukRegionData.varData.Raindays1mm.yearly} dataKey="value" rollingKey="rollingAvg" label="Rain Days" units="days" color="#a5b4fc" rollingColor="#6366f1" />
                      )}
                    </SubSection>
                    {ukRegionData.varData.Raindays1mm.monthlyComparison && (
                      <SubSection title={`${ukRegionData.region} — Last 12 months vs historic average`}>
                        <ComparisonChart data={ukRegionData.varData.Raindays1mm.monthlyComparison} recentKey="recent" label="Rain Days" units="days" barColor="#6366f1" />
                      </SubSection>
                    )}
                    {ukCountryData?.varData?.Raindays1mm?.monthlyComparison && (
                      <SubSection title={`${ukCountryLabel} — Last 12 months vs historic average`}>
                        <ComparisonChart data={ukCountryData.varData.Raindays1mm.monthlyComparison} recentKey="recent" label="Rain Days" units="days" barColor="#8b5cf6" />
                      </SubSection>
                    )}
                  </SectionCard>
                )}
              </>
            )}

            {/* ═══ FROST ═══ */}
            {ukRegionData?.varData?.AirFrost && (
              <>
                <Divider icon={<Snowflake className="h-5 w-5" />} title="Frost" />

                <SectionCard
                  icon={<Snowflake className="h-5 w-5 text-cyan-400" />}
                  title={combinedFrostData
                    ? `${regionLabel} + ${ukCountryLabel} — Air Frost Days`
                    : `${ukRegionData.region} — Air Frost Days`
                  }
                >
                  <SubSection title="Annual total frost days">
                    {combinedFrostData ? (
                      <MultiLineChart
                        data={combinedFrostData}
                        series={[
                          { dataKey: 'regionValue', rollingKey: 'regionRolling', label: regionLabel, color: '#67e8f9', rollingColor: '#06b6d4' },
                          { dataKey: 'countryValue', rollingKey: 'countryRolling', label: ukCountryLabel, color: '#d8b4fe', rollingColor: '#a855f7' },
                        ]}
                      />
                    ) : (
                      <YearlyChart data={ukRegionData.varData.AirFrost.yearly} dataKey="value" rollingKey="rollingAvg" label="Frost Days" units="days" color="#67e8f9" rollingColor="#06b6d4" />
                    )}
                  </SubSection>
                  {ukRegionData.varData.AirFrost.monthlyComparison && (
                    <SubSection title={`${ukRegionData.region} — Last 12 months vs historic average`}>
                      <ComparisonChart data={ukRegionData.varData.AirFrost.monthlyComparison} recentKey="recent" label="Frost Days" units="days" barColor="#06b6d4" />
                    </SubSection>
                  )}
                  {ukCountryData?.varData?.AirFrost?.monthlyComparison && (
                    <SubSection title={`${ukCountryLabel} — Last 12 months vs historic average`}>
                      <ComparisonChart data={ukCountryData.varData.AirFrost.monthlyComparison} recentKey="recent" label="Frost Days" units="days" barColor="#a855f7" />
                    </SubSection>
                  )}
                </SectionCard>
              </>
            )}

            {/* ═══ GLOBAL CONTEXT ═══ */}
            {globalData?.yearlyData && (
              <>
                <Divider icon={<Globe className="h-5 w-5" />} title="Global Context" />

                <SectionCard icon={<Globe className="h-5 w-5 text-emerald-400" />} title="Global Average Temperature — NOAA">
                  <SubSection title="Annual global temperature vs Paris Agreement thresholds">
                    <YearlyChart
                      data={globalData.yearlyData}
                      dataKey="absoluteTemp"
                      rollingKey="rollingAvg"
                      label="Global Avg Temp"
                      units="°C"
                      color="#D3C8BB"
                      rollingColor="#10b981"
                      thresholds={[
                        { value: globalData.keyThresholds.plus1_5, label: 'Paris +1.5°C limit', color: '#f59e0b' },
                        { value: globalData.keyThresholds.plus2_0, label: 'Critical +2.0°C limit', color: '#ef4444' },
                      ]}
                    />
                  </SubSection>
                  <SubSection title="Temperature anomaly (vs 1901-2000 baseline)">
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={globalData.yearlyData} margin={CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} allowDecimals={false} unit="°" domain={[(d: number) => Math.floor(d - 1), (d: number) => Math.ceil(d + 1)]} />
                          <Tooltip content={<DarkTooltip />} cursor={{ fill: '#1F2937' }} />
                          <Legend wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                          <ReferenceLine y={0} stroke="#7A6E63" />
                          <ReferenceLine y={1.5} stroke="#f59e0b" strokeDasharray="4 4"
                            label={{ position: 'right', value: '+1.5°C', fill: '#f59e0b', fontSize: 11 }} />
                          <Bar dataKey="anomaly" name="Temperature Anomaly (°C)">
                            {globalData.yearlyData.map((entry: any, index: number) => (
                              <Cell key={index} fill={entry.anomaly >= 0 ? '#ef4444' : '#3b82f6'} />
                            ))}
                          </Bar>
                          <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SubSection>
                </SectionCard>
              </>
            )}

            {/* ─── Attribution ───────────────────────────────────────── */}
            <div className="bg-gray-950/90 backdrop-blur-md p-5 rounded-xl border border-gray-800 text-sm text-gray-400 space-y-1.5">
              <p className="font-semibold text-gray-300">Data sources & attribution:</p>
              {countryData && <p>• Country temperatures: <a href="https://ourworldindata.org/explorers/climate-change" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">Our World in Data</a> / <a href="https://climate.copernicus.eu/climate-reanalysis" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">Copernicus ERA5 reanalysis</a> (CC-BY)</p>}
              {usStateData && <p>• US state data: <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NOAA National Centers for Environmental Information</a> (public domain)</p>}
              {ukRegionData && <p>• UK regional data: Contains <a href="https://www.metoffice.gov.uk/research/climate/maps-and-data/uk-climate-averages" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">Met Office</a> data © Crown copyright (Open Government Licence)</p>}
              {globalData && <p>• Global temperatures: <a href="https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-200">NOAA Climate at a Glance</a> (public domain)</p>}
            </div>
          </>
        )}

        {/* ─── Empty State ──────────────────────────────────────────── */}
        {!hasData && !loading && !error && (
          <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl border border-gray-800 text-center">
            <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">Search for a location to get started</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Try &quot;United Kingdom&quot;, &quot;London&quot;, &quot;California&quot;, &quot;France&quot;, or any country, US state, or UK city/region.
            </p>
          </div>
        )}
      </div>
      </div>
    </main>
  );
}
