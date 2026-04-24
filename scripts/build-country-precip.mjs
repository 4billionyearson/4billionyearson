#!/usr/bin/env node
/**
 * Fetch monthly precipitation (mm) for every country in our profile set from
 * the World Bank Climate Knowledge Portal CRU TS historical time series and
 * save one JSON per country to
 *   public/data/climate/country-precip/<ISO3>.json
 *
 * Used by build-seasonal-shift-global.mjs to produce wet/dry-season metrics
 * for tropical regions where the temperature-based "warm-season" framing
 * doesn't apply.
 *
 * We auto-detect the newest CRU TS release available (4.09, 4.10, …) so that
 * when the World Bank publishes a new vintage each spring it is picked up
 * automatically without a code change.
 *
 * Probed endpoints (first success wins, latest year tried first):
 *   https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_pr_timeseries_monthly_1901-<YEAR>_mean_historical_cru_ts<VER>_mean/<ISO3>
 * Returns: { data: { ISO3: { "YYYY-MM": mm, ... } } }
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const COUNTRY_DIR = path.resolve(process.cwd(), 'public/data/climate/country');
const OUT_DIR = path.resolve(process.cwd(), 'public/data/climate/country-precip');

// Candidate (cruVersion, endYear) pairs, newest first. We probe these with a
// small canary country and pick the first that returns data; subsequent
// countries reuse that endpoint. Extend this list when new CRU releases land.
const CRU_CANDIDATES = [
  { ver: '4.10', end: 2025 },
  { ver: '4.09', end: 2024 },
  { ver: '4.08', end: 2023 },
];

const makeUrl = ({ ver, end }, code) =>
  `https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_pr_timeseries_monthly_1901-${end}_mean_historical_cru_ts${ver}_mean/${code}?_format=json`;

const DELAY_MS = 250;
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      console.log(`  · retry ${attempt} for ${label} (${e.message})`);
      await sleep(500 * attempt);
    }
  }
}

async function probeLatestEndpoint(canaryCode) {
  for (const cand of CRU_CANDIDATES) {
    const url = makeUrl(cand, canaryCode);
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.data?.[canaryCode] && Object.keys(json.data[canaryCode]).length > 0) {
        console.log(`Using CRU TS ${cand.ver} (1901-${cand.end})`);
        return cand;
      }
    } catch {
      // try next candidate
    }
  }
  throw new Error('No CRU TS endpoint responded with data for canary probe.');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const files = (await fs.readdir(COUNTRY_DIR)).filter((f) => f.endsWith('.json'));
  const codes = [];
  for (const f of files) {
    const d = JSON.parse(await fs.readFile(path.join(COUNTRY_DIR, f), 'utf8'));
    if (d.code) codes.push({ code: d.code, name: d.country });
  }
  if (codes.length === 0) {
    console.log('No country snapshots found; nothing to do.');
    return;
  }

  // Probe to find the newest available CRU release.
  const canary = codes.find((c) => c.code === 'USA') || codes[0];
  const endpoint = await probeLatestEndpoint(canary.code);
  const sourceLabel = `World Bank CKP (CRU TS ${endpoint.ver})`;

  console.log(`Fetching monthly precipitation for ${codes.length} countries from ${sourceLabel}…`);

  let ok = 0;
  let failed = 0;
  for (const { code, name } of codes) {
    try {
      const json = await fetchWithRetry(makeUrl(endpoint, code), code);
      const body = json?.data?.[code];
      if (!body || typeof body !== 'object') {
        console.log(`  ✗ ${code} (${name}): empty payload`);
        failed++;
        await sleep(DELAY_MS);
        continue;
      }
      const monthlyAll = Object.entries(body)
        .map(([ym, mm]) => {
          const [y, m] = ym.split('-').map(Number);
          return { year: y, month: m, value: Math.round(Number(mm) * 10) / 10 };
        })
        .filter((p) => Number.isFinite(p.value))
        .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

      const out = {
        code,
        country: name,
        source: sourceLabel,
        sourceUrl: 'https://climateknowledgeportal.worldbank.org/',
        unit: 'mm/month',
        dataPoints: monthlyAll.length,
        yearRange: [monthlyAll[0]?.year, monthlyAll[monthlyAll.length - 1]?.year],
        monthlyAll,
        generatedAt: new Date().toISOString(),
      };

      await fs.writeFile(path.join(OUT_DIR, `${code}.json`), JSON.stringify(out));
      ok++;
      console.log(`  ✓ ${code} (${name}): ${monthlyAll.length} months, ${out.yearRange[0]}-${out.yearRange[1]}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${code} (${name}): ${e.message}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Done. ${ok} saved, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
