import { Newspaper, ExternalLink } from 'lucide-react';
import type { NewsItem } from '@/lib/plug-in-solar/types';

/**
 * Daily-refreshed news feed. Server-rendered so each story appears in
 * raw SSR HTML with NewsArticle JSON-LD elsewhere.
 */
export function NewsFeed({ items }: { items: NewsItem[] | undefined }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        News feed regenerating - refresh in a moment to see the latest UK plug-in solar stories.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((n, i) => (
        <li
          key={`${n.date}-${n.headline}-${i}`}
          className="rounded-xl border border-[#D2E369]/20 bg-gray-950/60 p-4 hover:border-[#D2E369]/50 transition-colors"
        >
          <article>
            <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1.5">
              <Newspaper className="h-3.5 w-3.5 text-[#D2E369]" />
              <time
                dateTime={n.date}
                className="text-[11px] font-mono uppercase tracking-wider text-[#D2E369]"
              >
                {formatDate(n.date)}
              </time>
              <span className="text-gray-600 text-[11px]">·</span>
              <span className="text-[11px] text-gray-400">{n.sourceTitle}</span>
            </header>
            <h3 className="text-base font-semibold text-[#FFF5E7] leading-snug">{n.headline}</h3>
            <p className="mt-1 text-sm text-gray-300 leading-relaxed">{n.summary}</p>
            {n.sourceUrl && (
              <a
                href={n.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#D2E369] hover:text-[#E5F08A] transition-colors"
              >
                Read at {n.sourceTitle}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
