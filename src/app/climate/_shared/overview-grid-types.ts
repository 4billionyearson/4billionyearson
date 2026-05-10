// Pure server-safe helpers + types for OverviewGrid.
// (The grid component itself lives in `overview-grid.tsx` and is "use client".)

export interface MonthlyPoint {
  year: number;
  month: number; // 1-12
  value: number;
  provisional?: boolean;
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Parse e.g. "Mar 2026" → { year: 2026, month: 3 }. Returns null if invalid. */
export function parseMonthLabel(label: string | null | undefined): { year: number; month: number } | null {
  if (!label) return null;
  const m = label.match(/^([A-Z][a-z]{2})\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTH_SHORT.indexOf(m[1]) + 1;
  if (month <= 0) return null;
  return { year: parseInt(m[2], 10), month };
}

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_SHORT[month - 1]} ${year}`;
}

/** -1 if a < b, 0 if equal, 1 if a > b. Returns 0 for unparseable inputs. */
export function compareMonthLabels(a: string, b: string): number {
  const pa = parseMonthLabel(a);
  const pb = parseMonthLabel(b);
  if (!pa || !pb) return 0;
  if (pa.year !== pb.year) return pa.year < pb.year ? -1 : 1;
  if (pa.month !== pb.month) return pa.month < pb.month ? -1 : 1;
  return 0;
}

/**
 * The "page snapshot month" is the most recent calendar month for which every
 * source on the page has data — i.e. the chronological minimum of the latest
 * label across all candidate sources. Returns null if no parseable label is
 * supplied. Used to gate cross-source comparison tables, headings, and rank
 * pills so the page only advances to the next month once every source has
 * caught up. Charts may overrun this month with dashed/provisional points.
 */
export function pickPageSnapshotMonth(labels: Array<string | null | undefined>): string | null {
  const valid = labels.filter((l): l is string => Boolean(l && parseMonthLabel(l)));
  if (!valid.length) return null;
  return valid.reduce((min, cur) => (compareMonthLabels(cur, min) < 0 ? cur : min));
}

/**
 * Re-derive single-month stats for an arbitrary target month from a snapshot's
 * `monthlyAll` array. Mirrors the shape of the build-script output so the
 * existing `buildOverviewRow` consumer keeps working unchanged.
 *
 * Used when a source has advanced to e.g. Apr 2026 but the page is still
 * pinned to Mar 2026 (because some other source on the page is lagging).
 */
export function computeMonthStats(
  monthlyAll: MonthlyPoint[] | undefined,
  targetLabel: string,
): RankedPeriodStat | null {
  if (!monthlyAll?.length) return null;
  const target = parseMonthLabel(targetLabel);
  if (!target) return null;
  const sameMonth = monthlyAll.filter(p => p.month === target.month && typeof p.value === 'number');
  if (!sameMonth.length) return null;
  const point = sameMonth.find(p => p.year === target.year);
  if (!point) return null;
  const sorted = [...sameMonth].sort((a, b) => b.value - a.value);
  const rank = sorted.findIndex(p => p.year === target.year && p.value === point.value) + 1;
  const record = sorted[0];
  const baseline = sameMonth.filter(p => p.year >= 1961 && p.year <= 1990);
  const baselineMean = baseline.length
    ? baseline.reduce((s, p) => s + p.value, 0) / baseline.length
    : null;
  return {
    label: targetLabel,
    value: point.value,
    diff: baselineMean == null ? null : point.value - baselineMean,
    rank,
    total: sameMonth.length,
    recordLabel: formatMonthLabel(record.year, record.month),
    recordValue: record.value,
  };
}

/**
 * Re-derive 3-month-window stats ending at `endingMonthLabel`. The window is
 * (endMonth-2 … endMonth) in the same calendar order each year, so the rank
 * compares like-for-like windows (e.g. Jan–Mar 2026 vs every prior Jan–Mar).
 */
export function computeThreeMonthStats(
  monthlyAll: MonthlyPoint[] | undefined,
  endingMonthLabel: string,
): RankedPeriodStat | null {
  if (!monthlyAll?.length) return null;
  const target = parseMonthLabel(endingMonthLabel);
  if (!target) return null;
  const map = new Map<string, number>();
  for (const p of monthlyAll) {
    if (typeof p.value === 'number') map.set(`${p.year}-${p.month}`, p.value);
  }
  const buildWindow = (year: number, endMonth: number): { value: number; startMonth: number; startYear: number } | null => {
    const vals: number[] = [];
    let startYear = year;
    let startMonth = endMonth;
    for (let i = 0; i < 3; i++) {
      let m = endMonth - i;
      let y = year;
      if (m <= 0) { m += 12; y -= 1; }
      const v = map.get(`${y}-${m}`);
      if (v == null) return null;
      vals.push(v);
      if (i === 2) { startMonth = m; startYear = y; }
    }
    return { value: vals.reduce((s, v) => s + v, 0) / 3, startMonth, startYear };
  };
  const minYear = Math.min(...monthlyAll.map(p => p.year));
  const maxYear = Math.max(...monthlyAll.map(p => p.year));
  const windows: Array<{ year: number; value: number; label: string }> = [];
  for (let y = minYear; y <= maxYear; y++) {
    const w = buildWindow(y, target.month);
    if (w) {
      const label = `${MONTH_SHORT[w.startMonth - 1]}–${MONTH_SHORT[target.month - 1]} ${y}`;
      windows.push({ year: y, value: w.value, label });
    }
  }
  if (!windows.length) return null;
  const targetWin = windows.find(w => w.year === target.year);
  if (!targetWin) return null;
  const sorted = [...windows].sort((a, b) => b.value - a.value);
  const rank = sorted.findIndex(w => w.year === target.year && w.value === targetWin.value) + 1;
  const record = sorted[0];
  const baseline = windows.filter(w => w.year >= 1961 && w.year <= 1990);
  const baselineMean = baseline.length
    ? baseline.reduce((s, w) => s + w.value, 0) / baseline.length
    : null;
  return {
    label: targetWin.label,
    value: targetWin.value,
    diff: baselineMean == null ? null : targetWin.value - baselineMean,
    rank,
    total: windows.length,
    recordLabel: record.label,
    recordValue: record.value,
  };
}

/**
 * For a source whose latest label ≥ pageSnapshotMonth, return the period stats
 * pinned to pageSnapshotMonth. If the source's own latestMonthStats already
 * matches, return it as-is. Otherwise derive from monthlyAll. Returns null
 * pair if nothing usable is available.
 */
export function pickStatsForMonth(
  monthlyAll: MonthlyPoint[] | undefined,
  latestMonthStats: RankedPeriodStat | undefined,
  latestThreeMonthStats: RankedPeriodStat | undefined,
  pageSnapshotMonth: string | null,
): { m?: RankedPeriodStat; q?: RankedPeriodStat } {
  if (!pageSnapshotMonth) {
    return { m: latestMonthStats, q: latestThreeMonthStats };
  }
  if (latestMonthStats?.label === pageSnapshotMonth) {
    return { m: latestMonthStats, q: latestThreeMonthStats };
  }
  return {
    m: computeMonthStats(monthlyAll, pageSnapshotMonth) ?? undefined,
    q: computeThreeMonthStats(monthlyAll, pageSnapshotMonth) ?? undefined,
  };
}

export interface RankedPeriodStat {
  label: string;
  value: number;
  diff: number | null;
  rank: number;
  total: number;
  recordLabel: string;
  recordValue: number;
}

export interface YearlyLike {
  year: number;
  value?: number;
  avgTemp?: number;
  absoluteTemp?: number;
  anomaly?: number;
  rollingAvg?: number;
}

export type OverviewMetricBlock = {
  title: string;
  value: string;
  anomaly: string;
  rank: string;
  record: string;
};

export type OverviewRow = {
  label: string;
  sublabel?: string;
  lowerIsBetter?: boolean;
  isPrimary?: boolean;
  latestMonth: OverviewMetricBlock;
  latestQuarter: OverviewMetricBlock;
  annual: OverviewMetricBlock;
};

export type OverviewSection = {
  title?: string;
  rows: OverviewRow[];
};

export type OverviewPanel = {
  title: string;
  icon: React.ReactNode;
  accentClass: string;
  accentBg: string;
  accentBorder: string;
  sections: OverviewSection[];
};

export function formatSignedValue(value: number, units = '°C', digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}${units}`;
}

