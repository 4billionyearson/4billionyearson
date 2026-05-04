/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { History } from 'lucide-react';
import { PAST_EVENTS } from '@/lib/climate/enso-impacts';
import ShareBar from './ShareBar';

/* ─── Share constants ─────────────────────────────────────────────────────── */

const EMBED_URL = 'https://4billionyearson.org/climate/enso/embed/past-events';
const EMBED_CODE = `<iframe\n  src="${EMBED_URL}"\n  width="100%" height="750"\n  style="border:none;"\n  title="ENSO Past Major Events - 4 Billion Years On"\n></iframe>`;

/* ─── Styling ─────────────────────────────────────────────────────────────── */

const ACCENT = '#D0A65E';
const TT_CONTENT = { backgroundColor: '#0f172a', border: `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 12, color: '#f3f4f6' } as const;
const TT_LABEL = { color: '#ffffff', fontWeight: 600, marginBottom: 4 } as const;
const TT_ITEM = { color: '#e5e7eb' } as const;
const TT_CURSOR = { fill: 'rgba(208,166,94,0.08)' } as const;

const fmtSigned = (v: number, d = 2) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

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

export default function PastEventsSection() {
  return (
    <SectionCard
      icon={<History className="text-[#D0A65E]" />}
      title="What Happened Last Time?"
      subtitle="The eight most consequential ENSO events since 1980. Bar height shows peak ONI; colour shows phase."
    >
      {/* Mini bar chart of peak amplitudes */}
      <div className="h-[200px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={PAST_EVENTS.map((e) => ({ ...e, label: `${e.start.slice(0, 4)}-${e.end.slice(2, 4)}` }))}
            margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} />
            <YAxis stroke="#9CA3AF" fontSize={10} width={40} domain={[-3, 3]} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
            <Tooltip
              contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} cursor={TT_CURSOR}
              formatter={(v: any) => [typeof v === 'number' ? `${fmtSigned(v, 1)}°C peak ONI` : '-', '']}
            />
            <ReferenceLine y={0.5} stroke="#f43f5e" strokeDasharray="3 3" />
            <ReferenceLine y={-0.5} stroke="#0ea5e9" strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="#6B7280" />
            <Bar dataKey="peakOni" isAnimationActive={false}>
              {PAST_EVENTS.map((e, i) => (
                <Cell key={i} fill={e.phase === 'el-nino' ? '#f43f5e' : '#0ea5e9'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Event timeline cards */}
      <div className="space-y-3">
        {PAST_EVENTS.slice().reverse().map((e) => {
          const phaseAccent = e.phase === 'el-nino' ? 'border-l-rose-500/70' : 'border-l-sky-400/70';
          const phaseText = e.phase === 'el-nino' ? 'text-rose-300' : 'text-sky-300';
          const phaseSlug = e.phase === 'el-nino' ? 'el-nino' : 'la-nina';
          const anchorId = `${phaseSlug}-${e.start.slice(0, 4)}-${e.end.slice(2, 4)}`;
          return (
            <div
              key={`${e.start}-${e.end}`}
              id={anchorId}
              className={`scroll-mt-24 rounded-xl border border-gray-700/50 bg-gray-800/60 border-l-4 ${phaseAccent} p-4`}
            >
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className={`text-base font-bold font-mono ${phaseText}`}>
                  {e.start.slice(0, 4)}-{e.end.slice(0, 4)} {e.phase === 'el-nino' ? 'El Niño' : 'La Niña'}
                </p>
                <span className="text-xs font-mono text-gray-400 capitalize">
                  {e.strength} <span className="normal-case">· Peak ONI {fmtSigned(e.peakOni, 1)}°C</span>
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-1">{e.summary}</p>
              <ul className="mt-2 space-y-0.5 text-xs text-gray-400 list-disc pl-5">
                {e.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <ShareBar
        pageUrl="https://4billionyearson.org/climate/enso#past-events"
        shareText={encodeURIComponent('The biggest El Nino / La Nina events since 1980 - ENSO Tracker')}
        emailSubject="The biggest El Nino / La Nina events since 1980 - ENSO Tracker"
        embedUrl={EMBED_URL}
        embedCode={EMBED_CODE}
      />
    </SectionCard>
  );
}
