"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush,
} from 'recharts';
import {
  Loader2, Zap, Flame, Sun, Wind, Atom, Droplets, Factory,
  TrendingUp, BarChart3, Search, MapPin, Globe, Users,
} from 'lucide-react';

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
  fetchedAt: string;
}

// ─── Chart config ────────────────────────────────────────────────────────────

const CHART_MARGIN = { top: 10, right: 0, left: -20, bottom: 0 };
const BRUSH_HEIGHT = 30;

// ─── Colour palette ─────────────────────────────────────────────────────────

const COLORS = {
  coal: '#6b7280',
  oil: '#92400e',
  gas: '#d97706',
  nuclear: '#a855f7',
  hydro: '#3b82f6',
  wind: '#06b6d4',
  solar: '#eab308',
  biofuel: '#22c55e',
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
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="text-sm">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Reusable layout ─────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-800">
      <h2 className="text-xl font-bold font-mono text-white mb-5 flex items-center gap-2">
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

function StatCard({ label, value, unit, color, icon, countryValue, countryName }: { label: string; value: string; unit?: string; color: string; icon: React.ReactNode; countryValue?: string; countryName?: string }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col items-center text-center">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}{unit && <span className="text-sm ml-1">{unit}</span>}</p>
      {countryValue && countryName ? (
        <>
          <p className="text-[10px] text-gray-500 mt-0.5">World</p>
          <p className={`text-2xl font-bold font-mono ${color} mt-1`}>{countryValue}{unit && <span className="text-sm ml-1">{unit}</span>}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{countryName}</p>
          <p className="text-xs text-gray-400 mt-1">{label}</p>
        </>
      ) : (
        <p className="text-xs text-gray-400 mt-1">{label}</p>
      )}
    </div>
  );
}

// ─── Country Search (reusing climate dashboard location search) ──────────────

const POPULAR_COUNTRIES = [
  'United Kingdom', 'United States', 'China', 'India', 'Germany',
  'France', 'Brazil', 'Japan', 'Australia', 'Canada',
];

