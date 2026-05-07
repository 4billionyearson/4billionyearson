import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';
import type { TimelineEntry } from '@/lib/plug-in-solar/types';

/**
 * Evergreen content for the UK Plug-in Solar guide. Anything that changes
 * frequently (status pills, products, prices, news) is supplied by the
 * daily Gemini refresh; this file holds the stable scaffolding the page
 * is built around.
 */

/* ─── How it works ─────────────────────────────────────────────────────────── */

export const HOW_IT_WORKS_PARAGRAPHS: string[] = [
  "Plug-in solar - sometimes called balcony solar, DIY solar, or by its German name Balkonkraftwerk - is a small photovoltaic system you install yourself and plug into a regular three-pin socket. A typical kit is one or two solar panels, a micro-inverter that converts DC from the panels into 230 V AC, and a standard UK plug.",
  "Once plugged in, the inverter pushes electricity into your home's wiring. Anything you happen to be using at that moment - the fridge, the router, the kettle, your laptop charger - takes that solar electricity first, and the grid only tops up what's left. It's not a backup battery: when the panels stop producing, the grid takes over invisibly.",
  "The legal limit in the UK is 800 watts of AC output per circuit. That's roughly enough to run an always-on \"base load\" - fridge, freezer, internet kit, a few standby devices - on sunny days. Most kits use one or two panels of around 400-450 W each, so panel input can be slightly higher than 800 W (the inverter clips the excess).",
  "Plug-in solar will not power your house in a power cut. The inverter is required to detect a grid outage and shut off automatically (\"anti-islanding\") to protect engineers working on the network. To run essentials in a blackout you need a separate battery system with off-grid mode.",
];

/* ─── Plug-in vs rooftop decision ──────────────────────────────────────────── */

export const PLUG_IN_VS_ROOFTOP: { question: string; plugIn: string; rooftop: string }[] = [
  {
    question: 'Up-front cost',
    plugIn: 'Around £400-£800 for an 800 W kit',
    rooftop: 'Around £6,000-£10,000 for a typical 4 kW system',
  },
  {
    question: 'Annual generation',
    plugIn: '500-700 kWh in southern England',
    rooftop: '3,500-4,200 kWh in southern England',
  },
  {
    question: 'Annual bill saving',
    plugIn: '£70-£175',
    rooftop: '£600-£1,000 (with a battery and a smart export tariff)',
  },
  {
    question: 'Installation',
    plugIn: 'You can do it yourself, no electrician required',
    rooftop: 'MCS-certified installer, scaffolding, planning',
  },
  {
    question: 'Get paid for export?',
    plugIn: 'Not yet - SEG simplification expected ~2027',
    rooftop: 'Yes, via the Smart Export Guarantee',
  },
  {
    question: 'Suitable for renters?',
    plugIn: 'Yes - portable, no permanent fix needed',
    rooftop: 'Almost never - landlord and roof access required',
  },
  {
    question: 'Suitable for flats / balconies',
    plugIn: 'Yes - mounts on balcony rails or south-facing walls',
    rooftop: 'No',
  },
];

/* ─── Base timeline ────────────────────────────────────────────────────────── */

/**
 * Static milestones. The Gemini daily refresh can add new TimelineEntry
 * objects via `timelineUpdates`; the page de-dupes on `date + title` when
 * merging. Today's marker is computed in the renderer.
 */
export const BASE_TIMELINE: TimelineEntry[] = [
  {
    date: '2025-02-26',
    title: 'Government consultation opened',
    description:
      'DESNZ launched a public consultation on plug-in solar legalisation, citing 1.5 million installations across Germany.',
    kind: 'past',
    category: 'policy',
  },
  {
    date: '2026-03-16',
    title: 'Government confirmed legalisation',
    description:
      'DESNZ announced it would amend BS 7671 and the G98 distribution code to permit sub-800 W plug-in solar via a domestic socket. EcoFlow was named as a delivery partner.',
    kind: 'past',
    category: 'policy',
  },
  {
    date: '2026-04-15',
    title: 'BS 7671 Amendment 4 published',
    description:
      'The IET and BSI published Amendment 4 to the IET Wiring Regulations. Chapter 712 was updated to recognise small plug-connected PV sources.',
    kind: 'past',
    category: 'regulation',
  },
  {
    date: '2026-07-15',
    title: 'BSI plug-in solar product standard expected',
    description:
      'A new BSI product standard is expected mid-2026 covering anti-islanding, max 800 W AC output, micro-inverter certification (EN 50549), and BS 1363 plug compliance.',
    kind: 'future',
    category: 'standard',
  },
  {
    date: '2026-10-02',
    title: 'BS 7671 Amendment 4 transition ends',
    description:
      'After this date, all new electrical installation work in the UK must comply with Amendment 4. Plug-in solar kits should be fully aligned with the BSI product standard.',
    kind: 'future',
    category: 'regulation',
  },
  {
    date: '2027-04-01',
    title: 'Simplified SEG pathway expected',
    description:
      'Industry expects Ofgem to introduce a simplified Smart Export Guarantee registration route for plug-in solar, removing the current MCS-certification barrier.',
    kind: 'future',
    category: 'policy',
  },
];

