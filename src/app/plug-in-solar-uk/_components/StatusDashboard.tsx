import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { StatusPill } from '@/lib/plug-in-solar/types';

/**
 * Headline 4-pill status dashboard, fully server-rendered so AI / search
 * crawlers see the current "Legal? / Products? / SEG? / DNO?" verdicts on
 * first byte. Uses translucent status-coloured backgrounds so the verdict
 * is visible at a glance without reading the words.
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
  const t = toneFor(pill.status);
  const Icon = t.Icon;
  return (
    <div
      className={`rounded-2xl border-2 ${t.border} ${t.bg} backdrop-blur-md shadow-lg px-4 py-3 flex flex-col gap-2`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${t.label}`}>
          {pill.label}
        </div>
        <span className={`grid h-8 w-8 place-items-center rounded-full ${t.iconBg}`}>
          <Icon className="h-4.5 w-4.5" style={{ width: '1.1rem', height: '1.1rem' }} />
        </span>
      </div>
      <div className={`text-xl font-extrabold leading-none ${t.verdict}`}>{t.verdictText}</div>
      <p className="text-xs text-[#FFF5E7] leading-snug">{pill.reason}</p>
      {pill.asOf && (
        <p className={`text-[10px] uppercase tracking-wider font-mono ${t.asOf}`}>
          Verified {formatAsOf(pill.asOf)}
        </p>
      )}
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

interface ToneSpec {
  Icon: typeof CheckCircle2;
  verdictText: string;
  bg: string;
  border: string;
  iconBg: string;
  label: string;
  verdict: string;
  asOf: string;
}

function toneFor(status: string): ToneSpec {
  switch (status) {
    case 'legal':
    case 'yes':
      return {
        Icon: CheckCircle2,
        verdictText: status === 'legal' ? 'Legal' : 'Yes',
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-400/60',
        iconBg: 'bg-emerald-400 text-emerald-950',
        label: 'text-emerald-300',
        verdict: 'text-emerald-200',
        asOf: 'text-emerald-300/80',
      };
    case 'partial':
      return {
        Icon: AlertTriangle,
        verdictText: 'Partially',
        // Higher opacity so the orange punches through the gray-950 backdrop.
        bg: 'bg-orange-500/55',
        border: 'border-orange-400',
        iconBg: 'bg-orange-300 text-orange-950',
        label: 'text-orange-100',
        verdict: 'text-white',
        asOf: 'text-orange-100/90',
      };
    case 'soon':
      return {
        Icon: Clock,
        verdictText: 'Soon',
        bg: 'bg-sky-500/15',
        border: 'border-sky-400/60',
        iconBg: 'bg-sky-400 text-sky-950',
        label: 'text-sky-300',
        verdict: 'text-sky-200',
        asOf: 'text-sky-300/80',
      };
    case 'not-legal':
    case 'no':
      return {
        Icon: XCircle,
        verdictText: status === 'not-legal' ? 'Not legal' : 'No',
        bg: 'bg-rose-500/15',
        border: 'border-rose-400/60',
        iconBg: 'bg-rose-400 text-rose-950',
        label: 'text-rose-300',
        verdict: 'text-rose-200',
        asOf: 'text-rose-300/80',
      };
    default:
      return {
        Icon: AlertTriangle,
        verdictText: status,
        bg: 'bg-gray-500/15',
        border: 'border-gray-400/40',
        iconBg: 'bg-gray-400 text-gray-950',
        label: 'text-gray-300',
        verdict: 'text-gray-200',
        asOf: 'text-gray-400',
      };
  }
}
