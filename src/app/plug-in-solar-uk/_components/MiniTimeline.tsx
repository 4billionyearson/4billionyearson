import { CheckCircle2, Clock, Star, CalendarCheck } from 'lucide-react';
import type { FullyAvailableEstimate } from '@/lib/plug-in-solar/types';
import { HERO_TIMELINE, FULLY_AVAILABLE_FALLBACK } from '../_data/static';

/**
 * Compact horizontal timeline used in the "Today's 10-second update"
 * panel. Server-rendered: today's marker is computed at request time.
 *
 * Implementation notes:
 *  - A prominent "fully legal & in shops" callout pill is rendered above
 *    the track with the AI-derived date. Its dot on the timeline is
 *    star-styled and lime so it stands out from the regular milestones.
 *  - Track is positioned within an inner padded zone (PAD px on each
 *    side) so the leftmost / rightmost label can't escape the rounded
 *    box.
 *  - Adjacent labels alternate above and below the line so even
 *    closely-spaced milestones don't overlap each other.
 *  - On small screens the track collapses to a horizontal scroll strip
 *    of pill cards.
 */
const PAD_PX = 70; // horizontal inset for the leftmost / rightmost dot

export function MiniTimeline({
  fullyAvailable,
}: {
  fullyAvailable?: FullyAvailableEstimate;
}) {
  // Defensive: if Gemini handed us a non-ISO date (e.g. "around July 2026")
  // the math below collapses to NaN and the layout breaks. Fall back to
  // the static estimate in that case.
  const fa = isValidIso(fullyAvailable?.date)
    ? (fullyAvailable as FullyAvailableEstimate)
    : FULLY_AVAILABLE_FALLBACK;
  const todayISO = new Date().toISOString().slice(0, 10);
  const today = new Date(todayISO).getTime();

  // Merge the static milestones with the AI-supplied "fully available" entry.
  // We mark it with __available__ so the renderer can style it specially.
  type Entry = { date: string; label: string; kind: 'past' | 'future' | 'available' };
  const merged: Entry[] = [
    ...HERO_TIMELINE,
    { date: fa.date, label: fa.label, kind: 'available' as const },
  ].sort((a, b) => a.date.localeCompare(b.date));

  const dates = merged.map((t) => new Date(t.date).getTime());
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
      {/* Headline callout pill - the answer to "when can I just buy one?" */}
      <FullyAvailableCallout fa={fa} todayISO={todayISO} />

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

        {merged.map((t, i) => {
          const pct = ((new Date(t.date).getTime() - min) / span) * 100;
          const isPast = t.kind !== 'available' && t.date <= todayISO;
          const isAvailable = t.kind === 'available';
          // alternate labels above the line (even index) / below (odd index)
          const above = i % 2 === 0;
          return (
            <div
              key={t.date + t.label + i}
              className="absolute"
              style={{ left: insetLeft(pct), top: 0, width: 0 }}
            >
              {/* Dot */}
              <div
                className={
                  'absolute rounded-full border-2 grid place-items-center ' +
                  (isAvailable
                    ? 'h-5 w-5 bg-[#D2E369] border-[#D2E369] shadow-[0_0_10px_rgba(210,227,105,0.7)]'
                    : isPast
                    ? 'h-4 w-4 bg-emerald-500 border-emerald-300'
                    : 'h-4 w-4 bg-gray-900 border-sky-400')
                }
                style={{ top: isAvailable ? 60 : 62, left: 0, transform: 'translateX(-50%)' }}
              >
                {isAvailable ? (
                  <Star className="h-3 w-3 text-[#2C5263] fill-[#2C5263]" />
                ) : isPast ? (
                  <CheckCircle2 className="h-3 w-3 text-white" />
                ) : (
                  <Clock className="h-2.5 w-2.5 text-sky-300" />
                )}
              </div>

              {/* Tiny tick joining label block to the line */}
              <div
                className={
                  'absolute w-px ' +
                  (isAvailable
                    ? 'bg-[#D2E369]'
                    : isPast
                    ? 'bg-emerald-500/50'
                    : 'bg-sky-500/50')
                }
                style={
                  above
                    ? { top: 48, left: 0, transform: 'translateX(-50%)', height: 14 }
                    : { top: 78, left: 0, transform: 'translateX(-50%)', height: 14 }
                }
              />

              {/* Alternating label */}
              <div
                className="absolute text-center"
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
                    (isAvailable
                      ? 'text-[#D2E369] font-bold'
                      : isPast
                      ? 'text-emerald-300'
                      : 'text-sky-300')
                  }
                >
                  {formatShort(t.date)}
                </div>
                <div
                  className={
                    'mt-0.5 text-[11px] leading-tight ' +
                    (isAvailable ? 'text-[#D2E369] font-bold' : 'font-medium text-[#FFF5E7]')
                  }
                >
                  {t.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: horizontal scroll strip with dark-theme custom scrollbar */}
      <div
        className={
          'md:hidden -mx-3 px-3 overflow-x-auto pb-2 ' +
          '[&::-webkit-scrollbar]:h-1.5 ' +
          '[&::-webkit-scrollbar-track]:bg-[#D2E369]/5 ' +
          '[&::-webkit-scrollbar-track]:rounded-full ' +
          '[&::-webkit-scrollbar-thumb]:bg-[#D2E369]/40 ' +
          '[&::-webkit-scrollbar-thumb]:rounded-full ' +
          '[scrollbar-color:rgba(210,227,105,0.4)_rgba(210,227,105,0.05)] ' +
          '[scrollbar-width:thin]'
        }
      >
        <ol className="flex gap-2 min-w-max pb-1">
          {merged.map((t, i) => {
            const isPast = t.kind !== 'available' && t.date <= todayISO;
            const isAvailable = t.kind === 'available';
            return (
              <li
                key={t.date + t.label + i}
                className={
                  'min-w-[140px] rounded-lg border px-3 py-2 ' +
                  (isAvailable
                    ? 'bg-[#D2E369]/20 border-[#D2E369]'
                    : isPast
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-sky-500/10 border-sky-500/40')
                }
              >
                <div className="flex items-center gap-1.5">
                  {isAvailable ? (
                    <Star className="h-3 w-3 text-[#D2E369] fill-[#D2E369]" />
                  ) : isPast ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                  ) : (
                    <Clock className="h-3 w-3 text-sky-300" />
                  )}
                  <span
                    className={
                      'text-[10px] font-mono uppercase tracking-wider ' +
                      (isAvailable
                        ? 'text-[#D2E369] font-bold'
                        : isPast
                        ? 'text-emerald-300'
                        : 'text-sky-300')
                    }
                  >
                    {formatShort(t.date)}
                  </span>
                </div>
                <div
                  className={
                    'mt-0.5 text-xs leading-tight ' +
                    (isAvailable ? 'text-[#D2E369] font-bold' : 'font-medium text-[#FFF5E7]')
                  }
                >
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

function FullyAvailableCallout({
  fa,
  todayISO,
}: {
  fa: FullyAvailableEstimate;
  todayISO: string;
}) {
  const monthsAway = monthsBetween(todayISO, fa.date);
  const passed = fa.date <= todayISO;
  return (
    <div className="mb-3 rounded-xl border-2 border-[#D2E369] bg-gradient-to-r from-[#D2E369]/20 via-[#D2E369]/10 to-transparent p-3 md:p-4 flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#D2E369] text-[#2C5263] shadow-[0_0_12px_rgba(210,227,105,0.6)]">
        <CalendarCheck className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#D2E369]">
            {fa.label}
          </span>
          <span
            className={
              'text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border ' +
              confidenceTone(fa.confidence)
            }
          >
            {fa.confidence} confidence
          </span>
        </div>
        <div className="text-base md:text-lg font-extrabold text-[#FFF5E7] leading-tight">
          {passed ? (
            <>Reached on {formatLong(fa.date)}</>
          ) : (
            <>
              {formatLong(fa.date)}
              <span className="ml-2 text-sm font-semibold text-[#D2E369]">
                ({monthsAway === 0 ? 'within weeks' : `~${monthsAway} mo away`})
              </span>
            </>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-400 leading-snug line-clamp-2">{fa.rationale}</p>
      </div>
    </div>
  );
}

function confidenceTone(c: 'high' | 'medium' | 'low'): string {
  switch (c) {
    case 'high':
      return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300';
    case 'medium':
      return 'border-[#D2E369]/60 bg-[#D2E369]/10 text-[#D2E369]';
    default:
      return 'border-sky-400/60 bg-sky-500/10 text-sky-300';
  }
}

function isValidIso(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(s + 'T00:00:00Z');
  return Number.isFinite(t);
}

function monthsBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO);
  const b = new Date(toISO);
  const diffMs = b.getTime() - a.getTime();
  if (!Number.isFinite(diffMs)) return 0;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
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

function formatLong(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
