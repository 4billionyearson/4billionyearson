import { headers } from "next/headers";

const AFFILIATE_TAGS: Record<string, string> = {
  UK: "idcrnoimamanu-21",
  US: "4billionyears-20",
};

/* Map country codes to Amazon domains */
const AMAZON_DOMAINS: Record<string, string> = {
  US: "www.amazon.com",
  GB: "www.amazon.co.uk",
  DE: "www.amazon.de",
  FR: "www.amazon.fr",
  ES: "www.amazon.es",
  IT: "www.amazon.it",
  NL: "www.amazon.nl",
  SE: "www.amazon.se",
  PL: "www.amazon.pl",
  BE: "www.amazon.com.be",
  CA: "www.amazon.ca",
  AU: "www.amazon.com.au",
  IN: "www.amazon.in",
  JP: "www.amazon.co.jp",
  BR: "www.amazon.com.br",
  MX: "www.amazon.com.mx",
  SG: "www.amazon.sg",
  AE: "www.amazon.ae",
  SA: "www.amazon.sa",
  IE: "www.amazon.co.uk", // Ireland → UK store
};

/* Map country codes to affiliate program */
const COUNTRY_AFFILIATE: Record<string, string> = {
  GB: "UK",
  IE: "UK",
  US: "US",
};

/**
 * Detect the visitor's country from Vercel geo headers.
 * Falls back to GB (UK) if unavailable (e.g. local dev).
 */
export async function getCountryCode(): Promise<string> {
  const h = await headers();
  return h.get("x-vercel-ip-country") ?? "GB";
}

/**
 * Amazon **search** URL (not category-restricted) with Associates tag for UK/US/IE.
 * Used when we want a safe affiliate link without synthesising a product-detail path.
 */
export function amazonProductSearchUrl(query: string, countryCode: string): string {
  const domain = AMAZON_DOMAINS[countryCode] ?? "www.amazon.co.uk";
  const k = encodeURIComponent(query.trim());
  const program = COUNTRY_AFFILIATE[countryCode];
  const tag = program ? `&tag=${encodeURIComponent(AFFILIATE_TAGS[program])}` : "";
  return `https://${domain}/s?k=${k}${tag}`;
}

/**
 * Build an Amazon search URL for the visitor's local store.
 * Affiliate tag is appended for UK/IE and US visitors.
 */
export function amazonUrl(
  title: string,
  author: string,
  countryCode: string,
): string {
  const domain = AMAZON_DOMAINS[countryCode] ?? "www.amazon.co.uk";
  const q = encodeURIComponent(`${title} ${author}`);
  const program = COUNTRY_AFFILIATE[countryCode];
  const tag = program ? `&tag=${AFFILIATE_TAGS[program]}` : "";
  return `https://${domain}/s?k=${q}&i=stripbooks${tag}`;
}

/**
 * Product / shop URLs on amazon.* domains — eligible for the same Associates
 * tags as our book pages (UK + US programs only).
 */
export function isAmazonAssociatesEligibleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (!h.includes("amazon.")) return false;
    if (h.includes("amazon-adsystem") || h.includes("amazonpay") || h.includes("advertising")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Associates tag for this visitor country, or null if we do not run a program there. */
export function amazonAssociateTagForCountry(countryCode: string): string | null {
  const program = COUNTRY_AFFILIATE[countryCode];
  return program ? AFFILIATE_TAGS[program] : null;
}

/**
 * Set the Amazon `tag` query parameter to our Associates ID (same IDs as the
 * book pages). Non-Amazon URLs and countries without a configured program
 * are returned unchanged.
 */
export function applyAmazonAffiliateTag(url: string, countryCode: string): string {
  const tag = amazonAssociateTagForCountry(countryCode);
  if (!tag || !isAmazonAssociatesEligibleUrl(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return url;
  }
}
