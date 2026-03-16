import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Energy Rankings | 4 Billion Years On",
  description:
    "Live global rankings for renewable energy production, solar, wind, cleanest electricity grids, and fossil-fuel dependency — updated monthly.",
  openGraph: {
    title: "Global Energy Rankings | 4 Billion Years On",
    description:
      "Live global rankings for renewable energy production, solar, wind, cleanest electricity grids, and fossil-fuel dependency — updated monthly.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
