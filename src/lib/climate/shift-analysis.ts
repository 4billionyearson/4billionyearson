/**
 * Shared seasonal-shift analysis used by both the per-region SeasonalShiftCard
 * and the global build-seasonal-shift-global aggregator.
 *
 * Produces three kinds of metrics from a region's monthly temperature (and
 * optional monthly rainfall) record:
 *
 *  • warm/cold:  when the baseline monthly climatology swings ≥ 5°C peak-to-peak,
 *                we compute warm-season-length (months above baseline annual mean)
 *                and the spring/autumn threshold-crossing dates.
 *
 *  • wet/dry:    when rainfall is supplied and its peak-month / trough-month
 *                ratio is ≥ 2×, we compute wet-season-length (months with above-
 *                average rain), peak-rain month shift, wet-season onset shift,
 *                and the change in annual total.
 *
 *  • aseasonal:  if neither of the above applies, only month-by-month warming
 *                is meaningful.
 *
 * The baseline is the first 30 complete years of record; the recent window is
 * the last 10 complete years. All thresholds are fixed to the baseline so a
 * shift cleanly attributes to the climate changing, not to a moving target.
 */

export type MonthlyPoint = { year: number; month: number; value: number };

export type SeasonalityKind = 'warm-cold' | 'wet-dry' | 'aseasonal' | 'mixed';

export const SHIFT_MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MID_MONTH_DOY = [15, 46, 75, 106, 136, 167, 197, 228, 259, 289, 320, 350];
export const TEMP_AMPLITUDE_THRESHOLD_C = 5;
export const WET_DRY_RATIO_THRESHOLD = 2;

