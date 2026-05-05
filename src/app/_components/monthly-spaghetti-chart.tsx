"use client";

import React, { useMemo } from 'react';
import { Thermometer, CloudRain, Sun, Snowflake } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type SpaghettiMetric = 'temp' | 'precip' | 'sunshine' | 'frost';

export interface MonthlyPoint {
  year: number;
  month: number;
  value: number;
  /** Source flagged the value as provisional (Met Office / NOAA latest month). */
  provisional?: boolean;
}

interface ChartRow {
  month: number;
  monthLabel: string;
  [key: string]: number | string | null;
}

interface MetricConfig {
  longLabel: string;
  unit: string;
  unitTight: boolean; // true = "16.9°C" (no space), false = "150 mm"
  decimals: number;
  /** Aggregator that produces a per-year score used to pick the "record" year. */
  aggregate: 'mean' | 'sum';
  /** Direction of the record we highlight. */
  recordBy: 'max' | 'min';
  /** Adjective used in the legend ("warmest", "wettest", etc.). */
  recordWord: string;
  /** Hex colour for the highlighted record-year line. */
  recordColor: string;
  recordTextClass: string;
  /** Hex colour for the current-year line. */
  currentColor: string;
  currentTextClass: string;
  /** Y-axis lower bound: 'auto' uses floor(min-1); 'zero' clamps to 0. */
  yLower: 'auto' | 'zero';
  /** Icon component for the chart heading. */
  icon: React.ReactNode;
}

const METRIC_CONFIG: Record<SpaghettiMetric, MetricConfig> = {
  temp: {
    longLabel: 'Monthly Temperature',
    unit: '°C',
    unitTight: true,
    decimals: 1,
    aggregate: 'mean',
    recordBy: 'max',
    recordWord: 'warmest',
    recordColor: '#8B0000',
    recordTextClass: 'text-red-400',
    currentColor: '#F97316',
    currentTextClass: 'text-orange-400',
    yLower: 'auto',
    icon: <Thermometer className="h-5 w-5 shrink-0 text-orange-400 mt-1" />,
  },
  precip: {
    longLabel: 'Monthly Rainfall',
    unit: 'mm',
    unitTight: false,
    decimals: 0,
    aggregate: 'sum',
    recordBy: 'max',
    recordWord: 'wettest',
    recordColor: '#3B82F6',
    recordTextClass: 'text-blue-300',
    currentColor: '#7DD3FC',
    currentTextClass: 'text-sky-200',
    yLower: 'zero',
    icon: <CloudRain className="h-5 w-5 shrink-0 text-sky-400 mt-1" />,
  },
  sunshine: {
    longLabel: 'Monthly Sunshine',
    unit: 'hrs',
    unitTight: false,
    decimals: 0,
    aggregate: 'sum',
    recordBy: 'max',
    recordWord: 'sunniest',
    recordColor: '#D97706',
    recordTextClass: 'text-amber-300',
    currentColor: '#FDE047',
    currentTextClass: 'text-yellow-200',
    yLower: 'zero',
    icon: <Sun className="h-5 w-5 shrink-0 text-amber-300 mt-1" />,
  },
  frost: {
    longLabel: 'Monthly Frost Days',
    unit: 'days',
    unitTight: false,
    decimals: 0,
    aggregate: 'sum',
    recordBy: 'max',
    recordWord: 'frostiest',
    recordColor: '#3B82F6',
    recordTextClass: 'text-blue-300',
    currentColor: '#A5F3FC',
    currentTextClass: 'text-cyan-200',
    yLower: 'zero',
    icon: <Snowflake className="h-5 w-5 shrink-0 text-cyan-300 mt-1" />,
  },
};

export function getMetricConfig(metric: SpaghettiMetric): MetricConfig {
  return METRIC_CONFIG[metric];
}

function formatValue(cfg: MetricConfig, v: number): string {
  return cfg.unitTight
    ? `${v.toFixed(cfg.decimals)}${cfg.unit}`
    : `${v.toFixed(cfg.decimals)} ${cfg.unit}`;
}

interface SpaghettiChartProps {
  monthlyAll: MonthlyPoint[];
  regionName: string;
  metric?: SpaghettiMetric;
  /** Optional override for the title, otherwise built from regionName + metric. */
  title?: string;
  dataSource?: string;
  /** Hide the title (when the wrapping card already shows a title). */
  hideTitle?: boolean;
}

