import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Live Sea Level & Ice Data – Arctic, Antarctic & Global Trends | 4 Billion Years On';
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

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function loadSeaIceStats(): Promise<{
  extent: number | null;
  anomaly: number | null;
  anomalyPct: number | null;
  rankLowest: number | null;
  totalYears: number | null;
  month: number | null;
  year: number | null;
} | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
    const d = JSON.parse(await readFile(p, 'utf8'));
    const s = d?.seaIceStats;
    if (!s) return null;
    return {
      extent: s.latest?.extent ?? null,
      anomaly: s.anomaly ?? null,
      anomalyPct: s.anomalyPct ?? null,
      rankLowest: s.rankLowestOfSameMonth ?? null,
      totalYears: s.totalYearsInMonth ?? null,
      month: s.latest?.month ?? null,
      year: s.latest?.year ?? null,
    };
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const [bgUrl, logoUrl, ice] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    loadSeaIceStats(),
  ]);

  const monthLabel = ice?.month && ice?.year ? MONTH_NAMES[ice.month] + ' ' + ice.year : '';

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
              <span style={{ fontSize: 64 }}>🧊</span>
              <span style={{ fontSize: 50, fontWeight: 800, color: '#7dd3fc', textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                Sea Level &amp; Ice Data
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={320} height={56} style={{ objectFit: 'contain' }} />
            ) : null}
          </div>

          <div style={{ display: 'flex', marginBottom: '20px' }}>
            <span style={{ fontSize: 20, color: 'rgba(125,211,252,0.65)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Live Data · Updated Monthly · NSIDC · NASA
            </span>
          </div>

          <div style={{ display: 'flex', marginBottom: '22px' }}>
            <span style={{ fontSize: 24, color: '#e2e8f0', lineHeight: 1.35, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              Track global sea level rise, Arctic and Antarctic sea ice extent, and polar ice mass loss from satellite records.
            </span>
          </div>

          {/* Live stats panel */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              background: 'rgba(3,7,18,0.88)',
              border: '1px solid rgba(125,211,252,0.30)',
              borderRadius: 18,
              padding: '20px 26px',
              marginBottom: '20px',
            }}
          >
            {/* Global sea ice extent */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1.2 }}>
              <span style={{ fontSize: 14, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Global sea ice · {monthLabel}
              </span>
              <span style={{ fontSize: 52, fontWeight: 800, color: '#bae6fd', marginTop: 2, lineHeight: 1 }}>
                {ice?.extent != null ? ice.extent.toFixed(1) + ' Mkm²' : '—'}
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Arctic + Antarctic combined</span>
            </div>

            {/* Anomaly */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                vs 1991–2020 baseline
              </span>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  color: ice?.anomaly != null && ice.anomaly < 0 ? '#fca5a5' : '#6ee7b7',
                  marginTop: 2,
                  lineHeight: 1,
                }}
              >
                {ice?.anomaly != null ? (ice.anomaly > 0 ? '+' : '') + ice.anomaly.toFixed(2) + ' Mkm²' : '—'}
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                {ice?.anomalyPct != null ? (ice.anomalyPct > 0 ? '+' : '') + ice.anomalyPct.toFixed(1) + '% vs climatology' : ''}
              </span>
            </div>

            {/* Rank */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Monthly rank
              </span>
              <span style={{ fontSize: 52, fontWeight: 800, color: '#fca5a5', marginTop: 2, lineHeight: 1 }}>
                {ice?.rankLowest != null ? '#' + ice.rankLowest + ' lowest' : '—'}
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                {ice?.totalYears != null ? 'of ' + ice.totalYears + ' years on record' : 'NSIDC satellite record'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#7dd3fc' }}>
                Sea level rise · Arctic · Antarctic · Greenland →
              </span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>4billionyearson.org/sea-levels-ice</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
