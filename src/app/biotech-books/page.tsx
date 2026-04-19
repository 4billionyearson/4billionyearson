import { Metadata } from "next";
import { BookOpen, Star, ExternalLink } from "lucide-react";
import { getCountryCode, amazonUrl } from "@/lib/amazon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Best Biotechnology Books | 4 Billion Years On",
  description:
    "Recommended books on biotechnology, gene editing, CRISPR, and the future of medicine – from pioneering scientists and bestselling authors.",
  openGraph: {
    title: "Best Biotechnology Books | 4 Billion Years On",
    description:
      "Recommended books on biotechnology, gene editing, CRISPR, and the future of medicine – from pioneering scientists and bestselling authors.",
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
    title: "Breathless",
    author: "David Quammen",
    year: 2024,
    asin: "1982172975",
    cover: "Hn-HEAAAQBAJ",
    rating: "4.4",
    curatorNote: "David Quammen masterfully dissects the origin and spread of COVID-19. Understanding pandemics is vital to our biotechnology tracking, as viruses represent one of the most immediate existential vectors for humanity.",
    reviewHighlights: [
      "Praised for reading like a fast-paced scientific detective story.",
      "Readers value the clear breakdown of genomic tracing and virology."
    ],
    bestFor: ["Public health officials", "Science history buffs", "Biomedical students"],
    dataConnection: {
      text: "See our latest data on viral outbreaks and public health.",
      link: "/biotech-dashboard"
    }
  },
  {
    title: "The Song of the Cell",
    author: "Siddhartha Mukherjee",
    year: 2022,
    asin: "1982117354",
    cover: "zkqMEAAAQBAJ",
    rating: "4.5",
    curatorNote: "Siddhartha Mukherjee turns the microscopic world into an epic narrative. Understanding the basic building blocks of biological life maps directly to manipulating our own evolutionary trajectory.",
    reviewHighlights: [
      "Hailed as a sweeping, poetic biography of the human body's core units.",
      "Noted for taking highly dense microbiology and making it intensely personal."
    ],
    bestFor: ["Medical professionals", "Biology enthusiasts", "General readers"],
    dataConnection: {
      text: "Explore how cellular therapies map against life expectancy trends.",
      link: "/biotech-dashboard"
    }
  },
  {
    title: "The Vaccine",
    author: "Joe Miller, Uğur Şahin & Özlem Türeci",
    year: 2022,
    asin: "1250280397",
    cover: "auPgEAAAQBAJ",
    rating: "4.5",
    curatorNote: "The sheer speed of the mRNA COVID-19 vaccine's development is one of modern history's greatest feats. This inside story vividly captures the acceleration of biotechnology we emphasize in our models.",
    reviewHighlights: [
      "Commended for detailing the decades of obscure mRNA research before the pandemic hit.",
      "Loved by readers for the inspiring portrait of the founding couple behind BioNTech."
    ],
    bestFor: ["Biotech founders", "Medical historians", "Entrepreneurs"],
    dataConnection: {
      text: "Review the development timelines for modern vaccines and therapies.",
      link: "/biotech-dashboard"
    }
  },
  {
    title: "The Code Breaker",
    author: "Walter Isaacson",
    year: 2021,
    asin: "1982115866",
    cover: "GUSFEAAAQBAJ",
    rating: "4.6",
    curatorNote: "Walter Isaacson’s biography of Jennifer Doudna captures the cutthroat race to commercialize CRISPR. Gene editing is arguably the most powerful biological lever discovered since the agricultural revolution.",
    reviewHighlights: [
      "Universally acclaimed for tackling the deep ethical issues of altering human DNA.",
      "Appreciated for translating complex genetic mechanics into an accessible thriller."
    ],
    bestFor: ["Ethics scholars", "Genetics students", "Innovators"],
    dataConnection: {
      text: "See our timeline of major breakthroughs in gene editing.",
      link: "/biotech-dashboard"
    }
  },
  {
    title: "A Crack in Creation",
    author: "Jennifer A. Doudna & Samuel H. Sternberg",
    year: 2017,
    asin: "1328915360",
    cover: "VXPXvQEACAAJ",
    rating: "4.5",
    curatorNote: "Hearing directly from the co-inventor of CRISPR offers an unmatched perspective. Doudna’s blend of scientific pride and profound moral caution is essential for anyone tracking biotechnology's future.",
    reviewHighlights: [
      "Readers find the firsthand autobiographical perspective completely gripping.",
      "Noted for offering hope regarding agricultural resilience and inherited disease."
    ],
    bestFor: ["Bioengineers", "Ethicists", "Science advocates"],
    dataConnection: {
      text: "Track the growth in CRISPR patent applications and clinical trials.",
      link: "/biotech-dashboard"
    }
  },
  {
    title: "The Gene",
    author: "Siddhartha Mukherjee",
    year: 2016,
    asin: "0099584573",
    cover: "bhLUwAEACAAJ",
    rating: "4.6",
    curatorNote: "Framing the history of genetics from Mendel’s peas to modern manipulation highlights how recently we truly cracked biology's source code. Mukherjee shows exactly why this era marks a distinct break in the 4 billion year timeline.",
    reviewHighlights: [
      "Called the definitive foundational text for the layman on genetic history.",
      "Loved for its deeply personal interludes regarding the author's own family medical history."
    ],
    bestFor: ["History lovers", "Medical professionals", "Biology students"],
    dataConnection: {
      text: "Compare historical genetic milestones with modern biotech outputs.",
      link: "/biotech-dashboard"
    }
  },
  {
    title: "Regenesis",
    author: "George Church & Ed Regis",
    year: 2014,
    asin: "0465075703",
    cover: "4JhYtAEACAAJ",
    rating: "4.3",
    curatorNote: "George Church effectively argues that synthetic biology is the ultimate creative tool. Building life from the molecular level up is a key driver for overcoming planetary scale constraints like climate and energy.",
    reviewHighlights: [
      "Praised for its radical, wildly imaginative (yet scientifically grounded) future scenarios.",
      "Acknowledged as occasionally dense but incredibly rewarding for science-literate readers."
    ],
    bestFor: ["Futurists", "Synthetic biologists", "Transhumanists"],
    dataConnection: {
      text: "Explore synthetic biology adoption and engineering trends.",
      link: "/biotech-dashboard"
    }
  },
  {
    title: "Life at the Speed of Light",
    author: "J. Craig Venter",
    year: 2013,
    asin: "0143125907",
    cover: "zkECDAAAQBAJ",
    rating: "4.2",
    curatorNote: "Craig Venter recounts the transition of biology into the digital realm. The ability to design organisms purely on computers before 'printing' them physically represents a monumental leap in evolutionary capability.",
    reviewHighlights: [
      "Commended for clearly explaining the mechanics of sending genetic information digitally.",
      "Valued as a provocative look at 'telebiological' capabilities."
    ],
    bestFor: ["Bioinformatics specialists", "Tech enthusiasts", "Researchers"],
    dataConnection: {
      text: "Look at the intersection of AI and bioinformatics timelines.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "Genome",
    author: "Matt Ridley",
    year: 1999,
    asin: "0060894083",
    cover: "h2zcDWshkEkC",
    rating: "4.4",
    curatorNote: "Though older, Ridley’s chapter-by-chromosome tour of the human genome is a phenomenal primer. Examining how ancient evolutionary echoes reside inside us grounds our understanding of where humanity maps in Deep Time.",
    reviewHighlights: [
      "Hailed as a brilliant organizing structure (one chromosome per chapter).",
      "Celebrated for making complex mapping data both amusing and profound."
    ],
    bestFor: ["Educators", "Anthropologists", "Beginners"],
    dataConnection: {
      text: "View long-term demographic data drawn from historical DNA maps.",
      link: "/biotech-dashboard"
    }
  }
];

