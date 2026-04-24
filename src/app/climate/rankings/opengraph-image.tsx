import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';

export const alt = 'Climate Rankings & Monthly Trends - league table of temperature anomalies';
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

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  emoji?: string;
  anomaly1m: number | null;
  latestLabel: string | null;
}

async function loadRankings(): Promise<{ rows: RankingRow[]; latestLabel: string | null } | null> {
  try {
    const p = resolve(process.cwd(), 'public', 'data', 'climate', 'rankings.json');
    const raw = await readFile(p, 'utf8');
    const json = JSON.parse(raw);
    const rows: RankingRow[] = (json?.rows ?? []).filter((r: RankingRow) => typeof r.anomaly1m === 'number');
    const latestLabel = rows[0]?.latestLabel ?? null;
    rows.sort((a, b) => (b.anomaly1m as number) - (a.anomaly1m as number));
    return { rows, latestLabel };
  } catch {
    return null;
  }
}

function tone(diff: number): string {
  if (diff >= 1.5) return '#fca5a5';
  if (diff >= 0.8) return '#fdba74';
  if (diff >= 0.2) return '#fcd34d';
  if (diff <= -0.8) return '#7dd3fc';
  if (diff <= -0.2) return '#bae6fd';
  return '#e5e7eb';
}

export default async function OgImage() {
  const [bgUrl, logoUrl, data] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    loadRankings(),
  ]);

  const rows = data?.rows ?? [];
  const latestLabel = data?.latestLabel ?? '';
  const total = rows.length;
  const top8 = rows.slice(0, 8);

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
            background: 'linear-gradient(135deg, rgba(3,7,18,0.90) 0%, rgba(15,23,42,0.84) 50%, rgba(3,7,18,0.94) 100%)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 28, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
                Climate Rankings & Monthly Trends
              </span>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#FFF5E7', textShadow: '0 2px 10px rgba(0,0,0,0.9)', marginTop: 4 }}>
                Warmest regions · {latestLabel}
              </span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={320} height={56} style={{ objectFit: 'contain' }} />
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(3,7,18,0.88)',
              border: '1px solid rgba(208,166,94,0.4)',
              borderRadius: 18,
              padding: '22px 28px',
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, paddingBottom: 10, borderBottom: '1px solid rgba(208,166,94,0.25)' }}>
              <span>#</span>
              <span style={{ flex: 1, paddingLeft: 18 }}>Region</span>
              <span>1-month anomaly</span>
            </div>
            {top8.map((r, i) => (
              <div
                key={r.slug}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0',
                  fontSize: 24,
                  borderBottom: i < top8.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <span style={{ width: 36, color: '#9ca3af', fontFamily: 'monospace' }}>{i + 1}.</span>
                <span style={{ width: 36, fontSize: 26 }}>{r.emoji || ''}</span>
                <span style={{ flex: 1, color: '#f3f4f6', fontWeight: 600 }}>{r.name}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: tone(r.anomaly1m as number), fontSize: 28 }}>
                  {(r.anomaly1m as number) > 0 ? '+' : ''}{(r.anomaly1m as number).toFixed(2)}°C
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 18, color: '#9ca3af' }}>
            <span>{total} regions · 1961–1990 baseline</span>
            <span style={{ color: '#D0A65E', fontWeight: 700 }}>4billionyearson.org/climate/rankings</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