/**
 * Compact, single-line strings used in the top-of-page hero mini timeline.
 * Past entries should use past tense; future entries use "expected" / future
 * tense. We keep these short so they fit a horizontal strip on mobile.
 */
export const HERO_TIMELINE: { date: string; label: string; kind: 'past' | 'future' }[] = [
  { date: '2025-02-26', label: 'Consultation opened', kind: 'past' },
  { date: '2026-03-16', label: 'Legalisation announced', kind: 'past' },
  { date: '2026-04-15', label: 'BS 7671 Amend. 4 live', kind: 'past' },
  { date: '2026-07-15', label: 'BSI standard due', kind: 'future' },
  { date: '2026-10-02', label: 'Amend. 4 transition ends', kind: 'future' },
  { date: '2027-04-01', label: 'Simplified SEG', kind: 'future' },
];

/* ─── Installation steps (HowTo) ───────────────────────────────────────────── */

export interface InstallStep {
  title: string;
  detail: string;
}

export const INSTALL_STEPS: InstallStep[] = [
  {
    title: 'Check your consumer unit',
    detail:
      "Your fuse board should be modern (RCD or RCBO protected). If you have an old re-wireable fuse board, ask an electrician to look at it before you plug in. Older houses with two-pin sockets won't work without an upgrade.",
  },
  {
    title: 'Pick a sunny location',
    detail:
      'South or south-west facing, unshaded between roughly 9 am and 4 pm in summer. A balcony rail, a south wall, a garden frame, a flat shed roof or a fence panel all work.',
  },
  {
    title: 'Mount the panels securely',
    detail:
      'Use the brackets supplied with your kit. Balcony rail brackets, ground frames and wall hooks are all available. Make sure the panels are tilted (typically 20-40 degrees) and cannot fall in high winds.',
  },
  {
    title: 'Connect the micro-inverter',
    detail:
      'The micro-inverter clips to the back of the panel or the mounting frame. Plug the panel DC cables into the inverter, then plug the inverter into a single dedicated 13 A socket. Do not daisy-chain through extension leads.',
  },
  {
    title: 'Plug in and check',
    detail:
      'Once plugged in the inverter takes ~60 seconds to detect the grid frequency, then begins exporting. Most kits include a Wi-Fi monitoring app showing live output.',
  },
  {
    title: 'Notify your DNO (G98)',
    detail:
      'Within 28 days you must tell your Distribution Network Operator that you have a generator under 16 A per phase. The form is free, online, and takes a few minutes. Use our DNO finder below.',
  },
  {
    title: 'Tell your home insurer',
    detail:
      "Most insurers will note the system on your policy at no extra cost. Don't skip this step: failing to declare a generator can give the insurer grounds to decline a claim.",
  },
];

/* ─── FAQ ──────────────────────────────────────────────────────────────────── */

