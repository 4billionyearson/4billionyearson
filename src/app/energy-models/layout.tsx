import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Renewable Energy Models | 4 Billion Years On",
  description:
    "Interactive models comparing decarbonisation pathways: home batteries, grid storage, heat pumps, EVs, and renewables — with live cost-per-tonne and CO₂ analysis for the UK and US.",
  openGraph: {
    title: "Renewable Energy Models | 4 Billion Years On",
    description:
      "Interactive models comparing decarbonisation pathways: home batteries, grid storage, heat pumps, EVs, and renewables — with live cost-per-tonne and CO₂ analysis.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
