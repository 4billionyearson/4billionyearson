import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Planetary Boundaries – The Nine Factors Threatening Earth | 4 Billion Years On",
  description:
    "Live planetary boundary data updated regularly. Explore the nine critical Earth-system processes – from climate change and biodiversity loss to ocean acidification.",
  openGraph: {
    title: "Live Planetary Boundaries – The Nine Factors Threatening Earth",
    description:
      "Live data on the nine planetary boundaries. Track where humanity stands on climate change, biodiversity, ocean acidification, and more.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
