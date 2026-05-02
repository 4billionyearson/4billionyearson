import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ParisTrackerCard, { type ParisTrackerData } from '../../global/ParisTrackerCard';

export const runtime = 'nodejs';
export const revalidate = 3600;

async function loadParisData(): Promise<ParisTrackerData | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const raw = await readFile(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.yearlyData || !parsed?.preIndustrialBaseline || !parsed?.keyThresholds) return null;
    return {
      yearlyData: parsed.yearlyData,
      preIndustrialBaseline: parsed.preIndustrialBaseline,
      keyThresholds: parsed.keyThresholds,
    };
  } catch {
    return null;
  }
}

export default async function ParisEmbedPage() {
  const data = await loadParisData();
  const backUrl = 'https://4billionyearson.org/climate/global#paris-tracker';

  return (
    <div className="p-3">
      {data ? (
        <ParisTrackerCard data={data} hideShare />
      ) : (
        <div className="rounded-2xl border-2 border-[#D0A65E] bg-gray-950/90 p-5 text-sm text-amber-300">
          Paris tracker is temporarily unavailable.
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <a
          href={backUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-[#D0A65E]/60 hover:text-[#D0A65E] transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="4 Billion Years On" className="h-4 w-4 rounded-sm opacity-60" />
          4 Billion Years On - Paris Agreement Tracker ↗
        </a>
      </div>
    </div>
  );
}
