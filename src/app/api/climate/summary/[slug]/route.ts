export const maxDuration = 60;
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { getRegionBySlug, type ClimateRegion } from '@/lib/climate/regions';
import { buildDriverVocabularySection } from '@/lib/climate/warming-drivers';

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function fetchJSON(url: string, timeout = 30000): Promise<any | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── GDACS country mapping ─────────────────────────────────────────────────

const REGION_TO_GDACS_COUNTRY: Record<string, string[]> = {
  GBR: ['United Kingdom'],
  USA: ['United States of America', 'United States'],
  IND: ['India'],
  CHN: ['China'],
  DEU: ['Germany'],
  AUS: ['Australia'],
};

const US_STATE_NAMES: Record<string, string> = {
  'us-fl': 'Florida',
  'us-ca': 'California',
  'us-tx': 'Texas',
};

function getGDACSCountries(region: ClimateRegion): string[] {
  if (region.type === 'country') return REGION_TO_GDACS_COUNTRY[region.apiCode] || [region.name];
  if (region.type === 'us-state') return REGION_TO_GDACS_COUNTRY['USA'] || ['United States'];
  if (region.type === 'uk-region') return REGION_TO_GDACS_COUNTRY['GBR'] || ['United Kingdom'];
  return [region.name];
}

function filterGDACSEvents(events: any[], region: ClimateRegion): any[] {
  const countries = getGDACSCountries(region);
  const stateName = region.type === 'us-state' ? US_STATE_NAMES[region.apiCode] : null;

  return events.filter((e: any) => {
    const matchCountry = countries.some(c => e.country?.toLowerCase().includes(c.toLowerCase()));
    if (!matchCountry) return false;
    // For US states, also check if the event name mentions the state
    if (stateName && !e.name?.toLowerCase().includes(stateName.toLowerCase()) && !e.country?.toLowerCase().includes(stateName.toLowerCase())) {
      // Allow through if event is orange/red alert (major enough for whole country)
      return e.alertLevel === 'Orange' || e.alertLevel === 'Red';
    }
    return true;
  });
}

function buildGDACSSection(events: any[]): string {
  if (!events.length) return '';
  const lines: string[] = [];
  lines.push('\n═══ ACTIVE EXTREME WEATHER EVENTS (GDACS) ═══');
  const sorted = [...events].sort((a, b) => {
    const order: Record<string, number> = { Red: 0, Orange: 1, Green: 2 };
    return (order[a.alertLevel] ?? 3) - (order[b.alertLevel] ?? 3);
  });
  for (const e of sorted.slice(0, 5)) {
    lines.push(`  [${e.alertLevel?.toUpperCase()}] ${e.type}: ${e.name} (${e.country})`);
    if (e.severity) lines.push(`    Severity: ${e.severity}`);
    if (e.fromDate) lines.push(`    Period: ${e.fromDate} – ${e.toDate || 'ongoing'}`);
  }
  return lines.join('\n');
}

// ─── Ranked period stats for prompt ─────────────────────────────────────────

function formatRankedStat(stat: any, label: string, units: string): string {
  if (!stat) return '';
  const parts: string[] = [];
  // Round count-based metrics (frost days, rain days, sunshine hours) to integers
  const isCount = [' days', ' hrs'].some(u => units.includes(u));
  const displayValue = isCount ? Math.round(stat.value) : stat.value;
  const displayDiff = stat.diff != null ? (isCount ? Math.round(stat.diff) : Number(stat.diff.toFixed(1))) : null;
  parts.push(`${label}: ${displayValue}${units}`);
  if (displayDiff != null) {
    const sign = displayDiff > 0 ? '+' : '';
    parts.push(`anomaly ${sign}${displayDiff}${units} vs 1961–1990 baseline`);
  }
  parts.push(`RANKED ${ordinal(stat.rank)} of ${stat.total} years on record`);
  if (stat.recordLabel) parts.push(`all-time record: ${stat.recordValue}${units} (${stat.recordLabel})`);
  // Flag standout rankings
  if (stat.rank <= 5) parts.push('⬆️ TOP 5 — MUST MENTION');
  if (stat.rank >= stat.total - 4 && stat.total > 20) parts.push('⬇️ BOTTOM 5 — MUST MENTION');
  return parts.join(' · ');
}