export const PLUG_IN_SOLAR_FAQ: FAQItem[] = [
  {
    q: 'Is plug-in solar legal in the UK in 2026?',
    aText:
      'Yes, in principle. The government announced legalisation on 16 March 2026 and BS 7671 Amendment 4 took effect on 15 April 2026, recognising small plug-connected PV sources. The full picture also depends on a separate BSI product standard expected in mid-2026 - until that publishes, kits sold as "compliant" are claiming compliance with a standard that is not yet finalised. The 800 W AC output limit applies, you must notify your Distribution Network Operator within 28 days (G98), and you should inform your home insurer.',
  },
  {
    q: 'Can renters install plug-in solar?',
    aText:
      'In most cases yes. Plug-in solar is portable and does not require permanent fixings to the building, which puts it outside the scope of most tenancy clauses on alterations. The Renters\' Rights Act 2025 also gives tenants stronger rights to make energy-efficiency improvements, and we provide a downloadable letter template you can send your landlord. Always check your tenancy agreement and notify your landlord in writing before installing.',
  },
  {
    q: 'Will it void my home insurance?',
    aText:
      'Not if you tell your insurer. A non-compliant or undeclared electrical installation gives an insurer grounds to refuse a claim, but a sub-800 W plug-in solar system installed in line with BS 7671 Amendment 4 is now an accepted modification. Notify your insurer in writing - most will simply add a note to the policy at no extra cost.',
  },
  {
    q: 'Do I need an electrician?',
    aText:
      'No, not legally, for a sub-800 W kit. The whole point of the new framework is that plug-in solar can be installed without notifiable electrical work. That said, if your consumer unit is old (re-wireable fuses, no RCD), get an electrician to look at it before plugging anything in.',
  },
  {
    q: 'How much money will I save?',
    aText:
      "A typical 800 W kit in southern England generates roughly 500-700 kWh a year. At a unit rate around 24-27 p/kWh that's £130-£190 of self-consumed electricity. Real-world savings depend on how much you use during the day - households where someone is home, or where always-on appliances run continuously, see the highest payback. Government modelling suggested £70-£110 a year for an average household with a 4-year payback.",
  },
  {
    q: 'Can I get paid for excess solar I send to the grid?',
    aText:
      'Not yet, for plug-in solar. The Smart Export Guarantee currently requires MCS certification of the install, and DIY plug-in installs cannot be MCS-certified. Industry expects Ofgem to introduce a simplified SEG route for plug-in solar in 2027. Until then you only save on electricity you self-consume - which is fine, because self-consumed kWh are worth more than exported ones anyway.',
  },
  {
    q: 'Can I add a battery to a plug-in solar system?',
    aText:
      'Yes, and several kits now bundle one. A small (1-2 kWh) battery captures sunshine you would otherwise have exported for free, and lets you use it in the evening - shifting up to twice as much of your generation into useful self-consumption. With a time-of-use tariff like Octopus Flux a battery can also be charged from the grid overnight at low rates and discharged at peak: this works as a standalone strategy even without solar panels.',
  },
  {
    q: 'Do I need planning permission?',
    aText:
      'For panels mounted on a balcony rail, on a fence, in a garden, or on a wall in a non-conservation area, no - they are treated as portable equipment and fall under permitted development. For listed buildings, conservation areas, or panels mounted on the roof, check with your local authority.',
  },
  {
    q: 'What is the 800 W limit and why?',
    aText:
      'The 800 W refers to the maximum AC output of the micro-inverter. It is set conservatively so the system cannot overload the ring main if everything else on that circuit is also drawing power. You can have panels totalling more than 800 W of nominal DC output, as long as the inverter is clipped to 800 W AC - which all UK-aimed kits are.',
  },
  {
    q: 'What if my house has a power cut - can plug-in solar keep things running?',
    aText:
      "No. The micro-inverter has anti-islanding protection (required by EN 50549) which shuts the system off the instant it detects a grid outage. This is to protect engineers working on the network. To run essentials during a power cut you need a separate off-grid battery system with a transfer switch, which plug-in solar kits don't provide.",
  },
  {
    q: 'Will it work in winter or on cloudy days?',
    aText:
      'Yes, but at reduced output. UK plug-in solar typically generates 70-90% of its annual yield between April and September. On a bright winter day you might still see 100-300 W; on a heavily overcast day in December, output can drop to 20-50 W. The annual figures already account for this seasonality.',
  },
  {
    q: 'What about non-compliant kits sold on Amazon and eBay?',
    aText:
      'Imported kits aimed at the German or Spanish market and sold on UK marketplaces may not meet UK standards. Common issues include inverters that are not certified to EN 50549 (so anti-islanding behaviour is unverified), missing earth bonding for panel frames, and plug types other than BS 1363. Look for an explicit statement of UK compliance with BS 7671 Amendment 4 and, once published, the BSI product standard. Avoid generic listings without a UK importer.',
  },
];

/* ─── Glossary ─────────────────────────────────────────────────────────────── */

