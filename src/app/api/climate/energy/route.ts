import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'climate:energy:v5';
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
  biofuelShareElec: number | null;
  otherRenewShareElecExcBiofuel: number | null;
  // Electricity generation (TWh)
  electricityGeneration: number | null;
  // Carbon
  carbonIntensity: number | null;
  ghgEmissions: number | null;
  ghgPerCapita: number | null;
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
      biofuelShareElec: num(r.biofuel_share_elec),
      otherRenewShareElecExcBiofuel: num(r.other_renewables_share_elec_exc_biofuel),
      electricityGeneration: num(r.electricity_generation),
      carbonIntensity: num(r.carbon_intensity_elec),
      ghgEmissions: num(r.greenhouse_gas_emissions),
      ghgPerCapita: (() => {
        const ghg = num(r.greenhouse_gas_emissions);
        const pop = num(r.population);
        return ghg != null && pop != null && pop > 0 ? Number(((ghg * 1e6) / pop).toFixed(2)) : null;
      })(),
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
  const state = searchParams.get('state');       // optional: US state 2-letter code
  const stateName = searchParams.get('stateName'); // optional: display name

  try {
    // Check cache
    const cached = await getCached<EnergyData>(CACHE_KEY);
    if (cached) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL_HOURS * 60 * 60 * 1000) {
        if (state) {
          return await fetchStateResponse(state, stateName || state, cached);
        }
        if (country) {
          return await fetchCountryResponse(country, cached);
        }
        return NextResponse.json({ ...cached, source: 'cache' });
      }
    }

    // Fetch fresh
    const data = await fetchEnergyData();
    await setShortTerm(CACHE_KEY, data);

    if (state) {
      return await fetchStateResponse(state, stateName || state, data);
    }
    if (country) {
      return await fetchCountryResponse(country, data);
    }

    return NextResponse.json({ ...data, source: 'fresh' });
  } catch (err: any) {
    // Serve stale cache on error
    const stale = await getCached<EnergyData>(CACHE_KEY);
    if (stale) {
      if (state) {
        return await fetchStateResponse(state, stateName || state, stale);
      }
      if (country) {
        return await fetchCountryResponse(country, stale);
      }
      return NextResponse.json({ ...stale, source: 'stale-cache' });
    }
    return NextResponse.json({ error: err.message || 'Failed to fetch energy data' }, { status: 500 });
  }
}

async function fetchCountryResponse(countryName: string, worldData: EnergyData) {
  // We need to fetch the full OWID dataset again for the country
  // Check country cache first
  const countryKey = `climate:energy:v5:country:${countryName.toLowerCase().replace(/\s+/g, '-')}`;
  const cached = await getCached<CountryEnergy>(countryKey);
  if (cached) {
    return NextResponse.json({ world: worldData.world, country: cached, fetchedAt: worldData.fetchedAt, source: 'cache' });
  }

  const raw = await fetchJSON(OWID_URL);
  if (!raw || !raw[countryName]?.data) {
    return NextResponse.json({ world: worldData.world, country: null, fetchedAt: worldData.fetchedAt, source: 'fresh' });
  }

  const countryData = buildCountryEnergy(countryName, raw[countryName].data);
  await setShortTerm(countryKey, countryData);

  return NextResponse.json({ world: worldData.world, country: countryData, fetchedAt: worldData.fetchedAt, source: 'fresh' });
}

// ─── EIA State Energy ────────────────────────────────────────────────────────

const EIA_API_KEY = process.env.EIA_API_KEY || 'DEMO_KEY';
const BTU_TO_TWH = 0.000293071; // 1 billion BTU = 0.000293071 TWh

// Series IDs for the metrics we care about
const EIA_SERIES = [
  'TETCB', // Total energy consumption (billion BTU)
  'FFTCB', // Fossil fuels total consumption
  'RETCB', // Renewable energy total consumption
  'NUETB', // Nuclear energy total
  'CLTCB', // Coal total consumption
  'NGTCB', // Natural gas total consumption
  'PMTCB', // Petroleum total consumption
  'SOTCB', // Solar energy total consumption
  'WYTCB', // Wind energy total consumption
  'HYTCB', // Hydropower total consumption
  'BFTCB', // Biofuels total consumption
  'FFTCE', // Fossil fuel CO2 emissions (million metric tons)
  'ESTCB', // Electricity total consumption (billion BTU)
  // Electric power sector by source (for electricity mix)
  'CLEIB', // Coal – electric power sector (billion BTU)
  'NGEIB', // Natural gas – electric power sector
  'PAEIB', // Petroleum – electric power sector
  'NUEGB', // Nuclear – electricity generation (billion BTU)
  'SOEGB', // Solar – electricity generation (billion BTU)
  'WYEGB', // Wind – electricity generation (billion BTU)
  'HYEGB', // Hydroelectric – electricity generation (billion BTU)
  // Per capita & population
  'TPOPP', // Resident population (thousands)
  'TETPB', // Total energy consumption per capita (million BTU/person)
  'ESTPP', // Electricity consumption per capita (kWh/person)
];

