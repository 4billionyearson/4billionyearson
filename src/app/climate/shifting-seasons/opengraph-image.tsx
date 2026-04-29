import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';

export const alt = 'Shifting Seasons - how climate change is moving the calendar';
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

function mean(vals: number[]): number | null {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

async function loadSeasonalStats(): Promise<{
  springShift: number | null;
  springRegions: number;
  earlierSprings: number;
  autumnShift: number | null;
  laterAutumns: number;
  kyotoShift: number | null;
  snowSpringChange: number | null;
  updatedAt: string | null;
} | null> {
  try {
    const base = resolve(process.cwd(), 'public', 'data', 'seasons');
    const [globalRaw, kyotoRaw, snowRaw, manifestRaw] = await Promise.all([
      readFile(resolve(base, 'shift-global.json'), 'utf8'),
      readFile(resolve(base, 'kyoto-cherry-blossom.json'), 'utf8'),
      readFile(resolve(base, 'nh-snow-cover.json'), 'utf8'),
      readFile(resolve(base, 'manifest.json'), 'utf8').catch(() => '{}'),
    ]);
    const globalData = JSON.parse(globalRaw);
    const kyoto = JSON.parse(kyotoRaw);
    const snow = JSON.parse(snowRaw);
    const manifest = JSON.parse(manifestRaw);

    const wc = globalData?.globalStats?.warmColdStats ?? {};

    // Compute snow headline: recent 10yr spring anomaly vs first 10yr
    const seasonal: { season: string; anomPct: number | null }[] = snow?.seasonalAnomaly ?? [];
    const springRows = seasonal.filter((s) => s.season === 'spring');
    const springRecentVals = springRows.slice(-10).map((s) => s.anomPct).filter((v): v is number => v != null);
    const springFirstVals = springRows.slice(0, 10).map((v) => v.anomPct).filter((v): v is number => v != null);
    const springRecent = mean(springRecentVals);
    const springFirst = mean(springFirstVals);
    const snowSpringChange = springRecent != null && springFirst != null ? springRecent - springFirst : null;

    return {
      springShift: wc.meanSpringShift ?? null,
      springRegions: wc.withCrossings ?? 0,
      earlierSprings: wc.earlierSprings ?? 0,
      autumnShift: wc.meanAutumnShift ?? null,
      laterAutumns: wc.laterAutumns ?? 0,
      kyotoShift: kyoto?.shiftDays ?? null,
      snowSpringChange,
      updatedAt: manifest?.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const [bgUrl, logoUrl, stats] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    loadSeasonalStats(),
  ]);

  const fmt1 = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
  const updatedLabel = stats?.updatedAt
    ? new Date(stats.updatedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null;

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
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(3,7,18,0.30) 0%, rgba(3,7,18,0.65) 55%, rgba(3,7,18,0.92) 100%)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: 72 }}>🌸</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#D0A65E', textShadow: '0 2px 10px rgba(0,0,0,0.9)', lineHeight: 1.05 }}>
                Shifting Seasons
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={340} height={60} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 26, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          <div style={{ display: 'flex', marginBottom: '28px' }}>
            <span style={{ fontSize: 30, color: '#e2e8f0', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              How climate change is moving spring, summer, autumn and winter
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
            {/* Earlier Springs */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 14, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                Earlier springs
              </span>
              <span style={{ fontSize: 50, fontWeight: 800, color: '#fca5a5', marginTop: 2, lineHeight: 1 }}>
                {stats?.springShift != null ? fmt1(stats.springShift) : '−9.0'} days
              </span>
              <span style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>
                mean · {stats?.springRegions ?? 131} regions · {stats?.earlierSprings ?? 126} earlier
              </span>
            </div>
            {/* Later Autumns */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                Later autumns
              </span>
              <span style={{ fontSize: 50, fontWeight: 800, color: '#fdba74', marginTop: 2, lineHeight: 1 }}>
                {stats?.autumnShift != null ? fmt1(stats.autumnShift) : '+8.5'} days
              </span>
              <span style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>
                mean · {stats?.springRegions ?? 131} regions · {stats?.laterAutumns ?? 131} later
              </span>
            </div>
            {/* Kyoto */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                Kyoto cherry blossom
              </span>
              <span style={{ fontSize: 50, fontWeight: 800, color: '#f9a8d4', marginTop: 2, lineHeight: 1 }}>
                {stats?.kyotoShift != null ? fmt1(stats.kyotoShift) : '−10.7'} days
              </span>
              <span style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>30-yr mean vs pre-1850</span>
            </div>
            {/* NH Spring Snow */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
              <span style={{ fontSize: 14, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                NH spring snow
              </span>
              <span style={{ fontSize: 50, fontWeight: 800, color: '#7dd3fc', marginTop: 2, lineHeight: 1 }}>
                {stats?.snowSpringChange != null ? fmt1(stats.snowSpringChange) : '−9.2'} pp
              </span>
              <span style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>recent 10-yr vs 1967–76</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['Global seasonal analysis', 'Kyoto phenology AD 812–', 'Rutgers GSL snow cover', 'EPA climate indicators'].map((src) => (
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
              4billionyearson.org/climate/shifting-seasons
            </span>
            <span style={{ fontSize: 20, color: '#94a3b8', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              {updatedLabel ? `Updated ${updatedLabel}` : 'Updated monthly'}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
