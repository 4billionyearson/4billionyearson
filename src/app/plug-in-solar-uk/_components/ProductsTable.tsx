import { Battery, ExternalLink, ShieldCheck, ShieldQuestion, ShieldX, Clock, AlertTriangle } from 'lucide-react';
import type { ProductRow } from '@/lib/plug-in-solar/types';
import { AffiliateDisclosure } from './AffiliateDisclosure';

/**
 * Products table. Server-rendered so the kit list is in raw SSR HTML
 * (good for AI crawlers and Google product-results).
 */
export function ProductsTable({ products }: { products: ProductRow[] | undefined }) {
  if (!products || products.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Product list regenerating - refresh in a moment to see today's UK-available kits.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <AffiliateDisclosure variant="inline" />

      <NonCompliantWarning />

      {/* Card layout on mobile */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {products.map((p) => (
          <article
            key={`${p.brand}-${p.model}`}
            className="rounded-2xl border border-[#D2E369]/30 bg-gray-950/80 p-4 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#D2E369]">
                  {p.brand}
                </div>
                <div className="text-base font-semibold text-[#FFF5E7]">{p.model}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-[#FFF5E7]">£{Math.round(p.priceGBP)}</div>
                <div className="text-[11px] text-gray-400">{p.wattsAC} W AC</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-300">
              <ComplianceBadge status={p.ukCompliant} />
              <span className="text-gray-500">·</span>
              <span>{p.retailer}</span>
              {p.hasBattery && (
                <>
                  <span className="text-gray-500">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Battery className="h-3.5 w-3.5" />
                    {p.batteryKWh ? `${p.batteryKWh} kWh battery` : 'with battery'}
                  </span>
                </>
              )}
            </div>
            {p.notes && <p className="mt-2 text-xs text-gray-400 italic">{p.notes}</p>}
            <a
              href={p.url}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#D2E369] hover:text-[#E5F08A] transition-colors"
            >
              View at {p.retailer}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </article>
        ))}
      </div>

      {/* Table layout on tablet+ */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-[#D2E369]/30 bg-gray-950/80 shadow-lg">
        <table className="w-full text-sm">
          <thead className="border-b border-[#D2E369]/20 bg-[#D2E369]/5">
            <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-[#D2E369]">
              <th className="px-4 py-3">Brand &amp; model</th>
              <th className="px-4 py-3">Output</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">UK compliant</th>
              <th className="px-4 py-3">Battery</th>
              <th className="px-4 py-3">Where sold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {products.map((p) => (
              <tr key={`${p.brand}-${p.model}`} className="hover:bg-gray-900/40 transition-colors">
                <td className="px-4 py-3 align-top">
                  <div className="font-semibold text-[#FFF5E7]">{p.brand}</div>
                  <div className="text-gray-400 text-xs">{p.model}</div>
                  {p.notes && <div className="text-gray-500 text-[11px] italic mt-1">{p.notes}</div>}
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap text-gray-300">
                  {p.wattsAC} W AC
                  {p.wattsDC && p.wattsDC > p.wattsAC ? (
                    <span className="text-gray-500 text-[11px]"> ({p.wattsDC} W DC)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap font-semibold text-[#FFF5E7]">
                  £{Math.round(p.priceGBP)}
                </td>
                <td className="px-4 py-3 align-top">
                  <ComplianceBadge status={p.ukCompliant} />
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap text-gray-300">
                  {p.hasBattery ? (
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <Battery className="h-3.5 w-3.5" />
                      {p.batteryKWh ? `${p.batteryKWh} kWh` : 'Yes'}
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#D2E369] hover:text-[#E5F08A] transition-colors"
                  >
                    {p.retailer}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceBadge({ status }: { status: ProductRow['ukCompliant'] }) {
  switch (status) {
    case 'yes':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
          <ShieldCheck className="h-3 w-3" />
          Compliant
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    case 'no':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300 border border-rose-500/30">
          <ShieldX className="h-3 w-3" />
          Not compliant
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-[11px] font-medium text-gray-300 border border-gray-500/30">
          <ShieldQuestion className="h-3 w-3" />
          Unknown
        </span>
      );
  }
}

function NonCompliantWarning() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
      <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
      <p>
        <span className="font-semibold text-amber-200">Be wary of imported kits</span> sold on
        Amazon and eBay aimed at the German or Spanish market. Some have been tested and found to
        lack proper UK anti-islanding (EN 50549), earth bonding for the panel frames, or BS 1363
        plug compliance. Look for an explicit statement of UK compliance with BS 7671 Amendment 4.
      </p>
    </div>
  );
}
