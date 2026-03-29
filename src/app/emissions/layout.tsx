import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CO₂ Emissions by Country — Rankings & Trends | 4 Billion Years On",
  description:
    "Country-by-country CO₂ emissions data updated annually. Compare total and per-capita emissions, track historical trends, and explore sector breakdowns.",
  openGraph: {
    title: "CO₂ Emissions by Country — Rankings & Trends",
    description:
      "Annual CO₂ emissions data by country. Compare total and per-capita emissions, track trends, and explore sector breakdowns.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "CO₂ Emissions Data by Country | 4 Billion Years On",
    description: "Annual CO₂ emissions data by country. Compare total and per-capita emissions, track trends, and explore sector breakdowns.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "CO₂ Emissions by Country",
  description: "Annual country-level CO₂ emissions data including total emissions, per-capita figures, sector breakdowns, and historical trends.",
  url: "https://4billionyearson.org/emissions",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Total CO₂ Emissions", "Per-Capita CO₂", "Emissions by Sector", "Cumulative Emissions", "Emissions Trend"],
  temporalCoverage: "1750/..",
  spatialCoverage: "Global",
  updateFrequency: "Annual",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
