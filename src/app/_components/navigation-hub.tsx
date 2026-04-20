"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain, Cpu, Zap, Sun, Wind, Thermometer, Globe, Waves,
  CloudLightning, Factory, Dna, Microscope, BookOpen,
  ChevronRight, Newspaper, BarChart3,
} from "lucide-react";

/* ─── Section data ───────────────────────────────────────────────────────── */

interface SubLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: "live" | "monthly" | "annual";
  blogCategory?: string;   // slug for article-badge lookup
  desc: string;
}

interface Section {
  id: string;
  title: string;
  tagline: string;
  color: string;
  icon: React.ReactNode;
  links: SubLink[];
}

const SECTIONS: Section[] = [
  {
    id: "ai",
    title: "Artificial Intelligence",
    tagline: "Understanding the AI revolution",
    color: "#88DDFC",
    icon: <Brain className="h-6 w-6" />,
    links: [
      { href: "/ai-dashboard", label: "AI Industry Data", icon: <BarChart3 className="h-4 w-4" />, badge: "monthly", desc: "Investment, adoption & research" },
      { href: "/ai-explained", label: "AI Explained", icon: <Cpu className="h-4 w-4" />, desc: "Plain-English guide to AI" },
      { href: "/ai-books", label: "Books on AI", icon: <BookOpen className="h-4 w-4" />, desc: "Recommended reading on AI" },
      { href: "/category/artificial-intelligence", label: "Blog", icon: <Newspaper className="h-4 w-4" />, blogCategory: "artificial-intelligence", desc: "Latest articles" },
    ],
  },
  {
    id: "energy",
    title: "Renewable Energy",
    tagline: "Tracking the global shift to clean power",
    color: "#D2E369",
    icon: <Zap className="h-6 w-6" />,
    links: [
      { href: "/energy-dashboard", label: "Global Energy Data", icon: <Sun className="h-4 w-4" />, badge: "annual", desc: "Energy mix by country & source" },
      { href: "/energy-rankings", label: "Energy Rankings", icon: <BarChart3 className="h-4 w-4" />, badge: "annual", desc: "Top producers & consumers" },
      { href: "/energy-explained", label: "Energy Explained", icon: <BookOpen className="h-4 w-4" />, desc: "Plain-English guide" },
      { href: "/energy-books", label: "Books on Energy", icon: <BookOpen className="h-4 w-4" />, desc: "Recommended reading on energy" },
      { href: "/category/renewable-energy", label: "Blog", icon: <Newspaper className="h-4 w-4" />, blogCategory: "renewable-energy", desc: "Latest articles" },
    ],
  },
  {
    id: "climate",
    title: "Climate Change",
    tagline: "Live data on global warming, ice loss, and extreme weather",
    color: "#D0A65E",
    icon: <Globe className="h-6 w-6" />,
    links: [
      { href: "/climate-dashboard", label: "Global Climate Data", icon: <Thermometer className="h-4 w-4" />, badge: "monthly", desc: "Temperature anomalies & CO₂ trends" },
      { href: "/climate", label: "Climate Updates", icon: <Globe className="h-4 w-4" />, badge: "monthly", desc: "Country, state & region updates" },
      { href: "/planetary-boundaries", label: "Planetary Boundaries", icon: <Globe className="h-4 w-4" />, badge: "monthly", desc: "Nine Earth-system thresholds" },
      { href: "/greenhouse-gases", label: "Greenhouse Gases", icon: <Wind className="h-4 w-4" />, badge: "monthly", desc: "CO₂, methane & N₂O levels" },
      { href: "/sea-levels-ice", label: "Sea Levels & Ice", icon: <Waves className="h-4 w-4" />, badge: "monthly", desc: "Sea level rise & Arctic ice extent" },
      { href: "/extreme-weather", label: "Extreme Weather", icon: <CloudLightning className="h-4 w-4" />, badge: "live", desc: "Active disasters worldwide" },
      { href: "/emissions", label: "CO₂ Emissions", icon: <Factory className="h-4 w-4" />, badge: "annual", desc: "Country rankings & trends" },
      { href: "/climate-explained", label: "Climate Explained", icon: <BookOpen className="h-4 w-4" />, desc: "Plain-English guide" },
      { href: "/climate-books", label: "Books on Climate", icon: <BookOpen className="h-4 w-4" />, desc: "Recommended reading on climate" },
      { href: "/category/climate-change", label: "Blog", icon: <Newspaper className="h-4 w-4" />, blogCategory: "climate-change", desc: "Latest articles" },
    ],
  },
  {
    id: "biotech",
    title: "Biotechnology",
    tagline: "Gene editing, mRNA, and the future of medicine",
    color: "#FFF5E7",
    icon: <Dna className="h-6 w-6" />,
    links: [
      { href: "/biotech-dashboard", label: "Biotech Data", icon: <BarChart3 className="h-4 w-4" />, badge: "annual", desc: "Genomics, trials & research" },
      { href: "/biotech-explained", label: "Biotech Explained", icon: <Microscope className="h-4 w-4" />, desc: "Plain-English guide to biotech" },
      { href: "/biotech-books", label: "Books on Biotech", icon: <BookOpen className="h-4 w-4" />, desc: "Recommended reading on biotech" },
      { href: "/category/biotechnology", label: "Blog", icon: <Newspaper className="h-4 w-4" />, blogCategory: "biotechnology", desc: "Latest articles" },
    ],
  },
];

