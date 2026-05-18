/**
 * Season-scheme detection for the Climate Helix.
 *
 * Different regions have different season *systems*:
 *
 *   • temperate-NH — four seasons, summer = Apr–Sep (UK, Europe, N. America)
 *   • temperate-SH — four seasons, summer = Oct–Mar (NZ, S. Australia, Chile,
 *                                                    Argentina, southern Africa)
 *   • wet-dry-NH  — monsoon / tropical savanna with rains in Apr–Sep
 *                   (W. Africa, India, S.E. Asia, northern Australia in some yrs)
 *   • wet-dry-SH  — rains in Oct–Mar (parts of Brazil, S. Africa, N. Australia)
 *   • mediterranean — wet winter, dry summer (Mediterranean Csa/Csb, California)
 *   • aseasonal   — minimal seasonal cycle (tropical rainforest, polar caps)
 *
 * The scheme is derived from the monthly climatology — we reuse the
 * temperature-amplitude / rainfall-concentration logic that already powers
 * `src/lib/climate/shift-analysis.ts`.
 *
 * The Helix uses this to:
 *   - flip Winter/Summer labels and season-wedge anchors for SH;
 *   - swap to a 2-wedge Wet/Dry palette for wet-dry / mediterranean climates;
 *   - hide the spring/autumn-crossing trail in aseasonal regions where the
 *     10°C growing-season threshold isn't meaningful.
 *
 * Detection is conservative: when we don't have enough data we fall back
 * to `temperate-NH` (the original UK-tuned behaviour).
 */

export type SeasonSchemeKind =
  | 'temperate-NH'
  | 'temperate-SH'
  | 'wet-dry-NH'
  | 'wet-dry-SH'
  | 'mediterranean'
  | 'aseasonal';

export interface SeasonScheme {
  kind: SeasonSchemeKind;
  /** True for Northern-Hemisphere temperate / wet-dry systems. */
  isNH: boolean;
  /** True when seasons exist but follow a wet/dry rather than warm/cold split. */
  isWetDry: boolean;
  /** True when the annual cycle is essentially flat — no useful season ring. */
  isAseasonal: boolean;
  /** Number of distinct season categories to render in the wedge ring. */
  seasonCount: 1 | 2 | 4;
}

const TEMP_AMPLITUDE_THRESHOLD_C = 5;   // °C — same value used in shift-analysis.ts
const WET_DRY_RATIO_THRESHOLD = 2.5;    // wettest:driest month ratio
const NH_SUMMER_MONTHS = [3, 4, 5, 6, 7, 8] as const;     // Apr–Sep (0-indexed)
const SH_SUMMER_MONTHS = [9, 10, 11, 0, 1, 2] as const;   // Oct–Mar

/**
 * Compute a 12-month climatology (mean per calendar month) from a
 * monthly-all series. Returns null if fewer than ~5 complete years of
 * data are available — too noisy to classify confidently.
 */
function monthlyClimatology(
  monthly: Array<{ year: number; month: number; value: number }> | undefined | null,
): number[] | null {
  if (!monthly?.length) return null;
  const sums = new Array<number>(12).fill(0);
  const counts = new Array<number>(12).fill(0);
  for (const p of monthly) {
    if (!Number.isFinite(p.value)) continue;
    const m = p.month - 1;
    if (m < 0 || m > 11) continue;
    sums[m] += p.value;
    counts[m] += 1;
  }
  // Require at least 5 observations in every month.
  for (let m = 0; m < 12; m++) if (counts[m] < 5) return null;
  return sums.map((s, m) => s / counts[m]);
}

/**
 * Detect the season scheme for a region from its temperature and (optional)
 * rainfall climatologies.
 *
 * Algorithm:
 *   1. If temperature amplitude (Tmax − Tmin) ≥ 5°C → temperate-NH / -SH
 *      based on whether the warmest month falls in Apr–Sep or Oct–Mar.
 *   2. Otherwise, if rainfall has a strong wet/dry contrast → wet-dry-NH/-SH
 *      based on whether the wettest 6-month half is Apr–Sep or Oct–Mar.
 *   3. Otherwise → aseasonal.
 *
 * Mediterranean climates are detected as a temperate scheme whose wettest
 * months sit in the cold half — they keep the four-season palette but the
 * caller can opt to use the 2-season Wet/Dry palette via the `prefer` arg.
 */
