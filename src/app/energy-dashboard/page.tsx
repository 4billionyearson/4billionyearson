"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush,
} from 'recharts';
import {
  Loader2, Zap, Flame, Sun, Wind, Atom, Droplets, Factory,
  TrendingUp, BarChart3, Search, MapPin, Globe, Users,
} from 'lucide-react';
import { countryFlag } from '@/lib/climate/locations';

const EnergyChoroplethMap = dynamic(() => import('@/app/_components/energy-choropleth-map'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnergyYearlyPoint {
  year: number;
  fossil: number | null;
  renewables: number | null;
  nuclear: number | null;
  coal: number | null;
  gas: number | null;
  oil: number | null;
  solar: number | null;
  wind: number | null;
  hydro: number | null;
  biofuel: number | null;
  fossilShareEnergy: number | null;
  renewablesShareEnergy: number | null;
  nuclearShareEnergy: number | null;
  coalShareElec: number | null;
  gasShareElec: number | null;
  oilShareElec: number | null;
  solarShareElec: number | null;
  windShareElec: number | null;
  hydroShareElec: number | null;
  nuclearShareElec: number | null;
  renewablesShareElec: number | null;
  fossilShareElec: number | null;
  biofuelShareElec: number | null;
  otherRenewShareElecExcBiofuel: number | null;
  electricityGeneration: number | null;
  carbonIntensity: number | null;
  ghgEmissions: number | null;
  ghgPerCapita: number | null;
  energyPerCapita: number | null;
  perCapitaElectricity: number | null;
  primaryEnergy: number | null;
  population: number | null;
}

interface LatestStats {
  year: number;
  fossilShare: number | null;
  renewablesShare: number | null;
  nuclearShare: number | null;
  solarShareElec: number | null;
  windShareElec: number | null;
  carbonIntensity: number | null;
  electricityGeneration: number | null;
  ghgEmissions: number | null;
}

interface CountryEnergy {
  name: string;
  yearly: EnergyYearlyPoint[];
  latest: LatestStats | null;
}

interface EnergyData {
  world: CountryEnergy;
  country?: CountryEnergy | null;
  source?: string;
  fetchedAt: string;
}

// ─── Chart config ────────────────────────────────────────────────────────────

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;

const formatTWh = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v);

// ─── Colour palette ─────────────────────────────────────────────────────────

const COLORS = {
  coal: '#9ca3af',
  oil: '#78716c',
  gas: '#d97706',
  nuclear: '#a855f7',
  hydro: '#3b82f6',
  wind: '#06b6d4',
  solar: '#eab308',
  biofuel: '#92400e',
  otherRenew: '#0d9488',
  fossil: '#ef4444',
  renewables: '#10b981',
  lowCarbon: '#6366f1',
};

// ─── Tooltips ────────────────────────────────────────────────────────────────

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.filter((p: any) => p.value != null).map((p: any, i: number) => (
        <p key={i} className="text-sm flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color || p.stroke || p.fill }} />
          <span className="text-gray-200">{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Reusable layout ─────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D2E369]">
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
      <div className="h-px bg-[#D2E369]/30 flex-1" />
      <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D2E369]/50 shadow-lg">
        {icon} {title}
      </h2>
      <div className="h-px bg-[#D2E369]/30 flex-1" />
    </div>
  );
}

