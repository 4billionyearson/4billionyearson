import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Climate Change Explained | 4 Billion Years On",
  description: "A plain-English guide to climate change: greenhouse gases, global warming, feedback loops, tipping points, and what the science really says.",
  alternates: { canonical: 'https://4billionyearson.org/climate-explained' },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://4billionyearson.org/climate-explained",
  name: "Climate Change Explained | 4 Billion Years On",
  description:
    "A plain-English guide to climate change: greenhouse gases, global warming, feedback loops, tipping points, and what the science really says.",
  url: "https://4billionyearson.org/climate-explained",
  isPartOf: { "@id": "https://4billionyearson.org/#website" },
  about: {
    "@type": "Thing",
    name: "Climate Change",
    sameAs: "https://en.wikipedia.org/wiki/Climate_change",
  },
  educationalLevel: "General Public",
  audience: {
    "@type": "Audience",
    audienceType: "Students, Researchers, Journalists, Educators, General Public",
  },
  keywords:
    "climate change, global warming, greenhouse gases, CO2, feedback loops, tipping points, Paris Agreement, IPCC, net zero, carbon budget",
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
