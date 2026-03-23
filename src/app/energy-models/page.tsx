"use client";

import React, { useState, useEffect } from "react";

// ─── Geo Constants ────────────────────────────────────────────────────────────

interface GeoConstants {
  label: string; homes: number; peakDemand_GW: number;
  residentialShareOfPeak: number; avgHouseholdPeakDraw_kW: number;
  peakerCostPerGW_bn: number; gridInfraDeferred_bn: number; gridInfraGW_needed: number;
  currentGridStorage_GW: number; avgRetailPriceSpread_p: number; avgDailyCycles: number;
  currency: string;
  gasHomesTotal: number;
  hpInstallCost: number; hpGrant: number; boilerCost: number;
  avgGasUsage_kWh: number; gasEmissions_gCO2_kWh: number;
  gridCarbon_now: number; gridCarbon_2035: number; hpCOP: number;
  annualGasBill: number; annualElecBillDelta: number;
  fossilCapacity_GW: number; fossilEmissions_gCO2_kWh: number; fossilCapacityFactor: number;
  onshoreWindCapex_bn_per_GW: number; offshoreWindCapex_bn_per_GW: number; solarCapex_bn_per_GW: number;
  renewableCapacityFactor_onshore: number; renewableCapacityFactor_offshore: number; renewableCapacityFactor_solar: number;
  fossilOpex_bn_per_GW: number;
  totalCars: number; newCarSalesPerYear: number;
  avgPetrolEmissions_gCO2_km: number; avgMileage_km: number;
  evPremiumOverPetrol: number; evFullCost: number; petrolCarCost: number;
  annualFuelSaving_per_ev: number; evBatterySize_kWh: number;
  v2gDispatchRate_kW: number; v2gEfficiency: number; evLifeYears: number;
}

const UK: GeoConstants = {
  label: "United Kingdom", homes: 28_000_000, peakDemand_GW: 52,
  residentialShareOfPeak: 0.38, avgHouseholdPeakDraw_kW: 2.1,
  peakerCostPerGW_bn: 0.5, gridInfraDeferred_bn: 15, gridInfraGW_needed: 12,
  currentGridStorage_GW: 7, avgRetailPriceSpread_p: 22, avgDailyCycles: 1.2,
  currency: "£",
  gasHomesTotal: 23_000_000,
  hpInstallCost: 10000, hpGrant: 7500, boilerCost: 2500,
  avgGasUsage_kWh: 12000, gasEmissions_gCO2_kWh: 202,
  gridCarbon_now: 148, gridCarbon_2035: 50, hpCOP: 3.0,
  annualGasBill: 900, annualElecBillDelta: 320,
  fossilCapacity_GW: 18, fossilEmissions_gCO2_kWh: 400, fossilCapacityFactor: 0.35,
  onshoreWindCapex_bn_per_GW: 1.7, offshoreWindCapex_bn_per_GW: 3.5, solarCapex_bn_per_GW: 0.9,
  renewableCapacityFactor_onshore: 0.30, renewableCapacityFactor_offshore: 0.40, renewableCapacityFactor_solar: 0.12,
  fossilOpex_bn_per_GW: 0.05,
  totalCars: 35_000_000, newCarSalesPerYear: 1_800_000,
  avgPetrolEmissions_gCO2_km: 175, avgMileage_km: 12000,
  evPremiumOverPetrol: 5000, evFullCost: 32000, petrolCarCost: 27000,
  annualFuelSaving_per_ev: 1200, evBatterySize_kWh: 60,
  v2gDispatchRate_kW: 7, v2gEfficiency: 0.85, evLifeYears: 12,
};

const US: GeoConstants = {
  label: "United States", homes: 130_000_000, peakDemand_GW: 780,
  residentialShareOfPeak: 0.36, avgHouseholdPeakDraw_kW: 3.2,
  peakerCostPerGW_bn: 0.7, gridInfraDeferred_bn: 120, gridInfraGW_needed: 80,
  currentGridStorage_GW: 28, avgRetailPriceSpread_p: 18, avgDailyCycles: 1.1,
  currency: "$",
  gasHomesTotal: 70_000_000,
  hpInstallCost: 18000, hpGrant: 2000, boilerCost: 4000,
  avgGasUsage_kWh: 25000, gasEmissions_gCO2_kWh: 202,
  gridCarbon_now: 370, gridCarbon_2035: 120, hpCOP: 2.8,
  annualGasBill: 1200, annualElecBillDelta: 400,
  fossilCapacity_GW: 500, fossilEmissions_gCO2_kWh: 450, fossilCapacityFactor: 0.40,
  onshoreWindCapex_bn_per_GW: 1.5, offshoreWindCapex_bn_per_GW: 4.0, solarCapex_bn_per_GW: 1.0,
  renewableCapacityFactor_onshore: 0.32, renewableCapacityFactor_offshore: 0.42, renewableCapacityFactor_solar: 0.20,
  fossilOpex_bn_per_GW: 0.06,
  totalCars: 290_000_000, newCarSalesPerYear: 15_000_000,
  avgPetrolEmissions_gCO2_km: 210, avgMileage_km: 24000,
  evPremiumOverPetrol: 6000, evFullCost: 42000, petrolCarCost: 36000,
  annualFuelSaving_per_ev: 1800, evBatterySize_kWh: 70,
  v2gDispatchRate_kW: 10, v2gEfficiency: 0.85, evLifeYears: 12,
};

// ─── Calc Functions ───────────────────────────────────────────────────────────

function calcHome(p: { cost: number; takeup_pct: number; eff: number; battSize: number }, G: GeoConstants) {
  const homes = G.homes * p.takeup_pct;
  const dispatch_kW = Math.min(G.avgHouseholdPeakDraw_kW * 1.5, p.battSize / 2);
  const cap_GW = (homes * dispatch_kW * p.eff) / 1e6;
  const peakRes = G.peakDemand_GW * G.residentialShareOfPeak;
  const peakSmooth = Math.min((cap_GW / peakRes) * 100, 100);
  const savingPerHome = (p.battSize * G.avgDailyCycles * 365 * G.avgRetailPriceSpread_p * p.eff) / 100;
  const consumerSaving = (homes * savingPerHome) / 1e9;
  const peakerSaved = cap_GW * G.peakerCostPerGW_bn;
  const infraFrac = Math.min(cap_GW / G.gridInfraGW_needed, 1);
  const infraSaved = infraFrac * G.gridInfraDeferred_bn * p.eff;
  const capex = (homes * p.battSize * p.cost) / 1e9;
  const annCapex = capex / 10;
  const co2_Mt = (cap_GW * 1e6 * p.eff * 8760 * 0.15 * G.fossilEmissions_gCO2_kWh) / 1e15;
  const cpt = co2_Mt > 0.001 ? (annCapex * 1e9) / (co2_Mt * 1e6) : 0;
  return { homes, cap_GW, peakSmooth, consumerSaving, peakerSaved, infraSaved, gridSaving: peakerSaved + infraSaved, capex, annCapex, net: consumerSaving + peakerSaved + infraSaved - annCapex, co2_Mt, cpt };
}

