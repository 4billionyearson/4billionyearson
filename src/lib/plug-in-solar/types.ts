/**
 * Shared types for the UK Plug-in Solar guide.
 *
 * The Gemini API call returns a `PlugInSolarLiveData` JSON object every day.
 * It is cached in Redis under `plug-in-solar-uk:YYYY-MM-DD-v1` and rendered
 * directly by the page (no markdown parsing). All keys are stable so the
 * client renders even if Gemini omits or reorders fields.
 */

export type StatusValue = 'legal' | 'partial' | 'not-legal' | 'yes' | 'no' | 'soon';

export interface StatusPill {
  /** Short label shown on the pill, e.g. "Legal in the UK?". */
  label: string;
  /** Status keyword - drives the colour/icon. */
  status: StatusValue;
  /** One-line plain-text reason. */
  reason: string;
  /** ISO date string (YYYY-MM-DD) representing when this status was last verified. */
  asOf: string;
}

export interface TimelineEntry {
  /** ISO date string (YYYY-MM-DD). For future events use a best-estimate date. */
  date: string;
  /** Short headline (max ~70 chars). */
  title: string;
  /** One-sentence description. */
  description: string;
  /** "past" = already happened, "future" = expected, "today" = computed at render time. */
  kind: 'past' | 'future';
  /** Optional category tag for icon/colour. */
  category?: 'regulation' | 'product' | 'policy' | 'standard';
}

export interface ProductRow {
  brand: string;
  model: string;
  /** AC output in watts (the legal limit is 800 W AC). */
  wattsAC: number;
  /** Total panel input in watts (often higher than AC output). */
  wattsDC?: number | null;
  /** Retail price in GBP. */
  priceGBP: number;
  /** Whether the kit, as sold, currently meets the upcoming UK product standard. */
  ukCompliant: 'yes' | 'pending' | 'no' | 'unknown';
  /** Where it's sold - retailer name (e.g. "EcoFlow UK", "Lidl in-store", "Amazon"). */
  retailer: string;
  /** Outbound URL for the buy-link (manufacturer or retailer). May include affiliate codes. */
  url: string;
  /** Optional 1-line note (e.g. "Government's named partner"). */
  notes?: string;
  /** Whether a battery is included or available as an add-on. */
  hasBattery?: boolean;
  /** Battery capacity in kWh if included. */
  batteryKWh?: number | null;
}

export interface NewsItem {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  headline: string;
  summary: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface ChangeLogItem {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  summary: string;
}

export interface PriceSnapshot {
  /** Current Ofgem price-cap unit rate, p/kWh. */
  unitRate_pPerKWh: number;
  /** Generic SEG export rate (best 2026 fixed). */
  exportRate_pPerKWh: number;
  /** Octopus Flux import rate, peak (4-7 pm), p/kWh. */
  fluxImport_pPerKWh: number;
  /** Octopus Flux export rate, peak (4-7 pm), p/kWh. */
  fluxExport_pPerKWh: number;
  /** Octopus Flux off-peak (overnight) import rate, p/kWh. */
  fluxOffPeak_pPerKWh: number;
  /** Human-readable label, e.g. "Ofgem cap from 1 Jul 2026". */
  sourceLabel: string;
  /** When these rates were checked, ISO date. */
  asOf: string;
}

export interface PlugInSolarLiveData {
  /** ISO timestamp this payload was generated. */
  generatedAt: string;
  /** Status pills for the headline dashboard. */
  statusDashboard: StatusPill[];
  /** Snippet-bait TL;DR (50-80 words). */
  tldr: string;
  /** Long-form daily-updated paragraph on legal status (120-180 words). */
  legalStatus: string;
  /** Section keyed paragraphs on individual regulatory threads. */
  regulations: {
    bs7671: string;
    g98: string;
    bsi: string;
    eu: string;
  };
  /** Newly-discovered or refined timeline events to merge with the static base timeline. */
  timelineUpdates: TimelineEntry[];
  /** Currently available kits. */
  products: ProductRow[];
  /** Latest UK electricity prices used by the calculators. */
  prices: PriceSnapshot;
  /** SEG availability summary for plug-in solar. */
  segStatus: string;
  /** What changed since the previous cache. */
  changeLog: ChangeLogItem[];
  /** Last 5-10 dated news items. */
  news: NewsItem[];
  /** Google Search grounding citations. */
  groundingSources: { title: string; uri: string }[];
}