export const GLOSSARY: { term: string; definition: string }[] = [
  {
    term: 'Plug-in solar',
    definition:
      'A small PV system - typically one or two panels and a micro-inverter - that connects to the home via a standard three-pin plug rather than a hard-wired spur. Also called balcony solar, DIY solar, or Balkonkraftwerk.',
  },
  {
    term: 'Micro-inverter',
    definition:
      'A small inverter, typically clipped to the back of a single panel, that converts the panel\'s DC output into 230 V AC. UK-aimed micro-inverters are clipped to 800 W AC output.',
  },
  {
    term: 'Anti-islanding',
    definition:
      'A safety feature, required by the EN 50549 standard, that automatically shuts the inverter off within ~200 ms if it detects the grid has gone down. Protects engineers working on the network during a fault.',
  },
  {
    term: 'BS 7671',
    definition:
      'The IET Wiring Regulations - the standard that all UK electrical installation work must follow. Amendment 4, effective 15 April 2026, updates Chapter 712 to permit small plug-connected PV.',
  },
  {
    term: 'G98',
    definition:
      'The Distribution Network Operator notification standard for generators under 16 A per phase. Plug-in solar must be notified to the local DNO within 28 days of install. Free online form, no approval required.',
  },
  {
    term: 'DNO',
    definition:
      'Distribution Network Operator - the company that owns and runs the lower-voltage cables that bring electricity to your home. There are six DNO regions in Great Britain. Different from your electricity supplier.',
  },
  {
    term: 'MCS',
    definition:
      'Microgeneration Certification Scheme - the consumer-facing certification scheme for renewables installs. Currently a gateway to the Smart Export Guarantee. Plug-in DIY installs are not MCS-certifiable.',
  },
  {
    term: 'SEG',
    definition:
      'Smart Export Guarantee - the framework that pays households for electricity they export to the grid. Currently requires MCS certification. A simplified pathway for plug-in solar is expected ~2027.',
  },
  {
    term: 'kWh',
    definition:
      'Kilowatt-hour - the unit your electricity bill is measured in. A typical UK home uses about 2,700 kWh a year. An 800 W plug-in solar system in southern England generates about 500-700 kWh a year.',
  },
  {
    term: 'Self-consumption',
    definition:
      'The share of your solar generation that is used inside the home rather than exported. Self-consumed kWh save you the import unit rate (around 25 p), while exported kWh earn the export rate (around 12-15 p), so self-consumption is worth roughly twice as much.',
  },
  {
    term: 'Time-of-use tariff',
    definition:
      'An electricity tariff with different rates at different times of day. Octopus Flux, for example, charges peak (4-7 pm) and pays a high export rate during the same window, with cheap import rates overnight - which makes a battery valuable even without solar panels.',
  },
];

/* ─── Postcode → DNO lookup ────────────────────────────────────────────────── */

export interface DNOEntry {
  /** Distribution Network Operator name. */
  name: string;
  /** Region label. */
  region: string;
  /** G98 / generation notification page. */
  url: string;
  /** General contact / faults phone number. */
  phone: string;
}

/**
 * Map of UK postcode-area letters (the alphabetic prefix of the postcode,
 * e.g. "M" for Manchester, "SW" for South West London) to the DNO that
 * operates that area. For mixed areas we pick the dominant operator;
 * boundary cases are rare. This is good enough for an "find your DNO"
 * helper - users can confirm via their bill if needed.
 */
