import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Live Greenhouse Gas Tracker – CO₂, Methane & Temperature | 4 Billion Years On';
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

function fmtSigned(n: number, d = 2): string {
  return (n > 0 ? '+' : '') + n.toFixed(d);
}

async function loadGHGStats(): Promise<{
  co2: { value: number; month: number; year: number } | null;
  ch4: { value: number; month: number; year: number } | null;
  n2o: { value: number; month: number; year: number } | null;
  tempAnomaly: number | null;
  tempYear: number | null;
}> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const d = JSON.parse(await readFile(p, 'utf8'));
    const latest = d?.yearlyData?.[d.yearlyData.length - 1] ?? null;
    return {
      co2: d?.ghgStats?.co2?.latest ?? null,
      ch4: d?.ghgStats?.ch4?.latest ?? null,
      n2o: d?.ghgStats?.n2o?.latest ?? null,
      tempAnomaly: latest?.anomaly ?? null,
      tempYear: latest?.year ?? null,
    };
  } catch {
    return { co2: null, ch4: null, n2o: null, tempAnomaly: null, tempYear: null };
  }
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function OgImage() {
  const [bgUrl, logoUrl, ghg] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    loadGHGStats(),
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
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: 64 }}>🌫️</span>
              <span style={{ fontSize: 50, fontWeight: 800, color: '#D0A65E', textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                Greenhouse Gas Tracker
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={320} height={56} style={{ objectFit: 'contain' }} />
            ) : null}
          </div>

          <div style={{ display: 'flex', marginBottom: '20px' }}>
            <span style={{ fontSize: 20, color: 'rgba(208,166,94,0.65)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Live Data · Updated Monthly · NOAA GML
            </span>
          </div>

          <div style={{ display: 'flex', marginBottom: '22px' }}>
            <span style={{ fontSize: 24, color: '#e2e8f0', lineHeight: 1.35, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              Track atmospheric CO₂, methane and N₂O alongside global temperatures — including 800,000 years of ice core history.
            </span>
          </div>

          {/* Live stats panel */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              background: 'rgba(3,7,18,0.88)',
              border: '1px solid rgba(208,166,94,0.35)',
              borderRadius: 18,
              padding: '20px 26px',
              marginBottom: '20px',
            }}
          >
            {/* CO₂ */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 14, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                CO₂ {ghg.co2 ? MONTH_NAMES[ghg.co2.month] + ' ' + ghg.co2.year : ''}
              </span>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#ddd6fe', marginTop: 2, lineHeight: 1 }}>
                {ghg.co2 ? ghg.co2.value.toFixed(1) : '—'} ppm
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Pre-industrial: ~280 ppm</span>
            </div>

            {/* CH₄ */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#fdba74', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Methane {ghg.ch4 ? MONTH_NAMES[ghg.ch4.month] + ' ' + ghg.ch4.year : ''}
              </span>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#fed7aa', marginTop: 2, lineHeight: 1 }}>
                {ghg.ch4 ? ghg.ch4.value.toFixed(0) : '—'} ppb
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Pre-industrial: ~722 ppb</span>
            </div>

            {/* N₂O */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Nitrous Oxide {ghg.n2o ? MONTH_NAMES[ghg.n2o.month] + ' ' + ghg.n2o.year : ''}
              </span>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#a7f3d0', marginTop: 2, lineHeight: 1 }}>
                {ghg.n2o ? ghg.n2o.value.toFixed(1) : '—'} ppb
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Pre-industrial: ~270 ppb</span>
            </div>

            {/* Temp anomaly */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                {ghg.tempYear ?? ''} temp anomaly
              </span>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#fecaca', marginTop: 2, lineHeight: 1 }}>
                {ghg.tempAnomaly != null ? fmtSigned(ghg.tempAnomaly, 2) + '°C' : '—'}
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>vs 1961–1990 baseline</span>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#D0A65E' }}>
                CO₂ · CH₄ · N₂O · 800,000-year ice core record →
              </span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>4billionyearson.org/greenhouse-gases</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
