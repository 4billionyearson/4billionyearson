/**
 * Fix retailer URLs that Gemini often hallucinates but that 404 on the live site.
 * Prefer a safe store root over a dead product path.
 */
export const ECOFLOW_UK_STORE_ROOT = 'https://uk.ecoflow.com';

export function sanitiseRetailerProductUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    const path = (parsed.pathname.replace(/\/$/, '') || '/').toLowerCase();
    if (host === 'uk.ecoflow.com' && path === '/products/ecoflow-balcony-solar-system') {
      return ECOFLOW_UK_STORE_ROOT;
    }
  } catch {
    return u;
  }
  return u;
}
