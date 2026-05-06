'use client';

import { Activity } from 'lucide-react';
import EnsoRegionMap from '../EnsoRegionMap';
import type { EnsoSnapshot } from '../types';
import ShareBar from './ShareBar';

/* ─── Share constants ─────────────────────────────────────────────────────── */

const EMBED_URL = 'https://4billionyearson.org/climate/enso/embed/current-state';
const EMBED_CODE = `<iframe\n  src="${EMBED_URL}"\n  width="100%" height="620"\n  style="border:none;"\n  title="ENSO Current State - 4 Billion Years On"\n></iframe>`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const SEASON_LABELS = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const seasonMiddleMonth = (label: string, anchorYear: number): string => {
  const idx = SEASON_LABELS.indexOf(label);
  if (idx < 0) return `${label} ${anchorYear}`;
  let monthIdx: number;
  if (label === 'DJF') { monthIdx = 0; }
  else if (label === 'NDJ') { monthIdx = 11; }
  else { monthIdx = (idx + 1) % 12; }
  return `${MONTH_NAMES_FULL[monthIdx]} ${anchorYear}`;
};

const fmtSigned = (v: number, d = 2) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

const anomColor = (a: number) =>
  a >= 0.5 ? 'text-rose-300' : a <= -0.5 ? 'text-sky-300' : 'text-gray-200';

const leaningLabel = (a: number) =>
  a >= 0.5
    ? { text: 'El Niño-leaning', cls: 'text-rose-300' }
    : a <= -0.5
      ? { text: 'La Niña-leaning', cls: 'text-sky-300' }
      : { text: 'near baseline', cls: 'text-gray-300' };

const ENSO_TEXT_CLS: Record<string, string> = {
  'El Niño': 'text-rose-300',
  'La Niña': 'text-sky-300',
  'Neutral': 'text-gray-300',
};

