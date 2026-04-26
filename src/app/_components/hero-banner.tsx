"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const STATS = [
  { value: "15",      label: "Live Dashboards", color: "#88DDFC" },
  { value: "4",       label: "Topic Hubs",      color: "#D2E369" },
  { value: "Regular", label: "Data Updates",    color: "#D0A65E" },
  { value: "Free",    label: "Open Access",     color: "#FFF5E7" },
];

export default function HeroBanner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <section
      className="text-center pt-3 pb-2 md:pt-4 md:pb-4"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      {/* Dark backdrop card */}
      <div className="relative rounded-2xl bg-black/55 backdrop-blur-sm border border-white/8 px-5 py-5 md:px-10 md:py-7">

        {/* Site logo centred at top */}
        <div className="flex justify-center mb-4 md:mb-5">
          <Image
            src="/logo.png"
            alt="4 Billion Years On"
            width={80}
            height={80}
            className="opacity-90"
            priority
          />
        </div>

        {/* Headline */}
        <h1 className="font-mono font-bold text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-[#FFF5E7] leading-tight mb-4 md:mb-5 max-w-3xl mx-auto">
          A living dashboard for the forces reshaping the world.
        </h1>

        {/* Coloured topic description */}
        <p className="text-sm md:text-base text-[#FFF5E7]/80 font-mono max-w-2xl mx-auto mb-6 md:mb-7 leading-relaxed">
          Tracking{" "}
          <span className="font-semibold" style={{ color: "#88DDFC" }}>Artificial Intelligence</span>
          {", "}
          <span className="font-semibold" style={{ color: "#D0A65E" }}>Climate Change</span>
          {", "}
          <span className="font-semibold" style={{ color: "#D2E369" }}>Renewable Energy</span>
          {" & "}
          <span className="font-semibold" style={{ color: "#FFF5E7" }}>Biotechnology</span>
          {" - interactive data, plain-English explainers & sourced articles."}
        </p>

        {/* Stat pills */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-gray-950/90 border border-gray-700"
            >
              <span
                className="font-mono font-bold text-sm md:text-base leading-none"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
              <span className="text-[10px] md:text-xs text-[#FFF5E7]/65 font-mono tracking-wide uppercase leading-none">
                {s.label}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

