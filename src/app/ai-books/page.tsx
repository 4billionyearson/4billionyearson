import { Metadata } from "next";
import { BookOpen, Star, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Best Artificial Intelligence Books | 4 Billion Years On",
  description:
    "Recommended books on artificial intelligence, machine learning, and the future of AI – from leading researchers and bestselling authors.",
  openGraph: {
    title: "Best Artificial Intelligence Books | 4 Billion Years On",
    description:
      "Recommended books on artificial intelligence, machine learning, and the future of AI – from leading researchers and bestselling authors.",
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
    title: "Co-Intelligence",
    author: "Ethan Mollick",
    year: 2024,
    asin: "0593716868",
    cover: "",
    rating: "4.5",
    description:
      "Wharton professor Ethan Mollick draws on his research and hands-on experience to offer a practical guide to living and working with AI. He explores how large language models are already transforming education, creativity, and business.",
  },
  {
    title: "Nexus",
    author: "Yuval Noah Harari",
    year: 2024,
    asin: "1911717081",
    cover: "",
    rating: "4.4",
    description:
      "The bestselling historian examines how information networks – from ancient myths to modern AI – have shaped civilisation. Harari warns that artificial intelligence represents a fundamentally new kind of information agent that could reshape society.",
  },
  {
    title: "The Coming Wave",
    author: "Mustafa Suleyman",
    year: 2023,
    asin: "1847927483",
    cover: "",
    rating: "4.4",
    description:
      "DeepMind co-founder Mustafa Suleyman warns that AI and synthetic biology represent a wave of technology that will be impossible to contain. He outlines the dilemma of unstoppable technology and the urgent need for containment strategies.",
  },
  {
    title: "AI 2041",
    author: "Kai-Fu Lee & Chen Qiufan",
    year: 2021,
    asin: "0593238532",
    cover: "",
    rating: "4.4",
    description:
      "A unique blend of science fiction and expert analysis. Former Google China president Kai-Fu Lee teams with sci-fi writer Chen Qiufan to imagine ten visions of how AI will transform the world over the next twenty years.",
  },
  {
    title: "Atlas of AI",
    author: "Kate Crawford",
    year: 2021,
    asin: "0300264631",
    cover: "",
    rating: "4.4",
    description:
      "Kate Crawford reveals AI as a technology of extraction – from the minerals mined to build hardware to the labour exploited to train models. A powerful investigation into the environmental and social costs of artificial intelligence.",
  },
  {
    title: "Genius Makers",
    author: "Cade Metz",
    year: 2021,
    asin: "1524742678",
    cover: "",
    rating: "4.5",
    description:
      "New York Times reporter Cade Metz tells the story of the brilliant, eccentric researchers behind the deep learning revolution. From Geoffrey Hinton to Demis Hassabis, this is the definitive account of how modern AI was built.",
  },
  {
    title: "The Alignment Problem",
    author: "Brian Christian",
    year: 2020,
    asin: "0393868338",
    cover: "",
    rating: "4.5",
    description:
      "A masterful exploration of the fundamental challenge in AI: how do we ensure machine learning systems do what we actually want? Christian weaves together computer science, philosophy, and psychology in this essential read on AI safety.",
  },
  {
    title: "Human Compatible",
    author: "Stuart Russell",
    year: 2019,
    asin: "0525558632",
    cover: "",
    rating: "4.4",
    description:
      "Leading AI researcher Stuart Russell argues that the standard model of AI – optimising a fixed objective – is fundamentally flawed. He proposes a new framework for creating beneficial AI that defers to human preferences.",
  },
  {
    title: "Life 3.0",
    author: "Max Tegmark",
    year: 2017,
    asin: "0141981806",
    cover: "",
    rating: "4.5",
    description:
      "MIT physicist Max Tegmark explores what it means to be human in the age of artificial intelligence. From near-term job automation to far-future superintelligence, he examines the choices we must make to ensure AI benefits humanity.",
  },
  {
    title: "Superintelligence",
    author: "Nick Bostrom",
    year: 2014,
    asin: "0198739834",
    cover: "",
    rating: "4.2",
    description:
      "The book that sparked global conversation about existential risk from AI. Oxford philosopher Nick Bostrom lays out the scenarios in which superhuman machine intelligence could emerge and the existential challenge of controlling it.",
  },
];

function amazonUrl(asin: string) {
  return `https://www.amazon.co.uk/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function coverUrl(asin: string) {
  return `https://covers.openlibrary.org/b/isbn/${asin}-L.jpg`;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function AIBooksPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#88DDFC] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: '#88DDFC' }}>
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight text-[#FFF5E7]">Artificial Intelligence Books</h1>
              <div className="flex items-center gap-2 mt-3">
                <BookOpen className="h-5 w-5 text-[#FFF5E7]/80" />
                <p className="text-sm uppercase tracking-[0.3em] text-[#FFF5E7]/80 font-mono">Recommended Reading</p>
              </div>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-5 py-4 md:px-6 md:py-5">
              <p className="text-sm md:text-lg font-medium max-w-3xl text-gray-300">
                The most important books on artificial intelligence – from the science of machine learning to the societal implications of superintelligence. Curated for anyone who wants to understand AI deeply.
              </p>
            </div>
          </div>

          {/* Books grid */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-6">Recommended Books</h2>
            <div className="grid gap-5">
              {BOOKS.map((book) => (
                <a
                  key={book.asin}
                  href={amazonUrl(book.asin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 md:gap-6 bg-gray-900/60 rounded-xl p-4 md:p-5 border border-gray-700/40 hover:border-[#88DDFC]/60 transition-colors group"
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
                        <h3 className="text-base md:text-lg font-bold text-white group-hover:text-[#88DDFC] transition-colors leading-tight">{book.title}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{book.author} · {book.year}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-[#88DDFC] flex-shrink-0 mt-1 transition-colors" />
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
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-4">Explore Our AI Data</h2>
            <p className="text-sm text-gray-400 mb-4">See the AI landscape in numbers with our interactive dashboards:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/ai-dashboard", label: "AI Industry Data", desc: "Investment, adoption & research trends" },
                { href: "/ai-explained", label: "AI Explained", desc: "Plain-English guide to AI" },
              ].map(({ href, label, desc }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40 hover:border-gray-600 transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 text-[#88DDFC] flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  <div>
                    <p className="text-sm font-semibold text-[#88DDFC]">{label}</p>
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
