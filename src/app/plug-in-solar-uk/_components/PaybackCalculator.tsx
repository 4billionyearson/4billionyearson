'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, MapPin, Zap, PoundSterling, TrendingUp, Loader2 } from 'lucide-react';
import type { PriceSnapshot } from '@/lib/plug-in-solar/types';
import { estimateAnnualGenerationKWh, getPostcodeArea, REGIONAL_YIELD_KWH_PER_KWP } from '../_data/static';

/**
 * Postcode-driven plug-in solar payback calculator.
 *
 * Uses an offline regional yield table by default for instant results,
 * then asynchronously calls our /api/plug-in-solar-uk/pvgis proxy (if
 * present) for postcode-accurate figures from the EU Joint Research
 * Centre's PVGIS service. Falls back gracefully when offline.
 */
export function PaybackCalculator({ prices }: { prices: PriceSnapshot | undefined }) {
  const [postcode, setPostcode] = useState('SW1A 1AA');
  const [wattsAC, setWattsAC] = useState(800);
  const [systemCost, setSystemCost] = useState(499);
  const [selfConsumption, setSelfConsumption] = useState(70);
  const [pvgisLoading, setPvgisLoading] = useState(false);
  const [pvgisYield, setPvgisYield] = useState<number | null>(null);

  const unitRate = prices?.unitRate_pPerKWh ?? 24.5;
  const postcodeArea = getPostcodeArea(postcode);
  const offlineGenKWh = estimateAnnualGenerationKWh(wattsAC, postcodeArea);
  const annualGenKWh = pvgisYield ?? offlineGenKWh;
  const yieldPerKWp = postcodeArea ? REGIONAL_YIELD_KWH_PER_KWP[postcodeArea] : undefined;

  // Self-consumed kWh save the import unit rate; the rest is "exported"
  // (currently uncompensated for plug-in solar, so we count it as zero
  // savings rather than the SEG rate, to be honest with users).
  const selfConsumedKWh = (annualGenKWh * selfConsumption) / 100;
  const annualSavingGBP = (selfConsumedKWh * unitRate) / 100;
  const paybackYears = annualSavingGBP > 0 ? systemCost / annualSavingGBP : Infinity;

  // Best-effort PVGIS lookup. Debounced 600ms after the user stops typing.
  useEffect(() => {
    if (!postcode || postcode.length < 4) return;
    const timer = setTimeout(async () => {
      setPvgisLoading(true);
      try {
        const res = await fetch(`/api/plug-in-solar-uk/pvgis?postcode=${encodeURIComponent(postcode)}&kwp=${(wattsAC / 1000).toFixed(2)}`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.annualKWh === 'number') {
            setPvgisYield(data.annualKWh);
          } else {
            setPvgisYield(null);
          }
        } else {
          setPvgisYield(null);
        }
      } catch {
        setPvgisYield(null);
      } finally {
        setPvgisLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [postcode, wattsAC]);

  const summary = useMemo(() => buildSummaryLine({ annualGenKWh, annualSavingGBP, paybackYears, postcodeArea, unitRate, hasPvgis: pvgisYield !== null }), [annualGenKWh, annualSavingGBP, paybackYears, postcodeArea, unitRate, pvgisYield]);

  return (
    <section
      aria-labelledby="payback-heading"
      className="rounded-2xl border-2 border-[#D2E369] shadow-xl"
      style={{
        background:
          'linear-gradient(to bottom, #D2E369 0%, #D2E369 20px, transparent 20px)',
      }}
    >
      <div
        className="px-5 py-3 md:px-6 md:py-4 rounded-t-[14px]"
        style={{ backgroundColor: '#D2E369' }}
      >
        <h2 id="payback-heading" className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#2C5263] flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Payback calculator
        </h2>
      </div>
      <div className="bg-gray-950/90 backdrop-blur-md p-5 md:p-6 rounded-b-[14px] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Postcode" icon={<MapPin className="h-4 w-4 text-[#D2E369]" />}>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="e.g. M1 1AA"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-[#FFF5E7] placeholder:text-gray-600 focus:border-[#D2E369] outline-none"
            />
            <div className="mt-1 text-[11px] text-gray-500 h-4">
              {pvgisLoading ? (
                <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Looking up PVGIS yield…</span>
              ) : pvgisYield !== null ? (
                <span>PVGIS estimate: {Math.round(pvgisYield)} kWh/yr</span>
              ) : yieldPerKWp ? (
                <span>Regional estimate: {yieldPerKWp} kWh per kWp/yr</span>
              ) : (
                <span>Enter a UK postcode</span>
              )}
            </div>
          </Field>

          <Field label="System size (W AC)" icon={<Zap className="h-4 w-4 text-[#D2E369]" />}>
            <input
              type="number"
              min={200}
              max={1600}
              step={100}
              value={wattsAC}
              onChange={(e) => setWattsAC(Math.max(100, Math.min(1600, Number(e.target.value) || 0)))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-[#FFF5E7] focus:border-[#D2E369] outline-none"
            />
            <div className="mt-1 text-[11px] text-gray-500 h-4">UK legal limit is 800 W per circuit</div>
          </Field>

          <Field label="System cost (£)" icon={<PoundSterling className="h-4 w-4 text-[#D2E369]" />}>
            <input
              type="number"
              min={100}
              max={3000}
              step={50}
              value={systemCost}
              onChange={(e) => setSystemCost(Math.max(0, Number(e.target.value) || 0))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-[#FFF5E7] focus:border-[#D2E369] outline-none"
            />
            <div className="mt-1 text-[11px] text-gray-500 h-4">Typical 800 W kit: £400-£800</div>
          </Field>

          <Field label="Self-consumption (%)" icon={<TrendingUp className="h-4 w-4 text-[#D2E369]" />}>
            <input
              type="range"
              min={20}
              max={100}
              value={selfConsumption}
              onChange={(e) => setSelfConsumption(Number(e.target.value))}
              className="w-full accent-[#D2E369]"
            />
            <div className="mt-1 text-[11px] text-gray-500 h-4 flex justify-between">
              <span>{selfConsumption}% used at home</span>
              <span>Typical home: 60-80%</span>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-800 pt-4">
          <Result label="Annual generation" value={`${Math.round(annualGenKWh).toLocaleString('en-GB')} kWh`} sub={pvgisYield !== null ? 'PVGIS data' : 'regional estimate'} />
          <Result
            label="Annual saving"
            value={`£${annualSavingGBP.toFixed(0)}`}
            sub={`@ ${unitRate.toFixed(1)} p/kWh`}
            accent
          />
          <Result
            label="Simple payback"
            value={paybackYears === Infinity ? '—' : `${paybackYears.toFixed(1)} years`}
            sub={paybackYears < 6 ? 'good' : paybackYears < 10 ? 'fair' : 'long'}
          />
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">{summary}</p>
        <p className="text-[11px] text-gray-600 italic">
          Estimates only. Real-world output depends on shading, panel tilt, season, and the
          electricity price you actually pay. The calculator assumes excess generation above your
          self-consumption is exported for free (plug-in solar cannot use the Smart Export
          Guarantee yet); update if a simplified SEG pathway opens.
        </p>
      </div>
    </section>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-1">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function Result({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border ${accent ? 'border-[#D2E369]/40 bg-[#D2E369]/10' : 'border-gray-700 bg-gray-900/60'} px-3 py-2.5`}>
      <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-[#D2E369]' : 'text-[#FFF5E7]'}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
    </div>
  );
}

function buildSummaryLine(args: {
  annualGenKWh: number;
  annualSavingGBP: number;
  paybackYears: number;
  postcodeArea: string | null;
  unitRate: number;
  hasPvgis: boolean;
}): string {
  if (!args.postcodeArea) {
    return 'Enter your postcode for a region-accurate estimate.';
  }
  const source = args.hasPvgis ? "the EU PVGIS solar database" : 'our regional UK yield table';
  return `In the ${args.postcodeArea} postcode area, an ${Math.round(args.annualGenKWh)} kWh/year output (per ${source}) would save about £${args.annualSavingGBP.toFixed(0)} a year at today's ${args.unitRate.toFixed(1)} p/kWh unit rate, paying the system back in ${args.paybackYears === Infinity ? '—' : args.paybackYears.toFixed(1) + ' years'}. Adjust the slider above to model how much of your generation you actually use during the day.`;
}
