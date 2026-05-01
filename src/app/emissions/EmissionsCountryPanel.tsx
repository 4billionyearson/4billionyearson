"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush,
} from 'recharts';
import { Loader2, MapPin, Factory, Users, TrendingUp, Globe, Flag, Globe2, X } from 'lucide-react';
import { countryFlag } from '@/lib/climate/locations';
import { CountryFuelChart } from './_components/fuel-chart';
import { CountryConsumptionChart } from './_components/consumption-chart';
import { CountryGhgPanel } from './_components/ghg-budget';

/* ─── State deep-dive types ──────────────────────────────────────────────── */

interface EnergyLatest { year: number; ghgEmissions: number | null; ghgPerCapita: number | null }
interface EnergyYearly { year: number; ghgEmissions: number | null; ghgPerCapita: number | null }
interface EnergyApiEntity { name: string; yearly: EnergyYearly[]; latest: EnergyLatest }
interface StateEnergyApiResponse {
  country: EnergyApiEntity | null;   // USA totals
  usState: EnergyApiEntity | null;   // the selected state
  fetchedAt: string;
}

type Mode = 'country' | 'us-state' | 'continent';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface YearPoint { year: number; value: number }

interface CountryEmissions {
  name: string;
  annual: YearPoint[];
  perCapita: YearPoint[];
  cumulative: YearPoint[];
  latestYear: number;
  latestAnnual: number | null;
  latestPerCapita: number | null;
  latestCumulative: number | null;
  annualRank: number | null;
  annualOf: number;
  perCapRank: number | null;
  perCapOf: number;
  globalSharePct: number | null;
}

interface CountryApiResponse {
  country: CountryEmissions;
  world: { annualLatest: number; annualLatestYear: number };
  fetchedAt: string;
}

interface LocationSuggestion {
  label: string;
  value: string;
  owidCode?: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const formatYAxis = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(0)}B`
  : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M`
  : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K`
  : String(v);

const formatTonnes = (v: number) => {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Tt`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Bt`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} Mt`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} Kt`;
  return `${v.toFixed(0)} t`;
};

function ordinal(n: number | null): string {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const DarkTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="font-semibold text-gray-200 mb-1 text-sm">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="text-sm">
          {p.name}: {typeof p.value === 'number'
            ? (unit === 'perCapita' ? `${p.value.toFixed(2)} t/person`
               : unit === 'index' ? `${p.value.toFixed(1)}`
               : formatTonnes(p.value))
            : p.value}
        </p>
      ))}
    </div>
  );
};

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;

/* ─── Region Search (climate-hub styled) ─────────────────────────────────── */

function RegionSearch({ mode, onSelect, loading }: {
  mode: 'country' | 'us-state';
  onSelect: (value: { name: string; code?: string }) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placeholder = mode === 'country'
    ? 'Search by country or major city…'
    : 'Search by state or city (e.g. Texas, Miami)…';

  const doSearch = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    try {
      const res = await fetch(`/api/climate/search?q=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      if (!data.results?.length) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      const mapped: LocationSuggestion[] = [];
      const seen = new Set<string>();
      for (const r of data.results) {
        if (r.owidCode === 'OWID_WRL') continue;
        if (mode === 'country') {
          if (r.name.includes(' → ')) continue;
          if (r.type === 'uk-region') {
            if (!seen.has('United Kingdom')) {
              mapped.push({ label: '🇬🇧 United Kingdom', value: 'United Kingdom' });
              seen.add('United Kingdom');
            }
          } else if (r.type === 'country') {
            if (seen.has(r.name)) continue;
            seen.add(r.name);
            mapped.push({
              label: `${countryFlag(r.owidCode)} ${r.name}`,
              value: r.name,
              owidCode: r.owidCode,
            });
          }
        } else if (mode === 'us-state') {
          if (r.type !== 'us-state') continue;
          // Strip "City → State" prefix when deriving the canonical state name
          const cleanName = r.name.includes(' → ') ? r.name.split(' → ')[1] : r.name;
          if (seen.has(cleanName)) continue;
          seen.add(cleanName);
          // US state location id is like 'us-tx' → 2-letter 'TX' for EIA API
          const code = typeof r.id === 'string' && r.id.startsWith('us-')
            ? r.id.slice(3).toUpperCase()
            : undefined;
          mapped.push({
            label: `🇺🇸 ${r.name}`,
            value: cleanName,
            owidCode: code,
          });
        }
      }
      setSuggestions(mapped.slice(0, 10));
      setShowDropdown(mapped.length > 0);
    } catch { /* ignore */ }
  }, [mode]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(value), 250);
  }, [doSearch]);

  const handleSelect = (s: LocationSuggestion) => {
    setQuery(s.value);
    onSelect({ name: s.value, code: s.owidCode });
    setShowDropdown(false);
  };

  // Reset query when mode changes so stale suggestions don't linger
  useEffect(() => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  }, [mode]);

  return (
    <div className="relative w-full max-w-2xl">
      <MapPin
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        style={{ color: 'rgba(208, 166, 94, 0.8)' }}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#D0A65E]/35 bg-gray-900/50 py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-[#FFF5E7]/35 outline-none transition-all focus:border-[#D0A65E]/55 focus:ring-2 focus:ring-[#D0A65E]/20"
        autoComplete="off"
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#D0A65E]" />
      ) : query ? (
        <button
          type="button"
          onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); }}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-700 hover:text-white"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.value}-${i}`}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-gray-800 text-sm text-gray-200 border-b border-gray-800 last:border-0 transition-colors"
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Stat mini-card ─────────────────────────────────────────────────────── */

