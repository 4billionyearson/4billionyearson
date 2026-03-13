import Footer from "@/app/_components/footer";
import Header from "@/app/_components/header";
import { CMS_NAME, HOME_OG_IMAGE_URL } from "@/lib/constants";
import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import cn from "classnames";
import { ThemeSwitcher } from "./_components/theme-switcher";

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
  title: "4 Billion Years On",
  description: "Exploring science, technology and the story of life on Earth.",
  openGraph: {
    images: [HOME_OG_IMAGE_URL],
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
        <ThemeSwitcher />
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