export function formatValue(value: number, units = '', digits = 1): string {
  return `${value.toFixed(digits)}${units}`;
}

export function ordinal(value: number): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  switch (value % 10) {
    case 1: return `${value}st`;
    case 2: return `${value}nd`;
    case 3: return `${value}rd`;
    default: return `${value}th`;
  }
}

export function getYearlyPointValue(point: YearlyLike): number | null {
  if (typeof point.value === 'number') return point.value;
  if (typeof point.avgTemp === 'number') return point.avgTemp;
  if (typeof point.absoluteTemp === 'number') return point.absoluteTemp;
  return null;
}

export function buildOverviewRow(
  label: string,
  yearly: YearlyLike[] | undefined,
  latestMonthStats: RankedPeriodStat | undefined,
  latestThreeMonthStats: RankedPeriodStat | undefined,
  units: string,
  digits: number,
  lowerIsBetter = false,
  isPrimary = false,
): OverviewRow | null {
  if (!yearly?.length) return null;

  const values = yearly
    .map((point) => ({ year: point.year, value: getYearlyPointValue(point) }))
    .filter((point): point is { year: number; value: number } => typeof point.value === 'number');

  if (!values.length) return null;

  const latest = values[values.length - 1];
  const baseline = values.filter((point) => point.year >= 1961 && point.year <= 1990);
  const baselineAvg = baseline.length
    ? baseline.reduce((sum, point) => sum + point.value, 0) / baseline.length
    : null;
  const sorted = [...values].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  const rank = sorted.findIndex((point) => point.year === latest.year && point.value === latest.value) + 1;
  const record = sorted[0];

  const extractYear = (label: string): string => {
    const match = label.match(/(\d{4})/);
    return match ? match[1] : label;
  };

  const buildPeriodBlock = (stats?: RankedPeriodStat): OverviewMetricBlock => {
    const s = stats;
    return {
      title: s?.label ?? 'n/a',
      value: s ? formatValue(s.value, units, digits) : 'n/a',
      anomaly: s && s.diff != null ? `${formatSignedValue(s.diff, units, digits)} vs avg` : 'n/a',
      rank: s ? ordinal(s.rank) : 'n/a',
      record: s ? `${formatValue(s.recordValue, units, digits)} (${extractYear(s.recordLabel)})` : 'n/a',
    };
  };

  return {
    label,
    lowerIsBetter,
    isPrimary,
    latestMonth: buildPeriodBlock(latestMonthStats),
    latestQuarter: buildPeriodBlock(latestThreeMonthStats),
    annual: {
      title: `${latest.year}`,
      value: formatValue(latest.value, units, digits),
      anomaly: baselineAvg == null ? 'n/a' : `${formatSignedValue(latest.value - baselineAvg, units, digits)} vs avg`,
      rank: ordinal(rank),
      record: `${formatValue(record.value, units, digits)} (${record.year})`,
    },
  };
}

/**
 * Drop comparison rows whose latest-month period does not match the primary
 * row's latest-month period. This prevents the At-a-Glance grid from
 * displaying e.g. "APR 2026" for a country alongside a stale "MAR 2026"
 * global value under a shared "APR 2026" column header. Charts may still
 * show partial data via the dotted-line provisional system; only summary
 * comparison tables are affected.
 *
 * The first row (or one with isPrimary=true) is always kept. Comparison
 * rows are kept only if their latestMonth.title matches the primary's.
 * Rows with title 'n/a' are kept (no data is unambiguous, not stale).
 */
export function pruneStaleComparisonRows(rows: OverviewRow[]): OverviewRow[] {
  if (rows.length < 2) return rows;
  const primary = rows.find((r) => r.isPrimary) ?? rows[0];
  const primaryMonth = primary.latestMonth.title;
  if (!primaryMonth || primaryMonth === 'n/a') return rows;
  return rows.filter((row) => {
    if (row === primary) return true;
    const t = row.latestMonth.title;
    if (!t || t === 'n/a') return true;
    return t === primaryMonth;
  });
}
