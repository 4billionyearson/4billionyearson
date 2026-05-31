import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
// OG images change at most once a month (when climate data refreshes).
// Cache on Vercel's CDN for 24 h; allow stale-while-revalidate for a further 24 h.
export const revalidate = 86400;

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regionName = searchParams.get('name') || 'Global Land + Ocean';
  const isGlobal = !searchParams.get('slug') || searchParams.get('slug') === 'global';

  const [bgUrl, helixUrl, logoUrl] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
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
          position: 'relative',
          background: '#030712',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Site background image */}
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

        {/* Dark overlay gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(3,7,18,0.90) 0%, rgba(15,23,42,0.82) 50%, rgba(3,7,18,0.94) 100%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: '65%',
            height: '100%',
            padding: '40px 48px 36px 60px',
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', marginBottom: '20px' }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={240} height={43} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          {/* Region name (prominent, above the title) */}
          {!isGlobal && (
            <div style={{ display: 'flex', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#FFF5E7',
                  textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                  letterSpacing: '-0.5px',
                }}
              >
                {regionName}
              </span>
            </div>
          )}

          {/* Title */}
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: isGlobal ? 60 : 50,
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
          <div style={{ display: 'flex', marginBottom: '16px' }}>
            <span style={{ fontSize: 18, color: GOLD_DIM, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
              Year-on-Year Temperature Spiral
            </span>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', marginBottom: '20px' }}>
            <span style={{ fontSize: isGlobal ? 22 : 19, color: '#e2e8f0', lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              {isGlobal
                ? 'Every monthly temperature reading since records began, wound into a radial spiral. Each loop is one year — the warming trend emerges from the tightening coil.'
                : `Every monthly temperature reading for ${regionName} since records began, wound into a radial spiral. Watch the warming trend emerge over 150+ years.`}
            </span>
          </div>

          {/* Feature panel */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
              background: 'rgba(3,7,18,0.85)',
              border: '1px solid ' + GOLD_BORDER,
              borderRadius: 14,
              padding: '12px 18px',
              marginTop: 'auto',
            }}
          >
            {(isGlobal
              ? [
                  ['🌍', 'Global Land + Ocean'],
                  ['📍', '300+ countries & regions'],
                  ['📅', '150+ years of data'],
                  ['🎯', 'Paris 1.5 °C / 2 °C rings'],
                  ['▶', 'Animated playback'],
                ]
              : [
                  ['📍', regionName],
                  ['📅', '150+ years of data'],
                  ['🎯', 'Paris 1.5 °C / 2 °C rings'],
                  ['▶', 'Animated playback'],
                  ['🌍', 'View 300+ regions at 4billionyearson.org'],
                ]
            ).map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 15, color: '#FFF5E7', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Helix image — bottom-right */}
        {helixUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={helixUrl}
            alt=""
            width={420}
            height={420}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 420,
              height: 420,
              objectFit: 'contain',
              objectPosition: 'bottom right',
              zIndex: 1,
            }}
          />
        ) : null}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
