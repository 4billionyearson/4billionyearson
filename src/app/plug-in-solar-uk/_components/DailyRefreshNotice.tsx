'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

const COUNTDOWN_START = 45;

/**
 * Shown when today's Redis key missed and the page fired a background warm-up.
 * Stale or empty payloads can make pills and prices look wrong until refresh — this
 * sets expectations and offers an explicit reload.
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
  const [seconds, setSeconds] = useState(COUNTDOWN_START);

  useEffect(() => {
    if (!cacheMiss) return;
    setSeconds(COUNTDOWN_START);
    const id = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cacheMiss]);

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
            {empty ? "Today's update is still being generated" : "Using the latest saved briefing while today's run finishes"}
          </p>
          <p className={`text-sm leading-relaxed ${empty ? 'text-orange-100/90' : 'text-gray-300'}`}>
            {empty
              ? 'Live status pills, prices and product links appear after the first successful refresh (often under a minute). You can wait or reload now.'
              : 'Figures may shift slightly when fresh data lands. If something looks out of date, reload in a few seconds.'}
          </p>
          <p className="text-xs font-mono text-gray-500">Tip: try again in {seconds}s or use Refresh</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#D2E369] bg-[#D2E369]/15 px-4 py-2.5 text-sm font-semibold text-[#D2E369] hover:bg-[#D2E369]/25 transition-colors shrink-0"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Refresh page
      </button>
    </div>
  );
}
