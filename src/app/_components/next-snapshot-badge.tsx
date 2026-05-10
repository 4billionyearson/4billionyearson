"use client";

import { CalendarDays } from 'lucide-react';

/**
 * Shows a "Next update: ~12–14 [month]" pill during the first half of each
 * month, when the latest snapshot data is still from two months ago (the
 * 4BYO snapshot rebuild runs on the 12th–14th of each month).
 * Renders nothing on the 15th or later (snapshot has already run).
 */
export default function NextSnapshotBadge() {
  const now = new Date();
  const day = now.getDate();
  if (day > 14) return null;
  const monthName = now.toLocaleDateString('en-GB', { month: 'long' });
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-sky-300">
      <CalendarDays className="h-3 w-3 shrink-0" />
      Next update: ~12–14 {monthName}
    </span>
  );
}
