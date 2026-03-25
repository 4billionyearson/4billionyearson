import { Metadata } from "next";
import { BookOpen, Star, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Best Biotechnology Books | 4 Billion Years On",
  description:
    "Recommended books on biotechnology, gene editing, CRISPR, and the future of medicine – from pioneering scientists and bestselling authors.",
  openGraph: {
    title: "Best Biotechnology Books | 4 Billion Years On",
    description:
      "Recommended books on biotechnology, gene editing, CRISPR, and the future of medicine – from pioneering scientists and bestselling authors.",
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
    title: "Breathless",
    author: "David Quammen",
    year: 2024,
    asin: "1982172975",
    cover: "",
    rating: "4.4",
    description:
      "National Geographic writer David Quammen delivers the definitive account of how COVID-19 emerged and spread. Combining virology, genomics, and investigative journalism, he traces the origins of SARS-CoV-2 and what it reveals about future pandemics.",
  },
  {
    title: "The Song of the Cell",
    author: "Siddhartha Mukherjee",
    year: 2022,
    asin: "1982117354",
    cover: "",
    rating: "4.5",
    description:
      "From the author of The Gene and The Emperor of All Maladies. Mukherjee tells the story of the cell \u2013 the basic unit of life \u2013 and how cell therapy is revolutionising medicine, from cancer treatment to organ regeneration.",
  },
  {
    title: "The Vaccine",
    author: "Joe Miller, U\u011fur \u015eahin & \u00d6zlem T\u00fcreci",
    year: 2022,
    asin: "1250280397",
    cover: "",
    rating: "4.5",
    description:
      "The inside story of how BioNTech created the first mRNA COVID-19 vaccine in record time. A gripping account of scientific ingenuity, personal sacrifice, and the decades of research that made the impossible possible.",
  },
  {
    title: "The Code Breaker",
    author: "Walter Isaacson",
    year: 2021,
    asin: "1982115866",
    cover: "",
    rating: "4.6",
    description:
      "The riveting story of Nobel Prize winner Jennifer Doudna and the invention of CRISPR gene editing. Walter Isaacson follows the race to harness the most significant biological tool since the double helix \u2013 from lab bench to pandemic response.",
  },
  {
    title: "A Crack in Creation",
    author: "Jennifer A. Doudna & Samuel H. Sternberg",
    year: 2017,
    asin: "1328915360",
    cover: "",
    rating: "4.5",
    description:
      "Written by the co-inventor of CRISPR herself, this is the definitive account of how gene editing works, the ethical dilemmas it raises, and why it will change medicine, agriculture, and the fabric of life itself.",
  },
  {
    title: "The Gene",
    author: "Siddhartha Mukherjee",
    year: 2016,
    asin: "0099584573",
    cover: "",
    rating: "4.6",
    description:
      "Pulitzer Prize\u2013winning author Mukherjee tells the epic story of the gene \u2013 from Mendel\u2019s garden to CRISPR. Part history, part science, part personal narrative, it explores how genetics has shaped identity, disease, and destiny.",
  },
  {
    title: "Regenesis",
    author: "George Church & Ed Regis",
    year: 2014,
    asin: "0465075703",
    cover: "",
    rating: "4.3",
    description:
      "Harvard geneticist George Church envisions a future where synthetic biology rewrites the living world. From resurrecting the woolly mammoth to engineering virus-resistant humans, this is a mind-expanding tour of what\u2019s possible.",
  },
  {
    title: "Life at the Speed of Light",
    author: "J. Craig Venter",
    year: 2013,
    asin: "0143125907",
    cover: "",
    rating: "4.2",
    description:
      "The scientist who sequenced the human genome describes the dawn of synthetic biology \u2013 creating life from digital code. Venter explores what it means to design organisms from scratch and the implications for medicine, energy, and food.",
  },
  {
    title: "Genome",
    author: "Matt Ridley",
    year: 1999,
    asin: "0060894083",
    cover: "",
    rating: "4.4",
    description:
      "Ridley takes readers on a tour of the human genome, one chromosome at a time. Each chapter reveals a different gene that illuminates a new aspect of humanity \u2013 from disease and intelligence to personality and free will.",
  },
];

function amazonUrl(asin: string) {
  return `https://www.amazon.co.uk/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function coverUrl(asin: string) {
  return `https://covers.openlibrary.org/b/isbn/${asin}-L.jpg`;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function BiotechBooksPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#FFF5E7] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: '#FFF5E7' }}>
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight text-[#D26742]">Biotechnology Books</h1>
              <div className="flex items-center gap-2 mt-3">
                <BookOpen className="h-5 w-5 text-[#D26742]/80" />
                <p className="text-sm uppercase tracking-[0.3em] text-[#D26742]/80 font-mono">Recommended Reading</p>
              </div>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-5 py-4 md:px-6 md:py-5">
              <p className="text-sm md:text-lg font-medium max-w-3xl text-gray-300">
                The best books on biotechnology, gene editing, and the future of medicine. From CRISPR to synthetic biology – essential reading for understanding the revolution in life sciences.
              </p>
            </div>
          </div>

          {/* Books grid */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-6">Recommended Books</h2>
            <div className="grid gap-5">
              {BOOKS.map((book) => (
                <a
                  key={book.asin}
                  href={amazonUrl(book.asin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 md:gap-6 bg-gray-900/60 rounded-xl p-4 md:p-5 border border-gray-700/40 hover:border-[#D26742]/60 transition-colors group"
                >
                  <img
                    src={coverUrl(book.asin)}
                    alt={`${book.title} by ${book.author}`}
                    className="w-20 md:w-28 h-auto object-contain rounded-lg shadow-lg flex-shrink-0 group-hover:scale-[1.02] transition-transform"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-white group-hover:text-[#D26742] transition-colors leading-tight">{book.title}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{book.author} · {book.year}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-[#D26742] flex-shrink-0 mt-1 transition-colors" />
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
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-4">Explore Our Biotech Data</h2>
            <p className="text-sm text-gray-400 mb-4">See the science behind the books with our interactive dashboards:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/biotech-dashboard", label: "Biotech Data", desc: "Genomics, trials & research trends" },
                { href: "/biotech-explained", label: "Biotech Explained", desc: "Plain-English guide to biotech" },
              ].map(({ href, label, desc }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40 hover:border-gray-600 transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 text-[#D26742] flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  <div>
                    <p className="text-sm font-semibold text-[#D26742]">{label}</p>
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
