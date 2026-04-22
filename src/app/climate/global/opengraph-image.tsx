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

function fmtSigned(n: number, digits = 2): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function OgImage() {
  const data = await loadSnapshot();

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
  // lastUpdated is a cache key like "2026-04-v9"; prefer generatedAt (ISO).
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
          background: 'linear-gradient(135deg, #030712 0%, #0f172a 50%, #030712 100%)',
          padding: '56px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', width: '100%', height: '4px', background: '#D0A65E', borderRadius: '2px', marginBottom: '32px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '8px' }}>
          <span style={{ fontSize: 72 }}>🌍</span>
          <span style={{ fontSize: 60, fontWeight: 800, color: '#D0A65E' }}>Global Climate Update</span>
        </div>
        <div style={{ display: 'flex', marginBottom: '32px' }}>
          <span style={{ fontSize: 26, color: '#9ca3af' }}>{lastUpdated ? `${lastUpdated} · ` : ''}Land + ocean surface temperature, GHGs, sea ice, ENSO</span>
        </div>

        {/* Stat grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Paris */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(251,146,60,0.10)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 16, padding: '20px 24px' }}>
              <span style={{ fontSize: 18, color: '#fb923c', textTransform: 'uppercase', letterSpacing: 1 }}>Paris tracker (10-yr mean)</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: vsPre != null && vsPre >= 1.5 ? '#fca5a5' : '#fed7aa', marginTop: 4 }}>
                {vsPre != null ? `${fmtSigned(vsPre, 2)}°C` : '—'}
              </span>
              <span style={{ fontSize: 16, color: '#9ca3af' }}>above pre-industrial</span>
            </div>
            {/* Latest month */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 16, padding: '20px 24px' }}>
              <span style={{ fontSize: 18, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1 }}>Latest month</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#fecaca', marginTop: 4 }}>
                {latestMonthDiff != null ? `${fmtSigned(latestMonthDiff, 2)}°C` : '—'}
              </span>
              <span style={{ fontSize: 16, color: '#9ca3af' }}>{latestMonthLabel} vs 1961–1990</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* CO2 */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: 16, padding: '20px 24px' }}>
              <span style={{ fontSize: 18, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1 }}>CO2 concentration</span>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#ddd6fe', marginTop: 4 }}>
                {co2 != null ? `${co2.toFixed(1)} ppm` : '—'}
              </span>
              <span style={{ fontSize: 14, color: '#9ca3af' }}>NOAA GML</span>
            </div>
            {/* Sea ice */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 16, padding: '20px 24px' }}>
              <span style={{ fontSize: 18, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1 }}>Global sea ice</span>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#bae6fd', marginTop: 4 }}>
                {seaIce ? `${seaIce.latest.extent.toFixed(1)} Mkm²` : '—'}
              </span>
              <span style={{ fontSize: 14, color: '#9ca3af' }}>
                {seaIce ? `${fmtSigned(seaIce.anomaly, 1)} vs 1991–2020 · ${MONTH_NAMES[seaIce.latest.month]} ${seaIce.latest.year}` : ''}
              </span>
            </div>
            {/* ENSO */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(125,211,252,0.10)', border: '1px solid rgba(125,211,252,0.35)', borderRadius: 16, padding: '20px 24px' }}>
              <span style={{ fontSize: 18, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1 }}>ENSO</span>
              <span style={{ fontSize: 44, fontWeight: 800, color: enso?.state === 'El Niño' ? '#fda4af' : enso?.state === 'La Niña' ? '#93c5fd' : '#e5e7eb', marginTop: 4 }}>
                {enso?.state ?? '—'}
              </span>
              <span style={{ fontSize: 14, color: '#9ca3af' }}>
                {enso ? `${fmtSigned(enso.anomaly, 2)}°C · ${enso.season} ${enso.seasonYear}` : ''}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, color: '#6b7280' }}>Sources: NOAA · NSIDC · NOAA CPC · NOAA GML</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#e5e7eb', marginTop: 4 }}>4billionyearson.org/climate/global</span>
          </div>
          <span style={{ fontSize: 16, color: '#6b7280' }}>Updated monthly</span>
        </div>

        <div style={{ display: 'flex', width: '100%', height: '4px', background: '#D0A65E', borderRadius: '2px', marginTop: '20px' }} />
      </div>
    ),
    { ...size }
  );
}
