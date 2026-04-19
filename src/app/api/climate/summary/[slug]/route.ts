export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';
import { getRegionBySlug } from '@/lib/climate/regions';

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

function buildPrompt(regionName: string, stats: Record<string, string | undefined>, type: string): string {
  const parts: string[] = [];
  parts.push(`Write a concise, data-driven climate summary for ${regionName} in 2–3 short paragraphs (about 120 words total).`);
  parts.push('Use British English spelling throughout (e.g. "organisation", "recognise", "colour").');
  parts.push('Do NOT use markdown formatting — return plain text only.');
  parts.push('Be specific with numbers from the data provided. Reference actual temperature values and trends.');
  parts.push('Write in an authoritative but accessible scientific tone, suitable for a general audience.');
  parts.push('Do not add speculative predictions or policy recommendations — stick to what the data shows.');
  parts.push('');
  parts.push('Data:');

  if (stats.latestTemp) parts.push(`- Latest annual average temperature: ${stats.latestTemp}`);
  if (stats.tempTrend) parts.push(`- Temperature trend: ${stats.tempTrend}`);
  if (stats.warmestYear) parts.push(`- Warmest year on record: ${stats.warmestYear}`);
  if (stats.dataRange) parts.push(`- Data coverage: ${stats.dataRange}`);
  if (stats.latestPrecip) parts.push(`- Latest annual precipitation: ${stats.latestPrecip}`);
  parts.push(`- Region type: ${type}`);

  return parts.join('\n');
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  // Date-aware cache key (same logic as profile route)
  const now = new Date();
  const dayOfMonth = now.getDate();
  const cacheMonth = dayOfMonth >= 21
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    : (() => {
        const prev = new Date(now);
        prev.setMonth(prev.getMonth() - 1);
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      })();
  const cacheKey = `climate:summary:${slug}:${cacheMonth}-v3`;

  // Check cache first
  const cached = await getCached<{ summary: string }>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  // Fetch profile data to get key stats
  const base = getBaseUrl();
  const profileData = await fetchJSON(`${base}/api/climate/profile/${slug}`);
  if (!profileData?.keyStats) {
    return NextResponse.json({ error: 'No profile data available' }, { status: 404 });
  }

  const prompt = buildPrompt(region.name, profileData.keyStats, region.type);

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 300,
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