export function doyToLabel(doy: number): string {
  const d = Math.max(1, Math.min(365, Math.round(doy)));
  const date = new Date(2001, 0, d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function completeYears(monthly: MonthlyPoint[]) {
  const byYear = new Map<number, Map<number, number>>();
  for (const p of monthly) {
    if (!byYear.has(p.year)) byYear.set(p.year, new Map());
    byYear.get(p.year)!.set(p.month, p.value);
  }
  return [...byYear.entries()]
    .filter(([, m]) => m.size === 12)
    .map(([year, m]) => ({
      year,
      months: Array.from({ length: 12 }, (_, i) => m.get(i + 1) as number),
    }))
    .sort((a, b) => a.year - b.year);
}

function findCrossings(monthly: number[], threshold: number): { spring: number; autumn: number } | null {
  const above = monthly.map((v) => v > threshold);
  if (above.every(Boolean) || !above.some(Boolean)) return null;
  const firstWarm = above.indexOf(true);
  const lastWarm = above.lastIndexOf(true);

  let spring: number;
  if (firstWarm === 0) spring = 1;
  else {
    const v0 = monthly[firstWarm - 1];
    const v1 = monthly[firstWarm];
    const frac = (threshold - v0) / (v1 - v0);
    spring = MID_MONTH_DOY[firstWarm - 1] + frac * (MID_MONTH_DOY[firstWarm] - MID_MONTH_DOY[firstWarm - 1]);
  }

  let autumn: number;
  if (lastWarm === 11) autumn = 365;
  else {
    const v0 = monthly[lastWarm];
    const v1 = monthly[lastWarm + 1];
    const frac = (v0 - threshold) / (v0 - v1);
    autumn = MID_MONTH_DOY[lastWarm] + frac * (MID_MONTH_DOY[lastWarm + 1] - MID_MONTH_DOY[lastWarm]);
  }

  return { spring, autumn };
}

function baselineRecent(years: { year: number; months: number[] }[]) {
  const baseline = years.slice(0, 30);
  const recent = years.slice(-10);
  const baseMonthly = Array.from({ length: 12 }, (_, m) => {
    let s = 0; for (const y of baseline) s += y.months[m]; return s / baseline.length;
  });
  const recMonthly = Array.from({ length: 12 }, (_, m) => {
    let s = 0; for (const y of recent) s += y.months[m]; return s / recent.length;
  });
  return { baseline, recent, baseMonthly, recMonthly };
}

export type TempShift = {
  baselineAnnualMean: number;
  baselineAmplitudeC: number;
  baselineMonthly: number[];
  recentMonthly: number[];
  baselineLen: number;
  recentLen: number;
  netShiftMonths: number;
  springShiftDays: number | null;
  autumnShiftDays: number | null;
  baselineSpringDoy: number | null;
  baselineAutumnDoy: number | null;
  recentSpringDoy: number | null;
  recentAutumnDoy: number | null;
  biggestMonth: string;
  biggestMonthWarmingC: number;
  warmestMonthBaseline: string;
  warmestMonthRecent: string;
  warmestMonthShiftIndex: number; // recent - baseline, in months (signed)
};

export function analyseTemperature(monthlyAll: MonthlyPoint[]): {
  windows: { baselineStart: number; baselineEnd: number; recentStart: number; recentEnd: number };
  yearsCoverage: number;
  temp: TempShift;
} | null {
  if (!monthlyAll?.length) return null;
  const years = completeYears(monthlyAll);
  if (years.length < 30) return null;

  const { baseline, recent, baseMonthly, recMonthly } = baselineRecent(years);

  let sum = 0, count = 0;
  for (const y of baseline) for (const v of y.months) { sum += v; count += 1; }
  const baselineAnnualMean = sum / count;

  const baselineAmplitudeC = Math.max(...baseMonthly) - Math.min(...baseMonthly);

  const lengthSeries = years.map((y) => y.months.filter((v) => v > baselineAnnualMean).length);
  const baselineLen = lengthSeries.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
  const recentLen = lengthSeries.slice(-10).reduce((a, b) => a + b, 0) / 10;

  const baseCross = findCrossings(baseMonthly, baselineAnnualMean);
  const recCross = findCrossings(recMonthly, baselineAnnualMean);
  let springShiftDays: number | null = null;
  let autumnShiftDays: number | null = null;
  if (baseCross && recCross && baselineAmplitudeC >= TEMP_AMPLITUDE_THRESHOLD_C) {
    springShiftDays = recCross.spring - baseCross.spring;
    autumnShiftDays = recCross.autumn - baseCross.autumn;
  }

  const diffs = recMonthly.map((v, i) => v - baseMonthly[i]);
  const biggestIdx = diffs.reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);
  const warmestBaseIdx = baseMonthly.reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);
  const warmestRecIdx = recMonthly.reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);

  return {
    windows: {
      baselineStart: baseline[0].year,
      baselineEnd: baseline[baseline.length - 1].year,
      recentStart: recent[0].year,
      recentEnd: recent[recent.length - 1].year,
    },
    yearsCoverage: years.length,
    temp: {
      baselineAnnualMean: +baselineAnnualMean.toFixed(2),
      baselineAmplitudeC: +baselineAmplitudeC.toFixed(2),
      baselineMonthly: baseMonthly.map((v) => +v.toFixed(2)),
      recentMonthly: recMonthly.map((v) => +v.toFixed(2)),
      baselineLen: +baselineLen.toFixed(2),
      recentLen: +recentLen.toFixed(2),
      netShiftMonths: +(recentLen - baselineLen).toFixed(2),
      springShiftDays: springShiftDays === null ? null : +springShiftDays.toFixed(1),
      autumnShiftDays: autumnShiftDays === null ? null : +autumnShiftDays.toFixed(1),
      baselineSpringDoy: baseCross && baselineAmplitudeC >= TEMP_AMPLITUDE_THRESHOLD_C ? +baseCross.spring.toFixed(1) : null,
      baselineAutumnDoy: baseCross && baselineAmplitudeC >= TEMP_AMPLITUDE_THRESHOLD_C ? +baseCross.autumn.toFixed(1) : null,
      recentSpringDoy: recCross && baselineAmplitudeC >= TEMP_AMPLITUDE_THRESHOLD_C ? +recCross.spring.toFixed(1) : null,
      recentAutumnDoy: recCross && baselineAmplitudeC >= TEMP_AMPLITUDE_THRESHOLD_C ? +recCross.autumn.toFixed(1) : null,
      biggestMonth: SHIFT_MONTH_LABELS[biggestIdx],
      biggestMonthWarmingC: +diffs[biggestIdx].toFixed(2),
      warmestMonthBaseline: SHIFT_MONTH_LABELS[warmestBaseIdx],
      warmestMonthRecent: SHIFT_MONTH_LABELS[warmestRecIdx],
      warmestMonthShiftIndex: warmestRecIdx - warmestBaseIdx,
    },
  };
}

