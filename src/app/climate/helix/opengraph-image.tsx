import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Climate Helix – Year-on-Year Temperature Spiral | 4 Billion Years On';
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

const GOLD = '#D0A65E';
const GOLD_DIM = 'rgba(208,166,94,0.7)';
const GOLD_BORDER = 'rgba(208,166,94,0.3)';

export default async function OgImage() {
  const [helixUrl, logoUrl] = await Promise.all([
    loadDataUrl('Climate Helix.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#030712',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Left content pane */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: helixUrl ? '58%' : '100%',
            height: '100%',
            padding: '48px 48px 40px 60px',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', marginBottom: '28px' }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={280} height={50} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 20, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          {/* Title */}
          <div style={{ display: 'flex', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: 60,
                fontWeight: 800,
                color: GOLD,
                textShadow: '0 2px 12px rgba(0,0,0,0.9)',
                lineHeight: 1.05,
                letterSpacing: '-1px',
              }}
            >
              Climate Helix
            </span>
          </div>

          {/* Subtitle */}
          <div style={{ display: 'flex', marginBottom: '20px' }}>
            <span style={{ fontSize: 20, color: GOLD_DIM, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
              Year-on-Year Temperature Spiral
            </span>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', marginBottom: '28px' }}>
            <span style={{ fontSize: 22, color: '#e2e8f0', lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              Every monthly temperature reading since records began, wound into a radial spiral.
              Each loop is one year — the warming trend emerges from the tightening coil.
            </span>
          </div>

          {/* Feature panel */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(3,7,18,0.85)',
              border: '1px solid ' + GOLD_BORDER,
              borderRadius: 14,
              padding: '14px 20px',
              marginTop: 'auto',
            }}
          >
            {[
              ['🌍', 'Global Land + Ocean'],
              ['📍', '300+ countries & regions'],
              ['📅', '150+ years of data'],
              ['🎯', 'Paris 1.5 °C / 2 °C rings'],
              ['▶', 'Animated playback'],
            ].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 16, color: '#FFF5E7', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: helix screenshot */}
        {helixUrl ? (
          <div
            style={{
              display: 'flex',
              width: '42%',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* Fade-left gradient so text doesn't clash */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '60px',
                display: 'flex',
                background: 'linear-gradient(to right, #030712, transparent)',
                zIndex: 1,
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={helixUrl}
              alt=""
              width={504}
              height={630}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}