function calcGrid(p: { cap: number; eff: number; cpg: number }, G: GeoConstants) {
  const peakRes = G.peakDemand_GW * G.residentialShareOfPeak;
  const effCap = p.cap * p.eff;
  const peakSmooth = Math.min((effCap / peakRes) * 100, 100);
  const peakerSaved = effCap * G.peakerCostPerGW_bn;
  const infraFrac = Math.min(effCap / G.gridInfraGW_needed, 1);
  const infraSaved = infraFrac * G.gridInfraDeferred_bn;
  const consumer = peakerSaved * 0.2;
  const capex = p.cap * p.cpg;
  const annCapex = capex / 20;
  const co2_Mt = (effCap * 1e6 * 8760 * 0.15 * G.fossilEmissions_gCO2_kWh) / 1e15;
  const cpt = co2_Mt > 0.001 ? (annCapex * 1e9) / (co2_Mt * 1e6) : 0;
  return { effCap, peakSmooth, consumer, peakerSaved, infraSaved, gridSaving: peakerSaved + infraSaved, capex, annCapex, net: consumer + peakerSaved + infraSaved - annCapex, co2_Mt, cpt };
}

function calcHP(p: { takeup: number; carbonNow: number; carbon2035: number }, G: GeoConstants) {
  const homes = G.gasHomesTotal * p.takeup;
  const netCost = G.hpInstallCost - G.hpGrant - G.boilerCost;
  const capex = (homes * netCost) / 1e9;
  const annCapex = capex / 15;
  const elecNeeded = G.avgGasUsage_kWh / G.hpCOP;
  const co2GasSaved = (G.avgGasUsage_kWh * G.gasEmissions_gCO2_kWh) / 1000;
  const co2ElecNow = (elecNeeded * p.carbonNow) / 1000;
  const co2Elec2035 = (elecNeeded * p.carbon2035) / 1000;
  const netNow = co2GasSaved - co2ElecNow;
  const net2035 = co2GasSaved - co2Elec2035;
  const co2Now = (homes * netNow) / 1e9;
  const co2_2035 = (homes * net2035) / 1e9;
  const billSaving = (homes * (G.annualGasBill - G.annualElecBillDelta)) / 1e9;
  const cptNow = co2Now > 0.001 ? (annCapex * 1e9) / (co2Now * 1e6) : 999;
  const cpt2035 = co2_2035 > 0.001 ? (annCapex * 1e9) / (co2_2035 * 1e6) : 999;
  return { homes, capex, annCapex, co2Now, co2_2035, netNow, net2035, billSaving, cptNow, cpt2035, net: billSaving - annCapex };
}

function calcRen(p: { cap: number; type: string; disp: number }, G: GeoConstants) {
  const cfMap: Record<string, number> = { onshore: G.renewableCapacityFactor_onshore, offshore: G.renewableCapacityFactor_offshore, solar: G.renewableCapacityFactor_solar };
  const cxMap: Record<string, number> = { onshore: G.onshoreWindCapex_bn_per_GW, offshore: G.offshoreWindCapex_bn_per_GW, solar: G.solarCapex_bn_per_GW };
  const cf = cfMap[p.type], cx = cxMap[p.type];
  const capex = p.cap * cx;
  const annCapex = capex / 25;
  const gen_TWh = (p.cap * cf * 8760) / 1000;
  const disp_TWh = gen_TWh * p.disp;
  const co2_Mt = (disp_TWh * 1e9 * G.fossilEmissions_gCO2_kWh) / 1e15;
  const opex = p.cap * p.disp * G.fossilOpex_bn_per_GW;
  const cpt = co2_Mt > 0.001 ? (annCapex * 1e9) / (co2_Mt * 1e6) : 0;
  const carsOff = Math.round(co2_Mt * 1e6 / 2.1);
  return { capex, annCapex, gen_TWh, disp_TWh, co2_Mt, opex, cpt, carsOff, net: opex - annCapex };
}

