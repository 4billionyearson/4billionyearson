import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { StatusPill } from '@/lib/plug-in-solar/types';

/**
 * Headline 4-pill status dashboard, fully server-rendered so AI / search
 * crawlers see the current "Legal? / Products? / SEG? / DNO?" verdicts on
 * first byte.
 */
export function StatusDashboard({ pills }: { pills: StatusPill[] | undefined }) {
  if (!pills || pills.length === 0) {
    return (
      <section className="rounded-2xl border border-[#D2E369]/30 bg-gray-950/70 px-4 py-3 text-sm text-gray-400">
        Live status dashboard regenerating - refresh in a moment.
      </section>
    );
  }
  return (
    <section
      aria-label="Current UK plug-in solar status dashboard"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {pills.map((p) => (
        <Pill key={p.label} pill={p} />
      ))}
    </section>
  );
}

function Pill({ pill }: { pill: StatusPill }) {
  const { tone, Icon, verdict } = toneFor(pill.status);
  return (
    <div
      className={
        'rounded-2xl border px-4 py-3 backdrop-blur-md shadow-lg ' +
        'bg-gray-950/80 ' +
        tone.border
      }
    >
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
            {pill.label}
          </div>
          <div className={`text-base font-bold ${tone.verdict}`}>{verdict}</div>
          <p className="mt-1 text-xs text-gray-300 leading-snug">{pill.reason}</p>
          {pill.asOf && (
            <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">
              As of {formatAsOf(pill.asOf)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatAsOf(asOf: string): string {
  try {
    const d = new Date(asOf);
    if (Number.isNaN(d.getTime())) return asOf;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return asOf;
  }
}

function toneFor(status: string) {
  switch (status) {
    case 'legal':
    case 'yes':
      return {
        Icon: CheckCircle2,
        verdict: status === 'legal' ? 'Legal' : 'Yes',
        tone: {
          border: 'border-emerald-500/40',
          icon: 'text-emerald-400',
          verdict: 'text-emerald-300',
        },
      };
    case 'partial':
      return {
        Icon: AlertTriangle,
        verdict: 'Partial',
        tone: {
          border: 'border-amber-500/40',
          icon: 'text-amber-400',
          verdict: 'text-amber-300',
        },
      };
    case 'soon':
      return {
        Icon: Clock,
        verdict: 'Soon',
        tone: {
          border: 'border-sky-500/40',
          icon: 'text-sky-400',
          verdict: 'text-sky-300',
        },
      };
    case 'not-legal':
    case 'no':
      return {
        Icon: XCircle,
        verdict: status === 'not-legal' ? 'Not legal' : 'No',
        tone: {
          border: 'border-rose-500/40',
          icon: 'text-rose-400',
          verdict: 'text-rose-300',
        },
      };
    default:
      return {
        Icon: AlertTriangle,
        verdict: status,
        tone: {
          border: 'border-gray-500/40',
          icon: 'text-gray-400',
          verdict: 'text-gray-300',
        },
      };
  }
}
