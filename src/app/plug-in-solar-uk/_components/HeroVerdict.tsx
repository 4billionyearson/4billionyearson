import {
  CheckCircle2,
  AlertTriangle,
  PoundSterling,
  Plug,
  TrendingDown,
  Zap,
  ArrowRight,
  Sun,
  Battery,
  RefreshCw,
} from 'lucide-react';
import type { PlugInSolarLiveData } from '@/lib/plug-in-solar/types';

/**
 * Top-of-page "answer the four big questions in 5 seconds" panel.
 * Mirrors the dashboard pattern used on energy-dashboard: large numbers,
 * status colours, minimal text. Server-rendered for SEO/AI crawlers.
 *
 * Pulls live values where available (legal status from statusDashboard,
 * cheapest UK kit price from products) and falls back to safe defaults
 * sourced from gov.uk modelling. The 800 W limit is constant.
 */
export function HeroVerdict({ data }: { data: PlugInSolarLiveData | null }) {
  const legalPill = data?.statusDashboard?.find(
    (p) => p.label.toLowerCase().includes('legal')
  );
  const isLegal = legalPill?.status === 'legal' || legalPill?.status === 'yes';
  const isPartial = legalPill?.status === 'partial';

  const cheapestKitGBP = data?.products?.length
    ? Math.round(Math.min(...data.products.map((p) => p.priceGBP)))
    : 400;

  // Annual saving estimate using live unit rate when available.
  const unitRate = data?.prices?.unitRate_pPerKWh ?? 25.5;
  const annualKWh = 600;
  const annualSavingLow = Math.round(((unitRate - 4) * annualKWh) / 100);
  const annualSavingHigh = Math.round(((unitRate + 1.5) * annualKWh) / 100);
  const paybackYears = Math.round((cheapestKitGBP / annualSavingHigh) * 10) / 10;

  return (
    <section
      aria-label="UK plug-in solar at a glance"
      className="rounded-2xl border-2 border-[#D2E369] bg-gray-950/90 backdrop-blur-md shadow-xl overflow-hidden"
    >
      <div className="px-5 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3" style={{ backgroundColor: '#D2E369' }}>
        <h2 className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#2C5263] flex items-center gap-2">
          <Zap className="h-5 w-5" />
          The 5-second verdict
        </h2>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#2C5263] px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-[#D2E369]">
          <RefreshCw className="h-3 w-3" />
          Refreshed {formatToday(data?.generatedAt)}
        </span>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* The four big answer cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1 - Legal? */}
          <VerdictCard
            label="Legal in the UK?"
            tone={isLegal ? 'green' : isPartial ? 'orange' : 'rose'}
            icon={isLegal ? <CheckCircle2 className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
            big={isLegal ? 'Yes' : isPartial ? 'Partial' : 'No'}
            sub={isLegal ? 'Sub-800 W kits, since Apr 2026' : 'See timeline below'}
          />

          {/* 2 - How much? */}
          <VerdictCard
            label="How much?"
            tone="lime"
            icon={<PoundSterling className="h-7 w-7" />}
            big={`From £${cheapestKitGBP}`}
            sub={`Typical 800 W kit · approx. £${annualSavingLow}-${annualSavingHigh}/yr saving`}
          />

          {/* 3 - Can I install today? */}
          <VerdictCard
            label="Can I install today?"
            tone={isLegal ? 'green' : 'orange'}
            icon={<Plug className="h-7 w-7" />}
            big={isLegal ? 'Yes' : 'Soon'}
            sub="Buy → plug in → notify your DNO (G98)"
          />

          {/* 4 - Payback */}
          <VerdictCard
            label="Payback period"
            tone="lime"
            icon={<TrendingDown className="h-7 w-7" />}
            big={`~${paybackYears} yrs`}
            sub="Self-consumed only (no SEG yet)"
          />
        </div>

        {/* The 800W limit hero strip - applies across all three configurations */}
        <div className="rounded-xl border-2 border-[#D2E369]/50 bg-gradient-to-r from-[#D2E369]/15 via-[#D2E369]/5 to-transparent p-4">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#D2E369] text-[#2C5263]">
              <span className="font-mono font-extrabold text-lg leading-none">800</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#D2E369]">
                The legal limit
              </div>
              <div className="text-sm md:text-base text-[#FFF5E7] font-semibold leading-tight">
                <span className="text-[#D2E369]">800 W AC</span> max output per home, via a
                standard 13&nbsp;A socket
              </div>
              <div className="mt-0.5 text-xs text-gray-400 leading-snug">
                Panels can total more on the DC side – the micro-inverter clips output to 800 W
                AC. The same limit applies whether you have solar, a battery, or both.
              </div>
            </div>
          </div>

          {/* Three use-case ticks showing the 800 W limit covers all setups */}
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <UseCaseTick icons={[<Sun key="s" className="h-4 w-4 text-[#FFE066]" />]} label="Solar only" />
            <UseCaseTick
              icons={[
                <Sun key="s" className="h-4 w-4 text-[#FFE066]" />,
                <span key="plus" className="text-gray-400 text-xs font-mono">+</span>,
                <Battery key="b" className="h-4 w-4 text-[#D2E369]" />,
              ]}
              label="Solar + battery"
            />
            <UseCaseTick
              icons={[<Battery key="b" className="h-4 w-4 text-[#D2E369]" />]}
              label="Battery only"
            />
          </ul>
        </div>

        {/* Inline legend / jump links */}
        <div className="flex flex-wrap gap-2 text-xs">
          <JumpLink href="#install" label="Install steps" />
          <JumpLink href="#payback" label="Payback calculator" />
          <JumpLink href="#products" label="UK kits today" />
          <JumpLink href="#news" label="Latest news" />
        </div>
      </div>
    </section>
  );
}