export const DNO_LOOKUP: Record<string, DNOEntry> = (() => {
  const ukpn: DNOEntry = {
    name: 'UK Power Networks',
    region: 'London, South East and East England',
    url: 'https://www.ukpowernetworks.co.uk/generation',
    phone: '0800 029 4285',
  };
  const ssen: DNOEntry = {
    name: 'SSEN',
    region: 'Southern England and Northern Scotland',
    url: 'https://www.ssen.co.uk/our-services/connections/connecting-generation/connecting-small-generation/',
    phone: '0800 048 3516',
  };
  const ngedSW: DNOEntry = {
    name: 'National Grid Electricity Distribution',
    region: 'South West, South Wales, Midlands',
    url: 'https://www.nationalgrid.co.uk/our-services/applying-for-a-new-connection/connecting-distributed-generation',
    phone: '0800 6783 105',
  };
  const enwl: DNOEntry = {
    name: 'Electricity North West',
    region: 'North West England',
    url: 'https://www.enwl.co.uk/get-connected/generation/',
    phone: '0800 195 4141',
  };
  const npg: DNOEntry = {
    name: 'Northern Powergrid',
    region: 'Yorkshire and the North East',
    url: 'https://www.northernpowergrid.com/connect-a-generator',
    phone: '0800 011 3332',
  };
  const sp: DNOEntry = {
    name: 'SP Energy Networks',
    region: 'Central/southern Scotland, Merseyside, North Wales and Cheshire',
    url: 'https://www.spenergynetworks.co.uk/pages/connect_a_generator.aspx',
    phone: '0330 10 10 222',
  };
  const niee: DNOEntry = {
    name: 'NIE Networks',
    region: 'Northern Ireland',
    url: 'https://www.nienetworks.co.uk/connections/microgeneration',
    phone: '03457 643 643',
  };

  const map: Record<string, DNOEntry> = {};
  // London (UKPN)
  ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC'].forEach((p) => (map[p] = ukpn));
  // South East / East (UKPN)
  ['BR', 'CM', 'CO', 'CR', 'CT', 'DA', 'EN', 'HA', 'IG', 'IP', 'KT', 'ME', 'RH', 'RM', 'SG', 'SS', 'TN', 'TW', 'UB', 'WD', 'AL', 'CB', 'PE', 'NR'].forEach((p) => (map[p] = ukpn));
  // SSEN South (Southern)
  ['BH', 'GU', 'OX', 'PO', 'RG', 'SL', 'SN', 'SO', 'SP'].forEach((p) => (map[p] = ssen));
  // SSEN North (Scotland)
  ['AB', 'IV', 'PA', 'PH', 'KW', 'HS', 'ZE', 'DD', 'KY', 'FK'].forEach((p) => (map[p] = ssen));
  // SP Energy Networks Scotland (central/southern)
  ['EH', 'G', 'KA', 'ML', 'TD', 'DG'].forEach((p) => (map[p] = sp));
  // SP Manweb (Cheshire / North Wales / Merseyside)
  ['CH', 'CW', 'L', 'LL', 'SY'].forEach((p) => (map[p] = sp));
  // ENWL (North West England)
  ['BB', 'BL', 'CA', 'FY', 'LA', 'M', 'OL', 'PR', 'SK', 'WA', 'WN'].forEach((p) => (map[p] = enwl));
  // Northern Powergrid (Yorkshire + North East)
  ['BD', 'DH', 'DL', 'DN', 'HD', 'HG', 'HU', 'HX', 'LS', 'NE', 'SR', 'TS', 'WF', 'YO', 'S'].forEach((p) => (map[p] = npg));
  // National Grid Electricity Distribution (West Midlands, East Midlands, South West, South Wales)
  ['B', 'BS', 'CV', 'DE', 'DY', 'GL', 'HR', 'LE', 'NG', 'NN', 'ST', 'TF', 'WR', 'WS', 'WV', 'CF', 'SA', 'NP', 'EX', 'LD', 'LN', 'PL', 'TA', 'TQ', 'TR'].forEach((p) => (map[p] = ngedSW));
  // NI
  ['BT'].forEach((p) => (map[p] = niee));
  return map;
})();

/**
 * Given a free-text postcode, return the postcode-area letters (e.g. "SW1A 2AA" -> "SW").
 */
export function getPostcodeArea(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, ' ');
  const m = cleaned.match(/^([A-Z]{1,2})\d/);
  return m ? m[1] : null;
}

export function lookupDNO(postcode: string): { area: string; dno: DNOEntry } | null {
  const area = getPostcodeArea(postcode);
  if (!area) return null;
  // Try the 2-letter area first, then fall back to the 1-letter prefix.
  const dno = DNO_LOOKUP[area] || DNO_LOOKUP[area.charAt(0)];
  if (!dno) return null;
  return { area, dno };
}

/* ─── PVGIS regional yield estimates (kWh per kWp per year) ────────────────── */

/**
 * Approximate annual specific yield (kWh per kWp installed, optimal tilt/azimuth)
 * for UK postcode-area letters, derived from PVGIS. Used as an offline default
 * for the payback calculator so the page works even if PVGIS rate-limits.
 * The page can still call PVGIS live for postcode-accurate figures when online.
 */
