import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Greenhouse Gas Tracker – CO₂, Methane & Temperature | 4 Billion Years On",
  description:
    "Live greenhouse gas data updated monthly. Track atmospheric CO₂, methane levels, temperature anomalies, and 800,000-year ice core records.",
  openGraph: {
    title: "Live Greenhouse Gas Tracker – CO₂, Methane & Temperature",
    description:
      "Live greenhouse gas data updated monthly. Track CO₂, methane, temperature anomalies, and historical ice core records.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
