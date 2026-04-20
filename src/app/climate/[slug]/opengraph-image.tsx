import { ImageResponse } from 'next/og';
import { getRegionBySlug } from '@/lib/climate/regions';

export const runtime = 'edge';

export const alt = 'Climate Update';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
          background: 'linear-gradient(135deg, #030712 0%, #0f172a 50%, #030712 100%)',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
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
        <div style={{ display: 'flex', marginBottom: '40px' }}>
          <span style={{ fontSize: 28, color: '#9ca3af', lineHeight: 1.4 }}>
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
                background: 'rgba(208, 166, 94, 0.15)',
                border: '1px solid rgba(208, 166, 94, 0.4)',
                borderRadius: '999px',
                padding: '8px 20px',
                fontSize: 18,
                color: '#D0A65E',
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
            <span style={{ fontSize: 20, color: '#6b7280', marginBottom: '4px' }}>Monthly Climate Update</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 16, color: '#6b7280' }}>
              {region.type === 'uk-region'
                ? 'Temperature · Rainfall · Sunshine · Frost'
                : region.type === 'us-state'
                  ? 'Temperature · Precipitation'
                  : 'Temperature · Rainfall · Emissions'}
            </span>
          </div>
        </div>

        {/* Gold bottom bar */}
        <div style={{ display: 'flex', width: '100%', height: '4px', background: '#D0A65E', borderRadius: '2px', marginTop: '20px' }} />
      </div>
    ),
    { ...size }
  );
}
