"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush,
} from 'recharts';
import { Loader2, MapPin, Factory, Search, Users, TrendingUp, Globe, X } from 'lucide-react';
import { countryFlag } from '@/lib/climate/locations';

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
            ? (unit === 'perCapita' ? `${p.value.toFixed(2)} t/person` : formatTonnes(p.value))
            : p.value}
        </p>
      ))}
    </div>
  );
};

const CHART_MARGIN = { top: 10, right: 0, left: -15, bottom: 0 };
const BRUSH_HEIGHT = 30;

/* ─── Country Search (countries only) ────────────────────────────────────── */

function CountrySearch({ onSelect, loading }: {
  onSelect: (name: string) => void;
  loading: boolean;
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
        }
        setSuggestions(mapped.slice(0, 10));
        setShowDropdown(mapped.length > 0);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch { /* ignore */ }
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

  const handleSelect = (s: LocationSuggestion) => {
    setQuery(s.value);
    onSelect(s.value);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            placeholder="Search for a country…"
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-orange-400/50 bg-gray-900/60 text-sm text-white placeholder-orange-300/60 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all"
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          disabled={loading || !query.trim()}
          onClick={() => query.trim() && onSelect(query.trim())}
          className="text-sm font-bold px-4 py-1.5 rounded-lg flex items-center justify-center min-w-[100px] transition-opacity hover:opacity-85 bg-orange-400 text-gray-900 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-2" />Search</>}
        </button>
      </div>
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

function StatBlock({ label, value, sub, color = 'text-orange-300' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-3">
      <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────────────────── */

export default function EmissionsCountryPanel() {
  const [countryName, setCountryName] = useState<string | null>(null);
  const [data, setData] = useState<CountryApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read ?country= from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const c = params.get('country');
    if (c) setCountryName(c);
  }, []);

  // Fetch country data whenever name changes
  useEffect(() => {
    if (!countryName) { setData(null); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/climate/emissions/country?name=${encodeURIComponent(countryName)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [countryName]);

  // Update URL without reload when user searches
  const selectCountry = useCallback((name: string) => {
    setCountryName(name);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('country', name);
      window.history.replaceState({}, '', url.toString());
      // scroll the panel into view
      requestAnimationFrame(() => {
        document.getElementById('emissions-country-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  const clearCountry = useCallback(() => {
    setCountryName(null);
    setData(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('country');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const country = data?.country;

  const climateHref = useMemo(() => {
    if (!country) return null;
    return `/climate/${country.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }, [country]);

  return (
    <div id="emissions-country-panel" className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D0A65E] p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Factory className="h-5 w-5 text-orange-400" />
        <h2 className="text-lg font-bold font-mono text-white">Country Deep Dive</h2>
        {country && (
          <button
            onClick={clearCountry}
            className="ml-auto text-xs text-gray-400 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-700 hover:border-gray-500 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Pick a country to see its annual, per-capita, and cumulative CO₂ emissions, its rank among ~200 reporting nations, and its share of today&apos;s global total.
      </p>

      <CountrySearch onSelect={selectCountry} loading={loading} />

      {error && (
        <div className="mt-4 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-400">{error}</div>
      )}

      {loading && !data && (
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
          Loading {countryName}…
        </div>
      )}

      {country && (
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
                <Factory className="h-4 w-4 text-red-400" /> Annual CO₂ emissions — {country.name}
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
