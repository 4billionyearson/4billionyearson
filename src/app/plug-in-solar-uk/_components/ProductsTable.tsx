import { Battery, ExternalLink, ShieldCheck, ShieldQuestion, ShieldX, Clock, AlertTriangle, RefreshCw, ShoppingBag } from 'lucide-react';
import type { ProductRow, RetailerLink } from '@/lib/plug-in-solar/types';
import {
  applyAmazonAffiliateTag,
  amazonAssociateTagForCountry,
  isAmazonAssociatesEligibleUrl,
} from '@/lib/amazon';
import { AffiliateDisclosure } from './AffiliateDisclosure';

/**
 * Build a normalised list of retailer links for a product. Falls back
 * to a single-entry list built from the legacy { retailer, url } pair
 * when Gemini hasn't populated the new retailers[] array yet.
 * Amazon `amazon.*` links get the same Associates tag as our book pages.
 */
function getRetailers(p: ProductRow, countryCode: string): RetailerLink[] {
  const raw: RetailerLink[] =
    Array.isArray(p.retailers) && p.retailers.length > 0
      ? p.retailers
      : p.url && p.retailer
        ? [{ retailer: p.retailer, url: p.url, priceGBP: p.priceGBP }]
        : [];
  const hasProgram = amazonAssociateTagForCountry(countryCode) !== null;
  return raw.map((r) => {
    const isAmz = isAmazonAssociatesEligibleUrl(r.url);
    return {
      ...r,
      url: applyAmazonAffiliateTag(r.url, countryCode),
      // Only Amazon links use our Associates account (same as Energy Books / etc.).
      affiliate: hasProgram && isAmz,
    };
  });
}

/**
 * Products table. Server-rendered so the kit list is in raw SSR HTML
 * (good for AI crawlers and Google product-results).
 */
export function ProductsTable({
  products,
  countryCode = 'GB',
}: {
  products: ProductRow[] | undefined;
  /** Vercel geo (or GB fallback) — drives Amazon Associates tag. */
  countryCode?: string;
}) {
  if (!products || products.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Product list regenerating - refresh in a moment to see today's UK-available kits.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <AutoUpdateNote count={products.length} />

      <AffiliateDisclosure variant="inline" />

      <NonCompliantWarning />

      {/* Card layout on mobile */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {products.map((p) => {
          const retailers = getRetailers(p, countryCode);
          return (
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
              <RetailerLinks retailers={retailers} layout="stack" />
            </article>
          );
        })}
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
              <th className="px-4 py-3">Where to buy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {products.map((p) => {
              const retailers = getRetailers(p, countryCode);
              return (
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
                  <td className="px-4 py-3 align-top">
                    <RetailerLinks retailers={retailers} layout="row" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Renders all retailers carrying a product as individual outbound
 * pills. `layout="stack"` is used in the mobile card view (full-width
 * vertical stack); `layout="row"` is used in the desktop table cell
 * (compact horizontal wrap).
 */
function RetailerLinks({
  retailers,
  layout,
}: {
  retailers: RetailerLink[];
  layout: 'stack' | 'row';
}) {
  if (retailers.length === 0) {
    return <span className="text-xs text-gray-500 italic">No working retailer link.</span>;
  }
  const wrapper =
    layout === 'stack'
      ? 'mt-3 flex flex-col gap-1.5'
      : 'flex flex-col gap-1.5';
  return (
    <div className={wrapper}>
      {retailers.map((r) => {
        const rel = r.affiliate
          ? 'sponsored noopener noreferrer'
          : 'noopener noreferrer';
        return (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel={rel}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D2E369] hover:text-[#E5F08A] transition-colors whitespace-nowrap"
            title={r.url}
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            <span>
              {r.retailer}
              {typeof r.priceGBP === 'number' && r.priceGBP > 0 && (
                <span className="ml-1 text-xs font-normal text-gray-400">
                  £{Math.round(r.priceGBP)}
                </span>
              )}
            </span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        );
      })}
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

function AutoUpdateNote({ count }: { count: number }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#D2E369]/30 bg-[#D2E369]/5 px-3 py-2 text-xs text-gray-300">
      <RefreshCw className="h-4 w-4 text-[#D2E369] shrink-0 mt-0.5" />
      <p>
        <span className="font-semibold text-[#D2E369]">List auto-expands.</span> Showing
        the {count} UK plug-in solar kits we know are on sale today. Each daily refresh asks Gemini
        (with Google Search grounding) to add new launches and drop discontinued models, so the
        table grows as the UK market does.
      </p>
    </div>
  );
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
