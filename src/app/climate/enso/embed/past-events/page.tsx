'use client';

import PastEventsSection from '../../_components/PastEventsSection';

export default function EmbedPastEventsPage() {
  return (
    <div className="p-3 space-y-4">
      <PastEventsSection />
      <div className="flex justify-end">
        <a
          href="https://4billionyearson.org/climate/enso#past-events"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-[#D0A65E]/60 hover:text-[#D0A65E] transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="4 Billion Years On" className="h-4 w-4 rounded-sm opacity-60" />
          4 Billion Years On - ENSO Tracker ↗
        </a>
      </div>
    </div>
  );
}
