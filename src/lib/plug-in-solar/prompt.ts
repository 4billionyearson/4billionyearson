import type { PlugInSolarLiveData } from './types';

/**
 * Prompt builder for the daily UK Plug-in Solar refresh. The prompt asks
 * Gemini to return a structured JSON object matching `PlugInSolarLiveData`
 * (the API route enforces this with `responseMimeType: application/json`
 * and an explicit `responseSchema`).
 *
 * `previous` is the cached output from the prior day (or null on first
 * run). When provided, we ask Gemini to compare and surface what
 * actually changed - so the change log on the page is genuine, not
 * fabricated.
 */
export function buildPlugInSolarPrompt(args: {
  todayISO: string;
  previous: PlugInSolarLiveData | null;
}): string {
  const { todayISO, previous } = args;

  const lines: string[] = [];
  lines.push(
    `You are a research analyst writing the daily UK Plug-in Solar status briefing for 4billionyearson.org. Today is ${todayISO}.`,
  );
  lines.push('');
  lines.push(
    'TASK: Use Google Search to find authoritative, up-to-date information on the UK plug-in solar (also called balcony solar / DIY solar / Balkonkraftwerk) market and return a single JSON object that exactly matches the schema described below. Do not include any commentary outside the JSON.',
  );
  lines.push('');
  lines.push('AUDIENCE: UK householders, renters and landlords trying to understand whether they can buy and install plug-in solar today, what it will cost, and whether the legal/regulatory picture has shifted in the last 24-48 hours.');
  lines.push('');
  lines.push('PRINCIPLES:');
  lines.push('- Editorial independence: 4 Billion Years On is impartial. Do not recommend any single brand. List multiple options where they exist.');
  lines.push('- Be specific with numbers and dates. If something is uncertain, say so plainly.');
  lines.push('- British English spelling throughout.');
  lines.push('- Plain text only inside string fields - no Markdown asterisks, no bold, no bullet points. The site styles paragraphs itself.');
  lines.push('- Cite the date a status was verified in `asOf` fields (ISO YYYY-MM-DD).');
  lines.push('- Prices in GBP, integer pounds where possible. Tariff rates in p/kWh as numeric (e.g. 24.5).');
  lines.push('- For URLs always return absolute https URLs.');
  lines.push('');
  lines.push('CONTEXT - what we know already (do not contradict without explicit evidence):');
  lines.push('- 16 March 2026: UK government (DESNZ) announced legalisation of plug-in solar. EcoFlow named as a delivery partner.');
  lines.push('- 15 April 2026: BS 7671 Amendment 4 published by IET/BSI. Transition period ends 2 October 2026.');
  lines.push('- A separate BSI product standard for plug-in solar systems is expected mid-2026 (around July 2026).');
  lines.push('- Sub-800 W AC output limit per circuit. G98 notification still required within 28 days. SEG not yet available for DIY plug-in installs (MCS gap); simplified pathway expected ~2027.');
  lines.push('- Government modelling: £70-£110/yr saving, ~4-year payback for an 800 W kit at typical electricity prices.');
  lines.push('- EcoFlow STREAM Balcony Kit was already on sale in the UK at ~£449-£499 in late April 2026. Lidl announced a ~£500 kit for in-store sale "within months" of April 2026.');
  lines.push('');
  lines.push('SOURCE PREFERENCE (use these first via Google Search):');
  lines.push('- gov.uk / DESNZ press releases');
  lines.push('- IET / BSI publications');
  lines.push('- Ofgem announcements');
  lines.push('- Established UK trade press: Solar Power Portal, Current News, Electrical Times, Renewable Energy Magazine');
  lines.push('- Established UK consumer/news outlets: BBC, Guardian, Telegraph, Independent, Money Saving Expert, Which?, Homebuilding & Renovating, This Is Money');
  lines.push('- Manufacturer pages (EcoFlow UK, Anker, Growatt, Jackery, BougeRV) for product/price verification');
  lines.push('- Avoid: low-quality affiliate-only blogs, unsourced forum posts');
  lines.push('');
  lines.push('JSON SCHEMA (the API route enforces this; the field semantics below are MANDATORY):');
  lines.push('');
  lines.push('  generatedAt: ISO timestamp string. Use the current UTC time.');
  lines.push('');
  lines.push('  statusDashboard: array of exactly 4 pills, in this order:');
  lines.push('    1. label "Legal in the UK?"            - status legal | partial | not-legal');
  lines.push('    2. label "Products on shelves?"        - status yes | soon | no');
  lines.push('    3. label "SEG export payments?"        - status yes | partial | no');
  lines.push('    4. label "DNO notification needed?"    - status yes | no');
  lines.push('  Each pill: { label, status, reason (max 80 chars), asOf (YYYY-MM-DD) }.');
  lines.push('');
  lines.push('  tldr: 50-80 word plain-text paragraph for AI search snippet bait. Lead with current status (yes / partial / no), one cost figure, one product example, and the next big date to watch.');
  lines.push('');
  lines.push('  legalStatus: 120-180 word plain-text paragraph (no headings, no bold) explaining the current legal position. Must reference Amendment 4, the BSI product standard timeline, and G98. End by stating one specific thing to watch for in the next 1-3 months.');
  lines.push('');
  lines.push('  regulations: an object with EXACTLY these four string keys, each a 60-120 word paragraph:');
  lines.push('    bs7671: Amendment 4 - what it changed, when it took effect, transition deadline.');
  lines.push('    g98: G98 notification process, who notifies, timeframe (28 days).');
  lines.push('    bsi: The BSI product standard - status today, expected publication, what it will cover.');
  lines.push('    eu: How the UK\'s framework compares to Germany, Belgium, Netherlands. One concrete number per country.');
  lines.push('');
  lines.push('  timelineUpdates: array of 0-5 NEW or REVISED milestone entries to merge with the static base timeline. Use this only for entries the static list does not already contain (e.g. an Ofgem announcement landing today). Entry shape: { date (YYYY-MM-DD), title (max 70 chars), description (1 sentence), kind ("past" | "future"), category ("regulation" | "product" | "policy" | "standard") }.');
  lines.push('');
  lines.push('  products: array of 4-10 currently-available kits. Each: { brand, model, wattsAC (number), wattsDC (number, may be null), priceGBP (number), ukCompliant ("yes"|"pending"|"no"|"unknown"), retailer, url (absolute https), notes (optional <=80 char), hasBattery (boolean), batteryKWh (number, may be null) }.');
  lines.push('  - Always include: EcoFlow STREAM Balcony Kit (UK government partner).');
  lines.push('  - Include Lidl, Iceland, Anker SOLIX, Growatt NOAH, Jackery, BougeRV if/once available - mark `ukCompliant: pending` if the BSI product standard has not yet published.');
  lines.push('  - Verify prices and stock status via Google Search. If a product is announced but not yet on sale, set retailer to "Coming soon" and price to your best estimate.');
  lines.push('');
  lines.push('  prices: latest UK electricity tariff rates in p/kWh as numbers:');
  lines.push('    unitRate_pPerKWh: typical Ofgem-cap unit rate.');
  lines.push('    exportRate_pPerKWh: best fixed SEG export rate for context (even though plug-in solar cannot use SEG yet).');
  lines.push('    fluxImport_pPerKWh: Octopus Flux peak (4-7 pm) import rate.');
  lines.push('    fluxExport_pPerKWh: Octopus Flux peak (4-7 pm) export rate.');
  lines.push('    fluxOffPeak_pPerKWh: Octopus Flux off-peak (overnight 2-5 am) import rate.');
  lines.push('    sourceLabel: short human label, e.g. "Ofgem cap from 1 Jul 2026".');
  lines.push('    asOf: YYYY-MM-DD when these rates were last verified.');
  lines.push('');
  lines.push('  segStatus: 60-100 word paragraph on Smart Export Guarantee availability for plug-in solar today (status, why, what is changing).');
  lines.push('');
  lines.push('  changeLog: array of 0-5 entries describing what has actually changed since the previous cache (passed to you below). Each entry: { date (YYYY-MM-DD = today), summary (max 140 chars) }. If nothing has materially changed, return an empty array. DO NOT FABRICATE CHANGES.');
  lines.push('');
  lines.push('  news: array of 5-10 recent news items relevant to UK plug-in solar in the last 14 days. Each: { date (YYYY-MM-DD), headline (max 100 chars), summary (1-2 sentences, max 240 chars), sourceTitle, sourceUrl (absolute https) }. Sort newest first.');
  lines.push('');
  lines.push('  groundingSources: leave empty []; the API route fills this from the Google Search grounding metadata.');
  lines.push('');

  if (previous) {
    lines.push('PREVIOUS CACHED PAYLOAD (use this as the comparison baseline for `changeLog`. Do not just echo it back - re-research everything via Google Search and report ACTUAL changes only):');
    lines.push('```json');
    // Trim down the previous payload to just the comparable fields so we
    // don't blow the context window.
    const slim = {
      generatedAt: previous.generatedAt,
      statusDashboard: previous.statusDashboard,
      legalStatus: previous.legalStatus,
      products: previous.products?.map((p) => ({ brand: p.brand, model: p.model, wattsAC: p.wattsAC, priceGBP: p.priceGBP, ukCompliant: p.ukCompliant, retailer: p.retailer })),
      prices: previous.prices,
      timelineUpdates: previous.timelineUpdates,
    };
    lines.push(JSON.stringify(slim, null, 2));
    lines.push('```');
  } else {
    lines.push('PREVIOUS CACHED PAYLOAD: none. This is the first run. `changeLog` should be empty.');
  }

  lines.push('');
  lines.push('Return ONLY the JSON object. No surrounding prose, no Markdown fencing, no commentary.');
  return lines.join('\n');
}

