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

// Concentric ring colours cold→warm matching the helix's own palette
const RING_COLORS = [
  '#7DD3FC', // ice blue  (earliest/coldest years)
  '#67E8F9', // cyan
  '#86EFAC', // spring green
  '#BEF264', // yellow-green
  '#FACC15', // warm yellow
  '#F59E0B', // amber
  '#F97316', // orange
  '#EF4444', // hot red  (latest/warmest years)
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
        {/* Background image */}
        {bgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgUrl}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }}
          />
        ) : null}

        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(3,7,18,0.92) 0%, rgba(11,14,22,0.88) 60%, rgba(3,7,18,0.95) 100%)',
          }}
        />

        {/* Content layer */}
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
          {/* Top row: spiral icon + title | logo */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
              {/* Helix rings icon */}
              <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
                {RING_COLORS.map((col, i) => {
                  const r = 8 + i * 9;
                  return (
                    <circle
                      key={i}
                      cx="45"
                      cy="45"
                      r={r}
                      stroke={col}
                      strokeWidth={i === RING_COLORS.length - 1 ? 3 : 2}
                      strokeOpacity={0.75 + i * 0.033}
                      fill="none"
                    />
                  );
                })}
                {/* 12 radial tick marks (months) */}
                {Array.from({ length: 12 }, (_, i) => {
                  const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
                  const inner = 6;
                  const outer = 10;
                  const x1 = 45 + Math.cos(ang) * inner;
                  const y1 = 45 + Math.sin(ang) * inner;
                  const x2 = 45 + Math.cos(ang) * outer;
                  const y2 = 45 + Math.sin(ang) * outer;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />;
                })}
              </svg>
              <span
                style={{
                  fontSize: 62,
                  fontWeight: 800,
                  color: GOLD,
                  textShadow: '0 2px 12px rgba(0,0,0,0.9)',
                  lineHeight: 1.0,
                  letterSpacing: '-1px',
                }}
              >
                Climate Helix
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={340} height={60} style={{ objectFit: 'contain', marginTop: '8px' }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          {/* Subtitle */}
          <div style={{ display: 'flex', marginBottom: '18px' }}>
            <span style={{ fontSize: 22, color: GOLD_DIM, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
              Year-on-Year Temperature Spiral
            </span>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', marginBottom: '28px', maxWidth: '800px' }}>
            <span style={{ fontSize: 26, color: '#e2e8f0', lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              Every monthly temperature reading since records began, wound into a radial spiral.
              Each loop is one year — the warming trend emerges from the tightening coil.
            </span>
          </div>

          {/* Feature panel */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '16px',
              background: 'rgba(3,7,18,0.85)',
              border: '1px solid ' + GOLD_BORDER,
              borderRadius: 16,
              padding: '18px 24px',
              marginTop: 'auto',
            }}
          >
            {[
              { icon: '🌍', label: 'Global Land + Ocean' },
              { icon: '📍', label: '300+ countries & regions' },
              { icon: '📅', label: '150+ years of data' },
              { icon: '🎯', label: 'Paris 1.5 °C / 2 °C rings' },
              { icon: '▶', label: 'Animated playback' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1,
                  background: 'rgba(208,166,94,0.07)',
                  border: '1px solid rgba(208,166,94,0.18)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontSize: 18, color: '#FFF5E7', fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