function buildRankedHighlights(profileData: any, region: ClimateRegion): string {
  const lines: string[] = [];
  lines.push('\n═══ RANKED HIGHLIGHTS (priority data for the update) ═══');
  lines.push('Priority 1: LATEST MONTH — lead with this');
  lines.push('Priority 2: LATEST 3 MONTHS — seasonal context');
  lines.push('Priority 3: ANNUAL — long-term perspective');
  lines.push('');

  if (region.type === 'uk-region' && profileData.ukRegionData?.varData) {
    const vd = profileData.ukRegionData.varData;
    const metrics = [
      { key: 'Tmean', label: 'Mean Temp', units: '°C' },
      { key: 'Sunshine', label: 'Sunshine', units: ' hrs' },
      { key: 'Rainfall', label: 'Rainfall', units: ' mm' },
      { key: 'AirFrost', label: 'Frost Days', units: ' days' },
      { key: 'Raindays1mm', label: 'Rain Days', units: ' days' },
    ];
    for (const m of metrics) {
      const ms = vd[m.key]?.latestMonthStats;
      const qs = vd[m.key]?.latestThreeMonthStats;
      if (ms) lines.push(`  Month: ${formatRankedStat(ms, `${m.label} (${ms.label})`, m.units)}`);
      if (qs) lines.push(`  3‑Month: ${formatRankedStat(qs, `${m.label} (${qs.label})`, m.units)}`);
    }
  } else if (region.type === 'country' && profileData.nationalData?.varData) {
    // UK country page — use Met Office national data (all metrics)
    const vd = profileData.nationalData.varData;
    const metrics = [
      { key: 'Tmean', label: 'Mean Temp', units: '°C' },
      { key: 'Sunshine', label: 'Sunshine', units: ' hrs' },
      { key: 'Rainfall', label: 'Rainfall', units: ' mm' },
      { key: 'AirFrost', label: 'Frost Days', units: ' days' },
      { key: 'Raindays1mm', label: 'Rain Days', units: ' days' },
    ];
    for (const m of metrics) {
      const ms = vd[m.key]?.latestMonthStats;
      const qs = vd[m.key]?.latestThreeMonthStats;
      if (ms) lines.push(`  Month: ${formatRankedStat(ms, `${m.label} (${ms.label})`, m.units)}`);
      if (qs) lines.push(`  3‑Month: ${formatRankedStat(qs, `${m.label} (${qs.label})`, m.units)}`);
    }
  } else if (region.type === 'us-state' && profileData.usStateData?.paramData) {
    const pd = profileData.usStateData.paramData;
    const metrics = [
      { key: 'tavg', label: 'Avg Temp', units: '°C' },
      { key: 'tmax', label: 'Max Temp', units: '°C' },
      { key: 'pcp', label: 'Precipitation', units: ' mm' },
    ];
    for (const m of metrics) {
      const ms = pd[m.key]?.latestMonthStats;
      const qs = pd[m.key]?.latestThreeMonthStats;
      if (ms) lines.push(`  Month: ${formatRankedStat(ms, `${m.label} (${ms.label})`, m.units)}`);
      if (qs) lines.push(`  3‑Month: ${formatRankedStat(qs, `${m.label} (${qs.label})`, m.units)}`);
    }
  } else if (region.type === 'country' && profileData.nationalData?.paramData) {
    // USA country page — use NOAA national data (all metrics)
    const pd = profileData.nationalData.paramData;
    const metrics = [
      { key: 'tavg', label: 'Avg Temp', units: '°C' },
      { key: 'tmax', label: 'Max Temp', units: '°C' },
      { key: 'pcp', label: 'Precipitation', units: ' mm' },
    ];
    for (const m of metrics) {
      const ms = pd[m.key]?.latestMonthStats;
      const qs = pd[m.key]?.latestThreeMonthStats;
      if (ms) lines.push(`  Month: ${formatRankedStat(ms, `${m.label} (${ms.label})`, m.units)}`);
      if (qs) lines.push(`  3‑Month: ${formatRankedStat(qs, `${m.label} (${qs.label})`, m.units)}`);
    }
  } else if (region.type === 'country' && profileData.countryData) {
    const cd = profileData.countryData;
    const ms = cd.latestMonthStats;
    const qs = cd.latestThreeMonthStats;
    if (ms) lines.push(`  Month: ${formatRankedStat(ms, `Temperature (${ms.label})`, '°C')}`);
    if (qs) lines.push(`  3‑Month: ${formatRankedStat(qs, `Temperature (${qs.label})`, '°C')}`);
  }

  // Global context
  const gms = profileData.globalData?.landLatestMonthStats;
  const gqs = profileData.globalData?.landLatestThreeMonthStats;
  if (gms) lines.push(`  Global Month: ${formatRankedStat(gms, `Global Land Temp (${gms.label})`, '°C')}`);
  if (gqs) lines.push(`  Global 3‑Month: ${formatRankedStat(gqs, `Global Land Temp (${gqs.label})`, '°C')}`);

  return lines.join('\n');
}

// ─── Cross-variable monthly table for UK regions ────────────────────────────

function buildUKRegionTable(varData: Record<string, any>): string {
  const vars = ['Tmean', 'Tmax', 'Tmin', 'Rainfall', 'Sunshine', 'AirFrost', 'Raindays1mm'];
  const labels: Record<string, string> = {
    Tmean: 'Mean Temp (°C)', Tmax: 'Max Temp (°C)', Tmin: 'Min Temp (°C)',
    Rainfall: 'Rainfall (mm)', Sunshine: 'Sunshine (hrs)', AirFrost: 'Frost Days', Raindays1mm: 'Rain Days (≥1mm)',
  };

  // Get the months from Tmean (they should all be the same)
  const tmeanMC = varData.Tmean?.monthlyComparison || [];
  const months = tmeanMC.slice(-6);
  if (!months.length) return 'No monthly data available.';

  const lines: string[] = [];
  lines.push('MONTHLY DATA TABLE (last 6 months — value / historic avg / anomaly):');
  lines.push('');

  for (const m of months) {
    lines.push(`── ${m.monthLabel} ──`);
    for (const v of vars) {
      const mc = varData[v]?.monthlyComparison || [];
      const entry = mc.find((e: any) => e.monthLabel === m.monthLabel);
      if (!entry) continue;
      const val = entry.recent ?? '?';
      const avg = entry.historicAvg ?? '?';
      const diff = entry.diff;
      const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${typeof diff === 'number' ? diff.toFixed(1) : diff}` : '?';
      lines.push(`  ${labels[v] || v}: ${val} (avg: ${avg}, ${diffStr})`);
    }
    lines.push('');
  }

  // Add yearly ranking for Tmean
  const tmeanYearly = varData.Tmean?.yearly || [];
  if (tmeanYearly.length > 10) {
    const sorted = [...tmeanYearly].filter((y: any) => y.value != null).sort((a: any, b: any) => b.value - a.value);
    const latest = tmeanYearly[tmeanYearly.length - 1];
    const rank = sorted.findIndex((y: any) => y.year === latest.year) + 1;
    lines.push(`ANNUAL: ${latest.year} mean temp ${latest.value}°C — ${ordinal(rank)} warmest of ${sorted.length} years`);
    lines.push(`Top 5 warmest: ${sorted.slice(0, 5).map((y: any) => `${y.year} (${y.value}°C)`).join(', ')}`);
  }

  return lines.join('\n');
}

// ─── Cross-variable table for US states ─────────────────────────────────────

function buildUSStateTable(paramData: Record<string, any>): string {
  const params = ['tavg', 'tmax', 'tmin', 'pcp'];
  const labels: Record<string, string> = {
    tavg: 'Avg Temp (°C)', tmax: 'Max Temp (°C)', tmin: 'Min Temp (°C)', pcp: 'Precipitation (mm)',
  };

  const tavgMC = paramData.tavg?.monthlyComparison || [];
  const months = tavgMC.slice(-6);
  if (!months.length) return 'No monthly data available.';

  const lines: string[] = [];
  lines.push('MONTHLY DATA TABLE (last 6 months — value / historic avg / anomaly):');
  lines.push('');

  for (const m of months) {
    lines.push(`── ${m.monthLabel} ──`);
    for (const p of params) {
      const mc = paramData[p]?.monthlyComparison || [];
      const entry = mc.find((e: any) => e.monthLabel === m.monthLabel);
      if (!entry) continue;
      const val = entry.recent ?? '?';
      const avg = entry.historicAvg ?? '?';
      const diff = entry.diff;
      const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${typeof diff === 'number' ? diff.toFixed(1) : diff}` : '?';
      lines.push(`  ${labels[p] || p}: ${val} (avg: ${avg}, ${diffStr})`);
    }
    lines.push('');
  }

  // Yearly ranking
  const tavgYearly = paramData.tavg?.yearly || [];
  if (tavgYearly.length > 10) {
    const sorted = [...tavgYearly].filter((y: any) => y.value != null).sort((a: any, b: any) => b.value - a.value);
    const latest = tavgYearly[tavgYearly.length - 1];
    const rank = sorted.findIndex((y: any) => y.year === latest.year) + 1;
    lines.push(`ANNUAL: ${latest.year} avg temp ${latest.value}°C — ${ordinal(rank)} warmest of ${sorted.length} years`);
    lines.push(`Top 5 warmest: ${sorted.slice(0, 5).map((y: any) => `${y.year} (${y.value}°C)`).join(', ')}`);
  }

  return lines.join('\n');
}

