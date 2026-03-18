import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Industry & Research Data | 4 Billion Years On",
  description:
    "Track global AI investment, adoption, research output, compute trends, and regulation with interactive charts and data.",
  openGraph: {
    title: "AI Industry & Research Data",
    description:
      "Track global AI investment, adoption, research output, compute trends, and regulation with interactive charts and data.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
