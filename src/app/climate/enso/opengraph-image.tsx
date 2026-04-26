import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';

export const alt = 'El Niño / La Niña — live ENSO tracker';
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

async function loadEnsoSnapshot(): Promise<{
  state: string;
  strength: string;
  anomaly: number;
  season: string;
  seasonYear: number;
  weeklyAnom: number | null;
  weeklyDate: string | null;
  topForecast: { label: string; phase: string; pct: number } | null;
} | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'enso.json');
    const raw = await readFile(p, 'utf8');
    const d = JSON.parse(raw);
    const oni = d.oni;
    const wk = d.weekly?.latest;
    const seasons = d.forecast?.seasons || [];
    let topForecast: { label: string; phase: string; pct: number } | null = null;
    for (const s of seasons) {
      const pLN = s.pLaNina ?? 0;
      const pNE = s.pNeutral ?? 0;
      const pEN = s.pElNino ?? 0;
      const dom = Math.max(pLN, pNE, pEN);
      if (dom > 50 && (dom === pLN || dom === pEN)) {
        topForecast = {
          label: s.label || s.season,
          phase: dom === pLN ? 'La Niña' : 'El Niño',
          pct: dom,
        };
        break;
      }
    }
    return {
      state: oni?.state || 'Neutral',
      strength: oni?.strength || '',
      anomaly: oni?.anomaly ?? 0,
      season: oni?.season || '',
      seasonYear: oni?.seasonYear || new Date().getFullYear(),
      weeklyAnom: wk?.nino34?.anom ?? null,
      weeklyDate: wk?.date || null,
      topForecast,
    };
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const [bgUrl, logoUrl, snap] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    loadEnsoSnapshot(),
  ]);

  const stateColor =
    snap?.state === 'El Niño' ? '#fca5a5' : snap?.state === 'La Niña' ? '#7dd3fc' : '#e2e8f0';
  const stateLabel = snap
    ? `${snap.state}${snap.strength ? ` · ${snap.strength}` : ''}`
    : 'ENSO tracker';
  const oniText = snap
    ? `${snap.anomaly > 0 ? '+' : ''}${snap.anomaly.toFixed(2)}°C ONI · ${snap.season} ${snap.seasonYear}`
    : 'Niño 3.4, ONI, MEI, SOI';

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
            background:
              'linear-gradient(180deg, rgba(3,7,18,0.30) 0%, rgba(3,7,18,0.70) 55%, rgba(3,7,18,0.94) 100%)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: 72 }}>🌊</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#D0A65E', textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                El Niño / La Niña
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={340} height={60} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 26, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          <div style={{ display: 'flex', marginBottom: '24px' }}>
            <span style={{ fontSize: 30, color: '#e2e8f0', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              Live ENSO tracker — Niño 3.4 SST, ONI, MEI, SOI &amp; NOAA forecast plume
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
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1.2 }}>
              <span style={{ fontSize: 15, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Current state
              </span>
              <span style={{ fontSize: 56, fontWeight: 800, color: stateColor, marginTop: 2, lineHeight: 1 }}>
                {stateLabel}
              </span>
              <span style={{ fontSize: 16, color: '#cbd5e1', marginTop: 4 }}>{oniText}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
              <span style={{ fontSize: 15, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Niño 3.4 this week
              </span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#fdba74', marginTop: 2, lineHeight: 1 }}>
                {snap?.weeklyAnom != null ? `${snap.weeklyAnom > 0 ? '+' : ''}${snap.weeklyAnom.toFixed(2)}°C` : '—'}
              </span>
              <span style={{ fontSize: 16, color: '#cbd5e1', marginTop: 4 }}>
                {snap?.weeklyDate ? `week of ${snap.weeklyDate}` : 'NOAA CPC weekly SST'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
              <span style={{ fontSize: 15, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Forecast
              </span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#fca5a5', marginTop: 2, lineHeight: 1 }}>
                {snap?.topForecast ? `${snap.topForecast.pct}%` : 'NOAA'}
              </span>
              <span style={{ fontSize: 16, color: '#cbd5e1', marginTop: 4 }}>
                {snap?.topForecast ? `${snap.topForecast.phase} by ${snap.topForecast.label.split(' ')[0]}` : 'CPC probability outlook'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['NOAA CPC ONI v5', 'Weekly Niño 3.4', 'MEI v2', 'SOI', 'CPC plume forecast'].map((src) => (
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
              4billionyearson.org/climate/enso
            </span>
            <span style={{ fontSize: 20, color: '#94a3b8', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              Updated weekly
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
