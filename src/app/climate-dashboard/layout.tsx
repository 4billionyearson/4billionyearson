import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Local & Global Climate Change | 4 Billion Years On",
  description:
    "Live climate data updated monthly. Compare global and local temperatures, track anomalies, and explore historical trends with interactive charts.",
  openGraph: {
    title: "Local & Global Climate Change",
    description:
      "Live climate data updated monthly. Compare global and local temperatures, track anomalies, and explore historical trends.",
    images: [{ url: "https://4billionyearson.org/graphic-climate.png", width: 1200, height: 630, alt: "Climate change data dashboard" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
