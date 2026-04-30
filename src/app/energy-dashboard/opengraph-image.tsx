import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Renewable Energy Data – Solar, Wind & the Clean Transition | 4 Billion Years On';
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

const ACCENT = '#D2E369';
const ACCENT_DIM = 'rgba(210,227,105,0.65)';
const BORDER = 'rgba(210,227,105,0.35)';

const FEATURES = [
  { label: 'Solar & Wind', detail: 'Generation & capacity by country' },
  { label: 'Country Rankings', detail: 'Cleanest & highest-renewables' },
  { label: 'Energy Mix', detail: 'Share of clean vs fossil fuels' },
  { label: 'Clean Transition', detail: 'Historical trends from 2000' },
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
                <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
              </svg>
              <span style={{ fontSize: 52, fontWeight: 800, color: ACCENT, textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                Renewable Energy Data
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
              Track global and country-level solar, wind, hydro and nuclear generation — and follow the pace of the clean energy transition.
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
                Country-by-country data · interactive charts →
              </span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>4billionyearson.org/energy-dashboard</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
