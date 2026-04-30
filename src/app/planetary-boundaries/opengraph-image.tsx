import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Live Planetary Boundaries – The Nine Factors Threatening Earth | 4 Billion Years On';
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

const ACCENT = '#a78bfa';
const ACCENT_DIM = 'rgba(167,139,250,0.65)';
const BORDER = 'rgba(167,139,250,0.30)';

// The 9 planetary boundaries with known status (Stockholm Resilience Centre 2023)
const BOUNDARIES = [
  { name: 'Climate Change', status: 'Exceeded', color: '#fca5a5' },
  { name: 'Biosphere Integrity', status: 'Exceeded', color: '#fca5a5' },
  { name: 'Land System Change', status: 'Exceeded', color: '#fca5a5' },
  { name: 'Freshwater Change', status: 'Exceeded', color: '#fca5a5' },
  { name: 'Biogeochem. Flows', status: 'Exceeded', color: '#fca5a5' },
  { name: 'Novel Entities', status: 'Exceeded', color: '#fca5a5' },
  { name: 'Ocean Acidification', status: 'Increasing risk', color: '#fdba74' },
  { name: 'Atmospheric Aerosols', status: 'Uncertain', color: '#fcd34d' },
  { name: 'Ozone Layer', status: 'Safe zone', color: '#6ee7b7' },
];

export default async function OgImage() {
  const [bgUrl, logoUrl] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
  ]);

  const exceeded = BOUNDARIES.filter((b) => b.status === 'Exceeded').length;

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
              <span style={{ fontSize: 64 }}>🌐</span>
              <span style={{ fontSize: 46, fontWeight: 800, color: ACCENT, textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                Planetary Boundaries
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={320} height={56} style={{ objectFit: 'contain' }} />
            ) : null}
          </div>

          <div style={{ display: 'flex', marginBottom: '16px' }}>
            <span style={{ fontSize: 20, color: ACCENT_DIM, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              9 Earth-System Limits · Stockholm Resilience Centre
            </span>
          </div>

          <div style={{ display: 'flex', marginBottom: '18px', gap: '24px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#fca5a5', lineHeight: 1 }}>{exceeded}</span>
              <span style={{ fontSize: 16, color: '#94a3b8', marginTop: 4 }}>boundaries exceeded</span>
            </div>
            <span style={{ fontSize: 22, color: '#e2e8f0', lineHeight: 1.35, textShadow: '0 2px 8px rgba(0,0,0,0.9)', flex: 1 }}>
              How close is humanity to breaching the nine critical limits that define a safe operating space for life on Earth?
            </span>
          </div>

          {/* 9 boundaries grid */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              background: 'rgba(3,7,18,0.88)',
              border: '1px solid ' + BORDER,
              borderRadius: 16,
              padding: '16px 20px',
            }}
          >
            {BOUNDARIES.map((b) => (
              <div
                key={b.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: '6px 12px',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, display: 'flex', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{b.name}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: ACCENT }}>
                Track Earth's {BOUNDARIES.length} critical limits · interactive data →
              </span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>4billionyearson.org/planetary-boundaries</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