export type RainShift = {
  baselineAnnualMm: number;
  recentAnnualMm: number;
  baselineMonthly: number[];
  recentMonthly: number[];
  wetDryRatio: number;
  baselineWetMonths: number;
  recentWetMonths: number;
  wetSeasonShiftMonths: number;
  peakRainMonthBaseline: string;
  peakRainMonthRecent: string;
  peakRainMonthShiftIndex: number;
  wetSeasonOnsetDoyBaseline: number | null;
  wetSeasonOnsetDoyRecent: number | null;
  wetSeasonOnsetShiftDays: number | null;
  annualTotalShiftPct: number;
  biggestRainMonth: { month: string; diff: number; pctDiff: number };
};

/**
 * Wet-season metrics. Uses the SAME year windows as the temperature analysis
 * (first 30 vs last 10 complete years in the supplied rainfall series) so the
 * two are directly comparable.
 *
 * A "wet month" is one whose monthly rainfall exceeds the baseline's own
 * monthly-mean rainfall (annual total / 12). Wet-season onset is the day-of-
 * year where cumulative rainfall (from 1 Jan) first crosses 25% of the
 * baseline annual total — a standard agroclimate definition.
 */
export function analyseRainfall(
  rainfallMonthly: MonthlyPoint[] | null | undefined,
): RainShift | null {
  if (!rainfallMonthly?.length) return null;
  const years = completeYears(rainfallMonthly);
  if (years.length < 30) return null;

  const { baseline, recent, baseMonthly, recMonthly } = baselineRecent(years);

  const baselineAnnual = baseMonthly.reduce((a, b) => a + b, 0);
  const recentAnnual = recMonthly.reduce((a, b) => a + b, 0);

  const maxBase = Math.max(...baseMonthly);
  const minBase = Math.max(1, Math.min(...baseMonthly)); // avoid div-by-zero for very dry regions
  const wetDryRatio = maxBase / minBase;

  const monthlyMeanBase = baselineAnnual / 12;

  const baselineWetMonths = baseMonthly.filter((v) => v > monthlyMeanBase).length;
  const recentWetMonths = recMonthly.filter((v) => v > monthlyMeanBase).length;

  const peakBaseIdx = baseMonthly.reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);
  const peakRecIdx = recMonthly.reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);

  // Wet-season onset: DOY where cumulative rainfall first passes 25% of annual
  const cumulative = (monthly: number[], total: number): number | null => {
    if (total <= 0) return null;
    const target = total * 0.25;
    let running = 0;
    for (let i = 0; i < 12; i++) {
      const next = running + monthly[i];
      if (next >= target) {
        const frac = (target - running) / Math.max(monthly[i], 0.001);
        // Spread month uniformly across its days
        const monthStart = MID_MONTH_DOY[i] - 15;
        const monthEnd = MID_MONTH_DOY[i] + 15;
        return monthStart + frac * (monthEnd - monthStart);
      }
      running = next;
    }
    return null;
  };
  const onsetBase = cumulative(baseMonthly, baselineAnnual);
  const onsetRec = cumulative(recMonthly, recentAnnual);

  const diffs = recMonthly.map((v, i) => v - baseMonthly[i]);
  const biggestIdx = diffs.reduce((bi, v, i, arr) => Math.abs(v) > Math.abs(arr[bi]) ? i : bi, 0);
  const biggestPct = baseMonthly[biggestIdx] > 0
    ? +((diffs[biggestIdx] / baseMonthly[biggestIdx]) * 100).toFixed(1)
    : 0;

  return {
    baselineAnnualMm: +baselineAnnual.toFixed(0),
    recentAnnualMm: +recentAnnual.toFixed(0),
    baselineMonthly: baseMonthly.map((v) => +v.toFixed(1)),
    recentMonthly: recMonthly.map((v) => +v.toFixed(1)),
    wetDryRatio: +wetDryRatio.toFixed(2),
    baselineWetMonths,
    recentWetMonths,
    wetSeasonShiftMonths: recentWetMonths - baselineWetMonths,
    peakRainMonthBaseline: SHIFT_MONTH_LABELS[peakBaseIdx],
    peakRainMonthRecent: SHIFT_MONTH_LABELS[peakRecIdx],
    peakRainMonthShiftIndex: peakRecIdx - peakBaseIdx,
    wetSeasonOnsetDoyBaseline: onsetBase === null ? null : +onsetBase.toFixed(1),
    wetSeasonOnsetDoyRecent: onsetRec === null ? null : +onsetRec.toFixed(1),
    wetSeasonOnsetShiftDays:
      onsetBase !== null && onsetRec !== null ? +(onsetRec - onsetBase).toFixed(1) : null,
    annualTotalShiftPct:
      baselineAnnual > 0
        ? +(((recentAnnual - baselineAnnual) / baselineAnnual) * 100).toFixed(1)
        : 0,
    biggestRainMonth: {
      month: SHIFT_MONTH_LABELS[biggestIdx],
      diff: +diffs[biggestIdx].toFixed(1),
      pctDiff: biggestPct,
    },
  };
}