function calcEV(p: { takeup: number; yearsAdopted: number; efficiencyKmPerKWh: number; gridCarbon: number; gridCarbon2035: number; v2gEnrolled: number }, G: GeoConstants) {
  const evsSold = G.newCarSalesPerYear * p.takeup;
  const fleetSize = evsSold * Math.min(p.yearsAdopted, G.evLifeYears);
  const petrolCO2_kg = (G.avgMileage_km * G.avgPetrolEmissions_gCO2_km) / 1000;
  const elecNeeded_kWh = G.avgMileage_km / p.efficiencyKmPerKWh;
  const elecCO2_now_kg = (elecNeeded_kWh * p.gridCarbon) / 1000;
  const elecCO2_2035_kg = (elecNeeded_kWh * p.gridCarbon2035) / 1000;
  const netCO2_now_kg = petrolCO2_kg - elecCO2_now_kg;
  const netCO2_2035_kg = petrolCO2_kg - elecCO2_2035_kg;
  const fleetCO2_now_Mt = (fleetSize * netCO2_now_kg) / 1e9;
  const fleetCO2_2035_Mt = (fleetSize * netCO2_2035_kg) / 1e9;
  const marginalCapex_bn = (evsSold * G.evPremiumOverPetrol) / 1e9;
  const fullCapex_bn = (evsSold * G.evFullCost) / 1e9;
  const annMargCapex = marginalCapex_bn / G.evLifeYears;
  const annFullCapex = fullCapex_bn / G.evLifeYears;
  const annFuelSaving_bn = (fleetSize * G.annualFuelSaving_per_ev) / 1e9;
  const cptMarg_now = fleetCO2_now_Mt > 0.001 ? (annMargCapex * 1e9) / (fleetCO2_now_Mt * 1e6) : 999;
  const cptMarg_2035 = fleetCO2_2035_Mt > 0.001 ? (annMargCapex * 1e9) / (fleetCO2_2035_Mt * 1e6) : 999;
  const v2gAvailFrac = 0.40;
  const v2gFleet = fleetSize * v2gAvailFrac * p.v2gEnrolled;
  const v2gCap_GW = (v2gFleet * G.v2gDispatchRate_kW * G.v2gEfficiency) / 1e6;
  const peakRes_GW = G.peakDemand_GW * G.residentialShareOfPeak;
  const v2gPeakSmooth = Math.min((v2gCap_GW / peakRes_GW) * 100, 100);
  const v2gGridSaving_bn = v2gCap_GW * G.peakerCostPerGW_bn;
  const v2gArbitrage_bn = v2gFleet > 0
    ? (v2gFleet * G.evBatterySize_kWh * 0.3 * G.avgDailyCycles * 365 * G.avgRetailPriceSpread_p * G.v2gEfficiency) / (100 * 1e9)
    : 0;
  return {
    evsSold, fleetSize, marginalCapex_bn, fullCapex_bn, annMargCapex, annFullCapex,
    annFuelSaving_bn, fleetCO2_now_Mt, fleetCO2_2035_Mt, netCO2_now_kg, netCO2_2035_kg,
    cptMarg_now, cptMarg_2035,
    v2gCap_GW, v2gPeakSmooth, v2gGridSaving_bn, v2gArbitrage_bn,
    netMarg: annFuelSaving_bn + v2gGridSaving_bn + v2gArbitrage_bn - annMargCapex,
  };
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

const M = "var(--font-space-mono), 'IBM Plex Mono', monospace";

function ModelSlider({ label, min, max, step, value, onChange, fmt, hint, accent = "#38bdf8" }: {
  label: string; min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; fmt: (v: number) => string; hint?: string; accent?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-5 group">
      <div className="flex justify-between mb-1.5">
        <span className="text-[0.7rem] uppercase tracking-wider text-gray-400" style={{ fontFamily: M }}>{label}</span>
        <span className="text-sm font-semibold text-gray-200" style={{ fontFamily: M }}>{fmt(value)}</span>
      </div>
      <div className="relative h-2 bg-gray-800 rounded-full">
        <div className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-75" style={{ width: `${pct}%`, background: accent }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 shadow-lg transition-transform group-hover:scale-110 pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)`, background: accent, borderColor: "#030a15", boxShadow: `0 0 8px ${accent}66` }}
        />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full m-0" />
      </div>
      {hint && <div className="text-[0.6rem] text-gray-600 mt-1" style={{ fontFamily: M }}>{hint}</div>}
    </div>
  );
}

function Toggle({ label, value, onChange, accent = "#fb923c" }: {
  label: string; value: boolean; onChange: (v: boolean) => void; accent?: string;
}) {
  return (
    <div
      className="flex items-center justify-between mb-4 py-2.5 px-3 rounded-md cursor-pointer border"
      style={{ background: "#0a111e", borderColor: value ? accent + "55" : "#1e293b" }}
      onClick={() => onChange(!value)}
    >
      <span className="text-[0.68rem] uppercase tracking-wider" style={{ fontFamily: M, color: value ? accent : "#475569" }}>{label}</span>
      <div className="w-8 h-[17px] rounded-full relative flex-shrink-0 transition-colors" style={{ background: value ? accent : "#1e293b" }}>
        <div className="absolute top-[2px] w-[13px] h-[13px] rounded-full transition-[left]" style={{ left: value ? "17px" : "2px", background: value ? "#030a15" : "#475569" }} />
      </div>
    </div>
  );
}

function Tag({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-[3px] h-[13px] rounded-sm flex-shrink-0" style={{ background: accent }} />
      <span className="text-[0.63rem] uppercase tracking-widest font-bold" style={{ fontFamily: M, color: accent }}>{label}</span>
    </div>
  );
}

function InfoCard({ label, value, sub, accent = "#cbd5e1" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
      <div className="text-[0.58rem] text-gray-500 uppercase tracking-wider mb-0.5" style={{ fontFamily: M }}>{label}</div>
      <div className="text-lg font-bold leading-none" style={{ fontFamily: M, color: accent }}>{value}</div>
      {sub && <div className="text-[0.6rem] text-gray-600 mt-0.5" style={{ fontFamily: M }}>{sub}</div>}
    </div>
  );
}

function PeakDemandBar({ homePct, gridPct, peakGW, totalGW, homeGW, gridGW, fGW }: {
  homePct: number; gridPct: number; peakGW: number; totalGW: number;
  homeGW: number; gridGW: number; fGW: (v: number) => string;
}) {
  const combinedPct = Math.min(homePct + gridPct, 100);
  const hP = Math.min(homePct, 100);
  const gP = Math.min(gridPct, 100 - hP);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-[0.58rem] text-gray-500 uppercase tracking-wider" style={{ fontFamily: M }}>How much residential peak demand can batteries cover?</div>
          <div className="text-[0.55rem] text-gray-600 mt-0.5" style={{ fontFamily: M }}>
            Adjust <span className="text-sky-400">Household Take-up</span> and <span className="text-amber-400">Grid Capacity</span> sliders to see the effect
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="text-lg font-bold" style={{ fontFamily: M, color: combinedPct >= 80 ? "#34d399" : combinedPct >= 40 ? "#f59e0b" : "#f87171" }}>{combinedPct.toFixed(0)}%</div>
          <div className="text-[0.55rem] text-gray-600" style={{ fontFamily: M }}>covered</div>
        </div>
      </div>
      {/* Bar */}
      <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden mb-2">
        <div className="absolute left-0 top-0 h-full rounded-l-full transition-[width] duration-300" style={{ width: `${hP}%`, background: "#38bdf8" }} />
        <div className="absolute top-0 h-full transition-[width,left] duration-300" style={{ left: `${hP}%`, width: `${gP}%`, background: "#f59e0b", borderRadius: gP + hP >= 99.5 ? "0 9999px 9999px 0" : "0" }} />
        {/* Peak demand marker */}
        <div className="absolute top-0 right-0 h-full flex items-center pr-2">
          <span className="text-[0.55rem] text-gray-400 font-semibold" style={{ fontFamily: M }}>{fGW(peakGW)}</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-sky-400" />
          <span className="text-[0.6rem] text-gray-400" style={{ fontFamily: M }}>Home batteries: {fGW(homeGW)} ({hP.toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-400" />
          <span className="text-[0.6rem] text-gray-400" style={{ fontFamily: M }}>Grid batteries: {fGW(gridGW)} ({gP.toFixed(0)}%)</span>
        </div>
        <span className="text-[0.6rem] text-gray-600" style={{ fontFamily: M }}>of {totalGW} GW total peak ({fGW(peakGW)} residential)</span>
      </div>
    </div>
  );
}

function Bars({ title, rows, maxV, fmtV }: { title: string; rows: [string, number, string][]; maxV: number; fmtV: (v: number) => string }) {
  return (
    <div className="mb-3">
      <div className="text-[0.58rem] text-gray-500 uppercase tracking-wider mb-1.5" style={{ fontFamily: M }}>{title}</div>
      {rows.map(([name, val, col]) => (
        <div key={name} className="flex items-center gap-2 mb-1">
          <div className="w-20 text-[0.6rem] text-gray-500 flex-shrink-0" style={{ fontFamily: M }}>{name}</div>
          <div className="flex-1 h-2.5 bg-gray-800 rounded overflow-hidden">
            <div className="h-full rounded transition-[width] duration-300" style={{ width: `${Math.min((val / maxV) * 100, 100)}%`, background: col }} />
          </div>
          <div className="w-[60px] text-right text-[0.65rem] font-semibold" style={{ color: col, fontFamily: M }}>{fmtV(val)}</div>
        </div>
      ))}
    </div>
  );
}

function CBBox({ title, accent, rows, net, netLabel = "Net annual", life, C }: {
  title: string; accent: string; rows: [string, number, boolean][]; net: number; netLabel?: string; life?: number; C: string;
}) {
  const fv = (v: number) => Math.abs(v) >= 1 ? `${C}${Math.abs(v).toFixed(1)}bn` : `${C}${(Math.abs(v) * 1000).toFixed(0)}m`;
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-3.5">
      <div className="text-[0.58rem] uppercase tracking-wider mb-3 font-bold" style={{ color: accent, fontFamily: M }}>◈ {title}</div>
      {rows.map(([l, v, pos]) => (
        <div key={l} className="flex justify-between mb-1">
          <span className="text-[0.65rem] text-gray-500" style={{ fontFamily: M }}>{l}</span>
          <span className="text-[0.7rem]" style={{ color: pos ? "#34d399" : "#f87171", fontFamily: M }}>{pos ? "+" : "−"}{fv(v)}</span>
        </div>
      ))}
      <div className="border-t border-gray-800 pt-1.5 mt-1 flex justify-between">
        <span className="text-[0.65rem] text-gray-400 font-semibold" style={{ fontFamily: M }}>{netLabel}</span>
        <span className="text-sm font-bold" style={{ fontFamily: M, color: net > 0 ? "#34d399" : "#f87171" }}>
          {net > 0 ? "+" : ""}{net >= 1 || net <= -1 ? `${C}${net.toFixed(1)}bn` : `${C}${(net * 1000).toFixed(0)}m`}
        </span>
      </div>
      {life && <div className="text-[0.57rem] text-gray-700 mt-1" style={{ fontFamily: M }}>capex annualised over {life}yr</div>}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-8 px-0 max-w-full mx-auto">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #1e293b)" }} />
      <span className="text-[0.6rem] text-gray-700 uppercase tracking-[0.14em] whitespace-nowrap" style={{ fontFamily: M }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #1e293b, transparent)" }} />
    </div>
  );
}

