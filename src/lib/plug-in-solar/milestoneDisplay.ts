import { LEGAL_IN_SHOPS_TIMELINE_TITLE } from '@/app/plug-in-solar-uk/_data/static';
import type { FullyAvailableEstimate, TimelineEntry } from './types';

/** Normalise legacy / short Gemini labels so UI matches the static timeline title. */
export function normaliseMilestoneLabel(label: string | undefined): string {
  if (label == null) return LEGAL_IN_SHOPS_TIMELINE_TITLE;
  const t = label.trim();
  if (t === '' || /^legal$/i.test(t)) return LEGAL_IN_SHOPS_TIMELINE_TITLE;
  if (/^fully\s+legal\b/i.test(t)) return LEGAL_IN_SHOPS_TIMELINE_TITLE;
  return t;
}

/** Headline + mini timeline: always show “Legal & in the shops” (not a bare “Legal”). */
export function milestoneForUi(fa: FullyAvailableEstimate): FullyAvailableEstimate {
  return { ...fa, label: normaliseMilestoneLabel(fa.label) };
}
/**
 * Format a future milestone date as an approximate natural-language
 * description, e.g. "Approx. mid July 2026". Used wherever showing a
 * specific day (e.g. "31 Jul 2026") would imply false precision for an
 * AI-estimated date.
 *
 *  day  1-10  → "Approx. early [Month] [Year]"
 *  day 11-20  → "Approx. mid [Month] [Year]"
 *  day 21+    → "Approx. late [Month] [Year]"
 */
export function formatApproxDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    const day = d.getUTCDate();
    const pos = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
    const month = d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
    const year = d.getUTCFullYear();
    return `Approx. ${pos} ${month} ${year}`;
  } catch {
    return iso;
  }
}
/** True if a timeline entry is the BSI plug-in solar product standard row. */
export function isBsiStandardEntry(e: { title: string; category?: string }): boolean {
  if (e.category === 'standard') return /\bbsi\b/i.test(e.title);
  return /\bbsi\b.*\bstandard\b/i.test(e.title);
}

/** True if a timeline entry is the consumer "Legal & in the shops" row. */
export function isLegalInShopsEntry(e: { title: string }): boolean {
  return e.title.trim().toLowerCase() === LEGAL_IN_SHOPS_TIMELINE_TITLE.toLowerCase();
}

/** Two ISO-date strings fall in the same calendar month (YYYY-MM-…). */
export function sameCalendarMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/**
 * When the BSI standard row and the consumer "Legal & in the shops" row
 * fall in the same calendar month, collapse them into ONE combined row
 * dated to the AI-derived `fullyAvailableDate` (or whichever of the two
 * is later). When their months differ, return the input unchanged.
 *
 * Used by both the vertical RegulationTimeline and the horizontal
 * MiniTimeline so the two views never disagree.
 */
export function collapseBsiAndShopsIfSameMonth<T extends TimelineEntry>(
  entries: T[],
  fa: FullyAvailableEstimate,
): T[] {
  const bsi = entries.find(isBsiStandardEntry);
  const shops = entries.find(isLegalInShopsEntry);
  if (!bsi || !shops) return entries;
  // The merged date should be the FA date if it is in the same month
  // as either row, otherwise the later of the two static rows.
  const candidateDates = [bsi.date, shops.date, fa.date].filter(Boolean);
  if (!candidateDates.every((d) => sameCalendarMonth(d, candidateDates[0]))) {
    return entries;
  }
  const mergedDate = fa.date && sameCalendarMonth(fa.date, bsi.date) ? fa.date : bsi.date;
  const merged: TimelineEntry = {
    date: mergedDate,
    title: 'BSI standard published + Legal & in the shops',
    description:
      'Same calendar moment, two aspects: the BSI plug-in solar product standard publishes (covering anti-islanding, the 800 W AC limit, EN 50549 micro-inverter certification and BS 1363 plug compliance), and certified kits become widely stocked by mainstream UK retailers off the back of it.',
    kind: mergedDate <= new Date().toISOString().slice(0, 10) ? 'past' : 'future',
    category: 'standard',
  };
  const out: T[] = [];
  let inserted = false;
  for (const e of entries) {
    if (isBsiStandardEntry(e) || isLegalInShopsEntry(e)) {
      if (!inserted) {
        out.push(merged as T);
        inserted = true;
      }
      continue;
    }
    out.push(e);
  }
  return out;
}

