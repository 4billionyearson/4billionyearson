import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biotech Data | 4 Billion Years On",
  description:
    "Genome sequencing costs, clinical trials, CRISPR research, and biotech publication trends — interactive charts powered by OWID, ClinicalTrials.gov, and PubMed.",
};

export default function BiotechDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
