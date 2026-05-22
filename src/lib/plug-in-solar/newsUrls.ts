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
  // Gemini-hallucinated URLs on trusted domains — Guardian returns 404,
  // Independent redirects to an unrelated article (b2756347 football).
  'https://www.theguardian.com/money/2026/may/19/energy-bills-to-rise-by-209-a-year-to-1850-from-july-forecaster-says',
  'https://www.independent.co.uk/climate-change/news/lidl-iceland-plug-in-solar-panels-500-b2756034.html',
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

/**
 * Static seed news items — hand-verified URLs for key milestones.
 * Merged into the live payload after URL validation so the news feed
 * always contains the major events even when Gemini's grounding index
 * is cold or all other generated links are hallucinated.
 * Deduplication is by (date + lowercased headline) so Gemini's own
 * version takes priority if present.
 */
export const SEED_NEWS_ITEMS: NewsItem[] = [
  {
    date: '2026-03-16',
    headline: "Government to make 'plug-in solar' available within months",
    summary:
      'The UK government announced plans to legalise plug-in solar panels for homes, naming EcoFlow, Lidl and Iceland as delivery partners and citing savings of £70–£175 per year.',
    sourceTitle: 'GOV.UK – DESNZ',
    sourceUrl:
      'https://www.gov.uk/government/news/government-to-make-plug-in-solar-available-within-months',
  },
  {
    date: '2026-04-15',
    headline: 'BS 7671 Amendment 4 published — plug-in solar now legal in UK wiring regulations',
    summary:
      'The IET and BSI published Amendment 4 to BS 7671:2018, creating the regulatory framework for sub-800 W plug-in solar. A two-year transition period runs to October 2026.',
    sourceTitle: 'IET – BS 7671',
    sourceUrl: 'https://electrical.theiet.org/bs-7671/',
  },
];