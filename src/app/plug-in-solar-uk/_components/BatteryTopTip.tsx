import Link from 'next/link';
import { Battery, ExternalLink } from 'lucide-react';
import { applyAmazonAffiliateTag } from '@/lib/amazon';

const BLOG_HREF =
  '/posts/what-do-you-want-for-your-birthday-a-battery-bank-for-my-bedroom-to-help-save-the-planet';

type SearchLink = { label: string; query: string; note: string };

const SEARCHES: SearchLink[] = [
  {
    label: 'Portable power stations 1000Wh',
    query: 'portable power station 1000Wh',
    note: 'Sweet-spot capacity for shifting an evening peak',
  },
  {
    label: 'EcoFlow River 2 Max',
    query: 'EcoFlow River 2 Max',
    note: '~512Wh, often £200-£300',
  },
  {
    label: 'Bluetti EB55',
    query: 'Bluetti EB55',
    note: '537Wh LiFePO4, plug-and-play',
  },
];

function amazonSearchUrl(q: string): string {
  const url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}`;
  return applyAmazonAffiliateTag(url, 'GB');
}

export function BatteryTopTip() {
  return (
    <section className="rounded-2xl border-2 border-[#D2E369] bg-gray-950 shadow-xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Battery className="h-5 w-5 text-[#D2E369]" />
        <h2 className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#D2E369]">
          Top tip - a cheaper way to start
        </h2>
      </div>

      <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
        <p>
          A plug-in solar kit pays back faster if you also time-shift your
          evening peak - but you don&apos;t necessarily need to spend £1,000+
          on a dedicated home battery to get a good amount of benefit. A
          £100-£200 camping power station can soak up the excess your
          panels generate in the middle of the day (when no-one&apos;s home
          to use it), top up overnight on a cheap-rate tariff if needed,
          then run your TV, computer, games console (e.g. teenager&apos;s
          bedroom) during the 5-7pm peak - capturing most of the same
          saving as a full home battery.
        </p>
        <p>
          Plug-in solar systems can&apos;t sell power back to the grid, so
          any midday excess your panels produce while the house is empty is
          simply wasted. A small battery turns that wasted generation into
          ~30p-per-kWh of avoided peak-rate import - which is why storage
          is the single highest-value upgrade you can layer on top.
        </p>

        <blockquote className="border-l-2 border-[#D2E369]/60 pl-4 my-4 text-gray-300 italic">
          If just 5% of the UK&apos;s 28 million households shifted 1 kWh a
          day off the evening peak, that&apos;s 1.4 GWh moved daily and
          roughly 200-300 MW shaved during 5-7pm - the output of a small gas
          peaker plant, gone.{' '}
          <Link
            href={BLOG_HREF}
            className="not-italic text-[#D2E369] hover:text-[#E5F08A] underline"
          >
            Full write-up here
          </Link>
          .
        </blockquote>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-mono uppercase tracking-wider text-[#D2E369] mb-2">
          Cheap power stations on Amazon UK
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SEARCHES.map((s) => (
            <a
              key={s.label}
              href={amazonSearchUrl(s.query)}
              target="_blank"
              rel="nofollow sponsored noopener"
              className="group rounded-xl border border-[#D2E369]/20 bg-gray-900/50 p-3 hover:border-[#D2E369]/50 hover:bg-gray-900 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-[#FFF5E7] group-hover:text-[#D2E369]">
                  {s.label}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-[#D2E369] flex-shrink-0 mt-0.5" />
              </div>
              <p className="mt-1 text-xs text-gray-400 leading-snug">{s.note}</p>
            </a>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Search links - we earn a small commission on Amazon UK purchases at
          no extra cost to you.
        </p>
      </div>
    </section>
  );
}
