'use client';

import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Shown only on a true cold start — when neither today's cache nor any
 * recent stale-cache fallback is available. In that case the page would
 * otherwise be blank, so we show a clear "first-time generation" notice
 * and an explicit reload button.
 *
 * In the normal stale-while-revalidate flow (today's cache miss but a
 * previous-day fallback exists), PlugInSolarGuide renders the full page
 * silently using the stale payload and this notice is NOT shown — the
 * tiny LastUpdatedBadge in the hero is enough.
 */
export function DailyRefreshNotice({
  cacheMiss,
  hasPayload,
  source,
}: {
  cacheMiss: boolean;
  hasPayload: boolean;
  /** `no-cache` | `stale-cache` from page.tsx */
  source: string;
}) {
  if (!cacheMiss) return null;

  const empty = !hasPayload || source === 'no-cache';

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        'rounded-xl border-2 p-4 flex flex-col sm:flex-row sm:items-center gap-4 ' +
        (empty ? 'border-orange-400/70 bg-orange-500/15' : 'border-[#D2E369]/50 bg-[#D2E369]/10')
      }
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Loader2
          className={`h-6 w-6 shrink-0 animate-spin ${empty ? 'text-orange-200' : 'text-[#D2E369]'}`}
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className={`text-sm font-semibold ${empty ? 'text-orange-50' : 'text-[#FFF5E7]'}`}>
            {empty
              ? "Generating today's UK plug-in solar briefing"
              : 'Showing the most recent saved data'}
          </p>
          <p className={`text-sm leading-relaxed ${empty ? 'text-orange-100/90' : 'text-gray-300'}`}>
            {empty
              ? "This is the first request since the cache rolled over. We re-research the regulations, products and prices against primary UK sources — it usually takes 2–5 minutes. Try reloading shortly."
              : 'A fresh update is running in the background. Reload in a few minutes if anything looks out of date.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#D2E369] bg-[#D2E369]/15 px-4 py-2.5 text-sm font-semibold text-[#D2E369] hover:bg-[#D2E369]/25 transition-colors shrink-0"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Reload
      </button>
    </div>
  );
}
