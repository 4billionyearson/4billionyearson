'use client';

import { useMemo, useState } from 'react';
import { Battery, Sun, Moon, Zap, Sparkles } from 'lucide-react';
import type { PriceSnapshot } from '@/lib/plug-in-solar/types';

/**
 * Three-track battery payback calculator. Each track answers a real
 * household question:
 *  1. Solar + battery: store today's plug-in solar generation for the
 *     evening peak.
 *  2. Battery-only on Octopus Flux: charge cheap overnight, discharge
 *     during the 4-7 pm peak.
 *  3. Battery-only off-peak charging: simpler version of (2) using any
 *     economy 7-style off-peak window.
 *
 * Numbers from the daily Gemini snapshot - fall back to sensible
 * defaults if the snapshot is unavailable.
 */
export function BatteryCalculator({ prices }: { prices: PriceSnapshot | undefined }) {
  const unitRate = prices?.unitRate_pPerKWh ?? 24.5;
  const fluxImport = prices?.fluxImport_pPerKWh ?? 41.0;
  const fluxExport = prices?.fluxExport_pPerKWh ?? 30.0;
  const fluxOffPeak = prices?.fluxOffPeak_pPerKWh ?? 9.0;

  return (
    <section
      aria-labelledby="battery-heading"
      className="rounded-2xl border-2 border-[#D2E369] shadow-xl flex flex-col h-full"
      style={{
        background:
          'linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)',
      }}
    >
      <div
        className="px-5 py-3 md:px-6 md:py-4 rounded-t-[14px]"
        style={{ backgroundColor: '#D2E369' }}
      >
        <h2 id="battery-heading" className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#2C5263] flex items-center gap-2">
          <Battery className="h-5 w-5" />
          Batteries: with or without solar
        </h2>
      </div>
      <div className="flex-1 bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-b-[14px] space-y-5">
        <p className="text-sm text-gray-300 leading-relaxed">
          Batteries are interesting in the UK even <em>without</em> solar. With a time-of-use tariff
          like Octopus Flux you can charge cheaply overnight and either run your home from the
          battery during the peak window, or sell back to the grid at a much higher rate. Below are
          three worked examples - choose the one that matches your situation.
        </p>

        <Track
          number={1}
          title="Solar + battery"
          icon={<Sun className="h-5 w-5" />}
          description="A small battery captures sunshine you would otherwise have exported for free, and lets you use it in the evening - shifting up to twice as much of your generation into useful self-consumption."
          modeKey="solar-plus-battery"
          unitRate={unitRate}
          fluxImport={fluxImport}
          fluxExport={fluxExport}
          fluxOffPeak={fluxOffPeak}
        />
        <Track
          number={2}
          title="Battery-only on Octopus Flux"
          icon={<Sparkles className="h-5 w-5" />}
          description="No solar panels at all. Charge the battery from the grid at the cheapest 5-hour window (around 9 p/kWh), then either run the house off it during the 4-7 pm peak (avoiding 41 p/kWh import) or sell it back to Flux at the peak export rate."
          modeKey="flux-arbitrage"
          unitRate={unitRate}
          fluxImport={fluxImport}
          fluxExport={fluxExport}
          fluxOffPeak={fluxOffPeak}
        />
        <Track
          number={3}
          title="Battery-only off-peak charging"
          icon={<Moon className="h-5 w-5" />}
          description="Simpler still: any time-of-use tariff with a cheap overnight rate. Charge the battery during off-peak, run the house from it during the day. No export needed - the saving comes from displacing daytime peak imports."
          modeKey="off-peak-charging"
          unitRate={unitRate}
          fluxImport={fluxImport}
          fluxExport={fluxExport}
          fluxOffPeak={fluxOffPeak}
        />
      </div>
    </section>
  );
}

type Mode = 'solar-plus-battery' | 'flux-arbitrage' | 'off-peak-charging';

