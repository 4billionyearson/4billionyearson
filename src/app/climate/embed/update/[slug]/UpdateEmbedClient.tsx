"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import ClimateRankPill from '@/app/_components/climate-rank-pill';
import GlobalRankingsTeaser from '@/app/_components/global-rankings-teaser';
import { getRegionBySlug } from '@/lib/climate/regions';
import { renderWithDriverTooltips, relabelSummaryHeading } from '@/lib/climate/driver-annotator';

interface SummaryResponse {
  summary: string | null;
  sources?: { title: string; uri: string }[];
  message?: string;
  retryable?: boolean;
  source?: string;
}

function highlightRankings(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sup = 'warmest|coldest|hottest|coolest|wettest|driest|sunniest|highest|lowest|fewest|most|least';
  const supNoMost = 'warmest|coldest|hottest|coolest|wettest|driest|sunniest|highest|lowest|fewest|least';
  const wordOrd = 'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth';
  const w = `(?:\\s+(?!on\\s+record|in\\s+\\d|of\\s+\\d+\\s*year|of\\s+\\d+[.,°]|at\\s+\\d|with\\s+\\d|averaging\\s)(?:[a-zA-Z][a-zA-Z'\\u2019-]*|\\d+[-\\u2013]\\w+))*`;
  const rec = '(?:\\s+(?:on record|in \\d+ years?(?:\\s+of records?)?|of \\d+ years?(?:\\s+on record)?))?';
  const p1 = `(?:\\d+(?:st|nd|rd|th)|${wordOrd})\\s+(?:${sup})\\b${w}${rec}`;
  const p2 = `the\\s+(?:${supNoMost})\\b${w}\\s+(?:on record|in \\d+ years?(?:\\s+of records?)?|of \\d+ years?(?:\\s+on record)?)`;
  const re = new RegExp(`\\b(?:${p1}|${p2})`, 'gi');
  return escaped.replace(re, (m) => `<strong class="text-white">${m}</strong>`);
}

export default function UpdateEmbedClient({ slug, regionName, monthLabel }: { slug: string; regionName: string; monthLabel?: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isGlobal = slug === 'global';

  const { coverageLine, coverageLabel } = useMemo(() => {
    const region = isGlobal ? null : getRegionBySlug(slug);
    if (!region) return { coverageLine: null as string | null, coverageLabel: null as string | null };
    const places = region.coveragePlaces;
    const line = places?.length
      ? places.slice(0, -1).join(', ') + (places.length > 1 ? `${places.length > 2 ? ',' : ''} and ${places[places.length - 1]}` : '')
      : null;
    const label =
      region.slug === 'uk' ? 'Coverage:' :
      region.slug === 'usa' ? 'Key States:' :
      region.type === 'country' ? 'Top 5 Cities:' :
      region.type === 'us-state' ? 'Top 5 Cities:' :
      'City Coverage:';
    return { coverageLine: line, coverageLabel: label };
  }, [slug, isGlobal]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/climate/summary/${slug}?_t=${Date.now()}`);
        const payload: SummaryResponse | null = await res.json().catch(() => null);
        if (cancelled) return;
        if (payload?.summary) {
          setSummary(payload.summary);
          setSources(payload.sources || []);
        } else {
          setError(payload?.message || 'Climate update temporarily unavailable.');
        }
      } catch {
        if (!cancelled) setError('Climate update could not be loaded right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div
      className="rounded-2xl border-2 border-[#D0A65E] shadow-xl overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}
    >
      <div className="px-4 py-3 md:px-5 md:py-4" style={{ backgroundColor: '#D0A65E' }}>
        <h1 className="text-xl md:text-2xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#FFF5E7' }}>
          {regionName} Climate{monthLabel ? ` – ${monthLabel} Update` : ' Update'}
        </h1>
      </div>
      <div className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5">
        {coverageLine && (
          <div className="inline-flex items-start gap-2 mb-3 px-3 py-2 rounded-lg border border-[#D0A65E]/30 bg-[#D0A65E]/5">
            <MapPin className="h-4 w-4 text-[#D0A65E] mt-0.5 shrink-0" />
            <p className="text-xs md:text-sm font-medium text-[#D0A65E]">
              {coverageLabel ? <span className="font-semibold">{coverageLabel} </span> : null}
              {coverageLine}
            </p>
          </div>
        )}
        <div className="mb-3">
          {isGlobal ? <GlobalRankingsTeaser /> : <ClimateRankPill slug={slug} />}
        </div>
      {loading && (
        <div className="flex items-center gap-3 py-4 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin text-[#D0A65E]" />
          <span>Generating update…</span>
        </div>
      )}
      {!loading && summary && (
        <div className="text-gray-300 text-sm leading-relaxed space-y-3">
          {summary.split('\n\n').map((para, i) => {
            const trimmed = para.trim();
            const headingMatch = trimmed.match(/^##\s+(.+?)(?:\n([\s\S]*))?$/);
            if (headingMatch) {
              const heading = relabelSummaryHeading(headingMatch[1].trim());
              const body = (headingMatch[2] || '').trim();
              return (
                <div key={i} className="space-y-1.5">
                  <h3 className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-[#D0A65E]">{heading}</h3>
                  {body && <p>{renderWithDriverTooltips(body, highlightRankings)}</p>}
                </div>
              );
            }
            return <p key={i}>{renderWithDriverTooltips(trimmed, highlightRankings)}</p>;
          })}
        </div>
      )}
      {!loading && !summary && error && (
        <p className="text-sm text-amber-300">{error}</p>
      )}
      {sources.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-800">
          <p className="text-gray-600 text-xs mb-1">Sources:</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {sources.map((s, i) => (
              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-[#D0A65E]">{s.title} ↗</a>
            ))}
          </div>
        </div>
      )}
      <p className="text-gray-600 text-[11px] mt-2 italic">Generated by Gemini from climate data and web sources</p>
      </div>
    </div>
  );
}
