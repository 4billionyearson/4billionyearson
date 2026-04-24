import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Extreme Weather Tracker – Floods, Wildfires, Droughts & Storms | 4 Billion Years On",
  alternates: { canonical: 'https://4billionyearson.org/extreme-weather' },
  description:
    "Live extreme weather data with real-time GDACS alerts and historical trends from 1960. Track floods, wildfires, droughts, cyclones, and their human impact worldwide.",
  openGraph: {
    title: "Live Extreme Weather Tracker – Floods, Wildfires, Droughts & Storms",
    description:
      "Live extreme weather alerts and historical data. Track floods, wildfires, droughts, cyclones, deaths, and economic damage worldwide.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Extreme Weather Tracker | 4 Billion Years On",
    description: "Live extreme weather alerts and historical data. Track floods, wildfires, droughts, cyclones, deaths, and economic damage worldwide.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Global Extreme Weather Events Data",
  description: "Live GDACS extreme weather alerts plus historical data from 1960 on floods, wildfires, droughts, cyclones, heatwaves - including deaths and economic damage.",
  url: "https://4billionyearson.org/extreme-weather",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Flood Events", "Wildfire Events", "Drought Events", "Cyclone Events", "Deaths from Extreme Weather", "Economic Damage"],
  temporalCoverage: "1960/..",
  spatialCoverage: "Global",
  updateFrequency: "Daily",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
