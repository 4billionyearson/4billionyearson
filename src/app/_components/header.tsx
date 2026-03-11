"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      <div className="container mx-auto px-0.5 md:px-2 flex items-center justify-between relative z-50">
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
          <Link href="/category/artificial-intelligence" className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${pathname === '/category/artificial-intelligence' ? 'text-[#89DEFD]' : 'text-[#FFF5E8] hover:text-[#89DEFD]'}`}>
            AI
          </Link>
          <Link href="/category/biotechnology" className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${pathname === '/category/biotechnology' ? 'text-[#D26742]' : 'text-[#FFF5E8] hover:text-[#D26742]'}`}>
            Biotech
          </Link>
          <Link href="/category/climate-change" className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${pathname === '/category/climate-change' ? 'text-[#D0A65E]' : 'text-[#FFF5E8] hover:text-[#D0A65E]'}`}>
            Climate
          </Link>
          <Link href="/category/renewable-energy" className={`uppercase whitespace-nowrap [text-shadow:0_1px_4px_black] transition-colors ${pathname === '/category/renewable-energy' ? 'text-[#D1E368]' : 'text-[#FFF5E8] hover:text-[#D1E368]'}`}>
            Renewables
          </Link>
          
          <div className="w-px h-4 bg-gray-600 shadow-xl"></div>

          
          <Link href="/climate-dashboard" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap [text-shadow:0_2px_4px_black]">
            Data Dashboard
          </Link>

          <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap [text-shadow:0_2px_4px_black]">
            Privacy
          </Link>
          <Link href="/about" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap [text-shadow:0_2px_4px_black]">
            About Us
          </Link>

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
          className="xl:hidden text-white text-4xl leading-none mt-2 mr-2.5 outline-none hover:text-gray-300" 
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
            
            <Link 
              href="/climate-dashboard" 
              className={`text-base px-6 py-4 border-b border-gray-600/50 w-full transition-colors ${pathname === '/climate-dashboard' ? 'text-white' : 'text-gray-300 hover:text-white'}`} 
              onClick={closeMenu}
            >
              Data Dashboard
            </Link>

            <Link href="/category/artificial-intelligence" className={`text-base px-6 py-4 border-b border-gray-600/50 w-full transition-colors ${pathname === '/category/artificial-intelligence' ? 'text-[#89DEFD]' : 'text-gray-300 hover:text-[#89DEFD]'}`} onClick={closeMenu}>
              AI
            </Link>
            <Link href="/category/biotechnology" className={`text-base px-6 py-4 border-b border-gray-600/50 w-full transition-colors ${pathname === '/category/biotechnology' ? 'text-[#D26742]' : 'text-gray-300 hover:text-[#D26742]'}`} onClick={closeMenu}>
              Biotech
            </Link>
            <Link href="/category/climate-change" className={`text-base px-6 py-4 border-b border-gray-600/50 w-full transition-colors ${pathname === '/category/climate-change' ? 'text-[#D0A65E]' : 'text-gray-300 hover:text-[#D0A65E]'}`} onClick={closeMenu}>
              Climate
            </Link>
            <Link href="/category/renewable-energy" className={`text-base px-6 py-4 border-b border-gray-600/50 w-full transition-colors ${pathname === '/category/renewable-energy' ? 'text-[#D1E368]' : 'text-gray-300 hover:text-[#D1E368]'}`} onClick={closeMenu}>
              Renewables
            </Link>
            
            <Link href="/privacy" className="text-gray-400 text-sm hover:text-white px-6 py-4 border-b border-gray-600/50 w-full" onClick={closeMenu}>
              Privacy
            </Link>
            <Link href="/about" className="text-gray-400 text-sm hover:text-white px-6 py-4 border-b border-gray-600/50 w-full" onClick={closeMenu}>
              About Us
            </Link>

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

