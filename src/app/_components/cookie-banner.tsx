"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "true");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookie_consent", "false");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-black/95 backdrop-blur-md text-white border-t border-gray-800 shadow-2xl transition-transform">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
        <div className="text-sm md:text-base text-gray-300 leading-relaxed text-center md:text-left">
          We use cookies to personalise content and ads, to provide social media features and to analyse our traffic. We also share information about your use of our site with our social media, advertising and analytics partners. By clicking "Accept", you agree to our use of cookies.{" "}
          <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
            Read our Privacy Policy
          </Link>.
        </div>
        <div className="flex flex-row items-center gap-3 shrink-0">
          <button 
            onClick={declineCookies}
            className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 rounded-lg transition-colors"
          >
            Decline
          </button>
          <button 
            onClick={acceptCookies}
            className="px-5 py-2.5 text-sm font-bold text-black bg-[#FFF5E8] hover:bg-white rounded-lg transition-colors shadow-lg"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
