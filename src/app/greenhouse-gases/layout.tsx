import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Greenhouse Gas Tracker – CO₂, Methane & Temperature | 4 Billion Years On",
  alternates: { canonical: 'https://4billionyearson.org/greenhouse-gases' },
  description:
    "Live greenhouse gas data updated monthly. Track atmospheric CO₂, methane levels, temperature anomalies, and 800,000-year ice core records.",
  openGraph: {
    title: "Live Greenhouse Gas Tracker – CO₂, Methane & Temperature",
    description:
      "Live greenhouse gas data updated monthly. Track CO₂, methane, temperature anomalies, and historical ice core records.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Greenhouse Gas Tracker | 4 Billion Years On",
    description: "Live greenhouse gas data updated monthly. Track CO₂, methane, temperature anomalies, and 800,000-year ice core records.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Atmospheric Greenhouse Gas Concentrations",
  description: "Monthly atmospheric CO₂, methane (CH₄), and nitrous oxide (N₂O) concentrations, global temperature anomalies, and 800,000-year ice core records.",
  url: "https://4billionyearson.org/greenhouse-gases",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Atmospheric CO₂ (ppm)", "Methane Concentration (ppb)", "N₂O Concentration (ppb)", "Temperature Anomaly", "Ice Core CO₂"],
  temporalCoverage: "-800000/..",
  spatialCoverage: "Global",
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
