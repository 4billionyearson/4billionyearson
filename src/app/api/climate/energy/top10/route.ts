import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'climate:energy-top10:v2';
const OWID_URL = 'https://owid-public.owid.io/data/energy/owid-energy-data.json';

// Regions / aggregates to exclude from country rankings
const EXCLUDE = new Set([
  'World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
  'European Union (27)', 'High-income countries', 'Upper-middle-income countries',
  'Lower-middle-income countries', 'Low-income countries', 'OECD',
  'Non-OECD', 'Asia Pacific', 'CIS', 'Middle East',
  'Central America (BP)', 'Eastern Africa (BP)', 'Middle Africa (BP)',
  'Western Africa (BP)', 'South & Cent. America',
]);

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

interface RankEntry { name: string; value: number; year: number }

async function fetchJSON(url: string, timeout = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

function getLatest(records: any[], field: string): { value: number; year: number } | null {
  for (let i = records.length - 1; i >= 0; i--) {
    const v = num(records[i][field]);
    if (v != null && v > 0) {
      return { value: v, year: records[i].year };
    }
  }
  return null;
}

export async function GET() {
  const cached = await getCached<any>(CACHE_KEY);
  if (cached) return NextResponse.json({ ...cached, source: 'cache' });

  try {
    const raw = await fetchJSON(OWID_URL);
    if (!raw) throw new Error('Failed to fetch OWID energy data');

    const renewableTWh: RankEntry[] = [];
    const renewableShare: RankEntry[] = [];
    const solarTWh: RankEntry[] = [];
    const windTWh: RankEntry[] = [];
    const electricityGen: RankEntry[] = [];
    const energyPerCap: RankEntry[] = [];
    const carbonIntensity: RankEntry[] = [];
    const fossilShare: RankEntry[] = [];

    for (const [name, countryObj] of Object.entries(raw as Record<string, any>)) {
      if (EXCLUDE.has(name)) continue;
      if (!countryObj?.data?.length) continue;
      // Must have iso_code to be a real country (skip other aggregates)
      if (!countryObj.iso_code) continue;

      const data = countryObj.data;

      const ren = getLatest(data, 'renewables_consumption');
      if (ren) renewableTWh.push({ name, value: ren.value, year: ren.year });

      const renS = getLatest(data, 'renewables_share_energy');
      if (renS && renS.value > 0) renewableShare.push({ name, value: renS.value, year: renS.year });

      const sol = getLatest(data, 'solar_consumption');
      if (sol) solarTWh.push({ name, value: sol.value, year: sol.year });

      const win = getLatest(data, 'wind_consumption');
      if (win) windTWh.push({ name, value: win.value, year: win.year });

      const elec = getLatest(data, 'electricity_generation');
      if (elec) electricityGen.push({ name, value: elec.value, year: elec.year });

      const epc = getLatest(data, 'energy_per_capita');
      if (epc) energyPerCap.push({ name, value: epc.value, year: epc.year });

      const ci = getLatest(data, 'carbon_intensity_elec');
      if (ci && ci.value > 0) carbonIntensity.push({ name, value: ci.value, year: ci.year });

      const fos = getLatest(data, 'fossil_share_energy');
      if (fos && fos.value > 0) fossilShare.push({ name, value: fos.value, year: fos.year });
    }

    const top = (arr: RankEntry[], n = 20) =>
      [...arr].sort((a, b) => b.value - a.value).slice(0, n);

    // For renewable share: top 20 highest share among countries with meaningful electricity
    const topRenShare = [...renewableShare]
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    // Lowest carbon intensity (cleanest grids) – filter out tiny producers
    const cleanestGrids = [...carbonIntensity]
      .filter(c => {
        const elec = electricityGen.find(e => e.name === c.name);
        return elec && elec.value > 10; // At least 10 TWh
      })
      .sort((a, b) => a.value - b.value)
      .slice(0, 20);

    // Most fossil-dependent (highest fossil share)
    const mostFossil = [...fossilShare]
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    const result = {
      top10RenewableTWh: top(renewableTWh),
      top10RenewableShare: topRenShare,
      top10Solar: top(solarTWh),
      top10Wind: top(windTWh),
      top10Electricity: top(electricityGen),
      top10EnergyPerCapita: top(energyPerCap),
      cleanestGrids,
      mostFossil,
      fetchedAt: new Date().toISOString(),
    };

    await setShortTerm(CACHE_KEY, result);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Energy top10 error:', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
