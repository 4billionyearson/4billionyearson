import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CO₂ Emissions by Country — Rankings & Trends | 4 Billion Years On",
  description:
    "Country-by-country CO₂ emissions data updated annually. Compare total and per-capita emissions, track historical trends, and explore sector breakdowns.",
  openGraph: {
    title: "CO₂ Emissions by Country — Rankings & Trends",
    description:
      "Annual CO₂ emissions data by country. Compare total and per-capita emissions, track trends, and explore sector breakdowns.",
    images: [{ url: "https://4billionyearson.org/graphic-climate.png", width: 1200, height: 630, alt: "CO₂ emissions by country" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
