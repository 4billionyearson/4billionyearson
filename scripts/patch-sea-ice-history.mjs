// One-shot patch: fetch NSIDC per-hemisphere monthly sea-ice extent (1979-present)
// and merge `arcticSeaIce` + `antarcticSeaIce` into public/data/climate/global-history.json.
// Normally these fields are produced by build-global-snapshot.mjs; this script lets us
// update them without re-running the full (NOAA-dependent) build.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SNAPSHOT = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
const HEMIS = [
  { key: 'north', label: 'Arctic sea ice', prefix: 'N', out: 'arcticSeaIce' },
  { key: 'south', label: 'Antarctic sea ice', prefix: 'S', out: 'antarcticSeaIce' },
];
const URL = (h, mm) => `https://noaadata.apps.nsidc.org/NOAA/G02135/${h.key}/monthly/data/${h.prefix}_${String(mm).padStart(2, '0')}_extent_v4.0.csv`;
const round2 = (v) => Math.round(v * 100) / 100;

async function fetchText(url, label) {
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': '4billionyearson-sea-ice-patch/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      console.warn(`[${label}] attempt ${i} failed: ${e?.message ?? e}`);
      if (i < 3) await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  return null;
}

function parseCsv(text) {
  const rows = [];
  if (!text) return rows;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('year')) continue;
    const c = t.split(',').map((s) => s.trim());
    if (c.length < 5) continue;
    const year = Number(c[0]);
    const month = Number(c[1]);
    const extent = Number(c[4]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(extent) || extent <= 0) continue;
    rows.push({ year, month, extent: round2(extent) });
  }
  return rows;
}

async function fetchHemisphere(h) {
  const all = [];
  for (let m = 1; m <= 12; m++) {
    const text = await fetchText(URL(h, m), `NSIDC ${h.key} ${String(m).padStart(2, '0')}`);
    all.push(...parseCsv(text));
  }
  all.sort((a, b) => (a.year - b.year) || (a.month - b.month));
  return all;
}

function buildPayload(monthly, label) {
  if (!monthly?.length) return null;
  const latest = monthly[monthly.length - 1];
  const sameMonth = monthly.filter((p) => p.month === latest.month);
  const ranked = [...sameMonth].sort((a, b) => a.extent - b.extent);
  const rankLow = ranked.findIndex((p) => p.year === latest.year) + 1;
  const recordLow = ranked[0];
  const previousLowest = rankLow === 1 && ranked.length > 1 ? ranked[1] : null;
  const climBase = sameMonth.filter((p) => p.year >= 1991 && p.year <= 2020);
  const climatology = climBase.length ? round2(climBase.reduce((s, p) => s + p.extent, 0) / climBase.length) : null;
  const anomaly = climatology !== null ? round2(latest.extent - climatology) : null;
  return {
    label,
    unit: 'million km²',
    baseline: '1991–2020',
    latest,
    climatology,
    anomaly,
    rankLowestOfSameMonth: rankLow,
    totalYearsInMonth: sameMonth.length,
    recordLow: { year: recordLow.year, month: recordLow.month, extent: recordLow.extent },
    previousLowest: previousLowest ? { year: previousLowest.year, month: previousLowest.month, extent: previousLowest.extent } : null,
    monthly,
  };
}

async function main() {
  const snap = JSON.parse(await readFile(SNAPSHOT, 'utf8'));
  for (const h of HEMIS) {
    console.log(`Fetching ${h.label}…`);
    const monthly = await fetchHemisphere(h);
    const payload = buildPayload(monthly, h.label);
    if (payload) {
      snap[h.out] = payload;
      console.log(` → ${h.label}: ${monthly.length} points, latest ${payload.latest.year}-${String(payload.latest.month).padStart(2, '0')} = ${payload.latest.extent} Mkm² (rank ${payload.rankLowestOfSameMonth}/${payload.totalYearsInMonth} lowest; record low = ${payload.recordLow.year})`);
    } else {
      console.warn(` ⚠ ${h.label}: no data parsed`);
    }
  }
  await writeFile(SNAPSHOT, JSON.stringify(snap, null, 2), 'utf8');
  console.log(`✓ Wrote ${SNAPSHOT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