export const REGIONAL_YIELD_KWH_PER_KWP: Record<string, number> = {
  // Southern England and the South West - sunniest
  TR: 1100, TQ: 1080, PL: 1080, EX: 1060, BS: 1040, BA: 1040, TA: 1040, DT: 1080, BH: 1080,
  PO: 1080, SP: 1060, SO: 1080, SN: 1040, GL: 1020, OX: 1020, RG: 1020, SL: 1020,
  GU: 1060, RH: 1060, BN: 1080, TN: 1040, ME: 1020, CT: 1040, DA: 1020,
  // London + SE
  E: 1020, EC: 1020, N: 1020, NW: 1020, SE: 1020, SW: 1020, W: 1020, WC: 1020,
  BR: 1020, CR: 1020, KT: 1020, TW: 1020, UB: 1020, HA: 1020, EN: 1020, IG: 1020, RM: 1020,
  // East
  CM: 1020, CO: 1040, IP: 1040, NR: 1040, PE: 1000, CB: 1020, SG: 1000, AL: 1020, WD: 1020,
  HP: 1020, MK: 1020, NN: 1000, LE: 980, LU: 1000, SS: 1040, CV: 980,
  // Midlands
  B: 980, DY: 980, WV: 980, WS: 980, ST: 960, TF: 960, SY: 960, WR: 980, HR: 1000,
  DE: 980, NG: 980, LN: 980, S: 960,
  // North West
  CH: 960, CW: 960, L: 960, M: 940, BL: 940, BB: 940, PR: 940, FY: 940, LA: 920,
  CA: 880, OL: 940, SK: 960, WN: 940, WA: 940,
  // Yorkshire / NE
  HD: 940, HX: 940, BD: 940, LS: 960, WF: 960, YO: 960, HU: 980, HG: 940, DN: 980, DL: 920,
  TS: 920, DH: 920, NE: 920, SR: 920,
  // Wales
  CF: 1000, NP: 1000, SA: 1020, LD: 980, LL: 940,
  // Scotland
  EH: 880, G: 860, KA: 880, ML: 860, TD: 880, DG: 900, FK: 860, KY: 860, DD: 880,
  PH: 840, AB: 860, IV: 800, PA: 840, KW: 760, HS: 820, ZE: 720,
  // NI
  BT: 880,
};

/**
 * Estimate annual generation for a system of given AC capacity at a postcode area.
 * Plug-in solar systems are usually quoted in AC watts (e.g. 800 W) but the
 * panels themselves are slightly higher DC; we use AC watts as a conservative
 * proxy for the inverter-clipped output that actually reaches the home.
 */
export function estimateAnnualGenerationKWh(wattsAC: number, postcodeArea: string | null): number {
  const yieldPerKWp = (postcodeArea && REGIONAL_YIELD_KWH_PER_KWP[postcodeArea]) || 950;
  return Math.round((wattsAC / 1000) * yieldPerKWp);
}

/* ─── Landlord letter template ─────────────────────────────────────────────── */

export const LANDLORD_LETTER_TEMPLATE = `Dear [LANDLORD NAME],

I am writing to let you know that I would like to install a small plug-in solar
system at [PROPERTY ADDRESS]. I wanted to share the details with you so that
you have everything you need on file.

What is plug-in solar?

A plug-in solar system is a small portable photovoltaic system - one or two
panels (around 800 W AC output) that plug into a standard three-pin socket. It
generates a small amount of electricity during daylight hours that the property
uses directly. It does not require any new wiring, sockets, or alterations to
the building.

Legal status

As of 15 April 2026, plug-in solar systems are recognised under BS 7671
Amendment 4 (the IET Wiring Regulations) and the G98 distribution code. The
government formally announced legalisation on 16 March 2026. The system I am
proposing falls under the 800 W AC output threshold and will be installed in
line with the manufacturer's instructions and the new wiring regulations.

What it means for the property

- No drilling, no fixings to the structure - the panel(s) will be mounted on a
  free-standing frame / on the balcony rail using clip-on brackets / on a
  removable wall hook. (Pick whichever applies.)
- The panels are easily removable at the end of the tenancy.
- The system plugs into an existing socket; no electrical alterations are made.
- The system has anti-islanding protection (it disconnects automatically in
  the event of a power cut), so there is no risk to anyone working on the
  property's electrics.
- I will notify our Distribution Network Operator within 28 days of install
  (G98 form) and inform my contents insurer.
- The system improves the energy performance of the property at no cost to
  you. This is consistent with the energy-efficiency improvements that tenants
  have a right to request under the Renters' Rights Act 2025.

I would be grateful if you could confirm in writing that you are happy for me
to proceed. I am happy to send you a copy of the manufacturer's compliance
documentation and the G98 notification on request.

Many thanks,

[YOUR NAME]
[DATE]
`;