/** Classify the region's annual-cycle character. */
export function classifySeasonality(
  temp: TempShift | null,
  rain: RainShift | null,
): SeasonalityKind {
  const tempSeasonal = !!temp && temp.baselineAmplitudeC >= TEMP_AMPLITUDE_THRESHOLD_C;
  const rainSeasonal = !!rain && rain.wetDryRatio >= WET_DRY_RATIO_THRESHOLD;
  if (tempSeasonal && rainSeasonal) return 'mixed';
  if (tempSeasonal) return 'warm-cold';
  if (rainSeasonal) return 'wet-dry';
  return 'aseasonal';
}

/* --------------------------------------------------------------------- */
/*  Köppen–Geiger climate classification                                  */
/*                                                                        */
/*  Produces the standard 2- or 3-letter code (e.g. Cfb, Dfb, Aw, BWh)    */
/*  from monthly temperature (°C) and precipitation (mm) climatologies.   */
/*                                                                        */
/*  Thresholds follow Peel, Finlayson & McMahon (2007) "Updated world     */
/*  map of the Köppen–Geiger climate classification", Hydrol. Earth Syst. */
/*  Sci., 11, 1633–1644 — the most widely cited modern implementation.    */
/* --------------------------------------------------------------------- */

export type KoppenGroup = 'A' | 'B' | 'C' | 'D' | 'E';

/** Short human label for each main group. */
export const KOPPEN_GROUP_LABEL: Record<KoppenGroup, string> = {
  A: 'Tropical',
  B: 'Arid',
  C: 'Temperate',
  D: 'Continental',
  E: 'Polar',
};

/** Long descriptive label for each full Köppen code we can emit. */
export const KOPPEN_CODE_LABEL: Record<string, string> = {
  Af: 'Tropical rainforest',
  Am: 'Tropical monsoon',
  Aw: 'Tropical savanna (dry winter)',
  As: 'Tropical savanna (dry summer)',
  BWh: 'Hot desert',
  BWk: 'Cold desert',
  BSh: 'Hot steppe',
  BSk: 'Cold steppe',
  Csa: 'Mediterranean — hot summer',
  Csb: 'Mediterranean — warm summer',
  Csc: 'Mediterranean — cold summer',
  Cwa: 'Humid subtropical (dry winter)',
  Cwb: 'Subtropical highland',
  Cwc: 'Cold subtropical highland',
  Cfa: 'Humid subtropical',
  Cfb: 'Oceanic / temperate',
  Cfc: 'Subpolar oceanic',
  Dsa: 'Continental — dry, hot summer',
  Dsb: 'Continental — dry, warm summer',
  Dsc: 'Continental — dry, cold summer',
  Dsd: 'Continental — dry, very cold winter',
  Dwa: 'Humid continental — dry winter, hot summer',
  Dwb: 'Humid continental — dry winter, warm summer',
  Dwc: 'Subarctic — dry winter',
  Dwd: 'Subarctic — dry winter, very cold',
  Dfa: 'Humid continental — hot summer',
  Dfb: 'Humid continental — warm summer',
  Dfc: 'Subarctic',
  Dfd: 'Subarctic — very cold winter',
  ET: 'Tundra',
  EF: 'Ice cap',
};

