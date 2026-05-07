'use client';

import { useState } from 'react';
import { Copy, Download, FileText, Check } from 'lucide-react';
import { LANDLORD_LETTER_TEMPLATE } from '../_data/static';

/**
 * Downloadable / copyable landlord letter template, referencing the
 * Renters' Rights Act 2025. The template lives in the static data file
 * so it's also visible to AI / search crawlers in raw SSR HTML inside
 * the <details> we ship below.
 */
export function LandlordLetter() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(LANDLORD_LETTER_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([LANDLORD_LETTER_TEMPLATE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plug-in-solar-landlord-letter.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-labelledby="landlord-heading"
      className="rounded-2xl border-2 border-[#D2E369] shadow-xl flex flex-col h-full"
      style={{
        background:
          'linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)',
      }}
    >
      <div
        className="px-5 py-3 md:px-6 md:py-4 rounded-t-[14px]"
        style={{ backgroundColor: '#D2E369' }}
      >
        <h2 id="landlord-heading" className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#2C5263] flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Landlord letter template
        </h2>
      </div>
      <div className="flex-1 bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-b-[14px] space-y-3">
        <p className="text-sm text-gray-300 leading-relaxed">
          If you rent, the simplest path is to write to your landlord before installing. The
          template below references BS 7671 Amendment 4 (2026), explains that the kit is portable
          and reversible, and cites your right to request energy-efficiency improvements under the
          Renters' Rights Act 2025. Edit the bracketed sections, then send.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D2E369] px-3 py-1.5 text-sm font-semibold text-[#2C5263] hover:bg-[#E5F08A] transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D2E369]/40 bg-[#D2E369]/10 px-3 py-1.5 text-sm font-semibold text-[#D2E369] hover:bg-[#D2E369]/20 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download .txt
          </button>
        </div>
        <details className="group rounded-xl border border-gray-800 bg-gray-900/50">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#FFF5E7] hover:text-[#D2E369] transition-colors flex items-center justify-between">
            <span>Preview the letter</span>
            <span className="text-xs text-gray-500 group-open:hidden">Show</span>
            <span className="text-xs text-gray-500 hidden group-open:inline">Hide</span>
          </summary>
          <pre className="px-4 pb-4 pt-0 text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
            {LANDLORD_LETTER_TEMPLATE}
          </pre>
        </details>
      </div>
    </section>
  );
}
