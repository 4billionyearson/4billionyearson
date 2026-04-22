// One-shot patch: extend the `countryAnomalies` field in
// public/data/climate/global-history.json with 1-month, 3-month, and
// 12-month anomaly values per country (against the 1961–1990 baseline).
// Sourced from the per-country snapshots already on disk.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const SNAPSHOT = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
const COUNTRY_DIR = resolve(process.cwd(), 'public', 'data', 'climate', 'country');
const round2 = (v) => Math.round(v * 100) / 100;

function compute12m(monthly) {
  if (!Array.isArray(monthly) || monthly.length < 12) return { anomaly: null, label: null };
  const now = new Date();
  const yNow = now.getFullYear();
  const mNow = now.getMonth() + 1;
  const before = monthly.filter((p) => p.year < yNow || (p.year === yNow && p.month < mNow));
  if (before.length < 12) return { anomaly: null, label: null };
  const sorted = [...before].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  const last12 = sorted.slice(-12);
  const end = last12[last12.length - 1];
  const start = last12[0];
  const span = (end.year * 12 + end.month) - (start.year * 12 + start.month);
  if (span !== 11) return { anomaly: null, label: null };

  const recentAvg = last12.reduce((s, p) => s + (p.value ?? p.temp ?? 0), 0) / 12;

  // Baseline: same 12 calendar months averaged across 1961–1990
  const byMonth = {};
  for (const p of sorted) {
    if (p.year < 1961 || p.year > 1990) continue;
    const v = p.value ?? p.temp;
    if (v == null) continue;
    (byMonth[p.month] ||= []).push(v);
  }
  const perMonthAvgs = [];
  for (let m = 1; m <= 12; m++) {
    const arr = byMonth[m];
    if (!arr?.length) return { anomaly: null, label: null };
    perMonthAvgs.push(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  const baseline = perMonthAvgs.reduce((a, b) => a + b, 0) / 12;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = `${MONTHS[start.month - 1]} ${start.year} – ${MONTHS[end.month - 1]} ${end.year}`;
  return { anomaly: round2(recentAvg - baseline), label };
}

async function main() {
  const [snapRaw, files] = await Promise.all([
    readFile(SNAPSHOT, 'utf8'),
    readdir(COUNTRY_DIR),
  ]);
  const snap = JSON.parse(snapRaw);

  const rows = [];
  for (const name of files) {
    if (!name.endsWith('.json')) continue;
    try {
      const raw = await readFile(resolve(COUNTRY_DIR, name), 'utf8');
      const d = JSON.parse(raw);
      const iso3 = d.code || name.replace(/\.json$/, '');
      const country = d.country || iso3;
      const one = d.latestMonthStats;
      const three = d.latestThreeMonthStats;
      if (!one || !Number.isFinite(one.diff)) continue;
      const twelve = compute12m(d.monthlyAll);
      rows.push({
        iso3,
        name: country,
        // Legacy fields (1-month) for backwards compat with current map
        anomaly: round2(one.diff),
        value: round2(one.value),
        monthLabel: one.label,
        rank: one.rank,
        total: one.total,
        // Windowed anomalies
        anomaly1m: round2(one.diff),
        label1m: one.label,
        anomaly3m: three && Number.isFinite(three.diff) ? round2(three.diff) : null,
        label3m: three?.label ?? null,
        anomaly12m: twelve.anomaly,
        label12m: twelve.label,
      });
    } catch {
      // skip
    }
  }

  snap.countryAnomalies = rows;
  await writeFile(SNAPSHOT, JSON.stringify(snap, null, 2));
  const with3m = rows.filter((r) => r.anomaly3m != null).length;
  const with12m = rows.filter((r) => r.anomaly12m != null).length;
  console.log(`Patched countryAnomalies: ${rows.length} countries (3m: ${with3m}, 12m: ${with12m})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
