export const maxDuration = 60;
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

// ─── Ranking helpers ─────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface MonthEntry { month: number; year: number; value: number }

/** Rank the latest month against all same-months in the yearly data. Returns e.g. "2nd warmest March" */
function rankMonth(
  monthlyComparison: any[],
  yearlyOrMonthlyHistory: any[],
  valueKey: string,
  label: string,
  units: string,
  direction: 'highest' | 'lowest' = 'highest',
): string | null {
  if (!monthlyComparison?.length) return null;
  const latest = monthlyComparison[monthlyComparison.length - 1];
  const latestVal = latest.recent ?? latest.recentTemp ?? null;
  if (latestVal === null || latestVal === undefined) return null;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthName = monthNames[(latest.month - 1)] || `Month ${latest.month}`;
  const diff = latest.diff;
  const diffStr = diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}${units}` : '';

  return `${monthName} ${latest.year}: ${latestVal}${units} (${diffStr} vs historical average of ${latest.historicAvg}${units})`;
}

/** Extract recent monthly trend (last 3 months) */
function recentMonthlyTrend(monthlyComparison: any[], units: string): string {
  if (!monthlyComparison?.length) return '';
  const recent = monthlyComparison.slice(-3);
  return recent.map(m => {
    const val = m.recent ?? m.recentTemp ?? '?';
    const diff = m.diff;
    const diffStr = diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '?';
    return `${m.monthLabel}: ${val}${units} (${diffStr})`;
  }).join('; ');
}

/** Extract decade averages for context */
function decadeContext(yearly: any[], valueKey: string): string {
  if (!yearly?.length) return '';
  const vals = yearly.map((y: any) => ({ year: y.year, value: y[valueKey] ?? y.value })).filter((y: any) => y.value != null);
  if (vals.length < 20) return '';

  const lastDecade = vals.filter((y: any) => y.year >= vals[vals.length - 1].year - 9);
  const prevDecade = vals.filter((y: any) => y.year >= vals[vals.length - 1].year - 19 && y.year < vals[vals.length - 1].year - 9);
  const baseline = vals.filter((y: any) => y.year >= 1961 && y.year <= 1990);

  const avg = (arr: any[]) => arr.length ? (arr.reduce((s: number, v: any) => s + v.value, 0) / arr.length).toFixed(2) : '?';

  const parts: string[] = [];
  if (lastDecade.length >= 5) parts.push(`Last 10 years avg: ${avg(lastDecade)}`);
  if (prevDecade.length >= 5) parts.push(`Previous decade avg: ${avg(prevDecade)}`);
  if (baseline.length >= 10) parts.push(`1961–1990 baseline avg: ${avg(baseline)}`);

  return parts.join('; ');
}

// ─── Data extraction per region type ────────────────────────────────────────

function extractCountryData(profileData: any): string {
  const cd = profileData.countryData;
  if (!cd) return 'No country data available.';

  const lines: string[] = [];
  const mc = cd.monthlyComparison || [];
  const yd = cd.yearlyData || [];
  const py = cd.precipYearly || [];

  // Latest month
  const latestMonth = rankMonth(mc, yd, 'avgTemp', 'temperature', '°C');
  if (latestMonth) lines.push(`LATEST MONTH — Temperature: ${latestMonth}`);

  // Recent 3 months temperature trend
  const tempTrend = recentMonthlyTrend(mc, '°C');
  if (tempTrend) lines.push(`RECENT MONTHS — Temperature (value, diff vs avg): ${tempTrend}`);

  // Decade context
  const decCtx = decadeContext(yd, 'avgTemp');
  if (decCtx) lines.push(`DECADE CONTEXT — Temperature: ${decCtx}`);

  // Annual record holders
  if (yd.length > 0) {
    const sorted = [...yd].filter((y: any) => y.avgTemp != null).sort((a: any, b: any) => b.avgTemp - a.avgTemp);
    const latest = yd[yd.length - 1];
    const rank = sorted.findIndex((y: any) => y.year === latest.year) + 1;
    lines.push(`ANNUAL RANKING — ${latest.year} (${latest.avgTemp}°C) ranks ${ordinal(rank)} warmest out of ${sorted.length} years on record`);
    lines.push(`TOP 5 WARMEST YEARS: ${sorted.slice(0, 5).map((y: any) => `${y.year} (${y.avgTemp}°C)`).join(', ')}`);
  }

  // Precipitation
  if (py.length > 0) {
    const latest = py[py.length - 1];
    lines.push(`LATEST PRECIPITATION — ${latest.year}: ${latest.value}mm`);
    const sorted = [...py].filter((y: any) => y.value != null).sort((a: any, b: any) => b.value - a.value);
    const rank = sorted.findIndex((y: any) => y.year === latest.year) + 1;
    lines.push(`Precipitation ranks ${ordinal(rank)} wettest out of ${sorted.length} years`);
  }

  return lines.join('\n');
}

function extractUSStateData(profileData: any): string {
  const us = profileData.usStateData;
  if (!us?.paramData) return 'No US state data available.';

  const lines: string[] = [];
  const params = us.paramData;

  // Temperature
  if (params.tavg) {
    const mc = params.tavg.monthlyComparison || [];
    const yd = params.tavg.yearly || [];

    const latestMonth = rankMonth(mc, yd, 'value', 'avg temperature', '°C');
    if (latestMonth) lines.push(`LATEST MONTH — Avg Temperature: ${latestMonth}`);

    const tempTrend = recentMonthlyTrend(mc, '°C');
    if (tempTrend) lines.push(`RECENT MONTHS — Avg Temperature: ${tempTrend}`);

    const decCtx = decadeContext(yd, 'value');
    if (decCtx) lines.push(`DECADE CONTEXT — Temperature: ${decCtx}`);

    if (yd.length > 0) {
      const sorted = [...yd].filter((y: any) => y.value != null).sort((a: any, b: any) => b.value - a.value);
      const latest = yd[yd.length - 1];
      const rank = sorted.findIndex((y: any) => y.year === latest.year) + 1;
      lines.push(`ANNUAL RANKING — ${latest.year} (${latest.value}°C) ranks ${ordinal(rank)} warmest of ${sorted.length} years`);
      lines.push(`TOP 5 WARMEST YEARS: ${sorted.slice(0, 5).map((y: any) => `${y.year} (${y.value}°C)`).join(', ')}`);
    }
  }

  // Max temp
  if (params.tmax) {
    const mc = params.tmax.monthlyComparison || [];
    const latestMonth = rankMonth(mc, [], 'value', 'max temperature', '°C');
    if (latestMonth) lines.push(`LATEST MONTH — Max Temperature: ${latestMonth}`);
  }

  // Precipitation
  if (params.pcp) {
    const mc = params.pcp.monthlyComparison || [];
    const yd = params.pcp.yearly || [];
    const latestMonth = rankMonth(mc, yd, 'value', 'precipitation', 'mm');
    if (latestMonth) lines.push(`LATEST MONTH — Precipitation: ${latestMonth}`);
    const precipTrend = recentMonthlyTrend(mc, 'mm');
    if (precipTrend) lines.push(`RECENT MONTHS — Precipitation: ${precipTrend}`);
  }

  return lines.join('\n');
}

function extractUKRegionData(profileData: any): string {
  const uk = profileData.ukRegionData;
  if (!uk?.varData) return 'No UK region data available.';

  const lines: string[] = [];
  const vars = uk.varData;

  const varConfig: Record<string, { label: string; units: string; direction: 'highest' | 'lowest' }> = {
    Tmean: { label: 'Mean Temperature', units: '°C', direction: 'highest' },
    Tmax: { label: 'Max Temperature', units: '°C', direction: 'highest' },
    Tmin: { label: 'Min Temperature', units: '°C', direction: 'highest' },
    Rainfall: { label: 'Rainfall', units: 'mm', direction: 'highest' },
    Sunshine: { label: 'Sunshine Hours', units: 'hrs', direction: 'highest' },
    AirFrost: { label: 'Air Frost Days', units: ' days', direction: 'lowest' },
    Raindays1mm: { label: 'Rain Days (≥1mm)', units: ' days', direction: 'highest' },
  };

  for (const [varKey, config] of Object.entries(varConfig)) {
    if (!vars[varKey]) continue;
    const mc = vars[varKey].monthlyComparison || [];
    const yd = vars[varKey].yearly || [];

    const latestMonth = rankMonth(mc, yd, 'value', config.label, config.units);
    if (latestMonth) lines.push(`LATEST MONTH — ${config.label}: ${latestMonth}`);

    // Yearly ranking for temperature
    if (varKey === 'Tmean' && yd.length > 0) {
      const sorted = [...yd].filter((y: any) => y.value != null).sort((a: any, b: any) => b.value - a.value);
      const latest = yd[yd.length - 1];
      const rank = sorted.findIndex((y: any) => y.year === latest.year) + 1;
      lines.push(`ANNUAL RANKING — ${latest.year} (${latest.value}°C) ranks ${ordinal(rank)} warmest of ${sorted.length} years`);
      lines.push(`TOP 5 WARMEST YEARS: ${sorted.slice(0, 5).map((y: any) => `${y.year} (${y.value}°C)`).join(', ')}`);

      const decCtx = decadeContext(yd, 'value');
      if (decCtx) lines.push(`DECADE CONTEXT — Temperature: ${decCtx}`);
    }
  }

  // Recent 3-month trend for key variables
  if (vars.Tmean) {
    const trend = recentMonthlyTrend(vars.Tmean.monthlyComparison, '°C');
    if (trend) lines.push(`RECENT 3-MONTH TREND — Mean Temperature: ${trend}`);
  }
  if (vars.Rainfall) {
    const trend = recentMonthlyTrend(vars.Rainfall.monthlyComparison, 'mm');
    if (trend) lines.push(`RECENT 3-MONTH TREND — Rainfall: ${trend}`);
  }
  if (vars.AirFrost) {
    const trend = recentMonthlyTrend(vars.AirFrost.monthlyComparison, ' days');
    if (trend) lines.push(`RECENT 3-MONTH TREND — Air Frost Days: ${trend}`);
  }

  return lines.join('\n');
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(region: ClimateRegion, profileData: any): string {
  const lines: string[] = [];

  // Instructions
  lines.push(`You are writing a monthly climate data update for ${region.name}.`);
  lines.push('');
  lines.push('TASK: Write a concise 2–3 paragraph monthly climate update (about 150–180 words).');
  lines.push('');
  lines.push('RULES:');
  lines.push('- Focus on the LATEST MONTH\'s data and how it compares historically.');
  lines.push('- Mention any notable rankings (e.g. "the 3rd warmest March on record", "4th lowest frost days for February").');
  lines.push('- Place the month in context: how does it fit into trends over the last few months, the last year, and the last decade?');
  if (region.type === 'us-state') {
    lines.push('- Reference how this state\'s figures compare to national (US) context where meaningful.');
  } else if (region.type === 'uk-region') {
    lines.push('- Reference how this region\'s figures compare to national (UK) context where meaningful.');
  } else {
    lines.push('- Reference how this country\'s figures compare to the global trend where meaningful.');
  }
  lines.push('- Use British English spelling throughout (e.g. "recognise", "colour", "organisation").');
  lines.push('- Do NOT use markdown, bullet points, or headings — return flowing plain text paragraphs only.');
  lines.push('- Be specific with numbers. Do not invent data — only use what is provided below.');
  lines.push('- Write in an authoritative but accessible tone for a general audience.');
  lines.push('- Do not add speculative predictions or policy recommendations.');
  lines.push('');

  // Data section
  lines.push('═══ DATA ═══');
  lines.push(`Region: ${region.name} (${region.type})`);
  lines.push(`Data sources: ${region.dataSources.join(', ')}`);
  lines.push('');

  // Key stats
  const ks = profileData.keyStats || {};
  if (ks.latestTemp) lines.push(`Latest full-year avg temperature: ${ks.latestTemp}`);
  if (ks.tempTrend) lines.push(`Temperature trend: ${ks.tempTrend}`);
  if (ks.warmestYear) lines.push(`Warmest year on record: ${ks.warmestYear}`);
  if (ks.dataRange) lines.push(`Data coverage: ${ks.dataRange}`);
  if (ks.latestPrecip) lines.push(`Latest full-year precipitation: ${ks.latestPrecip}`);
  lines.push('');

  // Detailed monthly data
  if (region.type === 'country') {
    lines.push(extractCountryData(profileData));
  } else if (region.type === 'us-state') {
    lines.push(extractUSStateData(profileData));
  } else if (region.type === 'uk-region') {
    lines.push(extractUKRegionData(profileData));
  }

  return lines.join('\n');
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);

  if (!region) {
    return NextResponse.json({ error: 'Region not found' }, { status: 404 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

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
  const cacheKey = `climate:summary:${slug}:${cacheMonth}-v4`;

  // Check cache
  const cached = await getCached<{ summary: string }>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  // Fetch full profile data
  const base = getBaseUrl();
  const profileData = await fetchJSON(`${base}/api/climate/profile/${slug}`);
  if (!profileData) {
    return NextResponse.json({ error: 'No profile data available' }, { status: 404 });
  }

  const prompt = buildPrompt(region, profileData);

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const summary = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!summary) {
      return NextResponse.json({ error: 'Empty response from Gemini' }, { status: 502 });
    }

    const result = { summary, generatedAt: new Date().toISOString() };
    await setShortTerm(cacheKey, result);

    return NextResponse.json({ ...result, source: 'fresh' });
  } catch (err: any) {
    console.error('Gemini summary error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
