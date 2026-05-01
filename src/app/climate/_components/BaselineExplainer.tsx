import React from 'react';
import { Info } from 'lucide-react';

/**
 * Baseline reference card. Shown on the rankings page and the
 * methodology page so journalists, students, and casual readers all see
 * the same disclosure about which baselines this site uses where.
 */
export default function BaselineExplainer({
  variant = 'default',
}: {
  variant?: 'default' | 'compact';
}) {
  const compact = variant === 'compact';
  return (
    <section
      className={`rounded-2xl border border-gray-800 bg-gray-950/70 ${
        compact ? 'p-3 md:p-4' : 'p-4 md:p-5'
      }`}
    >
      <h2
        className={`flex items-start gap-2 font-mono font-bold text-white ${
          compact ? 'text-sm mb-2' : 'text-lg mb-3'
        }`}
      >
        <Info className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 text-[#D0A65E] mt-0.5`} />
        <span>Which baseline is in use?</span>
      </h2>
      <p className={`text-gray-300 ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>
        Most temperature anomalies on this site are quoted against the
        <strong className="text-white"> 1961–1990 average</strong>, the WMO standard normal used
        for cross-region comparison. Where a source publishes against a different baseline,
        the source-native figure is also shown for verification.
      </p>
      <ul
        className={`mt-3 space-y-1.5 ${
          compact ? 'text-[11px]' : 'text-xs'
        } text-gray-400 list-disc pl-5`}
      >
        <li>
          <span className="text-gray-200">NOAA US states, climate regions, and continents</span>{' '}
          are reported by NOAA against <strong>1901–2000</strong>; we re-baseline them to
          1961–1990 for the rankings table and roll-ups, and surface the NOAA-native value as a
          secondary verification figure.
        </li>
        <li>
          <span className="text-gray-200">Met Office HadUK regional</span> series use
          <strong> 1991–2020</strong>; the UK pages quote both that and the 1961–1990 figure.
        </li>
        <li>
          <span className="text-gray-200">Paris Agreement 1.5 °C / 2.0 °C tracker</span> is
          quoted against <strong>1850–1900 pre-industrial</strong>, per IPCC convention; this is
          a global-only metric and is not applied to regions.
        </li>
        <li>
          <span className="text-gray-200">NSIDC sea ice</span> uses NSIDC&apos;s
          <strong> 1991–2020 climatology</strong> for percent-of-normal extent.
        </li>
        <li>
          <span className="text-gray-200">North America and South America</span> continental
          land anomalies are <strong>4BYO aggregates</strong> built from the country snapshots,
          because NOAA does not publish a standalone land series for these continents. They are
          labelled <em>“agg”</em> in the roll-ups.
        </li>
      </ul>
    </section>
  );
}
