/**
 * Shared cache-key derivation for the Gemini climate-summary cache.
 *
 * Both the page-side reader (page.tsx, global/page.tsx) and the API-side
 * writer (api/climate/summary/[slug]/route.ts) MUST agree on the cache
 * key, or every page render will see a miss and trigger a Gemini run.
 *
 * The key is keyed on the **page-snapshot month** — the chronological
 * minimum of the local primary snapshot's month and the NOAA global
 * snapshot's month. This means:
 *
 *  - While the page is gated to "March update" (because Global hasn't
 *    published April yet), the cache key contains "Mar 2026", so the
 *    existing March summary is reused. Gemini does NOT regenerate.
 *  - Once Global catches up and the page flips to "April update", the
 *    key changes to "Apr 2026" → cache miss → Gemini regenerates with
 *    every source already on April, so the new summary is internally
 *    consistent with the rendered page.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ClimateRegion } from '@/lib/climate/regions';
import { pickPageSnapshotMonth } from '@/app/climate/_shared/overview-grid-types';

const SNAPSHOT_ROOT = resolve(process.cwd(), 'public', 'data', 'climate');
const VERSION = 'v28';

async function readJson(rel: string): Promise<any | null> {
  try {
    const txt = await readFile(resolve(SNAPSHOT_ROOT, rel), 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function getPrimaryLabel(region: ClimateRegion): Promise<string | null> {
  try {
    if (region.type === 'country') {
      const d = await readJson(`country/${region.apiCode}.json`);
      return d?.latestMonthStats?.label ?? null;
    }
    if (region.type === 'us-state') {
      const d = await readJson(`us-state/${region.apiCode}.json`);
      return d?.paramData?.tavg?.latestMonthStats?.label ?? null;
    }
    if (region.type === 'uk-region') {
      const d = await readJson(`uk-region/${region.apiCode}.json`);
      return d?.varData?.Tmean?.latestMonthStats?.label ?? null;
    }
    // group regions: their primary label aligns with the global snapshot,
    // since the slowest source on those pages is NOAA itself. Returning
    // null here lets the global label drive the key.
    return null;
  } catch {
    return null;
  }
}

async function getGlobalLabel(): Promise<string | null> {
  const d = await readJson('global-history.json');
  return d?.noaaStats?.landOcean?.latestMonthStats?.label ?? null;
}

function calendarFallback(): string {
  const now = new Date();
  const prev = new Date(now);
  if (now.getDate() < 21) prev.setMonth(prev.getMonth() - 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Derive the Gemini summary cache key for a given slug + region.
 * Pass region=null for the global page (slug='global').
 */
export async function getSummaryCacheKey(
  slug: string,
  region: ClimateRegion | null | undefined,
): Promise<string> {
  let pinnedMonth: string | null = null;
  if (region) {
    const [primary, global] = await Promise.all([getPrimaryLabel(region), getGlobalLabel()]);
    pinnedMonth = pickPageSnapshotMonth([primary, global]);
  } else {
    pinnedMonth = await getGlobalLabel();
  }
  const segment = pinnedMonth ?? calendarFallback();
  return `climate:summary:${slug}:${segment}-${VERSION}`;
}
