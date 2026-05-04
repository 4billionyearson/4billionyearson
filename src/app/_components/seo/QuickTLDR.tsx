import React from 'react';

/**
 * Compact 1-paragraph TL;DR shown directly under a page hero. Acts as the
 * "snippet bait" that AI search engines (Claude, Perplexity, ChatGPT search,
 * Gemini) and Google featured snippets like to quote, while keeping the
 * live tracker / data section above the fold.
 */
export function QuickTLDR({
  children,
  label = 'Quick Summary',
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <aside
      aria-label={label}
      className={
        className ??
        'rounded-2xl border border-[#D0A65E]/40 bg-gray-950/80 backdrop-blur-md p-4 md:p-5 shadow-lg'
      }
    >
      <div className="text-[11px] font-mono uppercase tracking-wider text-[#D0A65E] mb-1">
        {label}
      </div>
      <p className="text-sm md:text-base text-gray-200 leading-relaxed">{children}</p>
    </aside>
  );
}
