import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';

export const alt = 'Global Climate Update — 4 Billion Years On';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadSnapshot(): Promise<any | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadDataUrl(relativePath: string, mime: string): Promise<string | null> {
  try {
    const p = resolve(process.cwd(), 'public', relativePath);
    const buf = await readFile(p);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function fmtSigned(n: number, digits = 2): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function OgImage() {
  const [data, bgUrl, logoUrl] = await Promise.all([
    loadSnapshot(),
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
  ]);

  // Pull headline figures with defensive fallbacks
  const latestYearly = data?.yearlyData?.[data.yearlyData.length - 1] ?? null;
  const rolling10yr = latestYearly?.rollingAvg ?? null;
  const pre = data?.preIndustrialBaseline ?? 13.82;
  const vsPre = rolling10yr != null ? rolling10yr - pre : null;
  const latestMonthLabel = data?.noaaStats?.landOcean?.latestMonthStats?.label ?? '—';
  const latestMonthDiff = data?.noaaStats?.landOcean?.latestMonthStats?.diff ?? null;
  const co2 = data?.ghgStats?.co2?.latest?.value ?? null;
  const seaIce = data?.seaIceStats ?? null;
  const enso = data?.enso ?? null;
  const genDate = data?.generatedAt ? new Date(data.generatedAt) : null;
  const lastUpdated = genDate && !isNaN(genDate.getTime())
    ? genDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

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
            background: 'linear-gradient(135deg, rgba(3,7,18,0.82) 0%, rgba(15,23,42,0.78) 50%, rgba(3,7,18,0.90) 100%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '48px 56px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', width: '100%', height: '4px', background: '#D0A65E', borderRadius: '2px', marginBottom: '26px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '6px' }}>
            <span style={{ fontSize: 64 }}>🌍</span>
            <span style={{ fontSize: 54, fontWeight: 800, color: '#D0A65E' }}>Global Climate Update</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '26px' }}>
            <span style={{ fontSize: 24, color: '#cbd5e1' }}>{lastUpdated ? `${lastUpdated} · ` : ''}Land + ocean temperature, GHGs, sea ice, ENSO</span>
          </div>

          {/* Stat grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.45)', borderRadius: 16, padding: '18px 22px' }}>
                <span style={{ fontSize: 17, color: '#fb923c', textTransform: 'uppercase', letterSpacing: 1 }}>Paris tracker (10-yr mean)</span>
                <span style={{ fontSize: 52, fontWeight: 800, color: vsPre != null && vsPre >= 1.5 ? '#fca5a5' : '#fed7aa', marginTop: 4 }}>
                  {vsPre != null ? `${fmtSigned(vsPre, 2)}°C` : '—'}
                </span>
                <span style={{ fontSize: 15, color: '#cbd5e1' }}>above pre-industrial</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.45)', borderRadius: 16, padding: '18px 22px' }}>
                <span style={{ fontSize: 17, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1 }}>Latest month</span>
                <span style={{ fontSize: 52, fontWeight: 800, color: '#fecaca', marginTop: 4 }}>
                  {latestMonthDiff != null ? `${fmtSigned(latestMonthDiff, 2)}°C` : '—'}
                </span>
                <span style={{ fontSize: 15, color: '#cbd5e1' }}>{latestMonthLabel} vs 1961–1990</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.45)', borderRadius: 16, padding: '18px 22px' }}>
                <span style={{ fontSize: 17, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1 }}>CO2 concentration</span>
                <span style={{ fontSize: 44, fontWeight: 800, color: '#ddd6fe', marginTop: 4 }}>
                  {co2 != null ? `${co2.toFixed(1)} ppm` : '—'}
                </span>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>NOAA GML</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.45)', borderRadius: 16, padding: '18px 22px' }}>
                <span style={{ fontSize: 17, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1 }}>Global sea ice</span>
                <span style={{ fontSize: 44, fontWeight: 800, color: '#bae6fd', marginTop: 4 }}>
                  {seaIce ? `${seaIce.latest.extent.toFixed(1)} Mkm²` : '—'}
                </span>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>
                  {seaIce ? `${fmtSigned(seaIce.anomaly, 1)} vs 1991–2020 · ${MONTH_NAMES[seaIce.latest.month]} ${seaIce.latest.year}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(125,211,252,0.12)', border: '1px solid rgba(125,211,252,0.45)', borderRadius: 16, padding: '18px 22px' }}>
                <span style={{ fontSize: 17, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1 }}>ENSO</span>
                <span style={{ fontSize: 40, fontWeight: 800, color: enso?.state === 'El Niño' ? '#fda4af' : enso?.state === 'La Niña' ? '#93c5fd' : '#e5e7eb', marginTop: 4 }}>
                  {enso?.state ?? '—'}
                </span>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>
                  {enso ? `${fmtSigned(enso.anomaly, 2)}°C · ${enso.season} ${enso.seasonYear}` : ''}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 18, color: '#94a3b8' }}>Sources: NOAA · NSIDC · NOAA CPC · NOAA GML</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#e5e7eb', marginTop: 4 }}>4billionyearson.org/climate/global</span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={228} height={40} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 16, color: '#94a3b8' }}>Updated monthly</span>
            )}
          </div>

          <div style={{ display: 'flex', width: '100%', height: '4px', background: '#D0A65E', borderRadius: '2px', marginTop: '18px' }} />
        </div>
      </div>
    ),
    { ...size }
  );
}

