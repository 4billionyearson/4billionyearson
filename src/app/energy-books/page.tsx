import { Metadata } from "next";
import { BookOpen, Star, ExternalLink } from "lucide-react";
import { getCountryCode, amazonUrl } from "@/lib/amazon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Best Renewable Energy Books | 4 Billion Years On",
  description:
    "Recommended books on renewable energy, the clean energy transition, and sustainable power – from expert authors and bestselling titles.",
  openGraph: {
    title: "Best Renewable Energy Books | 4 Billion Years On",
    description:
      "Recommended books on renewable energy, the clean energy transition, and sustainable power – from expert authors and bestselling titles.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
};

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
    title: "The Price Is Wrong",
    author: "Brett Christophers",
    year: 2024,
    asin: "1804290785",
    cover: "ETPBEAAAQBAJ",
    rating: "4.5",
    curatorNote: "Brett Christophers tackles the economic barriers hindering the rapid deployment of renewables. Understanding that capital, not just technology, limits the clean energy transition is a core lesson in our data models.",
    reviewHighlights: [
      "Praised for puncturing the myth that 'cheap renewables' will automatically solve the climate crisis via free markets.",
      "Considered a sobering but essential read about electricity pricing and utilities."
    ],
    bestFor: ["Economists", "Policy makers", "Energy analysts"],
    dataConnection: {
      text: "Compare these economic headwinds against actual renewable deployment charts.",
      link: "/energy-dashboard"
    }
  },
  {
    title: "Volt Rush",
    author: "Henry Sanderson",
    year: 2023,
    asin: "0861544692",
    cover: "aZlZEAAAQBAJ",
    rating: "4.4",
    curatorNote: "Sanderson investigates the geopolitical scramble for battery metals. This highlights the physical limitations of scaling our energy storage infrastructure to meet global demand.",
    reviewHighlights: [
      "Appreciated for moving beyond vague 'green' promises to the gritty reality of mining.",
      "Noted for its exceptional, on-the-ground investigative journalism."
    ],
    bestFor: ["Supply chain analysts", "Geopolitics students", "EV enthusiasts"],
    dataConnection: {
      text: "Track the growth in electric vehicles versus the expansion of global grids.",
      link: "/energy-dashboard"
    }
  },
  {
    title: "How the World Really Works",
    author: "Vaclav Smil",
    year: 2022,
    asin: "0241454409",
    cover: "G3EszgEACAAJ",
    rating: "4.5",
    curatorNote: "Smil cuts through the hype to map the physical realities of energy density. His insistence on grounded, data-driven analysis makes this book effectively a manual for our dashboard methodology.",
    reviewHighlights: [
      "Universally loved for its unflinching, hyper-rational breakdown of energy usage.",
      "Readers praise the detailed chapters on modern dependence on cement, steel, plastics, and ammonia."
    ],
    bestFor: ["Engineers", "Realists", "Data scientists"],
    dataConnection: {
      text: "View the raw numbers behind global power production.",
      link: "/energy-dashboard"
    }
  },
  {
    title: "Electrify",
    author: "Saul Griffith",
    year: 2021,
    asin: "0262046237",
    cover: "ALVCEAAAQBAJ",
    rating: "4.5",
    curatorNote: "Saul Griffith outlines a massive, optimistic engineering sprint to decarbonize using existing tech. It represents exactly the kind of planetary-scale pivot required in the next epoch of history.",
    reviewHighlights: [
      "Commended for its incredibly optimistic, action-oriented tone.",
      "Valued as a practical blueprint full of detailed schematics for upgrading infrastructure."
    ],
    bestFor: ["Optimists", "Engineers", "City planners"],
    dataConnection: {
      text: "Track the transition progress toward 100% renewable generation.",
      link: "/energy-dashboard"
    }
  },
  {
    title: "The New Map",
    author: "Daniel Yergin",
    year: 2020,
    asin: "0141994886",
    cover: "5G_XDwAAQBAJ",
    rating: "4.5",
    curatorNote: "Yergin maps out how energy reshapes global geopolitics. Understanding the shift from a fossil-fuel map to a renewable map is key to interpreting international relations going forward.",
    reviewHighlights: [
      "Called the definitive guide to modern energy geopolitics post-shale revolution.",
      "Praised for balancing the rise of China, US independence, and the climate transition."
    ],
    bestFor: ["Political scientists", "Historians", "Investors"],
    dataConnection: {
      text: "Explore how energy production breaks down across global superpowers.",
      link: "/energy-rankings"
    }
  },
  {
    title: "Superpower",
    author: "Ross Garnaut",
    year: 2019,
    asin: "1760875651",
    cover: "KPiPDwAAQBAJ",
    rating: "4.4",
    curatorNote: "Garnaut charts how vast landscapes of sun and wind alter natural economic advantages. It demonstrates how geographical anomalies we track translate directly into economic power.",
    reviewHighlights: [
      "Highly regarded as a brilliant economic case study on leveraging natural resources.",
      "Though Australia-focused, readers note the principles apply globally to sunny nations."
    ],
    bestFor: ["Economists", "Regional planners", "Solar advocates"],
    dataConnection: {
      text: "Compare relative solar and wind outputs across leading nations.",
      link: "/energy-rankings"
    }
  },
  {
    title: "Drawdown",
    author: "Paul Hawken",
    year: 2017,
    asin: "0143130447",
    cover: "uvtlDgAAQBAJ",
    rating: "4.6",
    curatorNote: "Drawdown ranks the numerical impact of 100 different climate solutions. This exact kind of multi-variable quantification underscores why data visualization is critical to climate action.",
    reviewHighlights: [
      "Loved for turning climate advocacy into an incredibly well-organized, ranked list.",
      "Readers appreciate the inclusion of unexpected models like family planning or regenerative agriculture."
    ],
    bestFor: ["Activists", "General audiences", "Sustainability officers"],
    dataConnection: {
      text: "Track the overarching metrics these localized solutions are meant to improve.",
      link: "/climate-dashboard"
    }
  },
  {
    title: "Energy and Civilization",
    author: "Vaclav Smil",
    year: 2017,
    asin: "0262536161",
    cover: "Br74DwAAQBAJ",
    rating: "4.4",
    curatorNote: "Smil tracks human progress entirely through the lens of energy capture—from muscle to coal to solar. This sweeping historical view is foundational to the concept of deep time evolution.",
    reviewHighlights: [
      "Considered the ultimate encyclopedic history of prime movers and horsepower.",
      "Found extremely dense but mathematically rigorous and unparalleled in scope."
    ],
    bestFor: ["Anthropologists", "History teachers", "Engineers"],
    dataConnection: {
      text: "Trace modern energy generation back to its diverse root sources.",
      link: "/energy-dashboard"
    }
  },
  {
    title: "The Grid",
    author: "Gretchen Bakke",
    year: 2016,
    asin: "1632863324",
    cover: "https://books.google.com/books/content?id=dTbbCwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    rating: "4.3",
    curatorNote: "Bakke clarifies how transforming our power grids is the prerequisite for a renewable era. We view the grid not just as infrastructure, but as humanity’s largest physical machine.",
    reviewHighlights: [
      "Praised for making utility management and alternating current history genuinely entertaining.",
      "Cited as the perfect clarifier for why simply 'building more solar panels' isn't enough."
    ],
    bestFor: ["Urban planners", "Tech historians", "Policy advocates"],
    dataConnection: {
      text: "Compare modern grid output to historical baseload demand curves.",
      link: "/energy-dashboard"
    }
  },
  {
    title: "The Switch",
    author: "Chris Goodall",
    year: 2016,
    asin: "1781255245",
    cover: "QWz4CgAAQBAJ",
    rating: "4.3",
    curatorNote: "Goodall tracks the economics making solar power an inevitability. Anticipating these exponential cost drops is critical to projecting our energy transition timelines.",
    reviewHighlights: [
      "Appreciated for predicting the massive solar price drops that defined later years.",
      "Noted for clear explanations on the necessity of diverse storage technologies."
    ],
    bestFor: ["Investors", "Solar enthusiasts", "Optimists"],
    dataConnection: {
      text: "Look at the exponential rise in solar PV deployment over the last decade.",
      link: "/energy-dashboard"
    }
  },
  {
    title: "Windfall",
    author: "McKenzie Funk",
    year: 2014,
    asin: "0143126598",
    cover: "X-dvDwAAQBAJ",
    rating: "4.2",
    curatorNote: "By exploring how investors intend to profit off a warming world, Funk reveals the darker side of energy transitions. Watching where capital flows clarifies future development.",
    reviewHighlights: [
      "Valued for its unique, unsentimental angle examining the 'climate capitalism' industry.",
      "Described as deeply engaging travelogue journalism mixed with financial investigation."
    ],
    bestFor: ["Finance professionals", "Journalism nerds", "Realists"],
    dataConnection: {
      text: "See the shifting dynamics of sea levels and extreme temperatures.",
      link: "/extreme-weather"
    }
  },
  {
    title: "Sustainable Energy – Without the Hot Air",
    author: "David JC MacKay",
    year: 2009,
    asin: "0954452933",
    cover: "Ps7JEAAAQBAJ",
    rating: "4.6",
    curatorNote: "MacKay's insistence on basic arithmetic cuts out political rhetoric in favor of pure feasibility. Building models on strict math is the cornerstone of our visualization ethos.",
    reviewHighlights: [
      "Hailed as the gold standard for back-of-the-envelope energy physics.",
      "Revered for its completely neutral, relentlessly logical dismantling of energy myths."
    ],
    bestFor: ["Physicists", "Mathematicians", "Logical thinkers"],
    dataConnection: {
      text: "Apply MacKay’s logic to our interactive energy mix dashboards.",
      link: "/energy-dashboard"
    }
  }
];

