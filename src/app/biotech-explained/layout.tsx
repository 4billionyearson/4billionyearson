import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biotechnology Explained | 4 Billion Years On",
  description: "A plain-English guide to biotechnology: gene editing, CRISPR, mRNA, synthetic biology, and how biotech is reshaping medicine, agriculture, and industry.",
  alternates: { canonical: 'https://4billionyearson.org/biotech-explained' },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://4billionyearson.org/biotech-explained",
  name: "Biotechnology Explained | 4 Billion Years On",
  description:
    "A plain-English guide to biotechnology: gene editing, CRISPR, mRNA, synthetic biology, and how biotech is reshaping medicine, agriculture, and industry.",
  url: "https://4billionyearson.org/biotech-explained",
  isPartOf: { "@id": "https://4billionyearson.org/#website" },
  about: {
    "@type": "Thing",
    name: "Biotechnology",
    sameAs: "https://en.wikipedia.org/wiki/Biotechnology",
  },
  educationalLevel: "General Public",
  audience: {
    "@type": "Audience",
    audienceType: "Students, Researchers, Journalists, Educators, General Public",
  },
  keywords:
    "biotechnology, CRISPR, gene editing, mRNA, synthetic biology, genome sequencing, DNA, RNA, base editing, biotech explained",
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
