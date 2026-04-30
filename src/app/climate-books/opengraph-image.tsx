import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Best Climate Change Books | 4 Billion Years On';
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

const ACCENT = '#D0A65E';
const ACCENT_DIM = 'rgba(208,166,94,0.65)';
const BORDER = 'rgba(208,166,94,0.35)';

const FEATURED = [
  { title: 'Not the End of the World', author: 'Hannah Ritchie' },
  { title: 'How to Avoid a Climate Disaster', author: 'Bill Gates' },
  { title: 'The Ministry for the Future', author: 'Kim Stanley Robinson' },
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
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(3,7,18,0.88) 0%, rgba(15,23,42,0.82) 50%, rgba(3,7,18,0.92) 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '52px 60px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Top row: icon + title | logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <svg width="68" height="68" viewBox="0 0 24 24" fill="none">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 58, fontWeight: 800, color: ACCENT, textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                Climate Books
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={340} height={60} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          <div style={{ display: 'flex', marginBottom: '24px' }}>
            <span style={{ fontSize: 22, color: ACCENT_DIM, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Recommended Reading
            </span>
          </div>

          <div style={{ display: 'flex', marginBottom: '28px' }}>
            <span style={{ fontSize: 26, color: '#e2e8f0', lineHeight: 1.35, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              Global warming, carbon emissions, sea level and the energy transition - from leading climate scientists and bestselling authors.
            </span>
          </div>

          {/* Featured books panel */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'rgba(3,7,18,0.88)',
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: '18px 24px',
            }}
          >
            {FEATURED.map((b, i) => (
              <div key={b.title} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: 15, color: ACCENT, fontWeight: 700, minWidth: 22 }}>{i + 1}.</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{b.title}</span>
                <span style={{ fontSize: 18, color: '#94a3b8' }}>- {b.author}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
        {/* Background image */}
        {bgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgUrl}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }}
          />
        ) : null}

        {/* Dark gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(3,7,18,0.93) 0%, rgba(15,23,42,0.85) 55%, rgba(3,7,18,0.96) 100%)',
          }}
        />

        {/* Content — zIndex:1 ensures it renders above absolute layers */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '0px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Coloured title bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: HEADER_BG,
              padding: '24px 48px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: 54 }}>🌍</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 46, fontWeight: 800, color: HEADER_TEXT, lineHeight: 1.05 }}>
                  Climate Change Books
                </span>
                <span style={{ fontSize: 20, color: HEADER_SUB, marginTop: 4, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
                  Recommended Reading
                </span>
              </div>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={260} height={46} style={{ objectFit: 'contain', flexShrink: 0, marginLeft: 20 }} />
            ) : (
              <span style={{ fontSize: 20, fontWeight: 700, color: HEADER_TEXT }}>4billionyearson.org</span>
            )}
          </div>

          {/* Body */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '30px 48px 36px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 25, color: '#e2e8f0', lineHeight: 1.45, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              From leading climate scientists to policy experts - books on global warming, the environment, and our response.
            </span>

            {/* Topic chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {TOPICS.map((t) => (
                <div
                  key={t.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    background: CHIP_BG,
                    border: `1px solid ${CHIP_BORDER}`,
                    borderRadius: '999px',
                    padding: '6px 16px',
                    fontSize: 19,
                    color: CHIP_TEXT,
                    fontWeight: 600,
                  }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
