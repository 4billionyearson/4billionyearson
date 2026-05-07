import { getCached } from '@/lib/climate/redis';
import type { PlugInSolarLiveData } from '@/lib/plug-in-solar/types';
import { StatusDashboard } from '../../_components/StatusDashboard';
import { LastUpdatedBadge } from '../../_components/LastUpdatedBadge';

/**
 * Embeddable iframe widget showing the live UK plug-in solar status
 * dashboard. Designed to be dropped into news articles or partner sites
 * via a small <iframe>. ~640px tall, 100% wide.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

const CACHE_KEY_PREFIX = 'plug-in-solar-uk';
const CACHE_VERSION = 'v3';
const LOOKBACK_DAYS = 7;

function dateOffsetKey(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return `${CACHE_KEY_PREFIX}:${d.toISOString().slice(0, 10)}-${CACHE_VERSION}`;
}

async function readMostRecent(): Promise<PlugInSolarLiveData | null> {
  for (let i = 0; i <= LOOKBACK_DAYS; i++) {
    const cached = await getCached<PlugInSolarLiveData>(dateOffsetKey(i));
    if (cached) return cached;
  }
  return null;
}

export default async function PlugInSolarStatusEmbed() {
  const data = await readMostRecent();
  const backUrl = 'https://4billionyearson.org/plug-in-solar-uk';

  return (
    <div className="p-3">
      <div
        className="rounded-2xl border-2 border-[#D2E369] shadow-xl"
        style={{
          background:
            'linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)',
        }}
      >
        <div
          className="px-4 py-3 rounded-t-[14px]"
          style={{ backgroundColor: '#D2E369' }}
        >
          <h1 className="text-base md:text-lg font-bold font-mono tracking-tight text-[#2C5263]">
            UK Plug-in Solar — Where Things Stand
          </h1>
        </div>
        <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-b-[14px] space-y-3">
          {data ? (
            <>
              <StatusDashboard pills={data.statusDashboard} />
              {data.tldr && (
                <p className="text-xs text-gray-300 leading-relaxed">{data.tldr}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <LastUpdatedBadge generatedAt={data.generatedAt} />
                <a
                  href={backUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#D2E369]/80 hover:text-[#D2E369] transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="4 Billion Years On" className="h-4 w-4 rounded-sm opacity-70" />
                  4 Billion Years On — full guide ↗
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-300">
              Live status temporarily unavailable. Visit{' '}
              <a href={backUrl} className="underline hover:text-[#D2E369]">4billionyearson.org/plug-in-solar-uk</a>{' '}
              for the full guide.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
