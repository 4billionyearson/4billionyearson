import Footer from "@/app/_components/footer";
import Header from "@/app/_components/header";
import { CMS_NAME } from "@/lib/constants";
import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import cn from "classnames";
import CookieBanner from "./_components/cookie-banner";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceMono = Space_Mono({ 
  weight: ["400", "700"], 
  subsets: ["latin"], 
  variable: "--font-space-mono" 
});

export const metadata: Metadata = {
  metadataBase: new URL("https://4billionyearson.org"),
  title: {
    default: "4 Billion Years On - Climate, Energy, AI & Biotech Data",
    template: "%s | 4 Billion Years On",
  },
  description:
    "Track climate change, energy, AI, and biotech with interactive data, clear explainers, and sourced articles—updated monthly.",
  keywords: [
    "climate change data",
    "renewable energy dashboard",
    "global emissions tracker",
    "AI explained",
    "biotechnology news",
    "greenhouse gas data",
    "sea level rise",
    "arctic ice extent",
    "energy transition",
    "planetary boundaries",
    "extreme weather data",
    "climate science",
    "decarbonisation models",
  ],
  authors: [{ name: "4 Billion Years On" }],
  creator: "4 Billion Years On",
  publisher: "4 Billion Years On",
  openGraph: {
    type: "website",
    siteName: "4 Billion Years On",
    title: "4 Billion Years On - Climate, Energy, AI & Biotech Data",
    description:
      "Interactive dashboards and data-driven articles covering climate change, renewable energy, artificial intelligence and biotechnology.",
  },
  twitter: {
    card: "summary_large_image",
    title: "4 Billion Years On",
    description:
      "Interactive climate, energy, AI and biotech dashboards with sourced data visualisations.",
  },
  category: "Science & Technology",
  other: {
    "audience": "students, researchers, journalists, educators, policymakers, general public",
    "coverage": "global",
    "topic": "Climate Change, Renewable Energy, Artificial Intelligence, Biotechnology, Emissions, Sea Levels, Arctic Ice, Extreme Weather, Planetary Boundaries",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <meta name="theme-color" content="#000" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://4billionyearson.org/#website",
                  url: "https://4billionyearson.org",
                  name: "4 Billion Years On",
                  description:
                    "A living dashboard for the forces reshaping the world - tracking climate change, renewable energy, AI and biotechnology with interactive data visualisations and plain-English explainers.",
                  publisher: { "@id": "https://4billionyearson.org/#organization" },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: "https://4billionyearson.org/search?q={search_term_string}",
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://4billionyearson.org/#organization",
                  name: "4 Billion Years On",
                  url: "https://4billionyearson.org",
                  logo: "https://4billionyearson.org/logo.png",
                  description:
                    "A living dashboard for the forces reshaping the world. 4 Billion Years On provides interactive data dashboards, plain-English explainers and sourced articles on climate change, renewable energy, artificial intelligence and biotechnology - for students, researchers, journalists, educators and policymakers.",
                  sameAs: [],
                  knowsAbout: [
                    "Climate Change",
                    "Global Warming",
                    "Greenhouse Gas Emissions",
                    "Renewable Energy",
                    "Solar Energy",
                    "Wind Energy",
                    "Battery Storage",
                    "Energy Transition",
                    "Decarbonisation",
                    "Sea Level Rise",
                    "Arctic Sea Ice",
                    "Extreme Weather Events",
                    "Planetary Boundaries",
                    "Artificial Intelligence",
                    "Machine Learning",
                    "Large Language Models",
                    "Biotechnology",
                    "Gene Editing",
                    "CRISPR",
                  ],
                  audience: {
                    "@type": "Audience",
                    audienceType:
                      "Students, Researchers, Journalists, Educators, Policymakers, Environmental Analysts, Data Scientists, General Public",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={cn(inter.variable, spaceMono.variable, inter.className, "bg-black")}>
        <div 
          className="fixed inset-0 z-[-1]" 
          style={{
            backgroundColor: "#000000",
            backgroundImage: "url('/background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="relative z-10 flex flex-col min-h-screen">
          <Header />
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
        </div>
        <CookieBanner />
        <Analytics />
        <GoogleAnalytics gaId="G-VRE23E652Z" />
      </body>
    </html>
  );
}
