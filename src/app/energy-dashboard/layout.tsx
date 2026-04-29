import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Local & Global Energy Data | 4 Billion Years On",
  alternates: { canonical: 'https://4billionyearson.org/energy-dashboard' },
  description:
    "Live energy data updated monthly. Track global and country-level renewable energy generation, compare sources, and explore the clean energy transition.",
  openGraph: {
    title: "Local & Global Energy Data",
    description:
      "Live energy data updated monthly. Track global and country-level renewable energy generation and the clean energy transition.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Renewable Energy Data Dashboard | 4 Billion Years On",
    description: "Live energy data updated monthly. Track global and country-level renewable energy generation and the clean energy transition.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Global Renewable Energy Generation Data",
  description: "Annual and monthly energy generation and capacity data by country, covering solar, wind, hydro, nuclear, and fossil fuels.",
  url: "https://4billionyearson.org/energy-dashboard",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Renewable Energy Generation", "Solar Capacity", "Wind Capacity", "Energy Mix", "Fossil Fuel Share"],
  temporalCoverage: "2000/..",
  spatialCoverage: "Global",
  updateFrequency: "Annual",
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