/**
 * Identify summer half and winter half (6 warmer vs 6 cooler months).
 *
 * Uses hemispheric convention (summer = Apr–Sep NH or Oct–Mar SH). Hemisphere
 * is detected by:
 *   • Temperature amplitude ≥ 3°C → month of warmest T (Apr–Sep → NH, else SH)
 *   • Amplitude < 3°C (near-equatorial) → rainfall concentration: whichever
 *     6-month astronomical half holds more rain is treated as summer.
 *     Defaults to NH if rainfall is flat or unavailable.
 *
 * This correctly distinguishes NH-monsoon regions like Uganda, Kenya, Nigeria
 * (rain peaks in Apr–Sep) from SH-monsoon regions like Tanzania, Brazil
 * (rain peaks in Oct–Mar), matching classical Köppen Aw classifications.
 */
function summerWinterIndices(
  monthlyT: number[],
  monthlyP?: number[] | null,
): { summer: number[]; winter: number[]; isNH: boolean } {
  const Tmax = Math.max(...monthlyT);
  const Tmin = Math.min(...monthlyT);
  const warmestIdx = monthlyT.indexOf(Tmax);
  const NH_SUMMER = [3, 4, 5, 6, 7, 8]; // Apr–Sep
  const SH_SUMMER = [9, 10, 11, 0, 1, 2]; // Oct–Mar

  let isNH: boolean;
  if (Tmax - Tmin >= 5) {
    isNH = warmestIdx >= 3 && warmestIdx <= 8;
  } else if (monthlyP && monthlyP.length === 12) {
    const nhSum = NH_SUMMER.reduce((a, i) => a + monthlyP[i], 0);
    const shSum = SH_SUMMER.reduce((a, i) => a + monthlyP[i], 0);
    isNH = nhSum >= shSum;
  } else {
    isNH = true;
  }
  const summer = isNH ? [...NH_SUMMER] : [...SH_SUMMER];
  const winter = isNH ? [...SH_SUMMER] : [...NH_SUMMER];
  return { summer, winter, isNH };
}

export type KoppenResult = {
  code: string;              // 2 or 3 letter code, e.g. 'Cfb', 'Aw', 'BWh'
  group: KoppenGroup;        // first letter
  label: string;             // human description
  groupLabel: string;        // "Temperate" etc
};

/**
 * Compute the dominant Köppen–Geiger class from baseline monthly climatology.
 * `monthlyT` and `monthlyP` are 12-element arrays (Jan..Dec) of mean
 * temperature (°C) and mean precipitation (mm).
 */
