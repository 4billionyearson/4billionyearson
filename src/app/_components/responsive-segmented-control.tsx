"use client";

import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SegmentedOption {
  key: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

const PILL_BASE = 'inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-medium transition-colors whitespace-nowrap';
const DEFAULT_ACTIVE = 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]';
const DEFAULT_INACTIVE = 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';
// Lighter grey for disabled state — gray-600 + 60% opacity was failing AA
// contrast against the very dark surface.
const DEFAULT_DISABLED = 'border-gray-800/60 bg-gray-900/30 text-gray-500 cursor-not-allowed';

/**
 * Pill row + responsive in-app dropdown.
 *
 * - `md+`: rounded-pill segmented control with eyebrow label.
 * - `<md`: in-app listbox popover (no native `<select>`) so the menu inherits
 *   the dark gold/cream palette across all platforms.
 * - `forcePills`: keep the pill row at every width (use for ≤3 short options
 *   that fit on a phone, e.g. "1 month / 3 months / 12 months").
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
  forcePills = false,
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
  forcePills?: boolean;
}) {
  const ACTIVE = activePillClass ?? DEFAULT_ACTIVE;
  const INACTIVE = inactivePillClass ?? DEFAULT_INACTIVE;
  const DISABLED = disabledPillClass ?? DEFAULT_DISABLED;

  const pillRow = (
    <div className="flex flex-wrap items-center gap-2">
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
  );

  if (forcePills) {
    return <div className={className}>{pillRow}</div>;
  }

  return (
    <div className={className}>
      {/* Desktop pill row */}
      <div className="hidden md:block">{pillRow}</div>

      {/* Mobile in-app dropdown */}
      <div className="md:hidden">
        {label && (
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mb-1">
            {label}
          </div>
        )}
        <ListboxTrigger
          variant="select"
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
 * Compact "summary chip" trigger — shows `Label: Value ▾` and opens the same
 * in-app listbox popover at every width. Useful for filter rows where the
 * option set is too long to live as visible pills (e.g. 6 map levels) but
 * the active value should always be on screen.
 */
export function ChipDropdown({
  label,
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  triggerClassName,
}: {
  label?: string;
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
}) {
  return (
    <div className={className}>
      <ListboxTrigger
        variant="chip"
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel ?? label}
        triggerClassName={triggerClassName}
      />
    </div>
  );
}

/**
 * Headless listbox — a keyboard-accessible custom dropdown that renders
 * inside the React tree (no native `<select>` chrome on iOS/Android).
 *
 * `variant="select"` produces a full-width field button (mobile dropdowns).
 * `variant="chip"`   produces a compact pill-style chip with eyebrow label
 *                    above the current value (filter chips at every width).
 */
function ListboxTrigger({
  variant,
  label,
  options,
  value,
  onChange,
  ariaLabel,
  triggerClassName,
}: {
  variant: 'select' | 'chip';
  label?: string;
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  triggerClassName?: string;
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

  React.useEffect(() => {
    const i = options.findIndex((o) => o.key === value);
    if (i >= 0) setActiveIndex(i);
  }, [value, options]);

  // Click-outside dismisses the popover.
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

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

  // Two visual styles share the same popover and key handling.
  const baseTriggerClass = variant === 'select'
    ? 'w-full h-10 inline-flex items-center justify-between rounded-lg border border-[#D0A65E]/30 bg-gray-900/60 text-sm text-[#FFF5E7] pl-3 pr-2.5 font-medium hover:border-[#D0A65E]/55 focus:outline-none focus:ring-2 focus:ring-[#D0A65E] focus:border-[#D0A65E] transition-colors'
    : 'inline-flex items-center gap-2 h-7 rounded-full border border-gray-700 bg-gray-900/45 pl-2.5 pr-1.5 text-[12px] text-[#FFF5E7] hover:border-[#D0A65E]/45 hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-[#D0A65E] transition-colors';
  const triggerClass = triggerClassName ? `${baseTriggerClass} ${triggerClassName}` : baseTriggerClass;

  return (
    <div ref={rootRef} className={variant === 'chip' ? 'relative inline-block' : 'relative'}>
      <button
        type="button"
        id={fieldId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={triggerClass}
      >
        {variant === 'chip' && label ? (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">{label}</span>
            <span className="font-medium truncate max-w-[14rem]">{current?.label ?? '—'}</span>
          </span>
        ) : (
          <span className="truncate text-left">{current?.label ?? '—'}</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-[#D0A65E] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={[
            'absolute z-50 mt-1 max-h-64 overflow-auto rounded-lg border border-[#D0A65E]/40 bg-gray-950/95 backdrop-blur-md py-1 shadow-2xl ring-1 ring-black/40',
            variant === 'select' ? 'left-0 right-0' : 'left-0 min-w-full whitespace-nowrap',
          ].join(' ')}
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