/* ─── Response schema (Gemini structured output) ──────────────────────────── */

/**
 * Gemini's responseSchema is a subset of OpenAPI 3.0. Returning this
 * schema with the request forces the model to emit JSON in the right
 * shape - the API route then runs JSON.parse() and the result is the
 * `PlugInSolarLiveData` payload (without `groundingSources`, which is
 * injected from the grounding metadata).
 */
export const PLUG_IN_SOLAR_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    generatedAt: { type: 'STRING' },
    statusDashboard: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          status: { type: 'STRING' },
          reason: { type: 'STRING' },
          asOf: { type: 'STRING' },
        },
        required: ['label', 'status', 'reason', 'asOf'],
      },
    },
    tldr: { type: 'STRING' },
    legalStatus: { type: 'STRING' },
    regulations: {
      type: 'OBJECT',
      properties: {
        bs7671: { type: 'STRING' },
        g98: { type: 'STRING' },
        bsi: { type: 'STRING' },
        eu: { type: 'STRING' },
      },
      required: ['bs7671', 'g98', 'bsi', 'eu'],
    },
    timelineUpdates: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING' },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          kind: { type: 'STRING' },
          category: { type: 'STRING' },
        },
        required: ['date', 'title', 'description', 'kind'],
      },
    },
    products: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          brand: { type: 'STRING' },
          model: { type: 'STRING' },
          wattsAC: { type: 'NUMBER' },
          wattsDC: { type: 'NUMBER', nullable: true },
          priceGBP: { type: 'NUMBER' },
          ukCompliant: { type: 'STRING' },
          retailer: { type: 'STRING' },
          url: { type: 'STRING' },
          notes: { type: 'STRING' },
          hasBattery: { type: 'BOOLEAN' },
          batteryKWh: { type: 'NUMBER', nullable: true },
        },
        required: ['brand', 'model', 'wattsAC', 'priceGBP', 'ukCompliant', 'retailer', 'url'],
      },
    },
    prices: {
      type: 'OBJECT',
      properties: {
        unitRate_pPerKWh: { type: 'NUMBER' },
        exportRate_pPerKWh: { type: 'NUMBER' },
        fluxImport_pPerKWh: { type: 'NUMBER' },
        fluxExport_pPerKWh: { type: 'NUMBER' },
        fluxOffPeak_pPerKWh: { type: 'NUMBER' },
        sourceLabel: { type: 'STRING' },
        asOf: { type: 'STRING' },
      },
      required: ['unitRate_pPerKWh', 'fluxImport_pPerKWh', 'fluxExport_pPerKWh', 'fluxOffPeak_pPerKWh', 'sourceLabel', 'asOf'],
    },
    segStatus: { type: 'STRING' },
    changeLog: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING' },
          summary: { type: 'STRING' },
        },
        required: ['date', 'summary'],
      },
    },
    news: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING' },
          headline: { type: 'STRING' },
          summary: { type: 'STRING' },
          sourceTitle: { type: 'STRING' },
          sourceUrl: { type: 'STRING' },
        },
        required: ['date', 'headline', 'summary', 'sourceTitle', 'sourceUrl'],
      },
    },
  },
  required: ['generatedAt', 'statusDashboard', 'tldr', 'legalStatus', 'regulations', 'products', 'prices', 'segStatus', 'news'],
} as const;
