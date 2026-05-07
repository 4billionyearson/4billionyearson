/**
 * Retailer URL helpers for the UK Plug-in Solar guide.
 *
 *  - `sanitiseRetailerProductUrl` rewrites known-bad URLs to the right
 *    target (e.g. EcoFlow's old slug → the live STREAM Balcony product
 *    page; the "homepage" hand-back → the same canonical product page).
 *  - `buildAmazonUkSearchFallback` builds a per-product Amazon UK search
 *    URL we use when Gemini hasn't been able to verify a real `/dp/...`
 *    listing for that kit, so the row always has at least one shoppable
 *    link.
 */

import { applyAmazonAffiliateTag } from '@/lib/amazon';
import type { RetailerLink } from './types';

export const ECOFLOW_UK_STORE_ROOT = 'https://uk.ecoflow.com';

/**
 * Canonical UK product URL for the EcoFlow STREAM Balcony Solar System.
 * Verified live in May 2026 (the kit can be marked out-of-stock at the
 * variant level — that is a separate stock-status concern, the URL itself
 * resolves and lists the product). Update if EcoFlow re-slugs.
 */
export const ECOFLOW_STREAM_BALCONY_URL =
  'https://uk.ecoflow.com/products/stream-balcony-solar-system';

const ECOFLOW_KNOWN_BAD_PATHS = new Set<string>([
  '/products/ecoflow-balcony-solar-system',
  '/products/balcony-solar-system',
  '/products/ecoflow-stream-balcony-solar-system',
]);

export function sanitiseRetailerProductUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return u;
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== 'uk.ecoflow.com') return u;

  const path = (parsed.pathname.replace(/\/$/, '') || '/').toLowerCase();
  // Old / wrong slugs → canonical STREAM Balcony product page (preserve
  // any ?variant= the model already supplied).
  if (ECOFLOW_KNOWN_BAD_PATHS.has(path)) {
    const variant = parsed.searchParams.get('variant');
    return variant
      ? `${ECOFLOW_STREAM_BALCONY_URL}?variant=${encodeURIComponent(variant)}`
      : ECOFLOW_STREAM_BALCONY_URL;
  }
  // Bare homepage → canonical STREAM Balcony product page (the
  // "EcoFlow STREAM Balcony" row would otherwise dump visitors on the
  // generic store home).
  if (path === '/' || path === '') {
    return ECOFLOW_STREAM_BALCONY_URL;
  }
  return u;
}

/**
 * True if the URL is an Amazon product page worth treating as a verified
 * listing (i.e. has /dp/ or /gp/product/ in the path). Search URLs and
 * category pages don't count — use the `isFallback: true` flag for those.
 */
export function isAmazonProductPageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes('amazon.')) return false;
    const p = u.pathname.toLowerCase();
    return p.includes('/dp/') || p.includes('/gp/product/');
  } catch {
    return false;
  }
}

/**
 * Build a tagged Amazon UK search URL for a kit. We use this as a
 * fallback retailer link when Gemini has not verified a real Amazon
 * product page for the kit — at least the row stays shoppable and the
 * outbound click still earns the same Associates fee as a `/dp/` link.
 */
export function buildAmazonUkSearchFallback(
  brand: string,
  model: string,
): RetailerLink {
  const query = `${brand} ${model}`.replace(/\s+/g, ' ').trim();
  const baseUrl = `https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}`;
  // Apply the same UK Associates tag the book pages use.
  const url = applyAmazonAffiliateTag(baseUrl, 'GB');
  return {
    retailer: 'Amazon UK',
    url,
    affiliate: true,
    isFallback: true,
  };
}
