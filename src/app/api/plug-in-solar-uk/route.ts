export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { acquireLock, getCached, releaseLock, setDailyTerm } from '@/lib/climate/redis';
import {
  FULLY_AVAILABLE_FALLBACK,
  LEGAL_IN_SHOPS_TIMELINE_TITLE,
} from '@/app/plug-in-solar-uk/_data/static';
import { sanitiseRetailerProductUrl } from '@/lib/plug-in-solar/retailerUrls';
import { sanitisePlugInSolarNewsItems, SEED_NEWS_ITEMS } from '@/lib/plug-in-solar/newsUrls';
import { buildPlugInSolarPrompt, PLUG_IN_SOLAR_RESPONSE_SCHEMA } from '@/lib/plug-in-solar/prompt';
import { buildSeedProductRows, SEED_PRODUCTS } from '@/lib/plug-in-solar/seedProducts';
import type { PlugInSolarLiveData } from '@/lib/plug-in-solar/types';

/**
 * Daily refresh endpoint for the UK Plug-in Solar guide.
 *
 * Flow:
 * 1. Build a date-stamped Redis cache key (`plug-in-solar-uk:YYYY-MM-DD-v1`).
 * 2. Read the most-recent cached payload (today's if any, otherwise yesterday's).
 * 3. Call Gemini 2.5 Flash with Google Search grounding, instructing it to
 *    return JSON matching `PlugInSolarLiveData`.
 *    Grounding is incompatible with Gemini's structured-output mode, so
 *    we parse the JSON ourselves; if that fails we retry once without
 *    grounding using the structured-output mode as a safety net.
 * 4. Inject grounding citations into `groundingSources`.
 * 5. Cache with `setDailyTerm` (24h TTL) and call `revalidatePath` so the
 *    next visitor's SSR HTML is fresh.
 */

const CACHE_KEY_PREFIX = 'plug-in-solar-uk';
const CACHE_VERSION = 'v7';
const PREVIOUS_LOOKBACK_DAYS = 7;

/**
 * Primary-source domains (UK government, regulators, standards bodies).
 * Listed roughly highest-priority first so we can sort grounding citations
 * to surface official sources at the top of the "Sources" rail.
 */
const PRIMARY_SOURCE_DOMAINS = [
  'gov.uk',
  'desnz.gov.uk',
  'ofgem.gov.uk',
  'theiet.org',
  'electrical.theiet.org',
  'bsigroup.com',
  'energynetworks.org',
  'electricalsafetyfirst.org.uk',
  'hse.gov.uk',
  'parliament.uk',
];

function sourcePriority(uri: string): number {
  const lower = uri.toLowerCase();
  for (let i = 0; i < PRIMARY_SOURCE_DOMAINS.length; i++) {
    if (lower.includes(PRIMARY_SOURCE_DOMAINS[i])) return i;
  }
  return 100;
}

// Shift back by the cron hour (09:00 UTC) so the day boundary aligns with
// when the refresh actually runs, not UTC midnight. Without this, the cache
// key rolls over at 00:00 UTC and any visitor before 09:00 UTC triggers a
// premature full refresh. Cron was moved from 06:00 UTC -> 09:00 UTC because
// Google Search's grounding index was cold at 06:00, returning empty news.
const CRON_HOUR_UTC = 9;

