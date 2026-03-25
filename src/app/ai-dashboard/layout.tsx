import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Industry Data | 4 Billion Years On",
  description:
    "Track global AI investment, adoption, research output, compute trends, and regulation with interactive charts and data.",
  openGraph: {
    title: "AI Industry Data",
    description:
      "Track global AI investment, adoption, research output, compute trends, and regulation with interactive charts and data.",
    images: [{ url: "https://4billionyearson.org/graphic-ai.png", width: 1200, height: 630, alt: "AI industry data dashboard" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
