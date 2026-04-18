import { Metadata } from "next";
import { BookOpen, Star, ExternalLink } from "lucide-react";
import { getCountryCode, amazonUrl } from "@/lib/amazon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Best Climate Change Books | 4 Billion Years On",
  description:
    "Recommended books on climate change, global warming, and the environment – from bestselling authors and leading scientists. Curated for curious minds.",
  openGraph: {
    title: "Best Climate Change Books | 4 Billion Years On",
    description:
      "Recommended books on climate change, global warming, and the environment – from bestselling authors and leading scientists.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
};

/* ─── Data ────────────────────────────────────────────────────────────────── */

interface Book {
  title: string;
  author: string;
  year: number;
  asin: string;
  cover: string;
  rating: string;
  curatorNote: string;
  reviewHighlights: string[];
  bestFor: string[];
  dataConnection: {
    text: string;
    link: string;
  };
}

const BOOKS: Book[] = [
  {
    title: "Not the End of the World",
    author: "Hannah Ritchie",
    year: 2024,
    asin: "0593492544",
    cover: "xua8EAAAQBAJ",
    rating: "4.5",
    curatorNote: "Hannah Ritchie leverages data to cut through climate doom. This highly quantitative, progress-oriented perspective aligns perfectly with our dashboard approach to tracking planetary boundaries.",
    reviewHighlights: [
      "Praised for substituting environmental anxiety with actionable, data-proven optimism.",
      "Readers love the clear charts and systemic breakdown of global emissions."
    ],
    bestFor: ["Data analysts", "Eco-optimists", "Educators"],
    dataConnection: {
      text: "Compare Ritchie's optimism with our live planetary boundaries data.",
      link: "/planetary-boundaries"
    }
  },
  {
    title: "The Parrot and the Igloo",
    author: "David Lipsky",
    year: 2023,
    asin: "0393866742",
    cover: "1yFG0AEACAAJ",
    rating: "4.6",
    curatorNote: "Understanding the history of climate denial is critical to understanding why our collective response has been delayed. Lipsky's history traces the social forces that stalled climate action for decades.",
    reviewHighlights: [
      "Lauded for its shockingly funny, darkly humorous tone despite the grim subject matter.",
      "Called an essential history of how doubt was manufactured."
    ],
    bestFor: ["History buffs", "Activists", "Journalists"],
    dataConnection: {
      text: "See the historical carbon emissions tracing back through the 20th century.",
      link: "/emissions"
    }
  },
  {
    title: "How to Avoid a Climate Disaster",
    author: "Bill Gates",
    year: 2021,
    asin: "0593215776",
    cover: "qmuTEAAAQBAJ",
    rating: "4.5",
    curatorNote: "Bill Gates breaks down the technological and engineering hurdles needed to reach 'net zero'. A crucial read for understanding the physical limits we track in our climate and energy dashboards.",
    reviewHighlights: [
      "Appreciated for breaking emission sources into 'how we plug in, make things, grow things, get around, and keep cool.'",
      "Noted as a highly practical, non-partisan engineering roadmap."
    ],
    bestFor: ["Engineers", "Entrepreneurs", "Policy makers"],
    dataConnection: {
      text: "Track global progress on shifting power grids away from fossil fuels.",
      link: "/energy-dashboard"
    }
  },
  {
    title: "The New Climate War",
    author: "Michael E. Mann",
    year: 2021,
    asin: "1541758234",
    cover: "UdqCzQEACAAJ",
    rating: "4.5",
    curatorNote: "Michael Mann shifts the focus from personal carbon footprints (a concept invented by oil companies) to systemic change. This maps to our philosophy of looking at planetary-scale trends rather than localized guilt.",
    reviewHighlights: [
      "Praised for calling out corporate deflection tactics.",
      "Empowers readers to focus on voting and systemic change rather than just recycling."
    ],
    bestFor: ["Political advocates", "Scientists", "Environmentalists"],
    dataConnection: {
      text: "Explore the systemic emissions data by country and corporation.",
      link: "/climate-dashboard"
    }
  },
  {
    title: "Under a White Sky",
    author: "Elizabeth Kolbert",
    year: 2021,
    asin: "0593136276",
    cover: "sMweEAAAQBAJ",
    rating: "4.3",
    curatorNote: "Kolbert examines the techno-fixes—from geoengineering to gene drives—proposed to save the planet. This highlights the growing convergence of two of our pillars: Biotech and Climate.",
    reviewHighlights: [
      "Commended for its dry wit and sobering exploration of 'interventions into interventions.'",
      "Readers cite the chapters on solar geoengineering as particularly eye-opening."
    ],
    bestFor: ["Tech skeptics", "Bioengineers", "Ecology students"],
    dataConnection: {
      text: "Track extreme weather events potentially mitigated by geoengineering.",
      link: "/extreme-weather"
    }
  },
  {
    title: "The Ministry for the Future",
    author: "Kim Stanley Robinson",
    year: 2020,
    asin: "0316300136",
    cover: "VHZGzQEACAAJ",
    rating: "4.1",
    curatorNote: "Though fiction, this novel is the defining vision of climate geopolitics. Its imagining of 'carbon coin' economics and wet-bulb temperatures gives narrative flesh to the pure data points we measure.",
    reviewHighlights: [
      "Frequently cited as the most realistic near-future sci-fi regarding the climate crisis.",
      "Noted for its terrifyingly plausible opening chapter on lethal heat waves."
    ],
    bestFor: ["Sci-fi readers", "Economists", "Climate diplomats"],
    dataConnection: {
      text: "View real-time anomalies in global temperature shifts.",
      link: "/climate-dashboard"
    }
  },
  {
    title: "The Uninhabitable Earth",
    author: "David Wallace-Wells",
    year: 2019,
    asin: "0525576711",
    cover: "HWbRDwAAQBAJ",
    rating: "4.5",
    curatorNote: "A stark, unvarnished look at the compounding consequences of warming. It serves as a stark reminder of why the 'danger zones' in our planetary boundaries models must not be crossed.",
    reviewHighlights: [
      "Described as deeply terrifying and effective at shaking readers out of complacency.",
      "Praised for heavily relying on consensus science to portray the worst-case scenarios."
    ],
    bestFor: ["Realists", "Journalists", "Risk analysts"],
    dataConnection: {
      text: "View the cascading effects of sea level rise and ice melt.",
      link: "/sea-levels-ice"
    }
  },
  {
    title: "Losing Earth",
    author: "Nathaniel Rich",
    year: 2019,
    asin: "1250234271",
    cover: "BLVuDwAAQBAJ",
    rating: "4.3",
    curatorNote: "Rich chronicles the lost decade of the 1980s when we possessed the data to stop climate change but lacked the political will. A tragic case study in what happens when data is ignored.",
    reviewHighlights: [
      "Called a frustrating, essential read about political cowardice.",
      "Readers appreciate the deep archival dive into early, accurate climate models."
    ],
    bestFor: ["Historians", "Energy analysts", "Public policy students"],
    dataConnection: {
      text: "Look at greenhouse gas accumulations starting from the 1980s.",
      link: "/greenhouse-gases"
    }
  },
  {
    title: "The Sixth Extinction",
    author: "Elizabeth Kolbert",
    year: 2014,
    asin: "1250062187",
    cover: "vi-loAEACAAJ",
    rating: "4.5",
    curatorNote: "Placing anthropogenic climate change in the context of the previous five mass extinctions perfectly captures the 'Deep Time' ethos of 4 Billion Years On.",
    reviewHighlights: [
      "Universally acclaimed for combining field journalism with paleontology.",
      "Won the Pulitzer Prize for its exceptional clarity on biodiversity loss."
    ],
    bestFor: ["Paleontologists", "Conservationists", "Nature lovers"],
    dataConnection: {
      text: "Cross-reference species loss against current planetary boundaries.",
      link: "/planetary-boundaries"
    }
  },
  {
    title: "This Changes Everything",
    author: "Naomi Klein",
    year: 2014,
    asin: "1451697392",
    cover: "Vh9ICgAAQBAJ",
    rating: "4.4",
    curatorNote: "Naomi Klein frames climate mitigation as fundamentally incompatible with deregulated capitalism. This economic lens provides a vital counter-argument to purely technological solutions.",
    reviewHighlights: [
      "Praised for its systemic critique of global trade and resource extraction.",
      "Noted as the quintessential text of the modern climate justice movement."
    ],
    bestFor: ["Activists", "Sociologists", "Anti-capitalism advocates"],
    dataConnection: {
      text: "Examine the correlation between global GDP and carbon output.",
      link: "/climate-dashboard"
    }
  }
];

