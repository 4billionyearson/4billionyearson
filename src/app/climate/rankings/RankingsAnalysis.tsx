'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { renderWithDriverTooltips, relabelSummaryHeading } from '@/lib/climate/driver-annotator';

interface AnalysisResponse {
  summary: string | null;
  sources?: { title: string; uri: string }[];
  generatedAt?: string;
  source?: string;
  message?: string;
  retryable?: boolean;
}

function highlightAnomalies(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Highlight signed anomalies like +2.34°C or -1.12°C. The negative lookbehind
  // ensures we don't match the hyphen inside a range like "11-17°C" as a minus sign.
  return escaped.replace(/(?<![\d.])([+\-]\d+(?:\.\d+)?°C)/g, '<strong style="color:#fff">$1</strong>');
}

export default function RankingsAnalysis({
  initialSummary = null,
  initialSources = [],
  initialGeneratedAt = null,
  cacheMiss = false,
}: {
  initialSummary?: string | null;
  initialSources?: { title: string; uri: string }[];
  initialGeneratedAt?: string | null;
  cacheMiss?: boolean;
} = {}) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>(initialSources);
  const [loading, setLoading] = useState(initialSummary == null && !cacheMiss);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt);
  const [regenerating, setRegenerating] = useState(cacheMiss);

  const fetchAnalysis = async (forceFresh = false) => {
    setLoading(true);
    setSummary(null);
    setSources([]);
    setError(null);
    setRetryable(false);
    try {
      const url = `/api/climate/rankings-analysis?_t=${Date.now()}${forceFresh ? '&nocache=1' : ''}`;
      const res = await fetch(url);
      const payload: AnalysisResponse | null = await res.json().catch(() => null);
      if (payload?.summary) {
        setSummary(payload.summary);
        setSources(payload.sources || []);
        setGeneratedAt(payload.generatedAt || null);
        return;
      }
      setError(
        payload?.message ||
          'The monthly cross-region analysis is temporarily unavailable. The league table and roll-ups below are still live.'
      );
      setRetryable(payload?.retryable ?? payload?.source !== 'no-key');
    } catch {
      setError('The monthly cross-region analysis could not be loaded right now.');
      setRetryable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // SSR already provided a cached analysis - nothing to do.
    if (initialSummary != null) return;
    // Cache miss: warmRankingsAnalysis() in the page already kicked off a
    // background fetch + revalidatePath. Show a friendly banner instead of
    // a spinner; the next request will SSR the fresh analysis.
    if (cacheMiss) return;
    void fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="bg-gray-950/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
      <h2 className="text-xl font-bold font-mono text-white mb-3 flex items-start gap-2">
        <Sparkles className="h-5 w-5 shrink-0 text-[#D0A65E] mt-1" />
        <span className="min-w-0 flex-1">Monthly Cross-Region Analysis</span>
      </h2>

      {summary ? (
        <div>
          <div className="text-gray-300 text-sm leading-relaxed space-y-3">
            {summary.split('\n\n').map((para, i) => {
              const trimmed = para.trim();
              const headingMatch = trimmed.match(/^##\s+(.+?)(?:\n([\s\S]*))?$/);
              if (headingMatch) {
                const heading = relabelSummaryHeading(headingMatch[1].trim());
                const body = (headingMatch[2] || '').trim();
                return (
                  <div key={i} className="space-y-1.5">
                    <h3 className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-[#D0A65E]">
                      {heading}
                    </h3>
                    {body && (
                      <p>{renderWithDriverTooltips(body, highlightAnomalies)}</p>
                    )}
                  </div>
                );
              }
              return <p key={i}>{renderWithDriverTooltips(trimmed, highlightAnomalies)}</p>;
            })}
          </div>
          {sources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-800">
              <p className="text-gray-500 text-xs mb-1">Sources:</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-[#D0A65E] transition-colors"
                  >
                    {s.title} ↗
                  </a>
                ))}
              </div>
            </div>
          )}
          <p className="text-gray-500 text-xs mt-2 italic">
            Generated by Gemini from the ranking data above and web sources
            {generatedAt ? ` · ${new Date(generatedAt).toLocaleDateString('en-GB', { dateStyle: 'long' })}` : ''}
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#D0A65E] shrink-0" />
          <p className="text-sm text-gray-400">Generating monthly cross-region analysis…</p>
        </div>
      ) : regenerating ? (
        <div className="rounded-xl border border-[#D0A65E]/35 bg-[#D0A65E]/5 px-4 py-3 text-sm text-gray-200">
          <p className="mb-2">
            <strong className="text-[#FFF5E7]">Generating fresh monthly analysis…</strong> This refreshes
            with each new ranking snapshot. Reload in a minute to see the latest.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D0A65E]/55 bg-[#D0A65E]/10 px-3 py-1 text-xs font-medium text-[#FFF5E7] hover:bg-[#D0A65E]/20"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3">
          <p className="text-sm font-medium text-amber-200">Monthly analysis temporarily unavailable</p>
          <p className="mt-1 text-sm text-gray-300">
            {error || 'The AI-generated analysis is temporarily unavailable. The league table below is still live.'}
          </p>
          {retryable && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => void fetchAnalysis(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D0A65E]/40 bg-[#D0A65E]/10 px-3 py-2 text-sm font-semibold text-[#D0A65E] transition-colors hover:bg-[#D0A65E]/20 hover:text-[#E8C97A]"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