function formatToday(generatedAt: string | undefined): string {
  const d = generatedAt ? new Date(generatedAt) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Tone = 'green' | 'orange' | 'rose' | 'lime' | 'sky';

function VerdictCard({
  label,
  tone,
  icon,
  big,
  sub,
}: {
  label: string;
  tone: Tone;
  icon: React.ReactNode;
  big: string;
  sub: string;
}) {
  const toneStyles: Record<Tone, { bg: string; border: string; iconBg: string; bigText: string; subText: string; labelText: string }> = {
    green: {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-400/60',
      iconBg: 'bg-emerald-400 text-emerald-950',
      bigText: 'text-emerald-200',
      subText: 'text-emerald-100/80',
      labelText: 'text-emerald-300',
    },
    orange: {
      // Vivid orange. Lower opacities (/25) muddied to brown over the dark
      // gray-950 backdrop; /60 gives a clearly orange surface.
      bg: 'bg-orange-500/60',
      border: 'border-orange-400',
      iconBg: 'bg-orange-300 text-orange-950',
      bigText: 'text-white',
      subText: 'text-orange-50',
      labelText: 'text-orange-100',
    },
    rose: {
      bg: 'bg-rose-500/15',
      border: 'border-rose-400/60',
      iconBg: 'bg-rose-400 text-rose-950',
      bigText: 'text-rose-200',
      subText: 'text-rose-100/80',
      labelText: 'text-rose-300',
    },
    lime: {
      bg: 'bg-[#D2E369]/15',
      border: 'border-[#D2E369]/60',
      iconBg: 'bg-[#D2E369] text-[#2C5263]',
      bigText: 'text-[#FFF5E7]',
      subText: 'text-gray-300',
      labelText: 'text-[#D2E369]',
    },
    sky: {
      bg: 'bg-sky-500/15',
      border: 'border-sky-400/60',
      iconBg: 'bg-sky-400 text-sky-950',
      bigText: 'text-sky-200',
      subText: 'text-sky-100/80',
      labelText: 'text-sky-300',
    },
  };
  const s = toneStyles[tone];
  return (
    <div className={`rounded-xl border-2 ${s.border} ${s.bg} p-3 md:p-4 flex flex-col gap-2 min-h-[120px]`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] md:text-[11px] font-mono uppercase tracking-wider font-semibold ${s.labelText}`}>
          {label}
        </span>
        <span className={`grid h-9 w-9 place-items-center rounded-full shrink-0 ${s.iconBg}`}>
          {icon}
        </span>
      </div>
      <div className={`text-2xl md:text-3xl font-extrabold leading-none ${s.bigText}`}>{big}</div>
      <div className={`text-xs leading-snug ${s.subText}`}>{sub}</div>
    </div>
  );
}

function UseCaseTick({ icons, label }: { icons: React.ReactNode[]; label: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-emerald-950 shrink-0">
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="flex items-center gap-1 shrink-0">{icons}</span>
      <span className="text-xs font-semibold text-[#FFF5E7] truncate">{label}</span>
    </li>
  );
}

function JumpLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-[#D2E369]/40 bg-[#D2E369]/5 px-3 py-1 text-[#D2E369] hover:bg-[#D2E369]/15 transition-colors"
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </a>
  );
}
