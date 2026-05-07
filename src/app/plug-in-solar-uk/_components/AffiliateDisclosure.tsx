import { Info } from 'lucide-react';

/**
 * Editorial-independence + affiliate-disclosure banner. Shown above the
 * products table and again in the page footer panel so the policy is
 * impossible to miss.
 */
export function AffiliateDisclosure({ variant = 'inline' }: { variant?: 'inline' | 'footer' }) {
  if (variant === 'footer') {
    return (
      <section
        aria-label="Editorial independence and affiliate disclosure"
        className="rounded-2xl border-2 border-[#D2E369] bg-gray-950/90 p-5 md:p-6 backdrop-blur-md shadow-xl"
      >
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-[#D2E369] shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-gray-300 leading-relaxed">
            <h3 className="text-base font-semibold text-[#FFF5E7]">Editorial independence</h3>
            <p>
              4 Billion Years On is impartial. We are not a manufacturer, retailer or installer.
              The products listed above are chosen for editorial reasons - because they are
              relevant to the UK market right now - not because anyone has paid us to feature them.
            </p>
            <p>
              Only links to the <strong className="font-semibold text-[#FFF5E7]">Amazon</strong>{' '}
              store in the products table use our Amazon Associates account — the same programme
              as our energy, climate and AI book pages. For UK, Ireland and US visitors those Amazon
              URLs include our affiliate tag; if you buy after clicking, we may earn a small
              commission at no extra cost to you. Links to manufacturer sites (for example EcoFlow),
              other retailers or anywhere that is not Amazon are ordinary outbound links — we do not
              earn commission from them here. The choice of which products appear, and what we say
              about them, is never influenced by affiliate availability. Pages, paragraphs and
              rankings are not for sale.
            </p>
            <p className="text-xs text-gray-500">
              Have a correction or want to suggest a kit we have missed? Email us at
              chris.4billionyears@gmail.com.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#D2E369]/40 bg-[#D2E369]/5 px-3 py-2 text-xs text-gray-300">
      <Info className="h-4 w-4 text-[#D2E369] shrink-0 mt-0.5" />
      <p>
        <strong className="font-semibold text-[#FFF5E7]">Amazon</strong> shop links below use our
        Associates tag (UK/US/IE only, same as our book pages); other retailer links do not. Editorial
        choices are not influenced by it. See the full note at the foot of this page.
      </p>
    </div>
  );
}
