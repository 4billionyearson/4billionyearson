"use client";

import React, { useMemo } from 'react';
import RecordsTable from '@/app/_components/climate-records-table';
import { buildYearMap, METRIC_PALETTE } from '@/app/_components/climate-spiral-card';
import type { SeriesMap } from '@/app/_components/monthly-spaghetti-card';
import type { SpaghettiMetric } from '@/app/_components/monthly-spaghetti-chart';

// Standalone records wrapper. Builds its own per-metric YearMaps from the raw
// series so it can sit anywhere on a climate page (not just inside the Helix).
export default function RecordsSection({
  series,
  provisionalAfterMonth,
}: {
  series: SeriesMap;
  provisionalAfterMonth?: { year: number; month: number } | null;
}) {
  const allYearMaps = useMemo(() => {
    const out: Partial<Record<SpaghettiMetric, Map<number, number[]>>> = {};
    const metrics: SpaghettiMetric[] = ['temp', 'precip', 'sunshine', 'frost'];
    for (const m of metrics) {
      const pts = series[m];
      if (!pts?.length) continue;
      out[m] = buildYearMap(pts, provisionalAfterMonth ?? null).yearMap;
    }
    return out;
  }, [series, provisionalAfterMonth]);

  const defaultMetric: SpaghettiMetric =
    allYearMaps.temp ? 'temp' : ((Object.keys(allYearMaps)[0] as SpaghettiMetric | undefined) ?? 'temp');
  const defaultYearMap = allYearMaps[defaultMetric];
  if (!defaultYearMap?.size) return null;
  const currentYear = Math.max(...defaultYearMap.keys());

  return (
    <RecordsTable
      metric={defaultMetric}
      yearMap={defaultYearMap}
      currentYear={currentYear}
      palette={METRIC_PALETTE[defaultMetric]}
      allSeries={allYearMaps}
      allPalettes={METRIC_PALETTE}
    />
  );
}