function coverUrl(gbid: string) {
  return `https://books.google.com/books/content?id=${gbid}&printsec=frontcover&img=1&zoom=1`;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function BiotechBooksPage() {
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
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#FFF5E7] overflow-hidden" style={{ background: 'linear-gradient(to bottom, #FFF5E7 0%, #FFF5E7 20px, transparent 20px)' }}>
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

          {/* Books list */}
          <div className="space-y-8">
            {BOOKS.map((book) => (
              <section
                key={book.asin}
                className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]/40 hover:border-[#FFF5E7] transition-colors"
              >
                <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
                  {/* Book Cover and Amazon CTA */}
                  <div className="flex flex-col items-center gap-3 w-full sm:w-auto sm:min-w-[160px] sm:max-w-[180px] flex-shrink-0">
                    <img
                      src={coverUrl(book.cover)}
                      alt={`${book.title} by ${book.author}`}
                      className="w-28 sm:w-36 md:w-44 h-auto object-contain rounded-lg shadow-xl"
                      loading="lazy"
                    />
                    <a
                      href={amazonUrl(book.title, book.author, countryCode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center bg-[#D26742] text-white font-bold py-2 px-4 rounded-xl hover:bg-[#C25835] transition-colors flex items-center justify-center gap-2"
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

                      <div className="pt-2">
                        <h3 className="text-sm tracking-widest uppercase text-gray-500 font-bold mb-2">Best For</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {book.bestFor.map((tag, i) => (
                            <span key={i} className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 p-4 rounded-xl bg-gray-900 border border-gray-800">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <p className="text-[#D26742] font-bold text-sm uppercase tracking-wide">Why this matters</p>
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

          {/* Explore data */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7] mt-8">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-4">Explore Our Biotech Data</h2>
            <p className="text-sm text-gray-400 mb-4">See the science behind the books with our interactive dashboards:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <a href="/biotech-dashboard" className="block p-4 rounded-xl border border-gray-800 bg-gray-900 hover:border-[#D26742] transition-colors group">
                <div className="font-bold text-[#D26742] group-hover:text-[#C25835]">Biotech Data</div>
                <div className="text-xs text-gray-400 mt-1">Genomics, trials & research trends</div>
              </a>
            </div>
          </section>

          <p className="text-xs text-gray-500 text-center pt-8">
            As an Amazon Associate, I earn from qualifying purchases.
          </p>

        </div>
      </div>
    </main>
  );
}
