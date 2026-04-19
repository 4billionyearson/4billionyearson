import { Metadata } from "next";
import { BookOpen, Star, ExternalLink } from "lucide-react";
import { getCountryCode, amazonUrl } from "@/lib/amazon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Best Artificial Intelligence Books | 4 Billion Years On",
  description:
    "Recommended books on artificial intelligence, machine learning, and the future of AI – from leading researchers and bestselling authors.",
  openGraph: {
    title: "Best Artificial Intelligence Books | 4 Billion Years On",
    description:
      "Recommended books on artificial intelligence, machine learning, and the future of AI – from leading researchers and bestselling authors.",
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
    title: "Co-Intelligence",
    author: "Ethan Mollick",
    year: 2024,
    asin: "0593716868",
    cover: "r13gEAAAQBAJ",
    rating: "4.5",
    curatorNote: "Ethan Mollick offers a foundational perspective on living and working alongside AI. By embracing large language models as collaborators, this book aligns perfectly with our exploration of AI as a catalyst for human progress.",
    reviewHighlights: [
      "Praised for its practical, hands-on advice rather than purely abstract theory.",
      "Readers love the balanced optimism regarding AI's potential in education and business."
    ],
    bestFor: ["Professionals adapting to AI", "Educators", "Optimists"],
    dataConnection: {
      text: "Explore how AI connects to macro trends on our AI Dashboard.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "Nexus",
    author: "Yuval Noah Harari",
    year: 2024,
    asin: "1911717081",
    cover: "BCB60AEACAAJ",
    rating: "4.4",
    curatorNote: "Harari frames AI as the latest profound shift in information networks. This historical lens is essential for understanding where artificial intelligence fits into the broader 4 billion year story of evolution and human history.",
    reviewHighlights: [
      "Celebrated for its sweeping historical perspective and thought-provoking philosophical inquiries.",
      "Noted as a cautionary but essential read concerning non-human information agents."
    ],
    bestFor: ["History buffs", "Philosophers", "Tech regulators"],
    dataConnection: {
      text: "See the rapid advancement of AI models on our timeline.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "The Coming Wave",
    author: "Mustafa Suleyman",
    year: 2023,
    asin: "1847927483",
    cover: "nNafzwEACAAJ",
    rating: "4.4",
    curatorNote: "Mustafa Suleyman pairs the rise of AI with synthetic biology, presenting an urgent look at technological containment. It strikes at the heart of regulating massive planetary shifts.",
    reviewHighlights: [
      "Commended for an insider's view on the power and dangers of exponential tech.",
      "Valued for articulating actionable containment strategies rather than just doomsaying."
    ],
    bestFor: ["Policy makers", "Biotech enthusiasts", "Security analysts"],
    dataConnection: {
      text: "Track the metrics that measure technological acceleration.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "AI 2041",
    author: "Kai-Fu Lee & Chen Qiufan",
    year: 2021,
    asin: "0593238532",
    cover: "tUASEAAAQBAJ",
    rating: "4.4",
    curatorNote: "By blending science fiction with expert analysis, Lee and Qiufan make the future tangible. These ten visions vividly illustrate what everyday life might look like in the next phase of human innovation.",
    reviewHighlights: [
      "Readers appreciate the engaging mix of narrative storytelling and technical explanation.",
      "Singled out as highly accessible for non-technical readers."
    ],
    bestFor: ["Sci-fi fans", "Futurists", "General audiences"],
    dataConnection: {
      text: "Compare these fictions with current AI growth rates.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "Atlas of AI",
    author: "Kate Crawford",
    year: 2021,
    asin: "0300264631",
    cover: "G2iUzgEACAAJ",
    rating: "4.4",
    curatorNote: "Kate Crawford dissects the physical and social footprint of artificial intelligence. Her framing of AI as an extraction technology connects our AI pillar directly to the physical realities of climate and energy.",
    reviewHighlights: [
      "Hailed as a necessary counter-narrative to 'cloud' metaphors, grounding AI in physical reality.",
      "Recognized for its deep research into the environmental costs of hardware."
    ],
    bestFor: ["Climate activists", "Ethicists", "Sociologists"],
    dataConnection: {
      text: "See how AI data centers consume as much electricity as entire countries.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "Genius Makers",
    author: "Cade Metz",
    year: 2021,
    asin: "1524742678",
    cover: "p-UlEAAAQBAJ",
    rating: "4.5",
    curatorNote: "Cade Metz provides the definitive history of the deep learning revolution. Understanding the eccentric researchers behind this leap is crucial context for the blistering pace of today's tech acceleration.",
    reviewHighlights: [
      "Loved for its fast-paced, journalistic storytelling of tech titans.",
      "Valued as an excellent historical record of the 2010s AI boom."
    ],
    bestFor: ["Tech historians", "Founders", "Journalism fans"],
    dataConnection: {
      text: "See how the models built by these pioneers perform today.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "The Alignment Problem",
    author: "Brian Christian",
    year: 2020,
    asin: "0393868338",
    cover: "9GSNEAAAQBAJ",
    rating: "4.5",
    curatorNote: "Brian Christian expertly explains the complexity of teaching machines human values. This addresses the ultimate constraint on the next phase of human evolution: making sure superintelligence actually wants what we want.",
    reviewHighlights: [
      "Called the most readable book on the intricacies of machine learning safety.",
      "Praised for weaving psychology and philosophy seamlessly into computer science."
    ],
    bestFor: ["AI safety researchers", "Psychologists", "Programmers"],
    dataConnection: {
      text: "See how frontier AI models are ranked by benchmark performance.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "Human Compatible",
    author: "Stuart Russell",
    year: 2019,
    asin: "0525558632",
    cover: "vuqNEAAAQBAJ",
    rating: "4.4",
    curatorNote: "Stuart Russell challenges the standard model of AI optimization. His proposal for systems that defer to human uncertainty is a foundational blueprint for safely integrating AI into planetary systems.",
    reviewHighlights: [
      "Appreciated for laying out clear, specific suggestions for rewriting AI foundational goals.",
      "Noted as an authoritative voice cutting through the hype."
    ],
    bestFor: ["Engineers", "Philosophers", "Risk analysts"],
    dataConnection: {
      text: "Explore global AI investment trends and frontier model releases.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "Life 3.0",
    author: "Max Tegmark",
    year: 2017,
    asin: "0141981806",
    cover: "UPNtswEACAAJ",
    rating: "4.5",
    curatorNote: "Max Tegmark's exploration of being human in the age of AI directly mirrors our 4 billion year perspective. He maps out the pathways from biological life (1.0) to hardware-and-software-independent life (3.0).",
    reviewHighlights: [
      "Highly recommended for its expansive, cosmic perspective on intelligence.",
      "Readers love the variety of future scenarios posited in the prelude."
    ],
    bestFor: ["Cosmologists", "Transhumanists", "Big-picture thinkers"],
    dataConnection: {
      text: "Track the rapid growth in AI model releases and infrastructure.",
      link: "/ai-dashboard"
    }
  },
  {
    title: "Superintelligence",
    author: "Nick Bostrom",
    year: 2014,
    asin: "0198739834",
    cover: "i0QdjgEACAAJ",
    rating: "4.2",
    curatorNote: "Nick Bostrom's landmark book frames the emergence of superhuman AI as an existential challenge. This philosophical rigor underlines the sheer magnitude of the transition our species is undergoing.",
    reviewHighlights: [
      "Widely recognized as the book that formally launched the modern AI safety movement.",
      "Found to be highly dense and academic, but profoundly rewarding."
    ],
    bestFor: ["Academics", "Deep thinkers", "Longtermists"],
    dataConnection: {
      text: "Track the current trajectory toward AGI.",
      link: "/ai-dashboard"
    }
  }
];

function coverUrl(gbid: string) {
  return `https://books.google.com/books/content?id=${gbid}&printsec=frontcover&img=1&zoom=1`;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function AIBooksPage() {
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
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#88DDFC] overflow-hidden" style={{ background: 'linear-gradient(to bottom, #88DDFC 0%, #88DDFC 20px, transparent 20px)' }}>
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

          {/* Books list */}
          <div className="space-y-6">
            {BOOKS.map((book, index) => (
              <section
                key={book.asin}
                className="bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-xl border-2 border-[#88DDFC] overflow-hidden"
              >
                {/* Accent header bar */}
                <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: '#88DDFC' }}>
                  <h2 className="text-lg md:text-xl font-bold font-mono text-gray-900 truncate pr-4">
                    <span className="text-gray-900/50 mr-2">#{index + 1}</span>
                    {book.title}
                  </h2>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-gray-900">{book.rating}</span>
                  </div>
                </div>

                <div className="p-5 md:p-6">
                  <div className="flex gap-5">
                    {/* Cover – always left-aligned, compact */}
                    <div className="flex flex-col items-center gap-3 flex-shrink-0 w-[100px] sm:w-[130px] md:w-[150px]">
                      <img
                        src={coverUrl(book.cover)}
                        alt={`${book.title} by ${book.author}`}
                        className="w-full h-auto object-contain rounded-lg shadow-lg"
                        loading="lazy"
                      />
                      <a
                        href={amazonUrl(book.title, book.author, countryCode)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center bg-[#88DDFC] text-gray-900 font-bold text-xs py-1.5 px-2 rounded-lg hover:bg-[#6BC6E8] transition-colors flex items-center justify-center gap-1"
                      >
                        Amazon <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <p className="text-sm text-gray-400 font-medium">{book.author} · {book.year}</p>
                      </div>

                      <p className="text-sm md:text-base text-gray-300 leading-relaxed">{book.curatorNote}</p>

                      <div>
                        <h3 className="text-xs tracking-widest uppercase text-gray-500 font-bold mb-1.5">Review Highlights</h3>
                        <ul className="list-disc list-outside ml-4 text-sm text-gray-400 space-y-0.5">
                          {book.reviewHighlights.map((highlight, i) => (
                            <li key={i}>{highlight}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {book.bestFor.map((tag, i) => (
                          <span key={i} className="bg-[#88DDFC]/10 text-[#88DDFC] text-xs px-2.5 py-0.5 rounded-full border border-[#88DDFC]/30 font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Data connection footer */}
                  <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-sm text-gray-400">{book.dataConnection.text}</p>
                    <a href={book.dataConnection.link} className="text-xs text-[#88DDFC] font-bold uppercase tracking-wide hover:underline whitespace-nowrap flex-shrink-0">
                      View Data &rarr;
                    </a>
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
