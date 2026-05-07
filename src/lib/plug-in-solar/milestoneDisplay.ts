import { LEGAL_IN_SHOPS_TIMELINE_TITLE } from '@/app/plug-in-solar-uk/_data/static';
import type { FullyAvailableEstimate } from './types';

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
