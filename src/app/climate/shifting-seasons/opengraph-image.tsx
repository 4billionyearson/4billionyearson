import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';

export const alt = 'Shifting Seasons — how climate change is moving the calendar';
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
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(3,7,18,0.30) 0%, rgba(3,7,18,0.65) 55%, rgba(3,7,18,0.92) 100%)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: 72 }}>🌸</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#D0A65E', textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                Shifting Seasons
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={340} height={60} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 26, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          <div style={{ display: 'flex', marginBottom: '28px' }}>
            <span style={{ fontSize: 30, color: '#e2e8f0', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              How climate change is moving spring, summer, autumn and winter
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '14px',
              background: 'rgba(3,7,18,0.88)',
              border: '1px solid rgba(208,166,94,0.4)',
              borderRadius: 18,
              padding: '22px 26px',
              marginBottom: '22px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 15, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Kyoto cherry blossoms
              </span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#fca5a5', marginTop: 2, lineHeight: 1 }}>
                ~11 days earlier
              </span>
              <span style={{ fontSize: 16, color: '#cbd5e1', marginTop: 4 }}>vs pre-1850 · record since AD 812</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
              <span style={{ fontSize: 15, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                US growing season
              </span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#fdba74', marginTop: 2, lineHeight: 1 }}>
                +15 days
              </span>
              <span style={{ fontSize: 16, color: '#cbd5e1', marginTop: 4 }}>frost-free · EPA since 1895</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
              <span style={{ fontSize: 15, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                N. Hemisphere snow
              </span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#7dd3fc', marginTop: 2, lineHeight: 1 }}>
                shrinking
              </span>
              <span style={{ fontSize: 16, color: '#cbd5e1', marginTop: 4 }}>Rutgers Global Snow Lab</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['Kyoto phenology', 'EPA Climate Indicators', 'Rutgers GSL', 'USA-NPN'].map((src) => (
              <div
                key={src}
                style={{
                  display: 'flex',
                  background: 'rgba(208, 166, 94, 0.22)',
                  border: '1px solid rgba(208, 166, 94, 0.55)',
                  borderRadius: '999px',
                  padding: '7px 18px',
                  fontSize: 17,
                  color: '#E8C97A',
                }}
              >
                {src}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 20, color: '#cbd5e1', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              4billionyearson.org/climate/shifting-seasons
            </span>
            <span style={{ fontSize: 20, color: '#94a3b8', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              Updated monthly
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
