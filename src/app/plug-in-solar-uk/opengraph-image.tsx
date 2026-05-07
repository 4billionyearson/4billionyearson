import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCached } from '@/lib/climate/redis';
import type { PlugInSolarLiveData, StatusPill, StatusValue } from '@/lib/plug-in-solar/types';

export const runtime = 'nodejs';
// Regenerate the OG image at most once an hour. The daily Gemini refresh
// also calls revalidatePath('/plug-in-solar-uk'), which invalidates this
// image immediately so each social-media unfurl after a refresh shows the
// fresh status pills.
export const revalidate = 3600;
export const alt = 'UK Plug-in Solar Guide 2026 — Legal Status, Kits, Payback & Batteries';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CACHE_KEY_PREFIX = 'plug-in-solar-uk';
const CACHE_VERSION = 'v6';
const LOOKBACK_DAYS = 7;

function dateOffsetKey(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return `${CACHE_KEY_PREFIX}:${d.toISOString().slice(0, 10)}-${CACHE_VERSION}`;
}

async function readMostRecent(): Promise<PlugInSolarLiveData | null> {
  for (let i = 0; i <= LOOKBACK_DAYS; i++) {
    try {
      const cached = await getCached<PlugInSolarLiveData>(dateOffsetKey(i));
      if (cached) return cached;
    } catch {
      /* keep walking back */
    }
  }
  return null;
}

async function loadDataUrl(relativePath: string, mime: string): Promise<string | null> {
  try {
    const p = resolve(process.cwd(), 'public', relativePath);
    const buf = await readFile(p);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

const ACCENT = '#D2E369';
const ACCENT_DIM = 'rgba(210,227,105,0.65)';
const BORDER = 'rgba(210,227,105,0.35)';

const TONE = {
  positive: '#34d399',
  warning: '#fb923c',
  amber: '#fbbf24',
  negative: '#ef4444',
  info: '#60a5fa',
} as const;

interface OgPill {
  label: string;
  value: string;
  tone: string;
}

/**
 * Map the pill at `index` (using the canonical 4-pill order from the
 * prompt) and its status keyword to a short OG-friendly value + tone.
 * Falls back to the supplied default if Gemini returned an unexpected
 * shape.
 */
function pillFor(index: number, status: StatusValue | undefined, fallback: OgPill): OgPill {
  switch (index) {
    case 0:
      // "Legal in the UK?" — legal | partial | not-legal
      if (status === 'legal') return { label: 'Legal in UK', value: 'Yes', tone: TONE.positive };
      if (status === 'partial') return { label: 'Legal in UK', value: 'Partial', tone: TONE.warning };
      if (status === 'not-legal') return { label: 'Legal in UK', value: 'No', tone: TONE.negative };
      return fallback;
    case 1:
      // "Products on shelves?" — yes | soon | no
      if (status === 'yes') return { label: 'On UK shelves', value: 'Yes', tone: TONE.positive };
      if (status === 'soon') return { label: 'On UK shelves', value: 'Soon', tone: TONE.amber };
      if (status === 'no') return { label: 'On UK shelves', value: 'No', tone: TONE.negative };
      return fallback;
    case 2:
      // "SEG export payments?" — yes | partial | no
      if (status === 'yes') return { label: 'SEG payments', value: 'Yes', tone: TONE.positive };
      if (status === 'partial') return { label: 'SEG payments', value: 'Partial', tone: TONE.warning };
      if (status === 'no') return { label: 'SEG payments', value: 'Not yet', tone: TONE.amber };
      return fallback;
    case 3:
      // "DNO notification needed?" — yes | no
      if (status === 'yes') return { label: 'DNO notify', value: 'Required', tone: TONE.info };
      if (status === 'no') return { label: 'DNO notify', value: 'Not needed', tone: TONE.positive };
      return fallback;
    default:
      return fallback;
  }
}

const FALLBACK_PILLS: OgPill[] = [
  { label: 'Legal in UK', value: 'Partial', tone: TONE.warning },
  { label: 'On UK shelves', value: 'Yes', tone: TONE.positive },
  { label: 'SEG payments', value: 'Not yet', tone: TONE.amber },
  { label: 'DNO notify', value: 'Required', tone: TONE.info },
];

const FALLBACK_TAGLINE =
  'An impartial guide to plug-in solar in the UK in 2026 — legalised under BS 7671 Amendment 4, with kits from £400.';

function buildPillsFromCache(data: PlugInSolarLiveData | null): OgPill[] {
  const pills = data?.statusDashboard ?? [];
  return FALLBACK_PILLS.map((fb, i) => {
    const live: StatusPill | undefined = pills[i];
    return pillFor(i, live?.status, fb);
  });
}

function buildTaglineFromCache(data: PlugInSolarLiveData | null): string {
  // Prefer the AI's TL;DR as the headline tagline (it's already concise
  // and current-as-of-today). Trim to a length that won't overflow.
  const tldr = data?.tldr?.trim();
  if (tldr && tldr.length >= 30) {
    return tldr.length > 220 ? tldr.slice(0, 217).trimEnd() + '…' : tldr;
  }
  return FALLBACK_TAGLINE;
}

export default async function OgImage() {
  const [bgUrl, logoUrl, data] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    readMostRecent(),
  ]);

  const pills = buildPillsFromCache(data);
  const tagline = buildTaglineFromCache(data);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
          background: '#030712',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {bgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgUrl}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(3,7,18,0.92) 0%, rgba(15,23,42,0.85) 50%, rgba(3,7,18,0.94) 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '48px 60px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              <span style={{ fontSize: 50, fontWeight: 800, color: ACCENT, textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                UK Plug-in Solar Guide
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={300} height={52} style={{ objectFit: 'contain' }} />
            ) : null}
          </div>

          <div style={{ display: 'flex', marginBottom: '14px' }}>
            <span style={{ fontSize: 20, color: ACCENT_DIM, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Updated daily · Legal status · Kits · Payback · Batteries
            </span>
          </div>

          <div style={{ display: 'flex', marginBottom: '24px' }}>
            <span style={{ fontSize: 22, color: '#e2e8f0', lineHeight: 1.35, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              {tagline}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '14px',
              background: 'rgba(3,7,18,0.88)',
              border: '1px solid ' + BORDER,
              borderRadius: 16,
              padding: '18px 24px',
            }}
          >
            {pills.map((p, i) => (
              <div
                key={p.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  paddingLeft: i > 0 ? 20 : 0,
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{p.label}</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: p.tone }}>{p.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: ACCENT }}>
                Daily-updated guide · interactive payback &amp; battery calculators →
              </span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>4billionyearson.org/plug-in-solar-uk</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
