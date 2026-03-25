import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Extreme Weather Tracker – Floods, Wildfires, Droughts & Storms | 4 Billion Years On",
  description:
    "Live extreme weather data with real-time GDACS alerts and historical trends from 1960. Track floods, wildfires, droughts, cyclones, and their human impact worldwide.",
  openGraph: {
    title: "Live Extreme Weather Tracker – Floods, Wildfires, Droughts & Storms",
    description:
      "Live extreme weather alerts and historical data. Track floods, wildfires, droughts, cyclones, deaths, and economic damage worldwide.",
    images: [{ url: "https://4billionyearson.org/graphic-climate.png", width: 1200, height: 630, alt: "Extreme weather tracker" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
