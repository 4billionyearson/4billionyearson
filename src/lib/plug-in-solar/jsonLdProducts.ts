/**
 * Fetch a manufacturer product page, extract its `application/ld+json`
 * blocks and return a normalised list of variant offers (price, stock,
 * URL) for the Product / ProductGroup nodes found inside.
 *
 * Used by the daily plug-in-solar refresh to ground EcoFlow (and other
 * supported brands) prices and stock state with the actual retailer
 * page rather than relying on Gemini's grounding-metadata guess, which
 * frequently lags flash sales and stock changes.
 *
 * Two schema shapes are seen in the wild:
 *   1) ProductGroup with `hasVariant[Product]`, each variant carrying
 *      its own `offers` object. (e.g. uk.ecoflow.com /products/...)
 *   2) Product with `offers[]` array, each Offer being a SKU.
 *      (e.g. uk.ecoflow.com /pages/...)
 * Both are handled by `extractOffers()`.
 */

export interface JsonLdOffer {
  /** Variant SKU as published in the JSON-LD (often brand-specific). */
  sku: string;
  /** Variant display name (e.g. "STREAM Microinverter + 2 × 400 W panels"). */
  name: string;
  /** Price in GBP (number, never null if availability resolves). */
  priceGBP: number;
  /** Normalised availability tag. */
  availability: 'in-stock' | 'out-of-stock' | 'pre-order' | 'unknown';
  /** Direct deep-link to the variant on the retailer page. */
  url: string;
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Fetch a product page and return all variant offers found in its
 * JSON-LD. Returns an empty array on any error — callers should treat
 * a failed scrape as "no data" rather than crashing the daily refresh.
 */
export async function fetchJsonLdOffers(pageUrl: string): Promise<JsonLdOffer[]> {
  let html: string;
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      // 8 s is plenty for a single Shopify HTML response and keeps us
      // well inside Vercel's 60 s function budget even when scraping
      // several pages in parallel.
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn(`[jsonLdOffers] ${pageUrl} returned HTTP ${res.status}`);
      return [];
    }
    html = await res.text();
  } catch (err) {
    console.warn(`[jsonLdOffers] fetch failed for ${pageUrl}:`, err);
    return [];
  }

  const blocks = extractJsonLdBlocks(html);
  const offers: JsonLdOffer[] = [];
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }
    walkForProductNodes(parsed, (node) => {
      offers.push(...extractOffers(node, pageUrl));
    });
  }

  // De-dupe by SKU (Shopify sometimes emits the same variant twice when
  // multiple JSON-LD blocks appear on a page).
  const seen = new Set<string>();
  return offers.filter((o) => {
    if (seen.has(o.sku)) return false;
    seen.add(o.sku);
    return true;
  });
}

/** Pull out every `<script type="application/ld+json">…</script>` body. */
function extractJsonLdBlocks(html: string): string[] {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** Recursively visit every node in a JSON-LD graph and call `cb` for
 *  any Product / ProductGroup we encounter (handles `@graph` arrays,
 *  nested arrays, and `@type` arrays). */
function walkForProductNodes(node: unknown, cb: (n: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => walkForProductNodes(n, cb));
    return;
  }
  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  const isProduct =
    type === 'Product' ||
    type === 'ProductGroup' ||
    (Array.isArray(type) && (type.includes('Product') || type.includes('ProductGroup')));
  if (isProduct) cb(obj);
  if (Array.isArray(obj['@graph'])) walkForProductNodes(obj['@graph'], cb);
  if (Array.isArray(obj.hasVariant)) walkForProductNodes(obj.hasVariant, cb);
}

/** Pull every Offer out of a Product / ProductGroup node, regardless
 *  of which schema shape the page used. */
function extractOffers(node: Record<string, unknown>, pageUrl: string): JsonLdOffer[] {
  const out: JsonLdOffer[] = [];
  const productName = (node.name as string) || '';

  // Shape 1 — ProductGroup: variants in `hasVariant`, each with its
  //          own `offers` object.
  if (Array.isArray(node.hasVariant)) {
    for (const variant of node.hasVariant as Array<Record<string, unknown>>) {
      const offer = extractSingleOffer(variant.offers, pageUrl, (variant.name as string) || productName, variant.sku as string | undefined);
      if (offer) out.push(offer);
    }
    return out;
  }

  // Shape 2 — Product with `offers[]` array (each entry a SKU).
  if (Array.isArray(node.offers)) {
    for (const offer of node.offers as Array<Record<string, unknown>>) {
      const o = extractSingleOffer(offer, pageUrl, productName, offer.sku as string | undefined);
      if (o) out.push(o);
    }
    return out;
  }

  // Shape 3 — Product with single `offers` object.
  const single = extractSingleOffer(node.offers, pageUrl, productName, node.sku as string | undefined);
  if (single) out.push(single);
  return out;
}

function extractSingleOffer(
  rawOffer: unknown,
  pageUrl: string,
  fallbackName: string,
  fallbackSku: string | undefined,
): JsonLdOffer | null {
  if (!rawOffer || typeof rawOffer !== 'object') return null;
  const offer = rawOffer as Record<string, unknown>;

  // Price can live on `offer.price` directly or inside a
  // `priceSpecification` array (Shopify uses the latter for its
  // RegularPrice / StrikethroughPrice pair — we always want the
  // first non-strikethrough entry, which is the live price).
  let price: number | null = null;
  if (typeof offer.price === 'number') price = offer.price;
  else if (typeof offer.price === 'string') price = parseFloat(offer.price) || null;
  if (price == null && Array.isArray(offer.priceSpecification)) {
    for (const ps of offer.priceSpecification as Array<Record<string, unknown>>) {
      const isStrikethrough =
        typeof ps.priceType === 'string' && ps.priceType.includes('Strikethrough');
      if (isStrikethrough) continue;
      if (typeof ps.price === 'number') {
        price = ps.price;
        break;
      }
      if (typeof ps.price === 'string') {
        price = parseFloat(ps.price);
        break;
      }
    }
  }
  if (price == null || !Number.isFinite(price) || price <= 0) return null;

  const sku = (offer.sku as string | undefined) || fallbackSku || '';
  const url = (offer.url as string | undefined) || pageUrl;
  return {
    sku,
    name: fallbackName,
    priceGBP: price,
    availability: normaliseAvailability(offer.availability),
    url,
  };
}

function normaliseAvailability(raw: unknown): JsonLdOffer['availability'] {
  if (typeof raw !== 'string') return 'unknown';
  const v = raw.toLowerCase();
  if (v.includes('outofstock') || v.includes('soldout')) return 'out-of-stock';
  if (v.includes('preorder') || v.includes('preordering')) return 'pre-order';
  if (v.includes('instock') || v.includes('limitedavailability') || v.includes('onlineonly'))
    return 'in-stock';
  return 'unknown';
}
