import { CheckCircle2, Clock } from 'lucide-react';
import { HERO_TIMELINE } from '../_data/static';

/**
 * Compact horizontal timeline used in the top hero verdict block.
 * Server-rendered: today's marker is computed at request time.
 *
 * Implementation notes:
 *  - Track is positioned within an inner padded zone (PAD px on each side)
 *    so the leftmost / rightmost label can't escape the rounded box.
 *  - Adjacent labels alternate above and below the line so even closely-
 *    spaced milestones don't overlap each other.
 *  - On small screens the track collapses to a horizontal scroll strip
 *    of pill cards.
 */
const PAD_PX = 70; // horizontal inset for the leftmost / rightmost dot

export function MiniTimeline() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const today = new Date(todayISO).getTime();
  const dates = HERO_TIMELINE.map((t) => new Date(t.date).getTime());
  const min = Math.min(...dates, today);
  const max = Math.max(...dates, today);
  const span = Math.max(max - min, 1);
  const todayPct = ((today - min) / span) * 100;

  /** Map a 0-100 % position to an absolute-left CSS calc that keeps the
   *  point inside the padded inner zone. */
  const insetLeft = (pct: number) =>
    `calc(${PAD_PX}px + (${pct} / 100) * (100% - ${2 * PAD_PX}px))`;

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

      {/* Desktop: horizontal track with proportional positioning + alternating labels */}
      <div className="relative hidden md:block" style={{ height: 140 }}>
        {/* The line */}
        <div
          className="absolute h-[2px] bg-gradient-to-r from-emerald-500/60 via-[#D2E369] to-sky-500/60 rounded-full"
          style={{ left: PAD_PX, right: PAD_PX, top: 70 }}
        />

        {/* Today marker */}
        <div
          className="absolute h-7 w-[3px] bg-[#D2E369] rounded-full shadow-[0_0_12px_rgba(210,227,105,0.8)]"
          style={{ top: 57, left: insetLeft(todayPct), transform: 'translateX(-50%)' }}
          aria-label="Today"
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#D2E369] whitespace-nowrap">
            Today
          </div>
        </div>

        {HERO_TIMELINE.map((t, i) => {
          const pct = ((new Date(t.date).getTime() - min) / span) * 100;
          const isPast = t.date <= todayISO;
          // alternate labels above the line (even index) / below (odd index)
          const above = i % 2 === 0;
          return (
            <div
              key={t.date + t.label}
              className="absolute"
              style={{ left: insetLeft(pct), top: 0, width: 0 }}
            >
              {/* Dot */}
              <div
                className={
                  'absolute h-4 w-4 rounded-full border-2 grid place-items-center ' +
                  (isPast
                    ? 'bg-emerald-500 border-emerald-300'
                    : 'bg-gray-900 border-sky-400')
                }
                style={{ top: 62, left: 0, transform: 'translateX(-50%)' }}
              >
                {isPast ? (
                  <CheckCircle2 className="h-3 w-3 text-white" />
                ) : (
                  <Clock className="h-2.5 w-2.5 text-sky-300" />
                )}
              </div>

              {/* Tiny tick joining label block to the line */}
              <div
                className={
                  'absolute w-px ' + (isPast ? 'bg-emerald-500/50' : 'bg-sky-500/50')
                }
                style={
                  above
                    ? { top: 48, left: 0, transform: 'translateX(-50%)', height: 14 }
                    : { top: 78, left: 0, transform: 'translateX(-50%)', height: 14 }
                }
              />

              {/* Alternating label */}
              <div
                className={`absolute text-center ${above ? '' : ''}`}
                style={{
                  width: 130,
                  left: 0,
                  transform: 'translateX(-50%)',
                  top: above ? 4 : 92,
                }}
              >
                <div
                  className={
                    'text-[10px] font-mono uppercase tracking-wider ' +
                    (isPast ? 'text-emerald-300' : 'text-sky-300')
                  }
                >
                  {formatShort(t.date)}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-[#FFF5E7] leading-tight">
                  {t.label}
                </div>
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
