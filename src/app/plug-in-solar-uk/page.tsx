import { headers } from 'next/headers';
import { getCached } from '@/lib/climate/redis';
import type { PlugInSolarLiveData } from '@/lib/plug-in-solar/types';
import PlugInSolarGuide from './PlugInSolarGuide';

/**
 * Server component for /plug-in-solar-uk.
 *
 * Reads the daily cache (today's key first, fallback up to 7 days back),
 * pre-seeds the rendered HTML with whatever live data we have, and
 * fires off a background warm-up to the API route on a today-miss so
 * the next request is fresh. This is the same SSR-friendly pattern used
 * by the climate region pages, just with a daily key instead of monthly.
 */

export const dynamicParams = true;
// 24h ISR safety net; cache invalidation is event-driven via revalidatePath()
// inside the /api/plug-in-solar-uk route after a successful Gemini run.
export const revalidate = 86400;

const CACHE_KEY_PREFIX = 'plug-in-solar-uk';
const CACHE_VERSION = 'v3';
const LOOKBACK_DAYS = 7;

function dateOffsetKey(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return `${CACHE_KEY_PREFIX}:${d.toISOString().slice(0, 10)}-${CACHE_VERSION}`;
}

async function readCachedPayload(): Promise<{ data: PlugInSolarLiveData | null; cacheMiss: boolean; source: string }> {
  // Try today first
  const todaysKey = dateOffsetKey(0);
  const today = await getCached<PlugInSolarLiveData>(todaysKey);
  if (today) return { data: today, cacheMiss: false, source: 'cache' };

  // Fallback: walk back up to LOOKBACK_DAYS so the page never renders
  // empty on a Gemini failure.
  for (let i = 1; i <= LOOKBACK_DAYS; i++) {
    const stale = await getCached<PlugInSolarLiveData>(dateOffsetKey(i));
    if (stale) return { data: stale, cacheMiss: true, source: 'stale-cache' };
  }
  return { data: null, cacheMiss: true, source: 'no-cache' };
}

async function getRequestBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const h = await headers();
    const host = h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    /* ignore */
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** Fire-and-forget warm-up. Caller does not await. */
async function warmUp(): Promise<void> {
  try {
    const base = await getRequestBaseUrl();
    void fetch(`${base}/api/plug-in-solar-uk`, { cache: 'no-store' }).catch(() => {});
  } catch {
    /* swallow - warm-up is best-effort */
  }
}

export default async function PlugInSolarUKPage() {
  const { data, cacheMiss, source } = await readCachedPayload();
  if (cacheMiss) {
    await warmUp();
  }
  return <PlugInSolarGuide data={data} source={source} cacheMiss={cacheMiss} />;
}
