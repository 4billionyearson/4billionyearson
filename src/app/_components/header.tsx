"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const Header = () => {
  const LiveBadge = () => (
    <span className="flex items-center gap-1 mt-0.5 text-[10px] font-bold tracking-wide uppercase text-red-400">
      <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      Live
    </span>
  );
  const MonthlyBadge = () => (
    <span className="flex items-center gap-1 mt-0.5 text-[10px] font-bold tracking-wide uppercase text-sky-400">
      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
      Updated Monthly
    </span>
  );
  const AnnualBadge = () => (
    <span className="flex items-center gap-1 mt-0.5 text-[10px] font-bold tracking-wide uppercase text-violet-400">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
      Updated Annually
    </span>
  );
  const NewArticleBadge = () => (
    <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold tracking-wide uppercase text-amber-300">
      <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      New Article
    </span>
  );
  const RecentArticleBadge = () => (
    <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold tracking-wide uppercase text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
      Recent Article
    </span>
  );
  const ArticleBadge = ({ cat }: { cat: string }) => {
    const status = recentCategories[cat];
    if (status === 'new') return <NewArticleBadge />;
    if (status === 'recent') return <RecentArticleBadge />;
    return null;
  };

  const [recentCategories, setRecentCategories] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch('/api/recent-posts').then(r => r.json()).then(setRecentCategories).catch(() => {});
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isRenewablesOpen, setIsRenewablesOpen] = useState(false);
  const [isClimateChangeOpen, setIsClimateChangeOpen] = useState(false);
  const [isBiotechOpen, setIsBiotechOpen] = useState(false);
  const [isBlogOpen, setIsBlogOpen] = useState(false);
  const [mobileAIOpen, setMobileAIOpen] = useState(false);
  const [mobileRenewablesOpen, setMobileRenewablesOpen] = useState(false);
  const [mobileClimateOpen, setMobileClimateOpen] = useState(false);
  const [mobileBiotechOpen, setMobileBiotechOpen] = useState(false);
  const [mobileBlogOpen, setMobileBlogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const isClimateUpdatesPage = pathname === '/climate' || pathname?.startsWith('/climate/');

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      closeMenu();
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const desktopDropdownItemClass = (isActive: boolean, activeClasses: string, hoverClasses: string) =>
    `block px-4 py-2.5 text-sm transition-colors ${isActive ? `${activeClasses} bg-gray-900 hover:bg-gray-800/80` : `text-gray-300 ${hoverClasses} hover:bg-gray-900`}`;

  const mobileDropdownItemClass = (
    isActive: boolean,
    activeClasses: string,
    hoverClasses: string,
    borderClasses = 'border-b border-gray-800/50'
  ) =>
    `text-sm pl-10 pr-6 py-3 ${borderClasses} w-full block transition-colors ${isActive ? `${activeClasses} bg-gray-900/80 hover:bg-gray-900` : `text-gray-300 ${hoverClasses}`}`;

  return (
    <header className="w-full bg-transparent py-2 relative z-50">
      <div className="container mx-auto pt-1 md:pt-4 px-0.5 md:px-2 flex items-center justify-between relative z-50">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity" onClick={closeMenu}>
          <Image
            src="/header-logo.png"
            alt="4 Billion Years On"
            width={320}
            height={50}
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden xl:flex items-center gap-6 font-mono tracking-widest text-sm ml-auto mr-4 mt-3">
          {/* AI Dropdown */}
          <div className="relative" onMouseEnter={() => setIsAIOpen(true)} onMouseLeave={() => setIsAIOpen(false)}>
            <button className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${
              pathname === '/ai-explained' || pathname === '/ai-dashboard' || pathname === '/ai-books' || pathname === '/category/artificial-intelligence' ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              AI ▾
            </button>
            {isAIOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[200px]">
                <Link href="/ai-dashboard" className={desktopDropdownItemClass(pathname === '/ai-dashboard', 'text-[#88DDFC]', 'hover:text-[#88DDFC]')} onClick={closeMenu}>
                  AI Industry Data<MonthlyBadge />
                </Link>
                <Link href="/ai-explained" className={desktopDropdownItemClass(pathname === '/ai-explained', 'text-violet-300', 'hover:text-violet-300')} onClick={closeMenu}>
                  AI Explained
                </Link>
                <Link href="/ai-books" className={desktopDropdownItemClass(pathname === '/ai-books', 'text-violet-300', 'hover:text-violet-300')} onClick={closeMenu}>
                  Books on AI
                </Link>
                <div className="border-t border-gray-700/50">
                <Link href="/category/artificial-intelligence" className={desktopDropdownItemClass(pathname === '/category/artificial-intelligence', 'text-[#88DDFC]', 'hover:text-[#88DDFC]')} onClick={closeMenu}>
                  Blog{recentCategories['artificial-intelligence'] && <ArticleBadge cat="artificial-intelligence" />}
                </Link>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Renewables Dropdown */}
          <div className="relative" onMouseEnter={() => setIsRenewablesOpen(true)} onMouseLeave={() => setIsRenewablesOpen(false)}>
            <button className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${
              pathname === '/energy' || pathname === '/energy-rankings' || pathname === '/energy-explained' || pathname === '/energy-books' || pathname === '/category/renewable-energy' ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              Renewable Energy ▾
            </button>
            {isRenewablesOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[260px]">
                <Link href="/energy-dashboard" className={desktopDropdownItemClass(pathname === '/energy-dashboard', 'text-emerald-400', 'hover:text-emerald-400')} onClick={closeMenu}>
                  Local & Global Energy Data<AnnualBadge />
                </Link>
                <Link href="/energy-rankings" className={desktopDropdownItemClass(pathname === '/energy-rankings', 'text-emerald-400', 'hover:text-emerald-400')} onClick={closeMenu}>
                  Global Energy Rankings<AnnualBadge />
                </Link>
                <div className="border-t border-gray-700/50">
                <Link href="/energy-explained" className={desktopDropdownItemClass(pathname === '/energy-explained', 'text-emerald-300', 'hover:text-emerald-300')} onClick={closeMenu}>
                  Energy Explained
                </Link>
                <Link href="/energy-books" className={desktopDropdownItemClass(pathname === '/energy-books', 'text-emerald-300', 'hover:text-emerald-300')} onClick={closeMenu}>
                  Books on Energy
                </Link>
                <Link href="/category/renewable-energy" className={desktopDropdownItemClass(pathname === '/category/renewable-energy', 'text-[#D1E368]', 'hover:text-[#D1E368]')} onClick={closeMenu}>
                  Blog{recentCategories['renewable-energy'] && <ArticleBadge cat="renewable-energy" />}
                </Link>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Climate Change Dropdown */}
          <div className="relative" onMouseEnter={() => setIsClimateChangeOpen(true)} onMouseLeave={() => setIsClimateChangeOpen(false)}>
            <button className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${
              pathname === '/climate-dashboard' || pathname === '/climate' || pathname?.startsWith('/climate/') || pathname === '/planetary-boundaries' || pathname === '/greenhouse-gases' || pathname === '/sea-levels-ice' || pathname === '/extreme-weather' || pathname === '/emissions' || pathname === '/climate-explained' || pathname === '/climate-books' || pathname === '/category/climate-change' ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              Climate Change ▾
            </button>
            {isClimateChangeOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[280px]">
                <Link href="/climate-dashboard" className={desktopDropdownItemClass(pathname === '/climate-dashboard', 'text-gray-300', 'hover:text-[#E8C97A]')} onClick={closeMenu}>
                  Local & Global Climate Change<MonthlyBadge />
                </Link>
                <Link
                  href="/climate"
                  className={desktopDropdownItemClass(isClimateUpdatesPage, 'text-gray-300', 'hover:text-[#E8C97A]')}
                  onClick={closeMenu}
                >
                  Climate Updates<MonthlyBadge />
                </Link>
                <Link href="/planetary-boundaries" className={desktopDropdownItemClass(pathname === '/planetary-boundaries', 'text-red-400', 'hover:text-red-400')} onClick={closeMenu}>
                  The Nine Factors<MonthlyBadge />
                </Link>
                <Link href="/greenhouse-gases" className={desktopDropdownItemClass(pathname === '/greenhouse-gases', 'text-amber-400', 'hover:text-amber-400')} onClick={closeMenu}>
                  Greenhouse Gases<MonthlyBadge />
                </Link>
                <Link href="/sea-levels-ice" className={desktopDropdownItemClass(pathname === '/sea-levels-ice', 'text-teal-400', 'hover:text-teal-400')} onClick={closeMenu}>
                  Sea Levels & Ice<MonthlyBadge />
                </Link>
                <Link href="/extreme-weather" className={desktopDropdownItemClass(pathname === '/extreme-weather', 'text-orange-400', 'hover:text-orange-400')} onClick={closeMenu}>
                  Extreme Weather<LiveBadge />
                </Link>
                <Link href="/emissions" className={desktopDropdownItemClass(pathname === '/emissions', 'text-rose-400', 'hover:text-rose-400')} onClick={closeMenu}>
                  CO₂ Emissions<AnnualBadge />
                </Link>
                <div className="border-t border-gray-700/50">
                <Link href="/climate-explained" className={desktopDropdownItemClass(pathname === '/climate-explained', 'text-sky-400', 'hover:text-sky-400')} onClick={closeMenu}>
                  Climate Explained
                </Link>
                <Link href="/climate-books" className={desktopDropdownItemClass(pathname === '/climate-books', 'text-sky-400', 'hover:text-sky-400')} onClick={closeMenu}>
                  Books on Climate
                </Link>
                <Link href="/category/climate-change" className={desktopDropdownItemClass(pathname === '/category/climate-change', 'text-[#D0A65E]', 'hover:text-[#D0A65E]')} onClick={closeMenu}>
                  Blog{recentCategories['climate-change'] && <ArticleBadge cat="climate-change" />}
                </Link>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Biotech Dropdown */}
          <div className="relative" onMouseEnter={() => setIsBiotechOpen(true)} onMouseLeave={() => setIsBiotechOpen(false)}>
            <button className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${
              pathname === '/biotech-explained' || pathname === '/biotech-dashboard' || pathname === '/biotech-books' || pathname === '/category/biotechnology' ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              Biotech ▾
            </button>
            {isBiotechOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[200px]">
                <Link href="/biotech-dashboard" className={desktopDropdownItemClass(pathname === '/biotech-dashboard', 'text-pink-400', 'hover:text-pink-400')} onClick={closeMenu}>
                  Biotech Data<AnnualBadge />
                </Link>
                <Link href="/biotech-explained" className={desktopDropdownItemClass(pathname === '/biotech-explained', 'text-fuchsia-300', 'hover:text-fuchsia-300')} onClick={closeMenu}>
                  Biotech Explained
                </Link>
                <Link href="/biotech-books" className={desktopDropdownItemClass(pathname === '/biotech-books', 'text-fuchsia-300', 'hover:text-fuchsia-300')} onClick={closeMenu}>
                  Books on Biotech
                </Link>
                <div className="border-t border-gray-700/50">
                <Link href="/category/biotechnology" className={desktopDropdownItemClass(pathname === '/category/biotechnology', 'text-[#D26742]', 'hover:text-[#D26742]')} onClick={closeMenu}>
                  Blog{recentCategories['biotechnology'] && <ArticleBadge cat="biotechnology" />}
                </Link>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Blog Dropdown */}
          <div className="relative" onMouseEnter={() => setIsBlogOpen(true)} onMouseLeave={() => setIsBlogOpen(false)}>
            <button className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${
              pathname?.startsWith('/category/') ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              Blog ▾
            </button>
            {isBlogOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[160px]">
                <Link href="/category/artificial-intelligence" className={desktopDropdownItemClass(pathname === '/category/artificial-intelligence', 'text-[#89DEFD]', 'hover:text-[#89DEFD]')} onClick={closeMenu}>
                  AI{recentCategories['artificial-intelligence'] && <ArticleBadge cat="artificial-intelligence" />}
                </Link>
                <Link href="/category/biotechnology" className={desktopDropdownItemClass(pathname === '/category/biotechnology', 'text-[#D26742]', 'hover:text-[#D26742]')} onClick={closeMenu}>
                  Biotech{recentCategories['biotechnology'] && <ArticleBadge cat="biotechnology" />}
                </Link>
                <Link href="/category/climate-change" className={desktopDropdownItemClass(pathname === '/category/climate-change', 'text-[#D0A65E]', 'hover:text-[#D0A65E]')} onClick={closeMenu}>
                  Climate{recentCategories['climate-change'] && <ArticleBadge cat="climate-change" />}
                </Link>
                <Link href="/category/renewable-energy" className={desktopDropdownItemClass(pathname === '/category/renewable-energy', 'text-[#D1E368]', 'hover:text-[#D1E368]')} onClick={closeMenu}>
                  Renewables{recentCategories['renewable-energy'] && <ArticleBadge cat="renewable-energy" />}
                </Link>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="flex border border-gray-600 rounded overflow-hidden bg-black/30 ml-2 hover:border-gray-400 transition-colors">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..." 
              className="bg-transparent text-white w-24 focus:w-40 transition-all duration-300 py-1.5 px-3 outline-none font-sans tracking-normal text-sm"
            />
            <button type="submit" className="px-2 text-gray-400 hover:text-white bg-black/50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </form>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="xl:hidden text-white w-10 h-10 flex items-center justify-center mt-1 md:mt-2 mr-2.5 outline-none hover:text-gray-300 transition-colors" 
          aria-label="Menu"
          onClick={toggleMenu}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {isMenuOpen ? (
              <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
            ) : (
              <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <div className="xl:hidden fixed inset-0 top-[var(--header-h)] bg-black/95 z-[60] border-t border-gray-800 overflow-y-auto" style={{ '--header-h': '0px' } as React.CSSProperties} ref={(el) => { if (el) { const header = el.closest('header'); if (header) el.style.setProperty('--header-h', header.offsetHeight + 'px'); } }}>
          <nav className="flex flex-col w-full text-left font-mono tracking-widest">
            <Link href="/" className="text-white text-base hover:text-gray-300 px-6 py-4 border-b border-gray-600/50 w-full" onClick={closeMenu}>
              Home
            </Link>
            
            {/* Mobile AI Accordion */}
            <button
              className="text-base px-6 py-4 border-b border-gray-600/50 w-full text-left text-[#FFF5E7] flex items-center justify-between"
              onClick={() => setMobileAIOpen(!mobileAIOpen)}
            >
              AI
              <span className={`transition-transform ${mobileAIOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {mobileAIOpen && (
              <div className="bg-gray-950/50">
                <Link href="/ai-dashboard" className={mobileDropdownItemClass(pathname === '/ai-dashboard', 'text-[#88DDFC]', 'hover:text-[#88DDFC]')} onClick={closeMenu}>
                  AI Industry Data<MonthlyBadge />
                </Link>
                <Link href="/ai-explained" className={mobileDropdownItemClass(pathname === '/ai-explained', 'text-violet-300', 'hover:text-violet-300')} onClick={closeMenu}>
                  AI Explained
                </Link>
                <Link href="/ai-books" className={mobileDropdownItemClass(pathname === '/ai-books', 'text-violet-300', 'hover:text-violet-300')} onClick={closeMenu}>
                  Books on AI
                </Link>
                <Link href="/category/artificial-intelligence" className={mobileDropdownItemClass(pathname === '/category/artificial-intelligence', 'text-[#88DDFC]', 'hover:text-[#88DDFC]', 'border-b border-gray-600/50')} onClick={closeMenu}>
                  Blog{recentCategories['artificial-intelligence'] && <ArticleBadge cat="artificial-intelligence" />}
                </Link>
              </div>
            )}

            {/* Mobile Renewable Energy Accordion */}
            <button
              className="text-base px-6 py-4 border-b border-gray-600/50 w-full text-left text-[#FFF5E7] flex items-center justify-between"
              onClick={() => setMobileRenewablesOpen(!mobileRenewablesOpen)}
            >
              Renewable Energy
              <span className={`transition-transform ${mobileRenewablesOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {mobileRenewablesOpen && (
              <div className="bg-gray-950/50">
                <Link href="/energy-dashboard" className={mobileDropdownItemClass(pathname === '/energy-dashboard', 'text-emerald-400', 'hover:text-emerald-400')} onClick={closeMenu}>
                  Local & Global Energy Data<AnnualBadge />
                </Link>
                <Link href="/energy-rankings" className={mobileDropdownItemClass(pathname === '/energy-rankings', 'text-emerald-400', 'hover:text-emerald-400')} onClick={closeMenu}>
                  Global Energy Rankings<AnnualBadge />
                </Link>
                <Link href="/energy-explained" className={mobileDropdownItemClass(pathname === '/energy-explained', 'text-emerald-300', 'hover:text-emerald-300')} onClick={closeMenu}>
                  Energy Explained
                </Link>
                <Link href="/energy-books" className={mobileDropdownItemClass(pathname === '/energy-books', 'text-emerald-300', 'hover:text-emerald-300')} onClick={closeMenu}>
                  Books on Energy
                </Link>
                <Link href="/category/renewable-energy" className={mobileDropdownItemClass(pathname === '/category/renewable-energy', 'text-[#D1E368]', 'hover:text-[#D1E368]', 'border-b border-gray-600/50')} onClick={closeMenu}>
                  Blog{recentCategories['renewable-energy'] && <ArticleBadge cat="renewable-energy" />}
                </Link>
              </div>
            )}

            {/* Mobile Climate Change Accordion */}
            <button
              className="text-base px-6 py-4 border-b border-gray-600/50 w-full text-left text-[#FFF5E7] flex items-center justify-between"
              onClick={() => setMobileClimateOpen(!mobileClimateOpen)}
            >
              Climate Change
              <span className={`transition-transform ${mobileClimateOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {mobileClimateOpen && (
              <div className="bg-gray-950/50">
                <Link href="/climate-dashboard" className={mobileDropdownItemClass(pathname === '/climate-dashboard', 'text-gray-300', 'hover:text-[#E8C97A]')} onClick={closeMenu}>
                  Local & Global Climate Change<MonthlyBadge />
                </Link>
                <Link
                  href="/climate"
                  className={mobileDropdownItemClass(isClimateUpdatesPage, 'text-gray-300', 'hover:text-[#E8C97A]')}
                  onClick={closeMenu}
                >
                  Climate Updates<MonthlyBadge />
                </Link>
                <Link href="/planetary-boundaries" className={mobileDropdownItemClass(pathname === '/planetary-boundaries', 'text-red-400', 'hover:text-red-400')} onClick={closeMenu}>
                  The Nine Factors<MonthlyBadge />
                </Link>
                <Link href="/greenhouse-gases" className={mobileDropdownItemClass(pathname === '/greenhouse-gases', 'text-amber-400', 'hover:text-amber-400')} onClick={closeMenu}>
                  Greenhouse Gases<MonthlyBadge />
                </Link>
                <Link href="/sea-levels-ice" className={mobileDropdownItemClass(pathname === '/sea-levels-ice', 'text-teal-400', 'hover:text-teal-400')} onClick={closeMenu}>
                  Sea Levels & Ice<MonthlyBadge />
                </Link>
                <Link href="/extreme-weather" className={mobileDropdownItemClass(pathname === '/extreme-weather', 'text-orange-400', 'hover:text-orange-400')} onClick={closeMenu}>
                  Extreme Weather<LiveBadge />
                </Link>
                <Link href="/emissions" className={mobileDropdownItemClass(pathname === '/emissions', 'text-rose-400', 'hover:text-rose-400')} onClick={closeMenu}>
                  CO₂ Emissions<AnnualBadge />
                </Link>
                <Link href="/climate-explained" className={mobileDropdownItemClass(pathname === '/climate-explained', 'text-sky-400', 'hover:text-sky-400')} onClick={closeMenu}>
                  Climate Explained
                </Link>
                <Link href="/climate-books" className={mobileDropdownItemClass(pathname === '/climate-books', 'text-sky-400', 'hover:text-sky-400')} onClick={closeMenu}>
                  Books on Climate
                </Link>
                <Link href="/category/climate-change" className={mobileDropdownItemClass(pathname === '/category/climate-change', 'text-[#D0A65E]', 'hover:text-[#D0A65E]', 'border-b border-gray-600/50')} onClick={closeMenu}>
                  Blog{recentCategories['climate-change'] && <ArticleBadge cat="climate-change" />}
                </Link>
              </div>
            )}

            {/* Mobile Biotech Accordion */}
            <button
              className="text-base px-6 py-4 border-b border-gray-600/50 w-full text-left text-[#FFF5E7] flex items-center justify-between"
              onClick={() => setMobileBiotechOpen(!mobileBiotechOpen)}
            >
              Biotech
              <span className={`transition-transform ${mobileBiotechOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {mobileBiotechOpen && (
              <div className="bg-gray-950/50">
                <Link href="/biotech-dashboard" className={mobileDropdownItemClass(pathname === '/biotech-dashboard', 'text-pink-400', 'hover:text-pink-400')} onClick={closeMenu}>
                  Biotech Data<AnnualBadge />
                </Link>
                <Link href="/biotech-explained" className={mobileDropdownItemClass(pathname === '/biotech-explained', 'text-fuchsia-300', 'hover:text-fuchsia-300')} onClick={closeMenu}>
                  Biotech Explained
                </Link>
                <Link href="/biotech-books" className={mobileDropdownItemClass(pathname === '/biotech-books', 'text-fuchsia-300', 'hover:text-fuchsia-300')} onClick={closeMenu}>
                  Books on Biotech
                </Link>
                <Link href="/category/biotechnology" className={mobileDropdownItemClass(pathname === '/category/biotechnology', 'text-[#D26742]', 'hover:text-[#D26742]', 'border-b border-gray-600/50')} onClick={closeMenu}>
                  Blog{recentCategories['biotechnology'] && <ArticleBadge cat="biotechnology" />}
                </Link>
              </div>
            )}

            {/* Mobile Blog Accordion */}
            <button
              className="text-base px-6 py-4 border-b border-gray-600/50 w-full text-left text-[#FFF5E7] flex items-center justify-between"
              onClick={() => setMobileBlogOpen(!mobileBlogOpen)}
            >
              Blog
              <span className={`transition-transform ${mobileBlogOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {mobileBlogOpen && (
              <div className="bg-gray-950/50">
                <Link href="/category/artificial-intelligence" className={mobileDropdownItemClass(pathname === '/category/artificial-intelligence', 'text-[#89DEFD]', 'hover:text-[#89DEFD]')} onClick={closeMenu}>
                  AI{recentCategories['artificial-intelligence'] && <ArticleBadge cat="artificial-intelligence" />}
                </Link>
                <Link href="/category/biotechnology" className={mobileDropdownItemClass(pathname === '/category/biotechnology', 'text-[#D26742]', 'hover:text-[#D26742]')} onClick={closeMenu}>
                  Biotech{recentCategories['biotechnology'] && <ArticleBadge cat="biotechnology" />}
                </Link>
                <Link href="/category/climate-change" className={mobileDropdownItemClass(pathname === '/category/climate-change', 'text-[#D0A65E]', 'hover:text-[#D0A65E]')} onClick={closeMenu}>
                  Climate{recentCategories['climate-change'] && <ArticleBadge cat="climate-change" />}
                </Link>
                <Link href="/category/renewable-energy" className={mobileDropdownItemClass(pathname === '/category/renewable-energy', 'text-[#D1E368]', 'hover:text-[#D1E368]', 'border-b border-gray-600/50')} onClick={closeMenu}>
                  Renewables{recentCategories['renewable-energy'] && <ArticleBadge cat="renewable-energy" />}
                </Link>
              </div>
            )}

            <div className="px-6 py-6 w-full max-w-md">
              <form onSubmit={handleSearch} className="flex border border-gray-400 rounded-md overflow-hidden bg-black/50">
                <button type="submit" className="px-4 text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </button>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search" 
                  className="bg-transparent text-white w-full py-3 px-2 outline-none font-sans tracking-normal"
                />
              </form>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;

