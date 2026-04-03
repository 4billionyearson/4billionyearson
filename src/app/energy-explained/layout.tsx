import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Energy Explained | 4 Billion Years On",
  description: "A plain-English guide to global energy: fossil fuels vs renewables, how electricity grids work, energy units explained, and the transition to clean power.",
  alternates: { canonical: 'https://4billionyearson.org/energy-explained' },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://4billionyearson.org/energy-explained",
  name: "Energy Explained | 4 Billion Years On",
  description:
    "A plain-English guide to global energy: fossil fuels vs renewables, how electricity grids work, energy units explained, and the transition to clean power.",
  url: "https://4billionyearson.org/energy-explained",
  isPartOf: { "@id": "https://4billionyearson.org/#website" },
  about: {
    "@type": "Thing",
    name: "Renewable Energy",
    sameAs: "https://en.wikipedia.org/wiki/Renewable_energy",
  },
  educationalLevel: "General Public",
  audience: {
    "@type": "Audience",
    audienceType: "Students, Researchers, Journalists, Educators, Policymakers, General Public",
  },
  keywords:
    "renewable energy, solar power, wind energy, fossil fuels, energy transition, clean energy, electricity grid, TWh, capacity factor, decarbonisation",
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