function StatCard({ label, value, unit, color, icon, countryValue, countryName, baseLabel = 'Global', subtitle }: { label: string; value: string; unit?: string; color: string; icon: React.ReactNode; countryValue?: string; countryName?: string; baseLabel?: string; subtitle?: string }) {
  return (
    <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700/50">
      {countryValue && countryName ? (
        <>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-mono ${color}`}>{countryValue}</span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{countryName}</div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{baseLabel}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </>
      ) : (
        <>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
          {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </>
      )}
    </div>
  );
}

// ─── Location Search (countries + US states) ────────────────────────────────

interface LocationSuggestion {
  label: string;
  type: 'country' | 'us-state';
  value: string; // country name or state code
  stateName?: string;
}

function LocationSearch({ onSelect, loading, error }: {
  onSelect: (loc: LocationSuggestion) => void;
  loading: boolean;
  error?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    try {
      const res = await fetch(`/api/climate/search?q=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      if (data.results?.length > 0) {
        const mapped: LocationSuggestion[] = [];
        const seen = new Set<string>();
        for (const r of data.results) {
          if (r.owidCode === 'OWID_WRL') continue;
          // Skip city-mapped results (e.g. "london → ...")
          const isCityMapping = r.name.includes(' → ');
          if (r.type === 'uk-region') {
            // Map UK regions/countries to United Kingdom, but skip city mappings
            if (isCityMapping) continue;
            if (!seen.has('United Kingdom')) {
              mapped.push({ label: '🇬🇧 United Kingdom', type: 'country', value: 'United Kingdom' });
              seen.add('United Kingdom');
            }
          } else if (r.type === 'country' || r.type === 'us-state') {
            if (isCityMapping) continue;
            const key = r.type === 'us-state' ? r.id : r.name;
            if (seen.has(key)) continue;
            seen.add(key);
            mapped.push({
              label: `${r.type === 'us-state' ? '🇺🇸' : countryFlag(r.owidCode)} ${r.name}`,
              type: r.type as 'country' | 'us-state',
              value: r.type === 'us-state' ? r.id.replace('us-', '').toUpperCase() : r.name,
              stateName: r.type === 'us-state' ? r.name : undefined,
            });
          }
        }
        setSuggestions(mapped.slice(0, 10));
        setShowDropdown(mapped.length > 0);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch {
      // Silently fail for type-ahead
    }
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }, [doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#D2E369' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            placeholder="Country or USA state…"
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#D2E369]/50 bg-gray-900/60 text-sm text-white placeholder-[#D2E369]/60 focus:ring-2 focus:ring-[#D2E369] focus:border-[#D2E369] outline-none transition-all"
            autoComplete="off"
          />
        </div>
        <button type="submit" disabled={loading}
          className="text-sm font-bold px-4 py-1.5 rounded-lg flex items-center justify-center min-w-[100px] transition-opacity hover:opacity-85 rounded-t-[14px]" style={{ backgroundColor: '#D2E369', color: '#2C5263' }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-2" />Search</>}
        </button>
      </form>
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.value}-${i}`}
              onClick={() => { setQuery(s.stateName || s.value); onSelect(s); setShowDropdown(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-800 text-sm text-gray-200 border-b border-gray-800 last:border-0 transition-colors flex items-center gap-2"
              type="button"
            >
              <span>{s.label}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {s.type === 'us-state' ? 'US State' : 'Country'}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-orange-400">{error}</p>
      )}
    </div>
  );
}

// ─── Chart Sections ──────────────────────────────────────────────────────────

function EnergyMixSection({ data, countryData, baseLabel = 'Global' }: { data: CountryEnergy; countryData?: CountryEnergy | null; baseLabel?: string }) {
  // Stacked area: fossil vs renewables vs nuclear (TWh)
  const mixData = useMemo(() => {
    return data.yearly
      .filter(y => y.fossil != null || y.renewables != null || y.nuclear != null)
      .map(y => ({
        year: y.year,
        Fossil: y.fossil,
        Renewables: y.renewables,
        Nuclear: y.nuclear,
      }));
  }, [data.yearly]);

  // Country stacked area: fossil vs renewables vs nuclear (TWh)
  const countryMixData = useMemo(() => {
    if (!countryData) return null;
    return countryData.yearly
      .filter(y => y.fossil != null || y.renewables != null || y.nuclear != null)
      .map(y => ({
        year: y.year,
        Fossil: y.fossil,
        Renewables: y.renewables,
        Nuclear: y.nuclear,
      }));
  }, [countryData]);

  // Base share % over time
  const shareData = useMemo(() => {
    return data.yearly
      .filter(y => y.fossilShareEnergy != null)
      .map(y => ({
        year: y.year,
        Fossil: y.fossilShareEnergy,
        Renewables: y.renewablesShareEnergy,
        Nuclear: y.nuclearShareEnergy,
      }));
  }, [data.yearly]);

  // Country share % over time
  const countryShareData = useMemo(() => {
    if (!countryData) return null;
    return countryData.yearly
      .filter(y => y.fossilShareEnergy != null)
      .map(y => ({
        year: y.year,
        Fossil: y.fossilShareEnergy,
        Renewables: y.renewablesShareEnergy,
        Nuclear: y.nuclearShareEnergy,
      }));
  }, [countryData]);

  // Country comparison share data
  const comparisonData = useMemo(() => {
    if (!countryData) return null;
    const baseMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.fossilShareEnergy != null && baseMap.has(y.year))
      .map(y => ({
        year: y.year,
        [`${countryData.name} Fossil`]: y.fossilShareEnergy,
        [`${countryData.name} Renewables`]: y.renewablesShareEnergy,
        [`${baseLabel} Fossil`]: baseMap.get(y.year)?.fossilShareEnergy,
        [`${baseLabel} Renewables`]: baseMap.get(y.year)?.renewablesShareEnergy,
      }));
  }, [data.yearly, countryData, baseLabel]);

  if (mixData.length === 0) return null;

  return (
    <>
      <Divider icon={<Flame className="h-5 w-5" />} title="Energy Mix" />

      <SectionCard icon={<BarChart3 className="h-5 w-5 text-orange-400" />} title="Primary Energy Consumption">
        {/* Country stacked area */}
        {countryMixData && countryMixData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} – primary energy by source (TWh)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryMixData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Area type="monotone" dataKey="Fossil" stackId="1" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Renewables" stackId="1" stroke={COLORS.renewables} fill={COLORS.renewables} fillOpacity={0.7} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={countryMixData}>
                      <Area type="monotone" dataKey="Fossil" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        <SubSection title={`${baseLabel} – primary energy by source (TWh) – drag slider to zoom`}>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mixData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                <Area type="monotone" dataKey="Fossil" stackId="1" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Renewables" stackId="1" stroke={COLORS.renewables} fill={COLORS.renewables} fillOpacity={0.7} />
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                  <AreaChart data={mixData}>
                    <Area type="monotone" dataKey="Fossil" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.2} dot={false} strokeWidth={1} />
                  </AreaChart>
                </Brush>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SubSection>

        {countryShareData && countryShareData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} – share of primary energy (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryShareData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} allowDataOverflow />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Area type="monotone" dataKey="Fossil" stackId="1" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Renewables" stackId="1" stroke={COLORS.renewables} fill={COLORS.renewables} fillOpacity={0.7} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={countryShareData}>
                      <Area type="monotone" dataKey="Fossil" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {shareData.length > 0 && (
          <SubSection title={`${baseLabel} – share of primary energy (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={shareData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} allowDataOverflow />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Area type="monotone" dataKey="Fossil" stackId="1" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Renewables" stackId="1" stroke={COLORS.renewables} fill={COLORS.renewables} fillOpacity={0.7} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={shareData}>
                      <Area type="monotone" dataKey="Fossil" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
        <p className="text-sm text-gray-400 mt-4">
          Total primary energy consumption broken down by source. The world remains heavily dependent on
          fossil fuels, though renewables are the <span className="text-emerald-400 font-medium">fastest-growing</span> segment.{" "}
          Source:{" "}
          <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
          / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a> (CC-BY).
        </p>
      </SectionCard>

      {comparisonData && comparisonData.length > 0 && countryData && (
        <SectionCard icon={<Globe className="h-5 w-5 text-blue-400" />} title={`${countryData.name} vs ${baseLabel} – Energy Share`}>
          <SubSection title="Fossil & renewable share of primary energy (%)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} allowDataOverflow />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Line type="monotone" dataKey={`${countryData.name} Fossil`} stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={`${baseLabel} Fossil`} stroke="#fca5a5" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Line type="monotone" dataKey={`${countryData.name} Renewables`} stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={`${baseLabel} Renewables`} stroke="#6ee7b7" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={comparisonData}>
                      <YAxis hide domain={[0, 100]} />
                      <Line type="monotone" dataKey={`${baseLabel} Fossil`} stroke="#fca5a5" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
          <p className="text-sm text-gray-400 mt-4">
            Comparing <span className="text-white font-medium">{countryData.name}</span>&apos;s fossil and renewable energy share against the global average.{" "}
            Source:{" "}
            <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
            / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a> (CC-BY).
          </p>
        </SectionCard>
      )}
    </>
  );
}

function ElecStackedChart({ data: yearly, label }: { data: EnergyYearlyPoint[]; label: string }) {
  const elecShareData = useMemo(() => {
    return yearly
      .filter(y => y.coalShareElec != null || y.gasShareElec != null)
      .map(y => ({
        year: y.year,
        Coal: y.coalShareElec,
        Gas: y.gasShareElec,
        Oil: y.oilShareElec,
        Nuclear: y.nuclearShareElec,
        Hydro: y.hydroShareElec,
        Wind: y.windShareElec,
        Solar: y.solarShareElec,
        Biofuel: y.biofuelShareElec,
        Other: y.otherRenewShareElecExcBiofuel,
      }));
  }, [yearly]);
  if (elecShareData.length === 0) return null;
  return (
    <SubSection title={`${label} – share of electricity generation (%)`}>
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={elecShareData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} allowDataOverflow />
            <Tooltip content={<DarkTooltip />} />
            <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
            <Area type="monotone" dataKey="Coal" stackId="1" stroke={COLORS.coal} fill={COLORS.coal} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Oil" stackId="1" stroke={COLORS.oil} fill={COLORS.oil} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Gas" stackId="1" stroke={COLORS.gas} fill={COLORS.gas} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Hydro" stackId="1" stroke={COLORS.hydro} fill={COLORS.hydro} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Wind" stackId="1" stroke={COLORS.wind} fill={COLORS.wind} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Solar" stackId="1" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Biofuel" stackId="1" stroke={COLORS.biofuel} fill={COLORS.biofuel} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Other" stackId="1" stroke={COLORS.otherRenew} fill={COLORS.otherRenew} fillOpacity={0.8} />
            <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
              <AreaChart data={elecShareData}>
                <Area type="monotone" dataKey="Coal" stroke={COLORS.coal} fill={COLORS.coal} fillOpacity={0.2} dot={false} strokeWidth={1} />
              </AreaChart>
            </Brush>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SubSection>
  );
}

function ElectricityMixSection({ data, countryData, baseLabel = 'Global' }: { data: CountryEnergy; countryData?: CountryEnergy | null; baseLabel?: string }) {
  // Comparison line chart: fossil vs renewables share of electricity
  const comparisonData = useMemo(() => {
    if (!countryData) return null;
    const baseMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => (y.fossilShareElec != null || y.renewablesShareElec != null) && baseMap.has(y.year))
      .map(y => {
        const w = baseMap.get(y.year);
        return {
          year: y.year,
          [`${countryData.name} Fossil`]: y.fossilShareElec,
          [`${countryData.name} Renewables`]: y.renewablesShareElec,
          [`${baseLabel} Fossil`]: w?.fossilShareElec ?? null,
          [`${baseLabel} Renewables`]: w?.renewablesShareElec ?? null,
        };
      });
  }, [data.yearly, countryData, baseLabel]);

  const hasWorldElec = data.yearly.some(y => y.coalShareElec != null || y.gasShareElec != null);
  if (!hasWorldElec) return null;

  return (
    <>
      <Divider icon={<Zap className="h-5 w-5" />} title="Electricity Mix" />

      <SectionCard icon={<Zap className="h-5 w-5 text-yellow-400" />} title="Electricity Generation by Source">
        {/* Show country first when selected */}
        {countryData && <ElecStackedChart data={countryData.yearly} label={countryData.name} />}

        {/* Base data */}
        <ElecStackedChart data={data.yearly} label={baseLabel} />

        {/* Comparison: fossil vs renewables share */}
        {comparisonData && comparisonData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} vs ${baseLabel} – fossil & renewable electricity share (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} allowDataOverflow />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Line type="monotone" dataKey={`${countryData.name} Fossil`} stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={`${baseLabel} Fossil`} stroke="#fca5a5" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Line type="monotone" dataKey={`${countryData.name} Renewables`} stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={`${baseLabel} Renewables`} stroke="#6ee7b7" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={comparisonData}>
                      <Line type="monotone" dataKey={`${baseLabel} Fossil`} stroke="#fca5a5" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
        <p className="text-sm text-gray-400 mt-4">
          How electricity is generated matters enormously for emissions. The shift from coal and gas
          to wind, solar, hydro and nuclear is the key to decarbonising the grid.{" "}
          Source:{" "}
          <a href="https://ember-climate.org/data/data-tools/data-explorer/" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Ember Global Electricity Review</a> (CC-BY).
        </p>
      </SectionCard>
    </>
  );
}

function RenewablesGrowthSection({ data, countryData, baseLabel = 'Global' }: { data: CountryEnergy; countryData?: CountryEnergy | null; baseLabel?: string }) {
  // Base renewables stacked area
  const worldRenewData = useMemo(() => {
    return data.yearly
      .filter(y => y.solarShareElec != null || y.windShareElec != null || y.hydroShareElec != null)
      .map(y => ({
        year: y.year,
        Solar: y.solarShareElec,
        Wind: y.windShareElec,
        Hydro: y.hydroShareElec,
      }));
  }, [data.yearly]);

  // Country renewables stacked area
  const countryRenewData = useMemo(() => {
    if (!countryData) return null;
    return countryData.yearly
      .filter(y => y.solarShareElec != null || y.windShareElec != null || y.hydroShareElec != null)
      .map(y => ({
        year: y.year,
        Solar: y.solarShareElec,
        Wind: y.windShareElec,
        Hydro: y.hydroShareElec,
      }));
  }, [countryData]);

  // Comparison: total renewables share of electricity
  const renewCompData = useMemo(() => {
    if (!countryData) return null;
    const baseMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.renewablesShareElec != null && baseMap.has(y.year))
      .map(y => ({
        year: y.year,
        [countryData.name]: y.renewablesShareElec,
        [baseLabel]: baseMap.get(y.year)?.renewablesShareElec ?? null,
      }));
  }, [data.yearly, countryData, baseLabel]);

  // Comparison: solar + wind share side by side
  const solarWindCompData = useMemo(() => {
    if (!countryData) return null;
    const baseMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => (y.solarShareElec != null || y.windShareElec != null) && baseMap.has(y.year))
      .map(y => {
        const w = baseMap.get(y.year);
        return {
          year: y.year,
          [`${countryData.name} Solar`]: y.solarShareElec,
          [`${countryData.name} Wind`]: y.windShareElec,
          [`${baseLabel} Solar`]: w?.solarShareElec ?? null,
          [`${baseLabel} Wind`]: w?.windShareElec ?? null,
        };
      });
  }, [data.yearly, countryData, baseLabel]);

  if (worldRenewData.length === 0) return null;

  return (
    <>
      <Divider icon={<Sun className="h-5 w-5" />} title="Renewables Growth" />

      <SectionCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} title="Renewable Electricity Growth">
        {/* Country renewables stacked area */}
        {countryRenewData && countryRenewData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} – share of electricity from renewables (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryRenewData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 'auto']} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Area type="monotone" dataKey="Hydro" stackId="1" stroke={COLORS.hydro} fill={COLORS.hydro} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Wind" stackId="1" stroke={COLORS.wind} fill={COLORS.wind} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Solar" stackId="1" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.6} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={countryRenewData}>
                      <Area type="monotone" dataKey="Hydro" stroke={COLORS.hydro} fill={COLORS.hydro} fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Base renewables stacked area */}
        <SubSection title={`${baseLabel} – share of electricity from renewables (%)`}>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={worldRenewData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 'auto']} />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                <Area type="monotone" dataKey="Hydro" stackId="1" stroke={COLORS.hydro} fill={COLORS.hydro} fillOpacity={0.6} />
                <Area type="monotone" dataKey="Wind" stackId="1" stroke={COLORS.wind} fill={COLORS.wind} fillOpacity={0.6} />
                <Area type="monotone" dataKey="Solar" stackId="1" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.6} />
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                  <AreaChart data={worldRenewData}>
                    <Area type="monotone" dataKey="Hydro" stroke={COLORS.hydro} fill={COLORS.hydro} fillOpacity={0.2} dot={false} strokeWidth={1} />
                  </AreaChart>
                </Brush>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SubSection>

        {/* Comparison: total renewables share */}
        {renewCompData && renewCompData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} vs ${baseLabel} – total renewable electricity share (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={renewCompData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 'auto']} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Line type="monotone" dataKey={countryData.name} stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={baseLabel} stroke="#6ee7b7" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={renewCompData}>
                      <Line type="monotone" dataKey={countryData.name} stroke="#10b981" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Comparison: solar & wind share */}
        {solarWindCompData && solarWindCompData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} vs ${baseLabel} – solar & wind electricity share (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={solarWindCompData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 'auto']} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Line type="monotone" dataKey={`${countryData.name} Solar`} stroke={COLORS.solar} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={`${baseLabel} Solar`} stroke={COLORS.solar} strokeWidth={2} dot={false} strokeDasharray="6 3" opacity={0.5} />
                  <Line type="monotone" dataKey={`${countryData.name} Wind`} stroke={COLORS.wind} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={`${baseLabel} Wind`} stroke={COLORS.wind} strokeWidth={2} dot={false} strokeDasharray="6 3" opacity={0.5} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={solarWindCompData}>
                      <Line type="monotone" dataKey={`${countryData.name} Solar`} stroke={COLORS.solar} dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
        <p className="text-sm text-gray-400 mt-4">
          Solar and wind are experiencing <span className="text-yellow-400 font-medium">exponential growth</span>. Solar electricity
          has grown from near-zero to over 6% of global generation in just 15 years.{" "}
          Source:{" "}
          <a href="https://ember-climate.org/data/data-tools/data-explorer/" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Ember Global Electricity Review</a> (CC-BY).
        </p>
      </SectionCard>
    </>
  );
}

