import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biotech Data | 4 Billion Years On",
  alternates: { canonical: 'https://4billionyearson.org/biotech-dashboard' },
  description:
    "Genome sequencing costs, clinical trials, CRISPR research, and biotech publication trends - interactive charts powered by OWID, ClinicalTrials.gov, and PubMed.",
  openGraph: {
    title: "Biotech Data",
    description:
      "Genome sequencing costs, clinical trials, CRISPR research, and biotech publication trends - interactive charts.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Biotechnology Data Dashboard | 4 Billion Years On",
    description: "Genome sequencing costs, clinical trials, CRISPR research, and biotech publication trends - interactive charts.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Global Biotechnology Research & Industry Data",
  description: "Annual data on genome sequencing costs, CRISPR publications, clinical trial counts, gene therapy approvals, and biotech industry trends.",
  url: "https://4billionyearson.org/biotech-dashboard",
  creator: { "@type": "Organization", name: "4 Billion Years On", url: "https://4billionyearson.org" },
  variableMeasured: ["Genome Sequencing Cost", "CRISPR Publications", "Clinical Trials", "Gene Therapy Approvals", "Biotech Investment"],
  temporalCoverage: "2000/..",
  spatialCoverage: "Global",
  updateFrequency: "Annual",
  license: "https://creativecommons.org/licenses/by/4.0/",
};

export default function BiotechDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
