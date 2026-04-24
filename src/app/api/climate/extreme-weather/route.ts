import { NextResponse } from 'next/server';
import { getCached, setShortTerm, setLiveTerm } from '@/lib/climate/redis';

// Historical EM-DAT data - changes ~annually, safe to cache long.
const HIST_CACHE_KEY = 'climate:extreme-weather:hist:v1';
// Live GDACS events - must refresh often so new alerts surface quickly.
const LIVE_CACHE_KEY = 'climate:extreme-weather:gdacs:v1';

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
  34690: 'Wildfire',
  369360: 'Wet mass movement',
  369361: 'Glacial lake outburst flood',
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
      name: (p.name || '')
        .replace(/\s*\[GDACS\]\s*/g, ' ')
        // Normalise terminology: GDACS sometimes says 'Forest fires' - we use 'Wildfires' everywhere else.
        .replace(/\bForest fires?\b/gi, 'Wildfires')
        .trim(),
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
  try {
    // ── Historical EM-DAT (cache 30 days) ────────────────────────────────
    let historical = await getCached<any>(HIST_CACHE_KEY);
    if (!historical) {
      const [disastersRaw, deathsRaw, affectedRaw, damagesRaw] = await Promise.all([
        fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.disasters}.data.json`),
        fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.deaths}.data.json`),
        fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.affected}.data.json`),
        fetchJSON(`https://api.ourworldindata.org/v1/indicators/${INDICATORS.damages}.data.json`),
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

      historical = {
        disastersByType: buildByType(disasters),
        deathsByType: buildByType(deaths),
        totalDisasters: buildTotal(disasters),
        totalDeaths: buildTotal(deaths),
        totalAffected: buildTotal(affected),
        totalDamages: buildTotal(damages),
      };

      await setShortTerm(HIST_CACHE_KEY, historical);
    }

    // ── Live GDACS events (cache 30 minutes) ─────────────────────────────
    let gdacsEvents = await getCached<any[]>(LIVE_CACHE_KEY);
    if (!gdacsEvents) {
      gdacsEvents = await fetchGDACS();
      // Only cache a successful non-empty fetch - avoid pinning an empty array
      // for 30 minutes if GDACS had a transient hiccup.
      if (gdacsEvents && gdacsEvents.length > 0) {
        await setLiveTerm(LIVE_CACHE_KEY, gdacsEvents);
      }
    }

    return NextResponse.json({
      ...historical,
      gdacsEvents: gdacsEvents || [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch extreme weather data' }, { status: 500 });
  }
}