// ─── Six-Way Comparison ───────────────────────────────────────────────────────

interface SixWayItem { label: string; co2: number; cpt: number; color: string; dim?: boolean }

function SixWay({ items, C }: { items: SixWayItem[]; C: string }) {
  const maxCO2 = Math.max(...items.map(i => i.co2 || 0), 0.01);
  const validCPT = items.filter(i => i.cpt > 0 && i.cpt < 900);
  const maxCPT = Math.max(...validCPT.map(i => i.cpt), 1);
  const fMt = (v: number) => v >= 1 ? `${v.toFixed(2)} Mt` : `${(v * 1000).toFixed(0)} kt`;
  const fCPT = (v: number) => (v <= 0 || v > 900) ? "—" : `${C}${v < 10 ? v.toFixed(1) : Math.round(v)}`;
  const ranked = [...validCPT].sort((a, b) => a.cpt - b.cpt);
  const best = ranked[0], worst = ranked[ranked.length - 1];

  return (
    <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D2E369] p-5 md:p-7">
      <div className="flex gap-4 mb-2 flex-wrap items-baseline">
        <span className="text-[0.65rem] text-gray-500 uppercase tracking-widest font-bold" style={{ fontFamily: M }}>All Interventions Compared</span>
        <span className="text-[0.6rem] text-gray-700" style={{ fontFamily: M }}>responds live · marginal cost basis for EV</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-5">
        <div>
          <div className="text-[0.6rem] text-emerald-400 uppercase tracking-wider mb-4 font-bold" style={{ fontFamily: M }}>Annual CO₂ Avoided</div>
          {items.map(({ label, co2, color, dim }) => (
            <div key={label} className="mb-3.5" style={{ opacity: dim ? 0.45 : 1 }}>
              <div className="flex justify-between mb-1">
                <span className="text-[0.65rem] text-gray-500" style={{ fontFamily: M }}>{label}</span>
                <span className="text-[0.68rem] font-semibold" style={{ color, fontFamily: M }}>{fMt(co2 || 0)}</span>
              </div>
              <div className="h-2.5 bg-gray-800 rounded overflow-hidden">
                <div className="h-full rounded transition-[width] duration-[400ms] ease-out" style={{ width: `${Math.min(((co2 || 0) / maxCO2) * 100, 100)}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[0.6rem] text-amber-400 uppercase tracking-wider mb-4 font-bold" style={{ fontFamily: M }}>Cost per Tonne CO₂ · {C} · lower = better</div>
          {items.map(({ label, cpt, color, dim }) => {
            const show = cpt > 0 && cpt < 900;
            return (
              <div key={label} className="mb-3.5" style={{ opacity: dim ? 0.45 : 1 }}>
                <div className="flex justify-between mb-1">
                  <span className="text-[0.65rem] text-gray-500" style={{ fontFamily: M }}>{label}</span>
                  <span className="text-[0.68rem] font-semibold" style={{ color: show ? color : "#374151", fontFamily: M }}>{fCPT(cpt)}/t</span>
                </div>
                <div className="h-2.5 bg-gray-800 rounded overflow-hidden">
                  <div className="h-full rounded opacity-65 transition-[width] duration-[400ms] ease-out" style={{ width: show ? `${Math.min((cpt / maxCPT) * 100, 100)}%` : "0%", background: color }} />
                </div>
              </div>
            );
          })}
          <div className="text-[0.57rem] text-gray-700 mt-1" style={{ fontFamily: M }}>— = negligible CO₂ at current params · EV uses marginal cost (premium over petrol)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        {best && worst && best.label !== worst.label && (
          <div className="p-3 bg-gray-950 rounded-lg border border-gray-800">
            <span className="text-[0.65rem] text-gray-500 leading-relaxed" style={{ fontFamily: M }}>
              Most cost-effective: <span style={{ color: best.color }} className="font-bold">{best.label}</span> at <span style={{ color: best.color }}>{C}{best.cpt < 10 ? best.cpt.toFixed(1) : Math.round(best.cpt)}/tonne</span>
              {worst && <> — {Math.round(worst.cpt / best.cpt)}× cheaper than <span style={{ color: worst.color }}>{worst.label}</span> ({C}{worst.cpt < 10 ? worst.cpt.toFixed(1) : Math.round(worst.cpt)}/t)</>}.
            </span>
          </div>
        )}
        <div className="p-3 bg-gray-950 rounded-lg border border-gray-800">
          <div className="text-[0.57rem] text-gray-700 font-semibold uppercase mb-1" style={{ fontFamily: M }}>Scale note</div>
          <span className="text-[0.65rem] text-gray-500 leading-relaxed" style={{ fontFamily: M }}>
            Battery CO₂ figures are most uncertain — they assume enabling fossil peaker displacement. Heat pump and EV figures rest on firmer empirical ground. Renewables CO₂ is most direct.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EnergyModelsPage() {
  const [geo, setGeo] = useState("UK");
  const G = geo === "UK" ? UK : US;
  const C = G.currency;

  const [bCost, setBCost] = useState(450);
  const [bTake, setBTake] = useState(10);
  const [bEff, setBEff] = useState(70);
  const [bSize, setBSize] = useState(10);
  const [gCap, setGCap] = useState(15);
  const [gEff, setGEff] = useState(85);
  const [gCPG, setGCPG] = useState(0.18);
  const [hpTake, setHpTake] = useState(15);
  const [hpCNow, setHpCNow] = useState(G.gridCarbon_now);
  const [hpC35, setHpC35] = useState(G.gridCarbon_2035);
  const [rType, setRType] = useState("onshore");
  const [rCap, setRCap] = useState(geo === "UK" ? 20 : 100);
  const [rDisp, setRDisp] = useState(80);
  const [evTake, setEvTake] = useState(25);
  const [evYears, setEvYears] = useState(5);
  const [evEff, setEvEff] = useState(6.0);
  const [evV2G, setEvV2G] = useState(false);
  const [evV2GEnrol, setEvV2GEnrol] = useState(30);

  useEffect(() => {
    setGCap(geo === "UK" ? 15 : 80);
    setGCPG(geo === "UK" ? 0.18 : 0.20);
    setRCap(geo === "UK" ? 20 : 100);
    setHpCNow(G.gridCarbon_now);
    setHpC35(G.gridCarbon_2035);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  const hm = calcHome({ cost: bCost, takeup_pct: bTake / 100, eff: bEff / 100, battSize: bSize }, G);
  const gr = calcGrid({ cap: gCap, eff: gEff / 100, cpg: gCPG }, G);
  const hp = calcHP({ takeup: hpTake / 100, carbonNow: hpCNow, carbon2035: hpC35 }, G);
  const rn = calcRen({ cap: rCap, type: rType, disp: rDisp / 100 }, G);
  const ev = calcEV({
    takeup: evTake / 100, yearsAdopted: evYears, efficiencyKmPerKWh: evEff,
    gridCarbon: hpCNow, gridCarbon2035: hpC35,
    v2gEnrolled: evV2G ? evV2GEnrol / 100 : 0,
  }, G);

  const fv = (v: number) => Math.abs(v) >= 1 ? `${C}${v.toFixed(1)}bn` : `${C}${(v * 1000).toFixed(0)}m`;
  const fGW = (v: number) => v >= 1 ? `${v.toFixed(1)} GW` : `${(v * 1000).toFixed(0)} MW`;
  const fH = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}m` : `${(v / 1e3).toFixed(0)}k`;
  const fMt = (v: number) => v >= 1 ? `${v.toFixed(2)} Mt` : `${(v * 1000).toFixed(0)} kt`;
  const maxBn = Math.max(hm.gridSaving, gr.gridSaving, 0.5);
  const cfNow = ({ onshore: G.renewableCapacityFactor_onshore, offshore: G.renewableCapacityFactor_offshore, solar: G.renewableCapacityFactor_solar } as Record<string, number>)[rType];
  const cxNow = ({ onshore: G.onshoreWindCapex_bn_per_GW, offshore: G.offshoreWindCapex_bn_per_GW, solar: G.solarCapex_bn_per_GW } as Record<string, number>)[rType];

  const sixItems: SixWayItem[] = [
    { label: "Home Batteries", co2: hm.co2_Mt, cpt: hm.cpt, color: "#38bdf8" },
    { label: "Grid Batteries", co2: gr.co2_Mt, cpt: gr.cpt, color: "#f59e0b" },
    { label: "Heat Pumps (now)", co2: hp.co2Now, cpt: hp.cptNow, color: "#a78bfa" },
    { label: "Heat Pumps (2035 grid)", co2: hp.co2_2035, cpt: hp.cpt2035, color: "#c084fc" },
    { label: "EV fleet (now)", co2: ev.fleetCO2_now_Mt, cpt: ev.cptMarg_now, color: "#fb923c" },
    { label: "EV fleet (2035 grid)", co2: ev.fleetCO2_2035_Mt, cpt: ev.cptMarg_2035, color: "#fdba74", dim: ev.fleetCO2_2035_Mt < 0.01 },
    { label: `Renewables (${rType})`, co2: rn.co2_Mt, cpt: rn.cpt, color: "#34d399" },
  ];

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Hero ─────────────────────────────────────────────── */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D2E369]">
            <div className="px-4 py-3 md:px-6 md:py-4 rounded-t-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-3" style={{ backgroundColor: "#D2E369" }}>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: "#2C5263" }}>
                  Decarbonisation Models
                </h1>
                <p className="text-sm md:text-base mt-1" style={{ color: "#2C5263aa" }}>
                  batteries · heat pumps · EVs · renewables · cost per tonne CO₂
                </p>
              </div>
              <div className="flex rounded-lg overflow-hidden border-2 border-[#2C5263]/30 self-start">
                {(["UK", "US"] as const).map(g => (
                  <button key={g}
                    onClick={() => setGeo(g)}
                    className={`px-5 py-2 font-mono text-sm font-bold transition-colors ${geo === g ? "bg-[#2C5263] text-[#D2E369]" : "bg-transparent text-[#2C5263] hover:bg-[#2C5263]/10"}`}
                  >
                    {g === "UK" ? "🇬🇧 UK" : "🇺🇸 US"}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-b-2xl">
              <p className="text-gray-400 text-sm">
                Adjust the sliders below to model different decarbonisation scenarios for the {G.label}. All figures update live.
              </p>
            </div>
          </div>

          {/* ══ Section 1: Battery Storage ══ */}
          <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D2E369] p-4 md:p-6 shadow-xl">
            <div className="text-[0.58rem] text-gray-700 uppercase tracking-[0.14em] mb-4" style={{ fontFamily: M }}>▸ Section 1 — Battery Storage</div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              {/* Controls */}
              <div>
                <Tag label="Home Battery" accent="#38bdf8" />
                <ModelSlider label="Installed Cost" min={100} max={800} step={10} value={bCost} onChange={setBCost} fmt={v => `${C}${v}/kWh`} hint={`Today ~${C}${geo === "UK" ? "450" : "400"} · plug-and-play target ~${C}200`} accent="#38bdf8" />
                <ModelSlider label="Household Take-up" min={1} max={40} step={1} value={bTake} onChange={setBTake} fmt={v => `${v}%`} hint={`${fH(G.homes * bTake / 100)} of ${fH(G.homes)} homes`} accent="#38bdf8" />
                <ModelSlider label="ToU Coordination" min={30} max={95} step={1} value={bEff} onChange={setBEff} fmt={v => `${v}%`} hint="30% self-optimising → 95% full VPP" accent="#38bdf8" />
                <ModelSlider label="Battery Size" min={5} max={20} step={0.5} value={bSize} onChange={setBSize} fmt={v => `${v} kWh`} accent="#38bdf8" />

                <div className="mt-5">
                  <Tag label="Grid Battery" accent="#f59e0b" />
                  <ModelSlider label="Grid Capacity" min={1} max={geo === "UK" ? 80 : 400} step={1} value={gCap} onChange={setGCap} fmt={v => `${v} GW`} hint={`Current: ~${G.currentGridStorage_GW} GW installed`} accent="#f59e0b" />
                  <ModelSlider label="Dispatch Efficiency" min={50} max={98} step={1} value={gEff} onChange={setGEff} fmt={v => `${v}%`} accent="#f59e0b" />
                  <ModelSlider label="Capex per GW" min={0.1} max={0.4} step={0.01} value={gCPG} onChange={setGCPG} fmt={v => `${C}${v.toFixed(2)}bn`} accent="#f59e0b" />
                </div>

                <div className="text-[0.57rem] text-gray-700 leading-relaxed p-3 bg-gray-950 rounded-md border border-gray-800 mt-3" style={{ fontFamily: M }}>
                  <span className="text-gray-500 font-semibold">MODEL · </span>Grid savings = peaker displacement + infra deferral. Consumer = ToU at {G.avgRetailPriceSpread_p}{geo === "UK" ? "p" : "¢"}/kWh × {G.avgDailyCycles} cycles. CO₂ = fossil peaking at {G.fossilEmissions_gCO2_kWh}g/kWh.
                </div>
              </div>

              {/* Output */}
              <div>
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 mb-3">
                  <PeakDemandBar
                    homePct={hm.peakSmooth}
                    gridPct={gr.peakSmooth}
                    peakGW={G.peakDemand_GW * G.residentialShareOfPeak}
                    totalGW={G.peakDemand_GW}
                    homeGW={hm.cap_GW}
                    gridGW={gr.effCap}
                    fGW={fGW}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <InfoCard label="Home Fleet Capacity" value={fGW(hm.cap_GW)} sub={`${fH(hm.homes)} homes enrolled`} accent="#38bdf8" />
                  <InfoCard label="Grid Fleet Capacity" value={fGW(gr.effCap)} sub={`${gCap} GW × ${gEff}%`} accent="#f59e0b" />
                </div>

                <Tag label="Financial Impact" accent="#a78bfa" />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <InfoCard label="Consumer Saving (home)" value={fv(hm.consumerSaving)} sub="Annual ToU arbitrage" accent="#38bdf8" />
                  <InfoCard label="Consumer Benefit (grid)" value={fv(gr.consumer)} sub="Wholesale pass-through" accent="#f59e0b" />
                </div>

                <Bars title="Peaker displacement value (annual)" rows={[["Home batt.", hm.peakerSaved, "#38bdf8"], ["Grid batt.", gr.peakerSaved, "#f59e0b"]]} maxV={maxBn} fmtV={fv} />
                <Bars title="Grid infrastructure deferral" rows={[["Home batt.", hm.infraSaved, "#38bdf8"], ["Grid batt.", gr.infraSaved, "#f59e0b"]]} maxV={Math.max(hm.infraSaved, gr.infraSaved, 0.5)} fmtV={fv} />

                <Tag label="Cost vs Benefit" accent="#34d399" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  <CBBox title="Home Batteries" accent="#38bdf8" C={C} rows={[["Capex (÷10yr)", hm.annCapex, false], ["Consumer saving", hm.consumerSaving, true], ["Grid saving", hm.gridSaving, true]]} net={hm.net} life={10} />
                  <CBBox title="Grid Batteries" accent="#f59e0b" C={C} rows={[["Capex (÷20yr)", gr.annCapex, false], ["Consumer benefit", gr.consumer, true], ["Grid saving", gr.gridSaving, true]]} net={gr.net} life={20} />
                </div>

                <div className="bg-gray-950 border border-gray-800 rounded-md p-3 flex gap-6 flex-wrap">
                  {([["Home fleet", hm.cap_GW, "#38bdf8"], ["Grid fleet", gr.effCap, "#f59e0b"]] as const).map(([l, gw, col]) => (
                    <div key={l}>
                      <div className="text-[0.57rem] text-gray-600 uppercase" style={{ fontFamily: M }}>{l} peaker equiv.</div>
                      <div className="text-sm font-bold" style={{ color: col, fontFamily: M }}>{(gw / 0.6).toFixed(1)} × 600 MW gas plant{gw / 0.6 >= 2 ? "s" : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Divider label="Section 2 — Decarbonisation: Home & Grid Scale" />

          {/* ══ Section 2: Heat Pump + Renewable ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Heat Pump */}
            <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D2E369] p-4 md:p-5 shadow-xl">
              <Tag label="Heat Pump vs Gas Boiler · Home Scale" accent="#a78bfa" />
              <ModelSlider label="% Gas Homes Converted" min={1} max={80} step={1} value={hpTake} onChange={setHpTake} fmt={v => `${v}%`} hint={`${fH(G.gasHomesTotal * hpTake / 100)} of ${fH(G.gasHomesTotal)} gas homes`} accent="#a78bfa" />
              <ModelSlider label="Grid Carbon Now (g/kWh)" min={50} max={500} step={5} value={hpCNow} onChange={setHpCNow} fmt={v => `${v}g`} hint="Shared with EV panel · lower = cleaner grid" accent="#a78bfa" />
              <ModelSlider label="Grid Carbon 2035 Scenario" min={20} max={300} step={5} value={hpC35} onChange={setHpC35} fmt={v => `${v}g`} hint={geo === "UK" ? "NESO target ~50g" : "IRA scenario ~120g"} accent="#c084fc" />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <InfoCard label="Homes converted" value={fH(hp.homes)} sub={`net cost ${C}${(G.hpInstallCost - G.hpGrant - G.boilerCost).toLocaleString()}/home`} accent="#a78bfa" />
                <InfoCard label="Total net capex" value={fv(hp.capex)} sub="annualised over 15yr" accent="#a78bfa" />
                <InfoCard label="CO₂ avoided (now)" value={fMt(hp.co2Now)} sub={hp.netNow > 0 ? `${Math.round(hp.netNow)}kg/home/yr` : "grid still too carbon-heavy"} accent={hp.co2Now > 0 ? "#a78bfa" : "#f87171"} />
                <InfoCard label="CO₂ avoided (2035)" value={fMt(hp.co2_2035)} sub={`${Math.round(hp.net2035)}kg/home/yr`} accent="#c084fc" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <InfoCard label="Annual bill saving" value={fv(hp.billSaving)} sub={`${C}${G.annualGasBill - G.annualElecBillDelta}/home/yr net`} accent="#34d399" />
                <CBBox title="Heat Pumps" accent="#a78bfa" C={C} rows={[["Capex (÷15yr)", hp.annCapex, false], ["Bill saving", hp.billSaving, true]]} net={hp.net} />
              </div>
              <div className="bg-gray-950 rounded-md p-3 border border-gray-800">
                <div className="text-[0.57rem] text-gray-600 font-semibold uppercase tracking-wider mb-1" style={{ fontFamily: M }}>Grid improvement dividend</div>
                <div className="text-[0.63rem] text-gray-500 leading-relaxed" style={{ fontFamily: M }}>
                  Same hardware, improving savings yearly. {hpCNow}g: <span style={{ color: "#a78bfa" }}>{fMt(hp.co2Now)}</span> → {hpC35}g (2035): <span style={{ color: "#c084fc" }}>{fMt(hp.co2_2035)}</span>{hp.co2Now > 0.001 ? ` — ${((hp.co2_2035 / hp.co2Now - 1) * 100).toFixed(0)}% more CO₂ avoided, zero extra cost.` : " — grid must clean first."}
                </div>
              </div>
            </div>

            {/* Renewable */}
            <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D2E369] p-4 md:p-5 shadow-xl">
              <Tag label="Renewables vs Fossil · Grid Scale" accent="#34d399" />
              <div className="mb-4">
                <div className="text-[0.58rem] text-gray-600 uppercase tracking-wider mb-1.5" style={{ fontFamily: M }}>Type</div>
                <div className="flex">
                  {([["onshore", "Onshore Wind"], ["offshore", "Offshore Wind"], ["solar", "Solar PV"]] as const).map(([v, l]) => (
                    <button key={v}
                      className={`px-3 py-1.5 border text-[0.62rem] cursor-pointer transition-all first:rounded-l last:rounded-r ${rType === v ? "bg-emerald-400 text-gray-950 border-emerald-400 font-bold" : "bg-transparent text-gray-500 border-gray-800"}`}
                      style={{ fontFamily: M }}
                      onClick={() => setRType(v)}
                    >{l}</button>
                  ))}
                </div>
              </div>
              <ModelSlider label="New Capacity" min={1} max={geo === "UK" ? 80 : 400} step={1} value={rCap} onChange={setRCap} fmt={v => `${v} GW`} accent="#34d399" />
              <ModelSlider label="Fossil Displacement" min={20} max={100} step={1} value={rDisp} onChange={setRDisp} fmt={v => `${v}%`} hint="% actually displacing fossil vs curtailment" accent="#34d399" />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <InfoCard label="Annual generation" value={`${rn.gen_TWh.toFixed(1)} TWh`} sub={`CF ${(cfNow * 100).toFixed(0)}%`} accent="#34d399" />
                <InfoCard label="Total capex" value={fv(rn.capex)} sub={`${C}${cxNow.toFixed(2)}bn/GW · 25yr`} accent="#34d399" />
                <InfoCard label="CO₂ avoided" value={fMt(rn.co2_Mt)} sub={`vs fossil ${G.fossilEmissions_gCO2_kWh}g/kWh`} accent="#34d399" />
                <InfoCard label="Lifetime CO₂" value={fMt(rn.co2_Mt * 25)} sub="25yr total" accent="#34d399" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <InfoCard label="Fossil opex saving" value={fv(rn.opex)} sub="annual running costs avoided" accent="#34d399" />
                <CBBox title="Renewables" accent="#34d399" C={C} rows={[["Capex (÷25yr)", rn.annCapex, false], ["Opex saving", rn.opex, true]]} net={rn.net} />
              </div>
              <div className="bg-gray-950 rounded-md p-3 border border-gray-800">
                <div className="text-[0.63rem] text-gray-500 leading-relaxed" style={{ fontFamily: M }}>
                  {rCap} GW avoids <span style={{ color: "#34d399" }}>{fMt(rn.co2_Mt)}/yr</span> — {rn.carsOff.toLocaleString()} cars equivalent. Lifetime: <span style={{ color: "#34d399" }}>{fMt(rn.co2_Mt * 25)}</span>.
                </div>
              </div>
            </div>
          </div>

          <Divider label="Section 3 — Electric Vehicles" />

          {/* ══ Section 3: EV ══ */}
          <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl border-2 border-[#D2E369] p-4 md:p-6 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              {/* EV Controls */}
              <div>
                <Tag label="EV vs Petrol Car · Fleet Scale" accent="#fb923c" />
                <ModelSlider label="% of New Car Sales → EV" min={1} max={100} step={1} value={evTake} onChange={setEvTake} fmt={v => `${v}%`} hint={`${fH(G.newCarSalesPerYear * evTake / 100)} EVs/yr · ${fH(G.newCarSalesPerYear)} total sales`} accent="#fb923c" />
                <ModelSlider label="Years of Adoption" min={1} max={12} step={1} value={evYears} onChange={setEvYears} fmt={v => `${v}yr`} hint={`Fleet on road: ~${fH(ev.fleetSize)} EVs (max ${G.evLifeYears}yr life)`} accent="#fb923c" />
                <ModelSlider label="Efficiency (km/kWh)" min={3} max={9} step={0.1} value={evEff} onChange={setEvEff} fmt={v => `${v.toFixed(1)}`} hint="Typical EV 5–7 km/kWh · grid carbon shared with HP panel" accent="#fb923c" />

                <Toggle label="Vehicle-to-Grid (V2G) enabled" value={evV2G} onChange={setEvV2G} accent="#fb923c" />
                {evV2G && (
                  <ModelSlider label="V2G Enrolment Rate" min={5} max={80} step={1} value={evV2GEnrol} onChange={setEvV2GEnrol} fmt={v => `${v}%`} hint="% of EV owners enrolled in grid dispatch scheme" accent="#fb923c" />
                )}

                <div className="bg-gray-950 rounded-md p-3 border border-gray-800 mt-3">
                  <div className="text-[0.57rem] text-gray-600 font-semibold uppercase tracking-wider mb-1" style={{ fontFamily: M }}>Cost basis</div>
                  <div className="text-[0.63rem] text-gray-500 leading-relaxed" style={{ fontFamily: M }}>
                    CO₂ cost uses <span style={{ color: "#fb923c" }}>marginal premium</span> over equivalent petrol car ({C}{G.evPremiumOverPetrol.toLocaleString()} net after grants), not full vehicle price. This is the fairest basis — you were buying a car anyway.
                  </div>
                </div>
              </div>

              {/* EV Output */}
              <div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <InfoCard label="EV fleet on road" value={fH(ev.fleetSize)} sub={`${fH(ev.evsSold)}/yr new sales`} accent="#fb923c" />
                  <InfoCard label="Marginal capex" value={fv(ev.marginalCapex_bn)} sub={`${C}${G.evPremiumOverPetrol.toLocaleString()} premium/car`} accent="#fb923c" />
                  <InfoCard label="Annual fuel saving" value={fv(ev.annFuelSaving_bn)} sub={`${C}${G.annualFuelSaving_per_ev.toLocaleString()}/car/yr`} accent="#34d399" />
                </div>

                {/* Per vehicle */}
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 mb-3">
                  <div className="text-[0.58rem] text-gray-500 uppercase tracking-wider mb-2" style={{ fontFamily: M }}>Per vehicle · single car comparison</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      ["Petrol CO₂", `${Math.round(G.avgMileage_km * G.avgPetrolEmissions_gCO2_km / 1000)}kg/yr`, "#f87171"],
                      ["EV CO₂ (now)", `${Math.round(G.avgMileage_km / evEff * hpCNow / 1000)}kg/yr`, "#fb923c"],
                      ["Net saving (now)", `${Math.round(ev.netCO2_now_kg)}kg/yr`, ev.netCO2_now_kg > 0 ? "#34d399" : "#f87171"],
                      ["Net saving (2035)", `${Math.round(ev.netCO2_2035_kg)}kg/yr`, "#fdba74"],
                    ] as const).map(([l, v, col]) => (
                      <div key={l}>
                        <div className="text-[0.57rem] text-gray-500 uppercase mb-0.5" style={{ fontFamily: M }}>{l}</div>
                        <div className="text-sm font-bold" style={{ color: col, fontFamily: M }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  <div className="grid grid-cols-2 gap-2">
                    <InfoCard label="Fleet CO₂ (now)" value={fMt(ev.fleetCO2_now_Mt)} sub={`${Math.round(ev.netCO2_now_kg)}kg/car/yr`} accent="#fb923c" />
                    <InfoCard label="Fleet CO₂ (2035)" value={fMt(ev.fleetCO2_2035_Mt)} sub={`${Math.round(ev.netCO2_2035_kg)}kg/car/yr`} accent="#fdba74" />
                    <InfoCard label="CPT · now" value={ev.cptMarg_now < 900 ? `${C}${Math.round(ev.cptMarg_now)}/t` : "—"} sub="marginal cost basis" accent="#fb923c" />
                    <InfoCard label="CPT · 2035" value={ev.cptMarg_2035 < 900 ? `${C}${Math.round(ev.cptMarg_2035)}/t` : "—"} sub="as grid decarbonises" accent="#fdba74" />
                  </div>

                  {/* V2G panel */}
                  <div className={`border rounded-lg p-3 transition-all ${evV2G ? "bg-gray-900/50 border-orange-400/25" : "bg-gray-950 border-gray-800"}`}>
                    <div className="text-[0.58rem] uppercase tracking-wider mb-2 font-bold" style={{ fontFamily: M, color: evV2G ? "#fb923c" : "#374151" }}>
                      V2G Grid Contribution {evV2G ? "· active" : "· disabled"}
                    </div>
                    {evV2G ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <InfoCard label="V2G fleet capacity" value={fGW(ev.v2gCap_GW)} accent="#fb923c" />
                          <InfoCard label="Peak smoothing" value={`${ev.v2gPeakSmooth.toFixed(0)}%`} sub="of residential peak" accent="#fb923c" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <InfoCard label="Grid saving" value={fv(ev.v2gGridSaving_bn)} sub="peaker displacement" accent="#34d399" />
                          <InfoCard label="V2G arbitrage" value={fv(ev.v2gArbitrage_bn)} sub="ToU earning est." accent="#34d399" />
                        </div>
                        <div className="text-[0.6rem] text-gray-600 mt-2 leading-relaxed" style={{ fontFamily: M }}>
                          Each EV battery ({G.evBatterySize_kWh} kWh) is {(G.evBatterySize_kWh / bSize).toFixed(0)}× the size of a typical home battery.
                        </div>
                      </>
                    ) : (
                      <div className="text-[0.63rem] text-gray-700 leading-relaxed" style={{ fontFamily: M }}>
                        Enable V2G to see the EV fleet acting as distributed grid storage. At {G.evBatterySize_kWh} kWh per car, a V2G-enrolled EV fleet is the largest potential grid battery asset.
                      </div>
                    )}
                  </div>
                </div>

                <CBBox title="EV Fleet (marginal cost)" accent="#fb923c" C={C}
                  rows={[
                    ["Marginal capex (÷12yr)", ev.annMargCapex, false],
                    ["Fuel saving", ev.annFuelSaving_bn, true],
                    ...(evV2G ? [["V2G grid + arbitrage", ev.v2gGridSaving_bn + ev.v2gArbitrage_bn, true] as [string, number, boolean]] : []),
                  ]}
                  net={ev.netMarg} netLabel="Net annual (marginal)" />
              </div>
            </div>
          </div>

          <Divider label="Section 4 — All Interventions CO₂ & Cost Comparison" />

          {/* ══ Section 4: Six-Way ══ */}
          <SixWay items={sixItems} C={C} />

          <div className="text-[0.57rem] text-gray-700 leading-relaxed text-center mt-2" style={{ fontFamily: M }}>
            High-level indicative model · all figures respond live · EV uses marginal cost over equivalent petrol car · sources: NREL ATB, BNEF, Ofgem, NESO FES, SMMT, DfT, Carbon Brief
          </div>
        </div>
      </div>
    </main>
  );
}
