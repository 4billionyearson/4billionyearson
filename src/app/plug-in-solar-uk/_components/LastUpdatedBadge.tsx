import { Clock } from 'lucide-react';

/**
 * Small "Last updated" pill, server-rendered so it's in the SSR HTML for
 * search-engine freshness signals.
 */
export function LastUpdatedBadge({
  generatedAt,
  source,
  className,
}: {
  generatedAt: string | null | undefined;
  /** Optional cache provenance label - "cache" / "fresh" / "stale-cache". */
  source?: string;
  className?: string;
}) {
  let label = 'Updated daily';
  let title = 'This page is regenerated daily.';
  if (generatedAt) {
    try {
      const d = new Date(generatedAt);
      label = `Updated ${d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
      })}`;
      title = `Last refreshed ${d.toISOString()}`;
    } catch {
      /* ignore */
    }
  }
  if (source === 'stale-cache') {
    label += ' (cached)';
  }
  return (
    <span
      title={title}
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-full border border-[#D2E369]/40 bg-[#D2E369]/10 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-[#D2E369]'
      }
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}
