import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Best Renewable Energy Books | 4 Billion Years On';
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
  { icon: '☀️', label: 'Solar energy' },
  { icon: '💨', label: 'Wind power' },
  { icon: '🔋', label: 'Energy storage' },
  { icon: '🏭', label: 'Decarbonisation' },
  { icon: '🌐', label: 'Global energy transition' },
  { icon: '🎯', label: 'Net zero pathways' },
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
            background: 'linear-gradient(135deg, rgba(3,7,18,0.92) 0%, rgba(15,23,42,0.82) 55%, rgba(3,7,18,0.95) 100%)',
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
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: 72 }}>⚡</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: '#D0A65E', textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                  Best Energy Books
                </span>
                <span style={{ fontSize: 22, color: '#94a3b8', marginTop: 4 }}>
                  Curated reading list · 4 Billion Years On
                </span>
              </div>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={320} height={56} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          {/* Description */}
          <div style={{ display: 'flex', marginBottom: '28px' }}>
            <span style={{ fontSize: 26, color: '#e2e8f0', lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              From solar pioneers to energy economists — books on renewables, the clean energy transition, and net zero.
            </span>
          </div>

          {/* Topics panel */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'rgba(3,7,18,0.80)',
              border: '1px solid rgba(208,166,94,0.35)',
              borderRadius: 18,
              padding: '22px 28px',
            }}
          >
            {TOPICS.map((t) => (
              <div
                key={t.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(208,166,94,0.12)',
                  border: '1px solid rgba(208,166,94,0.40)',
                  borderRadius: '999px',
                  padding: '7px 18px',
                  fontSize: 20,
                  color: '#E8C97A',
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
    ),
    { ...size }
  );
}
