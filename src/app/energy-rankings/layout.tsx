import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Energy Rankings | 4 Billion Years On",
  description:
    "Live global rankings for renewable energy production, solar, wind, cleanest electricity grids, and fossil-fuel dependency – updated monthly.",
  openGraph: {
    title: "Global Energy Rankings | 4 Billion Years On",
    description:
      "Live global rankings for renewable energy production, solar, wind, cleanest electricity grids, and fossil-fuel dependency – updated monthly.",
    type: "website",
    images: [{ url: "https://4billionyearson.org/graphic-renewables.png", width: 1200, height: 630, alt: "Global energy rankings" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
