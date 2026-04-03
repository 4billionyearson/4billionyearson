import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Local & Global Climate Change | 4 Billion Years On",
  alternates: { canonical: 'https://4billionyearson.org/climate-dashboard' },
  description:
    "Live climate data updated monthly. Compare global and local temperatures, track anomalies, and explore historical trends with interactive charts.",
  openGraph: {
    title: "Local & Global Climate Change",
    description:
      "Live climate data updated monthly. Compare global and local temperatures, track anomalies, and explore historical trends.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Climate Change Data Dashboard | 4 Billion Years On",
    description: "Live climate data updated monthly. Compare global and local temperatures, track anomalies, and explore historical trends.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Global & Local Climate Temperature Data",
  description: "Monthly-updated global and country-level temperature data including anomalies, historical trends, and climate projections.",
  url: "https://4billionyearson.org/climate-dashboard",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Temperature Anomaly", "Global Mean Temperature", "Country Temperature", "Climate Trend"],
  temporalCoverage: "1880/..",
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