function coverUrl(gbid: string) {
  return `https://books.google.com/books/content?id=${gbid}&printsec=frontcover&img=1&zoom=1`;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function ClimateBooksPage() {
  const countryCode = await getCountryCode();
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": BOOKS.map((book, index) => ({
      "@type": "Product",
      "position": index + 1,
      "name": book.title,
      "author": { "@type": "Person", "name": book.author },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": book.rating,
        "bestRating": "5"
      }
    }))
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D0A65E] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5 rounded-t-[14px]" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight text-[#FFF5E7]">Climate Change Books</h1>
              <div className="flex items-center gap-2 mt-3">
                <BookOpen className="h-5 w-5 text-[#FFF5E7]/80" />
                <p className="text-sm uppercase tracking-[0.3em] text-[#FFF5E7]/80 font-mono">Recommended Reading</p>
              </div>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-5 py-4 md:px-6 md:py-5">
              <p className="text-sm md:text-lg font-medium max-w-3xl text-gray-300">
                Essential books on climate change, from the science of global warming to the politics of action. Handpicked titles with outstanding reviews from readers worldwide.
              </p>
            </div>
          </div>

          {/* Books list */}
          <div className="space-y-8">
            {BOOKS.map((book) => (
              <section
                key={book.asin}
                className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]/40 hover:border-[#D0A65E] transition-colors"
              >
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  {/* Book Cover and Amazon CTA */}
                  <div className="flex flex-col items-center gap-4 md:w-1/3 flex-shrink-0">
                    <img
                      src={coverUrl(book.cover)}
                      alt={`${book.title} by ${book.author}`}
                      className="w-32 md:w-48 h-auto object-contain rounded-lg shadow-xl"
                      loading="lazy"
                    />
                    <a
                      href={amazonUrl(book.title, book.author, countryCode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center bg-[#D0A65E] text-white font-bold py-2 px-4 rounded-xl hover:bg-[#B38D4F] transition-colors flex items-center justify-center gap-2"
                    >
                      Buy on Amazon <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{book.title}</h2>
                      <p className="text-lg text-gray-400 font-medium">{book.author} · {book.year}</p>
                      
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm text-amber-400 font-semibold">{book.rating}</span>
                        <span className="text-sm text-gray-500 ml-1">Rating</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm tracking-widest uppercase text-gray-500 font-bold mb-2">Curator&apos;s Note</h3>
                        <p className="text-gray-300 leading-relaxed">{book.curatorNote}</p>
                      </div>

                      <div>
                        <h3 className="text-sm tracking-widest uppercase text-gray-500 font-bold mb-2">Review Highlights</h3>
                        <ul className="list-disc list-outside ml-4 text-gray-300 space-y-1">
                          {book.reviewHighlights.map((highlight, i) => (
                            <li key={i}>{highlight}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-sm tracking-widest uppercase text-gray-500 font-bold mr-2 self-center">Best For:</span>
                        {book.bestFor.map((tag, i) => (
                          <span key={i} className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-700">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6 p-4 rounded-xl bg-gray-900 border border-gray-800">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <p className="text-[#D0A65E] font-bold text-sm uppercase tracking-wide">Why this matters</p>
                            <p className="text-gray-300 text-sm mt-1">{book.dataConnection.text}</p>
                          </div>
                          <a href={book.dataConnection.link} className="text-sm text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-center transition-colors border border-gray-600 whitespace-nowrap">
                            View Data &rarr;
                          </a>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <p className="text-xs text-gray-500 text-center pt-8">
            As an Amazon Associate, I earn from qualifying purchases.
          </p>

        </div>
      </div>
    </main>
  );
}
