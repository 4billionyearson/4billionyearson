"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SegmentedOption {
  key: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

/**
 * Responsive segmented control.
 *
 * - On `md+` (≥768px): renders as the project-standard pill row used across the
 *   site (rounded-full toggles in the gold/cream palette), preceded by a small
 *   uppercase eyebrow `label` when provided.
 * - On `<md`: renders as a single full-width `<select>` styled to match the
 *   pills, eliminating the horizontal-scroll tab patterns that don't work on
 *   small screens. The eyebrow becomes the field label above the select.
 *
 * The same `options` / `value` / `onChange` API is used in both modes so it's
 * a drop-in replacement anywhere we currently have a wrappable pill bar.
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
  // dark inactive). Callers can override per-instance if needed.
  const PILL_BASE = 'inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-medium transition-colors whitespace-nowrap';
  const ACTIVE = activePillClass ?? 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]';
  const INACTIVE = inactivePillClass ?? 'border-gray-800 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]';
  const DISABLED = disabledPillClass ?? 'border-gray-900 bg-gray-950/40 text-gray-600 cursor-not-allowed opacity-60';

  // Field id is derived so the <label> can target the <select> on mobile.
  const fieldId = React.useId();

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

      {/* ── Mobile dropdown ──────────────────────────────────────────── */}
      <div className="md:hidden">
        {label && (
          <label
            htmlFor={fieldId}
            className="block text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={fieldId}
            aria-label={ariaLabel ?? label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 appearance-none rounded-lg border border-[#D0A65E]/30 bg-gray-900/60 text-sm text-[#FFF5E7] pl-3 pr-9 font-medium focus:outline-none focus:ring-2 focus:ring-[#D0A65E] focus:border-[#D0A65E] transition-colors"
          >
            {options.map((opt) => (
              <option
                key={opt.key}
                value={opt.key}
                disabled={opt.disabled}
                className="bg-gray-900 text-gray-100"
              >
                {opt.label}{opt.disabled ? ' (no data)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D0A65E] pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
