import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Planetary Boundaries – The Nine Factors Threatening Earth | 4 Billion Years On",
  alternates: { canonical: 'https://4billionyearson.org/planetary-boundaries' },
  description:
    "Live planetary boundary data updated regularly. Explore the nine critical Earth-system processes – from climate change and biodiversity loss to ocean acidification.",
  openGraph: {
    title: "Live Planetary Boundaries – The Nine Factors Threatening Earth",
    description:
      "Live data on the nine planetary boundaries. Track where humanity stands on climate change, biodiversity, ocean acidification, and more.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Planetary Boundaries Dashboard | 4 Billion Years On",
    description: "Live data on the nine planetary boundaries. Track where humanity stands on climate change, biodiversity, ocean acidification, and more.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Planetary Boundaries Status Data",
  description: "Data on the nine planetary boundaries framework including climate change, biosphere integrity, land system change, freshwater use, biogeochemical flows, ocean acidification, atmospheric aerosols, stratospheric ozone, and novel entities.",
  url: "https://4billionyearson.org/planetary-boundaries",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Climate Change Boundary", "Biodiversity Loss", "Nitrogen Cycle", "Ocean Acidification", "Land System Change", "Freshwater Use", "Ozone Depletion"],
  temporalCoverage: "1950/..",
  spatialCoverage: "Global",
  updateFrequency: "Monthly",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
