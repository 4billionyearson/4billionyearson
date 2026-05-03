"use client";

import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SegmentedOption {
  key: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

/**
 * Responsive segmented control.
 *
 * - On `md+` (≥768px): renders as the project-standard pill row used across
 *   the site (rounded-full toggles in the gold/cream palette), preceded by a
 *   small uppercase eyebrow `label` when provided.
 * - On `<md`: renders as a fully in-app custom dropdown (button + popover
 *   listbox) — *not* a native `<select>` — so the menu inherits the dark
 *   gold/cream palette across all platforms instead of falling back to the
 *   browser/OS native picker.
 *
 * Custom listbox semantics: `role="listbox"` on the popover, `role="option"`
 * on each item, arrow-key navigation, Enter/Space to select, ESC to close,
 * click-outside to dismiss.
 */
export function ResponsiveSegmentedControl({
  label,
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  inactivePillClass,
  activePillClass,
  disabledPillClass,
}: {
  label?: string;
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  className?: string;
  inactivePillClass?: string;
  activePillClass?: string;
  disabledPillClass?: string;
}) {
  // Default pill styling matches the rest of the site (gold-tinted active,
  // dark inactive). Callers can override per-instance if they need a bolder
  // accent, but all existing surfaces now share the same palette.
  const PILL_BASE = 'inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-medium transition-colors whitespace-nowrap';
  const ACTIVE = activePillClass ?? 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]';
  const INACTIVE = inactivePillClass ?? 'border-gray-800 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';
  // Disabled options use a lighter grey (gray-500) for legibility — gray-600
  // at 60% opacity reads as nearly black on the very dark surface and was
  // failing AA contrast in QA screenshots.
  const DISABLED = disabledPillClass ?? 'border-gray-800/60 bg-gray-900/30 text-gray-500 cursor-not-allowed';

  return (
    <div className={className}>
      {/* ── Desktop pill row ─────────────────────────────────────────── */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {label && (
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mr-1">{label}</span>
        )}
        {options.map((opt) => {
          const isActive = opt.key === value;
          const cls = isActive ? ACTIVE : opt.disabled ? DISABLED : INACTIVE;
          return (
            <button
              key={opt.key}
              type="button"
              disabled={opt.disabled}
              aria-disabled={opt.disabled}
              aria-pressed={isActive}
              title={opt.title}
              onClick={() => { if (!opt.disabled) onChange(opt.key); }}
              className={`${PILL_BASE} ${cls}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* ── Mobile in-app dropdown ───────────────────────────────────── */}
      <div className="md:hidden">
        {label && (
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mb-1">
            {label}
          </div>
        )}
        <InAppListbox
          options={options}
          value={value}
          onChange={onChange}
          ariaLabel={ariaLabel ?? label}
        />
      </div>
    </div>
  );
}

/**
 * Headless listbox — keyboard-accessible custom dropdown that renders inside
 * the React tree (no native `<select>` chrome on iOS/Android).
 */
function InAppListbox({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(() => {
    const i = options.findIndex((o) => o.key === value);
    return i >= 0 ? i : 0;
  });
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const fieldId = React.useId();
  const listId = `${fieldId}-list`;

  const current = options.find((o) => o.key === value);

  // Sync the highlighted index whenever the value changes externally.
  React.useEffect(() => {
    const i = options.findIndex((o) => o.key === value);
    if (i >= 0) setActiveIndex(i);
  }, [value, options]);

  // Click-outside to dismiss.
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // When the popover opens, scroll the active option into view.
  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function moveActive(delta: number) {
    if (!options.length) return;
    let i = activeIndex;
    for (let n = 0; n < options.length; n++) {
      i = (i + delta + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setActiveIndex(i);
  }

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange(opt.key);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); setOpen(true); return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIndex(options.findIndex((o) => !o.disabled)); }
    else if (e.key === 'End') {
      e.preventDefault();
      for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) { setActiveIndex(i); break; }
    }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(activeIndex); }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={fieldId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="w-full h-10 inline-flex items-center justify-between rounded-lg border border-[#D0A65E]/30 bg-gray-900/60 text-sm text-[#FFF5E7] pl-3 pr-2.5 font-medium hover:border-[#D0A65E]/55 focus:outline-none focus:ring-2 focus:ring-[#D0A65E] focus:border-[#D0A65E] transition-colors"
      >
        <span className="truncate text-left">{current?.label ?? '—'}</span>
        <ChevronDown className={`ml-2 h-4 w-4 text-[#D0A65E] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-lg border border-[#D0A65E]/40 bg-gray-950/95 backdrop-blur-md py-1 shadow-2xl ring-1 ring-black/40"
        >
          {options.map((opt, idx) => {
            const isActive = opt.key === value;
            const isHighlighted = idx === activeIndex;
            return (
              <li
                key={opt.key}
                data-idx={idx}
                role="option"
                aria-selected={isActive}
                aria-disabled={opt.disabled}
                title={opt.title}
                onMouseEnter={() => { if (!opt.disabled) setActiveIndex(idx); }}
                onClick={() => commit(idx)}
                className={[
                  'flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer select-none',
                  opt.disabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : isActive
                      ? 'text-[#FFF5E7] bg-[#D0A65E]/15'
                      : isHighlighted
                        ? 'text-[#FFF5E7] bg-white/[0.05]'
                        : 'text-gray-200',
                ].join(' ')}
              >
                <span className="truncate">
                  {opt.label}
                  {opt.disabled && <span className="ml-1 text-[11px] text-gray-500">(no data)</span>}
                </span>
                {isActive && <Check className="h-4 w-4 text-[#D0A65E] shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
