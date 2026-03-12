"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Database, AlertTriangle, Globe, MapPin } from 'lucide-react';

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
    if (!confirm(key ? `Delete cache entry: ${key}?` : "Clear ALL climate cache? This will force fresh API fetches.")) return;

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
            <p className="text-gray-400 mt-1">Manage all cached climate data in Redis.</p>
          </div>
          <button 
            onClick={() => handleDelete()} 
            disabled={!cacheData || cacheData.totalCached === 0}
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
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Countries', count: cacheData.countryKeys?.length || 0, color: 'text-red-400' },
                { label: 'US States', count: cacheData.usStateKeys?.length || 0, color: 'text-orange-400' },
                { label: 'UK Regions', count: cacheData.ukRegionKeys?.length || 0, color: 'text-amber-400' },
                { label: 'Global', count: cacheData.hasGlobal ? 1 : 0, color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Country cache */}
            {cacheData.countryKeys?.length > 0 && (
              <CacheSection
                title="Country Temperature Cache"
                icon={<Globe className="h-4 w-4 text-red-400" />}
                keys={cacheData.countryKeys}
                onDelete={handleDelete}
              />
            )}

            {/* US State cache */}
            {cacheData.usStateKeys?.length > 0 && (
              <CacheSection
                title="US State Cache"
                icon={<MapPin className="h-4 w-4 text-orange-400" />}
                keys={cacheData.usStateKeys}
                onDelete={handleDelete}
              />
            )}

            {/* UK Region cache */}
            {cacheData.ukRegionKeys?.length > 0 && (
              <CacheSection
                title="UK Region Cache"
                icon={<MapPin className="h-4 w-4 text-amber-400" />}
                keys={cacheData.ukRegionKeys}
                onDelete={handleDelete}
              />
            )}

            {/* Global cache */}
            {cacheData.hasGlobal && (
              <div className="bg-black/40 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                  <h2 className="font-bold text-gray-200 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-400" /> Global Temperature Cache
                  </h2>
                  <button onClick={() => handleDelete('climate:global')} className="text-gray-500 hover:text-red-400 p-1 transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4 text-sm text-gray-400">climate:global</div>
              </div>
            )}

            {cacheData.totalCached === 0 && (
              <div className="p-12 text-center text-gray-500">No climate data currently cached in Redis.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CacheSection({ title, icon, keys, onDelete }: {
  title: string;
  icon: React.ReactNode;
  keys: string[];
  onDelete: (key: string) => void;
}) {
  return (
    <div className="bg-black/40 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50">
        <h2 className="font-bold text-gray-200 flex items-center gap-2">{icon} {title} ({keys.length})</h2>
      </div>
      <div className="divide-y divide-gray-800">
        {keys.map((key: string) => (
          <div key={key} className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/40 transition-colors">
            <span className="font-mono text-sm text-gray-400">{key}</span>
            <button onClick={() => onDelete(key)} className="text-gray-500 hover:text-red-400 p-1 transition-colors" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
