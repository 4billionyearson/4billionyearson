import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getRegionBySlug } from '@/lib/climate/regions';

export const runtime = 'nodejs';

export const alt = 'Climate Update';
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

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);

  if (!region) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#030712', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: 40 }}>Region not found</span>
        </div>
      ),
      { ...size }
    );
  }

  const [bgUrl, logoUrl] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
  ]);

  const sourceLabels: Record<string, string> = {
    'owid-temp': 'OWID',
    'owid-emissions': 'Emissions',
    'met-office': 'Met Office',
    'noaa-state': 'NOAA',
    'noaa-national': 'NOAA',
    'arctic-ice': 'Arctic Ice',
  };

  const sources = region.dataSources.map(s => sourceLabels[s] || s);

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
        {/* Brand background */}
        {bgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgUrl}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
        {/* Dark readability overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(3,7,18,0.84) 0%, rgba(15,23,42,0.80) 50%, rgba(3,7,18,0.92) 100%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Gold top bar */}
          <div style={{ display: 'flex', width: '100%', height: '4px', background: '#D0A65E', borderRadius: '2px', marginBottom: '40px' }} />

          {/* Emoji + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
            <span style={{ fontSize: 72 }}>{region.emoji}</span>
            <span style={{ fontSize: 56, fontWeight: 800, color: '#D0A65E' }}>
              {region.name}
            </span>
          </div>

          {/* Tagline */}
          <div style={{ display: 'flex', marginBottom: '36px' }}>
            <span style={{ fontSize: 28, color: '#cbd5e1', lineHeight: 1.4 }}>
              {region.tagline}
            </span>
          </div>

          {/* Data source pills */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
            {sources.map((src) => (
              <div
                key={src}
                style={{
                  display: 'flex',
                  background: 'rgba(208, 166, 94, 0.18)',
                  border: '1px solid rgba(208, 166, 94, 0.5)',
                  borderRadius: '999px',
                  padding: '8px 20px',
                  fontSize: 18,
                  color: '#E8C97A',
                }}
              >
                {src}
              </div>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ display: 'flex', flex: 1 }} />

          {/* Bottom bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 20, color: '#94a3b8', marginBottom: '4px' }}>Monthly Climate Update</span>
              <span style={{ fontSize: 22, color: '#94a3b8' }}>
                {region.type === 'uk-region'
                  ? 'Temperature · Rainfall · Sunshine · Frost'
                  : region.type === 'us-state'
                    ? 'Temperature · Precipitation'
                    : 'Temperature · Rainfall · Emissions'}
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={228} height={40} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          {/* Gold bottom bar */}
          <div style={{ display: 'flex', width: '100%', height: '4px', background: '#D0A65E', borderRadius: '2px', marginTop: '20px' }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
