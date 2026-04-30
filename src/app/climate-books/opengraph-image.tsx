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

// Climate page colours: #D0A65E bar, #FFF5E7 title text
const HEADER_BG = '#D0A65E';
const HEADER_TEXT = '#FFF5E7';
const HEADER_SUB = 'rgba(255,245,231,0.75)';
const CHIP_BG = 'rgba(208,166,94,0.15)';
const CHIP_BORDER = 'rgba(208,166,94,0.45)';
const CHIP_TEXT = '#D0A65E';

const TOPICS = [
  { icon: '🌍', label: 'Global warming' },
  { icon: '📉', label: 'Carbon emissions' },
  { icon: '🌊', label: 'Sea level & ice' },
  { icon: '🌿', label: 'Nature-based solutions' },
  { icon: '⚡', label: 'Clean energy transition' },
  { icon: '🤝', label: 'Paris Agreement' },
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
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#030712',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
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
