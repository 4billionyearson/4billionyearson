import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Local & Global Energy Data | 4 Billion Years On",
  description:
    "Live energy data updated monthly. Track global and country-level renewable energy generation, compare sources, and explore the clean energy transition.",
  openGraph: {
    title: "Local & Global Energy Data",
    description:
      "Live energy data updated monthly. Track global and country-level renewable energy generation and the clean energy transition.",
    images: [{ url: "https://4billionyearson.org/graphic-renewables.png", width: 1200, height: 630, alt: "Renewable energy data dashboard" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
