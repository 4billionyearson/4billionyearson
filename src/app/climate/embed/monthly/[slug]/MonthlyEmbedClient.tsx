"use client";

import { useEffect, useState } from 'react';
import MonthlySpaghettiCard, { type SeriesMap } from '@/app/_components/monthly-spaghetti-card';
import type { SpaghettiMetric } from '@/app/_components/monthly-spaghetti-chart';

const VALID_METRICS: SpaghettiMetric[] = ['temp', 'precip', 'sunshine', 'frost'];

interface ProfileResponse {
  countryData?: { monthlyAll?: { year: number; month: number; value: number }[] };
  countryPrecipData?: { monthlyAll?: { year: number; month: number; value: number }[] };
  ukRegionData?: { region?: string; varData?: Record<string, { monthlyAll?: { year: number; month: number; value: number }[] }> };
  nationalData?: {
    region?: string;
    state?: string;
    varData?: Record<string, { monthlyAll?: { year: number; month: number; value: number }[] }>;
    paramData?: Record<string, { monthlyAll?: { year: number; month: number; value: number }[] }>;
  };
  usStateData?: { state?: string; paramData?: Record<string, { monthlyAll?: { year: number; month: number; value: number }[] }> };
  name?: string;
}

interface GlobalHistoryResponse {
  noaaStats?: { landOcean?: { monthlyAll?: { year: number; month: number; value: number }[] } };
  landMonthlyAll?: { year: number; month: number; value: number }[];
}

interface UsRegionResponse {
  region?: string;
  paramData?: Record<string, { monthlyAll?: { year: number; month: number; value: number }[] }>;
}

interface ContinentAbsolutesResponse {
  monthlyAll?: { year: number; month: number; value: number }[];
  name?: string;
}

export default function MonthlyEmbedClient({
  slug,
  initialMetric,
}: {
  slug: string;
  initialMetric?: SpaghettiMetric;
}) {
  const [series, setSeries] = useState<SeriesMap>({});
  const [regionName, setRegionName] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Special-case: global series.
        if (slug === 'global-land-ocean') {
          const res = await fetch('/data/climate/global-history.json', { cache: 'no-store' });
          if (!res.ok) throw new Error(`global-history fetch ${res.status}`);
          const json = (await res.json()) as GlobalHistoryResponse;
          const ms = json?.noaaStats?.landOcean?.monthlyAll;
          if (cancelled) return;
          setSeries({ temp: ms ?? [] });
          setRegionName('Global Land + Ocean');
          setDataSource('NOAA Climate at a Glance - Global Land+Ocean');
          return;
        }
        if (slug === 'global-land') {
          const res = await fetch('/data/climate/global-history.json', { cache: 'no-store' });
          if (!res.ok) throw new Error(`global-history fetch ${res.status}`);
          const json = (await res.json()) as GlobalHistoryResponse;
          const ms = json?.landMonthlyAll;
          if (cancelled) return;
          setSeries({ temp: ms ?? [] });
          setRegionName('Global Land');
          setDataSource('Our World in Data / ERA5');
          return;
        }

        // Continent slugs are stored as continent-absolutes/<slug>.json
        const continentRes = await fetch(`/data/climate/continent-absolutes/${slug}.json`, { cache: 'no-store' });
        if (continentRes.ok) {
          const json = (await continentRes.json()) as ContinentAbsolutesResponse;
          if (cancelled) return;
          setSeries({ temp: json.monthlyAll ?? [] });
          setRegionName(json.name ?? slug);
          setDataSource('4BYO continent aggregate · OWID/CRU TS country monthly temperatures.');
          return;
        }

        // US climate region snapshots
        const usRegionRes = await fetch(`/data/climate/us-climate-region/${slug}.json`, { cache: 'no-store' });
        if (usRegionRes.ok) {
          const json = (await usRegionRes.json()) as UsRegionResponse;
          if (cancelled) return;
          setSeries({
            temp: json.paramData?.tavg?.monthlyAll ?? [],
            precip: json.paramData?.pcp?.monthlyAll ?? undefined,
          });
          setRegionName(json.region ?? slug);
          setDataSource('NOAA Climate at a Glance — regional tavg / pcp.');
          return;
        }

        // Otherwise fall back to the unified profile API used by /climate/[slug].
        const res = await fetch(`/api/climate/profile/${slug}?_t=${Date.now()}`);
        if (!res.ok) throw new Error(`profile ${slug} fetch ${res.status}`);
        const json = (await res.json()) as ProfileResponse;
        if (cancelled) return;

        const temp = json.ukRegionData?.varData?.Tmean?.monthlyAll
          || json.nationalData?.varData?.Tmean?.monthlyAll
          || json.usStateData?.paramData?.tavg?.monthlyAll
          || json.nationalData?.paramData?.tavg?.monthlyAll
          || json.countryData?.monthlyAll;
        const precip = json.ukRegionData?.varData?.Rainfall?.monthlyAll
          || json.nationalData?.varData?.Rainfall?.monthlyAll
          || json.usStateData?.paramData?.pcp?.monthlyAll
          || json.nationalData?.paramData?.pcp?.monthlyAll
          || json.countryPrecipData?.monthlyAll;
        const sunshine = json.ukRegionData?.varData?.Sunshine?.monthlyAll
          || json.nationalData?.varData?.Sunshine?.monthlyAll;
        const frost = json.ukRegionData?.varData?.AirFrost?.monthlyAll
          || json.nationalData?.varData?.AirFrost?.monthlyAll;

        setSeries({ temp, precip, sunshine, frost });
        setRegionName(json.name ?? slug);
        const isUk = !!(json.ukRegionData || json.nationalData?.varData);
        const isUs = !!(json.usStateData || json.nationalData?.paramData);
        setDataSource(
          isUk
            ? 'Data: Met Office UK Regional Series © Crown copyright'
            : isUs
              ? 'Data: NOAA National Centers for Environmental Information'
              : 'Data: Our World in Data / NOAA (rainfall: World Bank CCKP / CRU TS 4.08)'
        );
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [slug]);

  if (error) {
    return <p className="p-4 text-sm text-red-400">Failed to load embed data: {error}</p>;
  }

  const initial = initialMetric && VALID_METRICS.includes(initialMetric) ? initialMetric : undefined;

  return (
    <div className="p-3">
      <MonthlySpaghettiCard
        series={series}
        regionName={regionName || ''}
        dataSource={dataSource}
        initialMetric={initial}
        hideShare
      />
    </div>
  );
}