// ─── Country monthly data ───────────────────────────────────────────────────

function buildCountryTable(countryData: any): string {
  const mc = countryData.monthlyComparison || [];
  const months = mc.slice(-6);
  if (!months.length) return 'No monthly data available.';

  const lines: string[] = [];
  lines.push('MONTHLY TEMPERATURE (last 6 months — value / historic avg / anomaly):');
  for (const m of months) {
    const val = m.recentTemp ?? m.recent ?? '?';
    const avg = m.historicAvg ?? '?';
    const diff = m.diff;
    const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${typeof diff === 'number' ? diff.toFixed(1) : diff}` : '?';
    lines.push(`  ${m.monthLabel}: ${val}°C (avg: ${avg}°C, ${diffStr}°C)`);
  }

  const yd = countryData.yearlyData || [];
  if (yd.length > 10) {
    const sorted = [...yd].filter((y: any) => y.avgTemp != null).sort((a: any, b: any) => b.avgTemp - a.avgTemp);
    const latest = yd[yd.length - 1];
    const rank = sorted.findIndex((y: any) => y.year === latest.year) + 1;
    lines.push(`\nANNUAL: ${latest.year} avg ${latest.avgTemp}°C — ${ordinal(rank)} warmest of ${sorted.length} years`);
    lines.push(`Top 5 warmest: ${sorted.slice(0, 5).map((y: any) => `${y.year} (${y.avgTemp}°C)`).join(', ')}`);
  }

  const py = countryData.precipYearly || [];
  if (py.length > 0) {
    const latest = py[py.length - 1];
    lines.push(`\nLatest annual precipitation: ${latest.value}mm (${latest.year})`);
  }

  return lines.join('\n');
}

// ─── National comparison data ───────────────────────────────────────────────

function buildNationalComparison(nationalData: any, nationalName: string): string {
  if (!nationalData) return '';
  const lines: string[] = [];
  lines.push(`\n═══ NATIONAL COMPARISON: ${nationalName} ═══`);

  if (nationalData.countryData) {
    const mc = nationalData.countryData.monthlyComparison || [];
    const months = mc.slice(-6);
    lines.push('Monthly temperature (last 6 months):');
    for (const m of months) {
      const val = m.recentTemp ?? m.recent ?? '?';
      const diff = m.diff;
      const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${typeof diff === 'number' ? diff.toFixed(1) : diff}` : '?';
      lines.push(`  ${m.monthLabel}: ${val}°C (${diffStr}°C vs avg)`);
    }
  }

  if (nationalData.ukRegionData?.varData) {
    const vd = nationalData.ukRegionData.varData;
    for (const v of ['Tmean', 'AirFrost', 'Rainfall']) {
      const mc = vd[v]?.monthlyComparison || [];
      if (!mc.length) continue;
      const months = mc.slice(-6);
      const label = v === 'Tmean' ? 'Mean Temp' : v === 'AirFrost' ? 'Frost Days' : 'Rainfall';
      lines.push(`${label} (last 6 months):`);
      for (const m of months) {
        const val = m.recent ?? '?';
        const diff = m.diff;
        const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${typeof diff === 'number' ? diff.toFixed(1) : diff}` : '?';
        lines.push(`  ${m.monthLabel}: ${val} (${diffStr} vs avg)`);
      }
    }
  }

  return lines.join('\n');
}

function summaryLooksIncomplete(summary: string): boolean {
  // Consider the summary complete if it ends with sentence-ending punctuation,
  // possibly followed by a closing quote/bracket/citation marker, or if it's
  // long enough (>= 400 chars) that the user gets a useful paragraph even if
  // the final sentence was cut. The old regex was too strict and caused
  // otherwise-good summaries to be rejected repeatedly.
  const trimmed = summary.trim();
  if (trimmed.length >= 400) return false;
  return !/[.!?]["')\]\s]*$/.test(trimmed);
}

// ─── Cross-region rankings insight ─────────────────────────────────────────

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  emoji?: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
}

function buildRankingsInsights(rankings: any, focusSlug?: string): string {
  if (!rankings?.rows?.length) return '';
  const rows: RankingRow[] = rankings.rows;
  const lines: string[] = [];
  const windows: Array<{ key: 'anomaly1m' | 'anomaly3m' | 'anomaly12m'; label: string }> = [
    { key: 'anomaly1m', label: '1-month anomaly (latest month)' },
    { key: 'anomaly3m', label: '3-month anomaly' },
    { key: 'anomaly12m', label: '12-month rolling anomaly' },
  ];

  lines.push('\n═══ CROSS-REGION RANKINGS (site-exclusive — lean into patterns) ═══');
  lines.push(`Every country, US state and UK region we track (${rows.length} in total) ranked by temperature anomaly vs 1961–1990.`);
  lines.push('This ranked cross-region view is rare — use it to highlight STRIKING GEOGRAPHIC PATTERNS (e.g. if 8 of the top 10 1-month anomalies are US states, that is a real, tell-able story worth a sentence).');
  lines.push('');

  const typeLabel = (t: string) => (t === 'us-state' ? 'US state' : t === 'uk-region' ? 'UK region' : 'country');
  const countByType = (arr: RankingRow[]) => {
    const counts: Record<string, number> = {};
    for (const r of arr) counts[r.type] = (counts[r.type] ?? 0) + 1;
    return counts;
  };

  for (const w of windows) {
    const valid = rows.filter((r) => typeof r[w.key] === 'number');
    if (valid.length < 10) continue;
    const sorted = [...valid].sort((a, b) => (b[w.key] as number) - (a[w.key] as number));
    const top10 = sorted.slice(0, 10);
    const bottom5 = sorted.slice(-5).reverse();

    lines.push(`── Top 10 warmest — ${w.label} ──`);
    top10.forEach((r, i) => {
      const v = r[w.key] as number;
      const sign = v > 0 ? '+' : '';
      lines.push(`  ${i + 1}. ${r.name} (${typeLabel(r.type)}): ${sign}${v.toFixed(2)}°C`);
    });

    const counts = countByType(top10);
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (dominant && dominant[1] >= 6) {
      lines.push(`  PATTERN: ${dominant[1]} of the top 10 are ${typeLabel(dominant[0])}s — a striking concentration worth mentioning.`);
    }

    lines.push('');
    lines.push(`── 5 coolest — ${w.label} ──`);
    bottom5.forEach((r, i) => {
      const v = r[w.key] as number;
      const sign = v > 0 ? '+' : '';
      lines.push(`  ${i + 1}. ${r.name} (${typeLabel(r.type)}): ${sign}${v.toFixed(2)}°C`);
    });
    lines.push('');

    if (focusSlug) {
      const idx = sorted.findIndex((r) => r.slug === focusSlug);
      if (idx !== -1) {
        const v = sorted[idx][w.key] as number;
        lines.push(`  FOCUS: ${sorted[idx].name} sits ${ordinal(idx + 1)} of ${sorted.length} for ${w.label} (${v > 0 ? '+' : ''}${v.toFixed(2)}°C). Mention this if the rank is in the top 20 or bottom 10.`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(region: ClimateRegion, profileData: any, nationalData: any, gdacsEvents: any[], rankings: any): string {
  const lines: string[] = [];

  lines.push(`You are a climate journalist writing a compelling monthly update for ${region.name}.`);
  lines.push('Your audience is searching for the latest climate news and data for this area.');
  lines.push('');
  lines.push('TASK: Write 3–4 short paragraphs (total 180–240 words) telling a compelling, data-driven narrative.');
  lines.push('');
  lines.push('STRUCTURE — organise the update using these short sub-headings, each on its own line prefixed with "## " exactly (two hashes and a space). Omit a section if you have nothing specific to say about it.');
  lines.push('  ## This month in numbers   — lead with the latest-month anomaly, ranking, and the 1 or 2 most newsworthy RANKED HIGHLIGHTS.');
  lines.push('  ## What changed          — 3-month/seasonal trend, how this region compares to the national/global picture, and (if relevant) its CROSS-REGION rank or cluster.');
  lines.push('  ## What’s driving change? — explain WHY this region is warming/cooling the way it is. Name 1–2 relevant WARMING DRIVERS from the vocabulary below (using the exact canonical term — e.g. "Arctic amplification", "urban heat island effect", "jet stream shifts"). Also weave in ENSO/NAO state and any active GDACS or recent notable weather events.');
  lines.push('  ## Looking ahead         — ONE carefully hedged forward-looking sentence (e.g. what forecasters or outlooks suggest). Only include if there is a concrete source to cite; otherwise omit.');
  lines.push('Each sub-heading must be on its own line, immediately followed by the paragraph below it. Separate paragraphs with a blank line.');
  lines.push('');
  lines.push('CONTENT PRIORITY (follow this order strictly):');
  lines.push('1. RANKED HIGHLIGHTS (Priority 1): Study the RANKED HIGHLIGHTS section below FIRST. The 3-month rankings are the most SEO-valuable — if sunshine was 3rd highest or frost days were 4th lowest of all time, THAT is your headline. Scan ALL variables for standout rankings (top 5 or bottom 5 of all time).');
  lines.push('2. LATEST MONTH (Priority 2): After the seasonal ranking lead, discuss the most recent single month. What ranked highest/lowest?');
  lines.push('3. ANNUAL / LONG-TERM (Priority 3): Put it all in context — previous full year, warming trend.');
  lines.push('4. EXTREME WEATHER: If there are active GDACS alerts or recent extreme weather events, weave them in naturally.');
  lines.push('5. CLIMATE DRIVERS: If El Niño, La Niña, NAO etc. are relevant, briefly mention them.');
  lines.push('6. CROSS-REGION RANKINGS: If this region is in the top 20 (or bottom 10) of any window in the CROSS-REGION RANKINGS section, mention the rank. If the top 10 shows a striking geographic concentration (e.g. mostly US states), that pattern is worth a single sentence of context.');
  lines.push('');
  lines.push('KEY PRINCIPLES:');
  lines.push('- RANKINGS ARE THE STORY: The ranked data IS the narrative. "The 3rd sunniest January–March on record" or "the 4th fewest frost days in over a century of records" — these are the headlines. If a metric ranks in the top/bottom 10, it MUST be mentioned.');
  lines.push('- MAKE ANOMALIES RELATABLE: Don\'t just say "18 fewer frost days than average" — say "that\'s 18 fewer mornings scraping ice off the car compared to a typical winter." Connect to everyday life.');
  lines.push('- CROSS-VARIABLE CONNECTIONS: Connect variables into a story — "a winter of exceptional sunshine and almost no frost made for..." Link cause and effect.');
  lines.push('- NARRATIVE FLOW: Tell a story, not a data dump. "The region recorded its 3rd sunniest start to the year in records stretching back to 1900, while frost days..." is better than separate facts.');
  if (region.type === 'uk-region') {
    lines.push('- NATIONAL CONTEXT: Compare to UK-wide data. Is this region more or less extreme than the national picture?');
  } else if (region.type === 'us-state') {
    lines.push('- NATIONAL CONTEXT: Compare to US-wide data. Same trends or different?');
  } else {
    lines.push('- GLOBAL CONTEXT: How does this country\'s pattern compare to the global average?');
  }
  if (region.type === 'uk-region') {
    lines.push('- Use the official Met Office region name exactly as provided. Do not rename to a single city.');
  }
  lines.push('');
  lines.push('RULES:');
  lines.push('- British English spelling throughout.');
  lines.push('- Plain text only — no markdown emphasis (no **bold**, no *italics*), no bullet points, no headings EXCEPT the sub-headings specified in STRUCTURE which MUST use exactly "## Heading" on their own line. Never surround driver terms or any other phrase with asterisks — the site styles them automatically.');
  lines.push('- Be specific with numbers but weave them into natural prose.');
  lines.push('- You MUST reference data from the tables below. Do NOT invent statistics.');
  lines.push('- Use the EXACT values and rankings from the RANKED HIGHLIGHTS and DATA TABLE provided — do NOT substitute with values from web searches, as these may differ due to rounding or methodology.');
  lines.push('- When citing temperature, use the AVERAGE temperature (Avg Temp / Mean Temp) from our data as the primary figure. Only mention maximum or minimum temperature if you explicitly label it as such (e.g. "maximum temperatures reached X°C"). Never present max temp figures as if they are the average.');
  lines.push('- Always use numeric ordinals (1st, 2nd, 3rd, 4th) rather than written-out words (first, second, third, fourth).');
  lines.push('- Do not list coverage cities or example places in the summary. City coverage is shown separately in the page UI.');
  lines.push('- For web search findings about weather events, summarise in your own words. Do not copy text verbatim.');
  lines.push('- No policy recommendations.');
  lines.push('- CRITICAL: Ensure you complete your final sentence. Do not abruptly truncate the text.');
  lines.push('');

  // Warming drivers vocabulary (for the "Context" paragraph)
  lines.push(buildDriverVocabularySection());
  lines.push('');

  // Ranked highlights (priority data)
  lines.push(buildRankedHighlights(profileData, region));
  lines.push('');

  // Region data
  lines.push(`═══ ${region.name.toUpperCase()} DATA ═══`);
  lines.push(`Region type: ${region.type}`);

  const ks = profileData.keyStats || {};
  if (ks.latestTemp) lines.push(`Latest full-year avg temp: ${ks.latestTemp}`);
  if (ks.tempTrend) lines.push(`Long-term trend: ${ks.tempTrend}`);
  if (ks.warmestYear) lines.push(`Warmest year on record: ${ks.warmestYear}`);
  if (ks.dataRange) lines.push(`Records since: ${ks.dataRange}`);
  lines.push('');

  // Detailed monthly table — prefer national agency data over OWID for countries with it
  if (region.type === 'uk-region' && profileData.ukRegionData?.varData) {
    lines.push(buildUKRegionTable(profileData.ukRegionData.varData));
  } else if (region.type === 'country' && profileData.nationalData?.varData) {
    // UK country — use Met Office national data (all 7 metrics)
    lines.push(buildUKRegionTable(profileData.nationalData.varData));
  } else if (region.type === 'us-state' && profileData.usStateData?.paramData) {
    lines.push(buildUSStateTable(profileData.usStateData.paramData));
  } else if (region.type === 'country' && profileData.nationalData?.paramData) {
    // USA country — use NOAA national data
    lines.push(buildUSStateTable(profileData.nationalData.paramData));
  } else if (region.type === 'country' && profileData.countryData) {
    lines.push(buildCountryTable(profileData.countryData));
  }

  // National comparison
  if (nationalData) {
    const nationalName = region.type === 'uk-region' ? 'United Kingdom' : 'United States';
    lines.push(buildNationalComparison(nationalData, nationalName));
  }

  // GDACS extreme weather events
  if (gdacsEvents.length > 0) {
    lines.push(buildGDACSSection(gdacsEvents));
  }

  // Cross-region rankings
  const rankingsSection = buildRankingsInsights(rankings, region.slug);
  if (rankingsSection) {
    lines.push(rankingsSection);
  }

  // Search instruction
  lines.push('');
  lines.push(`═══ WEB SEARCH INSTRUCTION ═══`);
  lines.push(`Use Google Search to find recent weather news and climate events for ${region.name} in the last 1–3 months.`);
  lines.push(`Look for: major storms, floods, heatwaves, droughts, wildfires, or other extreme weather events.`);
  lines.push(`Also check: Is El Niño or La Niña currently active? Is the ENSO state affecting ${region.name}?`);
  lines.push(`Source quality: PREFER national meteorological services (Met Office, NOAA, Meteo France, DWD, JMA, BoM), Copernicus C3S, WMO, peer-reviewed journals, and established newspapers (BBC, Reuters, AP, Guardian, NYT, FT). AVOID aggregator sites, blogs, or paywalled sources that add no primary information.`);
  lines.push(`Verify dates: only cite events and ENSO states active during or close to ${region.name}'s latest data month. Do NOT carry over a previous month's ENSO state without checking.`);
  lines.push(`Summarise any relevant findings in your own words and weave them into the update narrative.`);

  return lines.join('\n');
}

// ─── Route handler ──────────────────────────────────────────────────────────

interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(geminiData: any): GroundingSource[] {
  const chunks = geminiData?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && title && !seen.has(uri)) {
      seen.add(uri);
      sources.push({ title, uri });
    }
  }
  return sources.slice(0, 5);
}

function extractTextFromParts(geminiData: any): string | null {
  const parts = geminiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const textParts = parts.filter((p: any) => typeof p.text === 'string').map((p: any) => p.text);
  return textParts.length ? textParts.join('').trim() : null;
}

async function callGemini(
  apiKey: string,
  prompt: string,
  useGrounding: boolean,
): Promise<{ summary: string | null; sources: GroundingSource[]; raw: any }> {
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8000,
      // gemini-2.5-flash uses "thinking" tokens by default which can eat the
      // entire maxOutputTokens budget before any text is emitted. Disable it
      // for this short-form summarisation task.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Gemini API error (grounding=${useGrounding}):`, errText);
    return { summary: null, sources: [], raw: null };
  }

  const data = await res.json();
  const finishReason = data?.candidates?.[0]?.finishReason;
  const summary = extractTextFromParts(data);
  if (!summary) {
    console.error(`Gemini returned no text (grounding=${useGrounding}, finishReason=${finishReason}):`, JSON.stringify(data).slice(0, 500));
  }
  return {
    summary,
    sources: useGrounding ? extractGroundingSources(data) : [],
    raw: data,
  };
}

