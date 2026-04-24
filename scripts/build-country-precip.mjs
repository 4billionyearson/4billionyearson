#!/usr/bin/env node
/**
 * Fetch monthly precipitation (mm) for every country in our profile set from
 * the World Bank Climate Knowledge Portal CRU TS 4.08 historical time series
 * (1901-2023) and save one JSON per country to
 *   public/data/climate/country-precip/<ISO3>.json
 *
 * Used by build-seasonal-shift-global.mjs to produce wet/dry-season metrics
 * for tropical regions where the temperature-based "warm-season" framing
 * doesn't apply.
 *
 * API:
 *   https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_pr_timeseries_monthly_1901-2023_mean_historical_cru_ts4.08_mean/<ISO3>
 * Returns: { data: { ISO3: { "YYYY-MM": mm, ... } } }
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const COUNTRY_DIR = path.resolve(process.cwd(), 'public/data/climate/country');
const OUT_DIR = path.resolve(process.cwd(), 'public/data/climate/country-precip');
const CKP_URL = (code) =>
  `https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_pr_timeseries_monthly_1901-2023_mean_historical_cru_ts4.08_mean/${code}?_format=json`;

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

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const files = (await fs.readdir(COUNTRY_DIR)).filter((f) => f.endsWith('.json'));
  const codes = [];
  for (const f of files) {
    const d = JSON.parse(await fs.readFile(path.join(COUNTRY_DIR, f), 'utf8'));
    if (d.code) codes.push({ code: d.code, name: d.country });
  }
  console.log(`Fetching monthly precipitation for ${codes.length} countries from World Bank CKP…`);

  let ok = 0;
  let failed = 0;
  for (const { code, name } of codes) {
    try {
      const json = await fetchWithRetry(CKP_URL(code), code);
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
        source: 'World Bank CKP (CRU TS 4.08)',
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
