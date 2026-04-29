/**
 * ENSO snapshot builder.
 *
 * Fetches multiple ENSO/Pacific indicator feeds and writes a single
 * pre-computed snapshot to `public/data/climate/enso.json`. The new
 * `/climate/enso` page (and its API route) read this file - same
 * pattern as `build-global-snapshot.mjs`.
 *
 * Sources (all public-domain or freely citable):
 *   - NOAA CPC Oceanic Niño Index (3-month running mean Niño 3.4 SST)
 *       https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
 *   - NOAA CPC weekly Niño-region SST + anomaly (Niño 1+2 / 3 / 3.4 / 4)
 *       https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for
 *   - NOAA PSL Multivariate ENSO Index v2 (bi-monthly seasons)
 *       https://psl.noaa.gov/enso/mei/data/meiv2.data
 *   - NOAA CPC monthly Southern Oscillation Index (Tahiti–Darwin SLP)
 *       https://www.cpc.ncep.noaa.gov/data/indices/soi
 *
 * Each fetch is wrapped in retry/timeout and is optional - the script
 * still writes a snapshot even if individual feeds fail, with `null`
 * placeholders. Refreshed monthly via `.github/workflows/climate-snapshots.yml`.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const OUT_PATH = resolve(process.cwd(), 'public', 'data', 'climate', 'enso.json');

const SOURCES = {
  oni: 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt',
  weekly: 'https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for',
  mei: 'https://psl.noaa.gov/enso/mei/data/meiv2.data',
  soi: 'https://www.cpc.ncep.noaa.gov/data/indices/soi',
  forecast: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities.php',
  // IRI/Columbia ENSO plume - dynamical & statistical model forecasts of
  // 3-month-rolling Niño 3.4 SST anomaly. Each issue covers 9 forecast
  // periods starting ~1 month after the issue date. Issued ~19th of month.
  plumeBase: 'https://ensoforecast.iri.columbia.edu/plumes_json',
};

const round2 = (v) => Math.round(v * 100) / 100;

async function fetchText(url, { attempts = 3, timeoutMs = 30_000, label } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log(`[${label}] attempt ${attempt}/${attempts} → ${url}`);
      const started = Date.now();
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': '4billionyearson-climate-snapshot/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      console.log(`[${label}] ✓ ${Date.now() - started}ms (${text.length} bytes)`);
      return text;
    } catch (err) {
      lastErr = err;
      console.warn(`[${label}] attempt ${attempt} failed: ${err?.message ?? err}`);
      if (attempt < attempts) await new Promise((r) => setTimeout(r, 2_000 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  console.warn(`⚠ [${label}] giving up: ${lastErr?.message ?? lastErr}`);
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Parsers

/**
 * Oceanic Niño Index — 3-month overlapping seasons, 1950→present.
 * Format: SEAS  YR  TOTAL  ANOM
 */
function parseOni(text) {
  if (!text) return null;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = lines.slice(1).map((l) => l.split(/\s+/)).filter((p) => p.length >= 4 && /^\d{4}$/.test(p[1]));
  const parsed = rows
    .map((p) => ({ season: p[0], year: Number(p[1]), anom: round2(Number(p[3])) }))
    .filter((p) => Number.isFinite(p.anom));
  if (!parsed.length) return null;
  const last = parsed[parsed.length - 1];
  let state = 'Neutral';
  if (last.anom >= 0.5) state = 'El Niño';
  else if (last.anom <= -0.5) state = 'La Niña';
  let strength = '';
  const a = Math.abs(last.anom);
  if (a >= 2.0) strength = 'very strong';
  else if (a >= 1.5) strength = 'strong';
  else if (a >= 1.0) strength = 'moderate';
  else if (a >= 0.5) strength = 'weak';
  return {
    state,
    strength,
    anomaly: last.anom,
    season: last.season,
    seasonYear: last.year,
    history: parsed.slice(-120).map((p) => ({ season: p.season, year: p.year, anom: p.anom })),
  };
}