export default function MonthlySpaghettiChart({
  monthlyAll,
  regionName,
  metric = 'temp',
  title,
  dataSource,
  hideTitle = false,
}: SpaghettiChartProps) {
  const cfg = METRIC_CONFIG[metric];
  const { chartData, backgroundYears, recordYear, currentYear, currentIsLatestFallback, yMin, yMax, startYear, latestMonthIdx, provisionalFromMonthIdx } = useMemo(() => {
    const empty = { chartData: [] as ChartRow[], backgroundYears: [] as number[], recordYear: 0, currentYear: 0, currentIsLatestFallback: false, yMin: 0, yMax: 0, startYear: 0, latestMonthIdx: -1, provisionalFromMonthIdx: -1 };
    if (!monthlyAll?.length) return empty;

    const now = new Date();
    const calendarYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Group by year, excluding the current calendar year's incomplete months.
    const byYear = new Map<number, Map<number, number>>();
    const provByYear = new Map<number, Set<number>>();
    for (const p of monthlyAll) {
      if (p.year === calendarYear && p.month >= currentMonth) continue;
      if (!byYear.has(p.year)) byYear.set(p.year, new Map());
      byYear.get(p.year)!.set(p.month, p.value);
      if (p.provisional) {
        if (!provByYear.has(p.year)) provByYear.set(p.year, new Set());
        provByYear.get(p.year)!.add(p.month);
      }
    }

    // Years to display: 6+ months for the background (so partial historical
    // years don't draw mid-air), but always include the current calendar
    // year even if only one month is in.
    const allValidYears = [...byYear.entries()]
      .filter(([y, months]) => months.size >= 6 || y === calendarYear)
      .map(([y]) => y)
      .sort((a, b) => a - b);

    if (allValidYears.length === 0) return empty;

    // Datasets that lag (e.g. CRU TS country precip ends ~2 years ago) won't
    // have any data for the calendar year - in that case we fall back to the
    // latest year that has data so the chart still has a "current" line.
    const calendarHasAny = byYear.has(calendarYear) && (byYear.get(calendarYear)?.size ?? 0) > 0;
    const fallbackLatest = allValidYears[allValidYears.length - 1];
    const highlightCurrent = calendarHasAny ? calendarYear : fallbackLatest;
    const usingFallback = !calendarHasAny;

    // Find the "record" year using the metric's aggregate + direction.
    let bestYear = allValidYears[0];
    let bestScore = cfg.recordBy === 'max' ? -Infinity : Infinity;
    for (const yr of allValidYears) {
      if (yr === highlightCurrent) continue;
      const months = byYear.get(yr)!;
      if (months.size < 12) continue;
      const vals = [...months.values()];
      const score = cfg.aggregate === 'sum'
        ? vals.reduce((a, b) => a + b, 0)
        : vals.reduce((a, b) => a + b, 0) / vals.length;
      if (cfg.recordBy === 'max' ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestYear = yr;
      }
    }

    // Background limited to last ~40 years; always keep the record year and
    // the current calendar year regardless of cutoff.
    const cutoffYear = calendarYear - 39;
    const displayYears = allValidYears.filter((y) => y >= cutoffYear || y === bestYear || y === highlightCurrent);
    const bgYears = displayYears.filter((y) => y !== bestYear && y !== highlightCurrent);

    let globalMin = Infinity;
    let globalMax = -Infinity;
    const rows: ChartRow[] = [];

    // Compute the earliest provisional month (1-12) for the highlight year, if any.
    const highlightProv = provByYear.get(highlightCurrent);
    const firstProvMonth = highlightProv?.size ? Math.min(...highlightProv) : -1;

    for (let m = 1; m <= 12; m++) {
      const row: ChartRow = { month: m, monthLabel: MONTH_LABELS[m - 1] };
      for (const yr of displayYears) {
        const val = byYear.get(yr)?.get(m) ?? null;
        // For the highlight year, blank out provisional months in the main
        // series so the solid line ends cleanly at the last confirmed month.
        const isProvHighlight = yr === highlightCurrent && firstProvMonth > 0 && m >= firstProvMonth;
        row[`y${yr}`] = !isProvHighlight && val !== null ? Math.round(val * 100) / 100 : null;
        if (val !== null) {
          if (val < globalMin) globalMin = val;
          if (val > globalMax) globalMax = val;
        }
      }
      // Provisional series for the highlight year: include the month *before*
      // the first provisional one (so the dashed segment joins the solid line)
      // and every provisional month thereafter.
      if (firstProvMonth > 0 && (m === firstProvMonth - 1 || m >= firstProvMonth)) {
        const provVal = byYear.get(highlightCurrent)?.get(m) ?? null;
        row[`y${highlightCurrent}_prov`] = provVal !== null ? Math.round(provVal * 100) / 100 : null;
      } else {
        row[`y${highlightCurrent}_prov`] = null;
      }
      rows.push(row);
    }

    const yLowerBound = cfg.yLower === 'zero'
      ? 0
      : Math.floor(globalMin - 1);
    const headroom = cfg.yLower === 'zero' ? Math.max(2, (globalMax - yLowerBound) * 0.15) : 3;

    return {
      chartData: rows,
      backgroundYears: bgYears,
      recordYear: bestYear,
      currentYear: highlightCurrent,
      currentIsLatestFallback: usingFallback,
      yMin: yLowerBound,
      yMax: Math.ceil(globalMax + headroom),
      startYear: Math.min(...displayYears),
      latestMonthIdx: (() => {
        const cm = byYear.get(highlightCurrent);
        if (!cm?.size) return -1;
        return Math.max(...cm.keys()) - 1;
      })(),
      provisionalFromMonthIdx: firstProvMonth > 0 ? firstProvMonth - 1 : -1,
    };
  }, [monthlyAll, cfg]);

  if (chartData.length === 0) return null;

  const headingTitle = title ?? `${regionName} – ${cfg.longLabel} – All Years`;

  return (
    <div>
      {!hideTitle && (
        <h2 className="text-xl font-bold font-mono text-white mb-1 flex items-start gap-2">
          {cfg.icon}
          <span className="min-w-0 flex-1">{headingTitle}</span>
        </h2>
      )}
      <p className="text-xs text-gray-400 mb-3">
        Each line represents one year of monthly {cfg.longLabel.replace('Monthly ', '').toLowerCase()}.
      </p>

      <div className="w-full h-[360px] md:h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 30, right: 50, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#555' }}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#555' }}
              tickLine={false}
              tickFormatter={(v: number) => cfg.unitTight ? `${Math.round(v)}${cfg.unit}` : `${Math.round(v)} ${cfg.unit}`}
              width={cfg.unitTight ? 60 : 65}
            />

            {backgroundYears.map((yr) => (
              <Line
                key={yr}
                type="monotone"
                dataKey={`y${yr}`}
                stroke="#4B5563"
                strokeWidth={0.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}

            <Line
              type="monotone"
              dataKey={`y${currentYear}`}
              stroke={cfg.currentColor}
              strokeWidth={2.5}
              dot={(props: { cx?: number; cy?: number; index?: number; payload?: ChartRow }) => {
                const { cx, cy, index, payload } = props;
                // If we have a provisional segment, the dot+label belong on the dashed line, not here.
                if (provisionalFromMonthIdx >= 0) return <g key={index ?? 'd'} />;
                if (index !== latestMonthIdx || cy == null || cx == null || !payload) {
                  return <g key={index ?? 'd'} />;
                }
                const raw = payload[`y${currentYear}`];
                if (raw == null || typeof raw !== 'number') return <g key={index} />;
                return (
                  <g key={index}>
                    <circle cx={cx} cy={cy} r={5} fill={cfg.currentColor} stroke="#fff" strokeWidth={1.5} />
                    <text x={cx} y={cy - 12} textAnchor="middle" fill={cfg.currentColor} fontSize={11} fontWeight="bold">
                      {MONTH_LABELS[latestMonthIdx]} {currentYear}: {formatValue(cfg, raw)}
                    </text>
                  </g>
                );
              }}
              activeDot={{ r: 4, fill: cfg.currentColor }}
              isAnimationActive={false}
              connectNulls
            />

            {provisionalFromMonthIdx >= 0 && (
              <Line
                type="monotone"
                dataKey={`y${currentYear}_prov`}
                stroke={cfg.currentColor}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={(props: { cx?: number; cy?: number; index?: number; payload?: ChartRow }) => {
                  const { cx, cy, index, payload } = props;
                  if (index !== latestMonthIdx || cy == null || cx == null || !payload) {
                    return <g key={index ?? 'd'} />;
                  }
                  const raw = payload[`y${currentYear}_prov`];
                  if (raw == null || typeof raw !== 'number') return <g key={index} />;
                  return (
                    <g key={index}>
                      <circle cx={cx} cy={cy} r={5} fill={cfg.currentColor} stroke="#fff" strokeWidth={1.5} />
                      <text x={cx} y={cy - 12} textAnchor="middle" fill={cfg.currentColor} fontSize={11} fontWeight="bold">
                        {MONTH_LABELS[latestMonthIdx]} {currentYear}: {formatValue(cfg, raw)} (provisional)
                      </text>
                    </g>
                  );
                }}
                activeDot={{ r: 4, fill: cfg.currentColor }}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {recordYear !== currentYear && (
              <Line
                type="monotone"
                dataKey={`y${recordYear}`}
                stroke={cfg.recordColor}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: cfg.recordColor }}
                isAnimationActive={false}
                connectNulls
              />
            )}

            <Tooltip
              content={
                <SpaghettiTooltip
                  recordYear={recordYear}
                  currentYear={currentYear}
                  cfg={cfg}
                />
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[2px] bg-gray-600 rounded" />
          <span className="text-gray-500">All years since {startYear}</span>
        </span>
        {recordYear !== currentYear && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-[3px] rounded" style={{ background: cfg.recordColor }} />
            <span className={`${cfg.recordTextClass} font-semibold`}>{recordYear} ({cfg.recordWord})</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[3px] rounded" style={{ background: cfg.currentColor }} />
          <span className={`${cfg.currentTextClass} font-semibold`}>
            {currentYear} ({currentIsLatestFallback ? 'latest available' : 'current year'})
          </span>
        </span>
        {provisionalFromMonthIdx >= 0 && (
          <span className="flex items-center gap-1.5">
            <svg width="24" height="3" className="overflow-visible">
              <line x1="0" y1="1.5" x2="24" y2="1.5" stroke={cfg.currentColor} strokeWidth="3" strokeDasharray="6 4" />
            </svg>
            <span className={`${cfg.currentTextClass} font-semibold`}>provisional</span>
          </span>
        )}
      </div>

      {provisionalFromMonthIdx >= 0 && (
        <p className="text-[11px] text-gray-500 mt-2 italic">
          Latest month is provisional and may be revised by the data provider in the next update cycle.
        </p>
      )}

      {dataSource && (
        <p className="text-[10px] text-gray-500 mt-2">{dataSource}</p>
      )}
    </div>
  );
}

interface TooltipPayloadEntry {
  dataKey?: string;
  value?: number | null;
}

function SpaghettiTooltip({
  active,
  payload,
  label,
  recordYear,
  currentYear,
  cfg,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  recordYear: number;
  currentYear: number;
  cfg: MetricConfig;
}) {
  if (!active || !payload?.length) return null;

  const recordEntry = payload.find((p) => p.dataKey === `y${recordYear}`);
  const currentEntry =
    payload.find((p) => p.dataKey === `y${currentYear}_prov` && p.value != null)
    ?? payload.find((p) => p.dataKey === `y${currentYear}`);

  const numericPayloads = payload.filter((p) => p.value != null) as Array<{ value: number }>;
  const allValues = numericPayloads.map((p) => p.value);
  const maxVal = allValues.length ? Math.max(...allValues) : null;
  const minVal = allValues.length ? Math.min(...allValues) : null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      {currentEntry?.value != null && (
        <p className={cfg.currentTextClass}>
          {currentYear}: <span className="font-mono">{formatValue(cfg, currentEntry.value)}</span>
        </p>
      )}
      {recordEntry?.value != null && recordYear !== currentYear && (
        <p className={cfg.recordTextClass}>
          {recordYear}: <span className="font-mono">{formatValue(cfg, recordEntry.value)}</span>
        </p>
      )}
      {maxVal !== null && minVal !== null && (
        <p className="text-gray-400">
          Range: <span className="font-mono">{cfg.unitTight ? `${minVal.toFixed(cfg.decimals)}–${maxVal.toFixed(cfg.decimals)}${cfg.unit}` : `${minVal.toFixed(cfg.decimals)}–${maxVal.toFixed(cfg.decimals)} ${cfg.unit}`}</span>
        </p>
      )}
    </div>
  );
}
