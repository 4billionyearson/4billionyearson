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
  lines.push('SOURCE PREFERENCE - HARD RULE: PRIMARY UK SOURCES FIRST.');
  lines.push('When you research via Google Search you MUST attempt to ground every claim on a UK primary source before falling back to a third-party retelling. The page is positioned as an impartial reference, so we want our cited URLs to be the original government / regulator / standards body page wherever one exists. This also means we get the news as it lands, not via a third-party blogger.');
  lines.push('');
  lines.push('TIER 1 - UK government & policy (always check these first):');
  lines.push('- https://www.gov.uk/government/news (filter by Department for Energy Security and Net Zero / DESNZ)');
  lines.push('- https://www.gov.uk/government/organisations/department-for-energy-security-and-net-zero');
  lines.push('- https://www.gov.uk/government/people/ed-miliband (Secretary of State - look for plug-in / balcony solar speeches and press releases)');
  lines.push('- https://www.gov.uk/government/consultations - search for "plug-in solar" or "balcony solar" or "domestic micro-generation"');
  lines.push('');
  lines.push('TIER 2 - UK electrical regulators and standards bodies:');
  lines.push('- https://www.ofgem.gov.uk - announcements, Smart Export Guarantee, micro-generation policy');
  lines.push('- https://electrical.theiet.org - IET Wiring Regulations / BS 7671 / Amendment 4 updates');
  lines.push('- https://www.bsigroup.com - BSI standards committees (look for the dedicated plug-in solar / portable PV product standard) and any open consultation pages');
  lines.push('- https://www.energynetworks.org - ENA (Energy Networks Association) - G98, G99, DNO common positions');
  lines.push('- https://www.electricalsafetyfirst.org.uk - Electrical Safety First press releases on plug-in solar');
  lines.push('- https://www.hse.gov.uk - any Health & Safety Executive guidance');
  lines.push('');
  lines.push('TIER 3 - established UK trade / consumer press (use for context if Tier 1/2 has nothing):');
  lines.push('- Solar Power Portal, Current News, Electrical Times, Renewable Energy Magazine');
  lines.push('- BBC, Guardian, Telegraph, Independent, Money Saving Expert, Which?, Homebuilding & Renovating, This Is Money');
  lines.push('');
  lines.push('TIER 4 - manufacturer pages (use ONLY for product / price verification on `products[]`):');
  lines.push('- uk.ecoflow.com, anker.com/uk, growatt.com, zendure.com, jackery.com/uk, bougerv.co.uk, marstekenergy.com');
  lines.push('');
  lines.push('AVOID: low-quality affiliate-only blogs, unsourced forum posts, content farms, AI-generated review sites.');
  lines.push('');
  lines.push('NEWS URL RULE - CRITICAL (broken links from past runs have been a real problem):');
  lines.push('- DO NOT INVENT URLs. Every `news[].sourceUrl` MUST be copied verbatim from a Google Search result you actually opened during this research session.');
  lines.push('- If you cannot find a working URL for a news item, OMIT the item entirely. We would much rather see 4 working news links than 8 plausible-looking but broken ones.');
  lines.push('- A working URL means: starts with https://, includes the full path to the article (not just a homepage or a category landing page), and would return a 200 response if fetched right now. The API route validates every link with a HEAD request before caching and will silently drop any 404 / DNS-failure / 5xx URL.');
  lines.push('- Do NOT guess URL slugs based on the headline (e.g. "/lidl-iceland-plug-in-solar-panels-cost-uk-b2984183.html") - those slug IDs are usually wrong. Only use the URL exactly as it appeared in the search result.');
  lines.push('- Prefer Tier 1 (gov.uk / DESNZ press releases / Ed Miliband statements) and Tier 2 (Ofgem, IET, BSI, ENA, Electrical Safety First) URLs whenever the news item maps to a primary source. For a government announcement use the original gov.uk press release page, not a Solar Power Portal or BBC retelling. Set sourceTitle to "GOV.UK - DESNZ" (or similar) for those.');
  lines.push('- For regulator updates, use the original Ofgem / IET / BSI / ENA page.');
  lines.push('- Only fall back to Tier 3 (UK trade or consumer press) when no Tier 1 or Tier 2 URL exists.');
  lines.push('- NEVER link to Google Search result pages, Google News redirects, or domains you have not directly visited.');
  lines.push('- The `groundingSources` array (filled by the API route) is your effective allow-list of trusted URLs - if a candidate news URL is not on a domain that also appears in your search results, treat it as unverified and drop it.');
  lines.push('');
  lines.push('JSON SCHEMA (the API route enforces this; the field semantics below are MANDATORY):');
  lines.push('');
  lines.push('  generatedAt: ISO timestamp string. Use the current UTC time.');
  lines.push('');
  lines.push('  statusDashboard: array of exactly 4 pills, in this order:');
  lines.push('    1. label "Legal in the UK?"            - status legal | partial | not-legal');
  lines.push('       Today this should be "partial" - BS 7671 Amendment 4 has been published (legalised) but the BSI product standard is still pending and the wiring-regs transition runs until 2 October 2026.');
  lines.push('    2. label "Products on shelves?"        - status yes | soon | no');
  lines.push('       Use "yes" if at least ONE plug-in / sub-800 W kit is currently on sale to UK consumers (direct from manufacturer counts - e.g. EcoFlow STREAM Balcony Solar System on uk.ecoflow.com from ~£449, Lidl announced ~£500 kit). Today the answer is "yes". Do not downgrade to "soon" because the BSI standard is still pending - several kits already meet BS 7671 / EN 50549 today.');
  lines.push('       Use "soon" only if NO product is currently on sale anywhere in the UK.');
  lines.push('       Use "no" only if products have been actively withdrawn / banned.');
  lines.push('    3. label "SEG export payments?"        - status yes | partial | no');
  lines.push('       Today the answer is "no" / "partial" - SEG requires MCS, which DIY plug-in installs cannot get; a simplified Ofgem pathway is expected ~2027.');
  lines.push('    4. label "DNO notification needed?"    - status yes | no');
  lines.push('       Today the answer is "yes" - G98 notification within 28 days is mandatory.');
  lines.push('  Each pill: { label, status, reason (max 80 chars), asOf (YYYY-MM-DD) }.');
  lines.push('');
  lines.push('  tldr: 50-80 word plain-text paragraph for AI search snippet bait. Lead with current status (yes / partial / no), one cost figure, one product example, and the next big date to watch.');
  lines.push('');
  lines.push('  legalStatus: 120-180 word plain-text paragraph (no headings, no bold) explaining the current legal position. Must reference Amendment 4, the BSI product standard timeline, and G98. End by stating one specific thing to watch for in the next 1-3 months.');
  lines.push('');
  lines.push('  fullyAvailableDate: best-estimate for when certified kits are Legal in ordinary retail terms: the BSI plug-in solar product standard has published and mainstream UK retailers can stock compliant kits without long "pending standard" disclaimers. Anchor to mid-July 2026 unless search evidence says otherwise. This is NOT the BS 7671 Amendment 4 transition end on 2 October 2026—that milestone is already on the static timeline; never put 2026-10-02 in fullyAvailableDate. Shape: { date (YYYY-MM-DD), label (exact string "Legal"), rationale (1-2 sentences; you may contrast retail vs Amendment 4 transition), confidence ("high"|"medium"|"low") }.');
  lines.push('');
  lines.push('  regulations: an object with EXACTLY these four string keys, each a 60-120 word paragraph:');
  lines.push('    bs7671: Amendment 4 - what it changed, when it took effect, transition deadline.');
  lines.push('    g98: G98 notification process, who notifies, timeframe (28 days).');
  lines.push('    bsi: The BSI product standard - status today, expected publication, what it will cover.');
  lines.push('    eu: How the UK\'s framework compares to Germany, Belgium, Netherlands. One concrete number per country.');
  lines.push('');
  lines.push('  timelineUpdates: array of 0-5 NEW or REVISED milestone entries to merge with the static base timeline. Use this only for entries the static list does not already contain (e.g. an Ofgem announcement landing today). Entry shape: { date (YYYY-MM-DD), title (max 70 chars), description (1 sentence), kind ("past" | "future"), category ("regulation" | "product" | "policy" | "standard") }.');
  lines.push('');
  lines.push('  products: array of 4-12 currently-available UK PLUG-IN solar kits. Each entry shape:');
  lines.push('    {');
  lines.push('      brand, model,');
  lines.push('      wattsAC (number), wattsDC (number, may be null),');
  lines.push('      priceGBP (number, headline / cheapest current price),');
  lines.push('      ukCompliant ("yes"|"pending"|"no"|"unknown"),');
  lines.push('      retailer (display name of the cheapest retailer, mirrors retailers[0].retailer),');
  lines.push('      url (absolute https URL of the cheapest retailer, mirrors retailers[0].url),');
  lines.push('      retailers: [');
  lines.push('        { retailer (display name), url (absolute https - VERIFIED working URL),');
  lines.push('          priceGBP (number, may differ per retailer), affiliate (boolean) }');
  lines.push('        ... 1-4 entries, primary/cheapest first.');
  lines.push('      ],');
  lines.push('      notes (optional <=80 char), hasBattery (boolean), batteryKWh (number, may be null)');
  lines.push('    }');
  lines.push('');
  lines.push('  RETAILERS RULE - CRITICAL:');
  lines.push('  - List EVERY UK retailer carrying the kit (manufacturer direct + Amazon UK + B&Q + Currys + Argos + Lidl + IKEA + etc) where you can verify the listing exists.');
  lines.push('  - Each retailers[].url MUST be a deep link to the actual product page on that retailer, copied verbatim from a Google Search result. Do NOT guess slugs (e.g. "/products/ecoflow-balcony-solar-system" is the kind of slug that often turns out to be wrong - we have already seen 404s on this page from invented uk.ecoflow.com URLs).');
  lines.push('  - The API route HEAD-checks third-party URLs before caching. Amazon UK / Amazon.com and major manufacturer domains (e.g. uk.ecoflow.com, anker.com, zendure.com) are trusted without a fetch because bots often get false 403s — you must still only use URLs you verified in search.');
  lines.push('  - If you cannot verify a working URL for a particular retailer, OMIT that retailer entry rather than guess.');
  lines.push('  - The API route HEAD-checks every retailers[].url before caching and silently drops broken ones. If you cannot verify a working URL for a particular retailer, OMIT that retailer entry rather than guess.');
  lines.push('  - If you can only verify ONE working URL for a product, return retailers with a single entry. One verified link is much better than three guessed ones.');
  lines.push('  - The top-level `retailer` and `url` fields are kept for backwards compatibility - mirror them from the first (cheapest) entry of retailers[].');
  lines.push('  - Mark `affiliate: true` for any link that is clearly an affiliate URL (Amazon "tag=" parameter, etc). Otherwise leave it false / omit.');
  lines.push('');
  lines.push('  STRICT INCLUSION CRITERIA (apply BEFORE listing a product):');
  lines.push('  - Must be a "plug-in solar" or "plug-in battery" product: micro-inverter clipped to <=800 W AC, fed via a single domestic 13 A socket (BS 1363 plug), self-installable without an electrician.');
  lines.push('  - DO NOT include portable power stations, camping power banks, or roof-mounted MCS-installed solar systems.');
  lines.push('  - DO NOT include Jackery portable power stations (Explorer / Plus series, etc.) - they are not plug-in solar; they are off-grid portable batteries.');
  lines.push('  - For batteries-only (no panels) products, only include them if the battery itself plugs into a domestic socket and exports up to 800 W AC into the home wiring (e.g. Zendure Hyper, Marstek B-series, EcoFlow STREAM AC Pro). Set hasBattery: true and wattsAC accordingly.');
  lines.push('  REQUIRED INCLUSIONS (always list each of these if a UK SKU exists):');
  lines.push('  - EcoFlow STREAM Plug & Play Solar System (the "Balcony Solar System") - the UK government delivery partner. Multiple SKUs exist with different DC panel wattages (800 W / 900 W / 1040 W kits) all clipped to 800 W AC. Source from uk.ecoflow.com. List the cheapest current SKU as a baseline plus one expanded panel SKU.');
  lines.push('  - EcoFlow STREAM AC Pro (battery-only AC home battery) and the EcoFlow STREAM Ultra X (3.84 kWh) where applicable - flag both with `notes` explaining whether they are sold as plug-in (sub-800 W AC into a wall socket) or as a hard-wired home battery. Mark ukCompliant: "pending" until BSI product standard publishes; mark ukCompliant: "no" if the unit exceeds 800 W AC and cannot be socket-installed in the UK.');
  lines.push('  - Lidl in-store kit (~£500) and any Iceland or B&Q listing once available.');
  lines.push('  - Anker SOLIX Solarbank, Growatt NOAH, Zendure SolarFlow, BougeRV, Marstek if/once on UK sale - mark `ukCompliant: pending` while the BSI product standard remains in draft.');
  lines.push('  - Verify prices and stock status via Google Search against the manufacturer\'s UK domain. If a product is announced but not yet on sale, set retailer to "Coming soon" and omit it from retailers[] until you can verify a real listing.');
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
    fullyAvailableDate: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING' },
        label: { type: 'STRING' },
        rationale: { type: 'STRING' },
        confidence: { type: 'STRING' },
      },
      required: ['date', 'label', 'rationale', 'confidence'],
    },
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
          retailers: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                retailer: { type: 'STRING' },
                url: { type: 'STRING' },
                priceGBP: { type: 'NUMBER', nullable: true },
                affiliate: { type: 'BOOLEAN' },
              },
              required: ['retailer', 'url'],
            },
          },
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
  required: ['generatedAt', 'statusDashboard', 'tldr', 'legalStatus', 'fullyAvailableDate', 'regulations', 'products', 'prices', 'segStatus', 'news'],
} as const;