/* ─── Badge components ───────────────────────────────────────────────────── */

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
        Updated Monthly
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-bold tracking-wide uppercase text-violet-400 flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
      Updated Annually
    </span>
  );
}

function ArticleBadge({ status }: { status: string }) {
  if (status === "new")
    return (
      <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-bold tracking-wide uppercase text-amber-300 flex-shrink-0">
        <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-amber-400" />
        New Article
      </span>
    );
  if (status === "recent")
    return (
      <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-bold tracking-wide uppercase text-emerald-400 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Recent Article
      </span>
    );
  return null;
}

/* ─── Section card ───────────────────────────────────────────────────────── */

function SectionCard({ section, isExpanded, onToggle, recentCategories }: { section: Section; isExpanded: boolean; onToggle: () => void; recentCategories: Record<string, string> }) {
  const c = section.color;
  /* Pick a dark text color that contrasts with each category's background */
  const textMap: Record<string, string> = {
    "#88DDFC": "#FFF5E7",
    "#D2E369": "#2C5263",
    "#D0A65E": "#FFF5E7",
    "#FFF5E7": "#D26742",
  };
  const textColor = textMap[c] ?? "#1a1a1a";

  return (
    <div
      className="relative rounded-2xl border-2 transition-all duration-500 ease-out overflow-hidden"
      style={{ borderColor: c, background: `linear-gradient(to bottom, ${c} 0%, ${c} 20px, transparent 20px)`, boxShadow: isExpanded ? `0 4px 24px ${c}33` : '0 4px 12px rgba(0,0,0,0.4)' }}
    >

      {/* Colored header – title row */}
      <button
        onClick={onToggle}
        className="w-full text-left group"
      >
        <div className="px-4 py-3 md:px-5 md:py-4 flex items-center gap-2" style={{ backgroundColor: c }}>
          <div
            className={`transition-transform duration-300 flex-shrink-0 ${isExpanded ? "scale-110" : "group-hover:scale-105"}`}
            style={{ color: textColor }}
          >
            {section.icon}
          </div>
          <h3 className="flex-1 min-w-0 font-mono font-bold text-base md:text-lg tracking-wide leading-tight" style={{ color: textColor }}>
            {section.title}
          </h3>
          <ChevronRight
            className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-90" : "group-hover:translate-x-0.5"}`}
            style={{ color: `${textColor}99` }}
          />
        </div>
      </button>

      {/* Expandable links panel */}
      <div
        className={`grid transition-all duration-500 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="bg-gray-950/95 px-4 pb-4 md:px-5 md:pb-5 space-y-1">
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group/link"
              >
                <span className="opacity-60 group-hover/link:opacity-100 transition-opacity" style={{ color: section.color }}>
                  {link.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 group-hover/link:text-white transition-colors leading-tight">
                    {link.label}
                  </p>
                  <p className="text-[11px] text-gray-400 group-hover/link:text-gray-300 transition-colors leading-tight mt-0.5">
                    {link.desc}
                  </p>
                </div>
                {link.badge && <Badge type={link.badge} />}
                {link.blogCategory && recentCategories[link.blogCategory] && (
                  <ArticleBadge status={recentCategories[link.blogCategory]} />
                )}
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
  const [recentCategories, setRecentCategories] = useState<Record<string, string>>({});

  useEffect(() => {
    setHasMounted(true);
    fetch("/api/recent-posts").then(r => r.json()).then(setRecentCategories).catch(() => {});
  }, []);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <section className="w-full">
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
              recentCategories={recentCategories}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
