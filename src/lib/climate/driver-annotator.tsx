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
    regex: new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi'),
  }));
})();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Locate driver mentions and return ranges to wrap in <Term>.
 * Allows multiple distinct mentions per driver provided each uses a
 * different surface phrase (e.g. both "El Niño" and "La Niña" in the same
 * paragraph both get the ENSO tooltip), but avoids repeating the same
 * phrase and avoids overlapping ranges (longer phrases win).
 */
function findDriverRanges(text: string): { start: number; end: number; id: DriverId; matched: string }[] {
  const ranges: { start: number; end: number; id: DriverId; matched: string }[] = [];
  const seenPhrases = new Set<string>();
  for (const { id, regex } of termIndex) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      const key = `${id}:${m[0].toLowerCase()}`;
      if (seenPhrases.has(key)) continue;
      if (ranges.some((r) => start < r.end && end > r.start)) continue;
      ranges.push({ start, end, id, matched: m[0] });
      seenPhrases.add(key);
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

/**
 * Strip markdown-style **bold** markers from text. Gemini sometimes returns
 * them around phrases it wants to emphasise (including driver names), but we
 * already style ranking highlights and driver tooltips ourselves, so the
 * asterisks just look like noise.
 */
function stripMarkdownBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*\*/g, '');
}

/**
 * Rename the legacy `## Context` sub-heading to the friendlier
 * "What's driving change?" label. Safe to apply to cached summaries.
 */
export function relabelSummaryHeading(heading: string): string {
  const h = heading.trim().toLowerCase();
  if (h === 'context' || h === 'context from the news') {
    return "What's driving change?";
  }
  return heading;
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
  rawText: string,
  formatHtml: (s: string) => string,
): React.ReactNode[] {
  const text = stripMarkdownBold(rawText);
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
