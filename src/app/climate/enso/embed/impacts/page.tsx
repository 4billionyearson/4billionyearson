'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ImpactsSection from '../../_components/ImpactsSection';
import type { EnsoSnapshot } from '../../types';

export default function EmbedImpactsPage() {
  const [data, setData] = useState<EnsoSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/climate/enso')
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e?.message || 'Failed to load'));
  }, []);

  if (error) {
    return (
      <div className="p-4 text-orange-300 text-sm">
        Failed to load ENSO data: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
        <span className="text-gray-400 text-sm">Loading ENSO data…</span>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      <ImpactsSection data={data} />
      <div className="flex justify-end">
        <a
          href="https://4billionyearson.org/climate/enso#impacts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-[#D0A65E]/60 hover:text-[#D0A65E] transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="4 Billion Years On" className="h-4 w-4 rounded-sm opacity-60" />
          4 Billion Years On - ENSO Tracker ↗
        </a>
      </div>
    </div>
  );
}