function cronAlignedDate(daysAgo = 0): Date {
  const d = new Date(Date.now() - CRON_HOUR_UTC * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function todayKey(): string {
  return `${CACHE_KEY_PREFIX}:${cronAlignedDate().toISOString().slice(0, 10)}-${CACHE_VERSION}`;
}

function dateOffsetKey(daysAgo: number): string {
  return `${CACHE_KEY_PREFIX}:${cronAlignedDate(daysAgo).toISOString().slice(0, 10)}-${CACHE_VERSION}`;
}

/** Find the most recent cached payload from today or up to N days back. */
export async function readMostRecentCache(): Promise<PlugInSolarLiveData | null> {
  for (let i = 0; i <= PREVIOUS_LOOKBACK_DAYS; i++) {
    const cached = await getCached<PlugInSolarLiveData>(dateOffsetKey(i));
    if (cached) return cached;
  }
  return null;
}

interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(geminiData: any): GroundingSource[] {
  const chunks = geminiData?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const out: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && title && !seen.has(uri)) {
      seen.add(uri);
      out.push({ title, uri });
    }
  }
  // Stable sort: official sources first, third-party press second, original
  // order preserved within each tier.
  out.sort((a, b) => sourcePriority(a.uri) - sourcePriority(b.uri));
  return out.slice(0, 12);
}

function extractTextFromParts(geminiData: any): string | null {
  const parts = geminiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const textParts = parts.filter((p: any) => typeof p.text === 'string').map((p: any) => p.text);
  return textParts.length ? textParts.join('').trim() : null;
}

/** Strip Markdown code fences (```json ... ```) if Gemini wrapped the output. */
function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
  }
  return trimmed;
}

