import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Sea Level & Ice Data – Arctic, Antarctic & Global Trends | 4 Billion Years On",
  alternates: { canonical: 'https://4billionyearson.org/sea-levels-ice' },
  description:
    "Live sea level and ice sheet data updated monthly. Track global sea level rise, Arctic and Antarctic ice extent, and Greenland ice mass loss.",
  openGraph: {
    title: "Live Sea Level & Ice Data – Arctic, Antarctic & Global Trends",
    description:
      "Live sea level and ice data updated monthly. Track sea level rise, Arctic sea ice extent, and polar ice mass trends.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sea Level & Ice Data | 4 Billion Years On",
    description: "Live sea level and ice data updated monthly. Track sea level rise, Arctic sea ice extent, and polar ice mass trends.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Global Sea Level & Polar Ice Data",
  description: "Monthly-updated sea level rise measurements, Arctic and Antarctic sea ice extent, and Greenland ice mass loss data from satellite and tide gauge records.",
  url: "https://4billionyearson.org/sea-levels-ice",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Global Mean Sea Level", "Arctic Sea Ice Extent", "Antarctic Sea Ice Extent", "Greenland Ice Mass", "Antarctic Ice Mass"],
  temporalCoverage: "1993/..",
  spatialCoverage: "Global, Arctic, Antarctic",
  updateFrequency: "Monthly",
  license: "https://creativecommons.org/licenses/by/4.0/",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