export function detectSeasonScheme(opts: {
  tempMonthly?: Array<{ year: number; month: number; value: number }> | null;
  precipMonthly?: Array<{ year: number; month: number; value: number }> | null;
  /** Force a particular scheme regardless of data (e.g. for editorially
   *  curated pages or aggregate "global" series). */
  forceKind?: SeasonSchemeKind;
}): SeasonScheme {
  if (opts.forceKind) return schemeOf(opts.forceKind);

  const T = monthlyClimatology(opts.tempMonthly);
  const P = monthlyClimatology(opts.precipMonthly);

  if (T) {
    const Tmax = Math.max(...T);
    const Tmin = Math.min(...T);
    const amp = Tmax - Tmin;
    const warmestIdx = T.indexOf(Tmax);
    if (amp >= TEMP_AMPLITUDE_THRESHOLD_C) {
      const isNH = warmestIdx >= 3 && warmestIdx <= 8;
      // Tropical override: regions whose coolest month is still > 15°C have
      // no real "winter" — even if temp amplitude clears the 5°C bar (as in
      // monsoonal climates like India: Jan ~18°C, May ~32°C, amp ~14°C),
      // their lived season system is wet/dry, not warm/cold. Fall through
      // to the rainfall test so they get a 2-wedge wet/dry ring.
      const TROPICAL_TMIN_C = 15;
      if (P && Tmin > TROPICAL_TMIN_C) {
        const Pmax = Math.max(...P);
        const Pmin = Math.min(...P);
        const ratio = Pmin > 0 ? Pmax / Pmin : Number.POSITIVE_INFINITY;
        if (ratio >= WET_DRY_RATIO_THRESHOLD) {
          const nhRain = NH_SUMMER_MONTHS.reduce((a, m) => a + P[m], 0);
          const shRain = SH_SUMMER_MONTHS.reduce((a, m) => a + P[m], 0);
          return schemeOf(nhRain >= shRain ? 'wet-dry-NH' : 'wet-dry-SH');
        }
      }
      // Mediterranean check: dry summer, wet winter (NH/SH-agnostic).
      if (P) {
        const summerMonths = isNH ? NH_SUMMER_MONTHS : SH_SUMMER_MONTHS;
        const winterMonths = isNH ? SH_SUMMER_MONTHS : NH_SUMMER_MONTHS;
        const summerRain = summerMonths.reduce((a, m) => a + P[m], 0);
        const winterRain = winterMonths.reduce((a, m) => a + P[m], 0);
        if (winterRain > 0 && summerRain / winterRain < 0.5) {
          return schemeOf('mediterranean');
        }
      }
      return schemeOf(isNH ? 'temperate-NH' : 'temperate-SH');
    }
  }

  if (P) {
    const Pmax = Math.max(...P);
    const Pmin = Math.min(...P);
    const ratio = Pmin > 0 ? Pmax / Pmin : Number.POSITIVE_INFINITY;
    if (ratio >= WET_DRY_RATIO_THRESHOLD) {
      const nhRain = NH_SUMMER_MONTHS.reduce((a, m) => a + P[m], 0);
      const shRain = SH_SUMMER_MONTHS.reduce((a, m) => a + P[m], 0);
      return schemeOf(nhRain >= shRain ? 'wet-dry-NH' : 'wet-dry-SH');
    }
  }

  // No strong T or P cycle → aseasonal (or insufficient data).
  return schemeOf('aseasonal');
}

export function schemeOf(kind: SeasonSchemeKind): SeasonScheme {
  switch (kind) {
    case 'temperate-NH':
      return { kind, isNH: true,  isWetDry: false, isAseasonal: false, seasonCount: 4 };
    case 'temperate-SH':
      return { kind, isNH: false, isWetDry: false, isAseasonal: false, seasonCount: 4 };
    case 'wet-dry-NH':
      return { kind, isNH: true,  isWetDry: true,  isAseasonal: false, seasonCount: 2 };
    case 'wet-dry-SH':
      return { kind, isNH: false, isWetDry: true,  isAseasonal: false, seasonCount: 2 };
    case 'mediterranean':
      return { kind, isNH: true,  isWetDry: true,  isAseasonal: false, seasonCount: 2 };
    case 'aseasonal':
      return { kind, isNH: true,  isWetDry: false, isAseasonal: true,  seasonCount: 1 };
  }
}

/** Default fall-back used when we have no series at all. */
export const DEFAULT_SCHEME: SeasonScheme = schemeOf('temperate-NH');