function CarbonIntensitySection({ data, countryData, baseLabel = 'Global' }: { data: CountryEnergy; countryData?: CountryEnergy | null; baseLabel?: string }) {
  const chartData = useMemo(() => {
    const baseMap = new Map(data.yearly.filter(y => y.carbonIntensity != null).map(y => [y.year, y.carbonIntensity]));
    if (countryData) {
      const countryMap = new Map(countryData.yearly.filter(y => y.carbonIntensity != null).map(y => [y.year, y.carbonIntensity]));
      const years = new Set([...baseMap.keys(), ...countryMap.keys()]);
      return Array.from(years)
        .sort((a, b) => a - b)
        .map(year => ({
          year,
          [baseLabel]: baseMap.get(year) ?? null,
          [countryData.name]: countryMap.get(year) ?? null,
        }));
    }
    return Array.from(baseMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, val]) => ({ year, [baseLabel]: val }));
  }, [data.yearly, countryData, baseLabel]);

  if (chartData.length === 0) return null;

  return (
    <>
      <Divider icon={<Factory className="h-5 w-5" />} title="Carbon Intensity" />

      <SectionCard icon={<Factory className="h-5 w-5 text-gray-400" />} title="Carbon Intensity of Electricity">
        <SubSection title="gCO₂ per kWh – drag slider to zoom">
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                <Line type="monotone" dataKey={baseLabel} stroke="#6ee7b7" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                {countryData && (
                  <Line type="monotone" dataKey={countryData.name} stroke="#10b981" strokeWidth={2} dot={false} />
                )}
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                  <LineChart data={chartData}>
                    <Line type="monotone" dataKey={baseLabel} stroke="#6ee7b7" dot={false} strokeWidth={1} />
                  </LineChart>
                </Brush>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SubSection>
        <p className="text-sm text-gray-400 mt-4">
          Grams of CO₂ emitted per kilowatt-hour of electricity generated. Lower is better.
          The global average has been slowly declining as renewables displace coal, but the pace
          must <span className="text-red-400 font-medium">accelerate dramatically</span> to meet climate goals.{" "}
          Source:{" "}
          <a href="https://ember-climate.org/data/data-tools/data-explorer/" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Ember Global Electricity Review</a> (CC-BY).
        </p>
      </SectionCard>
    </>
  );
}