function StatBlock({ label, value, unit, sub, color = 'text-orange-300' }: {
  label: string; value: string; unit?: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/90 p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────────────────── */

export default function EmissionsCountryPanel({
  embedded = false,
  worldAnnual,
}: {
  embedded?: boolean;
  /** Optional world annual totals (tonnes CO₂) for state comparison chart */
  worldAnnual?: YearPoint[];
} = {}) {
  const [mode, setMode] = useState<Mode>('country');
  const [countryName, setCountryName] = useState<string | null>(null);
  const [data, setData] = useState<CountryApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State deep-dive
  const [stateSelection, setStateSelection] = useState<{ name: string; code: string } | null>(null);
  const [stateData, setStateData] = useState<StateEnergyApiResponse | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  // Read ?country= or ?state= from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const c = params.get('country');
    const s = params.get('state');
    const sName = params.get('stateName');
    if (s && sName) {
      setMode('us-state');
      setStateSelection({ name: sName, code: s.toUpperCase() });
    } else if (c) {
      setMode('country');
      setCountryName(c);
    }
  }, []);

  // Fetch country data whenever name changes. The same endpoint serves
  // continent aggregates via ?continent=Name when mode === 'continent'.
  useEffect(() => {
    if (!countryName) { setData(null); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = mode === 'continent'
      ? `/api/climate/emissions/country?continent=${encodeURIComponent(countryName)}`
      : `/api/climate/emissions/country?name=${encodeURIComponent(countryName)}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [countryName, mode]);

  // Fetch state data whenever selection changes
  useEffect(() => {
    if (!stateSelection) { setStateData(null); setStateError(null); return; }
    let cancelled = false;
    setStateLoading(true);
    setStateError(null);
    fetch(`/api/climate/energy?state=${encodeURIComponent(stateSelection.code)}&stateName=${encodeURIComponent(stateSelection.name)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setStateData(d);
      })
      .catch(e => { if (!cancelled) setStateError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setStateLoading(false); });
    return () => { cancelled = true; };
  }, [stateSelection]);

  const selectCountry = useCallback((name: string) => {
    setCountryName(name);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('country', name);
      url.searchParams.delete('state');
      url.searchParams.delete('stateName');
      window.history.replaceState({}, '', url.toString());
      requestAnimationFrame(() => {
        document.getElementById('emissions-country-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  const selectState = useCallback((name: string, code: string) => {
    setStateSelection({ name, code });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('state', code);
      url.searchParams.set('stateName', name);
      url.searchParams.delete('country');
      window.history.replaceState({}, '', url.toString());
      requestAnimationFrame(() => {
        document.getElementById('emissions-country-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  const clearSelection = useCallback(() => {
    setCountryName(null);
    setData(null);
    setStateSelection(null);
    setStateData(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('country');
      url.searchParams.delete('state');
      url.searchParams.delete('stateName');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const country = data?.country;

  const climateHref = useMemo(() => {
    if (!country) return null;
    return `/climate/${country.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }, [country]);

  const wrapperClass = embedded
    ? ''
    : 'bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D0A65E] p-4 shadow-xl';

  const hasSelection = mode === 'us-state' ? stateData?.usState != null : country != null;

  return (
    <div id="emissions-country-panel" className={wrapperClass}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Factory className="h-5 w-5 text-[#D0A65E]" />
        <h2 className="text-lg font-bold font-mono text-white">Country &amp; State Deep Dive</h2>
        {hasSelection && (
          <button
            onClick={clearSelection}
            className="ml-auto text-xs text-gray-400 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-700 hover:border-gray-500 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* ─── Tabs (climate-hub styled) ──────────────────────────────────── */}
      <div role="tablist" aria-label="Emissions region type" className="flex gap-2 overflow-x-auto mb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {([
          { id: 'country', label: 'Countries', Icon: Globe2 },
          { id: 'continent', label: 'Continents', Icon: Globe },
          { id: 'us-state', label: 'US States', Icon: Flag },
        ] as const).map(({ id, label, Icon }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMode(id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 h-8 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'border-[#D0A65E] bg-[#D0A65E] text-[#1A0E00]'
                  : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-[#D0A65E]/45 hover:bg-gray-900 hover:text-[#FFF5E7]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {mode === 'country'
          ? 'Pick a country to see its annual, per-capita, and cumulative CO₂ emissions, its rank among ~200 reporting nations, and its share of today\u2019s global total.'
          : mode === 'continent'
            ? 'Pick a continent to see its OWID aggregate annual, per-capita, and cumulative CO₂ emissions and share of today\u2019s global total.'
            : 'Pick a US state to see its energy-related CO₂ emissions compared against the US national total and the world.'}
      </p>

      {mode === 'continent' ? (
        <div className="flex flex-wrap gap-2">
          {(['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const).map((c) => {
            const active = countryName === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => selectCountry(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'border-[#D0A65E] bg-[#D0A65E] text-[#1A0E00]'
                    : 'border-gray-700 bg-gray-900/70 text-gray-300 hover:border-[#D0A65E]/45 hover:text-[#FFF5E7]'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      ) : (
        <RegionSearch
          mode={mode === 'us-state' ? 'us-state' : 'country'}
          onSelect={(v) => {
            if (mode === 'us-state') {
              if (v.code) selectState(v.name, v.code);
            } else {
              selectCountry(v.name);
            }
          }}
          loading={mode === 'us-state' ? stateLoading : loading}
        />
      )}

      {mode !== 'us-state' && error && (
        <div className="mt-4 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-400">{error}</div>
      )}
      {mode === 'us-state' && stateError && (
        <div className="mt-4 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-400">{stateError}</div>
      )}

      {mode !== 'us-state' && loading && !data && (
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#D0A65E]" />
          Loading {countryName}…
        </div>
      )}
      {mode === 'us-state' && stateLoading && !stateData && (
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#D0A65E]" />
          Loading {stateSelection?.name}…
        </div>
      )}

      {mode === 'us-state' && stateData && (
        <USStateDeepDive data={stateData} worldAnnual={worldAnnual} />
      )}

      {mode !== 'us-state' && country && (
        <div className="mt-5 space-y-5">
          {/* Header with name + link to climate page */}
          <div className="flex items-baseline justify-between flex-wrap gap-2 border-b border-gray-800/60 pb-3">
            <div>
              <div className="text-2xl font-bold text-white">{country.name}</div>
              <div className="text-xs text-gray-400">CO₂ emissions, latest year {country.latestYear}</div>
            </div>
            {climateHref && (
              <Link href={climateHref} className="text-xs text-[#D0A65E] hover:text-[#E4B86E] inline-flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" /> Climate update for {country.name}
              </Link>
            )}
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatBlock
              label="Annual CO₂"
              value={country.latestAnnual != null ? formatTonnes(country.latestAnnual) : '—'}
              sub={country.latestYear ? `in ${country.latestYear}` : undefined}
              color="text-red-300"
            />
            <StatBlock
              label="Per capita"
              value={country.latestPerCapita != null ? `${country.latestPerCapita.toFixed(1)} t` : '—'}
              sub="per person"
              color="text-amber-300"
            />
            <StatBlock
              label="Cumulative"
              value={country.latestCumulative != null ? formatTonnes(country.latestCumulative) : '—'}
              sub="all-time"
              color="text-yellow-300"
            />
            <StatBlock
              label="Global rank"
              value={country.annualRank != null ? ordinal(country.annualRank) : '—'}
              sub={country.annualOf ? `of ${country.annualOf}` : undefined}
              color="text-orange-300"
            />
            <StatBlock
              label="Share of global"
              value={country.globalSharePct != null ? `${country.globalSharePct.toFixed(country.globalSharePct < 1 ? 2 : 1)}%` : '—'}
              sub={`of ${data.world.annualLatestYear} total`}
              color="text-rose-300"
            />
          </div>

          {/* Per-capita rank callout */}
          {country.perCapRank != null && (
            <div className="text-xs text-gray-400 border-l-2 border-orange-400/40 pl-3">
              <Users className="inline h-3.5 w-3.5 text-amber-400 mr-1 -mt-0.5" />
              Per-capita rank: <span className="text-amber-300 font-semibold">{ordinal(country.perCapRank)}</span> of {country.perCapOf}.
            </div>
          )}

          {/* Annual CO₂ over time */}
          {country.annual.length > 0 && (
            <div>
              <h3 className="text-sm font-mono text-white mb-2 inline-flex items-center gap-1.5">
                <Factory className="h-4 w-4 text-red-400" /> Annual CO₂ emissions - {country.name}
              </h3>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={country.annual} margin={CHART_MARGIN}>
                    <defs>
                      <linearGradient id="emit-annual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
                    <Area type="monotone" dataKey="value" name={`${country.name} CO₂ (tonnes)`} stroke="#ef4444" strokeWidth={2}
                      fill="url(#emit-annual)" dot={false} />
                    <Brush dataKey="year" height={BRUSH_HEIGHT} stroke="#4B5563" fill="#111827" travellerWidth={10}>
                      <AreaChart data={country.annual}>
                        <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} dot={false} strokeWidth={1} />
                      </AreaChart>
                    </Brush>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Per-capita + Cumulative side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {country.perCapita.length > 0 && (
              <div>
                <h3 className="text-sm font-mono text-white mb-2 inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-amber-400" /> Per-capita CO₂
                </h3>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={country.perCapita} margin={CHART_MARGIN}>
                      <defs>
                        <linearGradient id="emit-percap" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${v}`} />
                      <Tooltip content={<DarkTooltip unit="perCapita" />} />
                      <Area type="monotone" dataKey="value" name={`${country.name} (t/person)`} stroke="#fbbf24" strokeWidth={2}
                        fill="url(#emit-percap)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {country.cumulative.length > 0 && (
              <div>
                <h3 className="text-sm font-mono text-white mb-2 inline-flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-yellow-400" /> Cumulative CO₂
                </h3>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={country.cumulative} margin={CHART_MARGIN}>
                      <defs>
                        <linearGradient id="emit-cumul" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
                      <Tooltip content={<DarkTooltip />} />
                      <Area type="monotone" dataKey="value" name={`${country.name} cumulative (tonnes)`} stroke="#eab308" strokeWidth={2}
                        fill="url(#emit-cumul)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* By-fuel breakdown */}
          <div>
            <h3 className="text-sm font-mono text-white mb-2 inline-flex items-center gap-1.5">
              <Factory className="h-4 w-4 text-orange-400" /> CO₂ by Fuel Source
            </h3>
            <CountryFuelChart countryName={country.name} />
          </div>

          {/* Consumption vs production */}
          <div>
            <h3 className="text-sm font-mono text-white mb-2 inline-flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-sky-400" /> Consumption vs Production
            </h3>
            <CountryConsumptionChart countryName={country.name} />
          </div>

          {/* Other GHGs */}
          <div>
            <h3 className="text-sm font-mono text-white mb-2 inline-flex items-center gap-1.5">
              <Factory className="h-4 w-4 text-[#D0A65E]" /> All Greenhouse Gases
            </h3>
            <CountryGhgPanel countryName={country.name} />
          </div>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-800/60">
            Source:{' '}
            <a href="https://ourworldindata.org/co2-emissions" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a>{' '}
            / <a href="https://globalcarbonproject.org/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Global Carbon Project</a>.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── US State Deep Dive ─────────────────────────────────────────────────── */

function USStateDeepDive({
  data,
  worldAnnual,
}: {
  data: StateEnergyApiResponse;
  worldAnnual?: YearPoint[];
}) {
  const state = data.usState;
  const usa = data.country;

  if (!state || !state.yearly.length || state.latest.ghgEmissions == null) {
    return (
      <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/40 p-4 text-sm text-gray-400">
        Emissions data unavailable for this state.
      </div>
    );
  }

  // EIA figures are in million metric tonnes of CO₂ (energy-related)
  const stateSeriesMt = state.yearly.filter(y => y.ghgEmissions != null) as Array<EnergyYearly & { ghgEmissions: number }>;
  const latestMt = state.latest.ghgEmissions;
  const latestYear = state.latest.year;
  const tenAgo = stateSeriesMt.find(y => y.year === latestYear - 10)
    ?? stateSeriesMt[Math.max(0, stateSeriesMt.length - 11)];
  const deltaPct = tenAgo && tenAgo.ghgEmissions > 0
    ? ((latestMt - tenAgo.ghgEmissions) / tenAgo.ghgEmissions) * 100
    : 0;
  const isUp = deltaPct >= 0;

  const usaSeriesMt = (usa?.yearly ?? []).filter(y => y.ghgEmissions != null) as Array<EnergyYearly & { ghgEmissions: number }>;
  const usLatestMt = usa?.latest.ghgEmissions ?? null;
  const shareOfUsPct = usLatestMt != null && usLatestMt > 0 ? (latestMt / usLatestMt) * 100 : null;

  // World annual is in tonnes; convert to Mt for share-of-world
  const worldLatestMt = worldAnnual && worldAnnual.length > 0
    ? worldAnnual[worldAnnual.length - 1].value / 1e6
    : null;
  const shareOfWorldPct = worldLatestMt != null && worldLatestMt > 0
    ? (latestMt / worldLatestMt) * 100
    : null;

  // Build indexed trajectory (base = 1990 or earliest common year) - state vs USA vs World
  const indexedData = (() => {
    const baseYear = 1990;
    const stateByYear = new Map(stateSeriesMt.map(y => [y.year, y.ghgEmissions]));
    const usaByYear = new Map(usaSeriesMt.map(y => [y.year, y.ghgEmissions]));
    const worldByYear = new Map((worldAnnual ?? []).map(y => [y.year, y.value / 1e6]));

    const stateBase = stateByYear.get(baseYear);
    const usaBase = usaByYear.get(baseYear);
    const worldBase = worldByYear.get(baseYear);

    const years: number[] = [];
    for (let y = baseYear; y <= latestYear; y++) years.push(y);

    return years.map(year => {
      const s = stateByYear.get(year);
      const u = usaByYear.get(year);
      const w = worldByYear.get(year);
      return {
        year,
        state: stateBase && s != null ? (s / stateBase) * 100 : null,
        usa: usaBase && u != null ? (u / usaBase) * 100 : null,
        world: worldBase && w != null ? (w / worldBase) * 100 : null,
      };
    });
  })();

  // Per-capita comparison row (state vs USA, same year)
  const statePerCap = state.latest.ghgPerCapita;
  const usaPerCap = usa?.latest.ghgPerCapita ?? null;

  const climateHref = `/climate/${state.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

  return (
    <div className="mt-5 space-y-5">
      {/* Header */}
      <div className="flex items-baseline justify-between flex-wrap gap-2 border-b border-gray-800/60 pb-3">
        <div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <span aria-hidden>🇺🇸</span>
            {state.name}
          </div>
          <div className="text-xs text-gray-400">Energy-related CO₂ emissions, latest year {latestYear}</div>
        </div>
        <Link href={climateHref} className="text-xs text-[#D0A65E] hover:text-[#E4B86E] inline-flex items-center gap-1">
          <Globe className="h-3.5 w-3.5" /> Climate update for {state.name}
        </Link>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBlock
          label="Annual CO₂"
          value={formatTonnes(latestMt * 1e6)}
          sub={`in ${latestYear}`}
          color="text-red-300"
        />
        <StatBlock
          label="Per capita"
          value={statePerCap != null ? `${statePerCap.toFixed(1)} t` : '—'}
          sub="per person"
          color="text-amber-300"
        />
        <StatBlock
          label="10-yr change"
          value={`${isUp ? '+' : ''}${deltaPct.toFixed(1)}%`}
          sub={tenAgo ? `vs ${tenAgo.year}` : undefined}
          color={isUp ? 'text-orange-300' : 'text-emerald-300'}
        />
        <StatBlock
          label="Share of US"
          value={shareOfUsPct != null ? `${shareOfUsPct.toFixed(shareOfUsPct < 1 ? 2 : 1)}%` : '—'}
          sub={usLatestMt != null ? `of ${formatTonnes(usLatestMt * 1e6)}` : undefined}
          color="text-orange-300"
        />
        <StatBlock
          label="Share of world"
          value={shareOfWorldPct != null ? `${shareOfWorldPct.toFixed(shareOfWorldPct < 1 ? 2 : 1)}%` : '—'}
          sub={worldLatestMt != null ? `of ${formatTonnes(worldLatestMt * 1e6)}` : undefined}
          color="text-rose-300"
        />
      </div>

      {/* Per-capita comparison callout */}
      {statePerCap != null && usaPerCap != null && (
        <div className="text-xs text-gray-400 border-l-2 border-amber-400/40 pl-3">
          <Users className="inline h-3.5 w-3.5 text-amber-400 mr-1 -mt-0.5" />
          {state.name} emits <span className="text-amber-300 font-semibold">{statePerCap.toFixed(1)} t CO₂/person</span>
          {' '}vs the US average of <span className="text-amber-300 font-semibold">{usaPerCap.toFixed(1)} t/person</span>
          {' '}— that&apos;s {(statePerCap / usaPerCap * 100).toFixed(0)}% of the US per-capita rate.
        </div>
      )}

      {/* Absolute emissions over time */}
      <div>
        <h3 className="text-sm font-mono text-white mb-2 inline-flex items-center gap-1.5">
          <Factory className="h-4 w-4 text-red-400" /> Annual CO₂ emissions - {state.name}
        </h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stateSeriesMt.map(y => ({ year: y.year, value: y.ghgEmissions * 1e6 }))}
              margin={CHART_MARGIN}
            >
              <defs>
                <linearGradient id="emit-state-abs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="value" name={`${state.name} CO₂ (tonnes)`} stroke="#ef4444" strokeWidth={2}
                fill="url(#emit-state-abs)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Indexed trajectory: state vs USA vs world */}
      <div>
        <h3 className="text-sm font-mono text-white mb-2 inline-flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-[#D0A65E]" /> Trajectory vs US &amp; world (1990 = 100)
        </h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={indexedData} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A99B8D' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
              <Tooltip content={<DarkTooltip unit="index" />} />
              <Legend iconType="plainline" wrapperStyle={{ color: '#D3C8BB', fontSize: 12, paddingTop: 10 }} />
              <Area type="monotone" dataKey="state" name={state.name} stroke="#ef4444" strokeWidth={2} fill="none" dot={false} connectNulls />
              <Area type="monotone" dataKey="usa" name="United States" stroke="#fbbf24" strokeWidth={2} fill="none" dot={false} connectNulls />
              <Area type="monotone" dataKey="world" name="World" stroke="#38bdf8" strokeWidth={2} fill="none" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Each line is indexed to its own 1990 value. A line above 100 means emissions have grown since 1990; below 100 means they&apos;ve fallen.
        </p>
      </div>

      {/* Source / caveat */}
      <p className="text-xs text-gray-400 pt-2 border-t border-gray-800/60">
        State &amp; US totals: <a href="https://www.eia.gov/state/seds/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">EIA State Energy Data System</a> (energy-related CO₂ only - excludes land-use change and industrial process emissions).{' '}
        World totals: <a href="https://ourworldindata.org/co2-emissions" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Our World in Data</a> / <a href="https://globalcarbonproject.org/" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">Global Carbon Project</a>.
      </p>
    </div>
  );
}
