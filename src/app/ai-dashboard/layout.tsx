import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Industry Data | 4 Billion Years On",
  alternates: { canonical: 'https://4billionyearson.org/ai-dashboard' },
  description:
    "Track global AI investment, adoption, research output, compute trends, and regulation with interactive charts and data.",
  openGraph: {
    title: "AI Industry Data",
    description:
      "Track global AI investment, adoption, research output, compute trends, and regulation with interactive charts and data.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AI Industry Data Dashboard | 4 Billion Years On",
    description: "Track global AI investment, adoption, research output, compute trends, and regulation with interactive charts and data.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Global AI Industry Data",
  description: "Monthly-updated data on AI investment, compute trends, model capabilities, research output, energy use, and regulatory developments worldwide.",
  url: "https://4billionyearson.org/ai-dashboard",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["AI Investment", "Compute Trends", "AI Adoption", "Research Output", "AI Energy Use", "Model Parameters"],
  temporalCoverage: "2010/..",
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
