export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { getRegionBySlug, CLIMATE_REGIONS, type ClimateRegion } from '@/lib/climate/regions';

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

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(region: ClimateRegion, profileData: any, nationalData: any): string {
  const lines: string[] = [];

  lines.push(`You are a climate data analyst writing a monthly update for ${region.name}.`);
  lines.push('');
  lines.push('TASK: Write a 2–3 paragraph update (180–220 words) that tells a STORY from the data.');
  lines.push('');
  lines.push('KEY PRINCIPLES:');
  lines.push('1. CROSS-VARIABLE: Show how different variables interact. If temperatures are up and frost days are down, connect them. If March was dry but sunny after a wet January/February, say so.');
  lines.push('2. MOST STRIKING PATTERN FIRST: Lead with the single most notable finding — the thing that would make someone say "wow, really?" For example, frost days consistently well below average across the entire winter might be the standout pattern.');
  lines.push('3. MONTHLY CONTEXT: How does the latest month compare to the previous 2–3 months? Has there been a shift (e.g. wet → suddenly dry)?');
  lines.push('4. TRENDS: Place in the context of the decade and long-term record. Is this winter\'s warmth part of an accelerating trend?');
  if (region.type === 'uk-region') {
    lines.push('5. NATIONAL CONTEXT: Compare to UK-wide data provided. Is this region\'s pattern more or less extreme than the national picture?');
  } else if (region.type === 'us-state') {
    lines.push('5. NATIONAL CONTEXT: Compare to US-wide data provided. Is this state experiencing the same trends as nationally?');
  } else {
    lines.push('5. GLOBAL CONTEXT: How does this country\'s warming trend compare to the global average?');
  }
  lines.push('6. MAKE IT RELATABLE: Use everyday language where helpful — "fewer frosty mornings", "a notably dry spring" — alongside the data.');
  lines.push('');
  lines.push('RULES:');
  lines.push('- British English spelling throughout.');
  lines.push('- Plain text only — no markdown, bullet points, or headings.');
  lines.push('- Be specific with numbers but weave them into natural prose.');
  lines.push('- Do NOT invent data. Only reference what is provided below.');
  lines.push('- No policy recommendations or speculation about future trends.');
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

  // Detailed monthly table
  if (region.type === 'uk-region' && profileData.ukRegionData?.varData) {
    lines.push(buildUKRegionTable(profileData.ukRegionData.varData));
  } else if (region.type === 'us-state' && profileData.usStateData?.paramData) {
    lines.push(buildUSStateTable(profileData.usStateData.paramData));
  } else if (region.type === 'country' && profileData.countryData) {
    lines.push(buildCountryTable(profileData.countryData));
  }

  // National comparison
  if (nationalData) {
    const nationalName = region.type === 'uk-region' ? 'United Kingdom' : 'United States';
    lines.push(buildNationalComparison(nationalData, nationalName));
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
  const cacheKey = `climate:summary:${slug}:${cacheMonth}-v6`;

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

  // Fetch national comparison data for sub-national regions
  let nationalData = null;
  if (region.type === 'uk-region') {
    nationalData = await fetchJSON(`${base}/api/climate/profile/uk`);
  } else if (region.type === 'us-state') {
    nationalData = await fetchJSON(`${base}/api/climate/profile/usa`);
  }

  const prompt = buildPrompt(region, profileData, nationalData);

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1200,
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
