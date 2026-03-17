import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'climate:extreme-weather:v2';

// OWID indicator IDs (EM-DAT data, entities = disaster types)
const INDICATORS = {
  disasters: 1119227,    // Count by type
  deaths: 1119239,       // Deaths by type
  affected: 1119231,     // Total affected
  damages: 1119234,      // Economic damages (current US$)
};

// Entity ID → weather/climate disaster type label
// Excludes geological events (earthquakes, volcanic activity, dry mass movement) and fog
const ENTITY_MAP: Record<number, string> = {
  34688: 'Drought',
  34697: 'Extreme temperature',
  34698: 'Extreme weather',
  34695: 'Flood',
  352876: 'Wildfire',
  369453: 'Wet mass movement',
  369454: 'Glacial lake outburst flood',
};

async function fetchJSON(url: string, timeout = 15000) {
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

function parseOWID(data: any) {
  if (!data?.years) return [];
  const { years, entities, values } = data;
  const result: { year: number; entityId: number; value: number }[] = [];
  for (let i = 0; i < years.length; i++) {
    result.push({ year: years[i], entityId: entities[i], value: values[i] });
  }
  return result;
}

// GDACS live events
async function fetchGDACS() {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
  const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC,FL,DR,WF&fromDate=${from}&toDate=${to}&alertlevel=Green;Orange;Red`;
  const data = await fetchJSON(url, 20000);
  if (!data?.features) return [];
  return data.features.map((f: any) => {
    const p = f.properties;
    return {
      type: p.eventtype,
      name: (p.name || '').replace(/\s*\[GDACS\]\s*/g, ' ').trim(),
      alertLevel: p.alertlevel,
      country: p.country || '',
      fromDate: p.fromdate,
      toDate: p.todate,
      severity: p.severitydata?.severitytext || '',
      population: p.severitydata?.severity || 0,
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
      url: p.url?.report || '',
    };
  });
}

export async function GET() {
  const cached = await getCached<any>(CACHE_KEY);
  if (cached) return NextResponse.json({ ...cached, source: 'cache' });

  try {
    const [disastersRaw, deathsRaw, affectedRaw, damagesRaw, gdacsEvents] = await Promise.all([
      fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.disasters}.data.json`),
      fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.deaths}.data.json`),
      fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.affected}.data.json`),
      fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.damages}.data.json`),
      fetchGDACS(),
    ]);

    const disasters = parseOWID(disastersRaw);
    const deaths = parseOWID(deathsRaw);
    const affected = parseOWID(affectedRaw);
    const damages = parseOWID(damagesRaw);

    // Build yearly breakdown by type
    function buildByType(rows: { year: number; entityId: number; value: number }[]) {
      const byYear: Record<number, Record<string, number>> = {};
      for (const r of rows) {
        const label = ENTITY_MAP[r.entityId];
        if (!label) continue;
        if (!byYear[r.year]) byYear[r.year] = {};
        byYear[r.year][label] = r.value;
      }
      return Object.entries(byYear)
        .map(([y, types]) => ({ year: Number(y), ...types }))
        .sort((a, b) => a.year - b.year);
    }

    // Build annual totals by summing weather/climate types only
    function buildTotal(rows: { year: number; entityId: number; value: number }[]) {
      const byYear: Record<number, number> = {};
      for (const r of rows) {
        if (!ENTITY_MAP[r.entityId]) continue;
        byYear[r.year] = (byYear[r.year] || 0) + r.value;
      }
      return Object.entries(byYear)
        .map(([y, v]) => ({ year: Number(y), value: v }))
        .sort((a, b) => a.year - b.year);
    }

    const result = {
      disastersByType: buildByType(disasters),
      deathsByType: buildByType(deaths),
      totalDisasters: buildTotal(disasters),
      totalDeaths: buildTotal(deaths),
      totalAffected: buildTotal(affected),
      totalDamages: buildTotal(damages),
      gdacsEvents,
      fetchedAt: new Date().toISOString(),
    };

    await setShortTerm(CACHE_KEY, result);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch extreme weather data' }, { status: 500 });
  }
}
