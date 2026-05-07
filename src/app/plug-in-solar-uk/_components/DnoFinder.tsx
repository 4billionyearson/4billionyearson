'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, MapPin, Phone, Search } from 'lucide-react';
import { lookupDNO } from '../_data/static';

/**
 * "Find your DNO" tool. Maps a UK postcode to its Distribution Network
 * Operator and links straight to that DNO's G98 / generation-notification
 * form. Pure client-side - no network calls.
 */
export function DnoFinder() {
  const [postcode, setPostcode] = useState('');
  const result = useMemo(() => (postcode ? lookupDNO(postcode) : null), [postcode]);

  return (
    <section
      aria-labelledby="dno-finder-heading"
      className="rounded-2xl border-2 border-[#D2E369] bg-gray-950/90 backdrop-blur-md shadow-xl overflow-hidden"
    >
      <div className="px-5 py-3 md:px-6 md:py-4" style={{ backgroundColor: '#D2E369' }}>
        <h2 id="dno-finder-heading" className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#2C5263] flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Find your DNO
        </h2>
      </div>
      <div className="p-5 md:p-6 space-y-3">
        <p className="text-sm text-gray-300 leading-relaxed">
          Within 28 days of installing your kit you must notify your Distribution Network Operator
          (DNO). The form is free, online, and takes a few minutes - no approval is required for
          sub-800 W plug-in solar. Enter your postcode below to find the right DNO.
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="e.g. SW1A 1AA"
              aria-label="Postcode"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-[#FFF5E7] placeholder:text-gray-600 focus:border-[#D2E369] outline-none"
            />
          </div>
        </div>
        {!postcode && (
          <p className="text-[11px] text-gray-500 italic">
            Don't know your DNO? It's NOT the same as your electricity supplier - they own the
            cables, your supplier just bills you.
          </p>
        )}
        {postcode && !result && (
          <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
            Couldn't recognise that postcode. Try the postcode area only (e.g. "M" or "SW").
          </div>
        )}
        {result && (
          <article className="rounded-xl border border-[#D2E369]/40 bg-[#D2E369]/5 p-4 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#D2E369]">
              Postcode area {result.area} →
            </div>
            <h3 className="text-lg font-semibold text-[#FFF5E7]">{result.dno.name}</h3>
            <p className="text-sm text-gray-300">{result.dno.region}</p>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#D2E369]/20">
              <a
                href={result.dno.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D2E369] px-3 py-1.5 text-sm font-semibold text-[#2C5263] hover:bg-[#E5F08A] transition-colors"
              >
                Notify them (G98)
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={`tel:${result.dno.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-[#D2E369] transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {result.dno.phone}
              </a>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
