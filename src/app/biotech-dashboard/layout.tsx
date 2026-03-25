import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biotech Data | 4 Billion Years On",
  description:
    "Genome sequencing costs, clinical trials, CRISPR research, and biotech publication trends — interactive charts powered by OWID, ClinicalTrials.gov, and PubMed.",
  openGraph: {
    title: "Biotech Data",
    description:
      "Genome sequencing costs, clinical trials, CRISPR research, and biotech publication trends — interactive charts.",
    images: [{ url: "https://4billionyearson.org/graphic-biotech.png", width: 1200, height: 630, alt: "Biotechnology data dashboard" }],
  },
};

export default function BiotechDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
