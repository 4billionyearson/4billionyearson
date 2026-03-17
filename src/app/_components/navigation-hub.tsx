"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain, Cpu, Zap, Sun, Wind, Thermometer, Globe, Waves,
  CloudLightning, Factory, Dna, Microscope, BookOpen,
  ChevronRight, Newspaper, BarChart3, MapPin,
} from "lucide-react";

/* ─── Section data ───────────────────────────────────────────────────────── */

interface SubLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: "live" | "monthly" | "annual";
  desc: string;
}

interface Section {
  id: string;
  title: string;
  tagline: string;
  accentFrom: string;
  accentTo: string;
  accentText: string;
  accentBorder: string;
  accentGlow: string;
  icon: React.ReactNode;
  links: SubLink[];
}

const SECTIONS: Section[] = [
  {
    id: "climate",
    title: "Climate Change",
    tagline: "Live data on global warming, ice loss, and extreme weather",
    accentFrom: "from-sky-400",
    accentTo: "to-teal-400",
    accentText: "text-sky-400",
    accentBorder: "border-sky-500/40",
    accentGlow: "shadow-sky-500/20",
    icon: <Globe className="h-6 w-6" />,
    links: [
      { href: "/climate-dashboard", label: "Global Climate Data", icon: <Thermometer className="h-4 w-4" />, badge: "monthly", desc: "Temperature anomalies & CO₂ trends" },
      { href: "/planetary-boundaries", label: "Planetary Boundaries", icon: <Globe className="h-4 w-4" />, badge: "monthly", desc: "Nine Earth-system thresholds" },
      { href: "/greenhouse-gases", label: "Greenhouse Gases", icon: <Wind className="h-4 w-4" />, badge: "monthly", desc: "CO₂, methane & N₂O levels" },
      { href: "/sea-levels-ice", label: "Sea Levels & Ice", icon: <Waves className="h-4 w-4" />, badge: "monthly", desc: "Sea level rise & Arctic ice extent" },
      { href: "/extreme-weather", label: "Extreme Weather", icon: <CloudLightning className="h-4 w-4" />, badge: "live", desc: "Active disasters worldwide" },
      { href: "/emissions", label: "CO₂ Emissions", icon: <Factory className="h-4 w-4" />, badge: "annual", desc: "Country rankings & trends" },
      { href: "/climate-explained", label: "Climate Explained", icon: <BookOpen className="h-4 w-4" />, desc: "Plain-English guide" },
      { href: "/category/climate-change", label: "Blog", icon: <Newspaper className="h-4 w-4" />, desc: "Latest articles" },
    ],
  },
  {
    id: "energy",
    title: "Renewable Energy",
    tagline: "Tracking the global shift to clean power",
    accentFrom: "from-emerald-400",
    accentTo: "to-lime-400",
    accentText: "text-emerald-400",
    accentBorder: "border-emerald-500/40",
    accentGlow: "shadow-emerald-500/20",
    icon: <Zap className="h-6 w-6" />,
    links: [
      { href: "/energy", label: "Global Energy Data", icon: <Sun className="h-4 w-4" />, badge: "annual", desc: "Energy mix by country & source" },
      { href: "/energy-rankings", label: "Energy Rankings", icon: <BarChart3 className="h-4 w-4" />, badge: "annual", desc: "Top producers & consumers" },
      { href: "/energy-explained", label: "Energy Explained", icon: <BookOpen className="h-4 w-4" />, desc: "Plain-English guide" },
      { href: "/category/renewable-energy", label: "Blog", icon: <Newspaper className="h-4 w-4" />, desc: "Latest articles" },
    ],
  },
  {
    id: "ai",
    title: "Artificial Intelligence",
    tagline: "Understanding the AI revolution",
    accentFrom: "from-violet-400",
    accentTo: "to-fuchsia-400",
    accentText: "text-violet-400",
    accentBorder: "border-violet-500/40",
    accentGlow: "shadow-violet-500/20",
    icon: <Brain className="h-6 w-6" />,
    links: [
      { href: "/ai-explained", label: "AI Explained", icon: <Cpu className="h-4 w-4" />, desc: "Plain-English guide to AI" },
      { href: "/category/artificial-intelligence", label: "Blog", icon: <Newspaper className="h-4 w-4" />, desc: "Latest articles" },
    ],
  },
  {
    id: "biotech",
    title: "Biotechnology",
    tagline: "Gene editing, mRNA, and the future of medicine",
    accentFrom: "from-fuchsia-400",
    accentTo: "to-rose-400",
    accentText: "text-fuchsia-400",
    accentBorder: "border-fuchsia-500/40",
    accentGlow: "shadow-fuchsia-500/20",
    icon: <Dna className="h-6 w-6" />,
    links: [
      { href: "/biotech-explained", label: "Biotech Explained", icon: <Microscope className="h-4 w-4" />, desc: "Plain-English guide to biotech" },
      { href: "/category/biotechnology", label: "Blog", icon: <Newspaper className="h-4 w-4" />, desc: "Latest articles" },
    ],
  },
];

