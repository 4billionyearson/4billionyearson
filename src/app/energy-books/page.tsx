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
  description: string;
}

const BOOKS: Book[] = [
  {
    title: "The Price Is Wrong",
    author: "Brett Christophers",
    year: 2024,
    asin: "1804290785",
    cover: "ETPBEAAAQBAJ",
    rating: "4.5",
    description:
      "Why has renewable energy not displaced fossil fuels faster? Christophers argues the answer lies in economics – green energy is not as cheap as headlines suggest, and markets alone won’t deliver the transition without bold policy intervention.",
  },
  {
    title: "Volt Rush",
    author: "Henry Sanderson",
    year: 2023,
    asin: "0861544692",
    cover: "aZlZEAAAQBAJ",
    rating: "4.4",
    description:
      "The electrification of everything requires vast quantities of lithium, cobalt, nickel, and rare earths. Financial Times journalist Sanderson investigates the geopolitics and human cost of the battery supply chain powering the clean energy revolution.",
  },
  {
    title: "How the World Really Works",
    author: "Vaclav Smil",
    year: 2022,
    asin: "0241454409",
    cover: "G3EszgEACAAJ",
    rating: "4.5",
    description:
      "Bill Gates’s favourite author explains the fundamental realities of energy, food production, materials, and the environment. Smil cuts through the noise with hard data, showing what it will truly take to transition away from fossil fuels.",
  },
  {
    title: "Electrify",
    author: "Saul Griffith",
    year: 2021,
    asin: "0262046237",
    cover: "ALVCEAAAQBAJ",
    rating: "4.5",
    description:
      "Engineer and inventor Saul Griffith presents an optimistic, detailed plan for decarbonising everything through electrification. From heat pumps to EVs, he shows how existing technology can solve climate change – if deployed at scale.",
  },
  {
    title: "The New Map",
    author: "Daniel Yergin",
    year: 2020,
    asin: "0141994886",
    cover: "5G_XDwAAQBAJ",
    rating: "4.5",
    description:
      "Pulitzer Prize winner Daniel Yergin charts how the energy revolution, climate politics, and geopolitical rivalries are reshaping the world map. Essential reading for understanding the intersection of energy, power, and global politics.",
  },
  {
    title: "Superpower",
    author: "Ross Garnaut",
    year: 2019,
    asin: "1760875651",
    cover: "KPiPDwAAQBAJ",
    rating: "4.4",
    description:
      "Garnaut argues that countries rich in sun, wind, and land could become the energy superpowers of the 21st century. A compelling case for how the renewable energy transition creates enormous economic opportunity.",
  },
  {
    title: "Drawdown",
    author: "Paul Hawken",
    year: 2017,
    asin: "0143130447",
    cover: "uvtlDgAAQBAJ",
    rating: "4.6",
    description:
      "The most comprehensive plan ever proposed to reverse global warming. Hawken and a team of researchers rank the top 100 solutions by impact – from wind turbines and solar farms to educating girls and reducing food waste.",
  },
  {
    title: "Energy and Civilization",
    author: "Vaclav Smil",
    year: 2017,
    asin: "0262536161",
    cover: "Br74DwAAQBAJ",
    rating: "4.4",
    description:
      "A sweeping history of how energy has shaped human civilisation, from biomass and muscle power to fossil fuels and renewables. Smil provides the deep context needed to understand today’s energy transition in historical perspective.",
  },
  {
    title: "The Grid",
    author: "Gretchen Bakke",
    year: 2016,
    asin: "1632863324",
    cover: "https://books.google.com/books/content?id=dTbbCwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    rating: "4.3",
    description:
      "Named one of Bill Gates’s favourite reads. Bakke tells the fascinating story of the electrical grid – the most complex machine ever built – and explains why modernising it is essential for the renewable energy transition.",
  },
  {
    title: "The Switch",
    author: "Chris Goodall",
    year: 2016,
    asin: "1781255245",
    cover: "QWz4CgAAQBAJ",
    rating: "4.3",
    description:
      "Goodall makes the case that solar photovoltaics will become the world’s dominant energy source. He explains how plummeting costs, improving storage, and clever grid management are making a solar-powered civilisation inevitable.",
  },
  {
    title: "Windfall",
    author: "McKenzie Funk",
    year: 2014,
    asin: "0143126598",
    cover: "X-dvDwAAQBAJ",
    rating: "4.2",
    description:
      "A global investigation into who stands to profit from climate change. Funk travels from Greenland to Israel to explore how entrepreneurs, nations, and militaries are turning rising seas, melting ice, and drought into business opportunities.",
  },
  {
    title: "Sustainable Energy – Without the Hot Air",
    author: "David JC MacKay",
    year: 2009,
    asin: "0954452933",
    cover: "Ps7JEAAAQBAJ",
    rating: "4.6",
    description:
      "A cult classic among energy wonks. Professor MacKay uses back-of-the-envelope calculations to show exactly how much energy Britain uses and how renewables could (or couldn’t) replace fossil fuels. Rigorous, witty, and endlessly cited.",
  },
];

function coverUrl(cover: string) {
  if (cover.startsWith("http://") || cover.startsWith("https://")) {
    return cover;
  }

  return `https://books.google.com/books/content?id=${cover}&printsec=frontcover&img=1&zoom=1`;
}

export default async function EnergyBooksPage() {
  const countryCode = await getCountryCode();

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: "#D2E369" }}>
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

          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D2E369]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-6">Recommended Books</h2>
            <div className="grid gap-5">
              {BOOKS.map((book) => (
                <a
                  key={book.asin}
                  href={amazonUrl(book.title, book.author, countryCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 md:gap-6 bg-gray-900/60 rounded-xl p-4 md:p-5 border border-gray-700/40 hover:border-[#D2E369]/60 transition-colors group"
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
                        <h3 className="text-base md:text-lg font-bold text-white group-hover:text-[#D2E369] transition-colors leading-tight">{book.title}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{book.author} · {book.year}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-[#D2E369] flex-shrink-0 mt-1 transition-colors" />
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

          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D2E369]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-4">Explore Our Energy Data</h2>
            <p className="text-sm text-gray-400 mb-4">See the data behind the books with our interactive dashboards:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/energy-dashboard", label: "Global Energy Data", desc: "Energy mix by country & source" },
                { href: "/energy-rankings", label: "Energy Rankings", desc: "Top producers & consumers" },
                { href: "/energy-explained", label: "Energy Explained", desc: "Plain-English guide" },
                { href: "/emissions", label: "CO₂ Emissions", desc: "Country rankings & trends" },
              ].map(({ href, label, desc }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40 hover:border-gray-600 transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 text-[#D2E369] flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  <div>
                    <p className="text-sm font-semibold text-[#D2E369]">{label}</p>
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
