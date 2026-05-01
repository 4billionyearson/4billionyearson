"use client";

// Shared overview grid used by both the regional ClimateProfile and the
// planet-level GlobalProfile so the month / 3-month / year data tables
// look identical across surfaces.

import React from 'react';
import {
  type OverviewPanel,
  type OverviewRow,
  type OverviewSection,
  type OverviewMetricBlock,
  type RankedPeriodStat,
  type YearlyLike,
  formatSignedValue,
  formatValue,
  ordinal,
  getYearlyPointValue,
  buildOverviewRow,
} from './overview-grid-types';

// Re-export so existing imports keep working.
export type { OverviewPanel, OverviewRow, OverviewSection, OverviewMetricBlock, RankedPeriodStat, YearlyLike };
export { formatSignedValue, formatValue, ordinal, getYearlyPointValue, buildOverviewRow };

// ─── Render ─────────────────────────────────────────────────────────────────

export function OverviewGrid({ panels }: { panels: OverviewPanel[] }) {
  const periods = ['latestMonth', 'latestQuarter', 'annual'] as const;
  const periodShortLabel = (label: string, period: typeof periods[number]) => {
    if (period === 'annual') return label;
    return label.replace(/\s+\d{4}$/, '');
  };

  return (
    <div className="space-y-4">
      {panels.map((panel) => (
        <div key={panel.title} className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
          <h2 className="text-xl font-bold font-mono text-white mb-4 flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
            {panel.icon}
            <span className="min-w-0 flex-1">{panel.title}</span>
          </h2>
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 overflow-hidden">
            <div className={panel.sections.length > 1 ? 'lg:grid lg:grid-cols-2' : ''}>
            {panel.sections.map((section, sIdx) => (
              <div
                key={sIdx}
                className={
                  panel.sections.length > 1
                    ? `${sIdx > 0 ? 'border-t-2 border-gray-600/50 lg:border-t-0 lg:border-l-2' : ''}`
                    : `${sIdx > 0 ? 'border-t-2 border-gray-600/50' : ''}`
                }
              >
                {section.title && (
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{section.title}</div>
                )}
                <div className="p-2 md:p-3 pt-1">
                  {/* Column headers */}
                  <div className="flex gap-px">
                    <div className="w-12 md:w-20 shrink-0" />
                    {section.rows.map((row) => (
                      <div
                        key={row.label}
                        className={`flex-1 min-w-0 px-1 md:px-2 py-1.5 text-[11px] md:text-xs font-bold ${
                          row.isPrimary ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        <div className="truncate">{row.label}</div>
                        {row.sublabel ? (
                          <div className="text-[9px] md:text-[10px] font-normal text-gray-500 truncate normal-case">{row.sublabel}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Data rows with record sub-row after each period */}
                  {periods.map((period, pIdx) => {
                    const periodLabel = section.rows[0]?.[period]?.title ?? '';
                    return (
                      <React.Fragment key={period}>
                        <div className={`flex gap-px border-t border-gray-600/40 ${pIdx % 2 === 0 ? 'bg-gray-800/40' : ''}`}>
                          <div className="w-12 md:w-20 shrink-0 py-2 px-1 text-[10px] md:text-[11px] uppercase tracking-wider text-gray-400 font-semibold leading-tight flex items-start pt-2.5">
                            <span className="md:hidden">{periodShortLabel(periodLabel, period)}</span>
                            <span className="hidden md:inline">{periodLabel}</span>
                          </div>
                          {section.rows.map((row) => {
                            const metric = row[period];
                            return (
                              <div
                                key={`${row.label}-${period}`}
                                className={`flex-1 min-w-0 py-2 px-1 md:px-2 ${
                                  row.isPrimary ? `${panel.accentBg} border-l-4 ${panel.accentBorder}` : ''
                                }`}
                              >
                                <div className={`text-sm font-bold leading-snug ${row.isPrimary ? 'text-white' : 'text-gray-200'}`}>
                                  {metric.value}
                                  <span className={`text-sm font-bold ml-1 ${row.isPrimary ? 'text-white' : 'text-gray-200'}`}>
                                    · {metric.rank}{row.lowerIsBetter ? ' ↓' : ''}
                                  </span>
                                </div>
                                <div className={`text-[10px] md:text-[11px] mt-0.5 ${row.isPrimary ? 'text-white/70' : 'text-gray-400'}`}>
                                  {metric.anomaly.replace(' vs avg', '')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Record sub-row for this period */}
                        <div className="flex gap-px border-t border-dashed border-gray-500/50 italic">
                          <div className="w-12 md:w-20 shrink-0 py-1.5 px-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold leading-tight flex items-center">
                            Record
                          </div>
                          {section.rows.map((row) => (
                            <div
                              key={`${row.label}-${period}-record`}
                              className={`flex-1 min-w-0 py-1.5 px-1 md:px-2 ${
                                row.isPrimary ? `${panel.accentBg} border-l-4 ${panel.accentBorder}` : ''
                              }`}
                            >
                              <div className={`text-[10px] md:text-[11px] truncate ${row.isPrimary ? 'text-white/60' : 'text-gray-500'}`}>
                                {row[period].record}
                              </div>
                            </div>
                          ))}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
            <div className="px-3 py-2 text-[10px] text-gray-500 border-t border-gray-700/40">Baseline: 1961–1990 mean · Anomaly = difference from baseline · Record = highest (or lowest) value on record</div>
          </div>
        </div>
      ))}
    </div>
  );
}