function Track({
  number,
  title,
  icon,
  description,
  modeKey,
  unitRate,
  fluxImport,
  fluxExport,
  fluxOffPeak,
}: {
  number: number;
  title: string;
  icon: React.ReactNode;
  description: string;
  modeKey: Mode;
  unitRate: number;
  fluxImport: number;
  fluxExport: number;
  fluxOffPeak: number;
}) {
  const [batteryKWh, setBatteryKWh] = useState(modeKey === 'solar-plus-battery' ? 2 : 5);
  const [batteryCost, setBatteryCost] = useState(modeKey === 'solar-plus-battery' ? 700 : 2500);
  const [cyclesPerYear, setCyclesPerYear] = useState(modeKey === 'solar-plus-battery' ? 200 : 340);

  const calc = useMemo(() => {
    const kWhPerYear = batteryKWh * cyclesPerYear; // simple round-trip energy through the pack
    let savingP = 0; // pence per cycle through the pack (per kWh)
    let label = '';
    let detail = '';
    if (modeKey === 'solar-plus-battery') {
      // Without battery: surplus is exported for free (no SEG yet for plug-in solar) -> 0 p/kWh
      // With battery: surplus is self-consumed at the unit rate -> unitRate p/kWh saved
      savingP = unitRate;
      label = 'Self-consumed instead of free export';
      detail = `Each kWh stored avoids paying ${unitRate.toFixed(1)} p/kWh from the grid in the evening (currently no SEG is paid for plug-in solar exports).`;
    } else if (modeKey === 'flux-arbitrage') {
      // Charge at flux off-peak, discharge mainly to grid at peak export.
      // Conservative: 50% of cycles dispatched to grid (at fluxExport), 50% used in-home (avoiding fluxImport).
      const dispatchToGrid = (fluxExport - fluxOffPeak);
      const dispatchInHome = (fluxImport - fluxOffPeak);
      savingP = (dispatchToGrid + dispatchInHome) / 2;
      label = 'Avg of in-home displacement and Flux peak export';
      detail = `Half of each cycle assumed exported to grid at ${fluxExport.toFixed(1)} p/kWh, half used in-home displacing ${fluxImport.toFixed(1)} p/kWh peak imports - both bought at the ${fluxOffPeak.toFixed(1)} p/kWh off-peak rate.`;
    } else {
      // Off-peak only: avoid daytime peak imports. Use unitRate (price cap) as proxy for daytime rate.
      savingP = unitRate - fluxOffPeak;
      label = 'Daytime peak avoided';
      detail = `Each kWh is bought at the ${fluxOffPeak.toFixed(1)} p/kWh off-peak rate, then used in the day instead of paying the ${unitRate.toFixed(1)} p/kWh standard tariff.`;
    }
    const annualSavingGBP = (kWhPerYear * savingP) / 100;
    const paybackYears = annualSavingGBP > 0 ? batteryCost / annualSavingGBP : Infinity;
    return { kWhPerYear, savingP, annualSavingGBP, paybackYears, label, detail };
  }, [batteryKWh, batteryCost, cyclesPerYear, modeKey, unitRate, fluxImport, fluxExport, fluxOffPeak]);

  return (
    <article className="rounded-xl border border-[#D2E369]/20 bg-gray-900/40 p-4">
      <header className="flex items-start gap-3 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D2E369] bg-[#D2E369]/10 text-[#D2E369]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Track {number}</div>
          <h3 className="text-base font-semibold text-[#FFF5E7]">{title}</h3>
        </div>
      </header>
      <p className="text-sm text-gray-300 leading-relaxed mb-3">{description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <NumField label="Battery (kWh)" value={batteryKWh} setValue={setBatteryKWh} step={0.5} min={0.5} max={20} />
        <NumField label="Battery cost (£)" value={batteryCost} setValue={setBatteryCost} step={50} min={0} max={20000} />
        <NumField label="Cycles per year" value={cyclesPerYear} setValue={setCyclesPerYear} step={10} min={50} max={365} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Mini label="Energy through pack" value={`${calc.kWhPerYear.toLocaleString('en-GB')} kWh/yr`} />
        <Mini label="Saving per kWh" value={`${calc.savingP.toFixed(1)} p`} />
        <Mini
          label="Payback"
          value={calc.paybackYears === Infinity ? '—' : `${calc.paybackYears.toFixed(1)} yr`}
          accent
        />
      </div>
      <p className="mt-2 text-xs text-gray-300">
        Annual saving <span className="font-semibold text-[#D2E369]">£{calc.annualSavingGBP.toFixed(0)}</span>. {calc.detail}
      </p>
      <p className="mt-1 text-[11px] text-gray-500 italic">Worked example assumes {calc.label}. Round-trip efficiency and battery degradation will reduce real-world figures by ~10-15%.</p>
    </article>
  );
}

function NumField({
  label,
  value,
  setValue,
  step = 1,
  min = 0,
  max = 1000,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
        <Zap className="h-3 w-3 text-[#D2E369]" />
        {label}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => setValue(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-[#FFF5E7] focus:border-[#D2E369] outline-none"
      />
    </label>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border ${accent ? 'border-[#D2E369]/40 bg-[#D2E369]/10' : 'border-gray-700 bg-gray-900/60'} px-3 py-1.5`}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`text-base font-semibold ${accent ? 'text-[#D2E369]' : 'text-[#FFF5E7]'}`}>{value}</div>
    </div>
  );
}