const MONTHS_3 = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };

/**
 * Weekly Niño-region SST + anomalies, 1981→present.
 * Format header lines, then rows like:
 *   01APR2026     27.3 1.2     27.6 0.1     27.7 0.2     29.0 0.6
 * Columns: date | Niño1+2 SST/SSTA | Niño3 | Niño3.4 | Niño4
 * Numbers can run together (e.g. "26.5-0.2"), so extract floats with regex.
 */
function parseWeeklyNino(text) {
  if (!text) return null;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const m = line.match(/^(\d{2})([A-Z]{3})(\d{4})\b(.*)$/);
    if (!m) continue;
    const day = Number(m[1]);
    const month = MONTHS_3[m[2]];
    const year = Number(m[3]);
    if (!month) continue;
    const nums = m[4].match(/-?\d+\.\d+/g);
    if (!nums || nums.length < 8) continue;
    const v = nums.slice(0, 8).map(Number);
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    rows.push({
      date: isoDate,
      year,
      month,
      day,
      nino12: { sst: round2(v[0]), anom: round2(v[1]) },
      nino3: { sst: round2(v[2]), anom: round2(v[3]) },
      nino34: { sst: round2(v[4]), anom: round2(v[5]) },
      nino4: { sst: round2(v[6]), anom: round2(v[7]) },
    });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const latest = rows[rows.length - 1];
  // Keep last ~7.5 years of weekly data (≈390 rows). The hero chart shows a
  // 7-year window so anything shorter leaves a gap on the left.
  const trimmed = rows.slice(-390);
  return {
    latest,
    weekly: trimmed,
    baseline: '1991–2020',
    firstWeek: trimmed[0].date,
    lastWeek: latest.date,
  };
}

/**
 * Multivariate ENSO Index v2, bi-monthly seasons.
 * Format: first line gives "STARTYEAR ENDYEAR", subsequent rows are
 *   YEAR  DJ  JF  FM  MA  AM  MJ  JJ  JA  AS  SO  ON  ND
 * Missing values = -999.00.
 */
function parseMei(text) {
  if (!text) return null;
  const SEASON_LABELS = ['DJ', 'JF', 'FM', 'MA', 'AM', 'MJ', 'JJ', 'JA', 'AS', 'SO', 'ON', 'ND'];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length !== 13) continue;
    const year = Number(parts[0]);
    if (!Number.isFinite(year) || year < 1900 || year > 2200) continue;
    for (let i = 0; i < 12; i++) {
      const v = Number(parts[i + 1]);
      if (!Number.isFinite(v) || v <= -990) continue;
      rows.push({ year, season: SEASON_LABELS[i], seasonIndex: i, value: round2(v) });
    }
  }
  if (!rows.length) return null;
  // Keep last ~10 years of bi-monthly values (≈120 points)
  const trimmed = rows.slice(-120);
  const latest = rows[rows.length - 1];
  return {
    latest,
    history: trimmed,
    baseline: '1979–2024 reference',
  };
}

/**
 * Southern Oscillation Index — monthly Tahiti–Darwin standardised pressure.
 * Multi-block file; we use the first "anomaly" block. Format:
 *   YEAR   JAN   FEB   ... DEC
 * with -999.x marking missing values.
 */
