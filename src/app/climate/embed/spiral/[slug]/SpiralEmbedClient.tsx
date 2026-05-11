"use client";

import { useEffect, useState } from 'react';
import ClimateSpiralCard, { type SeriesMap } from '@/app/_components/climate-spiral-card';

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

/**
 * Standalone embed client for the Climate Spiral card. Mirrors
 * `MonthlyEmbedClient` so the same iframe loaders work — we just swap the
 * inner card for the spiral. Keeping it separate (vs. parameterising the
 * monthly embed) makes the route path semantic and lets us tweak the height
 * / aspect of the iframe independently.
 */
export default function SpiralEmbedClient({ slug }: { slug: string }) {
  const [series, setSeries] = useState<SeriesMap>({});
  const [regionName, setRegionName] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
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

  return (
    <ClimateSpiralCard
      series={series}
      regionName={regionName || ''}
      dataSource={dataSource}
      hideShare
    />
  );
}