function CountrySearch({ onSelect, loading }: { onSelect: (name: string) => void; loading: boolean }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allCountries, setAllCountries] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Fetch country list from cached energy data
    fetch('/api/climate/energy')
      .then(r => r.json())
      .then(() => {
        // We'll use the OWID data keys — for now use popular countries
        // Full list would need a separate endpoint
      })
      .catch(() => {});
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const lower = value.toLowerCase();
    const matches = POPULAR_COUNTRIES.filter(c => c.toLowerCase().includes(lower));
    setSuggestions(matches);
    setShowDropdown(matches.length > 0);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSelect(query.trim());
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            placeholder="Compare with a country..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-gray-800 bg-gray-900/50 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
            autoComplete="off"
          />
        </div>
        <button type="submit" disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-sm text-white px-4 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" />Compare</>}
        </button>
      </form>
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((name) => (
            <button
              key={name}
              onClick={() => { setQuery(name); onSelect(name); setShowDropdown(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-800 text-sm text-gray-200 border-b border-gray-800 last:border-0 transition-colors"
              type="button"
            >{name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chart Sections ──────────────────────────────────────────────────────────

function EnergyMixSection({ data, countryData }: { data: CountryEnergy; countryData?: CountryEnergy | null }) {
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

  // World share % over time
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
    const worldMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.fossilShareEnergy != null && worldMap.has(y.year))
      .map(y => ({
        year: y.year,
        [`${countryData.name} Fossil`]: y.fossilShareEnergy,
        [`${countryData.name} Renewables`]: y.renewablesShareEnergy,
        ['World Fossil']: worldMap.get(y.year)?.fossilShareEnergy,
        ['World Renewables']: worldMap.get(y.year)?.renewablesShareEnergy,
      }));
  }, [data.yearly, countryData]);

  if (mixData.length === 0) return null;

  return (
    <>
      <Divider icon={<Flame className="h-5 w-5" />} title="Energy Mix" />

      <SectionCard icon={<BarChart3 className="h-5 w-5 text-orange-400" />} title="Primary Energy Consumption">
        <p className="text-sm text-gray-400 mb-4">
          Total primary energy consumption broken down by source. The world remains heavily dependent on
          fossil fuels, though renewables are the <span className="text-emerald-400 font-medium">fastest-growing</span> segment.
        </p>
        <SubSection title="World — primary energy by source (TWh) — drag slider to zoom">
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mixData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="Fossil" stackId="1" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.7} />
                <Area type="monotone" dataKey="Renewables" stackId="1" stroke={COLORS.renewables} fill={COLORS.renewables} fillOpacity={0.7} />
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SubSection>

        {/* Country stacked area */}
        {countryMixData && countryMixData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} — primary energy by source (TWh)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryMixData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Fossil" stackId="1" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Renewables" stackId="1" stroke={COLORS.renewables} fill={COLORS.renewables} fillOpacity={0.7} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {shareData.length > 0 && (
          <SubSection title="World — share of primary energy (%)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={shareData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Fossil" stackId="1" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Renewables" stackId="1" stroke={COLORS.renewables} fill={COLORS.renewables} fillOpacity={0.7} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {countryShareData && countryShareData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} — share of primary energy (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryShareData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Fossil" stackId="1" stroke={COLORS.fossil} fill={COLORS.fossil} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Renewables" stackId="1" stroke={COLORS.renewables} fill={COLORS.renewables} fillOpacity={0.7} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
      </SectionCard>

      {comparisonData && comparisonData.length > 0 && countryData && (
        <SectionCard icon={<Globe className="h-5 w-5 text-blue-400" />} title={`${countryData.name} vs World — Energy Share`}>
          <p className="text-sm text-gray-400 mb-4">
            Comparing <span className="text-white font-medium">{countryData.name}</span>&apos;s fossil and renewable energy share against the global average.
          </p>
          <SubSection title="Fossil & renewable share of primary energy (%)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey={`${countryData.name} Fossil`} stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World Fossil" stroke="#fca5a5" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Line type="monotone" dataKey={`${countryData.name} Renewables`} stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World Renewables" stroke="#6ee7b7" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
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
      }));
  }, [yearly]);
  if (elecShareData.length === 0) return null;
  return (
    <SubSection title={`${label} — share of electricity generation (%)`}>
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={elecShareData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
            <Tooltip content={<DarkTooltip />} />
            <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
            <Area type="monotone" dataKey="Coal" stackId="1" stroke={COLORS.coal} fill={COLORS.coal} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Oil" stackId="1" stroke={COLORS.oil} fill={COLORS.oil} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Gas" stackId="1" stroke={COLORS.gas} fill={COLORS.gas} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Hydro" stackId="1" stroke={COLORS.hydro} fill={COLORS.hydro} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Wind" stackId="1" stroke={COLORS.wind} fill={COLORS.wind} fillOpacity={0.8} />
            <Area type="monotone" dataKey="Solar" stackId="1" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.8} />
            <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SubSection>
  );
}

function ElectricityMixSection({ data, countryData }: { data: CountryEnergy; countryData?: CountryEnergy | null }) {
  // Comparison line chart: fossil vs renewables share of electricity
  const comparisonData = useMemo(() => {
    if (!countryData) return null;
    const worldMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => (y.fossilShareElec != null || y.renewablesShareElec != null) && worldMap.has(y.year))
      .map(y => {
        const w = worldMap.get(y.year);
        return {
          year: y.year,
          [`${countryData.name} Fossil`]: y.fossilShareElec,
          [`${countryData.name} Renewables`]: y.renewablesShareElec,
          ['World Fossil']: w?.fossilShareElec ?? null,
          ['World Renewables']: w?.renewablesShareElec ?? null,
        };
      });
  }, [data.yearly, countryData]);

  const hasWorldElec = data.yearly.some(y => y.coalShareElec != null || y.gasShareElec != null);
  if (!hasWorldElec) return null;

  return (
    <>
      <Divider icon={<Zap className="h-5 w-5" />} title="Electricity Mix" />

      <SectionCard icon={<Zap className="h-5 w-5 text-yellow-400" />} title="Electricity Generation by Source">
        <p className="text-sm text-gray-400 mb-4">
          How electricity is generated matters enormously for emissions. The shift from coal and gas
          to wind, solar, hydro and nuclear is the key to decarbonising the grid.
        </p>

        {/* Always show World */}
        <ElecStackedChart data={data.yearly} label="World" />

        {/* Show country alongside when selected */}
        {countryData && <ElecStackedChart data={countryData.yearly} label={countryData.name} />}

        {/* Comparison: fossil vs renewables share */}
        {comparisonData && comparisonData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} vs World — fossil & renewable electricity share (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey={`${countryData.name} Fossil`} stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World Fossil" stroke="#fca5a5" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Line type="monotone" dataKey={`${countryData.name} Renewables`} stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World Renewables" stroke="#6ee7b7" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
      </SectionCard>
    </>
  );
}

function RenewablesGrowthSection({ data, countryData }: { data: CountryEnergy; countryData?: CountryEnergy | null }) {
  // World renewables stacked area
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
    const worldMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.renewablesShareElec != null && worldMap.has(y.year))
      .map(y => ({
        year: y.year,
        [countryData.name]: y.renewablesShareElec,
        World: worldMap.get(y.year)?.renewablesShareElec ?? null,
      }));
  }, [data.yearly, countryData]);

  // Comparison: solar + wind share side by side
  const solarWindCompData = useMemo(() => {
    if (!countryData) return null;
    const worldMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => (y.solarShareElec != null || y.windShareElec != null) && worldMap.has(y.year))
      .map(y => {
        const w = worldMap.get(y.year);
        return {
          year: y.year,
          [`${countryData.name} Solar`]: y.solarShareElec,
          [`${countryData.name} Wind`]: y.windShareElec,
          ['World Solar']: w?.solarShareElec ?? null,
          ['World Wind']: w?.windShareElec ?? null,
        };
      });
  }, [data.yearly, countryData]);

  if (worldRenewData.length === 0) return null;

  return (
    <>
      <Divider icon={<Sun className="h-5 w-5" />} title="Renewables Growth" />

      <SectionCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} title="Renewable Electricity Growth">
        <p className="text-sm text-gray-400 mb-4">
          Solar and wind are experiencing <span className="text-yellow-400 font-medium">exponential growth</span>. Solar electricity
          has grown from near-zero to over 6% of global generation in just 15 years.
        </p>

        {/* World renewables stacked area */}
        <SubSection title="World — share of electricity from renewables (%)">
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={worldRenewData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="Hydro" stackId="1" stroke={COLORS.hydro} fill={COLORS.hydro} fillOpacity={0.6} />
                <Area type="monotone" dataKey="Wind" stackId="1" stroke={COLORS.wind} fill={COLORS.wind} fillOpacity={0.6} />
                <Area type="monotone" dataKey="Solar" stackId="1" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.6} />
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SubSection>

        {/* Country renewables stacked area */}
        {countryRenewData && countryRenewData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} — share of electricity from renewables (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryRenewData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Hydro" stackId="1" stroke={COLORS.hydro} fill={COLORS.hydro} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Wind" stackId="1" stroke={COLORS.wind} fill={COLORS.wind} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Solar" stackId="1" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.6} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Comparison: total renewables share */}
        {renewCompData && renewCompData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} vs World — total renewable electricity share (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={renewCompData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey={countryData.name} stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World" stroke="#6ee7b7" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Comparison: solar & wind share */}
        {solarWindCompData && solarWindCompData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} vs World — solar & wind electricity share (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={solarWindCompData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey={`${countryData.name} Solar`} stroke={COLORS.solar} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World Solar" stroke={COLORS.solar} strokeWidth={2} dot={false} strokeDasharray="6 3" opacity={0.5} />
                  <Line type="monotone" dataKey={`${countryData.name} Wind`} stroke={COLORS.wind} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World Wind" stroke={COLORS.wind} strokeWidth={2} dot={false} strokeDasharray="6 3" opacity={0.5} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
      </SectionCard>
    </>
  );
}

function CarbonIntensitySection({ data, countryData }: { data: CountryEnergy; countryData?: CountryEnergy | null }) {
  const chartData = useMemo(() => {
    const worldMap = new Map(data.yearly.filter(y => y.carbonIntensity != null).map(y => [y.year, y.carbonIntensity]));
    if (countryData) {
      const countryMap = new Map(countryData.yearly.filter(y => y.carbonIntensity != null).map(y => [y.year, y.carbonIntensity]));
      const years = new Set([...worldMap.keys(), ...countryMap.keys()]);
      return Array.from(years)
        .sort((a, b) => a - b)
        .map(year => ({
          year,
          World: worldMap.get(year) ?? null,
          [countryData.name]: countryMap.get(year) ?? null,
        }));
    }
    return Array.from(worldMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, val]) => ({ year, World: val }));
  }, [data.yearly, countryData]);

  if (chartData.length === 0) return null;

  return (
    <>
      <Divider icon={<Factory className="h-5 w-5" />} title="Carbon Intensity" />

      <SectionCard icon={<Factory className="h-5 w-5 text-gray-400" />} title="Carbon Intensity of Electricity">
        <p className="text-sm text-gray-400 mb-4">
          Grams of CO₂ emitted per kilowatt-hour of electricity generated. Lower is better.
          The global average has been slowly declining as renewables displace coal, but the pace
          must <span className="text-red-400 font-medium">accelerate dramatically</span> to meet climate goals.
        </p>
        <SubSection title="gCO₂ per kWh — drag slider to zoom">
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                <Line type="monotone" dataKey="World" stroke="#D3C8BB" strokeWidth={2} dot={false} />
                {countryData && (
                  <Line type="monotone" dataKey={countryData.name} stroke="#10b981" strokeWidth={2} dot={false} />
                )}
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SubSection>
      </SectionCard>
    </>
  );
}

function EnergyPerCapitaSection({ data, countryData }: { data: CountryEnergy; countryData?: CountryEnergy | null }) {
  // Energy per capita (kWh/person)
  const worldPerCapita = useMemo(() => {
    return data.yearly
      .filter(y => y.energyPerCapita != null)
      .map(y => ({ year: y.year, World: y.energyPerCapita }));
  }, [data.yearly]);

  // Comparison: energy per capita
  const compData = useMemo(() => {
    if (!countryData) return null;
    const worldMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.energyPerCapita != null && worldMap.has(y.year) && worldMap.get(y.year)!.energyPerCapita != null)
      .map(y => ({
        year: y.year,
        [countryData.name]: y.energyPerCapita,
        World: worldMap.get(y.year)!.energyPerCapita,
      }));
  }, [data.yearly, countryData]);

  // Electricity per capita (kWh/person)
  const elecCompData = useMemo(() => {
    if (!countryData) return null;
    const worldMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.perCapitaElectricity != null && worldMap.has(y.year) && worldMap.get(y.year)!.perCapitaElectricity != null)
      .map(y => ({
        year: y.year,
        [countryData.name]: y.perCapitaElectricity,
        World: worldMap.get(y.year)!.perCapitaElectricity,
      }));
  }, [data.yearly, countryData]);

  const worldElecPerCapita = useMemo(() => {
    return data.yearly
      .filter(y => y.perCapitaElectricity != null)
      .map(y => ({ year: y.year, World: y.perCapitaElectricity }));
  }, [data.yearly]);

  if (worldPerCapita.length === 0) return null;

  return (
    <>
      <Divider icon={<Users className="h-5 w-5" />} title="Per Capita" />

      <SectionCard icon={<Users className="h-5 w-5 text-blue-400" />} title="Energy Use Per Capita">
        <p className="text-sm text-gray-400 mb-4">
          Energy consumption per person reveals vast inequalities between nations.
          High-income countries use many times more energy per capita than the global average,
          though efficiency gains are <span className="text-emerald-400 font-medium">narrowing the gap</span>.
        </p>

        {/* Energy per capita */}
        {compData && compData.length > 0 && countryData ? (
          <SubSection title={`${countryData.name} vs World — primary energy per capita (kWh/person)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey={countryData.name} stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World" stroke="#93c5fd" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        ) : (
          <SubSection title="World — primary energy per capita (kWh/person)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={worldPerCapita} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="World" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Electricity per capita */}
        {elecCompData && elecCompData.length > 0 && countryData ? (
          <SubSection title={`${countryData.name} vs World — electricity per capita (kWh/person)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={elecCompData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey={countryData.name} stroke="#a855f7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World" stroke="#c4b5fd" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        ) : worldElecPerCapita.length > 0 && (
          <SubSection title="World — electricity per capita (kWh/person)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={worldElecPerCapita} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="World" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
      </SectionCard>
    </>
  );
}

function EmissionsSection({ data, countryData }: { data: CountryEnergy; countryData?: CountryEnergy | null }) {
  // World emissions area
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

  // World per-capita data (always shown)
  const worldPerCapita = useMemo(() => {
    return data.yearly
      .filter(y => y.ghgPerCapita != null)
      .map(y => ({ year: y.year, World: y.ghgPerCapita }));
  }, [data.yearly]);

  // Per-capita comparison (tonnes per person) — normalises the scale difference
  const perCapitaComp = useMemo(() => {
    if (!countryData) return null;
    const worldMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.ghgPerCapita != null && worldMap.has(y.year) && worldMap.get(y.year)!.ghgPerCapita != null)
      .map(y => ({
        year: y.year,
        [countryData.name]: y.ghgPerCapita,
        World: worldMap.get(y.year)!.ghgPerCapita,
      }));
  }, [data.yearly, countryData]);

  // Share of global emissions
  const shareData = useMemo(() => {
    if (!countryData) return null;
    const worldMap = new Map(data.yearly.filter(y => y.ghgEmissions != null).map(y => [y.year, y.ghgEmissions!]));
    return countryData.yearly
      .filter(y => y.ghgEmissions != null && worldMap.has(y.year) && worldMap.get(y.year)! > 0)
      .map(y => ({
        year: y.year,
        Share: Number(((y.ghgEmissions! / worldMap.get(y.year)!) * 100).toFixed(2)),
      }));
  }, [data.yearly, countryData]);

  if (worldData.length === 0) return null;

  return (
    <>
      <Divider icon={<Flame className="h-5 w-5" />} title="Emissions" />

      <SectionCard icon={<Flame className="h-5 w-5 text-red-400" />} title="Greenhouse Gas Emissions from Energy">
        <p className="text-sm text-gray-400 mb-4">
          Total greenhouse gas emissions from energy production and consumption (Mt CO₂ equivalent).
          Despite renewable growth, global emissions continue to rise as energy demand outpaces the transition.
        </p>

        {/* World emissions */}
        <SubSection title="World — annual GHG emissions (Mt CO₂eq)">
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={worldData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="Emissions" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2} />
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SubSection>

        {/* Country emissions at its own scale */}
        {countryEmData && countryEmData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} — annual GHG emissions (Mt CO₂eq)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryEmData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Emissions" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Per-capita comparison — fair like-for-like */}
        {perCapitaComp && perCapitaComp.length > 0 && countryData ? (
          <SubSection title={`${countryData.name} vs World — GHG emissions per capita (tonnes CO₂eq)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perCapitaComp} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey={countryData.name} stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="World" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        ) : worldPerCapita.length > 0 && (
          <SubSection title="World — GHG emissions per capita (tonnes CO₂eq)">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={worldPerCapita} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="World" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}

        {/* Country share of global emissions */}
        {shareData && shareData.length > 0 && countryData && (
          <SubSection title={`${countryData.name} — share of global GHG emissions (%)`}>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={shareData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Share" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
                  <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SubSection>
        )}
      </SectionCard>
    </>
  );
}

function FossilFuelBreakdownSection({ data, countryData }: { data: CountryEnergy; countryData?: CountryEnergy | null }) {
  // World fossil stacked area
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
    const worldMap = new Map(data.yearly.map(y => [y.year, y]));
    return countryData.yearly
      .filter(y => y.fossilShareEnergy != null && worldMap.has(y.year))
      .map(y => ({
        year: y.year,
        [countryData.name]: y.fossilShareEnergy,
        World: worldMap.get(y.year)?.fossilShareEnergy ?? null,
      }));
  }, [data.yearly, countryData]);

  if (worldFossilData.length === 0) return null;

  const FossilStackedChart = ({ chartData, title }: { chartData: typeof worldFossilData; title: string }) => (
    <SubSection title={title}>
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
            <Tooltip content={<DarkTooltip />} />
            <Legend iconType="square" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
            <Area type="monotone" dataKey="Coal" stackId="1" stroke={COLORS.coal} fill={COLORS.coal} fillOpacity={0.7} />
            <Area type="monotone" dataKey="Oil" stackId="1" stroke={COLORS.oil} fill={COLORS.oil} fillOpacity={0.7} />
            <Area type="monotone" dataKey="Gas" stackId="1" stroke={COLORS.gas} fill={COLORS.gas} fillOpacity={0.7} />
            <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SubSection>
  );

  return (
    <SectionCard icon={<Flame className="h-5 w-5 text-orange-400" />} title="Fossil Fuel Breakdown">
      <p className="text-sm text-gray-400 mb-4">
        The three fossil fuels — coal, oil, and gas — broken down individually.
        Coal is the dirtiest, while gas produces roughly half the CO₂ per unit of energy.
      </p>

      <FossilStackedChart chartData={worldFossilData} title="World — fossil fuel consumption by type (TWh)" />

      {countryFossilData && countryFossilData.length > 0 && countryData && (
        <FossilStackedChart chartData={countryFossilData} title={`${countryData.name} — fossil fuel consumption by type (TWh)`} />
      )}

      {fossilShareComp && fossilShareComp.length > 0 && countryData && (
        <SubSection title={`${countryData.name} vs World — fossil share of primary energy (%)`}>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fossilShareComp} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<DarkTooltip />} />
                <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                <Line type="monotone" dataKey={countryData.name} stroke={COLORS.fossil} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="World" stroke="#f87171" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SubSection>
      )}
    </SectionCard>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EnergyPage() {
  const [data, setData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryData, setCountryData] = useState<CountryEnergy | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);

  useEffect(() => {
    fetch('/api/climate/energy')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleCountrySelect = useCallback(async (name: string) => {
    setCountryLoading(true);
    try {
      const res = await fetch(`/api/climate/energy?country=${encodeURIComponent(name)}`);
      const d = await res.json();
      if (d.country) {
        setCountryData(d.country);
      } else {
        setCountryData(null);
      }
    } catch {
      // silently fail
    } finally {
      setCountryLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <main>
        <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 font-sans text-gray-200">
          <div className="max-w-5xl mx-auto">
            <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-gray-800 flex flex-col items-center gap-4 mt-6">
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
          <div className="max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ─── Hero ───────────────────────────────────────────────── */}
          <div className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border border-gray-800">
            <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-wide text-white mb-1">
              ⚡ Global Energy
            </h1>
            <p className="text-gray-400 text-sm mb-4">
              Tracking the world&apos;s energy transition — from fossil fuels to renewables.
              Data from <span className="text-gray-300">Our World in Data</span> (CC-BY).
            </p>

            {/* Country search */}
            <CountrySearch onSelect={handleCountrySelect} loading={countryLoading} />

            {countryData && (
              <div className="flex items-center gap-2 mt-3 text-emerald-400 bg-emerald-950/40 p-3 rounded-lg border border-emerald-800/50">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">Comparing with {countryData.name}</span>
                <button onClick={() => setCountryData(null)} className="ml-auto text-xs text-gray-500 hover:text-gray-300">✕ Clear</button>
              </div>
            )}
          </div>

          {/* ─── Live Stats ─────────────────────────────────────────── */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label={`Fossil share (${latest.year})`}
                value={latest.fossilShare?.toFixed(1) || '—'}
                unit="%"
                color="text-red-400"
                icon={<Flame className="h-5 w-5" />}
                countryValue={countryData?.latest?.fossilShare?.toFixed(1)}
                countryName={countryData?.name}
              />
              <StatCard
                label={`Renewables share (${latest.year})`}
                value={latest.renewablesShare?.toFixed(1) || '—'}
                unit="%"
                color="text-emerald-400"
                icon={<Zap className="h-5 w-5" />}
                countryValue={countryData?.latest?.renewablesShare?.toFixed(1)}
                countryName={countryData?.name}
              />
              <StatCard
                label={`Solar electricity (${latest.year})`}
                value={latest.solarShareElec?.toFixed(1) || '—'}
                unit="%"
                color="text-yellow-400"
                icon={<Sun className="h-5 w-5" />}
                countryValue={countryData?.latest?.solarShareElec?.toFixed(1)}
                countryName={countryData?.name}
              />
              <StatCard
                label={`Wind electricity (${latest.year})`}
                value={latest.windShareElec?.toFixed(1) || '—'}
                unit="%"
                color="text-cyan-400"
                icon={<Wind className="h-5 w-5" />}
                countryValue={countryData?.latest?.windShareElec?.toFixed(1)}
                countryName={countryData?.name}
              />
            </div>
          )}

          {/* ─── Chart Sections ─────────────────────────────────────── */}
          <EnergyMixSection data={w} countryData={countryData} />
          <ElectricityMixSection data={w} countryData={countryData} />
          <RenewablesGrowthSection data={w} countryData={countryData} />
          <FossilFuelBreakdownSection data={w} countryData={countryData} />
          <CarbonIntensitySection data={w} countryData={countryData} />
          <EnergyPerCapitaSection data={w} countryData={countryData} />
          <EmissionsSection data={w} countryData={countryData} />

          {/* ─── Attribution ─────────────────────────────────────────── */}
          <div className="bg-gray-950/90 backdrop-blur-md p-5 rounded-xl border border-gray-800 text-sm text-gray-400 space-y-1.5">
            <p className="font-semibold text-gray-300">Data sources & attribution:</p>
            <p>• Energy data: Our World in Data / Energy Institute Statistical Review (CC-BY)</p>
            <p>• Electricity data: Ember Global Electricity Review (CC-BY)</p>
            <p>• Emissions: Climate Analysis Indicators Tool (CAIT)</p>
          </div>
        </div>
      </div>
    </main>
  );
}