function parseSoi(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const rows = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Regex extraction so run-together sentinels like "1.2-999.9-999.9..." parse.
    const yearMatch = line.match(/^(\d{4})\b/);
    if (!yearMatch) continue;
    const year = Number(yearMatch[1]);
    if (!Number.isFinite(year) || year < 1900 || year > 2200) continue;
    const nums = line.slice(yearMatch[0].length).match(/-?\d+\.\d+/g);
    if (!nums || nums.length < 12) continue;
    for (let i = 0; i < 12; i++) {
      const v = Number(nums[i]);
      if (!Number.isFinite(v) || v <= -90) continue;
      rows.push({ year, month: i + 1, value: round2(v) });
    }
  }
  // The same file contains multiple blocks; the second pass repeats the years.
  // De-dup by (year,month) keeping the LAST value (which corresponds to the
  // standardised anomaly block — same as what the BoM/CPC chart show).
  const map = new Map();
  for (const r of rows) map.set(`${r.year}-${r.month}`, r);
  const dedup = [...map.values()].sort((a, b) => a.year - b.year || a.month - b.month);
  if (!dedup.length) return null;
  // Drop any "-999"-style sentinel rows that slipped through
  const clean = dedup.filter((r) => Math.abs(r.value) < 50);
  const latest = clean[clean.length - 1];
  // Keep last 20 years (≈240 monthly points)
  const trimmed = clean.slice(-240);
  return {
    latest,
    history: trimmed,
  };
}

/**
 * NOAA CPC ENSO probability forecast - parses the HTML table on the
 * roni/probabilities.php page. Each row is one overlapping 3-month
 * season; columns are P(La Niña), P(Neutral), P(El Niño) in percent.
 * Also extracts the date-stamped probability image URL from the same
 * page so the live <img> always resolves.
 */
