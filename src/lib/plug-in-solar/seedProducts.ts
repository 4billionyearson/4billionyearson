/**
 * Hand-curated list of UK plug-in solar products we always want to
 * feature. Each seed entry points to a manufacturer page that emits
 * schema.org Product / ProductGroup JSON-LD; the daily refresh
 * scrapes that page, picks the "headline" variants we want shown,
 * and turns them into ProductRow entries.
 *
 * Why seeds + scraping rather than relying on Gemini alone:
 *   - Gemini's grounding metadata cannot reliably see live retailer
 *     prices or stock state (Google's index lags flash sales and
 *     sold-out events by hours/days).
 *   - JSON-LD on the manufacturer's own site is ground truth.
 *   - We still let Gemini *discover* additional kits not in this
 *     seed list (e.g. a new Lidl announcement) — those go through
 *     the AI flow as before. The merge step in route.ts gives
 *     seed entries priority over Gemini's guess for the same brand.
 *
 * To add a new brand: append a new SeedProduct here with a
 * `selectVariants()` that picks the small "headline" set the page
 * should show (the EcoFlow URL exposes 17 variants — we only want
 * the four sensible "one row per panel-watt config" picks).
 */

import type { ProductRow } from './types';
import { fetchJsonLdOffers, type JsonLdOffer } from './jsonLdProducts';
import { buildAmazonUkSearchFallback } from './retailerUrls';

export interface SeedProduct {
  /** Stable identifier (also used as React key prefix). */
  id: string;
  brand: string;
  /** Manufacturer page that emits the JSON-LD Product / ProductGroup. */
  sourceUrl: string;
  /** Display name of the retailer (e.g. "EcoFlow UK"). */
  retailerLabel: string;
  /** UK compliance status — we set this manually because Gemini's
   *  judgement here is more reliable than any structured tag on the
   *  manufacturer page. Update when the BSI standard publishes. */
  ukCompliant: ProductRow['ukCompliant'];
  /** True if the kit has battery storage (changes the column). */
  hasBattery: boolean;
  /** Optional battery capacity in kWh. */
  batteryKWh?: number;
  /** AC output cap (always 800 W for UK plug-in solar). */
  wattsAC: number;
  /**
   * Pick which variants to surface. EcoFlow's STREAM page has 17
   * SKUs (cheap "no-bracket" through to "pitched-roof + 4 panels");
   * we only want the headline 3-4 for the table. Default behaviour
   * if not provided: keep all variants.
   */
  selectVariants?: (offers: JsonLdOffer[]) => JsonLdOffer[];
  /**
   * Optional: turn a JsonLdOffer into the human-friendly
   * `{model, wattsDC, notes}` triple for the ProductRow.
   * The default uses the variant's `name` as model and tries to
   * sniff DC wattage from the variant name.
   */
  describeVariant?: (offer: JsonLdOffer) => {
    model: string;
    wattsDC?: number;
    notes?: string;
  };
}

/**
 * The seed list itself. Keep it short — we are not trying to mirror
 * every UK plug-in solar SKU, only to ground the headline products
 * with real prices and stock.
 */
