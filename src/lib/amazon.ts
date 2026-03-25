import { headers } from "next/headers";

const AFFILIATE_TAG = "idcrnoimamanu-21";

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

/* Countries where the UK affiliate tag earns commission */
const UK_TAG_COUNTRIES = new Set(["GB", "IE"]);

/**
 * Detect the visitor's country from Vercel geo headers.
 * Falls back to GB (UK) if unavailable (e.g. local dev).
 */
export async function getCountryCode(): Promise<string> {
  const h = await headers();
  return h.get("x-vercel-ip-country") ?? "GB";
}

/**
 * Build an Amazon search URL for the visitor's local store.
 * Affiliate tag is only appended for UK visitors.
 */
export function amazonUrl(
  title: string,
  author: string,
  countryCode: string,
): string {
  const domain = AMAZON_DOMAINS[countryCode] ?? "www.amazon.co.uk";
  const q = encodeURIComponent(`${title} ${author}`);
  const tag = UK_TAG_COUNTRIES.has(countryCode)
    ? `&tag=${AFFILIATE_TAG}`
    : "";
  return `https://${domain}/s?k=${q}&i=stripbooks${tag}`;
}
