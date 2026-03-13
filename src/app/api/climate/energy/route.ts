import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'climate:energy:v1';
const CACHE_TTL_HOURS = 24;

const OWID_URL = 'https://owid-public.owid.io/data/energy/owid-energy-data.json';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OwidYearRecord {
  year: number;
  [key: string]: number | undefined;
}

interface EnergyYearlyPoint {
  year: number;
  fossil: number | null;
  renewables: number | null;
  nuclear: number | null;
  coal: number | null;
  gas: number | null;
  oil: number | null;
  solar: number | null;
  wind: number | null;
  hydro: number | null;
  biofuel: number | null;
  // Shares (%)
  fossilShareEnergy: number | null;
  renewablesShareEnergy: number | null;
  nuclearShareEnergy: number | null;
  // Electricity shares (%)
  coalShareElec: number | null;
  gasShareElec: number | null;
  oilShareElec: number | null;
  solarShareElec: number | null;
  windShareElec: number | null;
  hydroShareElec: number | null;
  nuclearShareElec: number | null;
  renewablesShareElec: number | null;
  fossilShareElec: number | null;
  // Electricity generation (TWh)
  electricityGeneration: number | null;
  // Carbon
  carbonIntensity: number | null;
  ghgEmissions: number | null;
  // Per capita
  energyPerCapita: number | null;
  perCapitaElectricity: number | null;
  // Totals
  primaryEnergy: number | null;
  population: number | null;
}

interface LatestStats {
  year: number;
  fossilShare: number | null;
  renewablesShare: number | null;
  nuclearShare: number | null;
  solarShareElec: number | null;
  windShareElec: number | null;
  carbonIntensity: number | null;
  electricityGeneration: number | null;
  ghgEmissions: number | null;
}

interface CountryEnergy {
  name: string;
  yearly: EnergyYearlyPoint[];
  latest: LatestStats | null;
}

interface EnergyData {
  world: CountryEnergy;
  fetchedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function extractYearly(records: OwidYearRecord[]): EnergyYearlyPoint[] {
  return records
    .filter(r => r.year != null)
    .map(r => ({
      year: r.year,
      fossil: num(r.fossil_fuel_consumption),
      renewables: num(r.renewables_consumption),
      nuclear: num(r.nuclear_consumption),
      coal: num(r.coal_consumption),
      gas: num(r.gas_consumption),
      oil: num(r.oil_consumption),
      solar: num(r.solar_consumption),
      wind: num(r.wind_consumption),
      hydro: num(r.hydro_consumption),
      biofuel: num(r.biofuel_consumption),
      fossilShareEnergy: num(r.fossil_share_energy),
      renewablesShareEnergy: num(r.renewables_share_energy),
      nuclearShareEnergy: num(r.nuclear_share_energy),
      coalShareElec: num(r.coal_share_elec),
      gasShareElec: num(r.gas_share_elec),
      oilShareElec: num(r.oil_share_elec),
      solarShareElec: num(r.solar_share_elec),
      windShareElec: num(r.wind_share_elec),
      hydroShareElec: num(r.hydro_share_elec),
      nuclearShareElec: num(r.nuclear_share_elec),
      renewablesShareElec: num(r.renewables_share_elec),
      fossilShareElec: num(r.fossil_share_elec),
      electricityGeneration: num(r.electricity_generation),
      carbonIntensity: num(r.carbon_intensity_elec),
      ghgEmissions: num(r.greenhouse_gas_emissions),
      energyPerCapita: num(r.energy_per_capita),
      perCapitaElectricity: num(r.per_capita_electricity),
      primaryEnergy: num(r.primary_energy_consumption),
      population: num(r.population),
    }))
    .sort((a, b) => a.year - b.year);
}

function extractLatest(yearly: EnergyYearlyPoint[]): LatestStats | null {
  // Find most recent year with meaningful data
  for (let i = yearly.length - 1; i >= 0; i--) {
    const y = yearly[i];
    if (y.fossilShareEnergy != null || y.renewablesShareEnergy != null) {
      return {
        year: y.year,
        fossilShare: y.fossilShareEnergy,
        renewablesShare: y.renewablesShareEnergy,
        nuclearShare: y.nuclearShareEnergy,
        solarShareElec: y.solarShareElec,
        windShareElec: y.windShareElec,
        carbonIntensity: y.carbonIntensity,
        electricityGeneration: y.electricityGeneration,
        ghgEmissions: y.ghgEmissions,
      };
    }
  }
  return null;
}

function buildCountryEnergy(name: string, records: OwidYearRecord[]): CountryEnergy {
  const yearly = extractYearly(records);
  return { name, yearly, latest: extractLatest(yearly) };
}

// ─── Main fetch ──────────────────────────────────────────────────────────────

async function fetchEnergyData(): Promise<EnergyData> {
  const raw = await fetchJSON(OWID_URL);
  if (!raw) throw new Error('Failed to fetch OWID energy data');

  const worldRaw = raw['World']?.data as OwidYearRecord[] | undefined;
  if (!worldRaw?.length) throw new Error('No World data in OWID response');

  const world = buildCountryEnergy('World', worldRaw);

  return {
    world,
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country'); // optional: fetch specific country

  try {
    // Check cache
    const cached = await getCached<EnergyData>(CACHE_KEY);
    if (cached) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL_HOURS * 60 * 60 * 1000) {
        // If a country is requested, we need to fetch it separately (not cached in base)
        if (country) {
          return await fetchCountryResponse(country, cached);
        }
        return NextResponse.json(cached);
      }
    }

    // Fetch fresh
    const data = await fetchEnergyData();
    await setShortTerm(CACHE_KEY, data);

    if (country) {
      return await fetchCountryResponse(country, data);
    }

    return NextResponse.json(data);
  } catch (err: any) {
    // Serve stale cache on error
    const stale = await getCached<EnergyData>(CACHE_KEY);
    if (stale) {
      if (country) {
        return await fetchCountryResponse(country, stale);
      }
      return NextResponse.json(stale);
    }
    return NextResponse.json({ error: err.message || 'Failed to fetch energy data' }, { status: 500 });
  }
}

async function fetchCountryResponse(countryName: string, worldData: EnergyData) {
  // We need to fetch the full OWID dataset again for the country
  // Check country cache first
  const countryKey = `climate:energy:country:${countryName.toLowerCase().replace(/\s+/g, '-')}`;
  const cached = await getCached<CountryEnergy>(countryKey);
  if (cached) {
    return NextResponse.json({ world: worldData.world, country: cached, fetchedAt: worldData.fetchedAt });
  }

  const raw = await fetchJSON(OWID_URL);
  if (!raw || !raw[countryName]?.data) {
    return NextResponse.json({ world: worldData.world, country: null, fetchedAt: worldData.fetchedAt });
  }

  const countryData = buildCountryEnergy(countryName, raw[countryName].data);
  await setShortTerm(countryKey, countryData);

  return NextResponse.json({ world: worldData.world, country: countryData, fetchedAt: worldData.fetchedAt });
}
