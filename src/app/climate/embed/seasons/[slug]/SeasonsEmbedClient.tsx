"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import SeasonalShiftCard from '@/app/_components/seasonal-shift-card';
import GlobalSeasonalSummary from '@/app/_components/global-seasonal-summary';

type MA = { year: number; month: number; value: number }[];

interface ProfileResponse {
  countryData?: { monthlyAll?: MA };
  countryPrecipData?: { monthlyAll?: MA };
  ukRegionData?: { region?: string; varData?: Record<string, { monthlyAll?: MA }> };
  nationalData?: {
    region?: string;
    state?: string;
    varData?: Record<string, { monthlyAll?: MA }>;
    paramData?: Record<string, { monthlyAll?: MA }>;
  };
  usStateData?: { state?: string; paramData?: Record<string, { monthlyAll?: MA }> };
  name?: string;
}

interface ContinentAbsolutesResponse {
  monthlyAll?: MA;
  name?: string;
}

interface UsRegionResponse {
  region?: string;
  paramData?: Record<string, { monthlyAll?: MA }>;
}

export default function SeasonsEmbedClient({ slug }: { slug: string }) {
  const [series, setSeries] = useState<{
    monthlyAll?: MA;
    rainfallMonthly?: MA;
    sunshineMonthly?: MA;
    regionName: string;
    dataSource: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGlobal = slug === 'global';

  useEffect(() => {
    if (isGlobal) return;
    let cancelled = false;
    (async () => {
      try {
        // Continent slug?
        const continentRes = await fetch(`/data/climate/continent-absolutes/${slug}.json`, { cache: 'no-store' });
        if (continentRes.ok) {
          const json = (await continentRes.json()) as ContinentAbsolutesResponse;
          if (cancelled) return;
          setSeries({
            monthlyAll: json.monthlyAll,
            regionName: json.name ?? slug,
            dataSource: '4BYO continent aggregate · OWID/CRU TS country monthly temperatures.',
          });
          return;
        }
        // US climate region snapshot?
        const usRegionRes = await fetch(`/data/climate/us-climate-region/${slug}.json`, { cache: 'no-store' });
        if (usRegionRes.ok) {
          const json = (await usRegionRes.json()) as UsRegionResponse;
          if (cancelled) return;
          setSeries({
            monthlyAll: json.paramData?.tavg?.monthlyAll,
            rainfallMonthly: json.paramData?.pcp?.monthlyAll,
            regionName: json.region ?? slug,
            dataSource: 'NOAA Climate at a Glance — regional tavg / pcp.',
          });
          return;
        }
        // Fallback: profile API.
        const res = await fetch(`/api/climate/profile/${slug}?_t=${Date.now()}`);
        if (!res.ok) throw new Error(`profile ${slug} fetch ${res.status}`);
        const json = (await res.json()) as ProfileResponse;
        if (cancelled) return;
        const monthlyAll = json.ukRegionData?.varData?.Tmean?.monthlyAll
          || json.nationalData?.varData?.Tmean?.monthlyAll
          || json.usStateData?.paramData?.tavg?.monthlyAll
          || json.nationalData?.paramData?.tavg?.monthlyAll
          || json.countryData?.monthlyAll;
        const rainfallMonthly = json.ukRegionData?.varData?.Rainfall?.monthlyAll
          || json.nationalData?.varData?.Rainfall?.monthlyAll
          || json.usStateData?.paramData?.pcp?.monthlyAll
          || json.nationalData?.paramData?.pcp?.monthlyAll
          || json.countryPrecipData?.monthlyAll;
        const sunshineMonthly = json.ukRegionData?.varData?.Sunshine?.monthlyAll
          || json.nationalData?.varData?.Sunshine?.monthlyAll;
        const dataSource = (json.ukRegionData || json.nationalData?.varData)
          ? 'Data: Met Office UK Regional Series © Crown copyright'
          : (json.usStateData || json.nationalData?.paramData)
            ? 'Data: NOAA National Centers for Environmental Information'
            : 'Data: Our World in Data / NOAA';
        setSeries({
          monthlyAll,
          rainfallMonthly,
          sunshineMonthly,
          regionName: json.name ?? slug,
          dataSource,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, isGlobal]);

  if (isGlobal) {
    return (
      <section className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
        <h3 className="text-lg sm:text-xl font-bold font-mono text-[#FFF5E7] mb-3">Shifting Seasons Worldwide</h3>
        <GlobalSeasonalSummary hideExploreLink />
      </section>
    );
  }

  if (error) return <p className="text-sm text-amber-300 p-3">{error}</p>;
  if (!series) {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin text-[#D0A65E]" /> Loading…
      </div>
    );
  }
  if (!series.monthlyAll?.length) {
    return <p className="text-sm text-amber-300 p-3">Seasonal-shift data unavailable for {series.regionName}.</p>;
  }
  return (
    <SeasonalShiftCard
      monthlyAll={series.monthlyAll}
      rainfallMonthly={series.rainfallMonthly}
      sunshineMonthly={series.sunshineMonthly}
      regionName={series.regionName}
      dataSource={series.dataSource}
    />
  );
}
