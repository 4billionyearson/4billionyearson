import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = '4 Billion Years On - Climate, Energy, AI & Biotech Data';
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

async function loadLiveStats(): Promise<{ co2: number | null; tempAnomaly: number | null; tempYear: number | null }> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const d = JSON.parse(await readFile(p, 'utf8'));
    const co2 = d?.ghgStats?.co2?.latest?.value ?? null;
    const latest = d?.yearlyData?.[d.yearlyData.length - 1] ?? null;
    return { co2, tempAnomaly: latest?.anomaly ?? null, tempYear: latest?.year ?? null };
  } catch {
    return { co2: null, tempAnomaly: null, tempYear: null };
  }
}

const PILLARS = [
  {
    icon: '🌍',
    name: 'Climate',
    accent: '#D0A65E',
    border: 'rgba(208,166,94,0.35)',
    features: ['200+ regions · monthly', 'Anomalies · rankings'],
  },
  {
    icon: '⚡',
    name: 'Energy',
    accent: '#D2E369',
    border: 'rgba(210,227,105,0.35)',
    features: ['Solar · wind · hydro', 'Country comparisons'],
  },
  {
    icon: '🤖',
    name: 'AI',
    accent: '#88DDFC',
    border: 'rgba(136,221,252,0.35)',
    features: ['Investment · compute', 'Adoption · regulation'],
  },
  {
    icon: '🧬',
    name: 'Biotech',
    accent: '#D26742',
    border: 'rgba(210,103,66,0.35)',
    features: ['Genome costs · CRISPR', 'Clinical trials'],
  },
];

export default async function OgImage() {
  const [bgUrl, logoUrl, stats] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    loadLiveStats(),
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
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(3,7,18,0.90) 0%, rgba(15,23,42,0.82) 50%, rgba(3,7,18,0.94) 100%)',
          }}
        />

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
          {/* Header: logo left + live stat right */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="4 Billion Years On" width={420} height={74} style={{ objectFit: 'contain', objectPosition: 'left center' }} />
              ) : (
                <span style={{ fontSize: 42, fontWeight: 800, color: '#FFF5E7' }}>4 Billion Years On</span>
              )}
              <span style={{ fontSize: 22, color: '#D0A65E', fontWeight: 600, marginTop: 4 }}>
                A living dashboard for the forces reshaping the world
              </span>
            </div>

            {/* Live stats pill */}
            {stats.co2 != null && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(3,7,18,0.88)',
                  border: '1px solid rgba(208,166,94,0.35)',
                  borderRadius: 14,
                  padding: '12px 20px',
                  alignItems: 'flex-end',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: 13, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1 }}>CO₂ now</span>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#ddd6fe' }}>{stats.co2.toFixed(1)} ppm</span>
                </div>
                {stats.tempAnomaly != null && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: 13, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 1 }}>{stats.tempYear} anomaly</span>
                    <span style={{ fontSize: 26, fontWeight: 800, color: '#fecaca' }}>
                      {stats.tempAnomaly > 0 ? '+' : ''}{stats.tempAnomaly.toFixed(2)}°C
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4 pillar tiles */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
            {PILLARS.map((p) => (
              <div
                key={p.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  background: 'rgba(3,7,18,0.88)',
                  border: '1px solid ' + p.border,
                  borderRadius: 14,
                  padding: '16px 18px',
                  borderTop: '3px solid ' + p.accent,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: 28 }}>{p.icon}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: p.accent }}>{p.name}</span>
                </div>
                <span style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{p.features[0]}</span>
                <span style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{p.features[1]}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          {/* CTA footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 17, color: '#6b7280' }}>
              Interactive data · plain-English explainers · updated monthly
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: '#D0A65E' }}>
                Explore all four dashboards →
              </span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>4billionyearson.org</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