function EnergyPerCapitaSection({ data, countryData, baseLabel = 'Global' }: { data: CountryEnergy; countryData?: CountryEnergy | null; baseLabel?: string }) {
  // Energy per capita (kWh/person)
  const worldPerCapita = useMemo(() => {
    return data.yearly
      .filter(y => y.energyPerCapita != null)
      .map(y => ({ year: y.year, [baseLabel]: y.energyPerCapita }));
  }, [data.yearly, baseLabel]);

  // Comparison: energy per capita
  const compData = useMemo(() => {
    if (!countryData) return null;
    const baseMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.energyPerCapita != null && baseMap.has(y.year) && baseMap.get(y.year)!.energyPerCapita != null)
      .map(y => ({
        year: y.year,
        [countryData.name]: y.energyPerCapita,
        [baseLabel]: baseMap.get(y.year)!.energyPerCapita,
      }));
  }, [data.yearly, countryData, baseLabel]);

  // Electricity per capita (kWh/person)
  const elecCompData = useMemo(() => {
    if (!countryData) return null;
    const baseMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.perCapitaElectricity != null && baseMap.has(y.year) && baseMap.get(y.year)!.perCapitaElectricity != null)
      .map(y => ({
        year: y.year,
        [countryData.name]: y.perCapitaElectricity,
        [baseLabel]: baseMap.get(y.year)!.perCapitaElectricity,
      }));
  }, [data.yearly, countryData, baseLabel]);

  const worldElecPerCapita = useMemo(() => {
    return data.yearly
      .filter(y => y.perCapitaElectricity != null)
      .map(y => ({ year: y.year, [baseLabel]: y.perCapitaElectricity }));
  }, [data.yearly, baseLabel]);

  if (worldPerCapita.length === 0) return null;

  return (
    <>
      <Divider icon={<Users className="h-5 w-5" />} title="Per Capita" />

      <SectionCard icon={<Users className="h-5 w-5 text-blue-400" />} title="Energy Use Per Capita">
        {/* Energy per capita */}
        {compData && compData.length > 0 && countryData ? (
          <SubSection title={`${countryData.name} vs ${baseLabel} – primary energy per capita (kWh/person)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Line type="monotone" dataKey={countryData.name} stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={baseLabel} stroke="#93c5fd" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={compData}>
                      <Line type="monotone" dataKey={countryData.name} stroke="#3b82f6" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        ) : (
          <SubSection title={`${baseLabel} – primary energy per capita (kWh/person)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={worldPerCapita} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Area type="monotone" dataKey={baseLabel} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={worldPerCapita}>
                      <Area type="monotone" dataKey={baseLabel} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Electricity per capita */}
        {elecCompData && elecCompData.length > 0 && countryData ? (
          <SubSection title={`${countryData.name} vs ${baseLabel} – electricity per capita (kWh/person)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={elecCompData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Line type="monotone" dataKey={countryData.name} stroke="#a855f7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={baseLabel} stroke="#c4b5fd" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={elecCompData}>
                      <Line type="monotone" dataKey={countryData.name} stroke="#a855f7" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        ) : worldElecPerCapita.length > 0 && (
          <SubSection title={`${baseLabel} – electricity per capita (kWh/person)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={worldElecPerCapita} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Area type="monotone" dataKey={baseLabel} stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={worldElecPerCapita}>
                      <Area type="monotone" dataKey={baseLabel} stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
        <p className="text-sm text-gray-400 mt-4">
          Energy consumption per person reveals vast inequalities between nations.
          High-income countries use many times more energy per capita than the global average,
          though efficiency gains are <span className="text-emerald-400 font-medium">narrowing the gap</span>.{" "}
          Source:{" "}
          <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
          / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a> (CC-BY).
        </p>
      </SectionCard>
    </>
  );
}

function EmissionsSection({ data, countryData, baseLabel = 'Global' }: { data: CountryEnergy; countryData?: CountryEnergy | null; baseLabel?: string }) {
  // Base emissions area
  const worldData = useMemo(() => {
    return data.yearly
      .filter(y => y.ghgEmissions != null)
      .map(y => ({ year: y.year, Emissions: y.ghgEmissions }));
  }, [data.yearly]);

  // Country emissions area (own scale)
  const countryEmData = useMemo(() => {
    if (!countryData) return null;
    return countryData.yearly
      .filter(y => y.ghgEmissions != null)
      .map(y => ({ year: y.year, Emissions: y.ghgEmissions }));
  }, [countryData]);

  // Base per-capita data (always shown)
  const worldPerCapita = useMemo(() => {
    return data.yearly
      .filter(y => y.ghgPerCapita != null)
      .map(y => ({ year: y.year, [baseLabel]: y.ghgPerCapita }));
  }, [data.yearly, baseLabel]);

  // Per-capita comparison (tonnes per person)
  const perCapitaComp = useMemo(() => {
    if (!countryData) return null;
    const baseMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.ghgPerCapita != null && baseMap.has(y.year) && baseMap.get(y.year)!.ghgPerCapita != null)
      .map(y => ({
        year: y.year,
        [countryData.name]: y.ghgPerCapita,
        [baseLabel]: baseMap.get(y.year)!.ghgPerCapita,
      }));
  }, [data.yearly, countryData, baseLabel]);

  if (worldData.length === 0) return null;

  return (
    <>
      <Divider icon={<Flame className="h-5 w-5" />} title="Emissions" />

      <SectionCard icon={<Flame className="h-5 w-5 text-red-400" />} title="Greenhouse Gas Emissions from Energy">
        {/* Country emissions at its own scale */}
        {countryEmData && countryEmData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} – annual GHG emissions (Mt CO₂eq)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryEmData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Area type="monotone" dataKey="Emissions" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={countryEmData}>
                      <Area type="monotone" dataKey="Emissions" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Base emissions */}
        <SubSection title={`${baseLabel} – annual GHG emissions (Mt CO₂eq)`}>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={worldData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                <Area type="monotone" dataKey="Emissions" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2} />
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                  <AreaChart data={worldData}>
                    <Area type="monotone" dataKey="Emissions" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} dot={false} strokeWidth={1} />
                  </AreaChart>
                </Brush>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SubSection>

        {/* Per-capita comparison – fair like-for-like */}
        {perCapitaComp && perCapitaComp.length > 0 && countryData ? (
          <SubSection title={`${countryData.name} vs ${baseLabel} – GHG emissions per capita (tonnes CO₂eq)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perCapitaComp} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Line type="monotone" dataKey={countryData.name} stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={baseLabel} stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <LineChart data={perCapitaComp}>
                      <Line type="monotone" dataKey={countryData.name} stroke="#f59e0b" dot={false} strokeWidth={1} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        ) : worldPerCapita.length > 0 && (
          <SubSection title={`${baseLabel} – GHG emissions per capita (tonnes CO₂eq)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={worldPerCapita} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                  <Area type="monotone" dataKey={baseLabel} stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                    <AreaChart data={worldPerCapita}>
                      <Area type="monotone" dataKey={baseLabel} stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} dot={false} strokeWidth={1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
        <p className="text-sm text-gray-400 mt-4">
          Total greenhouse gas emissions from energy production and consumption (Mt CO₂ equivalent).
          Despite renewable growth, global emissions continue to rise as energy demand outpaces the transition.{" "}
          Source:{" "}
          <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
          / <a href="https://www.climatewatchdata.org" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Climate Analysis Indicators Tool (CAIT)</a>.
        </p>
      </SectionCard>
    </>
  );
}

function FossilFuelBreakdownSection({ data, countryData, baseLabel = 'Global' }: { data: CountryEnergy; countryData?: CountryEnergy | null; baseLabel?: string }) {
  // Base fossil stacked area
  const worldFossilData = useMemo(() => {
    return data.yearly
      .filter(y => y.coal != null || y.oil != null || y.gas != null)
      .map(y => ({
        year: y.year,
        Coal: y.coal,
        Oil: y.oil,
        Gas: y.gas,
      }));
  }, [data.yearly]);

  // Country fossil stacked area
  const countryFossilData = useMemo(() => {
    if (!countryData) return null;
    return countryData.yearly
      .filter(y => y.coal != null || y.oil != null || y.gas != null)
      .map(y => ({
        year: y.year,
        Coal: y.coal,
        Oil: y.oil,
        Gas: y.gas,
      }));
  }, [countryData]);

  // Comparison: total fossil share of primary energy
  const fossilShareComp = useMemo(() => {
    if (!countryData) return null;
    const baseMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.fossilShareEnergy != null && baseMap.has(y.year))
      .map(y => ({
        year: y.year,
        [countryData.name]: y.fossilShareEnergy,
        [baseLabel]: baseMap.get(y.year)?.fossilShareEnergy ?? null,
      }));
  }, [data.yearly, countryData, baseLabel]);

  if (worldFossilData.length === 0) return null;

  const FossilStackedChart = ({ chartData, title }: { chartData: typeof worldFossilData; title: string }) => (
    <SubSection title={title}>
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatTWh} />
            <Tooltip content={<DarkTooltip />} />
            <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
            <Area type="monotone" dataKey="Coal" stackId="1" stroke={COLORS.coal} fill={COLORS.coal} fillOpacity={0.7} />
            <Area type="monotone" dataKey="Oil" stackId="1" stroke={COLORS.oil} fill={COLORS.oil} fillOpacity={0.7} />
            <Area type="monotone" dataKey="Gas" stackId="1" stroke={COLORS.gas} fill={COLORS.gas} fillOpacity={0.7} />
            <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
              <AreaChart data={chartData}>
                <Area type="monotone" dataKey="Coal" stroke={COLORS.coal} fill={COLORS.coal} fillOpacity={0.2} dot={false} strokeWidth={1} />
              </AreaChart>
            </Brush>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SubSection>
  );

  return (
    <SectionCard icon={<Flame className="h-5 w-5 text-orange-400" />} title="Fossil Fuel Breakdown">
      {countryFossilData && countryFossilData.length > 0 && countryData && (
        <FossilStackedChart chartData={countryFossilData} title={`${countryData.name} – fossil fuel consumption by type (TWh)`} />
      )}

      <FossilStackedChart chartData={worldFossilData} title={`${baseLabel} – fossil fuel consumption by type (TWh)`} />

      {fossilShareComp && fossilShareComp.length > 0 && countryData && (
        <SubSection title={`${countryData.name} vs ${baseLabel} – fossil share of primary energy (%)`}>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fossilShareComp} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} allowDataOverflow />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10, left: 0, right: 0 }} />
                <Line type="monotone" dataKey={countryData.name} stroke={COLORS.fossil} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={baseLabel} stroke="#f87171" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                  <LineChart data={fossilShareComp}>
                    <YAxis hide domain={[0, 100]} />
                    <Line type="monotone" dataKey={baseLabel} stroke="#f87171" dot={false} strokeWidth={1} />
                  </LineChart>
                </Brush>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SubSection>
      )}
      <p className="text-sm text-gray-400 mt-4">
        The three fossil fuels – coal, oil, and gas – broken down individually.
        Coal is the dirtiest, while gas produces roughly half the CO₂ per unit of energy.{" "}
        Source:{" "}
        <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
        / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a> (CC-BY).
      </p>
    </SectionCard>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const ENERGY_CACHE_KEY = 'energy-page-cache-v2';

