import { Metadata } from "next";
import { BookOpen, Star, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Best Renewable Energy Books | 4 Billion Years On",
  description:
    "Recommended books on renewable energy, the clean energy transition, and sustainable power – from expert authors and bestselling titles.",
  openGraph: {
    title: "Best Renewable Energy Books | 4 Billion Years On",
    description:
      "Recommended books on renewable energy, the clean energy transition, and sustainable power – from expert authors and bestselling titles.",
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
    title: "How the World Really Works",
    author: "Vaclav Smil",
    year: 2022,
    asin: "0241454409",
    cover: "https://m.media-amazon.com/images/I/71rBMXCZBBL._SY522_.jpg",
    rating: "4.5",
    description:
      "Bill Gates's favourite author explains the fundamental realities of energy, food production, materials, and the environment. Smil cuts through the noise with hard data, showing what it will truly take to transition away from fossil fuels.",
  },
  {
    title: "The New Map",
    author: "Daniel Yergin",
    year: 2020,
    asin: "0141994886",
    cover: "https://m.media-amazon.com/images/I/81-h9CzaI+L._SY522_.jpg",
    rating: "4.5",
    description:
      "Pulitzer Prize winner Daniel Yergin charts how the energy revolution, climate politics, and geopolitical rivalries are reshaping the world map. Essential reading for understanding the intersection of energy, power, and global politics.",
  },
  {
    title: "Superpower",
    author: "Ross Garnaut",
    year: 2019,
    asin: "1760875651",
    cover: "https://m.media-amazon.com/images/I/714q1JHxQhL._SY522_.jpg",
    rating: "4.4",
    description:
      "Garnaut argues that countries rich in sun, wind, and land could become the energy superpowers of the 21st century. A compelling case for how the renewable energy transition creates enormous economic opportunity.",
  },
  {
    title: "Electrify",
    author: "Saul Griffith",
    year: 2021,
    asin: "0262046237",
    cover: "https://m.media-amazon.com/images/I/71EfrEQa+JL._SY522_.jpg",
    rating: "4.5",
    description:
      "Engineer and inventor Saul Griffith presents an optimistic, detailed plan for decarbonising everything through electrification. From heat pumps to EVs, he shows how existing technology can solve climate change – if deployed at scale.",
  },
  {
    title: "Sustainable Energy – Without the Hot Air",
    author: "David JC MacKay",
    year: 2009,
    asin: "0954452933",
    cover: "https://m.media-amazon.com/images/I/71q+rMWLzjL._SY522_.jpg",
    rating: "4.6",
    description:
      "A cult classic among energy wonks. Professor MacKay uses back-of-the-envelope calculations to show exactly how much energy Britain uses and how renewables could (or couldn't) replace fossil fuels. Rigorous, witty, and endlessly cited.",
  },
  {
    title: "The Grid",
    author: "Gretchen Bakke",
    year: 2016,
    asin: "1632863324",
    cover: "https://m.media-amazon.com/images/I/81bk6uf+WlL._SY522_.jpg",
    rating: "4.3",
    description:
      "Named one of Bill Gates's favourite reads. Bakke tells the fascinating story of the electrical grid – the most complex machine ever built – and explains why modernising it is essential for the renewable energy transition.",
  },
  {
    title: "Shorting the Grid",
    author: "Meredith Angwin",
    year: 2020,
    asin: "B08JF4LKXS",
    cover: "https://m.media-amazon.com/images/I/71bG8lF-aGL._SY522_.jpg",
    rating: "4.5",
    description:
      "A clear-eyed look at how deregulation and market design are undermining grid reliability. Angwin, a nuclear and grid expert, explains the hidden dangers of our current electricity system and what must change for a clean energy future.",
  },
  {
    title: "Energy and Civilization",
    author: "Vaclav Smil",
    year: 2017,
    asin: "0262536161",
    cover: "https://m.media-amazon.com/images/I/81fFqBzBjCL._SY522_.jpg",
    rating: "4.4",
    description:
      "A sweeping history of how energy has shaped human civilisation, from biomass and muscle power to fossil fuels and renewables. Smil provides the deep context needed to understand today's energy transition in historical perspective.",
  },
];

function amazonUrl(asin: string) {
  return `https://www.amazon.co.uk/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function EnergyBooksPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: '#D2E369' }}>
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

          {/* Books grid */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D2E369]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-6">Recommended Books</h2>
            <div className="grid gap-5">
              {BOOKS.map((book) => (
                <a
                  key={book.asin}
                  href={amazonUrl(book.asin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 md:gap-6 bg-gray-900/60 rounded-xl p-4 md:p-5 border border-gray-700/40 hover:border-[#D2E369]/60 transition-colors group"
                >
                  <img
                    src={book.cover}
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
          </section>

          {/* Explore data */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D2E369]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-4">Explore Our Energy Data</h2>
            <p className="text-sm text-gray-400 mb-4">See the data behind the books with our interactive dashboards:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/energy", label: "Global Energy Data", desc: "Energy mix by country & source" },
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

          {/* Amazon disclaimer */}
          <p className="text-xs text-gray-600 text-center px-4">
            As an Amazon Associate, I earn from qualifying purchases. Book cover images are provided by Amazon.
          </p>

        </div>
      </div>
    </main>
  );
}
