import React from 'react';
import { BookOpen } from 'lucide-react';

export interface FAQItem {
  q: string;
  /** Plain-text answer (used by JSON-LD). */
  aText: string;
  /** Optional rich answer for the visible HTML; falls back to aText. */
  a?: React.ReactNode;
}

/**
 * Visible-HTML mirror of FAQPage JSON-LD. Render where a search-engine /
 * AI crawler should be able to extract Q&A content from raw SSR HTML
 * (i.e. without executing JavaScript).
 *
 * Usage:
 *   <StaticFAQPanel
 *     headingId="enso-faq-heading"
 *     title="Frequently Asked Questions"
 *     qa={ENSO_FAQ}
 *   />
 *   <FaqJsonLd qa={ENSO_FAQ} />
 */
export function StaticFAQPanel({
  headingId,
  title = 'Frequently Asked Questions',
  qa,
  className,
}: {
  headingId: string;
  title?: string;
  qa: FAQItem[];
  className?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={
        className ??
        'bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-2xl shadow-xl border-2 border-[#D0A65E]'
      }
    >
      <h2
        id={headingId}
        className="text-xl font-bold font-mono text-white mb-4 flex items-start gap-2"
      >
        <BookOpen className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
        <span className="min-w-0 flex-1">{title}</span>
      </h2>
      <div className="space-y-4">
        {qa.map((item, i) => (
          <div key={i} className="border-l-2 border-[#D0A65E]/40 pl-4">
            <h3 className="text-sm md:text-base font-semibold text-[#FFF5E7] mb-1">{item.q}</h3>
            <p className="text-sm text-gray-300 leading-relaxed">{item.a ?? item.aText}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Emits FAQPage JSON-LD using the same `qa` array as the visible panel,
 * so the two cannot drift out of sync.
 */
export function FaqJsonLd({ qa }: { qa: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.aText,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