export default function EnergyPage() {
  const [data, setData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryData, setCountryData] = useState<CountryEnergy | null>(null);
  const [usStateData, setUsStateData] = useState<CountryEnergy | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<'country' | 'us-state' | null>(null);

  useEffect(() => {
    // Try restoring from sessionStorage first
    try {
      const raw = sessionStorage.getItem(ENERGY_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.data) { setData(cached.data); setLoading(false); }
        if (cached.countryData) setCountryData(cached.countryData);
        if (cached.usStateData) setUsStateData(cached.usStateData);
        if (cached.locationType) setLocationType(cached.locationType);
        if (cached.data) return; // skip fetch if we have cached world data
      }
    } catch { /* ignore */ }
    fetch('/api/climate/energy')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  // Persist to sessionStorage whenever data changes
  useEffect(() => {
    if (!data) return;
    try {
      sessionStorage.setItem(ENERGY_CACHE_KEY, JSON.stringify({ data, countryData, usStateData, locationType }));
    } catch { /* quota exceeded – ignore */ }
  }, [data, countryData, usStateData, locationType]);

  const handleLocationSelect = useCallback(async (loc: LocationSuggestion) => {
    setCountryLoading(true);
    setCountryError(null);
    try {
      if (loc.type === 'us-state') {
        const res = await fetch(`/api/climate/energy?state=${encodeURIComponent(loc.value)}&stateName=${encodeURIComponent(loc.stateName || loc.value)}`);
        const d = await res.json();
        if (d.usState) {
          setCountryData(d.country || null); // USA totals
          setUsStateData(d.usState);
          setLocationType('us-state');
        } else {
          setCountryData(null);
          setUsStateData(null);
          setLocationType(null);
          setCountryError(`No energy data found for "${loc.stateName || loc.value}".`);
        }
      } else {
        const res = await fetch(`/api/climate/energy?country=${encodeURIComponent(loc.value)}`);
        const d = await res.json();
        if (d.country) {
          setCountryData(d.country);
          setUsStateData(null);
          setLocationType('country');
        } else {
          setCountryData(null);
          setUsStateData(null);
          setLocationType(null);
          setCountryError(`No energy data found for "${loc.value}". Try a country name like "United Kingdom" or "Germany".`);
        }
      }
    } catch {
      setCountryError('Failed to fetch data. Please try again.');
    } finally {
      setCountryLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <main>
        <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 font-sans text-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#D2E369] flex flex-col items-center gap-4 mt-6">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
              <p className="text-gray-400">Loading global energy data...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main>
        <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 font-sans text-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-950/50 border border-red-800 p-8 rounded-2xl text-center mt-6">
              <p className="text-red-400 font-medium">{error || 'Failed to load energy data'}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const w = data.world;
  const latest = w.latest;

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Hero ───────────────────────────────────────────────── */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369]">
            <div className="px-4 py-3 md:px-6 md:py-4 rounded-t-2xl" style={{ backgroundColor: '#D2E369' }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#2C5263' }}>
                Local & Global Energy Data
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-b-2xl">
            <p className="text-sm md:text-base mb-4 font-medium" style={{ color: '#D2E369' }}>
              Search for any country, or USA state.
            </p>

            {/* Location search */}
            {!countryData && !usStateData && (
              <LocationSearch onSelect={handleLocationSelect} loading={countryLoading} error={countryError} />
            )}

            {(countryData || usStateData) && (
              <div className="flex items-start gap-2 mt-3">
                <div className="flex items-center gap-1.5 flex-1 text-emerald-400 bg-emerald-950/40 py-1.5 px-4 rounded-lg border border-emerald-800/50">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {usStateData
                      ? `Comparing ${usStateData.name} with United States`
                      : `Comparing with ${countryData?.name}`}
                  </span>
                </div>
                <button
                  onClick={() => { setCountryData(null); setUsStateData(null); setLocationType(null); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-sm text-white px-4 py-1.5 rounded-lg font-medium min-w-[100px] transition-colors"
                >
                  Change
                </button>
              </div>
            )}
          </div>
          </div>

          {/* ─── Live Stats ─────────────────────────────────────────── */}
          {latest && (() => {
            const compData = usStateData || countryData;
            const compName = compData?.name;
            const statBaseLabel = usStateData ? 'United States' : 'Global';
            // For US states, show USA values as the "main" stat, state as comparison
            const mainLatest = usStateData ? countryData?.latest : latest;
            return (
            <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D2E369] p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold font-mono text-white">Key Facts ({(mainLatest || latest).year})</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Fossil – primary energy"
                subtitle="Coal, oil & gas. Rest is renewables + nuclear."
                value={(mainLatest || latest).fossilShare?.toFixed(1) || '–'}
                unit="%"
                color="text-red-400"
                icon={<Flame className="h-5 w-5" />}
                countryValue={compData?.latest?.fossilShare?.toFixed(1)}
                countryName={compName}
                baseLabel={statBaseLabel}
              />
              <StatCard
                label="Renewables – primary energy"
                subtitle="Solar, wind, hydro, biomass & other."
                value={(mainLatest || latest).renewablesShare?.toFixed(1) || '–'}
                unit="%"
                color="text-emerald-400"
                icon={<Zap className="h-5 w-5" />}
                countryValue={compData?.latest?.renewablesShare?.toFixed(1)}
                countryName={compName}
                baseLabel={statBaseLabel}
              />
              <StatCard
                label="Solar – share of electricity"
                subtitle="% of all electricity generated."
                value={(mainLatest || latest).solarShareElec?.toFixed(1) || '–'}
                unit="%"
                color="text-yellow-400"
                icon={<Sun className="h-5 w-5" />}
                countryValue={compData?.latest?.solarShareElec?.toFixed(1)}
                countryName={compName}
                baseLabel={statBaseLabel}
              />
              <StatCard
                label="Wind – share of electricity"
                subtitle="% of all electricity generated."
                value={(mainLatest || latest).windShareElec?.toFixed(1) || '–'}
                unit="%"
                color="text-[#06b6d4]"
                icon={<Wind className="h-5 w-5" />}
                countryValue={compData?.latest?.windShareElec?.toFixed(1)}
                countryName={compName}
                baseLabel={statBaseLabel}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Sources:{" "}
              <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
              / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a>{" "}
              (CC-BY) ·{" "}
              <a href="https://ember-climate.org/data/data-tools/data-explorer/" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Ember</a>{" "}
              (electricity shares).
            </p>
            </div>
            );
          })()}

          {/* ─── Chart Sections ─────────────────────────────────────── */}
          {(() => {
            // For US states: base = USA data, comparison = state data, label = "United States"
            // For countries: base = World data, comparison = country data, label = "Global"
            const baseData = usStateData ? countryData! : w;
            const compData = usStateData || countryData;
            const bl = usStateData ? 'United States' : undefined;
            return (
              <>
                {/* ─── Global Renewable Energy Map ─────────────────────────── */}
                <SectionCard icon={<Globe className="h-5 w-5 text-emerald-400" />} title="Renewable Energy Share by Country">
                  <EnergyChoroplethMap selectedCountry={usStateData ? 'United States' : countryData?.name} selectedState={usStateData?.name} />
                  <p className="text-gray-400 text-sm mt-3 text-center">
                    Percentage of primary energy from renewable sources. Hover over a country to see its renewable share. Zoom in to the USA to see state-level data.{" "}
                    Source:{" "}
                    <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
                    / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a> (CC-BY).
                  </p>
                </SectionCard>

                <EnergyMixSection data={baseData} countryData={compData} baseLabel={bl} />
                <ElectricityMixSection data={baseData} countryData={compData} baseLabel={bl} />
                <RenewablesGrowthSection data={baseData} countryData={compData} baseLabel={bl} />
                <FossilFuelBreakdownSection data={baseData} countryData={compData} baseLabel={bl} />
                <CarbonIntensitySection data={baseData} countryData={compData} baseLabel={bl} />
                <EnergyPerCapitaSection data={baseData} countryData={compData} baseLabel={bl} />
                <EmissionsSection data={baseData} countryData={compData} baseLabel={bl} />
              </>
            );
          })()}


        </div>
      </div>
    </main>
  );
}