async function callGemini(
  apiKey: string,
  prompt: string,
  mode: 'grounded' | 'structured',
): Promise<{ text: string | null; sources: GroundingSource[] }> {
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (mode === 'grounded') {
    body.tools = [{ google_search: {} }];
  } else {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = PLUG_IN_SOLAR_RESPONSE_SCHEMA;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[plug-in-solar-uk] Gemini error (mode=${mode}):`, errText.slice(0, 500));
    return { text: null, sources: [] };
  }
  const data = await res.json();
  const text = extractTextFromParts(data);
  const sources = mode === 'grounded' ? extractGroundingSources(data) : [];
  return { text, sources };
}

function tryParse(text: string | null): PlugInSolarLiveData | null {
  if (!text) return null;
  const cleaned = stripCodeFence(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.statusDashboard) || !parsed.legalStatus || !parsed.regulations) {
      return null;
    }
    sanitisePayload(parsed);
    return parsed as PlugInSolarLiveData;
  } catch {
    return null;
  }
}

/**
 * Coerce date-shaped fields that Gemini sometimes returns as free text
 * ("around July 2026", "Q3 2026", "mid-2026") into proper YYYY-MM-DD
 * strings. The downstream components rely on Date.parse() succeeding;
 * if it doesn't, the timeline renders "Invalid Date / NaN mo away".
 */
function sanitisePayload(payload: any): void {
  if (payload?.fullyAvailableDate) {
    const cleaned = coerceIsoDate(payload.fullyAvailableDate.date);
    if (cleaned) {
      payload.fullyAvailableDate.date = cleaned;
    } else {
      // Strip the field entirely so the static fallback kicks in.
      delete payload.fullyAvailableDate;
    }
  }
  if (Array.isArray(payload?.timelineUpdates)) {
    payload.timelineUpdates = payload.timelineUpdates.filter((t: any) => {
      const cleaned = coerceIsoDate(t?.date);
      if (!cleaned) return false;
      t.date = cleaned;
      return true;
    });
  }
  if (Array.isArray(payload?.news)) {
    payload.news = payload.news.filter((n: any) => {
      const cleaned = coerceIsoDate(n?.date);
      if (!cleaned) return false;
      n.date = cleaned;
      return true;
    });
  }
  normaliseFullyAvailableMilestone(payload);
}

/**
 * `fullyAvailableDate` is the BSI / mainstream-retail beat (~mid-July 2026).
 * Gemini often misplaces the BS 7671 Amendment 4 transition end (2 Oct 2026)
 * here; that date is already a static timeline row.
 */
function normaliseFullyAvailableMilestone(payload: any): void {
  const fa = payload?.fullyAvailableDate;
  if (!fa || typeof fa.date !== 'string') return;
  if (fa.date === '2026-10-02') {
    fa.date = FULLY_AVAILABLE_FALLBACK.date;
    fa.label = LEGAL_IN_SHOPS_TIMELINE_TITLE;
    fa.rationale = FULLY_AVAILABLE_FALLBACK.rationale;
  }
  if (typeof fa.label === 'string') {
    const t = fa.label.trim();
    if (/\bfully\s+legal\b/i.test(fa.label) || /^legal$/i.test(t)) {
      fa.label = LEGAL_IN_SHOPS_TIMELINE_TITLE;
    }
  }
}

/** Parse a wide range of date strings into YYYY-MM-DD, or null if hopeless. */
function coerceIsoDate(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  // Strict YYYY-MM-DD (the schema asks for this).
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const t = Date.parse(trimmed + 'T00:00:00Z');
    return Number.isFinite(t) ? trimmed : null;
  }
  // Try free-form parsing as a last resort (e.g. "July 2026", "2026-07").
  const fuzz = trimmed
    .replace(/^(?:around|approx(?:imately)?|mid-?|early-?|late-?)\s+/i, '')
    .replace(/^Q[1-4]\s+/i, '')
    .replace(/^([0-9]{4})$/, '$1-12-31')
    .replace(/^([0-9]{4})-([0-9]{1,2})$/, (_, y, m) => `${y}-${m.padStart(2, '0')}-15`);
  const t2 = Date.parse(fuzz);
  if (!Number.isFinite(t2)) return null;
  const d = new Date(t2);
  return d.toISOString().slice(0, 10);
}

/* ─── URL validation ─────────────────────────────────────────────────────── */

/**
 * Retailer hosts we trust without a live HEAD check. Amazon and several
 * manufacturer sites often return 403/bot challenges to server-side
 * fetches even when the product page is valid, which was stripping most
 * `retailers[]` entries and collapsing the whole product table.
 */
function retailerUrlTrustedWithoutFetch(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('amazon-adsystem') || host.includes('amazonpay') || host.includes('advertising.amazon')) {
      return false;
    }
    // Amazon product-page URLs (/dp/, /gp/product/) get HEAD-validated so bad
    // ASINs are caught and dropped before caching. Search/browse URLs (/s?k=…)
    // are always valid — trust those without a fetch.
    const isAmazonHost =
      host === 'amazon.co.uk' || host.endsWith('.amazon.co.uk') ||
      host === 'amazon.com'   || host.endsWith('.amazon.com');
    if (isAmazonHost) {
      const path = parsed.pathname.toLowerCase();
      const isProductPage = path.includes('/dp/') || path.includes('/gp/product/');
      return !isProductPage;
    }
    const suffixes = [
      'ecoflow.com',
      'anker.com',
      'zendure.com',
      'growatt.com',
      'jackery.com',
      'bougerv.co.uk',
      'marstekenergy.com',
      'currys.co.uk',
      'argos.co.uk',
      'johnlewis.com',
      'diy.com',
      'screwfix.com',
      'wickes.co.uk',
      'toolstation.com',
      'ikea.com',
      'lidl.co.uk',
      'halfords.com',
      'smythstoys.com',
      'eurocell.co.uk',
      'homebase.co.uk',
    ];
    for (const s of suffixes) {
      if (host === s || host.endsWith(`.${s}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

const URL_VALIDATION_TIMEOUT_MS = 5000;
const URL_VALIDATION_USER_AGENT =
  'Mozilla/5.0 (compatible; 4billionyearson-bot/1.0; +https://4billionyearson.org/about)';

/**
 * Validate that a URL actually resolves to a working page (not 4xx/5xx
 * or DNS failure). Tries HEAD first; if the server rejects HEAD with a
 * 405 we retry with a small ranged GET. Used to filter out URLs that
 * Gemini occasionally hallucinates - even with grounding the model can
 * synthesise plausible-looking but non-existent article URLs.
 */
async function validateUrl(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string') return false;
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), URL_VALIDATION_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': URL_VALIDATION_USER_AGENT },
    });
    clearTimeout(timer);
    if (res.status === 405 || res.status === 501) {
      // HEAD not supported - retry with a tiny ranged GET.
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), URL_VALIDATION_TIMEOUT_MS);
      const res2 = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl2.signal,
        headers: {
          'User-Agent': URL_VALIDATION_USER_AGENT,
          Range: 'bytes=0-0',
        },
      });
      clearTimeout(t2);
      return res2.status >= 200 && res2.status < 400;
    }
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