export function classifyKoppen(
  monthlyT: number[],
  monthlyP: number[] | null | undefined,
): KoppenResult | null {
  if (monthlyT.length !== 12) return null;
  if (!monthlyP || monthlyP.length !== 12) return null;

  const Tmin = Math.min(...monthlyT);
  const Tmax = Math.max(...monthlyT);
  const Tann = monthlyT.reduce((a, b) => a + b, 0) / 12;
  const Pann = monthlyP.reduce((a, b) => a + b, 0);
  const Pmin = Math.min(...monthlyP);
  const monthsAbove10 = monthlyT.filter((v) => v > 10).length;

  const { summer, winter } = summerWinterIndices(monthlyT, monthlyP);
  const Psummer = summer.reduce((a, i) => a + monthlyP[i], 0);
  const Pwinter = winter.reduce((a, i) => a + monthlyP[i], 0);
  const Ps_max = Math.max(...summer.map((i) => monthlyP[i]));
  const Ps_min = Math.min(...summer.map((i) => monthlyP[i]));
  const Pw_max = Math.max(...winter.map((i) => monthlyP[i]));
  const Pw_min = Math.min(...winter.map((i) => monthlyP[i]));

  // --- B (arid) — must be tested BEFORE A/C/D ---
  let bThreshold: number;
  if (Psummer >= 0.7 * Pann) bThreshold = 20 * Tann + 280;
  else if (Pwinter >= 0.7 * Pann) bThreshold = 20 * Tann;
  else bThreshold = 20 * Tann + 140;

  if (Pann < bThreshold) {
    const second = Pann < bThreshold / 2 ? 'W' : 'S';
    const third = Tann >= 18 ? 'h' : 'k';
    const code = `B${second}${third}`;
    return { code, group: 'B', label: KOPPEN_CODE_LABEL[code] ?? code, groupLabel: KOPPEN_GROUP_LABEL.B };
  }

  // --- E (polar) ---
  if (Tmax < 10) {
    const code = Tmax < 0 ? 'EF' : 'ET';
    return { code, group: 'E', label: KOPPEN_CODE_LABEL[code] ?? code, groupLabel: KOPPEN_GROUP_LABEL.E };
  }

  // --- A (tropical) ---
  if (Tmin >= 18) {
    let second: 'f' | 'm' | 'w' | 's';
    if (Pmin >= 60) second = 'f';
    else if (Pmin >= 100 - Pann / 25) second = 'm';
    else {
      // driest month: is it in the summer half or winter half?
      const driestIdx = monthlyP.indexOf(Pmin);
      second = summer.includes(driestIdx) ? 's' : 'w';
    }
    const code = `A${second}`;
    return { code, group: 'A', label: KOPPEN_CODE_LABEL[code] ?? code, groupLabel: KOPPEN_GROUP_LABEL.A };
  }

  // --- C (temperate) or D (continental) ---
  // Distinguished by coldest-month temperature: C has Tmin > -3 (some use 0),
  // D has Tmin ≤ -3. We follow Peel 2007's use of 0°C rather than -3°C.
  const isD = Tmin <= 0;
  const group: KoppenGroup = isD ? 'D' : 'C';

  // Second letter: precipitation seasonality
  //   s (dry summer): Ps_min < 40 mm AND Ps_min < Pw_max / 3
  //   w (dry winter): Pw_min < Ps_max / 10
  //   f: neither
  //
  // Classical Köppen uses the strict Pw_min < Ps_max/10 ratio, but that
  // cutoff is fragile when working with country-averaged CRU TS data:
  // highland subtropical countries like Lesotho (Pw_min=13, Ps_max=126)
  // and Rwanda (Pw_min=14, Ps_max=131) miss the 1/10 bar by ~3 % despite
  // having an obvious dry winter. We therefore add an absolute "at least
  // one near-dry winter month below 30 mm AND well below the summer peak"
  // fallback (consistent with Köppen–Trewartha practice) so these cases
  // resolve to the Cwb/Cwa codes reference maps report.
  let second: 's' | 'w' | 'f';
  const isDrySummer = Ps_min < 40 && Ps_min < Pw_max / 3;
  const isDryWinter =
    Pw_min < Ps_max / 10 || (Pw_min < 30 && Pw_min < Ps_max / 5);
  if (isDrySummer && !isDryWinter) second = 's';
  else if (isDryWinter && !isDrySummer) second = 'w';
  else if (isDrySummer && isDryWinter) {
    // both marginal — pick the stronger signal
    second = Psummer < Pwinter ? 's' : 'w';
  } else second = 'f';

  // Third letter: summer temperature
  //   a: Tmax ≥ 22
  //   b: Tmax < 22 AND monthsAbove10 ≥ 4
  //   c: monthsAbove10 in 1..3 (and not d)
  //   d: D-group only, Tmin < -38
  let third: 'a' | 'b' | 'c' | 'd';
  if (isD && Tmin < -38) third = 'd';
  else if (Tmax >= 22) third = 'a';
  else if (monthsAbove10 >= 4) third = 'b';
  else third = 'c';

  const code = `${group}${second}${third}`;
  return { code, group, label: KOPPEN_CODE_LABEL[code] ?? code, groupLabel: KOPPEN_GROUP_LABEL[group] };
}

