"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Loader2, Zap, Flame, Sun, Wind, Globe,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RankEntry { name: string; value: number; year: number }

interface Top10Data {
  top10RenewableTWh: RankEntry[];
  top10RenewableShare: RankEntry[];
  top10Solar: RankEntry[];
  top10Wind: RankEntry[];
  top10Electricity: RankEntry[];
  top10EnergyPerCapita: RankEntry[];
  cleanestGrids: RankEntry[];
  mostFossil: RankEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTWh = (v: number) =>
  v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));

const RANK_COLORS = [
  "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5",
  "#bef264", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f",
  "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5",
  "#bef264", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f",
];

// ─── Reusable layout ────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-950/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-[#D2E369]">
      <h2 className="text-xl font-bold font-mono text-white mb-5 flex items-center gap-2 [&>svg]:h-6 [&>svg]:w-6 md:[&>svg]:h-5 md:[&>svg]:w-5">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Bar chart ───────────────────────────────────────────────────────────────

function Top10BarChart({ data, label, unit, formatFn, tipFormatFn }: {
  data: RankEntry[];
  label: string;
  unit: string;
  formatFn?: (v: number) => string;
  tipFormatFn?: (v: number) => string;
}) {
  const fmt = formatFn || ((v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
  const tipFmt = tipFormatFn || formatFn || ((v: number) => Math.round(v).toLocaleString());
  const chartData = data.map((d) => ({ name: d.name, value: d.value }));
  return (
    <div className="h-[750px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#A99B8D" }} tickLine={false} axisLine={false}
            tickFormatter={(v) => fmt(v)} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#D3C8BB" }} tickLine={false} axisLine={false} />
          <Tooltip content={({ active, payload, label: l }: any) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                <p className="font-semibold text-gray-200 text-sm">{l}</p>
                <p style={{ color: payload[0]?.fill }} className="text-sm">
                  {tipFmt(payload[0]?.value)} {unit}
                </p>
              </div>
            );
          }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={RANK_COLORS[i] || "#10b981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EnergyRankingsPage() {
  const [top10, setTop10] = useState<Top10Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/climate/energy/top10")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setTop10(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Hero */}
          <div className="rounded-2xl border-2 border-[#D2E369] shadow-xl overflow-hidden">
            <div className="px-4 py-3 md:px-6 md:py-4 rounded-t-[14px]" style={{ backgroundColor: '#D2E369' }}>
              <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-wide leading-tight" style={{ color: '#2C5263' }}>
                Energy Rankings
              </h1>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md p-4">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed">
                Which countries lead the clean energy transition – and which remain most dependent on fossil fuels?
                Rankings are based on the latest available data from Our World in Data and the Energy Institute.
              </p>
            </div>
          </div>

        {loading && (
          <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#D2E369] flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-gray-400 text-sm">Loading global rankings…</p>
          </div>
        )}

        {!loading && !top10 && (
          <div className="bg-gray-950/90 backdrop-blur-md p-12 rounded-2xl shadow-xl border-2 border-[#D2E369] text-center">
            <p className="text-gray-400">Unable to load ranking data. Please try again later.</p>
          </div>
        )}

        {top10 && (
          <>
            {/* Top 20 Renewable Energy (TWh) */}
            <SectionCard icon={<Sun className="h-5 w-5 text-emerald-400" />} title="Top 20 Renewable Energy Producers">
              <Top10BarChart data={top10.top10RenewableTWh} label="Renewable Energy" unit="TWh" formatFn={formatTWh} />
              <p className="text-sm text-gray-400 mt-4">
                The largest renewable energy producers in absolute terms (TWh). Large economies dominate due to scale, but their investment signals where the transition is gathering pace.{" "}
                Source:{" "}
                <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
                / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a> (CC-BY).
              </p>
            </SectionCard>

            {/* Top 20 Renewable Share (%) */}
            <SectionCard icon={<Globe className="h-5 w-5 text-green-400" />} title="Top 20 by Renewable Energy Share">
              <Top10BarChart data={top10.top10RenewableShare} label="Renewable Share" unit="%"
                formatFn={(v) => `${Math.round(v)}%`}
                tipFormatFn={(v) => `${v.toFixed(1)}%`} />
              <p className="text-sm text-gray-400 mt-4">
                Countries with the highest share of renewables in their total energy mix, often leveraging abundant hydro, geothermal, or wind resources.{" "}
                Source:{" "}
                <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
                / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a> (CC-BY).
              </p>
            </SectionCard>

            {/* Top 20 Solar */}
            <SectionCard icon={<Sun className="h-5 w-5 text-yellow-400" />} title="Top 20 Solar Energy Producers">
              <Top10BarChart data={top10.top10Solar} label="Solar Energy" unit="TWh" formatFn={formatTWh} />
              <p className="text-sm text-gray-400 mt-4">
                Solar energy has experienced exponential growth over the past decade. These are the leading producers by total output (TWh).{" "}
                Source:{" "}
                <a href="https://ember-climate.org/data/data-tools/data-explorer/" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Ember Global Electricity Review</a> (CC-BY).
              </p>
            </SectionCard>

            {/* Top 20 Wind */}
            <SectionCard icon={<Wind className="h-5 w-5 text-cyan-400" />} title="Top 20 Wind Energy Producers">
              <Top10BarChart data={top10.top10Wind} label="Wind Energy" unit="TWh" formatFn={formatTWh} />
              <p className="text-sm text-gray-400 mt-4">
                Wind power is the second-largest renewable source globally. Ranked by total output (TWh).{" "}
                Source:{" "}
                <a href="https://ember-climate.org/data/data-tools/data-explorer/" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Ember Global Electricity Review</a> (CC-BY).
              </p>
            </SectionCard>

            {/* Cleanest Grids */}
            <SectionCard icon={<Zap className="h-5 w-5 text-green-400" />} title="Cleanest Electricity Grids">
              <Top10BarChart data={top10.cleanestGrids} label="Carbon Intensity" unit="gCO₂/kWh"
                formatFn={(v) => `${Math.round(v)}`} />
              <p className="text-sm text-gray-400 mt-4">
                Countries with the lowest carbon intensity of electricity (gCO₂/kWh), typically through a mix of hydro, nuclear, wind, and solar.{" "}
                Source:{" "}
                <a href="https://ember-climate.org/data/data-tools/data-explorer/" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Ember Global Electricity Review</a> (CC-BY).
              </p>
            </SectionCard>

            {/* Most Fossil-Dependent */}
            <SectionCard icon={<Flame className="h-5 w-5 text-red-400" />} title="Most Fossil-Dependent Nations">
              <Top10BarChart data={top10.mostFossil} label="Fossil Share" unit="%"
                formatFn={(v) => `${Math.round(v)}%`}
                tipFormatFn={(v) => `${v.toFixed(1)}%`} />
              <p className="text-sm text-gray-400 mt-4">
                Countries most reliant on fossil fuels, often due to abundant domestic oil, gas, or coal reserves.{" "}
                Source:{" "}
                <a href="https://ourworldindata.org/energy" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Our World in Data</a>{" "}
                / <a href="https://www.energyinst.org/statistical-review" target="_blank" rel="noopener noreferrer" className="text-[#D2E369] hover:underline">Energy Institute Statistical Review</a> (CC-BY).
              </p>
            </SectionCard>


          </>
        )}
        </div>
      </div>
    </main>
  );
}