/**
 * HEAD-check a URL on a trusted news domain with lenient failure handling.
 * Only drops on a definitive HTTP 404 or a cross-domain redirect that
 * goes to an *untrusted* domain or to a homepage (which indicates the
 * article ID resolved somewhere else).
 *
 * Critically, legitimate domain migrations are allowed:
 *   bbc.co.uk → bbc.com           (valid BBC article — both trusted)
 *   independent.co.uk → theindependent.com  (domain migration — both trusted)
 * Only redirects to non-trusted or homepage-only destinations are dropped.
 * All other outcomes (403, 429, 503, timeouts) are treated as "valid".
 */
async function validateTrustedNewsUrl(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), URL_VALIDATION_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': URL_VALIDATION_USER_AGENT },
    });
    clearTimeout(timer);
    if (res.status === 404) return false;
    // Cross-domain redirect check (lenient):
    // Allow if the final domain is also a trusted news domain AND the
    // path is substantive (not a homepage redirect like "/").
    // This lets bbc.co.uk→bbc.com and independent.co.uk→theindependent.com
    // pass while still dropping bad article IDs that land on a homepage.
    if (res.url && res.url !== url) {
      try {
        const origHost = new URL(url).hostname.toLowerCase();
        const finalUrl = new URL(res.url);
        const finalHost = finalUrl.hostname.toLowerCase();
        const h1 = origHost.replace(/^www\./, '');
        const h2 = finalHost.replace(/^www\./, '');
        const sameDomain = h1 === h2 || h1.endsWith('.' + h2) || h2.endsWith('.' + h1);
        if (!sameDomain) {
          // Cross-domain: permit only if destination is a trusted news domain
          // with a non-trivial article path.
          const destTrusted = newsUrlTrustedWithoutFetch(res.url);
          const destPath = finalUrl.pathname;
          const hasArticlePath = destPath !== '/' && destPath.length > 2;
          if (!destTrusted || !hasArticlePath) return false;
        }
      } catch {
        // URL parse error — assume valid
      }
    }
    return true;
  } catch {
    // Timeout or network error — assume valid
    return true;
  }
}

/**
 * News publisher domains we trust without a full validateUrl check.
 * Major news sites routinely block server-side HEAD/GET requests with
 * 403/429 even when the article is live, which caused ALL news items to
 * be dropped after every Gemini run. We still run a lenient HEAD check
 * (validateTrustedNewsUrl) that only drops on 404 / cross-domain redirect.
 */
const TRUSTED_NEWS_DOMAINS = [
  'bbc.co.uk',
  'bbc.com',
  'theguardian.com',
  'telegraph.co.uk',
  'thetimes.co.uk',
  'ft.com',
  'independent.co.uk',
  'theindependent.com',    // independent.co.uk migrated to this domain
  'the-independent.com',  // redirect alias seen in some URLs
  'dailymail.co.uk',
  'mirror.co.uk',
  'express.co.uk',
  'sun.co.uk',
  'thisismoney.co.uk',
  'which.co.uk',
  'moneysavingexpert.com',
  'solarpowerportal.co.uk',
  'theengineer.co.uk',
  'electricalreview.co.uk',
  'currentnews.co.uk',
  'energymonitor.ai',
  'rechargenews.com',
  'pv-tech.org',
  'pveurope.eu',
  'solarpowerworldonline.com',
  'electrek.co',
  'cleantechnica.com',
  'renewableenergyworld.com',
  'energydigital.com',
  'businessgreen.com',
  'edie.net',
  'energysavingtrust.org.uk',
  'gov.uk',
  'parliament.uk',
  'ofgem.gov.uk',
  'theiet.org',
  'electrical.theiet.org',
  'bsigroup.com',
  'reuters.com',
  'apnews.com',
  'bloomberg.com',
];