function parseForecast(html) {
  if (!html) return null;
  // Extract the table contents (first <table> after id="probabilities-table").
  const tableMatch = html.match(/<table[^>]*id=["']probabilities-table["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;
  const rowMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const seasons = [];
  const seasonRegex = /^([A-Z]{3})\s/;
  for (const row of rowMatches) {
    const cells = [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (cells.length < 4) continue;
    const [seasonRaw, lnStr, neuStr, enStr] = cells;
    const seasonMatch = seasonRaw.match(seasonRegex);
    if (!seasonMatch) continue;
    const ln = Number(lnStr);
    const neu = Number(neuStr);
    const en = Number(enStr);
    if (!Number.isFinite(ln) || !Number.isFinite(neu) || !Number.isFinite(en)) continue;
    seasons.push({
      season: seasonMatch[1], // e.g. 'AMJ'
      label: seasonRaw.trim(), // e.g. 'AMJ Apr May Jun'
      pLaNina: ln,
      pNeutral: neu,
      pElNino: en,
    });
  }
  if (!seasons.length) return null;
  // Find the date-stamped probability image URL.
  const imgMatch = html.match(/figures\/(CPCoff_ENSOprobs_\d{6}\.png)/);
  const imageUrl = imgMatch
    ? `https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/figures/${imgMatch[1]}`
    : null;
  return { seasons, imageUrl };
}

// 3-month season labels in calendar order, used to map plume forecast
// periods (which are 1, 2, 3, ... months ahead of issue date) to season keys.
const SEASON_ORDER = ['DJF','JFM','FMA','MAM','AMJ','MJJ','JJA','JAS','ASO','SON','OND','NDJ'];

/**
 * Try IRI plume JSON for issue {year, month}. Returns parsed JSON or null.
 * The IRI publishes around the 19th, so the current month may not be ready
 * yet \u2014 the caller walks back month-by-month until a 200 lands.
 */
async function fetchPlumeMonth(year, month) {
  const url = `${SOURCES.plumeBase}/${year}/${month}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': '4billionyearson-climate-snapshot/1.0' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (!text || !text.trim().startsWith('{')) return null;
    if (!ct.includes('json') && !text.includes('"models"')) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Latest available IRI plume \u2014 walk back up to 3 months to find one.
 * Returns { issueYear, issueMonth, periods: [{period, label, mean, dynMean,
 * statMean, modelCount, models:[{name,type,value}] }, ...] } or null.
 */
async function fetchLatestPlume() {
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  for (let i = 0; i < 4; i++) {
    console.log(`[IRI plume] trying ${y}/${m}`);
    const json = await fetchPlumeMonth(y, m);
    if (json && Array.isArray(json.models)) {
      const issueMonth = Number(json.month) || m;
      const issueYear = y;
      const numPeriods = Math.max(...json.models.map((md) => (md.data || []).length));
      const periods = [];
      for (let p = 0; p < numPeriods; p++) {
        const vals = [];
        const dynVals = [];
        const statVals = [];
        const models = [];
        let dynAvg = null;
        let statAvg = null;
        for (const md of json.models) {
          const v = md.data?.[p];
          if (v == null || v === -999 || v <= -990) continue;
          const num = Number(v);
          if (!Number.isFinite(num)) continue;
          if (md.model === 'DYN AVG') dynAvg = num;
          else if (md.model === 'STAT AVG') statAvg = num;
          else if (md.model === 'CPC AVG' || md.type === 'Other') {
            // skip aggregate rows from per-model accounting
          } else {
            vals.push(num);
            if (md.type === 'Dynamical') dynVals.push(num);
            if (md.type === 'Statistical') statVals.push(num);
            models.push({ name: md.model, type: md.type, value: round2(num) });
          }
        }
        if (!vals.length && dynAvg == null && statAvg == null) continue;
        const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        const dynMean = dynVals.length ? dynVals.reduce((a, b) => a + b, 0) / dynVals.length : dynAvg;
        const statMean = statVals.length ? statVals.reduce((a, b) => a + b, 0) / statVals.length : statAvg;
        // Map plume period p to NOAA 3-month season label.
        // IRI convention: issue month m → period[0] is the season whose
        // first month is m+1. e.g. issue March → AMJ first (Apr-May-Jun).
        // Use JS Date arithmetic for clean year-rollover handling.
        const startDate = new Date(Date.UTC(issueYear, issueMonth + p, 1)); // first month of season
        const centreDate = new Date(Date.UTC(issueYear, issueMonth + p + 1, 1));
        const seasonStartMonth1 = startDate.getUTCMonth() + 1; // 1..12
        // SEASON_ORDER is keyed by start month: Dec=0(DJF), Jan=1(JFM), ...
        const seasonIdx = seasonStartMonth1 === 12 ? 0 : seasonStartMonth1;
        const label = SEASON_ORDER[seasonIdx];
        const seasonAnchorYear = centreDate.getUTCFullYear();
        periods.push({
          period: p,
          label,
          seasonAnchorYear,
          mean: mean != null ? round2(mean) : null,
          dynMean: dynMean != null ? round2(dynMean) : null,
          statMean: statMean != null ? round2(statMean) : null,
          modelCount: models.length,
          models,
        });
      }
      return { issueYear, issueMonth, periods };
    }
    // step back one month
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// SNU ACE Lab CNN ENSO forecast (Ham et al. 2019, Nature 573)
//
// The page at https://aiclimate.snu.ac.kr/enso/ lists download links for
// annual XLSX files.  Each file has one row per forecast issue month (YYYYMM
// in column A) and leads 1–23 in columns B–X giving Niño 3.4 anomaly
// predictions for successive months.

/** Fetch a URL and return the raw bytes as a Buffer, with retry. */
async function fetchBuffer(url, { attempts = 3, timeoutMs = 30_000, label = 'buffer' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log(`[${label}] attempt ${attempt}/${attempts} → ${url}`);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': '4billionyearson-climate-snapshot/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`[${label}] ✓ ${buf.length} bytes`);
      return buf;
    } catch (err) {
      lastErr = err;
      console.warn(`[${label}] attempt ${attempt} failed: ${err?.message ?? err}`);
      if (attempt < attempts) await new Promise((r) => setTimeout(r, 2_000 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  console.warn(`⚠ [${label}] giving up: ${lastErr?.message ?? lastErr}`);
  return null;
}

/**
 * Minimal ZIP entry extractor.  Reads local file headers sequentially until
 * the requested entry is found; decompresses stored (method 0) or deflated
 * (method 8) data.  Returns a Buffer or null if the entry is not found.
 */
function unzipEntry(buf, targetName) {
  let offset = 0;
  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // not a local file header
    const flags          = buf.readUInt16LE(offset + 6);
    const method         = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const filenameLen    = buf.readUInt16LE(offset + 26);
    const extraLen       = buf.readUInt16LE(offset + 28);
    const filename       = buf.slice(offset + 30, offset + 30 + filenameLen).toString('utf8');
    const dataStart      = offset + 30 + filenameLen + extraLen;
    if (filename === targetName) {
      const compressed = buf.slice(dataStart, dataStart + compressedSize);
      if (method === 0) return compressed;
      if (method === 8) return inflateRawSync(compressed);
      console.warn(`[SNU xlsx] unsupported ZIP method ${method} for ${filename}`);
      return null;
    }
    // Advance; when the data-descriptor flag is set sizes may be zero in the
    // local header — bail out and rely on compressedSize being non-zero.
    const advance = (flags & 0x8) && compressedSize === 0
      ? null
      : compressedSize;
    if (advance === null) break; // can't determine length safely
    offset = dataStart + advance;
  }
  return null;
}

/** Parse sharedStrings.xml from an XLSX and return a string array. */
function parseSharedStrings(xml) {
  const strings = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const tMatch = m[1].match(/<t[^>]*>([^<]*)<\/t>/);
    strings.push(tMatch ? tMatch[1] : '');
  }
  return strings;
}

/**
 * Parse sheet1.xml from the SNU XLSX.
 * Returns an array of row objects keyed by column letter, values being
 * numbers or strings.
 */
function parseSnuSheet(xml, sharedStrings) {
  const rows = {};
  // Match every <row> element
  for (const rowM of xml.matchAll(/<row[^>]+r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = Number(rowM[1]);
    const rowXml = rowM[2];
    const cells = {};
    // Shared-string cells: t="s"
    for (const cm of rowXml.matchAll(/<c r="([A-Z]+)\d+"[^>]*t="s"[^>]*><v>(\d+)<\/v>/g)) {
      cells[cm[1]] = sharedStrings[Number(cm[2])] ?? '';
    }
    // Numeric cells (no t attribute, or t="n")
    for (const cm of rowXml.matchAll(/<c r="([A-Z]+)\d+"(?![^>]*t=)[^>]*><v>([^<]+)<\/v>/g)) {
      cells[cm[1]] = Number(cm[2]);
    }
    rows[rowNum] = cells;
  }
  return rows;
}

/**
 * Scrape the SNU ENSO page for XLSX download links, download the most recent
 * one, parse it, and return the latest forecast row as a CnnForecast object.
 */
async function fetchCnnForecast() {
  // 1. Fetch the page to discover the current XLSX URL
  const pageHtml = await fetchText('https://aiclimate.snu.ac.kr/enso/', {
    label: 'SNU ENSO page',
    attempts: 3,
    timeoutMs: 20_000,
  });
  if (!pageHtml) {
    console.warn('⚠ [SNU CNN] could not fetch SNU ENSO page');
    return null;
  }

  // Extract all RT_ENSO_FCST_CNN_*.xlsx links and pick the one with the
  // highest year number in the filename.
  const linkRe = /https?:\/\/[^\s"']+RT_ENSO_FCST_CNN_(\d{4})[^\s"']*\.xlsx/gi;
  const found = [];
  for (const m of pageHtml.matchAll(linkRe)) {
    found.push({ url: m[0].replace(/&amp;/g, '&'), year: Number(m[1]) });
  }
  if (!found.length) {
    console.warn('⚠ [SNU CNN] no XLSX links found on SNU ENSO page');
    return null;
  }
  found.sort((a, b) => b.year - a.year);
  const xlsxUrl = found[0].url;

  // 2. Download the XLSX binary
  const xlsxBuf = await fetchBuffer(xlsxUrl, { label: 'SNU CNN xlsx', attempts: 2, timeoutMs: 30_000 });
  if (!xlsxBuf) return null;

  // 3. Extract the two XML entries we need from the ZIP
  const sharedStringsXml = unzipEntry(xlsxBuf, 'xl/sharedStrings.xml');
  const sheetXml         = unzipEntry(xlsxBuf, 'xl/worksheets/sheet1.xml');
  if (!sharedStringsXml || !sheetXml) {
    console.warn('⚠ [SNU CNN] could not extract XML entries from XLSX');
    return null;
  }

  const sharedStrings = parseSharedStrings(sharedStringsXml.toString('utf8'));
  const rows = parseSnuSheet(sheetXml.toString('utf8'), sharedStrings);

  // 4. Column mapping: A=forecast start (YYYYMM), B–X = lead 1–23
  const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');
  // Find the data rows (rows 3+), skip header rows 1–2
  const dataRows = Object.entries(rows)
    .map(([rowNumStr, cells]) => ({ rowNum: Number(rowNumStr), cells }))
    .filter(({ rowNum, cells }) => rowNum >= 3 && typeof cells['A'] === 'number')
    .sort((a, b) => b.cells['A'] - a.cells['A']); // latest first

  if (!dataRows.length) {
    console.warn('⚠ [SNU CNN] no data rows found in XLSX');
    return null;
  }

  const latestRow = dataRows[0];
  const issueYearMonth = latestRow.cells['A'];

  // Derive target month for each lead: lead N → issueMonth + N
  const issueYear  = Math.floor(issueYearMonth / 100);
  const issueMonth = issueYearMonth % 100; // 1–12

  const points = [];
  for (let lead = 1; lead <= 23; lead++) {
    const colLetter = COL_LETTERS[lead]; // B=lead1, C=lead2, … X=lead23
    const val = latestRow.cells[colLetter];
    if (typeof val !== 'number' || !Number.isFinite(val)) continue;
    // Target calendar month
    const totalMonth = issueMonth + lead; // may exceed 12
    const targetYear  = issueYear + Math.floor((totalMonth - 1) / 12);
    const targetMonth = ((totalMonth - 1) % 12) + 1; // 1–12
    const yyyymm = targetYear * 100 + targetMonth;
    points.push({ yyyymm, nino34: round2(val) });
  }

  console.log(`[SNU CNN] ✓ issueYearMonth=${issueYearMonth}, ${points.length} forecast points, range ${points[0]?.yyyymm}–${points[points.length - 1]?.yyyymm}`);
  return { issueYearMonth, points };
}

// ───────────────────────────────────────────────────────────────────────────
// Main

(async function main() {
  const [oniText, weeklyText, meiText, soiText, forecastHtml, plume, cnnForecast] = await Promise.all([
    fetchText(SOURCES.oni, { label: 'NOAA CPC ONI' }),
    fetchText(SOURCES.weekly, { label: 'NOAA CPC weekly Niño SSTs' }),
    fetchText(SOURCES.mei, { label: 'NOAA PSL MEI v2' }),
    fetchText(SOURCES.soi, { label: 'NOAA CPC SOI' }),
    fetchText(SOURCES.forecast, { label: 'NOAA CPC probability forecast' }),
    fetchLatestPlume(),
    fetchCnnForecast(),
  ]);

  const oni = parseOni(oniText);
  const weekly = parseWeeklyNino(weeklyText);
  const mei = parseMei(meiText);
  const soi = parseSoi(soiText);
  const forecast = parseForecast(forecastHtml);

  if (!oni && !weekly && !mei && !soi) {
    throw new Error('All ENSO feeds failed - aborting snapshot write');
  }

  // Met Office plume images for the four Niño regions are stamped with
  // the first day of the current calendar month, e.g.:
  //   https://www.metoffice.gov.uk/images/elnino/20260401/nino34_anom_20260401.png
  // We compute that stamp here and let the page link to whichever image
  // is the most recent published version (Met Office updates ~mid-month).
  const now = new Date();
  const moStamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}01`;
  const moBase = `https://www.metoffice.gov.uk/images/elnino/${moStamp}`;

  const snapshot = {
    oni,
    weekly,
    mei,
    soi,
    forecast,
    plume,
    cnnForecast,
    sources: {
      oni: SOURCES.oni,
      weekly: SOURCES.weekly,
      mei: SOURCES.mei,
      soi: SOURCES.soi,
      forecast: SOURCES.forecast,
      plume: SOURCES.plumeBase,
      cnn: 'https://aiclimate.snu.ac.kr/enso/',
      metOffice: 'https://www.metoffice.gov.uk/research/climate/seasonal-to-decadal/gpc-outlooks/el-nino-la-nina',
    },
    images: {
      // Live, self-updating NOAA/NCEP images. Embedded directly on the page.
      sstAnomalyMap: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_update/sstweek_c.gif',
      tropicalSstAnimation: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_update/sstanim.gif',
      subsurfaceAnomaly: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ocean/weeklyenso_clim_81-10/wkteq_xz_anm.gif',
      hovmollerSst: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_update/ssttlon5_c.gif',
      cpcProbabilityForecast: forecast?.imageUrl || null,
      // Met Office monthly plume forecasts (regenerated mid-month).
      metOfficePlumeNino34: `${moBase}/nino34_anom_${moStamp}.png`,
      metOfficePlumeNino3: `${moBase}/nino3_anom_${moStamp}.png`,
      metOfficePlumeNino4: `${moBase}/nino4_anom_${moStamp}.png`,
      metOfficePlumeNino12: `${moBase}/nino12_anom_${moStamp}.png`,
      // Met Office schematic regional impact maps (static URLs, refreshed
      // when Davey et al analyses are updated; safe to hot-link).
      metOfficeImpactElNinoTemp: 'https://www.metoffice.gov.uk/binaries/content/gallery/metofficegovuk/images/research/climate/global/el-nino-temp.jpg',
      metOfficeImpactElNinoPrecip: 'https://www.metoffice.gov.uk/binaries/content/gallery/metofficegovuk/images/research/climate/global/el-nino-precip.jpg',
      metOfficeImpactLaNinaTemp: 'https://www.metoffice.gov.uk/binaries/content/gallery/metofficegovuk/images/research/climate/global/la-nina-temp.jpg',
      metOfficeImpactLaNinaPrecip: 'https://www.metoffice.gov.uk/binaries/content/gallery/metofficegovuk/images/research/climate/global/la-nina-precip.jpg',
    },
    generatedAt: new Date().toISOString(),
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`✓ wrote ${OUT_PATH}`);
  console.log(`  oni:    ${oni ? `${oni.state} ${oni.anomaly > 0 ? '+' : ''}${oni.anomaly}°C (${oni.season} ${oni.seasonYear}, ${oni.history.length} pts)` : 'null'}`);
  console.log(`  weekly: ${weekly ? `${weekly.weekly.length} weeks, latest ${weekly.lastWeek} → Niño3.4 ${weekly.latest.nino34.anom > 0 ? '+' : ''}${weekly.latest.nino34.anom}°C` : 'null'}`);
  console.log(`  mei:    ${mei ? `${mei.history.length} pts, latest ${mei.latest.season} ${mei.latest.year} = ${mei.latest.value}` : 'null'}`);
  console.log(`  soi:    ${soi ? `${soi.history.length} pts, latest ${soi.latest.year}-${soi.latest.month} = ${soi.latest.value}` : 'null'}`);
  console.log(`  forecast: ${forecast ? `${forecast.seasons.length} seasons, first ${forecast.seasons[0].label}` : 'null'}`);
  console.log(`  plume:    ${plume ? `${plume.periods.length} periods (issue ${plume.issueYear}/${plume.issueMonth}), first ${plume.periods[0].label} mean ${plume.periods[0].mean}` : 'null'}`);
  console.log(`  cnn:      ${cnnForecast ? `issue ${cnnForecast.issueYearMonth}, ${cnnForecast.points.length} pts, last ${cnnForecast.points[cnnForecast.points.length - 1]?.yyyymm}` : 'null'}`);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
