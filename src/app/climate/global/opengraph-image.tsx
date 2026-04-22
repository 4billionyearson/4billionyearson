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

  const latestYearly = data?.yearlyData?.[data.yearlyData.length - 1] ?? null;
  const rolling10yr = latestYearly?.rollingAvg ?? null;
  const pre = data?.preIndustrialBaseline ?? 13.82;
  const vsPre = rolling10yr != null ? rolling10yr - pre : null;
  const latestMonthLabel = data?.noaaStats?.landOcean?.latestMonthStats?.label ?? '—';
  const latestMonthDiff = data?.noaaStats?.landOcean?.latestMonthStats?.diff ?? null;
  const latestMonthRank = data?.noaaStats?.landOcean?.latestMonthStats?.rank ?? null;
  const latestMonthTotal = data?.noaaStats?.landOcean?.latestMonthStats?.total ?? null;
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(3,7,18,0.88) 0%, rgba(15,23,42,0.82) 50%, rgba(3,7,18,0.92) 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '44px 56px',
            position: 'relative',
          }}
        >
          {/* Top row: title (left) + logo (right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <span style={{ fontSize: 64 }}>🌍</span>
              <span style={{ fontSize: 54, fontWeight: 800, color: '#D0A65E', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>Global Climate Update</span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={340} height={60} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>
          <div style={{ display: 'flex', marginBottom: '22px' }}>
            <span style={{ fontSize: 22, color: '#cbd5e1', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              {lastUpdated ? `${lastUpdated} · ` : ''}Land + ocean temperature · GHGs · sea ice · ENSO
            </span>
          </div>

          {/* Headline stats on opaque panels so they read clearly
              over the central vertical colour strip in the background. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(3,7,18,0.88)', border: '1px solid rgba(251,146,60,0.5)', borderRadius: 16, padding: '18px 22px' }}>
                <span style={{ fontSize: 15, color: '#fb923c', textTransform: 'uppercase', letterSpacing: 1.2 }}>Paris tracker · 10-yr mean</span>
                <span style={{ fontSize: 54, fontWeight: 800, color: vsPre != null && vsPre >= 1.5 ? '#fca5a5' : '#fed7aa', marginTop: 2, lineHeight: 1 }}>
                  {vsPre != null ? `${fmtSigned(vsPre, 2)}°C` : '—'}
                </span>
                <span style={{ fontSize: 15, color: '#cbd5e1', marginTop: 4 }}>above pre-industrial (1850–1900)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(3,7,18,0.88)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 16, padding: '18px 22px' }}>
                <span style={{ fontSize: 15, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1.2 }}>{latestMonthLabel} anomaly</span>
                <span style={{ fontSize: 54, fontWeight: 800, color: '#fecaca', marginTop: 2, lineHeight: 1 }}>
                  {latestMonthDiff != null ? `${fmtSigned(latestMonthDiff, 2)}°C` : '—'}
                </span>
                <span style={{ fontSize: 15, color: '#cbd5e1', marginTop: 4 }}>
                  {latestMonthRank && latestMonthTotal ? `Rank ${latestMonthRank} of ${latestMonthTotal} · ` : ''}vs 1961–1990
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(3,7,18,0.88)', border: '1px solid rgba(168,85,247,0.5)', borderRadius: 16, padding: '16px 22px' }}>
                <span style={{ fontSize: 14, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1.2 }}>CO₂ concentration</span>
                <span style={{ fontSize: 40, fontWeight: 800, color: '#ddd6fe', marginTop: 2, lineHeight: 1 }}>
                  {co2 != null ? `${co2.toFixed(1)} ppm` : '—'}
                </span>
                <span style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>NOAA GML</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(3,7,18,0.88)', border: '1px solid rgba(56,189,248,0.5)', borderRadius: 16, padding: '16px 22px' }}>
                <span style={{ fontSize: 14, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1.2 }}>Global sea ice</span>
                <span style={{ fontSize: 40, fontWeight: 800, color: '#bae6fd', marginTop: 2, lineHeight: 1 }}>
                  {seaIce ? `${seaIce.latest.extent.toFixed(1)} Mkm²` : '—'}
                </span>
                <span style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                  {seaIce ? `${fmtSigned(seaIce.anomaly, 1)} vs 1991–2020 · ${MONTH_NAMES[seaIce.latest.month]} ${seaIce.latest.year}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(3,7,18,0.88)', border: '1px solid rgba(125,211,252,0.5)', borderRadius: 16, padding: '16px 22px' }}>
                <span style={{ fontSize: 14, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1.2 }}>ENSO state</span>
                <span style={{ fontSize: 38, fontWeight: 800, color: enso?.state === 'El Niño' ? '#fda4af' : enso?.state === 'La Niña' ? '#93c5fd' : '#e5e7eb', marginTop: 2, lineHeight: 1 }}>
                  {enso?.state ?? '—'}
                </span>
                <span style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                  {enso ? `${fmtSigned(enso.anomaly, 2)}°C · ${enso.season} ${enso.seasonYear}` : ''}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 18, color: '#94a3b8', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>Sources: NOAA · NSIDC · NOAA CPC · NOAA GML</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#e5e7eb', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>4billionyearson.org/climate/global</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
