"use client";

import React, { useState, useCallback } from 'react';
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
  const recent = payload.find((p: any) => p.dataKey === 'recent' || p.dataKey === 'recentTemp')?.value;
  const historic = payload.find((p: any) => p.dataKey === 'historicAvg')?.value;
  let diffEl = null;
  if (recent != null && historic != null) {
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
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }} className="text-sm">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
      {diffEl}
    </div>
  );
};

// ─── Reusable Chart Components ───────────────────────────────────────────────

const CHART_MARGIN = { top: 10, right: 10, left: -10, bottom: 0 };
const BRUSH_HEIGHT = 30;

function YearlyChart({ data, dataKey, rollingKey, label, units, color, rollingColor, thresholds }: {
  data: any[];
  dataKey: string;
  rollingKey?: string;
  label: string;
  units: string;
  color: string;
  rollingColor: string;
  thresholds?: { value: number; label: string; color: string }[];
}) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} unit={units === '°C' ? '°' : ''} />
          <Tooltip content={<DarkTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ color: '#D1D5DB', fontSize: 12 }} />
          {thresholds?.map((t, i) => (
            <ReferenceLine key={i} y={t.value} stroke={t.color} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ position: 'insideTopLeft', value: t.label, fill: t.color, fontSize: 11, fontWeight: 600 }} />
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
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} unit={units === '°C' ? '°' : ''} />
          <Tooltip content={<ComparisonTooltip />} cursor={{ fill: '#1F2937' }} />
          <Legend iconType="circle" wrapperStyle={{ color: '#D1D5DB', fontSize: 12 }} />
          <Bar dataKey={recentKey} name={`Recent ${label}`} fill={barColor} radius={[4, 4, 0, 0]} />
          <Bar dataKey="historicAvg" name="Historic Avg (1961-1990)" fill="#6B7280" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-800">
      <h2 className="text-xl font-bold text-gray-200 mb-5 flex items-center gap-2">
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
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Divider({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-4 my-4">
      <div className="h-px bg-gray-800 flex-1" />
      <h2 className="text-xl font-bold text-gray-400 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="h-px bg-gray-800 flex-1" />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

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
  const [globalData, setGlobalData] = useState<any>(null);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || searchInput.trim().length < 2) return;

    setError(null);
    try {
      const res = await fetch(`/api/climate/search?q=${encodeURIComponent(searchInput.trim())}`);
      const data = await res.json();
      if (data.results?.length > 0) {
        setSearchResults(data.results);
        setShowDropdown(true);
      } else {
        setError('No locations found. Try a country name, US state, or UK city/region.');
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch {
      setError('Search failed. Please try again.');
    }
  }, [searchInput]);

  const handleSelectLocation = useCallback(async (location: LocationResult) => {
    setShowDropdown(false);
    setSearchResults([]);
    setSelectedLocation(location);
    setLoading(true);
    setError(null);
    setCountryData(null);
    setUsStateData(null);
    setUkRegionData(null);
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
    if (selectedLocation.type === 'uk-region') return `${selectedLocation.name}, UK (Met Office region)`;
    if (selectedLocation.type === 'us-state') return `${selectedLocation.name}, USA (NOAA state data)`;
    return selectedLocation.name;
  };

  const hasData = countryData || usStateData || ukRegionData;

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-gray-200 mt-[60px]">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ─── Header & Search ──────────────────────────────────────── */}
        <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-800">
          <h1 className="text-3xl font-bold text-white mb-2">🌍 Climate Data Dashboard</h1>
          <p className="text-gray-400 mb-6">
            Search for any country, US state, or UK region to explore decades of climate data.
          </p>

          <div className="relative w-full">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); if (e.target.value.length < 2) setShowDropdown(false); }}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  placeholder="Search country, city, US state, UK region..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-800 bg-gray-900/50 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  autoComplete="off"
                />
              </div>
              <button type="submit" disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center min-w-[110px] transition-colors">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-4 w-4 mr-2" />Search</>}
              </button>
            </form>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
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

          {error && (
            <div className="mt-4 p-4 bg-orange-900/30 text-orange-400 border border-orange-800/50 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* ─── Loading ──────────────────────────────────────────────── */}
        {loading && (
          <div className="bg-black/60 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-gray-800 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <p className="text-gray-400">Loading climate data — this may take a moment for first-time locations...</p>
          </div>
        )}

        {/* ─── Data Display ─────────────────────────────────────────── */}
        {hasData && !loading && (
          <>
            {/* Location Banner */}
            <div className="flex items-center gap-2 text-green-400 bg-green-900/30 p-4 rounded-xl border border-green-800/50">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{getLocationLabel()}</span>
              <span className="ml-auto text-xs text-gray-500">
                {(countryData?.source || usStateData?.source || ukRegionData?.source) === 'cache' ? '⚡ Cached' : '🔄 Fresh'}
              </span>
            </div>

            {/* ═══ TEMPERATURE ═══ */}
            <Divider icon={<ThermometerSun className="h-5 w-5" />} title="Temperature" />

            {countryData?.yearlyData && (
              <SectionCard
                icon={<TrendingUp className="h-5 w-5 text-red-400" />}
                title={`${countryData.country} — Average Temperature`}
              >
                <SubSection title="Annual average — full history (drag slider to zoom)">
                  <YearlyChart
                    data={countryData.yearlyData}
                    dataKey="avgTemp"
                    rollingKey="rollingAvg"
                    label="Avg Temperature"
                    units="°C"
                    color="#fca5a5"
                    rollingColor="#ef4444"
                    thresholds={globalData ? [
                      { value: globalData.keyThresholds.plus1_5, label: '+1.5°C Paris limit', color: '#f59e0b' },
                      { value: globalData.keyThresholds.plus2_0, label: '+2.0°C Critical limit', color: '#ef4444' },
                    ] : undefined}
                  />
                </SubSection>
                <SubSection title="Last 12 months vs 1961-1990 baseline">
                  <ComparisonChart data={countryData.monthlyComparison} recentKey="recentTemp" label="Temperature" units="°C" barColor="#ef4444" />
                </SubSection>
              </SectionCard>
            )}

            {usStateData?.paramData?.tavg && (
              <SectionCard
                icon={<ThermometerSun className="h-5 w-5 text-orange-400" />}
                title={`${usStateData.state} — State Temperature`}
              >
                <SubSection title="Annual average temperature">
                  <YearlyChart data={usStateData.paramData.tavg.yearly} dataKey="value" rollingKey="rollingAvg" label="Avg Temperature" units="°C" color="#fdba74" rollingColor="#ea580c" />
                </SubSection>
                <SubSection title="Last 12 months vs historic average">
                  <ComparisonChart data={usStateData.paramData.tavg.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#ea580c" />
                </SubSection>
                {usStateData.paramData.tmax && (
                  <SubSection title="Max temperature trend">
                    <YearlyChart data={usStateData.paramData.tmax.yearly} dataKey="value" rollingKey="rollingAvg" label="Max Temp" units="°C" color="#fca5a5" rollingColor="#dc2626" />
                  </SubSection>
                )}
                {usStateData.paramData.tmin && (
                  <SubSection title="Min temperature trend">
                    <YearlyChart data={usStateData.paramData.tmin.yearly} dataKey="value" rollingKey="rollingAvg" label="Min Temp" units="°C" color="#93c5fd" rollingColor="#2563eb" />
                  </SubSection>
                )}
              </SectionCard>
            )}

            {ukRegionData?.varData?.Tmean && (
              <SectionCard
                icon={<ThermometerSun className="h-5 w-5 text-amber-400" />}
                title={`${ukRegionData.region} — Regional Temperature`}
              >
                <SubSection title="Annual mean temperature">
                  <YearlyChart data={ukRegionData.varData.Tmean.yearly} dataKey="value" rollingKey="rollingAvg" label="Mean Temp" units="°C" color="#fcd34d" rollingColor="#d97706" />
                </SubSection>
                <SubSection title="Last 12 months vs historic average">
                  <ComparisonChart data={ukRegionData.varData.Tmean.monthlyComparison} recentKey="recent" label="Temperature" units="°C" barColor="#d97706" />
                </SubSection>
                {ukRegionData.varData.Tmax && (
                  <SubSection title="Max temperature trend">
                    <YearlyChart data={ukRegionData.varData.Tmax.yearly} dataKey="value" rollingKey="rollingAvg" label="Max Temp" units="°C" color="#fca5a5" rollingColor="#dc2626" />
                  </SubSection>
                )}
                {ukRegionData.varData.Tmin && (
                  <SubSection title="Min temperature trend">
                    <YearlyChart data={ukRegionData.varData.Tmin.yearly} dataKey="value" rollingKey="rollingAvg" label="Min Temp" units="°C" color="#93c5fd" rollingColor="#2563eb" />
                  </SubSection>
                )}
              </SectionCard>
            )}

            {/* ═══ RAINFALL ═══ */}
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
                  <SectionCard icon={<Droplets className="h-5 w-5 text-blue-400" />} title={`${ukRegionData.region} — Rainfall`}>
                    <SubSection title="Annual total rainfall (mm)">
                      <YearlyChart data={ukRegionData.varData.Rainfall.yearly} dataKey="value" rollingKey="rollingAvg" label="Rainfall" units="mm" color="#60a5fa" rollingColor="#2563eb" />
                    </SubSection>
                    <SubSection title="Last 12 months vs historic average">
                      <ComparisonChart data={ukRegionData.varData.Rainfall.monthlyComparison} recentKey="recent" label="Rainfall" units="mm" barColor="#3b82f6" />
                    </SubSection>
                  </SectionCard>
                )}
              </>
            )}

            {/* ═══ ADDITIONAL UK METRICS ═══ */}
            {ukRegionData && (ukRegionData.varData?.Sunshine || ukRegionData.varData?.AirFrost || ukRegionData.varData?.Raindays1mm) && (
              <>
                <Divider icon={<Sun className="h-5 w-5" />} title="Additional UK Metrics" />

                {ukRegionData.varData?.Sunshine && (
                  <SectionCard icon={<Sun className="h-5 w-5 text-yellow-400" />} title={`${ukRegionData.region} — Sunshine Hours`}>
                    <SubSection title="Annual total sunshine hours">
                      <YearlyChart data={ukRegionData.varData.Sunshine.yearly} dataKey="value" rollingKey="rollingAvg" label="Sunshine" units="hours" color="#fde047" rollingColor="#ca8a04" />
                    </SubSection>
                    <SubSection title="Last 12 months vs historic average">
                      <ComparisonChart data={ukRegionData.varData.Sunshine.monthlyComparison} recentKey="recent" label="Sunshine" units="hours" barColor="#eab308" />
                    </SubSection>
                  </SectionCard>
                )}

                {ukRegionData.varData?.AirFrost && (
                  <SectionCard icon={<Snowflake className="h-5 w-5 text-cyan-400" />} title={`${ukRegionData.region} — Air Frost Days`}>
                    <SubSection title="Annual total frost days">
                      <YearlyChart data={ukRegionData.varData.AirFrost.yearly} dataKey="value" rollingKey="rollingAvg" label="Frost Days" units="days" color="#67e8f9" rollingColor="#06b6d4" />
                    </SubSection>
                    <SubSection title="Last 12 months vs historic average">
                      <ComparisonChart data={ukRegionData.varData.AirFrost.monthlyComparison} recentKey="recent" label="Frost Days" units="days" barColor="#06b6d4" />
                    </SubSection>
                  </SectionCard>
                )}

                {ukRegionData.varData?.Raindays1mm && (
                  <SectionCard icon={<Droplets className="h-5 w-5 text-indigo-400" />} title={`${ukRegionData.region} — Rain Days (≥1mm)`}>
                    <SubSection title="Annual total rain days">
                      <YearlyChart data={ukRegionData.varData.Raindays1mm.yearly} dataKey="value" rollingKey="rollingAvg" label="Rain Days" units="days" color="#a5b4fc" rollingColor="#6366f1" />
                    </SubSection>
                  </SectionCard>
                )}
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
                      color="#d1d5db"
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
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} unit="°" domain={['auto', 'auto']} />
                          <Tooltip content={<DarkTooltip />} cursor={{ fill: '#1F2937' }} />
                          <Legend wrapperStyle={{ color: '#D1D5DB', fontSize: 12 }} />
                          <ReferenceLine y={0} stroke="#6B7280" />
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
            <div className="bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-gray-800/50 text-xs text-gray-500 space-y-1">
              <p><strong>Data sources & attribution:</strong></p>
              {countryData && <p>• Country temperatures: Our World in Data / Copernicus ERA5 reanalysis (CC-BY)</p>}
              {usStateData && <p>• US state data: NOAA National Centers for Environmental Information (public domain)</p>}
              {ukRegionData && <p>• UK regional data: Contains Met Office data © Crown copyright (Open Government Licence)</p>}
              {globalData && <p>• Global temperatures: NOAA Climate at a Glance (public domain)</p>}
            </div>
          </>
        )}

        {/* ─── Empty State ──────────────────────────────────────────── */}
        {!hasData && !loading && !error && (
          <div className="bg-black/40 backdrop-blur-md p-12 rounded-2xl border border-gray-800 text-center">
            <Globe className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">Search for a location to get started</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Try &quot;United Kingdom&quot;, &quot;London&quot;, &quot;California&quot;, &quot;France&quot;, or any country, US state, or UK region.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
