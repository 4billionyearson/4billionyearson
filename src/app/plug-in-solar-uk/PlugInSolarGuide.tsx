import {
  Sun,
  Scale,
  ListChecks,
  Sparkles,
  CalendarClock,
  Newspaper,
  ShoppingCart,
  HelpCircle,
  Wrench,
  TrendingUp,
  BookOpen,
  Info,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { QuickTLDR } from '@/app/_components/seo/QuickTLDR';
import { StaticFAQPanel } from '@/app/_components/seo/StaticFAQPanel';
import { StatusDashboard } from './_components/StatusDashboard';
import { RegulationTimeline } from './_components/RegulationTimeline';
import { ProductsTable } from './_components/ProductsTable';
import { PaybackCalculator } from './_components/PaybackCalculator';
import { BatteryCalculator } from './_components/BatteryCalculator';
import { DnoFinder } from './_components/DnoFinder';
import { NewsFeed } from './_components/NewsFeed';
import { LandlordLetter } from './_components/LandlordLetter';
import { AffiliateDisclosure } from './_components/AffiliateDisclosure';
import { HeroVerdict } from './_components/HeroVerdict';
import { HowItWorksDiagram } from './_components/HowItWorksDiagram';
import { LegalChecklist } from './_components/LegalChecklist';
import { MiniTimeline } from './_components/MiniTimeline';
import { PrimarySources } from './_components/PrimarySources';
import {
  HOW_IT_WORKS_PARAGRAPHS,
  PLUG_IN_VS_ROOFTOP,
  INSTALL_STEPS,
  PLUG_IN_SOLAR_FAQ,
  GLOSSARY,
} from './_data/static';
import type { PlugInSolarLiveData } from '@/lib/plug-in-solar/types';

/**
 * Server component that renders the entire page from the daily cached
 * payload. The data flows in from page.tsx so the page can SSR with
 * everything baked into HTML for AI / search crawlers.
 *
 * Layout:
 *  - Full-width hero (title + Today's TL;DR)
 *  - Full-width HeroVerdict ("5-second answer" cards + 800 W limit + mini timeline)
 *  - 2-column on lg+: left sticky Regulation timeline, right Status + What is +
 *    Is it legal + Regulations deep dive
 *  - Full-width: Products, Plug-in vs rooftop, Install, Calculators, SEG, DNO,
 *    Landlord, News, FAQ, Glossary, Sources
 */
export default function PlugInSolarGuide({
  data,
  source,
  cacheMiss,
}: {
  data: PlugInSolarLiveData | null;
  source: string;
  cacheMiss: boolean;
}) {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Combined title header + 5-second verdict ─── */}
          <header
            className="rounded-2xl border-2 border-[#D2E369] shadow-xl"
            style={{
              background:
                'linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)',
            }}
          >
            {/* Lime title band */}
            <div
              className="px-5 py-4 md:px-6 md:py-5 rounded-t-[14px]"
              style={{ backgroundColor: '#D2E369' }}
            >
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight text-[#2C5263]">
                UK Plug-in Solar Guide
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Sun className="h-5 w-5 text-[#2C5263]/80" />
                <p className="text-xs md:text-sm uppercase tracking-[0.25em] md:tracking-[0.3em] text-[#2C5263]/80 font-mono">
                  Daily-updated UK Status, Products &amp; Costs
                </p>
              </div>
            </div>
            {/* Dark body — 5-second verdict block */}
            <div className="bg-gray-950/95 backdrop-blur-md p-4 md:p-6 rounded-b-[14px]">
              <HeroVerdict data={data} />
            </div>
          </header>

          {/* ─── 10-second update: simplified timeline, today's verdict text, page intro ─── */}
          <section
            className="rounded-2xl border-2 border-[#D2E369] shadow-xl"
            style={{
              background:
                'linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)',
            }}
          >
            <div
              className="px-5 py-3 md:px-6 md:py-4 rounded-t-[14px]"
              style={{ backgroundColor: '#D2E369' }}
            >
              <h2 className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#2C5263] flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                The 10-second update
              </h2>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4 md:p-6 rounded-b-[14px] space-y-4">
              <MiniTimeline fullyAvailable={data?.fullyAvailableDate} />

              {data?.tldr ? (
                <QuickTLDR label="Today's verdict">{data.tldr}</QuickTLDR>
              ) : cacheMiss ? (
                <CacheMissPanel />
              ) : null}

              <p className="text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
                <span className="text-gray-300 font-semibold">About this page.</span> A daily-
                refreshed, impartial UK guide to plug-in solar (also called balcony solar or
                Balkonkraftwerk) covering the legal status, the kits you can actually buy today,
                prices and payback, and how to pair – or replace – panels with a battery on a
                smart tariff. We re-research the regulations, products and prices every morning
                using Gemini against primary UK sources (gov.uk, BSI, Ofgem, mainstream UK
                press) so the figures you see below are never more than 24 hours old. We are
                editorially independent: any retailer link is disclosed and never affects what
                we list or rank.
              </p>
            </div>
          </section>

          {/* ─── 2-column section: Timeline (sticky) | Status + What is + Legal + Regs ─── */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column - sticky regulation timeline (the user said this should be a key part of the page, higher up) */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-4 space-y-6">
                <Section icon={<CalendarClock className="h-5 w-5" />} title="Regulation timeline">
                  <RegulationTimeline
                    updates={data?.timelineUpdates}
                    fullyAvailable={data?.fullyAvailableDate}
                  />
                </Section>
              </div>
            </aside>

            {/* Right column - main editorial flow */}
            <div className="lg:col-span-2 space-y-6">

              {/* Status dashboard */}
              <Section icon={<ListChecks className="h-5 w-5" />} title="Where things stand today">
                <StatusDashboard pills={data?.statusDashboard} />
                {data?.changeLog && data.changeLog.length > 0 && (
                  <div className="mt-4 rounded-xl border border-[#D2E369]/30 bg-[#D2E369]/5 p-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#D2E369] mb-2">What changed since yesterday</h3>
                    <ul className="space-y-1.5 text-sm text-gray-300">
                      {data.changeLog.map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[#D2E369] font-mono text-xs whitespace-nowrap mt-0.5">{c.date}</span>
                          <span>{c.summary}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>

              {/* What is plug-in solar? (with diagram) */}
              <Section icon={<Sparkles className="h-5 w-5" />} title="What is plug-in solar?">
                <HowItWorksDiagram />
                <div className="mt-3 space-y-3 text-sm text-gray-300 leading-relaxed">
                  {HOW_IT_WORKS_PARAGRAPHS.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </Section>

              {/* Is it legal yet? - now with visual checklist + paragraph */}
              <Section icon={<Scale className="h-5 w-5" />} title="Is it legal in the UK yet?">
                <div className="space-y-4">
                  <LegalChecklist />
                  {data?.legalStatus ? (
                    <p className="text-sm text-gray-300 leading-relaxed">{data.legalStatus}</p>
                  ) : (
                    <RegeneratingNote />
                  )}
                </div>
              </Section>

              {/* Regulations deep dive */}
              <Section icon={<BookOpen className="h-5 w-5" />} title="Regulations deep dive">
                {data?.regulations ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <RegBlock title="BS 7671 Amendment 4" body={data.regulations.bs7671} />
                    <RegBlock title="G98 connect-and-notify" body={data.regulations.g98} />
                    <RegBlock title="BSI product standard" body={data.regulations.bsi} />
                    <RegBlock title="How the UK compares to Europe" body={data.regulations.eu} />
                  </div>
                ) : (
                  <RegeneratingNote />
                )}
              </Section>
            </div>
          </div>

          {/* ─── Products (moved up — buyers' guide first) ─── */}
          <Section
            icon={<ShoppingCart className="h-5 w-5" />}
            title="What can you buy in the UK today?"
            id="products"
          >
            <ProductsTable products={data?.products} />
          </Section>

          {/* ─── Plug-in vs rooftop decision panel ─── */}
          <Section icon={<TrendingUp className="h-5 w-5" />} title="Plug-in solar vs rooftop solar">
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              Plug-in solar is a great fit for some households and the wrong choice for others. If
              you own your roof, have an unshaded south-facing pitch, and use a lot of electricity,
              full rooftop solar will pay back faster per pound spent. Plug-in solar is the right
              answer if you rent, live in a flat or balcony, can't afford a £6,000+ install, or
              just want to dip a toe in.
            </p>
            <div className="overflow-hidden rounded-xl border border-[#D2E369]/30 bg-gray-950/60">
              <table className="w-full text-sm">
                <thead className="bg-[#D2E369]/5 border-b border-[#D2E369]/20">
                  <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-[#D2E369]">
                    <th className="px-4 py-3"></th>
                    <th className="px-4 py-3">Plug-in solar</th>
                    <th className="px-4 py-3">Full rooftop solar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {PLUG_IN_VS_ROOFTOP.map((row) => (
                    <tr key={row.question}>
                      <td className="px-4 py-3 align-top text-gray-400 font-medium">{row.question}</td>
                      <td className="px-4 py-3 align-top text-[#FFF5E7]">{row.plugIn}</td>
                      <td className="px-4 py-3 align-top text-gray-300">{row.rooftop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-gray-400">
              For full-roof solar costs, capacity, and SEG rates by country, see our{' '}
              <Link href="/energy-dashboard" className="text-[#D2E369] hover:text-[#E5F08A] underline">
                energy dashboard
              </Link>{' '}
              and{' '}
              <Link href="/energy-explained" className="text-[#D2E369] hover:text-[#E5F08A] underline">
                energy explainer
              </Link>.
            </p>
          </Section>

          {/* ─── Installation guide (now after the buyers' guide) ─── */}
          <Section icon={<Wrench className="h-5 w-5" />} title="Installation guide" id="install">
            <ol className="grid gap-3 md:grid-cols-2">
              {INSTALL_STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-[#D2E369]/20 bg-gray-900/40 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D2E369] bg-[#D2E369]/10 text-[#D2E369] font-mono text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#FFF5E7]">{step.title}</h3>
                    <p className="mt-0.5 text-sm text-gray-300 leading-relaxed">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* ─── Calculators stacked full-width (Payback was wasting space when paired) ─── */}
          <div id="payback" className="scroll-mt-6 md:scroll-mt-8 space-y-6">
            <PaybackCalculator prices={data?.prices} />
            <BatteryCalculator prices={data?.prices} />
          </div>

          {/* ─── SEG status + DNO finder side-by-side on desktop ─── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Section icon={<Info className="h-5 w-5" />} title="Smart Export Guarantee: will you get paid?">
              {data?.segStatus ? (
                <p className="text-sm text-gray-300 leading-relaxed">{data.segStatus}</p>
              ) : (
                <RegeneratingNote />
              )}
            </Section>
            <DnoFinder />
          </div>

          {/* ─── Landlord letter ─── */}
          <LandlordLetter />

          {/* ─── News feed ─── */}
          <Section icon={<Newspaper className="h-5 w-5" />} title="Latest UK plug-in solar news" id="news">
            <NewsFeed items={data?.news} />
          </Section>

          {/* ─── FAQ ─── */}
          <StaticFAQPanel
            headingId="plug-in-solar-faq"
            title="Frequently asked questions"
            qa={PLUG_IN_SOLAR_FAQ}
            className="bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-2xl shadow-xl border-2 border-[#D2E369]"
          />

          {/* ─── Glossary ─── */}
          <Section icon={<HelpCircle className="h-5 w-5" />} title="Glossary">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GLOSSARY.map((g) => (
                <div key={g.term} className="rounded-xl border border-gray-800 bg-gray-900/40 p-3">
                  <dt className="text-sm font-semibold text-[#FFF5E7]">{g.term}</dt>
                  <dd className="mt-1 text-xs text-gray-300 leading-relaxed">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* ─── Primary UK sources (always visible) ─── */}
          <Section icon={<BookOpen className="h-5 w-5" />} title="Primary UK sources">
            <PrimarySources />
          </Section>

          {/* ─── Today's grounding citations (Gemini's Google Search) ─── */}
          {data?.groundingSources && data.groundingSources.length > 0 && (
            <Section
              icon={<BookOpen className="h-5 w-5" />}
              title="Today's grounding citations"
            >
              <p className="text-sm text-gray-400 mb-3">
                The additional pages Gemini's Google Search grounding consulted for today's
                refresh. Official UK sources are listed first; trade press and other secondary
                sources follow.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.groundingSources.map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-400 hover:text-[#D2E369] transition-colors flex items-start gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{s.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* ─── Editorial independence ─── */}
          <AffiliateDisclosure variant="footer" />
        </div>
      </div>
    </main>
  );
}

/* ─── Re-usable section wrapper ──────────────────────────────────────────── */

function Section({
  icon,
  title,
  children,
  id,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 md:scroll-mt-8 rounded-2xl border-2 border-[#D2E369] shadow-xl"
      style={{
        background:
          'linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)',
      }}
    >
      <div
        className="px-5 py-3 md:px-6 md:py-4 rounded-t-[14px]"
        style={{ backgroundColor: '#D2E369' }}
      >
        <h2 className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#2C5263] flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </div>
      <div className="bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-b-[14px]">
        {children}
      </div>
    </section>
  );
}

function RegBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#D2E369]/20 bg-gray-900/40 p-4">
      <h3 className="text-sm font-semibold text-[#D2E369] mb-1.5">{title}</h3>
      <p className="text-sm text-gray-300 leading-relaxed">{body}</p>
    </div>
  );
}

function RegeneratingNote() {
  return (
    <div className="rounded-xl border border-[#D2E369]/30 bg-[#D2E369]/5 px-4 py-3">
      <p className="text-sm text-gray-300">
        Today's update is being generated. The static guide below the calculator is already
        up to date - refresh the page in a few seconds for the latest legal-status text.
      </p>
    </div>
  );
}

function CacheMissPanel() {
  return (
    <div className="rounded-xl border border-[#D2E369]/40 bg-[#D2E369]/5 px-4 py-3">
      <p className="text-sm font-medium text-[#FFF5E7]">A fresh daily update is being prepared…</p>
      <p className="mt-1 text-sm text-gray-300">
        Today's status, prices and product list are being pulled together by Gemini in the
        background. The legal framework, install guide, calculators and FAQs below are already up
        to date. Refresh in 5-10 seconds for the live update.
      </p>
    </div>
  );
}
