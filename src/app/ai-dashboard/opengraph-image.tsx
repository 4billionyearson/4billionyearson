import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'AI Industry Data – Investment, Compute & Adoption | 4 Billion Years On';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadDataUrl(relativePath: string, mime: string): Promise<string | null> {
  try {
    const p = resolve(process.cwd(), 'public', relativePath);
    const buf = await readFile(p);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

const ACCENT = '#88DDFC';
const ACCENT_DIM = 'rgba(136,221,252,0.65)';
const BORDER = 'rgba(136,221,252,0.35)';

const FEATURES = [
  { label: 'Investment Trends', detail: 'VC & corporate AI spend by year' },
  { label: 'Compute Costs', detail: 'Training & inference price curves' },
  { label: 'Adoption Data', detail: 'Enterprise & consumer usage rates' },
  { label: 'Regulation Tracker', detail: 'Global AI governance & legislation' },
];

export default async function OgImage() {
  const [bgUrl, logoUrl] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
  ]);

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
            background: 'linear-gradient(135deg, rgba(3,7,18,0.90) 0%, rgba(15,23,42,0.82) 50%, rgba(3,7,18,0.94) 100%)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 18V5"/>
                <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/>
                <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/>
                <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/>
                <path d="M18 18a4 4 0 0 0 2-7.464"/>
                <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/>
                <path d="M6 18a4 4 0 0 1-2-7.464"/>
                <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>
              </svg>
              <span style={{ fontSize: 54, fontWeight: 800, color: ACCENT, textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                AI Industry Data
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={320} height={56} style={{ objectFit: 'contain' }} />
            ) : null}
          </div>

          <div style={{ display: 'flex', marginBottom: '20px' }}>
            <span style={{ fontSize: 20, color: ACCENT_DIM, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Interactive Charts · Updated Monthly
            </span>
          </div>

          <div style={{ display: 'flex', marginBottom: '24px' }}>
            <span style={{ fontSize: 25, color: '#e2e8f0', lineHeight: 1.35, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              Track global AI investment, compute trends, model capabilities, research output, energy use, and regulatory developments — all in one place.
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
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  paddingLeft: i > 0 ? 20 : 0,
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: ACCENT, marginBottom: 6 }}>{f.label}</span>
                <span style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.5 }}>{f.detail}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: ACCENT }}>
                Investment · compute · adoption · regulation →
              </span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>4billionyearson.org/ai-dashboard</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
