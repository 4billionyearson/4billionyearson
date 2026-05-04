import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { CLIMATE_REGIONS } from '@/lib/climate/regions';
import { CONTINENT_BY_ISO, US_REGION_BY_ID } from '@/lib/climate/editorial';
import { buildDriverVocabularySection } from '@/lib/climate/warming-drivers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  emoji?: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
  dataAsOf: string | null;
}

interface RankingsFile {
  generatedAt: string;
  cacheMonth: string;
  count: number;
  rows: RankingRow[];
}

interface GroundingSource {
  title: string;
  uri: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadRankings(file: 'rankings.json' | 'rankings-previous.json'): Promise<RankingsFile | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', file);
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtSigned(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}°C`;
}

function typeLabel(t: string): string {
  return t === 'us-state' ? 'US state' : t === 'uk-region' ? 'UK region' : 'country';
}

function computeMovers(current: RankingsFile, previous: RankingsFile | null) {
  if (!previous?.rows?.length) return { climbers: [], fallers: [] as any[] };
  const rankOf = (rows: RankingRow[]) => {
    const valid = rows.filter((r) => typeof r.anomaly1m === 'number');
    valid.sort((a, b) => (b.anomaly1m as number) - (a.anomaly1m as number));
    const map = new Map<string, number>();
    valid.forEach((r, i) => map.set(r.slug, i + 1));
    return map;
  };
  const prev = rankOf(previous.rows);
  const cur = rankOf(current.rows);
  const movers: Array<{ row: RankingRow; prevRank: number; currentRank: number; delta: number }> = [];
  for (const row of current.rows) {
    if (row.anomaly1m == null) continue;
    const p = prev.get(row.slug);
    const c = cur.get(row.slug);
    if (p == null || c == null) continue;
    const delta = p - c;
    if (delta === 0) continue;
    movers.push({ row, prevRank: p, currentRank: c, delta });
  }
  return {
    climbers: [...movers].sort((a, b) => b.delta - a.delta).slice(0, 5),
    fallers: [...movers].sort((a, b) => a.delta - b.delta).slice(0, 5),
  };
}

function computeRollups(rows: RankingRow[]) {
  const slugToRegion = new Map(CLIMATE_REGIONS.map((r) => [r.slug, r]));
  const cont: Record<string, number[]> = {};
  const usR: Record<string, number[]> = {};
  for (const row of rows) {
    if (row.anomaly1m == null) continue;
    const region = slugToRegion.get(row.slug);
    if (!region) continue;
    if (region.type === 'country') {
      const c = CONTINENT_BY_ISO[region.apiCode];
      if (c) (cont[c] ||= []).push(row.anomaly1m);
    } else if (region.type === 'us-state') {
      const u = US_REGION_BY_ID[region.apiCode];
      if (u) (usR[u] ||= []).push(row.anomaly1m);
    }
  }
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const toList = (obj: Record<string, number[]>) =>
    Object.entries(obj)
      .map(([k, v]) => ({ label: k, count: v.length, mean: mean(v) }))
      .sort((a, b) => b.mean - a.mean);
  return { continents: toList(cont), usRegions: toList(usR) };
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildAnalysisPrompt(current: RankingsFile, previous: RankingsFile | null): string {
  const rows = current.rows.filter((r) => typeof r.anomaly1m === 'number');
  const sorted1m = [...rows].sort((a, b) => (b.anomaly1m as number) - (a.anomaly1m as number));
  const sorted3m = [...current.rows.filter((r) => typeof r.anomaly3m === 'number')]
    .sort((a, b) => (b.anomaly3m as number) - (a.anomaly3m as number));
  const sorted12m = [...current.rows.filter((r) => typeof r.anomaly12m === 'number')]
    .sort((a, b) => (b.anomaly12m as number) - (a.anomaly12m as number));

  const top10 = sorted1m.slice(0, 10);
  const bottom5 = sorted1m.slice(-5).reverse();

  // Type concentration in top 10
  const top10Types: Record<string, number> = {};
  for (const r of top10) top10Types[r.type] = (top10Types[r.type] ?? 0) + 1;

  // Movers
  const { climbers, fallers } = computeMovers(current, previous);

  // Rollups
  const rollups = computeRollups(current.rows);

  const latestLabel = current.rows[0]?.latestLabel ?? current.cacheMonth;

  const lines: string[] = [];
  lines.push('You are a climate data journalist writing the monthly Cross-Region Analysis for 4 Billion Years On.');
  lines.push(`This update compares every country, US state and UK region we track (${rows.length} regions in total) for ${latestLabel}.`);
  lines.push('It is a site-exclusive, cross-region view - no other publication produces a monthly league table at this scope.');
  lines.push('');
  lines.push('TASK: Write 4 short paragraphs (total 220–300 words) telling a compelling, data-driven narrative.');
  lines.push('');
  lines.push('STRUCTURE - use these four sub-headings, each on its own line prefixed with "## " exactly (two hashes + space). Paragraph immediately follows on the next line. Separate paragraphs with a blank line.');
  lines.push('  ## Who led this month     - the single biggest anomaly and the top 3 named regions for the latest month, with their figures and what unites them (same continent? same climate zone?). 2–3 sentences.');
  lines.push('  ## Biggest shifts         - which regions climbed or fell furthest since last month, and why that matters (e.g. a sudden cold snap in one, lingering heatwave in another). Cite 2–3 specific climbers/fallers by name with their rank change. 2–3 sentences.');
  lines.push('  ## Regional patterns      - continent roll-ups (NOAA 7 continents, with North America / South America aggregated by 4BYO) and NOAA US climate region roll-ups (9 regions): which groups averaged warmest this month? Is the warmth concentrated or global? 2–3 sentences.');
  lines.push('  ## What’s driving change?  - use Google Search to find what might explain the standouts: ENSO state, a named heatwave, an atmospheric river, a monsoon anomaly, a polar vortex event. When it applies, also name 1–2 relevant WARMING DRIVERS from the vocabulary below using the exact canonical term (e.g. "Arctic amplification", "heat dome", "jet stream shifts"). Cite specific events verified against reputable sources (NOAA, WMO, Copernicus, national met services, major newspapers). 2–3 sentences.');
  lines.push('');
  lines.push('KEY PRINCIPLES:');
  lines.push('- LEAD WITH THE PATTERN, NOT JUST NUMBERS: "Eight of the ten hottest regions this month were US states" is more compelling than listing each state.');
  lines.push('- NAMING MATTERS: Mention specific regions - readers want to see whether their country is in the list.');
  lines.push('- CONNECT TO DRIVERS: If the ENSO state, NAO phase or a specific heatwave explains the pattern, say so. Anchor the pattern in a real-world cause.');
  lines.push('- CITE EVENTS, NOT OPINIONS: For the final paragraph, cite concrete events/announcements (named heatwaves, cyclones, Copernicus bulletins) from the last 4–8 weeks. Do not manufacture detail.');
  lines.push('');
  lines.push('RULES:');
  lines.push('- British English spelling throughout.');
  lines.push('- Plain text only - no markdown emphasis (no **bold**, no *italics*), no bullet points, no headings EXCEPT the sub-headings specified in STRUCTURE which MUST use exactly "## Heading" on their own line. Never surround driver terms or any other phrase with asterisks - the site styles them automatically.');
  lines.push('- Use the EXACT values and rankings from the DATA section - do NOT substitute with web-search figures.');
  lines.push('- Use numeric ordinals (1st, 2nd, 3rd).');
  lines.push('- No policy recommendations.');
  lines.push('- CRITICAL: Ensure you complete your final sentence.');
  lines.push('');

  // ── DATA ─────────────────────────────────────────────────────────────────  lines.push(buildDriverVocabularySection());
  lines.push('');  lines.push('═══ CROSS-REGION DATA ═══');
  lines.push(`Latest month: ${latestLabel}`);
  lines.push(`Snapshot month: ${current.cacheMonth}`);
  if (previous) lines.push(`Previous snapshot: ${previous.cacheMonth}`);
  lines.push('');

  lines.push('── Top 10 warmest - 1-month anomaly ──');
  top10.forEach((r, i) => {
    lines.push(`  ${i + 1}. ${r.name} (${typeLabel(r.type)}): ${fmtSigned(r.anomaly1m)}`);
  });
  const topTypeEntries = Object.entries(top10Types).sort((a, b) => b[1] - a[1]);
  if (topTypeEntries.length && topTypeEntries[0][1] >= 5) {
    lines.push(`  PATTERN: ${topTypeEntries[0][1]} of the top 10 are ${typeLabel(topTypeEntries[0][0])}s - worth leading with.`);
  }
  lines.push('');

  lines.push('── 5 coolest - 1-month anomaly ──');
  bottom5.forEach((r, i) => {
    lines.push(`  ${ordinal(rows.length - i)}. ${r.name} (${typeLabel(r.type)}): ${fmtSigned(r.anomaly1m)}`);
  });
  lines.push('');

  if (sorted3m.length) {
    lines.push('── Top 5 warmest - 3-month anomaly (seasonal signal) ──');
    sorted3m.slice(0, 5).forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.name} (${typeLabel(r.type)}): ${fmtSigned(r.anomaly3m)}`);
    });
    lines.push('');
  }

  if (sorted12m.length) {
    lines.push('── Top 5 warmest - 12-month rolling anomaly (longer-term signal) ──');
    sorted12m.slice(0, 5).forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.name} (${typeLabel(r.type)}): ${fmtSigned(r.anomaly12m)}`);
    });
    lines.push('');
  }

  if (climbers.length || fallers.length) {
    lines.push('── Biggest movers on the 1-month league table (vs previous snapshot) ──');
    if (climbers.length) {
      lines.push('  Climbed most (warmer vs peers this month):');
      climbers.forEach((m) => {
        lines.push(`    ${m.row.name} (${typeLabel(m.row.type)}): rank ${m.prevRank} → ${m.currentRank} (+${m.delta}), anomaly ${fmtSigned(m.row.anomaly1m)}`);
      });
    }
    if (fallers.length) {
      lines.push('  Dropped most (cooler vs peers this month):');
      fallers.forEach((m) => {
        lines.push(`    ${m.row.name} (${typeLabel(m.row.type)}): rank ${m.prevRank} → ${m.currentRank} (${m.delta}), anomaly ${fmtSigned(m.row.anomaly1m)}`);
      });
    }
    lines.push('');
  }

  if (rollups.continents.length) {
    lines.push('── Continent roll-ups - mean 1-month anomaly ──');
    rollups.continents.forEach((c) => {
      lines.push(`  ${c.label} (${c.count} countries): ${fmtSigned(c.mean)}`);
    });
    lines.push('');
  }

  if (rollups.usRegions.length) {
    lines.push('── NOAA US climate region roll-ups - mean 1-month anomaly ──');
    rollups.usRegions.forEach((u) => {
      lines.push(`  ${u.label} (${u.count} states): ${fmtSigned(u.mean)}`);
    });
    lines.push('');
  }

  lines.push('═══ WEB SEARCH INSTRUCTION ═══');
  lines.push('Use Google Search to find reputable reporting and bulletins from the last 4–8 weeks that could explain the patterns above:');
  lines.push('- Current ENSO state (El Niño / La Niña / neutral) and any NOAA/WMO ENSO updates.');
  lines.push('- Named heatwaves, cold snaps, atmospheric rivers, monsoon anomalies, polar vortex events.');
  lines.push('- Copernicus C3S monthly bulletin, WMO press releases, NOAA Monthly Climate Reports, Met Office press releases.');
  lines.push('- Only cite specific events if you can verify them against a reputable source.');
  lines.push('- Summarise in your own words; do not copy verbatim.');

  return lines.join('\n');
}

// ─── Gemini call (same signature as summary route) ──────────────────────────

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
  return sources.slice(0, 6);
}

function extractTextFromParts(geminiData: any): string | null {
  const parts = geminiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const textParts = parts.filter((p: any) => typeof p.text === 'string').map((p: any) => p.text);
  return textParts.length ? textParts.join('').trim() : null;
}

function summaryLooksIncomplete(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 300) return true;
  const last = trimmed.slice(-1);
  return !['.', '!', '?', '"', '”', ')'].includes(last);
}

async function callGemini(apiKey: string, prompt: string, useGrounding: boolean) {
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8000,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (useGrounding) body.tools = [{ google_search: {} }];

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
    console.error(`Gemini rankings-analysis error (grounding=${useGrounding}):`, errText);
    return { summary: null as string | null, sources: [] as GroundingSource[] };
  }
  const data = await res.json();
  const summary = extractTextFromParts(data);
  return { summary, sources: useGrounding ? extractGroundingSources(data) : [] };
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const skipCache = url.searchParams.get('nocache') === '1';

  const [current, previous] = await Promise.all([
    loadRankings('rankings.json'),
    loadRankings('rankings-previous.json'),
  ]);

  if (!current?.rows?.length) {
    return NextResponse.json({ error: 'Rankings data unavailable' }, { status: 503 });
  }

  // Date-aware cache key (mirrors the summary route convention)
  const now = new Date();
  const dayOfMonth = now.getDate();
  const cacheMonth = dayOfMonth >= 21
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    : (() => {
        const prev = new Date(now);
        prev.setMonth(prev.getMonth() - 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      })();
  const cacheKey = `climate:rankings-analysis:${cacheMonth}-v3`;

  if (!skipCache) {
    const cached = await getCached<{ summary: string; sources?: GroundingSource[]; generatedAt: string }>(cacheKey);
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
      message: 'The monthly cross-region analysis is not available because the summary service is not configured.',
    }, { status: 503 });
  }

  const prompt = buildAnalysisPrompt(current, previous);

  try {
    let result = await callGemini(apiKey, prompt, true);
    if (!result.summary || summaryLooksIncomplete(result.summary)) {
      console.log('Grounded rankings-analysis failed/incomplete, retrying without grounding');
      result = await callGemini(apiKey, prompt, false);
    }

    if (!result.summary || summaryLooksIncomplete(result.summary)) {
      return NextResponse.json({
        summary: null,
        sources: [],
        generatedAt: new Date().toISOString(),
        source: 'failed',
        retryable: true,
        message: 'The monthly cross-region analysis could not be produced just now. You can try again.',
      }, { status: 503 });
    }

    const cacheResult = {
      summary: result.summary,
      sources: result.sources,
      generatedAt: new Date().toISOString(),
    };
    await setShortTerm(cacheKey, cacheResult);
    // Bust the rankings page so the next request SSRs with the fresh
    // analysis baked in (matches the per-region summary pattern).
    try { revalidatePath('/climate/rankings'); } catch {}
    return NextResponse.json({ ...cacheResult, source: 'fresh' });
  } catch (err) {
    console.error('Gemini rankings-analysis error:', err);
    return NextResponse.json({
      summary: null,
      sources: [],
      generatedAt: new Date().toISOString(),
      source: 'error',
      retryable: true,
      message: 'The monthly cross-region analysis could not be loaded right now. You can try again.',
    }, { status: 503 });
  }
}