function buildEIAUrl(stateIds: string[]) {
  const params = new URLSearchParams();
  params.set('api_key', EIA_API_KEY);
  params.set('frequency', 'annual');
  params.set('data[0]', 'value');
  params.set('start', '1970');
  params.set('length', '10000');
  params.set('sort[0][column]', 'period');
  params.set('sort[0][direction]', 'asc');
  for (const sid of EIA_SERIES) {
    params.append('facets[seriesId][]', sid);
  }
  for (const st of stateIds) {
    params.append('facets[stateId][]', st);
  }
  return `https://api.eia.gov/v2/seds/data/?${params.toString()}`;
}

interface EIARow {
  period: string;
  seriesId: string;
  value: string | number | null;
  stateId: string;
}

function buildEIACountryEnergy(name: string, rows: EIARow[]): CountryEnergy {
  // Group by year
  const byYear = new Map<number, Record<string, number | null>>();
  for (const row of rows) {
    const year = parseInt(row.period, 10);
    if (isNaN(year)) continue;
    if (!byYear.has(year)) byYear.set(year, {});
    const yData = byYear.get(year)!;
    const v = row.value != null && row.value !== '' ? Number(row.value) : null;
    yData[row.seriesId] = v;
  }

  const sortedYears = Array.from(byYear.entries()).sort((a, b) => a[0] - b[0]);

  // Drop the final year if its total energy is < 80% of the prior year (partial/preliminary data)
  if (sortedYears.length >= 2) {
    const last = sortedYears[sortedYears.length - 1][1];
    const prev = sortedYears[sortedYears.length - 2][1];
    const lastTotal = last.TETCB ?? 0;
    const prevTotal = prev.TETCB ?? 1;
    if (prevTotal > 0 && lastTotal < prevTotal * 0.8) {
      sortedYears.pop();
    }
  }

  const yearly: EnergyYearlyPoint[] = [];
  for (const [year, d] of sortedYears) {
    const total = d.TETCB != null ? d.TETCB * BTU_TO_TWH : null;
    const fossil = d.FFTCB != null ? d.FFTCB * BTU_TO_TWH : null;
    const renewables = d.RETCB != null ? d.RETCB * BTU_TO_TWH : null;
    const nuclear = d.NUETB != null ? d.NUETB * BTU_TO_TWH : null;
    const coal = d.CLTCB != null ? d.CLTCB * BTU_TO_TWH : null;
    const gas = d.NGTCB != null ? d.NGTCB * BTU_TO_TWH : null;
    const oil = d.PMTCB != null ? d.PMTCB * BTU_TO_TWH : null;
    const solar = d.SOTCB != null ? d.SOTCB * BTU_TO_TWH : null;
    const wind = d.WYTCB != null ? d.WYTCB * BTU_TO_TWH : null;
    const hydro = d.HYTCB != null ? d.HYTCB * BTU_TO_TWH : null;
    const biofuel = d.BFTCB != null ? d.BFTCB * BTU_TO_TWH : null;

    // Calculate primary energy shares using sum of components as denominator
    // (TETCB can be less than sum of parts for net-exporter states like Texas)
    const componentSum = (fossil ?? 0) + (renewables ?? 0) + (nuclear ?? 0);
    const hasComponents = componentSum > 0 && (fossil != null || renewables != null || nuclear != null);
    const fossilShare = hasComponents && fossil != null ? Number(((fossil / componentSum * 100)).toFixed(1)) : null;
    const renewablesShare = hasComponents && renewables != null ? Number(((renewables / componentSum * 100)).toFixed(1)) : null;
    const nuclearShare = hasComponents && nuclear != null ? Number(((nuclear / componentSum * 100)).toFixed(1)) : null;

    // Electricity generation shares from electric-power-sector data
    const elecCoal = d.CLEIB != null ? d.CLEIB : null;
    const elecGas = d.NGEIB != null ? d.NGEIB : null;
    const elecPetro = d.PAEIB != null ? d.PAEIB : null;
    const elecNuclear = d.NUEGB != null ? d.NUEGB : null;
    const elecSolar = d.SOEGB != null ? d.SOEGB : null;
    const elecWind = d.WYEGB != null ? d.WYEGB : null;
    const elecHydro = d.HYEGB != null ? d.HYEGB : null;

    // Sum all electric sector inputs to calculate shares
    const elecInputs = [elecCoal, elecGas, elecPetro, elecNuclear, elecSolar, elecWind, elecHydro];
    const elecTotal = elecInputs.reduce<number>((s, v) => s + (v ?? 0), 0);
    const hasElec = elecTotal > 0 && elecInputs.some(v => v != null);

    const pct = (v: number | null) => hasElec && v != null ? Number(((v / elecTotal) * 100).toFixed(1)) : null;
    const coalShareElec = pct(elecCoal);
    const gasShareElec = pct(elecGas);
    const oilShareElec = pct(elecPetro);
    const nuclearShareElec = pct(elecNuclear);
    const solarShareElec = pct(elecSolar);
    const windShareElec = pct(elecWind);
    const hydroShareElec = pct(elecHydro);
    const renewablesShareElec = hasElec ? Number((((elecSolar ?? 0) + (elecWind ?? 0) + (elecHydro ?? 0)) / elecTotal * 100).toFixed(1)) : null;
    const fossilShareElec = hasElec ? Number((((elecCoal ?? 0) + (elecGas ?? 0) + (elecPetro ?? 0)) / elecTotal * 100).toFixed(1)) : null;

    yearly.push({
      year,
      fossil: fossil != null ? Number(fossil.toFixed(1)) : null,
      renewables: renewables != null ? Number(renewables.toFixed(1)) : null,
      nuclear: nuclear != null ? Number(nuclear.toFixed(1)) : null,
      coal: coal != null ? Number(coal.toFixed(1)) : null,
      gas: gas != null ? Number(gas.toFixed(1)) : null,
      oil: oil != null ? Number(oil.toFixed(1)) : null,
      solar: solar != null ? Number(solar.toFixed(1)) : null,
      wind: wind != null ? Number(wind.toFixed(1)) : null,
      hydro: hydro != null ? Number(hydro.toFixed(1)) : null,
      biofuel: biofuel != null ? Number(biofuel.toFixed(1)) : null,
      fossilShareEnergy: fossilShare,
      renewablesShareEnergy: renewablesShare,
      nuclearShareEnergy: nuclearShare,
      coalShareElec,
      gasShareElec,
      oilShareElec,
      solarShareElec,
      windShareElec,
      hydroShareElec,
      nuclearShareElec,
      renewablesShareElec,
      fossilShareElec,
      biofuelShareElec: null, // Not available from EIA SEDS
      otherRenewShareElecExcBiofuel: null,
      electricityGeneration: d.ESTCB != null ? Number((d.ESTCB * BTU_TO_TWH).toFixed(1)) : null,
      carbonIntensity: null, // Not directly available from SEDS
      ghgEmissions: d.FFTCE != null ? Number(Number(d.FFTCE).toFixed(1)) : null, // million metric tons CO2
      ghgPerCapita: (() => {
        // FFTCE = million metric tons CO2, TPOPP = thousands of people
        // → (FFTCE * 1e6) / (TPOPP * 1e3) = tonnes per person
        const co2 = d.FFTCE != null ? Number(d.FFTCE) : null;
        const pop = d.TPOPP != null ? Number(d.TPOPP) : null;
        return co2 != null && pop != null && pop > 0 ? Number(((co2 * 1e6) / (pop * 1e3)).toFixed(2)) : null;
      })(),
      energyPerCapita: d.TETPB != null ? Number((Number(d.TETPB) * 293.071).toFixed(0)) : null, // million BTU → kWh
      perCapitaElectricity: d.ESTPP != null ? Number(Number(d.ESTPP).toFixed(0)) : null, // already kWh/person
      primaryEnergy: total != null ? Number(total.toFixed(1)) : null,
      population: d.TPOPP != null ? Number(d.TPOPP) * 1000 : null, // thousands → actual
    });
  }

  return { name, yearly, latest: extractLatest(yearly) };
}

