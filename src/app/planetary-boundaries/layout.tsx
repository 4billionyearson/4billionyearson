import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Planetary Boundaries – The Nine Factors Threatening Earth | 4 Billion Years On",
  description:
    "Live planetary boundary data updated regularly. Explore the nine critical Earth-system processes – from climate change and biodiversity loss to ocean acidification.",
  openGraph: {
    title: "Live Planetary Boundaries – The Nine Factors Threatening Earth",
    description:
      "Live data on the nine planetary boundaries. Track where humanity stands on climate change, biodiversity, ocean acidification, and more.",
    images: [{ url: "https://4billionyearson.org/graphic-climate.png", width: 1200, height: 630, alt: "Planetary boundaries dashboard" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