function coverUrl(cover: string) {
  if (cover.startsWith("http://") || cover.startsWith("https://")) {
    return cover;
  }
  return `https://books.google.com/books/content?id=${cover}&printsec=frontcover&img=1&zoom=1`;
}

export default async function EnergyBooksPage() {
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
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5 rounded-t-[14px]" style={{ backgroundColor: "#D2E369" }}>
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight text-[#2C5263]">Renewable Energy Books</h1>
              <div className="flex items-center gap-2 mt-3">
                <BookOpen className="h-5 w-5 text-[#2C5263]/80" />
                <p className="text-sm uppercase tracking-[0.3em] text-[#2C5263]/80 font-mono">Recommended Reading</p>
              </div>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-5 py-4 md:px-6 md:py-5">
              <p className="text-sm md:text-lg font-medium max-w-3xl text-gray-300">
                The best books on renewable energy, grid transformation, and the clean power revolution. Essential reading for understanding the energy transition.
              </p>
            </div>
          </div>

          {/* Books list */}
          <div className="space-y-8">
            {BOOKS.map((book) => (
              <section
                key={book.asin}
                className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D2E369]/40 hover:border-[#D2E369] transition-colors"
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
                      className="w-full text-center bg-[#D2E369] text-[#2C5263] font-bold py-2 px-4 rounded-xl hover:bg-[#C2D35A] transition-colors flex items-center justify-center gap-2"
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
                            <p className="text-[#D2E369] font-bold text-sm uppercase tracking-wide">Why this matters</p>
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
