import { Metadata } from "next";
import { BookOpen, Star, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Best Climate Change Books | 4 Billion Years On",
  description:
    "Recommended books on climate change, global warming, and the environment – from bestselling authors and leading scientists. Curated for curious minds.",
  openGraph: {
    title: "Best Climate Change Books | 4 Billion Years On",
    description:
      "Recommended books on climate change, global warming, and the environment – from bestselling authors and leading scientists.",
  },
};

/* ─── Data ────────────────────────────────────────────────────────────────── */

const AFFILIATE_TAG = "idcrnoimamanu-21";

interface Book {
  title: string;
  author: string;
  year: number;
  asin: string;
  cover: string;
  rating: string;
  description: string;
}

const BOOKS: Book[] = [
  {
    title: "Not the End of the World",
    author: "Hannah Ritchie",
    year: 2024,
    asin: "0593492544",
    cover: "Xd9YEAAAQBAJ",
    rating: "4.5",
    description:
      "Our World in Data lead researcher Hannah Ritchie makes a data-driven case for optimism. She shows that on many environmental measures – deforestation, air pollution, ozone – things are getting better, while laying out what still needs to change on climate.",
  },
  {
    title: "The Parrot and the Igloo",
    author: "David Lipsky",
    year: 2023,
    asin: "0393866742",
    cover: "eGSNEAAAQBAJ",
    rating: "4.6",
    description:
      "A sweeping, darkly funny history of climate denial in America. Lipsky traces how the science of global warming was understood for over a century – and how industries, politicians, and media conspired to make the public doubt what scientists knew.",
  },
  {
    title: "How to Avoid a Climate Disaster",
    author: "Bill Gates",
    year: 2021,
    asin: "0593215776",
    cover: "qmuTEAAAQBAJ",
    rating: "4.5",
    description:
      "Bill Gates outlines a practical plan for reaching zero greenhouse gas emissions. Covering energy production, manufacturing, agriculture, and transport, he explains the technology breakthroughs we need and the steps governments, businesses, and individuals can take.",
  },
  {
    title: "The New Climate War",
    author: "Michael E. Mann",
    year: 2021,
    asin: "1541758234",
    cover: "UdqCzQEACAAJ",
    rating: "4.5",
    description:
      "Leading climate scientist Michael Mann exposes how fossil fuel interests have shifted from outright denial to more insidious tactics – deflection, division, and delay. He charts a path forward for collective action against the climate crisis.",
  },
  {
    title: "Under a White Sky",
    author: "Elizabeth Kolbert",
    year: 2021,
    asin: "0593136276",
    cover: "sMweEAAAQBAJ",
    rating: "4.3",
    description:
      "The Pulitzer Prize–winning author of The Sixth Extinction investigates whether humanity can solve the environmental problems it has created. Kolbert travels the world examining radical interventions – gene drives, carbon capture, and solar geoengineering.",
  },
  {
    title: "The Ministry for the Future",
    author: "Kim Stanley Robinson",
    year: 2020,
    asin: "0316300136",
    cover: "VHZGzQEACAAJ",
    rating: "4.1",
    description:
      "A gripping near-future novel set in a world ravaged by climate change. Robinson imagines a UN body tasked with advocating for future generations, weaving together politics, science, economics, and human drama into a visionary blueprint for survival.",
  },
  {
    title: "The Uninhabitable Earth",
    author: "David Wallace-Wells",
    year: 2019,
    asin: "0525576711",
    cover: "HWbRDwAAQBAJ",
    rating: "4.5",
    description:
      "A vivid, terrifying account of what life on Earth could look like if we fail to act on climate change. Wallace-Wells explores cascading consequences from heat death to economic collapse, drawing on the latest research to paint a picture that is both a warning and a call to action.",
  },
  {
    title: "Losing Earth",
    author: "Nathaniel Rich",
    year: 2019,
    asin: "1250234271",
    cover: "BLVuDwAAQBAJ",
    rating: "4.3",
    description:
      "The devastating story of the decade (1979–1989) when humanity had the chance to solve climate change – and failed. Rich reveals how close we came to a solution, and how political and industrial forces derailed the effort.",
  },
  {
    title: "The Sixth Extinction",
    author: "Elizabeth Kolbert",
    year: 2014,
    asin: "1250062187",
    cover: "vi-loAEACAAJ",
    rating: "4.5",
    description:
      "Winner of the Pulitzer Prize. Kolbert draws on the work of geologists, marine biologists, and botanists to tell the story of Earth\u2019s five previous mass extinctions \u2013 and makes the case that human activity is driving a sixth one right now.",
  },
  {
    title: "This Changes Everything",
    author: "Naomi Klein",
    year: 2014,
    asin: "1451697392",
    cover: "Vh9ICgAAQBAJ",
    rating: "4.4",
    description:
      "Klein argues that climate change is not just another issue \u2013 it is a civilisational wake-up call that demands we overhaul our economic system. A landmark work connecting environmentalism with social justice and economic reform.",
  },
];

function amazonUrl(title: string, author: string) {
  const q = encodeURIComponent(`${title} ${author}`);
  return `https://www.amazon.co.uk/s?k=${q}&i=stripbooks&tag=${AFFILIATE_TAG}`;
}

function coverUrl(gbid: string) {
  return `https://books.google.com/books/content?id=${gbid}&printsec=frontcover&img=1&zoom=1`;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function ClimateBooksPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D0A65E] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: '#D0A65E' }}>
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

          {/* Books grid */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-6">Recommended Books</h2>
            <div className="grid gap-5">
              {BOOKS.map((book) => (
                <a
                  key={book.asin}
                  href={amazonUrl(book.title, book.author)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 md:gap-6 bg-gray-900/60 rounded-xl p-4 md:p-5 border border-gray-700/40 hover:border-[#D0A65E]/60 transition-colors group"
                >
                  <img
                    src={coverUrl(book.cover)}
                    alt={`${book.title} by ${book.author}`}
                    className="w-20 md:w-28 h-auto object-contain rounded-lg shadow-lg flex-shrink-0 group-hover:scale-[1.02] transition-transform"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-white group-hover:text-[#D0A65E] transition-colors leading-tight">{book.title}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{book.author} · {book.year}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-[#D0A65E] flex-shrink-0 mt-1 transition-colors" />
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-amber-400 font-semibold">{book.rating}</span>
                      <span className="text-xs text-gray-500 ml-1">on Amazon</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed mt-2 line-clamp-3 md:line-clamp-none">{book.description}</p>
                  </div>
                </a>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center mt-6 pt-4 border-t border-gray-800/40">
              As an Amazon Associate, I earn from qualifying purchases.
            </p>
          </section>

          {/* Explore data */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-4">Explore Our Climate Data</h2>
            <p className="text-sm text-gray-400 mb-4">See the science from these books in action with live data:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/climate-dashboard", label: "Global Climate Data", desc: "Temperature anomalies & CO₂ trends" },
                { href: "/emissions", label: "CO₂ Emissions", desc: "Country rankings & global trends" },
                { href: "/sea-levels-ice", label: "Sea Levels & Ice", desc: "Sea level rise & Arctic ice extent" },
                { href: "/climate-explained", label: "Climate Explained", desc: "Plain-English guide to the science" },
              ].map(({ href, label, desc }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40 hover:border-gray-600 transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 text-[#D0A65E] flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  <div>
                    <p className="text-sm font-semibold text-[#D0A65E]">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
