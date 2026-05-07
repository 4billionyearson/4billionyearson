import { CheckCircle2, Circle, FileText, Package, Scale, Sparkles, Star, CalendarCheck } from 'lucide-react';
import type { FullyAvailableEstimate, TimelineEntry } from '@/lib/plug-in-solar/types';
import {
  milestoneForUi,
  normaliseMilestoneLabel,
  collapseBsiAndShopsIfSameMonth,
  isLegalInShopsEntry,
  formatApproxDate,
} from '@/lib/plug-in-solar/milestoneDisplay';
import { BASE_TIMELINE, FULLY_AVAILABLE_FALLBACK } from '../_data/static';

/**
 * Hybrid timeline: static base milestones merged with any new entries
 * Gemini supplied today, plus the prominent "Legal & in the shops" callout
 * at the top. Today's "you are here" marker is
 * computed at render time. Server-rendered.
 */
export function RegulationTimeline({
  updates,
  fullyAvailable,
}: {
  updates: TimelineEntry[] | undefined;
  fullyAvailable?: FullyAvailableEstimate;
}) {
  const todayISO = new Date().toISOString().slice(0, 10);
  // Guard against Gemini handing us a non-ISO date (the downstream date
  // formatter would render "Invalid Date" / "NaN months").
  const faRaw =
    fullyAvailable && /^\d{4}-\d{2}-\d{2}$/.test(fullyAvailable.date)
      ? fullyAvailable
      : FULLY_AVAILABLE_FALLBACK;
  const faUi = milestoneForUi(faRaw);

  const merged = mergeAndSort([...BASE_TIMELINE, ...(updates ?? [])]);
  // The AI "fully available" date often differs from the static BSI row (e.g.
  // end of July vs mid-July). Without this, no timeline row matches `fa.date`
  // and the in-list star + pill disappear even though the headline shows the date.
  const withFullyAvailable = ensureFullyAvailableMilestone(merged, faRaw, todayISO);
  // When BSI publication and "Legal & in the shops" fall in the same calendar
  // month we collapse them into one combined row dated to the AI estimate
  // (matches the MiniTimeline above, avoids two near-duplicate rows on the
  // page when the technical + retail beats genuinely line up).
  const collapsed = collapseBsiAndShopsIfSameMonth(withFullyAvailable, faRaw);
  const withToday = injectToday(collapsed, todayISO);

  return (
    <div className="space-y-4">
      <FullyAvailableHeadline fa={faUi} todayISO={todayISO} />

      <ol
        aria-label="UK plug-in solar regulation timeline"
        className="relative space-y-4 pl-6 border-l border-[#D2E369]/30"
      >
        {withToday.map((entry, i) => {
          const retailMilestoneAccent = isRetailMilestoneAccent(entry, faRaw);
          return (
            <li key={`${entry.date}-${entry.title}-${i}`} className="relative">
              <span
                className={
                  'absolute -left-[33px] top-0.5 grid h-6 w-6 place-items-center rounded-full border ' +
                  statusRing(entry, todayISO, retailMilestoneAccent)
                }
                aria-hidden
              >
                {iconFor(entry, todayISO, retailMilestoneAccent)}
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
                  {entry.date === '__today__' ? 'Today' : retailMilestoneAccent ? formatApproxDate(entry.date) : formatDate(entry.date)}
                </span>
                <h4 className="text-sm font-semibold text-[#FFF5E7]">{entry.title}</h4>
              </div>
              {retailMilestoneAccent && (
                <div className="mt-2 mb-1 rounded-xl border-2 border-[#D2E369] bg-gradient-to-r from-[#D2E369]/20 via-[#D2E369]/10 to-transparent px-3 py-2 shadow-[0_0_12px_rgba(210,227,105,0.12)]">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider text-[#D2E369]">
                    <Star className="h-3.5 w-3.5 shrink-0 fill-[#D2E369] text-[#D2E369]" />
                    {faUi.label}
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

/** Lime star + pill on the retail / “in the shops” row, including the merged BSI+shops row. */
function isRetailMilestoneAccent(entry: TimelineEntry, fa: { date: string; label: string }): boolean {
  if (entry.date === '__today__' || entry.date !== fa.date) return false;
  if (isLegalInShopsEntry(entry)) return true;
  if (/legal\s*&\s*in the shops/i.test(entry.title)) return true;
  return entry.title === normaliseMilestoneLabel(fa.label);
}
function ensureFullyAvailableMilestone(
  entries: TimelineEntry[],
  fa: FullyAvailableEstimate,
  todayISO: string,
): TimelineEntry[] {
  if (entries.some((e) => e.date === fa.date)) {
    return mergeAndSort(entries);
  }
  const kind: 'past' | 'future' = fa.date <= todayISO ? 'past' : 'future';
  const extra: TimelineEntry = {
    date: fa.date,
    title: fa.label,
    description: fa.rationale,
    kind,
    category: 'product',
  };
  return mergeAndSort([...entries, extra]);
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
            {passed ? `Reached on ${formatDate(fa.date)}` : formatApproxDate(fa.date)}
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
  return [...seen.values()].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title);
  });
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
