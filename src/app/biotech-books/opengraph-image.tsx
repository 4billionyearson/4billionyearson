import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Best Biotechnology Books | 4 Billion Years On';
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

const TOPICS = [
  { icon: '🧬', label: 'Gene editing & CRISPR' },
  { icon: '💊', label: 'Future of medicine' },
  { icon: '🔬', label: 'Synthetic biology' },
  { icon: '🧫', label: 'Cell & gene therapy' },
  { icon: '🦠', label: 'Genomics' },
  { icon: '🤝', label: 'Bioethics' },
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
          {/* Gold title bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#D0A65E',
              padding: '28px 52px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <span style={{ fontSize: 58 }}>🧬</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: '#1e2a3a', lineHeight: 1.05 }}>
                  Biotechnology Books
                </span>
                <span style={{ fontSize: 22, color: '#3d4f62', marginTop: 4, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
                  📖  Recommended Reading
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '32px 52px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 26, color: '#e2e8f0', lineHeight: 1.45, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              From CRISPR pioneers to bioethicists — books on gene editing, synthetic biology, and the future of medicine.
            </span>

            {/* Topics + logo row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {TOPICS.map((t) => (
                  <div
                    key={t.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      background: 'rgba(208,166,94,0.15)',
                      border: '1px solid rgba(208,166,94,0.45)',
                      borderRadius: '999px',
                      padding: '6px 16px',
                      fontSize: 19,
                      color: '#E8C97A',
                      fontWeight: 600,
                    }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </div>
                ))}
              </div>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="4 Billion Years On" width={300} height={52} style={{ objectFit: 'contain', flexShrink: 0, marginLeft: 24 }} />
              ) : (
                <span style={{ fontSize: 22, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
