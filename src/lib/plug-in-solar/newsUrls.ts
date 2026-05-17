import type { NewsItem, PlugInSolarLiveData } from './types';

function normaliseNewsUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${pathname}`.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, '').toLowerCase();
  }
}

// These URLs were verified live as broken in May 2026. Keep the list
// narrow and explicit so cached payloads can be cleaned immediately
// after deploy without risking collateral drops.
const KNOWN_BROKEN_NEWS_SOURCE_URLS = new Set([
  'https://www.which.co.uk/news/article/plug-in-solar-panels-to-be-made-legal-in-uk-homes-axq0m9l3r1a7',
  'https://electrical.theiet.org/media/press-releases/2026/15-april-2026-iet-bsi-officially-publish-amendment-4-2026-to-bs-7671-2018-iet-wiring-regulations',
]);

export function isKnownBrokenPlugInSolarNewsUrl(url: string): boolean {
  return KNOWN_BROKEN_NEWS_SOURCE_URLS.has(normaliseNewsUrl(url));
}

export function sanitisePlugInSolarNewsItems(items: NewsItem[] | undefined): NewsItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items.filter((item) => !isKnownBrokenPlugInSolarNewsUrl(item?.sourceUrl ?? ''));
}

export function sanitisePlugInSolarPayload(data: PlugInSolarLiveData | null): PlugInSolarLiveData | null {
  if (!data) return null;
  const news = sanitisePlugInSolarNewsItems(data.news);
  return news.length === data.news.length ? data : { ...data, news };
}