function newsUrlTrustedWithoutFetch(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TRUSTED_NEWS_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * Strip out news items whose sourceUrl doesn't resolve. URLs already
 * present in the grounding-metadata set are trusted without a network
 * call (they came directly from Google's search index, so they were
 * live as of seconds ago). Recognised news publisher domains are also
 * trusted without a fetch — they routinely block server HEAD requests.
 */
async function filterNewsBrokenLinks(
  parsed: PlugInSolarLiveData,
  groundingUris: Set<string>,
): Promise<{ kept: number; dropped: number }> {
  if (!Array.isArray(parsed.news) || parsed.news.length === 0) {
    return { kept: 0, dropped: 0 };
  }
  // Pre-filter URLs already confirmed broken in previous runs — no HEAD
  // request needed for these.
  const before = parsed.news.length;
  parsed.news = sanitisePlugInSolarNewsItems(parsed.news);
  if (parsed.news.length < before) {
    console.warn(
      `[plug-in-solar-uk] known-broken filter removed ${before - parsed.news.length} news item(s)`,
    );
  }
  if (parsed.news.length === 0) return { kept: 0, dropped: before };
  const checks = await Promise.all(
    parsed.news.map(async (item) => {
      const url = (item?.sourceUrl ?? '').trim();
      if (!url) return { item, valid: false };
      if (groundingUris.has(url.toLowerCase())) {
        return { item, valid: true };
      }
      if (newsUrlTrustedWithoutFetch(url)) {
        const valid = await validateTrustedNewsUrl(url);
        return { item, valid };
      }
      const valid = await validateUrl(url);
      return { item, valid };
    }),
  );
  const droppedItems = checks.filter((c) => !c.valid);
  for (const d of droppedItems) {
    console.warn(
      `[plug-in-solar-uk] dropping broken news link: ${d.item?.headline?.slice(0, 80)} -> ${d.item?.sourceUrl}`,
    );
  }
  parsed.news = checks.filter((c) => c.valid).map((c) => c.item);
  return { kept: parsed.news.length, dropped: droppedItems.length };
}

/**
 * Validate every retailer URL on every product. Drops broken retailer
 * entries; if a product is left with zero working retailers, drop the
 * product entirely. Mirrors the news validator.
 */
async function filterProductBrokenLinks(
  parsed: PlugInSolarLiveData,
  groundingUris: Set<string>,
): Promise<{ keptProducts: number; droppedProducts: number; droppedRetailers: number }> {
  if (!Array.isArray(parsed.products) || parsed.products.length === 0) {
    return { keptProducts: 0, droppedProducts: 0, droppedRetailers: 0 };
  }

  let droppedRetailers = 0;
  const productResults = await Promise.all(
    parsed.products.map(async (product: any) => {
      // Build a normalised retailers[] array, falling back to the
      // top-level url/retailer if Gemini didn't populate retailers[].
      const rawRetailers: any[] = Array.isArray(product?.retailers) && product.retailers.length
        ? product.retailers
        : product?.url && product?.retailer
        ? [{ retailer: product.retailer, url: product.url, priceGBP: product.priceGBP }]
        : [];

      const sanitisedRetailers = rawRetailers.map((r) => ({
        ...r,
        url: sanitiseRetailerProductUrl(String(r?.url ?? '').trim()),
      }));

      // De-duplicate by URL.
      const seen = new Set<string>();
      const unique = sanitisedRetailers.filter((r) => {
        const u = (r?.url ?? '').toLowerCase().trim();
        if (!u || seen.has(u)) return false;
        seen.add(u);
        return true;
      });

      // Validate concurrently.
      const validated = await Promise.all(
        unique.map(async (r) => {
          const u = (r?.url ?? '').trim();
          if (!u) return { entry: r, valid: false };
          if (groundingUris.has(u.toLowerCase())) {
            return { entry: r, valid: true };
          }
          if (retailerUrlTrustedWithoutFetch(u)) {
            return { entry: r, valid: true };
          }
          const valid = await validateUrl(u);
          return { entry: r, valid };
        }),
      );

      const goodRetailers = validated.filter((v) => v.valid).map((v) => v.entry);
      droppedRetailers += validated.length - goodRetailers.length;

      if (goodRetailers.length === 0) {
        console.warn(
          `[plug-in-solar-uk] dropping product with no working retailer URL: ${product?.brand} ${product?.model}`,
        );
        return null;
      }

      // Refresh top-level url / retailer / priceGBP from the first
      // working retailer, so SSR fallbacks always show a real link.
      const primary = goodRetailers[0];
      product.retailers = goodRetailers.map((r: any) => ({
        ...r,
        url: sanitiseRetailerProductUrl(String(r?.url ?? '').trim()),
      }));
      product.retailer = primary.retailer;
      product.url = sanitiseRetailerProductUrl(String(primary.url ?? '').trim());
      if (typeof primary.priceGBP === 'number' && Number.isFinite(primary.priceGBP)) {
        product.priceGBP = primary.priceGBP;
      }
      // Mirror primary retailer's stock onto the row when the model
      // didn't set a top-level value, so the headline row pill agrees
      // with the cheapest retailer link.
      if (!product.stock && typeof primary.stock === 'string') {
        product.stock = primary.stock;
      }
      return product;
    }),
  );

  const before = parsed.products.length;
  parsed.products = productResults.filter((p): p is NonNullable<typeof p> => p !== null);
  return {
    keptProducts: parsed.products.length,
    droppedProducts: before - parsed.products.length,
    droppedRetailers,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const skipCache = url.searchParams.get('nocache') === '1';

  const cacheKey = todayKey();

  if (!skipCache) {
    const cached = await getCached<PlugInSolarLiveData>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'GEMINI_API_KEY not configured',
        retryable: false,
      },
      { status: 503 },
    );
  }

  // Concurrency guard — the Gemini call routinely takes 2–5 minutes, and
  // during a cron-driven cache rollover dozens of visitors can fan in to
  // this route. Without a lock each visitor would fire its own Gemini
  // call (= cost + rate-limit risk + duplicate writes). We use a Redis
  // SET NX with a 6-minute TTL so only the first caller does the work;
  // every other caller falls through to the stale cache below.
  const refreshLockKey = `${CACHE_KEY_PREFIX}:refresh-lock-${CACHE_VERSION}`;
  const REFRESH_LOCK_TTL_SECONDS = 6 * 60;
  const acquired = await acquireLock(refreshLockKey, REFRESH_LOCK_TTL_SECONDS);
  if (!acquired) {
    // Another worker is already refreshing — serve the most recent
    // cached payload so the user doesn't wait behind a duplicate
    // Gemini call. page.tsx renders this as stale-cache (silent SWR).
    const stale = await readMostRecentCache();
    if (stale) {
      return NextResponse.json({ ...stale, source: 'stale-cache', message: 'Refresh in progress' });
    }
    return NextResponse.json(
      { error: 'Refresh in progress, no cache yet', retryable: true },
      { status: 503 },
    );
  }

  try {
    return await runRefresh(apiKey, cacheKey);
  } finally {
    // Release the lock as soon as the work is done so a manual `?nocache=1`
    // re-run can fire immediately. If we crash mid-flight the TTL will
    // expire it within 6 minutes.
    await releaseLock(refreshLockKey);
  }
}

