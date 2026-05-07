import { CheckCircle2, Circle, FileText, Package, Scale, Sparkles } from 'lucide-react';
import type { TimelineEntry } from '@/lib/plug-in-solar/types';
import { BASE_TIMELINE } from '../_data/static';

/**
 * Hybrid timeline: static base milestones merged with any new entries
 * Gemini supplied today. Today's "you are here" marker is computed at
 * render time. Server-rendered.
 */
export function RegulationTimeline({ updates }: { updates: TimelineEntry[] | undefined }) {
  const merged = mergeAndSort([...BASE_TIMELINE, ...(updates ?? [])]);
  const todayISO = new Date().toISOString().slice(0, 10);
  // Insert a synthetic "today" marker so users can see where they are.
  const withToday = injectToday(merged, todayISO);

  return (
    <ol aria-label="UK plug-in solar regulation timeline" className="relative space-y-4 pl-6 border-l border-[#D2E369]/30">
      {withToday.map((entry, i) => (
        <li key={`${entry.date}-${entry.title}-${i}`} className="relative">
          <span
            className={
              'absolute -left-[33px] top-0.5 grid h-6 w-6 place-items-center rounded-full border ' +
              statusRing(entry, todayISO)
            }
            aria-hidden
          >
            {iconFor(entry, todayISO)}
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
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
          <p className="mt-1 text-sm text-gray-300 leading-relaxed">{entry.description}</p>
        </li>
      ))}
    </ol>
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

function iconFor(entry: TimelineEntry, todayISO: string) {
  if (entry.date === '__today__') return <Sparkles className="h-3.5 w-3.5 text-[#D2E369]" />;
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

function statusRing(entry: TimelineEntry, todayISO: string): string {
  if (entry.date === '__today__') return 'bg-[#D2E369]/10 border-[#D2E369]';
  if (entry.date <= todayISO) return 'bg-emerald-500/10 border-emerald-500/60';
  return 'bg-sky-500/10 border-sky-500/40';
}
