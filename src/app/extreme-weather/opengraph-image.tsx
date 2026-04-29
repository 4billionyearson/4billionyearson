import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCached } from '@/lib/climate/redis';

export const runtime = 'nodejs';
export const alt = 'Extreme Weather Tracker – Live Alerts & Historical Trends | 4 Billion Years On';
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

type GDACSEvent = {
  type: string;
  alertLevel: string;
};

// Read from the same Redis cache key used by the API route - fast and reliable.
async function getGDACSFromCache(): Promise<GDACSEvent[]> {
  try {
    const events = await getCached<GDACSEvent[]>('climate:extreme-weather:gdacs:v1');
    return events ?? [];
  } catch {
    return [];
  }
}

const EVENT_ICONS: Record<string, string> = {
  FL: '🌊',
  WF: '🔥',
  TC: '🌀',
  DR: '☀️',
};
const EVENT_LABELS: Record<string, string> = {
  FL: 'Floods',
  WF: 'Wildfires',
  TC: 'Cyclones',
  DR: 'Droughts',
};

export default async function OgImage() {
  const [bgUrl, logoUrl, events] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    getGDACSFromCache(),
  ]);

  // Alert-level counts
  const red = events.filter((e) => e.alertLevel === 'Red').length;
  const orange = events.filter((e) => e.alertLevel === 'Orange').length;
  const green = events.filter((e) => e.alertLevel === 'Green').length;
  const total = events.length;

  // Per-type breakdown (top 4 types)
  const typeCounts: Record<string, number> = {};
  for (const e of events) typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const hasRed = red > 0;
  const hasOrange = orange > 0;
  const alertBorderColor = hasRed
    ? 'rgba(239,68,68,0.55)'
    : hasOrange
      ? 'rgba(251,146,60,0.55)'
      : 'rgba(208,166,94,0.4)';
  const alertAccent = hasRed ? '#f87171' : hasOrange ? '#fb923c' : '#D0A65E';

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
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
          />
        ) : null}

        {/* Overlay gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(3,7,18,0.90) 0%, rgba(15,23,42,0.82) 55%, rgba(3,7,18,0.94) 100%)',
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
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: 68 }}>⛈️</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: '#D0A65E', textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                  Extreme Weather
                </span>
                <span style={{ fontSize: 22, color: '#94a3b8', marginTop: 2 }}>
                  Live alerts &amp; historical trends worldwide
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

          {/* Live alerts panel */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              background: 'rgba(3,7,18,0.88)',
              border: `1px solid ${alertBorderColor}`,
              borderRadius: 18,
              padding: '20px 26px',
              marginBottom: '14px',
            }}
          >
            {/* Total active */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 14, color: alertAccent, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                Active GDACS alerts
              </span>
              <span style={{ fontSize: 60, fontWeight: 800, color: '#FFF5E7', marginTop: 2, lineHeight: 1 }}>
                {total > 0 ? total : '—'}
              </span>
              <span style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>last 12 months · EU/JRC</span>
            </div>

            {/* Red alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                🔴 Red alert
              </span>
              <span style={{ fontSize: 60, fontWeight: 800, color: red > 0 ? '#fca5a5' : '#6b7280', marginTop: 2, lineHeight: 1 }}>
                {red}
              </span>
              <span style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>highest severity</span>
            </div>

            {/* Amber alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#fb923c', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                🟠 Amber alert
              </span>
              <span style={{ fontSize: 60, fontWeight: 800, color: orange > 0 ? '#fdba74' : '#6b7280', marginTop: 2, lineHeight: 1 }}>
                {orange}
              </span>
              <span style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>significant events</span>
            </div>

            {/* Green alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#34d399', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                🟢 Green alert
              </span>
              <span style={{ fontSize: 60, fontWeight: 800, color: green > 0 ? '#6ee7b7' : '#6b7280', marginTop: 2, lineHeight: 1 }}>
                {green}
              </span>
              <span style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>lower severity</span>
            </div>
          </div>

          {/* Per-type breakdown + historical context pill row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            {/* Event type chips */}
            {topTypes.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap', alignContent: 'flex-start' }}>
                {topTypes.map(([type, count]) => (
                  <div
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(208,166,94,0.15)',
                      border: '1px solid rgba(208,166,94,0.45)',
                      borderRadius: '999px',
                      padding: '7px 18px',
                      fontSize: 20,
                      color: '#E8C97A',
                      fontWeight: 700,
                    }}
                  >
                    <span>{EVENT_ICONS[type] ?? '⚡'}</span>
                    <span>{count} {EVENT_LABELS[type] ?? type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Historical context */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(3,7,18,0.80)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 14,
                padding: '12px 20px',
                minWidth: 280,
              }}
            >
              <span style={{ fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>
                Historical trends (EM-DAT)
              </span>
              <span style={{ fontSize: 16, color: '#e2e8f0', lineHeight: 1.5 }}>
                📈 Climate disasters have roughly doubled since the 1980s
              </span>
              <span style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                Floods · Wildfires · Droughts · Storms since 1960
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 17, color: '#6b7280' }}>
              Sources: GDACS (EU/JRC) · EM-DAT / Our World in Data
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#D0A65E' }}>
              4billionyearson.org/extreme-weather
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
