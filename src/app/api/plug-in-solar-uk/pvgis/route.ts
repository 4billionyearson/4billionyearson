export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

/**
 * Postcode -> PVGIS solar yield proxy.
 *
 * 1. Resolve postcode to lat/lon via postcodes.io (free, no key, UK-only).
 * 2. Call PVGIS v5.2 PVcalc with sensible defaults for plug-in solar
 *    (south-facing, 35deg tilt, 14% system losses).
 * 3. Cache by postcode-area + kWp for 30 days.
 *
 * Both APIs are free and impose only light rate limits, but we cache to
 * stay polite and to keep the calculator instant after the first lookup
 * for any given area.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const postcode = (url.searchParams.get('postcode') || '').trim().toUpperCase();
  const kwp = parseFloat(url.searchParams.get('kwp') || '0.8');

  if (!postcode) {
    return NextResponse.json({ error: 'Missing postcode' }, { status: 400 });
  }

  const area = postcode.match(/^([A-Z]{1,2})\d/)?.[1] || postcode.slice(0, 2);
  const cacheKey = `pvgis:${area}:${kwp.toFixed(2)}`;
  const cached = await getCached<any>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  // Step 1: postcode -> lat/lon
  let lat: number | null = null;
  let lon: number | null = null;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (res.ok) {
      const data = await res.json();
      lat = data?.result?.latitude ?? null;
      lon = data?.result?.longitude ?? null;
    }
  } catch (e) {
    console.warn('[pvgis] postcodes.io error:', e);
  }

  // Fallback: try the postcode prefix only (e.g. "M1") via outcodes endpoint
  if (lat == null || lon == null) {
    const outcode = postcode.split(/\s+/)[0];
    try {
      const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`, {
        next: { revalidate: 60 * 60 * 24 * 30 },
      });
      if (res.ok) {
        const data = await res.json();
        lat = data?.result?.latitude ?? null;
        lon = data?.result?.longitude ?? null;
      }
    } catch (e) {
      console.warn('[pvgis] outcodes lookup error:', e);
    }
  }

  if (lat == null || lon == null) {
    return NextResponse.json({ error: 'Could not geocode postcode' }, { status: 404 });
  }

  // Step 2: PVGIS - https://re.jrc.ec.europa.eu/pvg_tools/en/tools.html
  // peakpower in kW, loss in %, angle in deg (35 = decent UK roof tilt),
  // aspect 0 = south-facing.
  const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${lat}&lon=${lon}&peakpower=${kwp}&loss=14&angle=35&aspect=0&outputformat=json&pvtechchoice=crystSi&mountingplace=building`;
  let annualKWh: number | null = null;
  try {
    const res = await fetch(pvgisUrl, {
      next: { revalidate: 60 * 60 * 24 * 30 },
      headers: { 'User-Agent': '4billionyearson.org plug-in solar calculator' },
    });
    if (res.ok) {
      const data = await res.json();
      const totals = data?.outputs?.totals?.fixed;
      if (totals && typeof totals.E_y === 'number') {
        annualKWh = Math.round(totals.E_y);
      }
    }
  } catch (e) {
    console.warn('[pvgis] PVGIS error:', e);
  }

  if (annualKWh == null) {
    return NextResponse.json({ error: 'PVGIS lookup failed' }, { status: 502 });
  }

  const payload = { annualKWh, lat, lon, postcode, kwp };
  await setShortTerm(cacheKey, payload);
  return NextResponse.json({ ...payload, source: 'fresh' });
}
