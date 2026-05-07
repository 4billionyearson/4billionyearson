import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/**
 * Visual at-a-glance "is *my* setup actually legal?" checklist for the
 * "Is it legal yet?" section. Pure SSR. Each row condenses one of the
 * key conditions of UK plug-in solar legality so people can self-assess
 * in seconds without reading the full paragraph.
 */
export function LegalChecklist() {
  const rows: { ok: 'yes' | 'no' | 'maybe'; condition: string; explain: string }[] = [
    {
      ok: 'yes',
      condition: 'Sub-800 W AC kit, sold by a UK retailer',
      explain:
        'Compliant with BS 7671 Amendment 4 and the upcoming BSI product standard. Plug straight into a normal 13 A socket.',
    },
    {
      ok: 'yes',
      condition: 'You notify your DNO within 28 days (G98)',
      explain:
        'Free online form, no approval required. We have a postcode → DNO finder lower down the page.',
    },
    {
      ok: 'yes',
      condition: 'You tell your home insurer',
      explain:
        'A simple note on the policy. Most insurers add it for free; not telling them gives grounds to refuse a claim.',
    },
    {
      ok: 'maybe',
      condition: 'Renting? Tell your landlord first',
      explain:
        'Plug-in solar is portable, so it usually falls outside "alterations" clauses, but the Renters\' Rights Act 2025 expects written notice. Use our landlord letter template.',
    },
    {
      ok: 'no',
      condition: 'Imported "Balkonkraftwerk" with no UK certification',
      explain:
        'Anti-islanding (EN 50549), earth bonding and BS 1363 plug compliance may not be guaranteed. Avoid generic Amazon/eBay listings without a UK importer.',
    },
    {
      ok: 'no',
      condition: 'Hard-wired into a dedicated spur',
      explain:
        'That is no longer "plug-in" - it becomes notifiable electrical work and needs an electrician under Part P.',
    },
  ];

  return (
    <div className="rounded-xl border border-[#D2E369]/30 bg-gray-950/60 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#D2E369]/20 bg-[#D2E369]/5 flex items-center justify-between">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#D2E369] font-semibold">
          Is your setup legal?
        </h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
          self-check
        </span>
      </div>
      <ul className="divide-y divide-gray-800">
        {rows.map((r, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0">
              {r.ok === 'yes' && (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </span>
              )}
              {r.ok === 'maybe' && (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/20 ring-1 ring-amber-400/50">
                  <AlertCircle className="h-4 w-4 text-amber-300" />
                </span>
              )}
              {r.ok === 'no' && (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-rose-500/20 ring-1 ring-rose-400/50">
                  <XCircle className="h-4 w-4 text-rose-300" />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={
                  'text-sm font-semibold ' +
                  (r.ok === 'yes'
                    ? 'text-emerald-200'
                    : r.ok === 'maybe'
                    ? 'text-amber-200'
                    : 'text-rose-200')
                }
              >
                {r.condition}
              </div>
              <div className="mt-0.5 text-xs text-gray-300 leading-relaxed">{r.explain}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