async function runRefresh(apiKey: string, cacheKey: string): Promise<NextResponse> {
  // Use the most recent cached payload (today missed, so this will be
  // yesterday's at best) as the comparison baseline for the change log.
  const previous = await readMostRecentCache();

  const todayISO = new Date().toISOString().slice(0, 10);
  const prompt = buildPlugInSolarPrompt({ todayISO, previous });

  let parsed: PlugInSolarLiveData | null = null;
  let sources: GroundingSource[] = [];

  // Attempt 1: grounded (Google Search) call, parsing JSON from text.
  const grounded = await callGemini(apiKey, prompt, 'grounded');
  parsed = tryParse(grounded.text);
  if (parsed) sources = grounded.sources;

  // Attempt 2: structured output (no grounding) as a safety net if the
  // grounded model didn't return clean JSON.
  if (!parsed) {
    console.warn('[plug-in-solar-uk] grounded call failed JSON parse - retrying with structured output');
    const structured = await callGemini(apiKey, prompt, 'structured');
    parsed = tryParse(structured.text);
  }

  if (!parsed) {
    // Both attempts failed - serve stale cache if we have one
    if (previous) {
      return NextResponse.json(
        {
          ...previous,
          source: 'stale-cache',
          retryable: true,
          message: "Today's daily refresh failed - serving previous cache.",
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      {
        error: 'Gemini did not return valid JSON',
        retryable: true,
      },
      { status: 503 },
    );
  }

  // Inject grounding citations
  parsed.groundingSources = sources;
  parsed.generatedAt = new Date().toISOString();

  // Validate every news[].sourceUrl + every product retailers[].url.
  // Even with grounding, Gemini will occasionally invent plausible-
  // looking URLs (wrong path / merged hostname / dead article), so we
  // sanity-check each link via HEAD and drop any that don't resolve.
  // Grounding-metadata URLs are trusted without a fetch.
  const groundingUriSet = new Set(sources.map((s) => s.uri.toLowerCase()));
  try {
    const newsResult = await filterNewsBrokenLinks(parsed, groundingUriSet);
    if (newsResult.dropped > 0) {
      console.warn(
        `[plug-in-solar-uk] news url validation: kept ${newsResult.kept}, dropped ${newsResult.dropped}`,
      );
    }
  } catch (err) {
    console.warn('[plug-in-solar-uk] news url validation threw - keeping news as-is:', err);
  }
  try {
    const productResult = await filterProductBrokenLinks(parsed, groundingUriSet);
    if (productResult.droppedProducts > 0 || productResult.droppedRetailers > 0) {
      console.warn(
        `[plug-in-solar-uk] product url validation: kept ${productResult.keptProducts} products, dropped ${productResult.droppedProducts} products and ${productResult.droppedRetailers} retailer entries`,
      );
    }
  } catch (err) {
    console.warn('[plug-in-solar-uk] product url validation threw - keeping products as-is:', err);
  }

  // Merge in seed-product rows scraped from manufacturer JSON-LD.
  // Seed entries always win over Gemini guesses for the same brand —
  // their prices and stock state come from the live retailer page
  // rather than Gemini's grounding-metadata snapshot.
  try {
    const seedRows = await buildSeedProductRows();
    if (seedRows.length > 0) {
      // Suppress Gemini rows for any brand that the seed list covers.
      // Also handle common brand aliases (e.g. Gemini may call Lidl's
      // product "Parkside" since that's the actual product brand).
      const BRAND_ALIASES: Record<string, string> = {
        parkside: 'lidl',
        'lidl parkside': 'lidl',
      };
      const seededBrands = new Set(
        SEED_PRODUCTS.map((s) => s.brand.toLowerCase()),
      );
      const normaliseBrand = (b: string) => {
        const lc = b.toLowerCase();
        return BRAND_ALIASES[lc] ?? lc;
      };
      const geminiKept = (parsed.products || []).filter(
        (p: { brand?: string }) => !seededBrands.has(normaliseBrand(p.brand || '')),
      );
      parsed.products = [...seedRows, ...geminiKept];
      console.warn(
        `[plug-in-solar-uk] seed scrape: added ${seedRows.length} seed-derived rows, kept ${geminiKept.length} Gemini-discovered rows`,
      );
    } else {
      console.warn('[plug-in-solar-uk] seed scrape returned no rows; keeping Gemini products only');
    }
  } catch (err) {
    console.warn('[plug-in-solar-uk] seed scrape threw - keeping Gemini products only:', err);
  }

  // News fallback: the cron runs at 09:00 UTC, when Google Search's
  // grounding index is sometimes cold for the current day and Gemini
  // returns an empty `news` array (or one that gets fully stripped by
  // URL validation). If we end up with fewer than 3 news items but the
  // previous cache had usable news, splice the previous payload's news
  // in so the live page never shows the "News feed regenerating" empty
  // state for a whole day. Items older than 60 days are dropped.
  const MIN_NEWS_ITEMS = 3;
  const NEWS_FALLBACK_MAX_AGE_DAYS = 60;
  // Default: this run pulled fresh news.
  parsed.newsSource = 'fresh';
  parsed.newsGeneratedAt = parsed.generatedAt;
  if ((parsed.news?.length ?? 0) < MIN_NEWS_ITEMS && Array.isArray(previous?.news)) {
    const cutoff = Date.now() - NEWS_FALLBACK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const existingKeys = new Set(
      (parsed.news ?? []).map((n) => `${n.date}|${n.headline}`.toLowerCase()),
    );
    const fallbackItems = (previous?.news ?? []).filter((n) => {
      const t = Date.parse(`${n.date}T00:00:00Z`);
      if (!Number.isFinite(t) || t < cutoff) return false;
      return !existingKeys.has(`${n.date}|${n.headline}`.toLowerCase());
    });
    if (fallbackItems.length > 0) {
      const before = parsed.news?.length ?? 0;
      parsed.news = [...(parsed.news ?? []), ...fallbackItems].slice(0, 10);
      // Mark this payload's news as a fallback and carry through the
      // original generation timestamp from the previous payload so the
      // pill on the page reflects when the news was actually pulled.
      parsed.newsSource = 'fallback';
      parsed.newsGeneratedAt = previous?.newsGeneratedAt ?? previous?.generatedAt ?? parsed.generatedAt;
      console.warn(
        `[plug-in-solar-uk] news fallback: fresh run returned ${before} items, spliced in ${parsed.news.length - before} from previous cache`,
      );
    }
  }

  // Merge static seed news items — hand-verified URLs for key milestones.
  // Seeds are added only when not already present (deduped by date + headline)
  // and appended so Gemini's version takes precedence in the sorted list.
  try {
    if (SEED_NEWS_ITEMS.length > 0) {
      const existingKeys = new Set(
        (parsed.news ?? []).map((n) => `${n.date}|${n.headline}`.toLowerCase()),
      );
      const newSeeds = SEED_NEWS_ITEMS.filter(
        (n) => !existingKeys.has(`${n.date}|${n.headline}`.toLowerCase()),
      );
      if (newSeeds.length > 0) {
        parsed.news = [...(parsed.news ?? []), ...newSeeds].sort((a, b) =>
          b.date.localeCompare(a.date),
        );
        console.log(
          `[plug-in-solar-uk] seed news: merged ${newSeeds.length} item(s) (total now ${parsed.news.length})`,
        );
      }
    }
  } catch (err) {
    console.warn('[plug-in-solar-uk] seed news merge threw:', err);
  }

  // Cache for 24 hours and tell Next.js to invalidate the SSR HTML +
  // the dynamically-generated OG / social-card images.
  await setDailyTerm(cacheKey, parsed);
  try {
    revalidatePath('/plug-in-solar-uk');
    revalidatePath('/plug-in-solar-uk/opengraph-image');
    revalidatePath('/plug-in-solar-uk/twitter-image');
    revalidatePath('/plug-in-solar-uk/embed/status');
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ...parsed, source: 'fresh' });
}
