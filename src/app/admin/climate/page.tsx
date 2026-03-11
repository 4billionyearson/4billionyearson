"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Database, AlertTriangle } from 'lucide-react';

export default function AdminClimateDashboard() {
  const [cacheData, setCacheData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCacheData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/climate');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch cache data");
      
      setCacheData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCacheData();
  }, []);

  const handleDelete = async (key?: string) => {
    if (!confirm(key ? `Delete cache for grid ${key}?` : "Clear ALL climate cache?")) return;

    try {
      const url = key ? `/api/admin/climate?key=${encodeURIComponent(key)}` : '/api/admin/climate';
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      alert(data.message);
      fetchCacheData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen p-8 font-sans text-gray-100">
      <div className="max-w-4xl mx-auto space-y-6 bg-black/60 backdrop-blur-md p-8 rounded-2xl border border-gray-800 shadow-xl mt-[60px]">
        <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl shadow-sm border border-gray-800">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <Database className="text-blue-500 h-6 w-6" /> 
              Climate API Cache Manager
            </h1>
            <p className="text-gray-400 mt-1">Manage the permanent Redis data grids for Open-Meteo.</p>
          </div>
          <button 
            onClick={() => handleDelete()} 
            disabled={!cacheData || cacheData.totalGridsCached === 0}
            className="bg-red-900/40 hover:bg-red-900/60 border border-red-800/50 text-red-400 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Purge All Cache
          </button>
        </div>

        {error && (
          <div className="bg-orange-900/30 border border-orange-800 text-orange-400 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold">Redis Connection Error</h3>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-sm mt-2 font-mono bg-orange-950/50 p-2 rounded block text-orange-300">
                Ensure process.env.KV_REST_API_URL and process.env.KV_REST_API_TOKEN are set in your .env.local file.
              </p>
            </div>
          </div>
        )}

        {loading && <div className="flex p-12 justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}

        {!loading && !error && cacheData && (
          <div className="bg-black/40 rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
              <h2 className="font-bold text-gray-200">Cached 100km Grids ({cacheData.totalGridsCached})</h2>
              <span className="text-sm text-gray-500">Each grid saves ~27,000 Open-Meteo API points.</span>
            </div>
            
            {cacheData.totalGridsCached === 0 ? (
              <div className="p-12 text-center text-gray-500">No climate data grids currently cached in Redis.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/50 border-b border-gray-800 text-gray-400">
                    <tr>
                      <th className="p-4 font-medium">Grid Storage Key</th>
                      <th className="p-4 font-medium">Lat / Lon (Center)</th>
                      <th className="p-4 font-medium">Cached Content Month</th>
                      <th className="p-4 font-medium">Last Saved To DB</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {cacheData.grids.map((grid: any) => (
                      <tr key={grid.key} className="hover:bg-gray-800/40 transition-colors">
                        <td className="p-4 font-mono font-medium text-blue-400">{grid.key}</td>
                        <td className="p-4">{grid.latitude}°, {grid.longitude}°</td>
                        <td className="p-4">
                          <span className="inline-flex bg-green-900/40 text-green-400 px-2 py-1 rounded text-xs border border-green-800/50">
                            End: {grid.targetEndDate}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500">{new Date(grid.lastFetched).toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDelete(grid.key)}
                            className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                            title="Delete this grid"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
