export const maxDuration = 60;
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { getRegionBySlug, type ClimateRegion } from '@/lib/climate/regions';

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
  return !/[.!?]["')\]]?\s*$/.test(summary.trim());
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(region: ClimateRegion, profileData: any, nationalData: any, gdacsEvents: any[]): string {
  const lines: string[] = [];

  lines.push(`You are a climate journalist writing a compelling monthly update for ${region.name}.`);
  lines.push('Your audience is searching for the latest climate news and data for this area.');
  lines.push('');
  lines.push('TASK: Write exactly 2–3 paragraphs (150–200 words total) that tell a compelling, data-driven narrative.');
  lines.push('');
  lines.push('CONTENT PRIORITY (follow this order strictly):');
  lines.push('1. RANKED HIGHLIGHTS (Priority 1): Study the RANKED HIGHLIGHTS section below FIRST. The 3-month rankings are the most SEO-valuable — if sunshine was 3rd highest or frost days were 4th lowest of all time, THAT is your headline. Scan ALL variables for standout rankings (top 5 or bottom 5 of all time).');
  lines.push('2. LATEST MONTH (Priority 2): After the seasonal ranking lead, discuss the most recent single month. What ranked highest/lowest?');
  lines.push('3. ANNUAL / LONG-TERM (Priority 3): Put it all in context — previous full year, warming trend.');
  lines.push('4. EXTREME WEATHER: If there are active GDACS alerts or recent extreme weather events, weave them in naturally.');
  lines.push('5. CLIMATE DRIVERS: If El Niño, La Niña, NAO etc. are relevant, briefly mention them.');
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
    if (region.coveragePlaces?.length) {
      lines.push(`- You may mention that the region covers ${region.coveragePlaces.join(', ')}, but keep the official name as the main label.`);
    }
  }
  lines.push('');
  lines.push('RULES:');
  lines.push('- British English spelling throughout.');
  lines.push('- Plain text only — no markdown, bullet points, or headings.');
  lines.push('- Be specific with numbers but weave them into natural prose.');
  lines.push('- You MUST reference data from the tables below. Do NOT invent statistics.');
  lines.push('- Use the EXACT values and rankings from the RANKED HIGHLIGHTS and DATA TABLE provided — do NOT substitute with values from web searches, as these may differ due to rounding or methodology.');
  lines.push('- When citing temperature, use the AVERAGE temperature (Avg Temp / Mean Temp) from our data as the primary figure. Only mention maximum or minimum temperature if you explicitly label it as such (e.g. "maximum temperatures reached X°C"). Never present max temp figures as if they are the average.');
  lines.push('- Always use numeric ordinals (1st, 2nd, 3rd, 4th) rather than written-out words (first, second, third, fourth).');
  lines.push('- For web search findings about weather events, summarise in your own words. Do not copy text verbatim.');
  lines.push('- No policy recommendations.');
  lines.push('- CRITICAL: Ensure you complete your final sentence. Do not abruptly truncate the text.');
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

  // Search instruction
  lines.push('');
  lines.push(`═══ WEB SEARCH INSTRUCTION ═══`);
  lines.push(`Use Google Search to find recent weather news and climate events for ${region.name} in the last 1–3 months.`);
  lines.push(`Look for: major storms, floods, heatwaves, droughts, wildfires, or other extreme weather events.`);
  lines.push(`Also check: Is El Niño or La Niña currently active? Is the ENSO state affecting ${region.name}?`);
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
      maxOutputTokens: 3000,
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
  const summary = extractTextFromParts(data);
  if (!summary) {
    console.error(`Gemini returned no text (grounding=${useGrounding}):`, JSON.stringify(data).slice(0, 500));
  }
  return {
    summary,
    sources: useGrounding ? extractGroundingSources(data) : [],
    raw: data,
  };
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
  const cacheKey = `climate:summary:${slug}:${cacheMonth}-v17`;

  // Check cache (skip if ?nocache=1)
  if (!skipCache) {
    const cached = await getCached<{ summary: string; sources?: GroundingSource[] }>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }
  }

  // Fetch full profile data and GDACS events in parallel
  const base = getBaseUrl();
  const [profileData, extremeWeatherData] = await Promise.all([
    fetchJSON(`${base}/api/climate/profile/${slug}`),
    fetchJSON(`${base}/api/climate/extreme-weather`),
  ]);

  if (!profileData) {
    return NextResponse.json({ error: 'No profile data available' }, { status: 404 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No API key — return empty so frontend shows tagline, don't cache
    return NextResponse.json({ summary: null, sources: [], generatedAt: new Date().toISOString(), source: 'no-key' });
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

  const prompt = buildPrompt(region, profileData, nationalData, gdacsEvents);

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
      return NextResponse.json({ summary: null, sources: [], generatedAt: new Date().toISOString(), source: 'failed' });
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
    return NextResponse.json({ summary: null, sources: [], generatedAt: new Date().toISOString(), source: 'error' });
  }
}
