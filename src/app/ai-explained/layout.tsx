const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://4billionyearson.org/ai-explained",
  name: "AI Explained | 4 Billion Years On",
  description:
    "A plain-English guide to artificial intelligence: machine learning, large language models, neural networks, AI safety, and what the technology really means.",
  url: "https://4billionyearson.org/ai-explained",
  isPartOf: { "@id": "https://4billionyearson.org/#website" },
  about: {
    "@type": "Thing",
    name: "Artificial Intelligence",
    sameAs: "https://en.wikipedia.org/wiki/Artificial_intelligence",
  },
  educationalLevel: "General Public",
  audience: {
    "@type": "Audience",
    audienceType: "Students, Researchers, Journalists, Educators, General Public, Policymakers",
  },
  keywords:
    "artificial intelligence, machine learning, large language models, LLM, neural networks, deep learning, AI safety, GPT, transformers, AI explained",
  publisher: {
    "@type": "Organization",
    name: "4 Billion Years On",
    url: "https://4billionyearson.org",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
