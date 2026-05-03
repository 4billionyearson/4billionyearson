'use client';

import { useState } from 'react';
import { CloudRain, Globe2, MapPin, Sun, Thermometer } from 'lucide-react';
import { REGION_IMPACTS, type ImpactPhase } from '@/lib/climate/enso-impacts';
import type { EnsoSnapshot } from '../types';
import ShareBar from './ShareBar';

/* ─── Share constants ─────────────────────────────────────────────────────── */

const EMBED_URL = 'https://4billionyearson.org/climate/enso/embed/impacts';
const EMBED_CODE = `<iframe\n  src="${EMBED_URL}"\n  width="100%" height="900"\n  style="border:none;"\n  title="ENSO Regional Weather Impacts - 4 Billion Years On"\n></iframe>`;

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

export default function ImpactsSection({ data }: { data: EnsoSnapshot }) {
  const [phase, setPhase] = useState<ImpactPhase>('el-nino');
  const [continentFilter, setContinentFilter] = useState('All');

  const oni = data.oni;

  return (
    <div className="space-y-4">
      {/* ── Region impacts card ─────────────────────────────────────────── */}
      <SectionCard
        icon={<Globe2 className="text-[#D0A65E]" />}
        title="Impact on World Weather"
        subtitle="Typical regional response per phase. Probabilities = how often the impact occurs when the phase is active."
      >
        {/* Phase pill toggle */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {([
            { id: 'el-nino' as const, label: 'El Niño Impacts' },
            { id: 'la-nina' as const, label: 'La Niña Impacts' },
          ]).map((p) => {
            const isActive = phase === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhase(p.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-[12px] sm:text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]'
                    : 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]'
                }`}
              >
                <span>{p.label}</span>
              </button>
            );
          })}
          <span className="text-[11px] text-gray-500 ml-1 sm:ml-2">
            Currently active: <span className={oni ? ENSO_TEXT_CLS[oni.state] : 'text-gray-300'}>{oni?.state || '-'}</span>
          </span>
        </div>

        {/* Continent filter pills */}
        <div className="border-t border-gray-800/80 pt-4 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Africa', 'Asia', 'Europe', 'N. America', 'C. America', 'S. America', 'Oceania', 'Pacific Is.'].map((c) => {
              const active = continentFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContinentFilter(c)}
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors ${
                    active
                      ? 'border-[#D0A65E]/55 bg-[#D0A65E]/10 text-[#FFF5E7]'
                      : 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Region cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REGION_IMPACTS.filter((r) => continentFilter === 'All' || r.continent === continentFilter)
            .filter((r) => r.impacts[phase] && (r.impacts[phase]!.temp || r.impacts[phase]!.precip))
            .map((r) => {
              const imp = r.impacts[phase]!;
              const tempColor = imp.temp === 'warmer' ? 'text-rose-300 bg-rose-900/30 border-rose-700/40' : imp.temp === 'cooler' ? 'text-sky-300 bg-sky-900/30 border-sky-700/40' : '';
              const precipColor = imp.precip === 'wetter' ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700/40' : imp.precip === 'drier' ? 'text-amber-300 bg-amber-900/30 border-amber-700/40' : '';
              const accent = phase === 'el-nino'
                ? 'border-l-4 border-l-rose-500/70 border border-gray-700/50 bg-gray-800/60 hover:border-[#D0A65E]/45'
                : 'border-l-4 border-l-sky-400/70 border border-gray-700/50 bg-gray-800/60 hover:border-[#D0A65E]/45';
              return (
                <div key={r.id} className={`group flex flex-col rounded-xl p-3.5 transition-all duration-200 ${accent}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-[#D0A65E]" aria-hidden />
                    <h4 className="flex-1 min-w-0 text-sm font-semibold text-[#FFF5E7] leading-tight truncate">
                      {r.region}
                    </h4>
                    <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-700/50 border border-gray-600/50 text-gray-300">
                      {imp.season}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">{r.continent} · {r.area}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {imp.temp && (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${tempColor} inline-flex items-center gap-1`}>
                        {imp.temp === 'warmer' ? <Sun className="h-3 w-3" /> : <Thermometer className="h-3 w-3" />}
                        {imp.temp}
                      </span>
                    )}
                    {imp.precip && (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${precipColor} inline-flex items-center gap-1`}>
                        <CloudRain className="h-3 w-3" />
                        {imp.precip}
                      </span>
                    )}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-900/60 border border-gray-700/50 text-gray-300">
                      ~{Math.round(imp.prob * 100)}% chance
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{imp.notes}</p>
                </div>
              );
            })}
        </div>
        <ShareBar
          pageUrl="https://4billionyearson.org/climate/enso#impacts"
          shareText={encodeURIComponent('El Nino / La Nina regional weather impacts - ENSO Tracker')}
          emailSubject="El Nino / La Nina regional weather impacts - ENSO Tracker"
          embedUrl={EMBED_URL}
          embedCode={EMBED_CODE}
        />
      </SectionCard>
    </div>
  );
}
