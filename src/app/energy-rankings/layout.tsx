import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Energy Rankings | 4 Billion Years On",
  description:
    "Live global rankings for renewable energy production, solar, wind, cleanest electricity grids, and fossil-fuel dependency – updated monthly.",
  openGraph: {
    title: "Global Energy Rankings | 4 Billion Years On",
    description:
      "Live global rankings for renewable energy production, solar, wind, cleanest electricity grids, and fossil-fuel dependency – updated monthly.",
    type: "website",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Global Energy Rankings | 4 Billion Years On",
    description: "Live global rankings for renewable energy production, solar, wind, cleanest electricity grids, and fossil-fuel dependency.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Global Energy Rankings",
  description: "Monthly-updated global country rankings for renewable energy production, solar capacity, wind capacity, clean electricity grids, and fossil-fuel dependency.",
  url: "https://4billionyearson.org/energy-rankings",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Renewable Energy Rank", "Solar Energy Rank", "Wind Energy Rank", "Cleanest Grid Rank", "Fossil Fuel Dependency Rank"],
  temporalCoverage: "2000/..",
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
