const VERSION = 'v3';

export function getRankingsAnalysisCacheKey(cacheMonth: string | null | undefined): string | null {
  if (!cacheMonth) return null;
  return `climate:rankings-analysis:${cacheMonth}-${VERSION}`;
}