/* ─── Badge component ────────────────────────────────────────────────────── */

function Badge({ type }: { type: "live" | "monthly" | "annual" }) {
  if (type === "live")
    return (
      <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-bold tracking-wide uppercase text-red-400 flex-shrink-0">
        <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500" />
        Live
      </span>
    );
  if (type === "monthly")
    return (
      <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-bold tracking-wide uppercase text-sky-400 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Monthly
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-bold tracking-wide uppercase text-violet-400 flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
      Annual
    </span>
  );
}

/* ─── Section card ───────────────────────────────────────────────────────── */

function SectionCard({ section, isExpanded, onToggle }: { section: Section; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div
      className={`
        relative rounded-2xl border transition-all duration-500 ease-out overflow-hidden
        ${isExpanded
          ? `${section.accentBorder} shadow-lg ${section.accentGlow} bg-gray-950/95`
          : "border-gray-800/60 bg-gray-950/70 hover:border-gray-700/80 hover:bg-gray-950/90"
        }
      `}
    >
      {/* Gradient accent bar at top */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${section.accentFrom} ${section.accentTo} transition-opacity duration-500 ${isExpanded ? "opacity-100" : "opacity-30 group-hover:opacity-60"}`} />

      {/* Header – always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-4 md:px-5 md:py-5 flex items-start gap-3 group"
      >
        <div className={`mt-0.5 ${section.accentText} transition-transform duration-300 ${isExpanded ? "scale-110" : "group-hover:scale-105"}`}>
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-mono font-bold text-white text-base md:text-lg tracking-wide leading-tight">
            {section.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{section.tagline}</p>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-gray-500 flex-shrink-0 mt-1 transition-transform duration-300 ${isExpanded ? "rotate-90" : "group-hover:translate-x-0.5"}`}
        />
      </button>

      {/* Expandable links panel */}
      <div
        className={`grid transition-all duration-500 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-1">
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group/link"
              >
                <span className={`${section.accentText} opacity-60 group-hover/link:opacity-100 transition-opacity`}>
                  {link.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 group-hover/link:text-white transition-colors leading-tight">
                    {link.label}
                  </p>
                  <p className="text-[11px] text-gray-600 group-hover/link:text-gray-500 transition-colors leading-tight mt-0.5">
                    {link.desc}
                  </p>
                </div>
                {link.badge && <Badge type={link.badge} />}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function NavigationHub() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <section className="w-full">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="h-5 w-5 text-gray-500" />
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-gray-500">Explore</h2>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SECTIONS.map((section, i) => (
          <div
            key={section.id}
            className="transition-all duration-500"
            style={{
              opacity: hasMounted ? 1 : 0,
              transform: hasMounted ? "translateY(0)" : "translateY(12px)",
              transitionDelay: `${i * 80}ms`,
            }}
          >
            <SectionCard
              section={section}
              isExpanded={expanded === section.id}
              onToggle={() => toggle(section.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
