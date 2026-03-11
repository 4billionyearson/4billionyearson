"use client";

import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Search, Loader2, MapPin } from 'lucide-react';

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const recent = payload.find((p: any) => p.dataKey === 'recentMaxTemp')?.value;
    const historic = payload.find((p: any) => p.dataKey === 'historicMaxTemp')?.value;

    let diffElement = null;
    if (recent !== undefined && historic !== undefined && historic !== 0) {
      const diff = recent - historic;
      const diffPercent = (diff / Math.abs(historic)) * 100;
      const sign = diff > 0 ? '+' : '';
      const color = diff > 0 ? 'text-red-600' : 'text-blue-600';
      
      diffElement = (
        <div className={`mt-2 pt-2 border-t border-gray-100 font-medium text-sm ${color}`}>
          Difference: {sign}{diff.toFixed(1)}°C ({sign}{diffPercent.toFixed(1)}%)
        </div>
      );
    }

    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl min-w-[200px]">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="text-sm font-medium">
            {p.name}: {p.value}°C
          </p>
        ))}
        {diffElement}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [cityInput, setCityInput] = useState('London');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSelectLocation = async (location: any) => {
    const { latitude, longitude, name, country, admin1 } = location;
    const region = admin1 ? `${admin1}, ` : '';
    const fullName = `${name}, ${region}${country}`;
    
    setCityInput(name);
    setShowDropdown(false);
    setLoading(true);
    setError(null);
    setLocationName(fullName);

    try {
      const climateRes = await fetch(`/api/climate?lat=${latitude}&lon=${longitude}`);
      const climateData = await climateRes.json();

      if (climateData.error) {
        throw new Error(climateData.error);
      }

      setYearlyData(climateData.yearlyData);
      setMonthlyData(climateData.monthlyData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput) return;

    setLoading(true);
    setError(null);
    setSearchResults([]);
    setShowDropdown(false);

    try {
      // Fetch up to 5 matching geographic locations based on the input
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput)}&count=5&language=en&format=json`);
      const geoData = await geoRes.json();

      if (geoData.error) {
        throw new Error(geoData.reason || "We are receiving too many search requests right now. Please try again in one minute.");
      }

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("Location not found. Please try another city.");
      }

      if (geoData.results.length === 1) {
        // Only exactly one match found, skip the disambiguation and just fetch it
        await handleSelectLocation(geoData.results[0]);
      } else {
        // Multiple matches, present the user with the dropdown list to choose from
        setSearchResults(geoData.results);
        setShowDropdown(true);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Search */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🌍 Local Climate History</h1>
          <p className="text-gray-500 mb-6">Enter your city to see how the climate has changed over the last 75 years.</p>
          
<div className="relative w-full">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input 
                  type="text" 
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  placeholder="Enter a city (e.g. Manchester, Glasgow)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  autoComplete="off"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center min-w-[120px] transition-colors"
                >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
              </button>
            </form>

            {/* Dropdown for Geocoding Matches */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden md:w-[calc(100%-128px)]">
                {searchResults.map((result: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleSelectLocation(result)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 flex flex-col border-b border-gray-100 last:border-0 transition-colors"
                    type="button"
                  >
                    <span className="font-medium text-gray-900 border-none">{result.name}</span>
                    <span className="text-sm text-gray-500">
                      {result.admin1 ? `${result.admin1}, ` : ''}{result.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        </div>

        {/* Dashboard Content */}
        {yearlyData.length > 0 && !loading && (
          <div className="space-y-6">
            
            {locationName && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Showing verified climate data for: {locationName}</span>
              </div>
            )}

            {/* Widget 1: Recent 12 Months */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">🗓️ Recent 12 Months vs Historical Average (1950-2000)</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="monthLabel" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} unit="°C" domain={['auto', 'auto']} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} content={<CustomBarTooltip />} />
                    <Legend iconType="circle" />
                    <Bar dataKey="recentMaxTemp" name="Recent Max Temp (°C)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="historicMaxTemp" name="Historic Avg Max Temp" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex items-center gap-4 my-8">
              <div className="h-px bg-gray-200 flex-1"></div>
              <h2 className="text-2xl font-bold text-gray-400">75-Year Climate History</h2>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {/* Widget 2: Max Temperatures */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Average Maximum Temperatures vs Global Baseline</h2>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="year" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} unit="°C" domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="plainline" />
                    
                    {/* The baseline is 13.9°C, so a 1.5°C rise translates to 15.4°C globally */}
                    <ReferenceLine y={15.4} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ position: 'insideTopLeft', value: '1.5°C Global Limit Reached (15.4°C)', fill: '#ef4444', fontSize: 13, fontWeight: 600 }} />

                    <Line type="monotone" dataKey="maxTemp" name="Local Max Temp" stroke="#fca5a5" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="maxTempRolling" name="10-Yr Avg (Local)" stroke="#ef4444" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="globalTemp" name="Global Avg Temp" stroke="#111827" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 3: Summer Days */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Hot Summer Days (≥25°C)</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="year" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="plainline" />
                    <Line type="monotone" dataKey="summerDays" name="Summer Days" stroke="#fdba74" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="summerDaysRolling" name="10-Yr Avg" stroke="#c2410c" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 4: Min Temperatures */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Average Minimum Temperatures</h2>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="year" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} unit="°C" domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="plainline" />
                    <Line type="monotone" dataKey="minTemp" name="Local Min Temp" stroke="#93c5fd" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="minTempRolling" name="10-Yr Avg" stroke="#2563eb" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 5: Frost Days */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Days Below Freezing (&lt;0°C)</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="year" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="plainline" />
                    <Line type="monotone" dataKey="frostDays" name="Frost Days" stroke="#7dd3fc" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="frostDaysRolling" name="10-Yr Avg" stroke="#1e3a8a" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
