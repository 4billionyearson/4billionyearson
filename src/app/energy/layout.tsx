import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Energy Data — Global & Country Renewable Energy Tracker | 4 Billion Years On",
  description:
    "Live energy data updated monthly. Track global and country-level renewable energy generation, compare sources, and explore the clean energy transition.",
  openGraph: {
    title: "Live Energy Data — Global & Country Renewable Energy Tracker",
    description:
      "Live energy data updated monthly. Track global and country-level renewable energy generation and the clean energy transition.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