export const SEED_PRODUCTS: SeedProduct[] = [
  // EcoFlow STREAM Plug & Play Solar System (UK government delivery
  // partner). The page exposes a ProductGroup with 17 variants — we
  // pick the cheapest "no-bracket" SKU per panel-wattage tier so the
  // table shows one headline row per panel option.
  {
    id: 'ecoflow-stream-balcony',
    brand: 'EcoFlow',
    sourceUrl: 'https://uk.ecoflow.com/products/stream-balcony-solar-system',
    retailerLabel: 'EcoFlow UK',
    ukCompliant: 'pending',
    hasBattery: false,
    wattsAC: 800,
    selectVariants: (offers) => {
      // SKU naming convention seen on EcoFlow UK:
      //   MI800WII-{PANELW}W{-MOUNT}{xN}
      // e.g. MI800WII-400W (no bracket, 2x400W),
      //      MI800WII-400W-BRACKETADJx2 (with adjustable bracket).
      // For the headline list we want the cheapest variant per
      // panel-watt tier (no mount = lowest sticker price).
      const cheapestPerTier = new Map<string, JsonLdOffer>();
      for (const o of offers) {
        const m = o.sku.match(/MI800WII-(\d+)W(?:-LIGHTWEIGHTx(\d+))?/i);
        if (!m) continue;
        const panelW = parseInt(m[1], 10);
        const mountSuffix = o.sku.replace(/^MI800WII-\d+W/i, '');
        // Group by panel wattage AND by "lightweight x4" because
        // 4×250W and 2×500W are very different setups.
        const tier = mountSuffix.includes('LIGHTWEIGHT')
          ? `${panelW}W-x4`
          : `${panelW}W`;
        const isPlain = mountSuffix === '' || mountSuffix.startsWith('-LIGHTWEIGHT');
        const existing = cheapestPerTier.get(tier);
        // Prefer the "plain" (no bracket) SKU as the headline; if no
        // plain SKU is present in this tier, fall back to the cheapest.
        if (!existing) {
          cheapestPerTier.set(tier, o);
        } else if (isPlain && !cheapestPerTier.get(tier + '-locked')) {
          cheapestPerTier.set(tier, o);
          cheapestPerTier.set(tier + '-locked', o);
        } else if (!cheapestPerTier.get(tier + '-locked') && o.priceGBP < existing.priceGBP) {
          cheapestPerTier.set(tier, o);
        }
      }
      // Strip the helper "-locked" markers and sort cheapest first.
      return Array.from(cheapestPerTier.entries())
        .filter(([k]) => !k.endsWith('-locked'))
        .map(([, v]) => v)
        .sort((a, b) => a.priceGBP - b.priceGBP);
    },
    describeVariant: (offer) => {
      // SKU shape: MI800WII-400W, MI800WII-450W, MI800WII-520W,
      //            MI800WII-250W (which is 4×250W = 1000W DC).
      const m = offer.sku.match(/MI800WII-(\d+)W(?:-LIGHTWEIGHTx(\d+))?/i);
      if (!m) return { model: 'STREAM Plug & Play Solar System' };
      const panelW = parseInt(m[1], 10);
      const isLightweight = /LIGHTWEIGHT/i.test(offer.sku);
      const panelCount = isLightweight ? 4 : 2;
      const wattsDC = panelW * panelCount;
      return {
        model: `STREAM Plug & Play (${panelCount} × ${panelW} W panels)`,
        wattsDC,
        notes: `${panelCount} × ${panelW} W rigid panels + STREAM 800 W microinverter`,
      };
    },
  },

  // EcoFlow STREAM Series Solar Plant — battery-included system.
  // The page exposes a single Product with offers[] (one entry per
  // SKU). We pick the cheapest in-stock entry (or cheapest overall
  // if all are out of stock) plus the "Ultra + AC Pro + 4 panels"
  // top-of-range bundle.
  {
    id: 'ecoflow-stream-solar-plant',
    brand: 'EcoFlow',
    sourceUrl: 'https://uk.ecoflow.com/pages/stream-series-plug-in-solar-battery',
    retailerLabel: 'EcoFlow UK',
    ukCompliant: 'pending',
    hasBattery: true,
    batteryKWh: 1.92,
    wattsAC: 800,
    selectVariants: (offers) => {
      if (offers.length === 0) return [];
      const sorted = [...offers].sort((a, b) => a.priceGBP - b.priceGBP);
      // Headline rows: cheapest entry-level (battery-only or battery
      // + cheapest panel) and the top-of-range full system, no more.
      const headline: JsonLdOffer[] = [sorted[0]];
      if (sorted.length >= 3) {
        const topEnd = sorted[sorted.length - 1];
        if (topEnd.sku !== headline[0].sku) headline.push(topEnd);
      }
      return headline;
    },
    describeVariant: (offer) => {
      // SKU shapes:
      //   EFSTREAMULTRA800W-UK            → battery only
      //   ULTRA800W+520x2                 → battery + 2x520W panels
      //   ULTRA800W+ACProx2+450x4         → battery + 2x AC Pro + 4x450W
      const sku = offer.sku;
      const acProMatch = sku.match(/ACPro(?:x(\d+))?/i);
      const panelsMatch = sku.match(/(\d{3,4})x(\d+)/);
      const acProCount = acProMatch ? parseInt(acProMatch[1] || '1', 10) : 0;
      const acProBatteryKWh = acProCount * 1.92;

      const parts: string[] = ['STREAM Ultra battery'];
      if (acProCount > 0) parts.push(`+ ${acProCount} × AC Pro battery`);
      let wattsDC: number | undefined;
      if (panelsMatch) {
        const panelW = parseInt(panelsMatch[1], 10);
        const panelN = parseInt(panelsMatch[2], 10);
        parts.push(`+ ${panelN} × ${panelW} W panels`);
        wattsDC = panelW * panelN;
      }

      return {
        model: parts.join(' '),
        wattsDC,
        notes: panelsMatch
          ? `Plug-in battery system with included panels (~${(1.92 + acProBatteryKWh).toFixed(2)} kWh storage)`
          : `Plug-in battery only (~${(1.92 + acProBatteryKWh).toFixed(2)} kWh) — pair with any panels or charge from grid`,
      };
    },
  },
];

/**
 * For every seed entry: scrape its source URL, pick the headline
 * variants and return one ProductRow per variant.
 *
 * Failures are silent (logged + skipped); the daily refresh must
 * never crash because EcoFlow's site is briefly unreachable.
 */
export async function buildSeedProductRows(): Promise<ProductRow[]> {
  const settled = await Promise.all(
    SEED_PRODUCTS.map(async (seed) => {
      try {
        const offers = await fetchJsonLdOffers(seed.sourceUrl);
        if (offers.length === 0) {
          console.warn(`[seedProducts] ${seed.id}: no JSON-LD offers found at ${seed.sourceUrl}`);
          return [];
        }
        const picked = (seed.selectVariants ?? ((o) => o))(offers);
        return picked.map((offer): ProductRow => seedToRow(seed, offer));
      } catch (err) {
        console.warn(`[seedProducts] ${seed.id} failed:`, err);
        return [];
      }
    }),
  );
  return settled.flat();
}

function seedToRow(seed: SeedProduct, offer: JsonLdOffer): ProductRow {
  const desc = (seed.describeVariant ?? defaultDescribe)(offer);
  return {
    brand: seed.brand,
    model: desc.model,
    wattsAC: seed.wattsAC,
    wattsDC: desc.wattsDC,
    priceGBP: Math.round(offer.priceGBP),
    ukCompliant: seed.ukCompliant,
    retailer: seed.retailerLabel,
    url: offer.url,
    retailers: [
      {
        retailer: seed.retailerLabel,
        url: offer.url,
        priceGBP: Math.round(offer.priceGBP),
        stock: offer.availability,
      },
      // Always include an Amazon UK search fallback so the row stays
      // useful when EcoFlow are out of stock.
      buildAmazonUkSearchFallback(seed.brand, desc.model),
    ],
    notes: desc.notes,
    hasBattery: seed.hasBattery,
    batteryKWh: seed.batteryKWh,
    stock: offer.availability,
  };
}

function defaultDescribe(offer: JsonLdOffer): { model: string; wattsDC?: number; notes?: string } {
  return { model: offer.name || offer.sku || 'Unknown variant' };
}
