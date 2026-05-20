'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { Loader2 } from 'lucide-react';
import { EnsoCard } from '@/app/climate/global/ClimateSystemsPanel';
import type { EnsoSnapshot } from '@/app/climate/enso/types';

type EnsoCardData = ComponentProps<typeof EnsoCard>['enso'];

function mapSnapshotToCardData(snapshot: EnsoSnapshot | null): EnsoCardData {
  if (!snapshot?.oni) return null;

  return {
    state: snapshot.oni.state,
    strength: snapshot.oni.strength,
    anomaly: snapshot.oni.anomaly,
    season: snapshot.oni.season,
    seasonYear: snapshot.oni.seasonYear,
    history: snapshot.oni.history,
    weekly: snapshot.weekly
      ? {
          weekly: snapshot.weekly.weekly,
          lastWeek: snapshot.weekly.lastWeek,
        }
      : null,
    forecast: snapshot.forecast
      ? {
          seasons: snapshot.forecast.seasons,
        }
      : null,
    plume: snapshot.plume,
    cnnForecast: snapshot.cnnForecast,
  };
}

export default function LiveEnsoCard() {
  const [snapshot, setSnapshot] = useState<EnsoSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/climate/enso')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load ENSO snapshot');
        return response.json();
      })
      .then((payload: EnsoSnapshot) => {
        if (!cancelled) {
          setSnapshot(payload);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const enso = mapSnapshotToCardData(snapshot);
  if (enso) return <EnsoCard enso={enso} />;

  return (
    <section className="rounded-2xl border-2 border-[#D0A65E] bg-gray-950/90 backdrop-blur-md p-4 shadow-xl">
      <div className="flex items-center gap-3 text-gray-300">
        {error ? (
          <p className="text-sm">ENSO tracker temporarily unavailable.</p>
        ) : (
          <>
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#D0A65E]" />
            <p className="text-sm">Loading ENSO tracker…</p>
          </>
        )}
      </div>
    </section>
  );
}