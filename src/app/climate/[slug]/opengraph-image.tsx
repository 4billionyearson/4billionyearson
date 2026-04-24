import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getRegionBySlug } from '@/lib/climate/regions';

export const runtime = 'nodejs';

export const alt = 'Climate Update';
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

interface RankedStat {
  label?: string;
  value?: number;
  diff?: number;
  rank?: number;
  total?: number;
}

async function loadRegionSnapshot(region: ReturnType<typeof getRegionBySlug>): Promise<{
  one: RankedStat | null;
  three: RankedStat | null;
  unit: string;
} | null> {
  if (!region) return null;
  const base = resolve(process.cwd(), 'public', 'data', 'climate');
  let path: string | null = null;
  if (region.type === 'country') path = resolve(base, 'country', `${region.apiCode}.json`);
  else if (region.type === 'us-state') path = resolve(base, 'us-state', `${region.apiCode}.json`);
  else if (region.type === 'uk-region') path = resolve(base, 'uk-region', `${region.apiCode}.json`);
  if (!path) return null;
  try {
    const raw = await readFile(path, 'utf8');
    const d = JSON.parse(raw);
    if (region.type === 'country') {
      return { one: d.latestMonthStats ?? null, three: d.latestThreeMonthStats ?? null, unit: '°C' };
    }
    if (region.type === 'us-state') {
      const t = d?.paramData?.tavg;
      return { one: t?.latestMonthStats ?? null, three: t?.latestThreeMonthStats ?? null, unit: '°F' };
    }
    if (region.type === 'uk-region') {
      const t = d?.varData?.Tmean;
      return { one: t?.latestMonthStats ?? null, three: t?.latestThreeMonthStats ?? null, unit: '°C' };
    }
  } catch {
    return null;
  }
  return null;
}

function fmtSigned(n: number, d = 2): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(d)}`;
}

function tone(diff: number | null | undefined): string {
  if (diff == null) return '#e5e7eb';
  if (diff >= 1.5) return '#fca5a5';
  if (diff >= 0.8) return '#fdba74';
  if (diff >= 0.2) return '#fcd34d';
  if (diff <= -0.8) return '#7dd3fc';
  if (diff <= -0.2) return '#bae6fd';
  return '#e5e7eb';
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);

  if (!region) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#030712', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: 40 }}>Region not found</span>
        </div>
      ),
      { ...size }
    );
  }

  const [bgUrl, logoUrl, snap] = await Promise.all([
    loadDataUrl('background.png', 'image/png'),
    loadDataUrl('header-logo.png', 'image/png'),
    loadRegionSnapshot(region),
  ]);

  const sourceLabels: Record<string, string> = {
    'owid-temp': 'OWID',
    'owid-emissions': 'Emissions',
    'met-office': 'Met Office',
    'noaa-state': 'NOAA',
    'noaa-national': 'NOAA',
    'arctic-ice': 'Arctic Ice',
  };
  const sources = region.dataSources.map((s) => sourceLabels[s] || s);

  const one = snap?.one ?? null;
  const three = snap?.three ?? null;
  const unit = snap?.unit ?? '°C';

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
            padding: '52px 60px',
            position: 'relative',
          }}
        >
          {/* Top row: region name (left) + logo (right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: 72 }}>{region.emoji}</span>
              <span style={{ fontSize: 60, fontWeight: 800, color: '#D0A65E', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>{region.name}</span>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="4 Billion Years On" width={340} height={60} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 26, fontWeight: 700, color: '#e5e7eb' }}>4billionyearson.org</span>
            )}
          </div>

          <div style={{ display: 'flex', marginBottom: '28px' }}>
            <span style={{ fontSize: 28, color: '#e2e8f0', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
              {region.tagline}
            </span>
          </div>

          {/* Stats panel - opaque backdrop so values stay legible
              over any central colour bars in the background image. */}
          {(one || three) && (
            <div
              style={{
                display: 'flex',
                gap: '16px',
                background: 'rgba(3,7,18,0.88)',
                border: '1px solid rgba(208,166,94,0.4)',
                borderRadius: 18,
                padding: '22px 26px',
                marginBottom: '22px',
              }}
            >
              {one && typeof one.diff === 'number' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: 15, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    {one.label ?? 'Latest month'} · Anomaly
                  </span>
                  <span style={{ fontSize: 60, fontWeight: 800, color: tone(one.diff), marginTop: 2, lineHeight: 1 }}>
                    {fmtSigned(one.diff, 2)}{unit}
                  </span>
                  <span style={{ fontSize: 16, color: '#cbd5e1', marginTop: 4 }}>
                    vs 1961–1990{one.rank && one.total ? ` · rank ${one.rank} of ${one.total}` : ''}
                  </span>
                </div>
              )}
              {three && typeof three.diff === 'number' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
                  <span style={{ fontSize: 15, color: '#D0A65E', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    {three.label ?? '3-month'} · Anomaly
                  </span>
                  <span style={{ fontSize: 60, fontWeight: 800, color: tone(three.diff), marginTop: 2, lineHeight: 1 }}>
                    {fmtSigned(three.diff, 2)}{unit}
                  </span>
                  <span style={{ fontSize: 16, color: '#cbd5e1', marginTop: 4 }}>
                    vs 1961–1990{three.rank && three.total ? ` · rank ${three.rank} of ${three.total}` : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {sources.map((src) => (
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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 18, color: '#94a3b8', marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>Monthly Climate Update</span>
              <span style={{ fontSize: 20, color: '#cbd5e1', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {region.type === 'uk-region'
                  ? 'Temperature · Rainfall · Sunshine · Frost'
                  : region.type === 'us-state'
                    ? 'Temperature · Precipitation'
                    : 'Temperature · Rainfall · Emissions'}
              </span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#e5e7eb', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              4billionyearson.org/climate/{region.slug}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
