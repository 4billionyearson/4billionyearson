import { CheckCircle2, Circle, FileText, Package, Scale, Sparkles, Star, CalendarCheck } from 'lucide-react';
import type { FullyAvailableEstimate, TimelineEntry } from '@/lib/plug-in-solar/types';
import { BASE_TIMELINE, FULLY_AVAILABLE_FALLBACK } from '../_data/static';

/**
 * Hybrid timeline: static base milestones merged with any new entries
 * Gemini supplied today, plus the prominent "fully legal & widely
 * available" callout at the top. Today's "you are here" marker is
 * computed at render time. Server-rendered.
 */
export function RegulationTimeline({
  updates,
  fullyAvailable,
}: {
  updates: TimelineEntry[] | undefined;
  fullyAvailable?: FullyAvailableEstimate;
}) {
  const merged = mergeAndSort([...BASE_TIMELINE, ...(updates ?? [])]);
  const todayISO = new Date().toISOString().slice(0, 10);
  // Insert a synthetic "today" marker so users can see where they are.
  const withToday = injectToday(merged, todayISO);
  const fa = fullyAvailable ?? FULLY_AVAILABLE_FALLBACK;

  return (
    <div className="space-y-4">
      <FullyAvailableHeadline fa={fa} todayISO={todayISO} />

      <ol
        aria-label="UK plug-in solar regulation timeline"
        className="relative space-y-4 pl-6 border-l border-[#D2E369]/30"
      >
        {withToday.map((entry, i) => {
          const matchesFA = entry.date === fa.date;
          return (
            <li key={`${entry.date}-${entry.title}-${i}`} className="relative">
              <span
                className={
                  'absolute -left-[33px] top-0.5 grid h-6 w-6 place-items-center rounded-full border ' +
                  statusRing(entry, todayISO, matchesFA)
                }
                aria-hidden
              >
                {iconFor(entry, todayISO, matchesFA)}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={
                    'font-mono text-[11px] uppercase tracking-wider ' +
                    (entry.date === '__today__'
                      ? 'text-[#D2E369]'
                      : entry.date <= todayISO
                      ? 'text-emerald-300'
                      : 'text-sky-300')
                  }
                >
                  {entry.date === '__today__' ? 'Today' : formatDate(entry.date)}
                </span>
                <h4 className="text-sm font-semibold text-[#FFF5E7]">{entry.title}</h4>
              </div>
              {matchesFA && (
                <div className="mt-1.5 mb-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D2E369] bg-[#D2E369]/15 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#D2E369]">
                    <Star className="h-3 w-3 fill-[#D2E369]" /> Available milestone
                  </span>
                </div>
              )}
              <p className="mt-1 text-sm text-gray-300 leading-relaxed">{entry.description}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FullyAvailableHeadline({
  fa,
  todayISO,
}: {
  fa: FullyAvailableEstimate;
  todayISO: string;
}) {
  const passed = fa.date <= todayISO;
  return (
    <div className="rounded-xl border-2 border-[#D2E369] bg-gradient-to-r from-[#D2E369]/20 via-[#D2E369]/10 to-transparent p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#D2E369] text-[#2C5263] shadow-[0_0_10px_rgba(210,227,105,0.6)]">
          <CalendarCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#D2E369]">
            {fa.label}
          </div>
          <div className="text-base font-extrabold text-[#FFF5E7] leading-tight">
            {passed ? `Reached on ${formatDate(fa.date)}` : formatDate(fa.date)}
          </div>
          <p className="mt-0.5 text-xs text-gray-400 leading-snug">{fa.rationale}</p>
        </div>
      </div>
    </div>
  );
}

function mergeAndSort(entries: TimelineEntry[]): TimelineEntry[] {
  const seen = new Map<string, TimelineEntry>();
  for (const e of entries) {
    const key = `${e.date}|${e.title.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function injectToday(entries: TimelineEntry[], todayISO: string): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  let inserted = false;
  for (const e of entries) {
    if (!inserted && e.date > todayISO) {
      out.push({
        date: '__today__',
        title: 'You are here',
        description: 'Where the UK plug-in solar story currently sits.',
        kind: 'past',
      });
      inserted = true;
    }
    out.push(e);
  }
  if (!inserted) {
    out.push({
      date: '__today__',
      title: 'You are here',
      description: 'Where the UK plug-in solar story currently sits.',
      kind: 'past',
    });
  }
  return out;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function iconFor(entry: TimelineEntry, todayISO: string, matchesFA: boolean) {
  if (entry.date === '__today__') return <Sparkles className="h-3.5 w-3.5 text-[#D2E369]" />;
  if (matchesFA) return <Star className="h-3.5 w-3.5 text-[#2C5263] fill-[#2C5263]" />;
  if (entry.date <= todayISO) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  switch (entry.category) {
    case 'standard':
      return <FileText className="h-3.5 w-3.5 text-sky-300" />;
    case 'product':
      return <Package className="h-3.5 w-3.5 text-sky-300" />;
    case 'regulation':
      return <Scale className="h-3.5 w-3.5 text-sky-300" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-sky-300" />;
  }
}

function statusRing(entry: TimelineEntry, todayISO: string, matchesFA: boolean): string {
  if (entry.date === '__today__') return 'bg-[#D2E369]/10 border-[#D2E369]';
  if (matchesFA) return 'bg-[#D2E369] border-[#D2E369]';
  if (entry.date <= todayISO) return 'bg-emerald-500/10 border-emerald-500/60';
  return 'bg-sky-500/10 border-sky-500/40';
}