async function fetchStateResponse(stateCode: string, stateName: string, worldData: EnergyData) {
  const cacheKey = `climate:energy:v2:state:${stateCode.toLowerCase()}`;
  const cached = await getCached<{ state: CountryEnergy; usa: CountryEnergy }>(cacheKey);
  if (cached) {
    return NextResponse.json({
      world: worldData.world,
      country: cached.usa,
      usState: cached.state,
      fetchedAt: worldData.fetchedAt,
      source: 'cache',
    });
  }

  // Fetch state + US totals in a single API call
  const url = buildEIAUrl([stateCode.toUpperCase(), 'US']);
  const raw = await fetchJSON(url);
  if (!raw?.response?.data?.length) {
    return NextResponse.json({
      world: worldData.world,
      country: null,
      usState: null,
      fetchedAt: worldData.fetchedAt,
      source: 'fresh',
    });
  }

  const rows = raw.response.data as EIARow[];
  const stateRows = rows.filter(r => r.stateId === stateCode.toUpperCase());
  const usRows = rows.filter(r => r.stateId === 'US');

  if (stateRows.length === 0) {
    return NextResponse.json({
      world: worldData.world,
      country: null,
      usState: null,
      fetchedAt: worldData.fetchedAt,
      source: 'fresh',
    });
  }

  const stateData = buildEIACountryEnergy(stateName, stateRows);
  const usaData = buildEIACountryEnergy('United States', usRows);

  await setShortTerm(cacheKey, { state: stateData, usa: usaData });

  return NextResponse.json({
    world: worldData.world,
    country: usaData,
    usState: stateData,
    fetchedAt: worldData.fetchedAt,
    source: 'fresh',
  });
}
