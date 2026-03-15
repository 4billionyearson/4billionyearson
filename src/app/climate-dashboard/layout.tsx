import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Climate Dashboard — Global & Local Temperature Data | 4 Billion Years On",
  description:
    "Live climate data updated monthly. Compare global and local temperatures, track anomalies, and explore historical trends with interactive charts.",
  openGraph: {
    title: "Live Climate Dashboard — Global & Local Temperature Data",
    description:
      "Live climate data updated monthly. Compare global and local temperatures, track anomalies, and explore historical trends.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
