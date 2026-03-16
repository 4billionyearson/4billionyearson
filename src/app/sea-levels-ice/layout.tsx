import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Sea Level & Ice Data – Arctic, Antarctic & Global Trends | 4 Billion Years On",
  description:
    "Live sea level and ice sheet data updated monthly. Track global sea level rise, Arctic and Antarctic ice extent, and Greenland ice mass loss.",
  openGraph: {
    title: "Live Sea Level & Ice Data – Arctic, Antarctic & Global Trends",
    description:
      "Live sea level and ice data updated monthly. Track sea level rise, Arctic sea ice extent, and polar ice mass trends.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
