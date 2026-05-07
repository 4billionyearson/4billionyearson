export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCached, setDailyTerm } from '@/lib/climate/redis';
import { buildPlugInSolarPrompt, PLUG_IN_SOLAR_RESPONSE_SCHEMA } from '@/lib/plug-in-solar/prompt';
import type { PlugInSolarLiveData } from '@/lib/plug-in-solar/types';

/**
 * Daily refresh endpoint for the UK Plug-in Solar guide.
 *
 * Flow:
 * 1. Build a date-stamped Redis cache key (`plug-in-solar-uk:YYYY-MM-DD-v1`).
 * 2. Read the most-recent cached payload (today's if any, otherwise yesterday's).
 * 3. Call Gemini 2.5 Flash with Google Search grounding, instructing it to
 *    return JSON matching `PlugInSolarLiveData`.
 *    Grounding is incompatible with Gemini's structured-output mode, so
 *    we parse the JSON ourselves; if that fails we retry once without
 *    grounding using the structured-output mode as a safety net.
 * 4. Inject grounding citations into `groundingSources`.
 * 5. Cache with `setDailyTerm` (24h TTL) and call `revalidatePath` so the
 *    next visitor's SSR HTML is fresh.
 */

const CACHE_KEY_PREFIX = 'plug-in-solar-uk';
const CACHE_VERSION = 'v1';
const PREVIOUS_LOOKBACK_DAYS = 7;

function todayKey(): string {
  const d = new Date();
  return `${CACHE_KEY_PREFIX}:${d.toISOString().slice(0, 10)}-${CACHE_VERSION}`;
}

function dateOffsetKey(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return `${CACHE_KEY_PREFIX}:${d.toISOString().slice(0, 10)}-${CACHE_VERSION}`;
}

/** Find the most recent cached payload from today or up to N days back. */
export async function readMostRecentCache(): Promise<PlugInSolarLiveData | null> {
  for (let i = 0; i <= PREVIOUS_LOOKBACK_DAYS; i++) {
    const cached = await getCached<PlugInSolarLiveData>(dateOffsetKey(i));
    if (cached) return cached;
  }
  return null;
}

interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(geminiData: any): GroundingSource[] {
  const chunks = geminiData?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const out: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && title && !seen.has(uri)) {
      seen.add(uri);
      out.push({ title, uri });
    }
  }
  return out.slice(0, 8);
}

function extractTextFromParts(geminiData: any): string | null {
  const parts = geminiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const textParts = parts.filter((p: any) => typeof p.text === 'string').map((p: any) => p.text);
  return textParts.length ? textParts.join('').trim() : null;
}

/** Strip Markdown code fences (```json ... ```) if Gemini wrapped the output. */
function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
  }
  return trimmed;
}

async function callGemini(
  apiKey: string,
  prompt: string,
  mode: 'grounded' | 'structured',
): Promise<{ text: string | null; sources: GroundingSource[] }> {
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (mode === 'grounded') {
    body.tools = [{ google_search: {} }];
  } else {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = PLUG_IN_SOLAR_RESPONSE_SCHEMA;
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
    console.error(`[plug-in-solar-uk] Gemini error (mode=${mode}):`, errText.slice(0, 500));
    return { text: null, sources: [] };
  }
  const data = await res.json();
  const text = extractTextFromParts(data);
  const sources = mode === 'grounded' ? extractGroundingSources(data) : [];
  return { text, sources };
}

function tryParse(text: string | null): PlugInSolarLiveData | null {
  if (!text) return null;
  const cleaned = stripCodeFence(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.statusDashboard) || !parsed.legalStatus || !parsed.regulations) {
      return null;
    }
    return parsed as PlugInSolarLiveData;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const skipCache = url.searchParams.get('nocache') === '1';

  const cacheKey = todayKey();

  if (!skipCache) {
    const cached = await getCached<PlugInSolarLiveData>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'GEMINI_API_KEY not configured',
        retryable: false,
      },
      { status: 503 },
    );
  }

  // Use the most recent cached payload (today missed, so this will be
  // yesterday's at best) as the comparison baseline for the change log.
  const previous = await readMostRecentCache();

  const todayISO = new Date().toISOString().slice(0, 10);
  const prompt = buildPlugInSolarPrompt({ todayISO, previous });

  let parsed: PlugInSolarLiveData | null = null;
  let sources: GroundingSource[] = [];

  // Attempt 1: grounded (Google Search) call, parsing JSON from text.
  const grounded = await callGemini(apiKey, prompt, 'grounded');
  parsed = tryParse(grounded.text);
  if (parsed) sources = grounded.sources;

  // Attempt 2: structured output (no grounding) as a safety net if the
  // grounded model didn't return clean JSON.
  if (!parsed) {
    console.warn('[plug-in-solar-uk] grounded call failed JSON parse - retrying with structured output');
    const structured = await callGemini(apiKey, prompt, 'structured');
    parsed = tryParse(structured.text);
  }

  if (!parsed) {
    // Both attempts failed - serve stale cache if we have one
    if (previous) {
      return NextResponse.json(
        {
          ...previous,
          source: 'stale-cache',
          retryable: true,
          message: "Today's daily refresh failed - serving previous cache.",
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      {
        error: 'Gemini did not return valid JSON',
        retryable: true,
      },
      { status: 503 },
    );
  }

  // Inject grounding citations
  parsed.groundingSources = sources;
  parsed.generatedAt = new Date().toISOString();

  // Cache for 24 hours and tell Next.js to invalidate the SSR HTML
  await setDailyTerm(cacheKey, parsed);
  try {
    revalidatePath('/plug-in-solar-uk');
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ...parsed, source: 'fresh' });
}
