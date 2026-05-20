'use client';

import { useState, useCallback } from 'react';
import { Trophy } from 'lucide-react';
import type { ClimateRegion } from '@/lib/climate/regions';
import type { SeriesMap } from '@/app/_components/monthly-spaghetti-card';
import ClimateSpiralCard from '@/app/_components/climate-spiral-card';
import RecordsSection from '@/app/_components/climate-records-section';
import GlobalHelixCard, { type HelixSeriesTab } from '../global/GlobalHelixCard';
import HelixRegionPicker from './HelixRegionPicker';
import { detectSeasonScheme } from '@/lib/climate/season-scheme';
import { shouldFeatureEnso } from '@/lib/climate/enso-impacts';

// ─── Data fetching helpers ───────────────────────────────────────────────────

interface RegionHelixData {
  series: SeriesMap;
  source: string;
  seasonScheme?: ReturnType<typeof detectSeasonScheme>;
  ensoOn?: boolean;
}

async function fetchRegionHelixData(region: ClimateRegion): Promise<RegionHelixData | null> {
  try {
    const res = await fetch(`/api/climate/profile/${region.slug}`);
    if (!res.ok) return null;
    const data = await res.json();

    const temp =
      data.ukRegionData?.varData?.Tmean?.monthlyAll ||
      data.nationalData?.varData?.Tmean?.monthlyAll ||
      data.usClimateRegionData?.paramData?.tavg?.monthlyAll ||
      data.usStateData?.paramData?.tavg?.monthlyAll ||
      data.nationalData?.paramData?.tavg?.monthlyAll ||
      data.countryData?.monthlyAll;

    if (!temp?.length) return null;

    const precip =
      data.ukRegionData?.varData?.Rainfall?.monthlyAll ||
      data.nationalData?.varData?.Rainfall?.monthlyAll ||
      data.usClimateRegionData?.paramData?.pcp?.monthlyAll ||
      data.usStateData?.paramData?.pcp?.monthlyAll ||
      data.nationalData?.paramData?.pcp?.monthlyAll ||
      data.countryPrecipData?.monthlyAll;

    const sunshine =
      data.ukRegionData?.varData?.Sunshine?.monthlyAll ||
      data.nationalData?.varData?.Sunshine?.monthlyAll;

    const frost =
      data.ukRegionData?.varData?.AirFrost?.monthlyAll ||
      data.nationalData?.varData?.AirFrost?.monthlyAll;

    const series: SeriesMap = { temp, precip, sunshine, frost };

    const source = (data.ukRegionData || data.nationalData?.varData)
      ? 'Met Office UK Regional Series © Crown copyright'
      : (data.usClimateRegionData || data.usStateData || data.nationalData?.paramData)
        ? 'NOAA National Centers for Environmental Information'
        : 'Our World in Data / NOAA';

    const seasonScheme = detectSeasonScheme({ tempMonthly: temp, precipMonthly: precip });
    const ensoOn = shouldFeatureEnso(region);

    return { series, source, seasonScheme, ensoOn };
  } catch {
    return null;
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  regions: ClimateRegion[];
  globalTabs: HelixSeriesTab[];
  globalRecordsSeries: SeriesMap | null;
  globalRecordsSource: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HelixClientSection({
  regions,
  globalTabs,
  globalRecordsSeries,
  globalRecordsSource,
}: Props) {
  const [selectedRegion, setSelectedRegion] = useState<ClimateRegion | null>(null);
  const [regionData, setRegionData] = useState<RegionHelixData | null>(null);
  const [regionLoading, setRegionLoading] = useState(false);
  const [regionError, setRegionError] = useState<string | null>(null);

  const handleRegionSelect = useCallback(async (region: ClimateRegion) => {
    setSelectedRegion(region);
    setRegionData(null);
    setRegionError(null);
    setRegionLoading(true);

    const data = await fetchRegionHelixData(region);
    if (data) {
      setRegionData(data);
    } else {
      setRegionError(region.slug);
    }
    setRegionLoading(false);
  }, []);

  const handleClearRegion = useCallback(() => {
    setSelectedRegion(null);
    setRegionData(null);
    setRegionError(null);
  }, []);

  return (
    <>
      {/* ── Hero card ── */}
      <section
        className="rounded-2xl border-2 border-[#D0A65E] shadow-xl"
        style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
      >
        <div className="px-4 py-3 md:px-6 md:py-4 rounded-t-2xl" style={{ backgroundColor: '#D0A65E' }}>
          <h1
            className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight"
            style={{ color: '#FFF5E7' }}
          >
            Climate Helix
          </h1>
        </div>
        <div className="bg-gray-950 px-4 py-3 md:px-6 md:py-4 space-y-2 rounded-b-2xl overflow-visible">
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            A radial year-on-year temperature dial. Each loop is one year, the colour gradient encodes the
            long-term warming trend, the global helix includes dotted Paris 1.5°C and 2°C reference rings,
            and an optional ENSO heads-up highlights El Niño and La Niña years. Search or browse to load any
            region&rsquo;s helix below.
          </p>
          <HelixRegionPicker
            regions={regions}
            onRegionSelect={handleRegionSelect}
            onSelectGlobal={handleClearRegion}
            isGlobalActive={selectedRegion === null}
          />
        </div>
      </section>

      {/* ── Helix + Records display ── */}
      <div id="helix-display" className="scroll-mt-4">
        {selectedRegion ? (
          <>
            {regionLoading && (
              <div className="bg-[#0b0e16] rounded-2xl shadow-xl border-2 border-[#D0A65E] min-h-[360px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin h-8 w-8 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-400">Loading {selectedRegion.name} helix…</p>
                </div>
              </div>
            )}

            {!regionLoading && regionError && (
              <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-5 py-6 space-y-3">
                <p className="text-sm text-amber-200">
                  Helix data for <strong>{selectedRegion.name}</strong> is not available on this page.
                </p>
                <a
                  href={`/climate/${regionError}#climate-spiral`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D0A65E] hover:text-[#FFF5E7] transition-colors"
                >
                  Open {selectedRegion.name}&rsquo;s full climate page →
                </a>
              </div>
            )}

            {!regionLoading && regionData && (
              <>
                <ClimateSpiralCard
                  series={regionData.series}
                  regionName={selectedRegion.name}
                  dataSource={regionData.source}
                  embedSlug={selectedRegion.slug}
                  sectionId="region-helix"
                  share={{
                    pageUrl: `https://4billionyearson.org/climate/helix`,
                    sectionId: 'climate-spiral',
                  }}
                  seasonScheme={regionData.seasonScheme}
                  showEnso={regionData.ensoOn}
                />
                <div
                  id="region-records"
                  className="mt-6 bg-[#0b0e16] p-3 sm:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E] scroll-mt-24"
                >
                  <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 shrink-0 text-amber-400" />
                    <span className="min-w-0 flex-1">Records – {selectedRegion.name}</span>
                  </h2>
                  <RecordsSection series={regionData.series} />
                  <p className="text-[11px] text-gray-500 mt-3">{regionData.source}</p>
                </div>
              </>
            )}
          </>
        ) : (
          // Default: global helix + records
          <>
            {globalTabs.length > 0 ? (
              <>
                <GlobalHelixCard tabs={globalTabs} />
                {globalRecordsSeries && (
                  <div
                    id="climate-records"
                    className="mt-6 bg-[#0b0e16] p-3 sm:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E] scroll-mt-24"
                  >
                    <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-center gap-2">
                      <Trophy className="h-5 w-5 shrink-0 text-amber-400" />
                      <span className="min-w-0 flex-1">Records – Global Temperature</span>
                    </h2>
                    <RecordsSection series={globalRecordsSeries} />
                    {globalRecordsSource && (
                      <p className="text-[11px] text-gray-500 mt-3">{globalRecordsSource}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-[#D0A65E]/30 bg-gray-900/40 p-4 text-sm text-gray-400">
                Global helix data is not available right now. Use the search above to open a region helix.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
