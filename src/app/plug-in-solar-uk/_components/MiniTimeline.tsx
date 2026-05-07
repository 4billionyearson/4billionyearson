import { CheckCircle2, Clock } from 'lucide-react';
import { HERO_TIMELINE } from '../_data/static';

/**
 * Compact horizontal timeline used in the top hero verdict block.
 * Server-rendered: today's marker is computed at request time.
 * Renders as a horizontal strip on desktop, scroll-snap on small screens.
 */
export function MiniTimeline() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const today = new Date(todayISO).getTime();
  const dates = HERO_TIMELINE.map((t) => new Date(t.date).getTime());
  const min = Math.min(...dates, today);
  const max = Math.max(...dates, today);
  const span = Math.max(max - min, 1);
  const todayPct = ((today - min) / span) * 100;

  return (
    <div className="rounded-xl border border-[#D2E369]/30 bg-gray-950/80 p-3 md:p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#D2E369]">
          UK regulation timeline
        </h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
          past → future
        </span>
      </div>

      {/* Desktop: horizontal track with proportional positioning */}
      <div className="relative hidden md:block h-24">
        <div className="absolute left-0 right-0 top-9 h-[2px] bg-gradient-to-r from-emerald-500/60 via-[#D2E369] to-sky-500/60 rounded-full" />
        <div
          className="absolute top-7 h-6 w-[3px] bg-[#D2E369] rounded-full shadow-[0_0_12px_rgba(210,227,105,0.8)]"
          style={{ left: `calc(${todayPct}% - 1.5px)` }}
          aria-label="Today"
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#D2E369] whitespace-nowrap">
            Today
          </div>
        </div>
        {HERO_TIMELINE.map((t) => {
          const pct = ((new Date(t.date).getTime() - min) / span) * 100;
          const isPast = t.date <= todayISO;
          return (
            <div
              key={t.date + t.label}
              className="absolute flex flex-col items-center"
              style={{ left: `calc(${pct}% - 60px)`, width: 120, top: 0 }}
            >
              <div
                className={
                  'mt-7 h-4 w-4 rounded-full border-2 grid place-items-center ' +
                  (isPast
                    ? 'bg-emerald-500 border-emerald-300'
                    : 'bg-gray-900 border-sky-400')
                }
              >
                {isPast ? (
                  <CheckCircle2 className="h-3 w-3 text-white" />
                ) : (
                  <Clock className="h-2.5 w-2.5 text-sky-300" />
                )}
              </div>
              <div
                className={
                  'mt-1 text-[10px] font-mono uppercase tracking-wider text-center ' +
                  (isPast ? 'text-emerald-300' : 'text-sky-300')
                }
              >
                {formatShort(t.date)}
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-center text-[#FFF5E7] leading-tight">
                {t.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: horizontal scroll strip */}
      <div className="md:hidden -mx-3 px-3 overflow-x-auto scrollbar-thin">
        <ol className="flex gap-2 min-w-max pb-1">
          {HERO_TIMELINE.map((t) => {
            const isPast = t.date <= todayISO;
            return (
              <li
                key={t.date + t.label}
                className={
                  'min-w-[140px] rounded-lg border px-3 py-2 ' +
                  (isPast
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-sky-500/10 border-sky-500/40')
                }
              >
                <div className="flex items-center gap-1.5">
                  {isPast ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                  ) : (
                    <Clock className="h-3 w-3 text-sky-300" />
                  )}
                  <span
                    className={
                      'text-[10px] font-mono uppercase tracking-wider ' +
                      (isPast ? 'text-emerald-300' : 'text-sky-300')
                    }
                  >
                    {formatShort(t.date)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs font-medium text-[#FFF5E7] leading-tight">
                  {t.label}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function formatShort(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return iso;
  }
}