// ─── Global prompt builder ─────────────────────────────────────────────────

function buildGlobalPrompt(globalData: any, rankings: any): string {
  const lines: string[] = [];

  lines.push('You are a climate journalist writing the monthly Global Climate Update for a general audience.');
  lines.push('This is the planet-wide update — the single most-read climate summary on the site.');
  lines.push('');
  lines.push('TASK: Write 3–4 short paragraphs (total 180–240 words) telling a compelling, data-driven narrative about the current state of global warming.');
  lines.push('');
  lines.push('STRUCTURE — organise the update using these short sub-headings, each on its own line prefixed with "## " exactly (two hashes and a space). Omit a section only if truly nothing to say.');
  lines.push('  ## This month in numbers  — lead with the latest-month NOAA land+ocean anomaly, its ranking, and the 10-year mean vs pre-industrial (Paris thresholds).');
  lines.push('  ## Land vs ocean          — contrast land-only and ocean-only figures; note that land is warming faster.');
  lines.push('  ## Cross-region picture   — one striking pattern from the CROSS-REGION RANKINGS section (e.g. "8 of the 10 hottest were US states") with 2–3 named regions.');
  lines.push('  ## What’s driving change? — ENSO state, major climate events, key announcements from Copernicus / WMO / NOAA / IPCC / COP, and WHY the planet-scale trend is what it is. Name 1–2 relevant WARMING DRIVERS from the vocabulary below using the exact canonical term (e.g. "land-ocean warming contrast", "Arctic amplification", "aerosol reduction").');
  lines.push('Each sub-heading must be on its own line, immediately followed by the paragraph below it. Separate paragraphs with a blank line.');
  lines.push('');
  lines.push('CONTENT PRIORITY:');
  lines.push('1. LEAD WITH THE LATEST MONTH — the most recent NOAA global LAND+OCEAN anomaly vs the 1961–1990 WMO baseline. State the figure, whether it was unusually warm or cool, and the all-time ranking. This is the headline number used by Copernicus, WMO and the world\'s climate press; use it rather than any land-only series.');
  lines.push('2. 10-YEAR ROLLING AVERAGE vs PRE-INDUSTRIAL — how close is the 10-year global land+ocean mean to the Paris 1.5°C and 2°C thresholds? This is the headline climate policy number (WMO/IPCC AR6 methodology).');
  lines.push('3. LAND vs OCEAN — briefly note that global land is warming faster than the ocean, ideally with a concrete figure from the separate NOAA land-only and ocean-only series below.');
  lines.push('4. WEB-GROUNDED CONTEXT — if Google Search surfaces relevant current events (ENSO state, notable extreme weather month, major climate report release, COP outcomes), weave them in naturally. Verify ENSO state against the month being summarised.');
  lines.push('5. CROSS-REGION RANKINGS — the CROSS-REGION RANKINGS section below is a site-exclusive view across every country, US state and UK region we track. Call out the most striking pattern from it in ONE sentence (e.g. "Eight of the ten hottest 1-month anomalies this month were US states" or similar). Name 2–3 specific regions from the top 10 where they make the pattern vivid.');
  lines.push('');
  lines.push('KEY PRINCIPLES:');
  lines.push('- MAKE IT CONCRETE: Translate anomalies into tangible terms. "+1.4°C above the 20th-century average" should be followed with what that feels like in the real world — record ocean heat, bleaching, heatwaves, altered jet streams, etc.');
  lines.push('- PARIS THRESHOLDS: Treat 1.5°C and 2°C above pre-industrial as the key benchmarks. If the rolling average is close to or past 1.5°C, say so plainly.');
  lines.push('- NARRATIVE FLOW: Tell a story, not a list of statistics. Connect the monthly figure to the decadal trend to the policy thresholds.');
  lines.push('- DO NOT COMPARE TO A SINGLE COUNTRY — this is the planetary-scale update.');
  lines.push('');
  lines.push('RULES:');
  lines.push('- British English spelling throughout.');
  lines.push('- Plain text only — no markdown emphasis (no **bold**, no *italics*), no bullet points, no headings EXCEPT the sub-headings specified in STRUCTURE which MUST use exactly "## Heading" on their own line. Never surround driver terms or any other phrase with asterisks — the site styles them automatically.');
  lines.push('- Be specific with numbers but weave them into natural prose.');
  lines.push('- Use the EXACT values from the DATA section below. Do NOT invent figures.');
  lines.push('- Use numeric ordinals (1st, 2nd, 3rd) rather than written-out words.');
  lines.push('- No policy recommendations.');
  lines.push('- CRITICAL: Ensure you complete your final sentence. Do not abruptly truncate.');
  lines.push('');
  lines.push(buildDriverVocabularySection());
  lines.push('');
  lines.push('═══ GLOBAL CLIMATE DATA ═══');
  lines.push(`Baseline (WMO standard): 1961–1990`);
  lines.push(`Pre-industrial reference (~1850–1900): ${globalData.preIndustrialBaseline}°C absolute`);
  lines.push(`20th-century mean (NOAA, land+ocean): ${globalData.globalBaseline}°C absolute`);
  lines.push(`Paris 1.5°C threshold: ${globalData.keyThresholds?.plus1_5}°C absolute`);
  lines.push(`Paris 2.0°C threshold: ${globalData.keyThresholds?.plus2_0}°C absolute`);
  lines.push('');

  // HEADLINE: NOAA land+ocean (the number used by Copernicus / WMO / climate press)
  const nStats = globalData.noaaStats || {};
  const noaaLO = nStats.landOcean?.latestMonthStats;
  const noaaLO3 = nStats.landOcean?.latestThreeMonthStats;
  if (noaaLO) {
    lines.push('LATEST MONTH — Global Land+Ocean (NOAA, headline figure used by Copernicus / WMO):');
    lines.push(`  ${noaaLO.label}: ${noaaLO.value}°C absolute${noaaLO.diff != null ? ` · anomaly ${noaaLO.diff > 0 ? '+' : ''}${noaaLO.diff.toFixed(2)}°C vs 1961–1990` : ''}`);
    lines.push(`  Ranked ${ordinal(noaaLO.rank)} of ${noaaLO.total} same-month values on record`);
    if (noaaLO.recordLabel) lines.push(`  All-time record for this month: ${noaaLO.recordValue}°C (${noaaLO.recordLabel})`);
    if (noaaLO.rank <= 5) lines.push('  ⬆️ TOP 5 — MUST MENTION');
  }
  if (noaaLO3) {
    lines.push('');
    lines.push('LATEST 3-MONTH WINDOW — Global Land+Ocean (NOAA):');
    lines.push(`  ${noaaLO3.label}: ${noaaLO3.value}°C absolute${noaaLO3.diff != null ? ` · anomaly ${noaaLO3.diff > 0 ? '+' : ''}${noaaLO3.diff.toFixed(2)}°C vs 1961–1990` : ''}`);
    lines.push(`  Ranked ${ordinal(noaaLO3.rank)} of ${noaaLO3.total} on record`);
  }

  // NOAA land-only and ocean-only — for the land-vs-ocean contrast
  const noaaLand = nStats.land?.latestMonthStats;
  const noaaOcean = nStats.ocean?.latestMonthStats;
  if (noaaLand || noaaOcean) {
    lines.push('');
    lines.push('LATEST MONTH — NOAA land-only vs ocean-only (for land/ocean contrast):');
    if (noaaLand) lines.push(`  Land only: ${noaaLand.value}°C absolute${noaaLand.diff != null ? ` · anomaly ${noaaLand.diff > 0 ? '+' : ''}${noaaLand.diff.toFixed(2)}°C vs 1961–1990` : ''} · ${ordinal(noaaLand.rank)} of ${noaaLand.total}`);
    if (noaaOcean) lines.push(`  Ocean only: ${noaaOcean.value}°C absolute${noaaOcean.diff != null ? ` · anomaly ${noaaOcean.diff > 0 ? '+' : ''}${noaaOcean.diff.toFixed(2)}°C vs 1961–1990` : ''} · ${ordinal(noaaOcean.rank)} of ${noaaOcean.total}`);
  }

  // Supplementary: OWID/ERA5 land-only (kept for backwards compatibility; do not lead with this)
  const gms = globalData.landLatestMonthStats;
  const gqs = globalData.landLatestThreeMonthStats;
  if (gms) {
    lines.push('');
    lines.push('SUPPLEMENTARY — Global Land (Our World in Data / ERA5, reanalysis alternative):');
    lines.push(`  ${gms.label}: ${gms.value}°C absolute${gms.diff != null ? ` · anomaly ${gms.diff > 0 ? '+' : ''}${gms.diff.toFixed(2)}°C vs 1961–1990` : ''}`);
    lines.push(`  Ranked ${ordinal(gms.rank)} of ${gms.total} same-month values on record`);
  }
  if (gqs) {
    lines.push(`  3-month window ${gqs.label}: ${gqs.value}°C absolute${gqs.diff != null ? ` · anomaly ${gqs.diff > 0 ? '+' : ''}${gqs.diff.toFixed(2)}°C vs 1961–1990` : ''} · ${ordinal(gqs.rank)} of ${gqs.total}`);
  }

  const yearly = globalData.yearlyData || [];
  if (yearly.length) {
    const latest = yearly[yearly.length - 1];
    const sorted = [...yearly].sort((a: any, b: any) => b.anomaly - a.anomaly);
    const rank = sorted.findIndex((y: any) => y.year === latest.year) + 1;
    lines.push('');
    lines.push('ANNUAL — Global Land+Ocean (NOAA):');
    lines.push(`  ${latest.year}: ${latest.absoluteTemp}°C absolute · anomaly ${latest.anomaly > 0 ? '+' : ''}${latest.anomaly}°C vs 20th-century mean`);
    lines.push(`  Ranked ${ordinal(rank)} of ${yearly.length} years on record`);
    lines.push(`  Top 5 warmest years: ${sorted.slice(0, 5).map((y: any) => `${y.year} (+${y.anomaly}°C)`).join(', ')}`);
    if (latest.rollingAvg != null) {
      const vsPI = (latest.rollingAvg - globalData.preIndustrialBaseline).toFixed(2);
      lines.push(`  10-year rolling mean (${latest.year - 9}-${latest.year}): ${latest.rollingAvg}°C absolute · +${vsPI}°C above pre-industrial`);
    }
  }

  const mc = globalData.monthlyComparison || [];
  if (mc.length) {
    lines.push('');
    lines.push('LAST 12 MONTHS — anomaly vs 1961–1990 (land+ocean):');
    for (const m of mc) {
      if (m.diff == null) continue;
      const sign = m.diff > 0 ? '+' : '';
      lines.push(`  ${m.monthLabel}: ${sign}${m.diff.toFixed(2)}°C`);
    }
  }

  const lvo = globalData.landVsOceanMonthly || [];
  if (lvo.length) {
    lines.push('');
    lines.push('LAND vs LAND+OCEAN — last 12 months absolute temperatures:');
    for (const p of lvo) {
      if (p.landTemp == null && p.landOceanTemp == null) continue;
      const landStr = p.landTemp != null ? `${p.landTemp}°C` : '—';
      const loStr = p.landOceanTemp != null ? `${p.landOceanTemp}°C` : '—';
      lines.push(`  ${p.monthLabel}: land ${landStr} · land+ocean ${loStr}`);
    }
  }

  lines.push('');
  lines.push('═══ WEB SEARCH INSTRUCTION ═══');
  lines.push('Use Google Search to find relevant planetary-scale climate news from the last 1–3 months.');
  lines.push('Look for: current ENSO state (El Niño / La Niña / neutral), notable global climate records, major heat or storm events with clear climate-change attribution, key IPCC / WMO / Copernicus / NOAA announcements, COP outcomes.');
  lines.push('Source quality: PREFER Copernicus C3S monthly bulletins, NOAA Monthly Climate Reports, WMO press releases, NASA GISS updates, Met Office press releases, peer-reviewed journals, and established newspapers (BBC, Reuters, AP, Guardian, NYT, FT). AVOID aggregator sites, blogs, or paywalled sources that add no primary information.');
  lines.push('Verify the ENSO state against the month being summarised — do NOT carry over a previous month’s state without checking.');
  lines.push('Summarise any relevant findings in your own words and weave them into the update narrative.');

  // Cross-region rankings
  const rankingsSection = buildRankingsInsights(rankings);
  if (rankingsSection) {
    lines.push(rankingsSection);
  }

  return lines.join('\n');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);

  if (!region) {
    return NextResponse.json({ error: 'Region not found' }, { status: 404 });
  }

  // Dev bypass: ?nocache=1 skips cache read (still writes)
  const url = new URL(request.url);
  const skipCache = url.searchParams.get('nocache') === '1';

  // Date-aware cache key
  const now = new Date();
  const dayOfMonth = now.getDate();
  const cacheMonth = dayOfMonth >= 21
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    : (() => {
        const prev = new Date(now);
        prev.setMonth(prev.getMonth() - 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      })();
  const cacheKey = `climate:summary:${slug}:${cacheMonth}-v25`;

  // Check cache (skip if ?nocache=1)
  if (!skipCache) {
    const cached = await getCached<{ summary: string; sources?: GroundingSource[] }>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      summary: null,
      sources: [],
      generatedAt: new Date().toISOString(),
      source: 'no-key',
      retryable: false,
      message: 'The AI-generated climate update is not available because the summary service is not configured.',
    }, { status: 503 });
  }

  const base = getBaseUrl();

  // ─── Special branch: global planet-level summary ───────────────────────
  if (region.type === 'special' && slug === 'global') {
    const [globalData, rankings] = await Promise.all([
      fetchJSON(`${base}/api/climate/global`),
      fetchJSON(`${base}/data/climate/rankings.json`),
    ]);
    if (!globalData) {
      return NextResponse.json({ error: 'No global data available' }, { status: 503 });
    }

    const prompt = buildGlobalPrompt(globalData, rankings);

    try {
      let result = await callGemini(apiKey, prompt, true);
      if (!result.summary || summaryLooksIncomplete(result.summary)) {
        console.log('Grounded call failed/incomplete for global, retrying without grounding');
        result = await callGemini(apiKey, prompt, false);
      }

      if (!result.summary || summaryLooksIncomplete(result.summary)) {
        return NextResponse.json({
          summary: null,
          sources: [],
          generatedAt: new Date().toISOString(),
          source: 'failed',
          retryable: true,
          message: 'The AI-generated global climate update could not be produced just now. You can try again.',
        }, { status: 503 });
      }

      const cacheResult = {
        summary: result.summary,
        sources: result.sources,
        generatedAt: new Date().toISOString(),
      };
      await setShortTerm(cacheKey, cacheResult);
      return NextResponse.json({ ...cacheResult, source: 'fresh' });
    } catch (err: any) {
      console.error('Gemini global summary error:', err);
      return NextResponse.json({
        summary: null,
        sources: [],
        generatedAt: new Date().toISOString(),
        source: 'error',
        retryable: true,
        message: 'The AI-generated global climate update could not be loaded right now. You can try again.',
      }, { status: 503 });
    }
  }

  // ─── Regional summaries (existing path) ────────────────────────────────
  // Fetch full profile data, GDACS events and cross-region rankings in parallel
  const [profileData, extremeWeatherData, rankings] = await Promise.all([
    fetchJSON(`${base}/api/climate/profile/${slug}`),
    fetchJSON(`${base}/api/climate/extreme-weather`),
    fetchJSON(`${base}/data/climate/rankings.json`),
  ]);

  if (!profileData) {
    return NextResponse.json({ error: 'No profile data available' }, { status: 404 });
  }

  // Fetch national comparison data for sub-national regions
  let nationalData = null;
  if (region.type === 'uk-region') {
    nationalData = await fetchJSON(`${base}/api/climate/profile/uk`);
  } else if (region.type === 'us-state') {
    nationalData = await fetchJSON(`${base}/api/climate/profile/usa`);
  }

  // Filter GDACS events for this region
  const gdacsEvents = extremeWeatherData?.gdacsEvents
    ? filterGDACSEvents(extremeWeatherData.gdacsEvents, region)
    : [];

  const prompt = buildPrompt(region, profileData, nationalData, gdacsEvents, rankings);

  try {
    // Try with Google Search grounding first, fall back to without
    let result = await callGemini(apiKey, prompt, true);
    if (!result.summary || summaryLooksIncomplete(result.summary)) {
      console.log(`Grounded call failed/incomplete for ${slug}, retrying without grounding`);
      result = await callGemini(apiKey, prompt, false);
    }

    if (!result.summary || summaryLooksIncomplete(result.summary)) {
      // Both attempts failed — don't cache, so next visitor retries
      console.error(`Gemini summary failed for ${slug} — not caching`);
      return NextResponse.json({
        summary: null,
        sources: [],
        generatedAt: new Date().toISOString(),
        source: 'failed',
        retryable: true,
        message: 'The AI-generated climate update could not be produced just now. You can try again.',
      }, { status: 503 });
    }

    const cacheResult = {
      summary: result.summary,
      sources: result.sources,
      generatedAt: new Date().toISOString(),
    };
    await setShortTerm(cacheKey, cacheResult);

    return NextResponse.json({ ...cacheResult, source: 'fresh' });
  } catch (err: any) {
    // Don't cache errors — next visitor will retry
    console.error('Gemini summary error:', err);
    return NextResponse.json({
      summary: null,
      sources: [],
      generatedAt: new Date().toISOString(),
      source: 'error',
      retryable: true,
      message: 'The AI-generated climate update could not be loaded right now. You can try again.',
    }, { status: 503 });
  }
}
