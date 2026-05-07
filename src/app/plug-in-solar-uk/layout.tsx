import type { Metadata } from 'next';
import { getCached } from '@/lib/climate/redis';
import type { PlugInSolarLiveData } from '@/lib/plug-in-solar/types';
import { PLUG_IN_SOLAR_FAQ } from './_data/static';
import { INSTALL_STEPS } from './_data/static';

const URL = 'https://4billionyearson.org/plug-in-solar-uk';

export const metadata: Metadata = {
  title: 'UK Plug-in Solar Guide 2026: Legal Status, Best Kits, Costs & Batteries',
  description:
    'A daily-updated impartial UK guide to plug-in solar (balcony solar, DIY solar). Current legal status under BS 7671 Amendment 4, the BSI product standard, what kits you can buy now (EcoFlow, Lidl, Anker, Growatt), an interactive payback calculator powered by PVGIS, three-track battery economics on Octopus Flux, a postcode-to-DNO finder, a landlord letter template and the latest news.',
  keywords: [
    'plug-in solar UK',
    'plug-in solar legal UK',
    'balcony solar UK',
    'BS 7671 Amendment 4',
    'BSI plug-in solar standard',
    'G98 solar notification',
    '800W solar UK',
    'EcoFlow STREAM UK',
    'Lidl plug-in solar',
    'Anker SOLIX plug-in',
    'Growatt NOAH UK',
    'plug-in solar payback',
    'Octopus Flux battery',
    'Smart Export Guarantee plug-in solar',
    'home battery UK',
    'plug-in solar renters',
    'Renters Rights Act 2025',
    'PVGIS UK postcode',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'article',
    url: URL,
    title: 'UK Plug-in Solar Guide 2026 — Legal Status, Kits, Payback & Batteries',
    description:
      'A daily-updated impartial UK guide to plug-in solar: current legal status, available kits, postcode-accurate payback, and the economics of pairing (or replacing) it with a battery.',
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UK Plug-in Solar Guide 2026',
    description:
      'Daily-updated UK plug-in solar guide: legal status, kits, payback, batteries, DNO finder.',
  },
};

const CACHE_KEY_PREFIX = 'plug-in-solar-uk';
const CACHE_VERSION = 'v4';
const LOOKBACK_DAYS = 7;

function dateOffsetKey(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return `${CACHE_KEY_PREFIX}:${d.toISOString().slice(0, 10)}-${CACHE_VERSION}`;
}

async function readMostRecent(): Promise<PlugInSolarLiveData | null> {
  for (let i = 0; i <= LOOKBACK_DAYS; i++) {
    const cached = await getCached<PlugInSolarLiveData>(dateOffsetKey(i));
    if (cached) return cached;
  }
  return null;
}

export default async function PlugInSolarLayout({ children }: { children: React.ReactNode }) {
  const cached = await readMostRecent();
  const dateModified = cached?.generatedAt ?? new Date().toISOString();

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'UK Plug-in Solar Guide 2026: Legal Status, Best Kits, Costs & Batteries',
    description:
      'A daily-updated impartial UK guide to plug-in solar: legal status under BS 7671 Amendment 4, available kits, payback economics, batteries with or without solar, DNO notification, and a landlord letter template.',
    url: URL,
    datePublished: '2026-04-15',
    dateModified,
    author: { '@type': 'Organization', name: '4 Billion Years On', url: 'https://4billionyearson.org' },
    publisher: {
      '@type': 'Organization',
      name: '4 Billion Years On',
      url: 'https://4billionyearson.org',
      logo: { '@type': 'ImageObject', url: 'https://4billionyearson.org/logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': URL },
    inLanguage: 'en-GB',
    image: `${URL}/opengraph-image`,
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PLUG_IN_SOLAR_FAQ.map((q) => ({
      '@type': 'Question',
      name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: q.aText },
    })),
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to install plug-in solar in the UK',
    description: 'Step-by-step guide to safely installing an 800 W plug-in solar system in a UK home, in line with BS 7671 Amendment 4 (2026) and the G98 distribution code.',
    totalTime: 'PT2H',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'GBP', value: '500' },
    supply: [
      { '@type': 'HowToSupply', name: 'Plug-in solar kit (panel + micro-inverter + cable)' },
      { '@type': 'HowToSupply', name: 'Mounting brackets (balcony rail / wall / ground frame)' },
    ],
    tool: [{ '@type': 'HowToTool', name: 'Basic hand tools' }],
    step: INSTALL_STEPS.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.detail,
      url: `${URL}#install`,
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://4billionyearson.org' },
      { '@type': 'ListItem', position: 2, name: 'Renewable Energy', item: 'https://4billionyearson.org/energy-explained' },
      { '@type': 'ListItem', position: 3, name: 'UK Plug-in Solar Guide', item: URL },
    ],
  };

  const productSchemas = (cached?.products ?? []).slice(0, 8).map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.brand} ${p.model}`,
    brand: { '@type': 'Brand', name: p.brand },
    description: `${p.wattsAC} W AC plug-in solar kit. ${p.notes ?? ''}`.trim(),
    offers: {
      '@type': 'Offer',
      url: p.url,
      priceCurrency: 'GBP',
      price: Math.round(p.priceGBP),
      availability:
        p.retailer.toLowerCase().includes('coming') || p.retailer.toLowerCase().includes('soon')
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: p.retailer },
    },
  }));

  const newsSchemas = (cached?.news ?? []).slice(0, 8).map((n) => ({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: n.headline,
    datePublished: n.date,
    description: n.summary,
    url: n.sourceUrl,
    publisher: { '@type': 'Organization', name: n.sourceTitle },
    isBasedOn: n.sourceUrl,
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {productSchemas.map((schema, i) => (
        <script
          key={`product-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {newsSchemas.map((schema, i) => (
        <script
          key={`news-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
