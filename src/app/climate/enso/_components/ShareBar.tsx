'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Code2, Copy, Link2, Mail, Share2 } from 'lucide-react';

interface ShareBarProps {
  /** The canonical URL to copy and share (plain, not encoded). */
  pageUrl: string;
  /** Pre-encoded share text for social URL query params. */
  shareText: string;
  /** Email subject line (plain text). */
  emailSubject?: string;
  /** If provided the dropdown shows an Embed code option. */
  embedUrl?: string;
  embedCode?: string;
  /** Which side the dropdown opens from. Default 'right'. */
  align?: 'left' | 'right';
  /** Override the default outer wrapper class (must keep `relative`). */
  wrapperClassName?: string;
}

export default function ShareBar({ pageUrl, shareText, emailSubject, embedUrl, embedCode, align = 'right', wrapperClassName }: ShareBarProps) {
  const [open, setOpen]               = useState(false);
  const [copied, setCopied]           = useState(false);
  const [showEmbed, setShowEmbed]     = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const shareUrl = encodeURIComponent(pageUrl);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyEmbed = () => {
    if (!embedCode) return;
    navigator.clipboard.writeText(embedCode).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    });
  };

  const SOCIAL_ITEMS: { label: string; href: string; icon: React.ReactNode }[] = [
    {
      label: 'Post on X',
      href: `https://x.com/intent/tweet?url=${shareUrl}&text=${shareText}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Post on Bluesky',
      href: `https://bsky.app/intent/compose?text=${shareText}%20${shareUrl}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 600 530" fill="currentColor" aria-hidden="true">
          <path d="M300 245c-30-75-110-200-190-225 0 80 40 160 130 185-110 0-150-60-150-60 0 90 60 175 170 175-30 20-65 30-110 30 70 50 160 55 230 20 70 35 160 30 230-20-45 0-80-10-110-30 110 0 170-85 170-175 0 0-40 60-150 60 90-25 130-105 130-185-80 25-160 150-190 225" />
        </svg>
      ),
    },
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      ),
    },
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      label: 'Pin on Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${shareUrl}&description=${shareText}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      ),
    },
    {
      label: 'Share via WhatsApp',
      href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      ),
    },
    {
      label: 'Send by email',
      href: `mailto:?subject=${encodeURIComponent(emailSubject ?? 'ENSO Tracker - 4 Billion Years On')}&body=${shareText}%20${pageUrl}`,
      icon: <Mail className="h-4 w-4 shrink-0" />,
    },
  ];

  const outerClass =
    wrapperClassName ?? `mt-4 flex ${align === 'left' ? 'justify-start' : 'justify-end'} relative`;
  const dropdownAnchor = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={outerClass} ref={wrapperRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-[#D0A65E]/50 text-gray-300 hover:text-white transition-all"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute bottom-full mb-2 ${dropdownAnchor} z-50 w-56 rounded-xl border border-gray-700 bg-gray-900/95 backdrop-blur-sm shadow-2xl overflow-hidden`}>
          {/* Copy direct link */}
          <div className="p-1.5">
            <button
              onClick={copyLink}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm"
            >
              {copied ? <Check className="h-4 w-4 shrink-0 text-green-400" /> : <Link2 className="h-4 w-4 shrink-0" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          <div className="h-px bg-gray-700/50" />

          {/* Social links */}
          <div className="p-1.5 space-y-0.5">
            {SOCIAL_ITEMS.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target={label === 'Send by email' ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm"
              >
                {icon}
                {label}
              </a>
            ))}
          </div>

          {/* Embed (optional) */}
          {embedUrl && embedCode && (
            <>
              <div className="h-px bg-gray-700/50" />
              <div className="p-1.5">
                <button
                  onClick={() => setShowEmbed((v) => !v)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <Code2 className="h-4 w-4 shrink-0" />
                  Embed code
                  <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-200 ${showEmbed ? 'rotate-180' : ''}`} />
                </button>
                {showEmbed && (
                  <div className="mt-1.5 px-1 pb-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-[#D0A65E]/70 font-mono">iframe snippet</p>
                      <button
                        onClick={copyEmbed}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        {embedCopied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                        {embedCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-gray-300 bg-gray-950 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all select-all">{embedCode}</pre>
                    <p className="text-[9px] text-gray-500 mt-1.5">Updates automatically with live NOAA data.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
