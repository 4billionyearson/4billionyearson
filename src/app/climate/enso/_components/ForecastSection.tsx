'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Check, ChevronDown, Code2, Copy, History, Link2, Mail, Share2 } from 'lucide-react';
import type { EnsoSnapshot, ForecastSeason, PlumePeriod } from '../types';

/* ─── Share bar ───────────────────────────────────────────────────────────── */

const PAGE_URL = 'https://4billionyearson.org/climate/enso#forecast';
const EMBED_URL = 'https://4billionyearson.org/climate/enso/embed/forecast';
const EMBED_CODE = `<iframe\n  src="${EMBED_URL}"\n  width="100%" height="520"\n  style="border:none;"\n  title="ENSO Forecast - 4 Billion Years On"\n></iframe>`;

const SHARE_TEXT = encodeURIComponent('ENSO Forecast - El Nino / La Nina tracker with the latest NOAA forecast');
const SHARE_URL  = encodeURIComponent(PAGE_URL);

function ShareBar() {
  const [open, setOpen]               = useState(false);
  const [copied, setCopied]           = useState(false);
  const [showEmbed, setShowEmbed]     = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(PAGE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(EMBED_CODE).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    });
  };

  const SOCIAL_ITEMS: { label: string; href: string; icon: React.ReactNode }[] = [
    {
      label: 'Post on X',
      href: `https://x.com/intent/tweet?url=${SHARE_URL}&text=${SHARE_TEXT}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Post on Bluesky',
      href: `https://bsky.app/intent/compose?text=${SHARE_TEXT}%20${SHARE_URL}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 600 530" fill="currentColor" aria-hidden="true">
          <path d="M300 245c-30-75-110-200-190-225 0 80 40 160 130 185-110 0-150-60-150-60 0 90 60 175 170 175-30 20-65 30-110 30 70 50 160 55 230 20 70 35 160 30 230-20-45 0-80-10-110-30 110 0 170-85 170-175 0 0-40 60-150 60 90-25 130-105 130-185-80 25-160 150-190 225" />
        </svg>
      ),
    },
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${SHARE_URL}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      ),
    },
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${SHARE_URL}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      label: 'Pin on Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${SHARE_URL}&description=${SHARE_TEXT}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      ),
    },
    {
      label: 'Share via WhatsApp',
      href: `https://wa.me/?text=${SHARE_TEXT}%20${SHARE_URL}`,
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      ),
    },
    {
      label: 'Send by email',
      href: `mailto:?subject=ENSO Forecast - El Nino / La Nina tracker&body=${SHARE_TEXT}%20${PAGE_URL}`,
      icon: <Mail className="h-4 w-4 shrink-0" />,
    },
  ];

  return (
    <div className="mt-4 flex justify-end relative" ref={wrapperRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-[#D0A65E]/50 text-gray-300 hover:text-white transition-all"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 w-56 rounded-xl border border-gray-700 bg-gray-900/95 backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* Copy direct link */}
          <div className="p-1.5">
            <button
              onClick={copyLink}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm"
            >
              {copied ? <Check className="h-4 w-4 shrink-0 text-green-400" /> : <Link2 className="h-4 w-4 shrink-0" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          <div className="h-px bg-gray-700/50" />

          {/* Social links */}
          <div className="p-1.5 space-y-0.5">
            {SOCIAL_ITEMS.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target={label === 'Send by email' ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm"
              >
                {icon}
                {label}
              </a>
            ))}
          </div>

          <div className="h-px bg-gray-700/50" />

          {/* Embed */}
          <div className="p-1.5">
            <button
              onClick={() => setShowEmbed((v) => !v)}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm"
            >
              <Code2 className="h-4 w-4 shrink-0" />
              Embed code
              <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-200 ${showEmbed ? 'rotate-180' : ''}`} />
            </button>
            {showEmbed && (
              <div className="mt-1.5 px-1 pb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-[#D0A65E]/70 font-mono">iframe snippet</p>
                  <button
                    onClick={copyEmbed}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {embedCopied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    {embedCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-gray-300 bg-gray-950 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all select-all">{EMBED_CODE}</pre>
                <p className="text-[9px] text-gray-500 mt-1.5">Updates automatically with live NOAA data.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Types ────────────────────────────────────────────────────────────────── */

type ChartPoint = {
  x: number;
  anom?: number;
  pos?: number;
  neg?: number;
  fcAnom?: number;
  fcPos?: number;
  dateLabel?: string;
};

type EnsoEvent = {
  phase: 'el-nino' | 'la-nina';
  weak: boolean;
  startX: number;
  endX: number;
  peak: number;
  peakLabel: string;
  firstLabel: string;
  lastLabel: string;
};

/* ─── Styling ─────────────────────────────────────────────────────────────── */

const ACCENT = '#D0A65E';
const TT_CONTENT = { backgroundColor: '#0f172a', border: `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 12, color: '#f3f4f6' } as const;
const TT_LABEL = { color: '#ffffff', fontWeight: 600, marginBottom: 4 } as const;
const TT_ITEM = { color: '#e5e7eb' } as const;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const fmtSigned = (v: number, d = 2) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

const SEASON_MONTHS: Record<string, [number, number]> = {
  DJF: [-1, 1], JFM: [0, 2], FMA: [1, 3], MAM: [2, 4], AMJ: [3, 5],
  MJJ: [4, 6], JJA: [5, 7], JAS: [6, 8], ASO: [7, 9], SON: [8, 10],
  OND: [9, 11], NDJ: [10, 12],
};

const seasonWindow = (label: string, anchorYear: number): [number, number] => {
  const months = SEASON_MONTHS[label] || [0, 2];
  const start = anchorYear + months[0] / 12;
  const end = anchorYear + (months[1] + 1) / 12;
  return [start, end];
};

const seasonCentre = (label: string, anchorYear: number): number => {
  const [a, b] = seasonWindow(label, anchorYear);
  return (a + b) / 2;
};

/* ─── SectionCard (self-contained for embed use) ──────────────────────────── */

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

/* ─── ForecastSection ─────────────────────────────────────────────────────── */

export default function ForecastSection({ data }: { data: EnsoSnapshot }) {
  const { oni, weekly, plume } = data;

  if (!oni) return null;

  // ── Timeline constants ──────────────────────────────────────────────────
  const yearsBack = 7;
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - yearsBack + 1;

  const currentOni = weekly?.latest.nino34.anom ?? oni.anomaly;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1).getTime();
  const todayX = now.getFullYear() + (now.getTime() - startOfYear) / (endOfYear - startOfYear);

  // ── Past ENSO event detection ───────────────────────────────────────────
  const MIN_CONSECUTIVE_SEASONS = 3;
  const MIN_PEAK_MAGNITUDE = 0.5;
  const WEAK_PEAK_MAX = 1.0;
  const histInWindow = oni.history.filter((p) => p.year >= minYear && p.year < currentYear);

  const events: EnsoEvent[] = [];
  let cur: { phase: 'el-nino' | 'la-nina'; rows: typeof histInWindow } | null = null;
  const flush = () => {
    if (!cur || cur.rows.length === 0) return;
    if (cur.rows.length < MIN_CONSECUTIVE_SEASONS) { cur = null; return; }
    const peakRow = cur.rows.reduce((a, b) => (Math.abs(b.anom) > Math.abs(a.anom) ? b : a));
    if (Math.abs(peakRow.anom) < MIN_PEAK_MAGNITUDE) { cur = null; return; }
    const first = cur.rows[0];
    const last = cur.rows[cur.rows.length - 1];
    const [s] = seasonWindow(first.season, first.year);
    const [, e] = seasonWindow(last.season, last.year);
    events.push({
      phase: cur.phase,
      weak: Math.abs(peakRow.anom) < WEAK_PEAK_MAX,
      startX: s,
      endX: e,
      peak: peakRow.anom,
      peakLabel: `${peakRow.season} ${peakRow.year}`,
      firstLabel: `${first.season} ${first.year}`,
      lastLabel: `${last.season} ${last.year}`,
    });
    cur = null;
  };
  for (const p of histInWindow) {
    const phase: 'el-nino' | 'la-nina' | null = p.anom >= 0.5 ? 'el-nino' : p.anom <= -0.5 ? 'la-nina' : null;
    if (phase === null) { flush(); continue; }
    if (cur && cur.phase === phase) {
      cur.rows.push(p);
    } else {
      flush();
      cur = { phase, rows: [p] };
    }
  }
  flush();

  const past = events.map((ev) => ({
    x: (ev.startX + ev.endX) / 2,
    year: Math.floor((ev.startX + ev.endX) / 2),
    label: `${ev.firstLabel} → ${ev.lastLabel}`,
    phase: ev.phase,
    peak: ev.peak,
  }));

  // ── Forecast analysis ───────────────────────────────────────────────────
  const seasons = data?.forecast?.seasons || [];
  const first50 = seasons.find((s) => s.pElNino >= 50);
  const first90 = seasons.find((s) => s.pElNino >= 90);
  const last90Idx = (() => {
    let last = -1;
    seasons.forEach((s, i) => { if (s.pElNino >= 90) last = i; });
    return last;
  })();
  const last90 = last90Idx >= 0 ? seasons[last90Idx] : null;
  const peakSeason = seasons.reduce<ForecastSeason | null>(
    (a, b) => (a === null || b.pElNino > a.pElNino ? b : a),
    null,
  );
  const isForecastingElNino = !!first50;

  const plumePeaks = (data?.plume?.periods || [])
    .map((p) => p.dynMean ?? p.mean)
    .filter((v): v is number => v != null);
  const elNinoPeaks = past.filter((p) => p.peak >= 0.5).map((p) => p.peak);
  const predictedPeakOni = plumePeaks.length
    ? Math.max(...plumePeaks)
    : elNinoPeaks.length
      ? elNinoPeaks.reduce((a, b) => a + b, 0) / elNinoPeaks.length
      : 1.5;

  const plumePeakPeriod = (data?.plume?.periods || []).reduce<PlumePeriod | null>(
    (a, b) => {
      const bv = b.dynMean ?? b.mean;
      const av = a ? (a.dynMean ?? a.mean) : null;
      if (bv == null) return a;
      if (av == null || bv > av) return b;
      return a;
    },
    null,
  );

  const elNinoStart = first50 ? seasonWindow(first50.season, currentYear)[0] : null;

  const lastNotableIdx = (() => {
    let last = -1;
    seasons.forEach((s, i) => { if (s.pElNino >= 30) last = i; });
    return last;
  })();
  const lastNotable = lastNotableIdx >= 0 ? seasons[lastNotableIdx] : null;

  const lastPlume = data?.plume?.periods?.[data.plume.periods.length - 1];
  const elNinoEnd = lastPlume
    ? seasonWindow(lastPlume.label, lastPlume.seasonAnchorYear)[1]
    : lastNotable
      ? seasonWindow(lastNotable.season, currentYear)[1]
      : null;

  const peakX = plumePeakPeriod
    ? seasonCentre(plumePeakPeriod.label, plumePeakPeriod.seasonAnchorYear)
    : peakSeason
      ? seasonCentre(peakSeason.season, currentYear)
      : null;

  const xMin = minYear - 0.5;
  const xMax = Math.max(
    currentYear + 1.5,
    (elNinoEnd ?? currentYear + 1) + 0.5,
  );

  const yearTicks: number[] = [];
  for (let y = minYear; y <= Math.ceil(xMax); y++) yearTicks.push(y);

  // ── Observed weekly data ────────────────────────────────────────────────
  const decimalYearFromYMD = (y: number, m: number, d: number) => {
    const start = new Date(y, 0, 1).getTime();
    const end = new Date(y + 1, 0, 1).getTime();
    const t = new Date(y, m - 1, d).getTime();
    return y + (t - start) / (end - start);
  };

  const observedPoints: ChartPoint[] = (weekly?.weekly || [])
    .filter((w) => {
      const dx = decimalYearFromYMD(w.year, w.month, w.day);
      return dx >= xMin && dx <= todayX + 0.001;
    })
    .map((w) => {
      const dx = decimalYearFromYMD(w.year, w.month, w.day);
      const a = w.nino34.anom;
      return {
        x: dx,
        anom: a,
        pos: a > 0 ? a : 0,
        neg: a < 0 ? a : 0,
        dateLabel: `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`,
      };
    })
    .sort((a, b) => a.x - b.x);

  if (observedPoints.length) {
    const last = observedPoints[observedPoints.length - 1];
    if (todayX > last.x + 0.0001) {
      observedPoints.push({
        x: todayX,
        anom: currentOni,
        pos: currentOni > 0 ? currentOni : 0,
        neg: currentOni < 0 ? currentOni : 0,
        dateLabel: `today (${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')})`,
      });
    }
  }

  // ── Forecast curve ──────────────────────────────────────────────────────
  const forecastPoints: ChartPoint[] = [];
  const plumePeriods = plume?.periods || [];
  const usingPlume = plumePeriods.length > 0;

  if (usingPlume) {
    const anchors: { x: number; y: number; label: string }[] = [];
    for (const pr of plumePeriods) {
      const v = pr.dynMean ?? pr.mean ?? pr.statMean;
      if (v == null) continue;
      const cx = seasonCentre(pr.label, pr.seasonAnchorYear);
      anchors.push({ x: cx, y: v, label: `${pr.label} ${pr.seasonAnchorYear}` });
    }
    anchors.sort((a, b) => a.x - b.x);
    const bridge = { x: todayX, y: currentOni, label: 'now' };
    const futureAnchors = anchors.filter((a) => a.x > todayX);
    const allAnchors = [bridge, ...futureAnchors];
    const stepsPerLeg = 10;
    for (let i = 0; i < allAnchors.length - 1; i++) {
      const a0 = allAnchors[i];
      const a1 = allAnchors[i + 1];
      for (let s = 0; s <= stepsPerLeg; s++) {
        const t = s / stepsPerLeg;
        const eased = (1 - Math.cos(Math.PI * t)) / 2;
        const fx = a0.x + (a1.x - a0.x) * t;
        const fy = a0.y + (a1.y - a0.y) * eased;
        if (i > 0 && s === 0) continue;
        forecastPoints.push({ x: fx, fcAnom: fy, fcPos: fy > 0 ? fy : 0 });
      }
    }
  } else if (
    isForecastingElNino &&
    elNinoStart !== null &&
    elNinoEnd !== null &&
    peakX !== null &&
    todayX < elNinoEnd
  ) {
    const startVal = currentOni;
    const startThresh = 0.6;
    const peakVal = predictedPeakOni;
    const endVal = 0.3;
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const fx = todayX + t * (elNinoEnd - todayX);
      let fy: number;
      if (fx <= elNinoStart) {
        const u = (fx - todayX) / Math.max(0.001, elNinoStart - todayX);
        const eased = (1 - Math.cos(Math.PI * u)) / 2;
        fy = startVal + (startThresh - startVal) * eased;
      } else if (fx <= peakX) {
        const u = (fx - elNinoStart) / Math.max(0.001, peakX - elNinoStart);
        const eased = (1 - Math.cos(Math.PI * u)) / 2;
        fy = startThresh + (peakVal - startThresh) * eased;
      } else {
        const u = (fx - peakX) / Math.max(0.001, elNinoEnd - peakX);
        const eased = (1 - Math.cos(Math.PI * u)) / 2;
        fy = peakVal + (endVal - peakVal) * eased;
      }
      forecastPoints.push({ x: fx, fcAnom: fy, fcPos: fy > 0 ? fy : 0 });
    }
    const lastObs = observedPoints[observedPoints.length - 1];
    if (lastObs && forecastPoints.length) {
      forecastPoints[0] = {
        ...forecastPoints[0],
        fcAnom: lastObs.anom ?? forecastPoints[0].fcAnom,
        fcPos: (lastObs.anom ?? 0) > 0 ? (lastObs.anom ?? 0) : 0,
      };
    }
  }

  const chartData: ChartPoint[] = [...observedPoints, ...forecastPoints];

  return (
    <SectionCard
      icon={<History className="text-[#D0A65E]" />}
      title="Forecast"
      subtitle="Weekly Niño 3.4 anomaly: red above zero (El Niño-leaning), blue below (La Niña). The dashed red curve is NOAA's smoothed forecast."
    >
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 24, right: 28, left: 0, bottom: 0 }}>
            <defs>
              <pattern id="enso-forecast-stripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="rgba(244,63,94,0.12)" />
                <rect width="3" height="6" fill="rgba(244,63,94,0.32)" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[xMin, xMax]}
              ticks={yearTicks}
              tickFormatter={(v) => String(Math.round(v))}
              stroke="#9CA3AF"
              fontSize={11}
              allowDecimals={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={10}
              width={36}
              domain={[-3, 3]}
              ticks={[-3, -2, -1, 0, 1, 2, 3]}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
            />
            <Tooltip
              contentStyle={TT_CONTENT}
              labelStyle={TT_LABEL}
              itemStyle={TT_ITEM}
              cursor={{ stroke: '#D0A65E', strokeDasharray: '3 3' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                if (value === null || value === undefined) return ['', ''];
                const labelMap: Record<string, string> = {
                  anom: 'Observed Niño 3.4',
                  fcAnom: 'Forecast (smoothed)',
                };
                return [`${fmtSigned(Number(value), 2)}°C`, labelMap[name] || name];
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(v: any, p: any) => {
                const pl = p?.[0]?.payload;
                if (pl?.dateLabel) return pl.dateLabel;
                const yr = Math.floor(v);
                const mo = Math.floor((v - yr) * 12);
                return `${yr}-${String(mo + 1).padStart(2, '0')}`;
              }}
            />
            <ReferenceLine y={0.5} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={-0.5} stroke="#0ea5e9" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={0} stroke="#6B7280" />
            <Area type="monotone" dataKey="pos" stroke="none" fill="#f43f5e" fillOpacity={0.55} isAnimationActive={false} connectNulls={false} />
            <Area type="monotone" dataKey="neg" stroke="none" fill="#0ea5e9" fillOpacity={0.55} isAnimationActive={false} connectNulls={false} />
            {isForecastingElNino && elNinoStart !== null && elNinoEnd !== null && (
              <ReferenceArea
                x1={elNinoStart}
                x2={elNinoEnd}
                y1={0}
                y2={predictedPeakOni}
                fill="url(#enso-forecast-stripes)"
                stroke="#f43f5e"
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeOpacity={0.45}
                ifOverflow="extendDomain"
              />
            )}
            <Area type="monotone" dataKey="fcPos" stroke="none" fill="#f43f5e" fillOpacity={0.35} isAnimationActive={false} connectNulls={false} />
            <Line type="monotone" dataKey="anom" stroke="#fef3c7" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
            <Line type="monotone" dataKey="fcAnom" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} connectNulls={false} />
            {isForecastingElNino && peakX !== null && (peakSeason || plumePeakPeriod) && (
              <ReferenceDot x={peakX} y={predictedPeakOni} r={5} fill="#f43f5e" stroke="#0f172a" strokeWidth={2} />
            )}
            {events.filter((ev) => ((ev.startX + ev.endX) / 2) - xMin >= 1).map((ev, i) => {
              const cx = (ev.startX + ev.endX) / 2;
              return (
                <ReferenceLine
                  key={`ev-label-${i}`}
                  x={cx}
                  stroke="transparent"
                  label={{
                    value: `${ev.phase === 'el-nino' ? 'El Niño' : 'La Niña'}${ev.weak ? ' (weak)' : ''}`,
                    fill: ev.phase === 'el-nino' ? '#fecaca' : '#bfdbfe',
                    fontSize: 9.5,
                    position: ev.peak >= 0 ? 'insideTop' : 'insideBottom',
                    offset: 4,
                  }}
                />
              );
            })}
            <ReferenceLine
              x={todayX}
              stroke="#D0A65E"
              strokeDasharray="4 4"
              label={{ value: 'Today', fill: '#D0A65E', fontSize: 11, position: 'top' }}
            />
            <ReferenceDot
              x={todayX}
              y={currentOni}
              r={6}
              fill="#D0A65E"
              stroke="#0f172a"
              strokeWidth={2}
              label={{
                value: `Now ${fmtSigned(currentOni, 2)}°C`,
                fill: '#D0A65E',
                fontSize: 11,
                fontWeight: 600,
                position: 'left',
                offset: 12,
              }}
            />
            {forecastPoints.length > 0 && (() => {
              const lastFc = forecastPoints[forecastPoints.length - 1];
              return (
                <ReferenceLine
                  x={lastFc.x}
                  stroke="#f43f5e"
                  strokeDasharray="2 4"
                  strokeOpacity={0.55}
                  label={{
                    value: 'End of current forecasts',
                    fill: '#fda4af',
                    fontSize: 10,
                    position: 'insideTopLeft',
                    offset: 6,
                  }}
                />
              );
            })()}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend strip */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 bg-[#fef3c7]" /> Weekly Niño 3.4
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(244,63,94,0.55)' }} /> El Niño shading
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(14,165,233,0.55)' }} /> La Niña shading
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-5 h-0.5"
            style={{ background: 'repeating-linear-gradient(90deg, #f43f5e 0 4px, transparent 4px 8px)' }}
          />{' '}
          Forecast
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D0A65E]" /> Now / Today
        </span>
      </div>

      {/* Headline forecast narrative */}
      {isForecastingElNino && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 to-gray-900/30 p-4">
          <p className="text-[11px] uppercase tracking-wider text-rose-300/80 font-mono mb-1">NOAA forecast - what&apos;s coming</p>
          <p className="text-sm text-gray-100 leading-relaxed">
            A new <span className="font-semibold text-rose-300">El Niño</span> looks increasingly likely.{' '}
            {first50 && (
              <>
                Probability first crosses{' '}
                <span className="font-mono font-semibold text-rose-200">50%</span> in{' '}
                <span className="font-mono">{first50.label}</span>
                {' '}({first50.pElNino}% chance) - this is the official &ldquo;start&rdquo; of the event
                {first90 && (
                  <>
                    . It then climbs above <span className="font-mono font-semibold text-rose-200">90%</span> in{' '}
                    <span className="font-mono">{first90.label}</span>
                  </>
                )}
                {peakSeason && (
                  <>
                    {' '}and peaks at{' '}
                    <span className="font-mono font-semibold text-rose-200">{peakSeason.pElNino}%</span> in{' '}
                    <span className="font-mono">{peakSeason.label}</span>
                  </>
                )}
                {last90 && first90 && first90.season !== last90.season && (
                  <>
                    , staying above 90% through <span className="font-mono">{last90.label}</span>
                  </>
                )}
                .
              </>
            )}{' '}
            The dashed red curve traces the multi-model{' '}
            <a href="https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/?enso_tab=enso-sst_table" target="_blank" rel="noopener noreferrer" className="text-rose-300 underline decoration-rose-400/40 underline-offset-2 hover:decoration-rose-300">
              IRI/CCSR plume forecast
            </a>{' '}
            {plume && (
              <>(issued {plume.issueMonth}/{plume.issueYear}, {plume.periods[0]?.modelCount ?? 0} dynamical &amp; statistical models). </>
            )}
            Peak intensity reaches{' '}
            <span className="font-mono font-semibold text-rose-200">{fmtSigned(predictedPeakOni, 1)}°C</span>
            {plumePeakPeriod && (
              <>{' '}in <span className="font-mono">{plumePeakPeriod.label} {plumePeakPeriod.seasonAnchorYear}</span></>
            )}
            {' '}- the dynamical-model average, which currently signals a strong-to-super El Niño.
          </p>
        </div>
      )}

      {/* Season-by-season probability strip */}
      {seasons.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
            Season-by-season El Niño probability
          </p>
          <div className="flex gap-1">
            {seasons.map((s) => (
              <div
                key={s.season}
                className="flex-1 flex flex-col items-center"
                title={`${s.label}: ${s.pElNino}% El Niño · ${s.pNeutral}% Neutral · ${s.pLaNina}% La Niña`}
              >
                <div className="w-full h-12 bg-gray-800/40 rounded-sm overflow-hidden flex flex-col-reverse border border-gray-700/40">
                  <div
                    className={s.pElNino >= 50 ? 'bg-rose-500' : 'bg-rose-500/40'}
                    style={{ height: `${s.pElNino}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-gray-400 mt-1">{s.season}</span>
                <span className={`text-[10px] font-mono font-bold ${s.pElNino >= 50 ? 'text-rose-300' : 'text-gray-500'}`}>
                  {s.pElNino}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Sources:{' '}
        <a href="https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">
          NOAA CPC weekly Niño 3.4 SST
        </a>{' '}
        (observed),{' '}
        <a href="https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/?enso_tab=enso-sst_table" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">
          IRI/CCSR ENSO plume
        </a>{' '}
        (forecast - multi-model dynamical &amp; statistical mean of {plume?.periods[0]?.modelCount ?? 0} models, issued {plume ? `${plume.issueMonth}/${plume.issueYear}` : 'monthly'}),{' '}
        <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities.php" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">
          NOAA CPC probability outlook
        </a>
        , and{' '}
        <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php" target="_blank" rel="noopener noreferrer" className="text-[#D0A65E] hover:underline">
          NOAA ONI v5
        </a>{' '}
        (past events). The IRI plume publishes 9 overlapping 3-month forecast periods; that limit is shown by the &ldquo;End of current forecasts&rdquo; line.
      </p>

      <ShareBar />
    </SectionCard>
  );
}
