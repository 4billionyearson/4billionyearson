import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biotech & Global Health Data | 4 Billion Years On",
  description:
    "Genome sequencing costs, clinical trials, life expectancy, vaccination coverage, and global health metrics — interactive charts powered by OWID, ClinicalTrials.gov, and PubMed.",
};

export default function BiotechDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
