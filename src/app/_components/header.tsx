"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const Header = () => {
  const LiveBadge = () => (
    <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold tracking-wide uppercase text-red-400">
      <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      Live
    </span>
  );

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

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      closeMenu();
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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
              pathname === '/category/artificial-intelligence' ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              AI ▾
            </button>
            {isAIOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[200px]">
                <Link href="/category/artificial-intelligence" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/category/artificial-intelligence' ? 'text-[#89DEFD] bg-gray-900' : 'text-gray-300 hover:text-[#89DEFD] hover:bg-gray-900'}`} onClick={closeMenu}>
                  Blog Articles
                </Link>
                </div>
              </div>
            )}
          </div>

          {/* Renewables Dropdown */}
          <div className="relative" onMouseEnter={() => setIsRenewablesOpen(true)} onMouseLeave={() => setIsRenewablesOpen(false)}>
            <button className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${
              pathname === '/energy' || pathname === '/category/renewable-energy' ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              Renewables ▾
            </button>
            {isRenewablesOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[260px]">
                <Link href="/energy" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/energy' ? 'text-emerald-400 bg-gray-900' : 'text-gray-300 hover:text-emerald-400 hover:bg-gray-900'}`} onClick={closeMenu}>
                  Global & Country Energy Data<LiveBadge />
                </Link>
                <div className="border-t border-gray-700/50">
                <Link href="/category/renewable-energy" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/category/renewable-energy' ? 'text-[#D1E368] bg-gray-900' : 'text-gray-300 hover:text-[#D1E368] hover:bg-gray-900'}`} onClick={closeMenu}>
                  Blog Articles
                </Link>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Climate Change Dropdown */}
          <div className="relative" onMouseEnter={() => setIsClimateChangeOpen(true)} onMouseLeave={() => setIsClimateChangeOpen(false)}>
            <button className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${
              pathname === '/climate-dashboard' || pathname === '/planetary-boundaries' || pathname === '/greenhouse-gases' || pathname === '/sea-levels-ice' || pathname === '/extreme-weather' || pathname === '/category/climate-change' ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              Climate Change ▾
            </button>
            {isClimateChangeOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[240px]">
                <Link href="/climate-dashboard" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/climate-dashboard' ? 'text-white bg-gray-900' : 'text-gray-300 hover:text-white hover:bg-gray-900'}`} onClick={closeMenu}>
                  Global & Local Climate Data<LiveBadge />
                </Link>
                <Link href="/planetary-boundaries" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/planetary-boundaries' ? 'text-red-400 bg-gray-900' : 'text-gray-300 hover:text-red-400 hover:bg-gray-900'}`} onClick={closeMenu}>
                  The Nine Factors<LiveBadge />
                </Link>
                <Link href="/greenhouse-gases" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/greenhouse-gases' ? 'text-amber-400 bg-gray-900' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-900'}`} onClick={closeMenu}>
                  Greenhouse Gases<LiveBadge />
                </Link>
                <Link href="/sea-levels-ice" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/sea-levels-ice' ? 'text-teal-400 bg-gray-900' : 'text-gray-300 hover:text-teal-400 hover:bg-gray-900'}`} onClick={closeMenu}>
                  Sea Levels & Ice<LiveBadge />
                </Link>
                <Link href="/extreme-weather" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/extreme-weather' ? 'text-orange-400 bg-gray-900' : 'text-gray-300 hover:text-orange-400 hover:bg-gray-900'}`} onClick={closeMenu}>
                  Extreme Weather<LiveBadge />
                </Link>
                <div className="border-t border-gray-700/50">
                <Link href="/category/climate-change" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/category/climate-change' ? 'text-[#D0A65E] bg-gray-900' : 'text-gray-300 hover:text-[#D0A65E] hover:bg-gray-900'}`} onClick={closeMenu}>
                  Blog Articles
                </Link>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Biotech Dropdown */}
          <div className="relative" onMouseEnter={() => setIsBiotechOpen(true)} onMouseLeave={() => setIsBiotechOpen(false)}>
            <button className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${
              pathname === '/category/biotechnology' ? 'text-white' : 'text-[#FFF5E7] hover:text-white'
            }`}>
              Biotech ▾
            </button>
            {isBiotechOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[200px]">
                <Link href="/category/biotechnology" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/category/biotechnology' ? 'text-[#D26742] bg-gray-900' : 'text-gray-300 hover:text-[#D26742] hover:bg-gray-900'}`} onClick={closeMenu}>
                  Blog Articles
                </Link>
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
                <Link href="/category/artificial-intelligence" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/category/artificial-intelligence' ? 'text-[#89DEFD] bg-gray-900' : 'text-gray-300 hover:text-[#89DEFD] hover:bg-gray-900'}`} onClick={closeMenu}>
                  AI
                </Link>
                <Link href="/category/biotechnology" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/category/biotechnology' ? 'text-[#D26742] bg-gray-900' : 'text-gray-300 hover:text-[#D26742] hover:bg-gray-900'}`} onClick={closeMenu}>
                  Biotech
                </Link>
                <Link href="/category/climate-change" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/category/climate-change' ? 'text-[#D0A65E] bg-gray-900' : 'text-gray-300 hover:text-[#D0A65E] hover:bg-gray-900'}`} onClick={closeMenu}>
                  Climate
                </Link>
                <Link href="/category/renewable-energy" className={`block px-4 py-2.5 text-sm transition-colors ${pathname === '/category/renewable-energy' ? 'text-[#D1E368] bg-gray-900' : 'text-gray-300 hover:text-[#D1E368] hover:bg-gray-900'}`} onClick={closeMenu}>
                  Renewables
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
          className="xl:hidden text-white text-4xl leading-none mt-1 md:mt-2 mr-2.5 outline-none hover:text-gray-300" 
          aria-label="Menu"
          onClick={toggleMenu}
        >
          {isMenuOpen ? "×" : "≡"}
        </button>
      </div>

      {isMenuOpen && (
        <div className="xl:hidden absolute top-full left-0 right-0 bg-black/95 min-h-screen z-40 border-t border-gray-800">
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
                <Link href="/category/artificial-intelligence" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-600/50 w-full block transition-colors ${pathname === '/category/artificial-intelligence' ? 'text-[#89DEFD]' : 'text-gray-400 hover:text-[#89DEFD]'}`} onClick={closeMenu}>
                  Blog Articles
                </Link>
              </div>
            )}

            {/* Mobile Renewables Accordion */}
            <button
              className="text-base px-6 py-4 border-b border-gray-600/50 w-full text-left text-[#FFF5E7] flex items-center justify-between"
              onClick={() => setMobileRenewablesOpen(!mobileRenewablesOpen)}
            >
              Renewables
              <span className={`transition-transform ${mobileRenewablesOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {mobileRenewablesOpen && (
              <div className="bg-gray-950/50">
                <Link href="/energy" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/energy' ? 'text-emerald-400' : 'text-gray-400 hover:text-emerald-400'}`} onClick={closeMenu}>
                  Global & Country Energy Data<LiveBadge />
                </Link>
                <Link href="/category/renewable-energy" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-600/50 w-full block transition-colors ${pathname === '/category/renewable-energy' ? 'text-[#D1E368]' : 'text-gray-400 hover:text-[#D1E368]'}`} onClick={closeMenu}>
                  Blog Articles
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
                <Link href="/climate-dashboard" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/climate-dashboard' ? 'text-white' : 'text-gray-400 hover:text-white'}`} onClick={closeMenu}>
                  Global & Local Climate Data<LiveBadge />
                </Link>
                <Link href="/planetary-boundaries" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/planetary-boundaries' ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`} onClick={closeMenu}>
                  The Nine Factors<LiveBadge />
                </Link>
                <Link href="/greenhouse-gases" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/greenhouse-gases' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`} onClick={closeMenu}>
                  Greenhouse Gases<LiveBadge />
                </Link>
                <Link href="/sea-levels-ice" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/sea-levels-ice' ? 'text-teal-400' : 'text-gray-400 hover:text-teal-400'}`} onClick={closeMenu}>
                  Sea Levels & Ice<LiveBadge />
                </Link>
                <Link href="/extreme-weather" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/extreme-weather' ? 'text-orange-400' : 'text-gray-400 hover:text-orange-400'}`} onClick={closeMenu}>
                  Extreme Weather<LiveBadge />
                </Link>
                <Link href="/category/climate-change" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-600/50 w-full block transition-colors ${pathname === '/category/climate-change' ? 'text-[#D0A65E]' : 'text-gray-400 hover:text-[#D0A65E]'}`} onClick={closeMenu}>
                  Blog Articles
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
                <Link href="/category/biotechnology" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-600/50 w-full block transition-colors ${pathname === '/category/biotechnology' ? 'text-[#D26742]' : 'text-gray-400 hover:text-[#D26742]'}`} onClick={closeMenu}>
                  Blog Articles
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
                <Link href="/category/artificial-intelligence" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/category/artificial-intelligence' ? 'text-[#89DEFD]' : 'text-gray-400 hover:text-[#89DEFD]'}`} onClick={closeMenu}>
                  AI
                </Link>
                <Link href="/category/biotechnology" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/category/biotechnology' ? 'text-[#D26742]' : 'text-gray-400 hover:text-[#D26742]'}`} onClick={closeMenu}>
                  Biotech
                </Link>
                <Link href="/category/climate-change" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-800/50 w-full block transition-colors ${pathname === '/category/climate-change' ? 'text-[#D0A65E]' : 'text-gray-400 hover:text-[#D0A65E]'}`} onClick={closeMenu}>
                  Climate
                </Link>
                <Link href="/category/renewable-energy" className={`text-sm pl-10 pr-6 py-3 border-b border-gray-600/50 w-full block transition-colors ${pathname === '/category/renewable-energy' ? 'text-[#D1E368]' : 'text-gray-400 hover:text-[#D1E368]'}`} onClick={closeMenu}>
                  Renewables
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

