import React from 'react';
import Term from '@/app/_components/climate-term';
import { WARMING_DRIVERS, type DriverId } from '@/lib/climate/warming-drivers';

/**
 * Regex source matching any canonical driver term or alias, ordered
 * longest-first so "arctic-amplified warming" wins over "warming" etc.
 * Word boundaries (\b) require term boundaries. Case-insensitive via `i`.
 */
const termIndex: { id: DriverId; regex: RegExp }[] = (() => {
  const flat: { id: DriverId; phrase: string }[] = [];
  for (const d of WARMING_DRIVERS) {
    flat.push({ id: d.id, phrase: d.term });
    for (const a of d.aliases) flat.push({ id: d.id, phrase: a });
  }
  flat.sort((a, b) => b.phrase.length - a.phrase.length);
  return flat.map(({ id, phrase }) => ({
    id,
    regex: new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'i'),
  }));
})();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Locate the first unlinkified occurrence of each driver (max one per
 * driver per text) and return ranges to wrap in <Term>.
 */
function findDriverRanges(text: string): { start: number; end: number; id: DriverId; matched: string }[] {
  const used = new Set<DriverId>();
  const ranges: { start: number; end: number; id: DriverId; matched: string }[] = [];
  for (const { id, regex } of termIndex) {
    if (used.has(id)) continue;
    const m = regex.exec(text);
    if (!m) continue;
    // Skip if this range overlaps an already-chosen range.
    const start = m.index;
    const end = m.index + m[0].length;
    if (ranges.some((r) => start < r.end && end > r.start)) continue;
    ranges.push({ start, end, id, matched: m[0] });
    used.add(id);
  }
  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

/**
 * Render summary-paragraph text as React nodes:
 *   - wraps the first occurrence of each driver term/alias in a <Term>
 *   - applies the provided HTML formatter (e.g. `highlightRankings`) to the
 *     remaining segments and injects them via dangerouslySetInnerHTML
 *
 * The formatter MUST return already-escaped HTML.
 */
export function renderWithDriverTooltips(
  text: string,
  formatHtml: (s: string) => string,
): React.ReactNode[] {
  const ranges = findDriverRanges(text);
  if (!ranges.length) {
    return [<span key="p" dangerouslySetInnerHTML={{ __html: formatHtml(text) }} />];
  }
  const out: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) {
      const chunk = text.slice(cursor, r.start);
      out.push(<span key={`t-${i}`} dangerouslySetInnerHTML={{ __html: formatHtml(chunk) }} />);
    }
    out.push(
      <Term key={`d-${i}`} id={r.id}>
        {r.matched}
      </Term>,
    );
    cursor = r.end;
  });
  if (cursor < text.length) {
    const tail = text.slice(cursor);
    out.push(<span key="tail" dangerouslySetInnerHTML={{ __html: formatHtml(tail) }} />);
  }
  return out;
}
