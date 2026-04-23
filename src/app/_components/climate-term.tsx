"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { DRIVERS_BY_ID, findDriverByTerm, type DriverId, type WarmingDriver } from '@/lib/climate/warming-drivers';

interface TermProps {
  /** Explicit driver id. If omitted, `children` text is matched against driver term+aliases. */
  id?: DriverId;
  /** Optional className to customise the underline colour, weight etc. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Climate-concept tooltip. Renders an underlined span; on hover (desktop) or
 * tap (touch) shows a popover with a short definition, a "Read more" link
 * deep-linking to the explainer page, and the authoritative source.
 *
 * Usage:
 *   <Term id="arctic-amplification">Arctic amplification</Term>
 *   <Term>albedo effect</Term>   // resolved via alias match
 */
export default function Term({ id, className, children }: TermProps) {
  const driver: WarmingDriver | undefined =
    id ? DRIVERS_BY_ID[id] : typeof children === 'string' ? findDriverByTerm(children) : undefined;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Position the portal-rendered tooltip directly under the trigger, clamped
  // to the viewport so it never clips off-screen at card edges.
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const tooltipWidth = Math.min(320, window.innerWidth - 16);
      const desiredCenter = r.left + r.width / 2;
      const left = Math.max(8, Math.min(window.innerWidth - tooltipWidth - 8, desiredCenter - tooltipWidth / 2));
      setCoords({ top: r.bottom + 8, left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (!driver) {
    // Unknown term → render plain text so we fail gracefully.
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      ref={ref}
      className="relative inline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={`border-b border-dotted border-teal-300/60 text-teal-300 hover:text-teal-200 hover:border-teal-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950 transition-colors cursor-help ${className ?? ''}`}
      >
        {children}
      </button>

      {open && mounted && coords &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: 'min(320px, calc(100vw - 16px))', zIndex: 9999 }}
            className="rounded-lg border border-teal-500/30 bg-gray-950/98 p-3 text-left shadow-xl backdrop-blur-sm text-xs leading-relaxed text-gray-200 normal-case pointer-events-auto"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <span className="block font-semibold text-teal-200 mb-1">{driver.term}</span>
            <span className="block text-gray-300">{driver.short}</span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <Link
                href={`/climate-explained#${driver.id}`}
                className="text-teal-300 hover:text-teal-200 font-semibold"
                onClick={() => setOpen(false)}
              >
                Read more →
              </Link>
              <a
                href={driver.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-400 hover:text-teal-300"
              >
                {driver.source.name}
                <ExternalLink className="h-3 w-3" />
              </a>
            </span>
          </span>,
          document.body,
        )}
    </span>
  );
}
