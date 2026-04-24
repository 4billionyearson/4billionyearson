"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  title: string;
  body: React.ReactNode;
  /** Trigger content (the pill itself). */
  children: React.ReactNode;
  /** Optional className on the trigger wrapper. */
  className?: string;
}

/**
 * Hover/tap tooltip in the same visual style as the climate driver tooltips
 * (`<Term>`): portal-rendered, teal border, short title + body text, with a
 * `cursor-help` question-mark cursor on the trigger. Use this for short
 * glossary-style explanations attached to badges or inline terms where no
 * full explainer page exists.
 */
export default function InfoTooltip({ title, body, children, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  return (
    <span
      ref={ref}
      className={`relative inline-flex cursor-help ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => {
        e.preventDefault();
        setOpen((v) => !v);
      }}
      aria-describedby={open ? tooltipId : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
    >
      {children}

      {open && mounted && coords &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: 'min(320px, calc(100vw - 16px))', zIndex: 9999 }}
            className="rounded-lg border border-teal-500/40 bg-gray-950 p-3 text-left shadow-2xl text-xs leading-relaxed text-gray-200 normal-case pointer-events-auto"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <span className="block font-semibold text-teal-200 mb-1">{title}</span>
            <span className="block text-gray-300">{body}</span>
          </span>,
          document.body,
        )}
    </span>
  );
}
