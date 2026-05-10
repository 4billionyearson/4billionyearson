"use client";

import { CalendarDays } from 'lucide-react';

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const LONG_MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Parse a short snapshot label like "Mar 2026" into { monthIdx, year }.
 * monthIdx is 0-based (Jan=0, Dec=11).
 */
function parseShortLabel(label: string): { monthIdx: number; year: number } | null {
  const m = label.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/);
  if (!m) return null;
  const monthIdx = SHORT_MONTHS.indexOf(m[1]);
  if (monthIdx === -1) return null;
  return { monthIdx, year: parseInt(m[2], 10) };
}

/**
 * Shows an "[Month] update · ~12–14 [CurrentMonth]" pill only when the
 * page's data has not yet been advanced to last month's snapshot.
 *
 * Pass `latestDataLabel` (the raw short label from the snapshot JSON, e.g.
 * "Mar 2026") so the badge can hide itself once the snapshot has been
 * updated (data label ≥ last month). Without a label, it falls back to a
 * day-of-month heuristic (shows on days 1–14).
 *
 * Pass `windowDays` to override the default "12–14" range. Pages where the
 * gating source is later (US states, NOAA global) should pass e.g. "13–25"
 * or "15–25"; UK Met Office pages can pass "3–14". The window reflects when
 * the *slowest* source on the page is expected to publish, since that's
 * what determines when the page can flip to the next month.
 */
export default function NextSnapshotBadge({
  latestDataLabel,
  windowDays,
}: {
  latestDataLabel?: string;
  windowDays?: string;
}) {
  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-based
  const currentYear     = now.getFullYear();
  const lastMonthIdx    = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;
  const lastMonthYear   = currentMonthIdx === 0 ? currentYear - 1 : currentYear;

  if (latestDataLabel) {
    const parsed = parseShortLabel(latestDataLabel);
    if (parsed) {
      // Data is already at or beyond last month → snapshot has run → hide.
      const dataIsCurrent =
        parsed.year > lastMonthYear ||
        (parsed.year === lastMonthYear && parsed.monthIdx >= lastMonthIdx);
      if (dataIsCurrent) return null;
    }
  } else {
    // No label supplied: fall back to day heuristic — hide after the 14th.
    if (now.getDate() > 14) return null;
  }

  // "April update · ~12–15 May"
  const comingMonth = LONG_MONTHS[lastMonthIdx];   // data month expected
  const updateMonth = LONG_MONTHS[currentMonthIdx]; // month the CI window runs in
  // Default to NOAA global's typical publication window. NOAA NCEI publishes
  // the prior-month Monthly Global Climate Report in the second week of the
  // following month (most months ~day 12–15). For nearly every page (country,
  // region, US state, group, global, rankings) the page can't flip to the
  // new month until NOAA global has published, so this window applies.
  // UK-only pages (where Met Office data alone gates the page) can pass
  // "3–10" instead.
  const days = windowDays ?? '12–15';

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-sky-300">
      <CalendarDays className="h-3 w-3 shrink-0" />
      {comingMonth} update · ~{days} {updateMonth}
    </span>
  );
}