/* ─── SectionCard (self-contained for embed use) ─────────────────────────── */

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <div className="mb-3">
        <h3 className="text-xl font-bold font-mono text-white flex items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
          <span className="min-w-0 flex-1">{title}</span>
        </h3>
        {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function CurrentStateSection({ data }: { data: EnsoSnapshot }) {
  const { oni, weekly } = data;

  // Derive forecast verdict for the card title
  const forecastSeasons = data.forecast?.seasons || [];
  const now = new Date();
  let runYear = now.getUTCFullYear();
  let prevIdx = -1;
  const forecastWithYear = forecastSeasons.map((s) => {
    const idx = SEASON_LABELS.indexOf(s.season);
    if (prevIdx >= 0 && idx >= 0 && idx < prevIdx) runYear += 1;
    if (idx >= 0) prevIdx = idx;
    return { ...s, anchorYear: runYear };
  });
  const first50El = forecastWithYear.find((s) => s.pElNino >= 50) || null;
  const first50La = forecastWithYear.find((s) => s.pLaNina >= 50) || null;
  const forecastVerdict: { label: string | null } = first50El
    ? { label: `El Niño Predicted by ${seasonMiddleMonth(first50El.season, first50El.anchorYear)}` }
    : first50La
      ? { label: `La Niña Predicted by ${seasonMiddleMonth(first50La.season, first50La.anchorYear)}` }
      : { label: 'Neutral conditions favoured through the forecast window' };

  if (!oni) return null;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const regions = weekly
    ? ([
        { label: 'Niño 1+2', key: 'nino12' },
        { label: 'Niño 3',   key: 'nino3'  },
        { label: 'Niño 3.4', key: 'nino34' },
        { label: 'Niño 4',   key: 'nino4'  },
      ] as const)
    : [];

  return (
    <SectionCard
      icon={<Activity className="text-sky-300" />}
      title={`Current State - ${oni.state}${oni.strength ? `, ${oni.strength}` : ''}${forecastVerdict.label ? ` · ${forecastVerdict.label}` : ''}`}
      subtitle="Niño 3.4 (central Pacific) is the official ENSO yardstick. Niño 1+2 leads coastal signals off Peru; Niño 4 captures the western warm pool."
    >
      {/* Headline: ONI · Niño 3.4 weekly */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ONI · 3-month mean</p>
          <p className={`text-2xl font-bold font-mono ${ENSO_TEXT_CLS[oni.state]}`}>{oni.state}</p>
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-mono text-white">{fmtSigned(oni.anomaly)}°C</span> ·{' '}
            {oni.season} {oni.seasonYear}
          </p>
        </div>
        {weekly && (
          <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Niño 3.4 · this week</p>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className={`text-2xl font-bold font-mono ${anomColor(weekly.latest.nino34.anom)}`}>{fmtSigned(weekly.latest.nino34.anom)}</span>
              <span className="text-sm text-gray-400">°C</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {(() => { const [y, m, d] = weekly.lastWeek.split('-'); return `SST ${weekly.latest.nino34.sst.toFixed(1)}°C · w/e ${d}-${m}-${y.slice(2)}`; })()}
            </p>
          </div>
        )}
      </div>

      {/* Live Leaflet map of the four Niño regions */}
      {weekly && (
        <div className="mt-5 rounded-xl border border-gray-700/50 bg-gray-800/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Equatorial Pacific</p>
          <EnsoRegionMap
            anoms={{
              nino12: weekly.latest.nino12.anom,
              nino3: weekly.latest.nino3.anom,
              nino34: weekly.latest.nino34.anom,
              nino4: weekly.latest.nino4.anom,
            }}
            state={oni.state === 'El Niño' ? 'el-nino' : oni.state === 'La Niña' ? 'la-nina' : 'neutral'}
          />
          <p className="text-[11px] text-gray-500 mt-2 leading-snug">
            Box colour shows this week&rsquo;s SST anomaly vs the 1991-2020 baseline -{' '}
            <span className="text-rose-400">warmer</span> (El Niño-leaning) or{' '}
            <span className="text-sky-400">cooler</span> (La Niña-leaning). Arrows show trade-wind direction.
          </p>
        </div>
      )}

      {/* Per-region anomaly cards */}
      {weekly && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {regions.map((r) => {
            const v = (weekly.latest as any)[r.key] as { sst: number; anom: number };
            const lean = leaningLabel(v.anom);
            return (
              <div key={r.key} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{r.label}</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className={`text-2xl font-bold font-mono ${anomColor(v.anom)}`}>{fmtSigned(v.anom)}</span>
                  <span className="text-sm text-gray-400">°C</span>
                </div>
                <p className={`text-[10px] font-mono uppercase tracking-wider mt-0.5 ${lean.cls}`}>{lean.text}</p>
                <p className="text-xs text-gray-400 mt-1">SST {v.sst.toFixed(1)}°C</p>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        El Niño years push global temperatures higher; La Niña years temporarily damp them - though the underlying greenhouse-gas trend continues either way.
        Thresholds: <span className="text-rose-400 font-mono">≥ +0.5°C</span> El Niño ·{' '}
        <span className="text-sky-400 font-mono">≤ −0.5°C</span> La Niña · otherwise Neutral.
      </p>

      <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
        Data: NOAA CPC -{' '}
        <a
          href="https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 underline underline-offset-2 hover:text-sky-300 transition-colors"
        >
          ONI (3-month mean)
        </a>
        {' '}-{' '}
        <a
          href="https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 underline underline-offset-2 hover:text-sky-300 transition-colors"
        >
          weekly Niño-region SSTs
        </a>
      </p>

      <ShareBar
        pageUrl="https://4billionyearson.org/climate/enso#current-state"
        shareText={encodeURIComponent('Current ENSO state - El Nino / La Nina tracker with live NOAA data')}
        emailSubject="Current ENSO state - El Nino / La Nina tracker"
        embedUrl={EMBED_URL}
        embedCode={EMBED_CODE}
      />
    </SectionCard>
  );
}
