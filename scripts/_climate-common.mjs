// Shared helpers for climate snapshot builder scripts.

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const round2 = (v) => Math.round(v * 100) / 100;

export async function fetchWithRetry(url, { attempts = 4, timeoutMs = 120_000, label, kind = 'json' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const started = Date.now();
      console.log(`[${label}] attempt ${attempt}/${attempts} → ${url}`);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': '4billionyearson-climate-snapshot/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = kind === 'text' ? await res.text() : await res.json();
      console.log(`[${label}] ✓ ${Date.now() - started}ms`);
      return body;
    } catch (err) {
      lastErr = err;
      console.warn(`[${label}] attempt ${attempt} failed: ${err?.message ?? err}`);
      if (attempt < attempts) {
        const backoff = 2_000 * attempt;
        await new Promise((r) => setTimeout(r, backoff));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error(`[${label}] all attempts failed`);
}

export async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Generic stats builders matching the runtime routes ───────────────────

/**
 * points: [{ year, month, value }]
 * options: { lowerIsBetter }
 */
export function buildLatestMonthStats(points, { lowerIsBetter = false } = {}) {
  if (!points.length) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = points
    .filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));
  if (!filtered.length) return null;
  const latest = filtered[filtered.length - 1];
  const comparable = filtered.filter((p) => p.month === latest.month);
  const baseline = comparable.filter((p) => p.year >= 1961 && p.year <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((s, p) => s + p.value, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  const rank = ranked.findIndex((p) => p.year === latest.year && p.month === latest.month) + 1;
  const record = ranked[0];
  return {
    label: `${MONTH_NAMES[latest.month - 1]} ${latest.year}`,
    value: latest.value,
    diff: baselineAvg === null ? null : round2(latest.value - baselineAvg),
    rank,
    total: ranked.length,
    recordLabel: `${MONTH_NAMES[record.month - 1]} ${record.year}`,
    recordValue: record.value,
  };
}

export function buildLatestThreeMonthStats(points, { lowerIsBetter = false, isSum = false } = {}) {
  if (points.length < 3) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const filtered = points
    .filter((p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));
  if (filtered.length < 3) return null;
  const windows = [];
  for (let i = 2; i < filtered.length; i++) {
    const a = filtered[i - 2];
    const b = filtered[i - 1];
    const c = filtered[i];
    const contiguous = (a.year * 12 + a.month + 1 === b.year * 12 + b.month)
      && (b.year * 12 + b.month + 1 === c.year * 12 + c.month);
    if (!contiguous) continue;
    const value = isSum ? (a.value + b.value + c.value) : ((a.value + b.value + c.value) / 3);
    windows.push({
      endMonth: c.month,
      endYear: c.year,
      label: `${MONTH_NAMES[a.month - 1]}–${MONTH_NAMES[c.month - 1]} ${c.year}`,
      value: round2(value),
    });
  }
  if (!windows.length) return null;
  const latest = windows[windows.length - 1];
  const comparable = windows.filter((w) => w.endMonth === latest.endMonth);
  const baseline = comparable.filter((w) => w.endYear >= 1961 && w.endYear <= 1990);
  const baselineAvg = baseline.length ? round2(baseline.reduce((s, w) => s + w.value, 0) / baseline.length) : null;
  const ranked = [...comparable].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  const rank = ranked.findIndex((w) => w.label === latest.label) + 1;
  const record = ranked[0];
  return {
    label: latest.label,
    value: latest.value,
    diff: baselineAvg === null ? null : round2(latest.value - baselineAvg),
    rank,
    total: ranked.length,
    recordLabel: record.label,
    recordValue: record.value,
  };
}

export function buildYearlyFromMonthly(points, { isSum = false } = {}) {
  const byYear = {};
  for (const p of points) {
    if (!byYear[p.year]) byYear[p.year] = [];
    byYear[p.year].push(p.value);
  }
  const currentYear = new Date().getFullYear();
  const yearly = Object.keys(byYear).map(Number).sort((a, b) => a - b)
    .filter((y) => y < currentYear && byYear[y].length >= 6)
    .map((y) => {
      const vals = byYear[y];
      const agg = isSum
        ? round2(vals.reduce((a, b) => a + b, 0))
        : round2(vals.reduce((a, b) => a + b, 0) / vals.length);
      return { year: y, value: agg };
    });
  for (let i = 0; i < yearly.length; i++) {
    if (i >= 9) {
      const slice = yearly.slice(i - 9, i + 1);
      yearly[i].rollingAvg = round2(slice.reduce((a, b) => a + b.value, 0) / slice.length);
    }
  }
  return yearly;
}

export function buildMonthlyComparison(points) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const historicByMonth = {};
  for (const p of points) {
    if (p.year >= 1961 && p.year <= 1990) {
      if (!historicByMonth[p.month]) historicByMonth[p.month] = [];
      historicByMonth[p.month].push(p.value);
    }
  }
  // Fallback: if 1961-1990 baseline is incomplete, use everything pre-2000
  if (Object.keys(historicByMonth).length < 12) {
    for (const p of points) {
      if (p.year < 2000) {
        if (!historicByMonth[p.month]) historicByMonth[p.month] = [];
        historicByMonth[p.month].push(p.value);
      }
    }
  }
  const comparison = [];
  for (let i = 12; i >= 1; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) { m += 12; y--; }
    const point = points.find((p) => p.year === y && p.month === m);
    const historic = historicByMonth[m];
    const historicAvg = historic && historic.length > 0
      ? round2(historic.reduce((a, b) => a + b, 0) / historic.length)
      : null;
    const recent = point ? point.value : null;
    const diff = recent !== null && historicAvg !== null ? round2(recent - historicAvg) : null;
    comparison.push({
      monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
      month: m,
      year: y,
      recent,
      historicAvg,
      diff,
    });
  }
  return comparison;
}

export function currentMonthKey(version = '') {
  const now = new Date();
  const suffix = version ? `-${version}` : '';
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${suffix}`;
}

export function latestDataMonth(points) {
  if (!points.length) return '';
  const latest = [...points].sort((a, b) => (a.year - b.year) || (a.month - b.month)).at(-1);
  return `${latest.year}-${String(latest.month).padStart(2, '0')}`;
}
