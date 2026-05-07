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
 * To add a new brand: append a new SeedProduct here. For brands with
 * a live product page: supply `sourceUrl` + optional `selectVariants`.
 * For brands where the product hasn't launched in the UK yet: omit
 * `sourceUrl` and supply `staticRows` instead — those rows appear in
 * the table with price shown as "—" so visitors know it's coming but
 * we're not inventing a number.
 */

import type { ProductRow } from './types';
import { fetchJsonLdOffers, type JsonLdOffer } from './jsonLdProducts';
import { buildAmazonUkSearchFallback } from './retailerUrls';

export interface SeedProduct {
  /** Stable identifier (also used as React key prefix). */
  id: string;
  brand: string;
  /**
   * Manufacturer page that emits the JSON-LD Product / ProductGroup.
   * Omit (or set undefined) for brands where no live UK product page
   * exists yet — use `staticRows` instead.
   */
  sourceUrl?: string;
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
   * Pick which variants to surface. We normally want just the cheapest
   * offer per product family (1 row), not one row per SKU.
   * Default behaviour if not provided: keep all variants.
   */
  selectVariants?: (offers: JsonLdOffer[]) => JsonLdOffer[];
  /**
   * If set, this URL is used as the ProductRow.url instead of the
   * variant-specific offer URL. Use the generic product page so links
   * stay valid regardless of which variant is currently in stock.
   */
  canonicalUrl?: string;
  /**
   * When true, no Amazon fallback link is added. Use for brands that
   * sell direct from their own site and aren't on Amazon UK officially.
   */
  suppressAmazonFallback?: boolean;
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
  /**
   * Static rows to generate without scraping. Used when the product
   * has been announced but isn't yet live on any UK retailer page.
   * Each entry produces a ProductRow with `priceGBP: null` so the
   * table shows "—" rather than an AI-guessed figure.
   */
  staticRows?: Array<{
    model: string;
    wattsDC?: number;
    notes?: string;
    /** Direct product page if one exists (optional). */
    url?: string;
  }>;
}

/**
 * The seed list itself. Keep it short — we are not trying to mirror
 * every UK plug-in solar SKU, only to ground the headline products
 * with real prices and stock.
 */
export const SEED_PRODUCTS: SeedProduct[] = [
  // Anker SOLIX — balcony solar range.
  // Available in Germany, France, and other EU markets but not yet
  // officially sold in the UK (anker.com/uk product pages 404 as of
  // May 2026). Suppress Gemini's guessed UK row and replace with an
  // honest stub pointing to the Anker SOLIX UK landing page.
  {
    id: 'anker-solix',
    brand: 'Anker',
    retailerLabel: 'Anker SOLIX UK',
    ukCompliant: 'unknown',
    hasBattery: true,
    batteryKWh: 1.6,
    wattsAC: 800,
    staticRows: [
      {
        model: 'SOLIX Solarbank 2 E1600 Pro',
        wattsDC: 800,
        notes: 'Available in EU (€989) — not yet officially sold in the UK',
        url: 'https://www.anker.com/uk/collections/solix-balcony-solar',
      },
    ],
  },

  // Lidl UK — Parkside plug-in solar kit.
  // Sold in Germany & EU (Parkside branding); a UK version has been
  // announced but is not yet available with a confirmed price or
  // product page. We show it as a stub so the table is honest:
  // price = "—", compliance = unknown, no buy link yet.
  {
    id: 'lidl-parkside',
    brand: 'Lidl',
    // No sourceUrl: no live UK product page to scrape.
    retailerLabel: 'Lidl UK',
    ukCompliant: 'unknown',
    hasBattery: false,
    wattsAC: 800,
    staticRows: [
      {
        model: 'Parkside Plug-in Solar Kit',
        notes: 'Sold in Germany & EU; UK launch not yet confirmed — check lidl.co.uk',
        url: 'https://www.lidl.co.uk',
      },
    ],
  },

  // EcoFlow STREAM Plug & Play Solar System — panels + microinverter only.
  // EcoFlow sell direct; Amazon doesn't officially stock these. One headline
  // row with the entry price; visitors choose their panel size and bracket
  // on EcoFlow's own configurator.
  {
    id: 'ecoflow-stream-balcony',
    brand: 'EcoFlow',
    sourceUrl: 'https://uk.ecoflow.com/products/stream-balcony-solar-system',
    canonicalUrl: 'https://uk.ecoflow.com/products/stream-balcony-solar-system',
    retailerLabel: 'EcoFlow UK',
    ukCompliant: 'pending',
    hasBattery: false,
    wattsAC: 800,
    suppressAmazonFallback: true,
    // Return only the cheapest offer to get the headline "from £X" price.
    selectVariants: (offers) => {
      const valid = offers.filter((o) => /^MI800WII-/i.test(o.sku));
      if (valid.length === 0) return offers.slice(0, 1);
      return [valid.sort((a, b) => a.priceGBP - b.priceGBP)[0]];
    },
    describeVariant: (offer) => {
      const cheapestPrice = offer.priceGBP;
      return {
        model: 'STREAM Plug & Play Solar System',
        wattsDC: 800,
        notes: `From £${cheapestPrice} — choose panel size (2×400 W to 4×250 W) and bracket on EcoFlow's site`,
      };
    },
  },

  // EcoFlow STREAM Series Solar Plant — battery-included system.
  // Entry product is the STREAM Ultra battery at £1,199 (in stock);
  // visitors can configure panels and extra batteries on EcoFlow's site.
  {
    id: 'ecoflow-stream-solar-plant',
    brand: 'EcoFlow',
    sourceUrl: 'https://uk.ecoflow.com/pages/stream-series-plug-in-solar-battery',
    canonicalUrl: 'https://uk.ecoflow.com/pages/stream-series-plug-in-solar-battery',
    retailerLabel: 'EcoFlow UK',
    ukCompliant: 'pending',
    hasBattery: true,
    batteryKWh: 1.92,
    wattsAC: 800,
    suppressAmazonFallback: true,
    // Return only the cheapest in-stock offer (battery only) as the headline.
    selectVariants: (offers) => {
      const inStock = offers.filter((o) => o.availability === 'in-stock');
      const pool = inStock.length > 0 ? inStock : offers;
      return [pool.sort((a, b) => a.priceGBP - b.priceGBP)[0]];
    },
    describeVariant: (offer) => ({
      model: 'STREAM Series Solar Plant',
      notes: `From £${offer.priceGBP} for battery only (1.92 kWh) — add panels and extra batteries on EcoFlow's site`,
    }),
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
      // Static stub: no live URL to scrape.
      if (!seed.sourceUrl) {
        if (!seed.staticRows?.length) return [];
        return seed.staticRows.map((r) => staticToRow(seed, r));
      }
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
  // Use the canonical product-page URL (no variant params) when provided,
  // so links stay valid regardless of which variant is in or out of stock.
  const url = seed.canonicalUrl ?? offer.url;
  const retailers: import('./types').RetailerLink[] = [
    {
      retailer: seed.retailerLabel,
      url,
      priceGBP: Math.round(offer.priceGBP),
      stock: offer.availability,
    },
  ];
  // Only add an Amazon fallback if the seed explicitly opts in.
  // EcoFlow sell direct; Amazon UK doesn't officially stock these.
  if (!seed.suppressAmazonFallback) {
    retailers.push(buildAmazonUkSearchFallback(seed.brand, desc.model));
  }
  return {
    brand: seed.brand,
    model: desc.model,
    wattsAC: seed.wattsAC,
    wattsDC: desc.wattsDC,
    priceGBP: Math.round(offer.priceGBP),
    ukCompliant: seed.ukCompliant,
    retailer: seed.retailerLabel,
    url,
    retailers,
    notes: desc.notes,
    hasBattery: seed.hasBattery,
    batteryKWh: seed.batteryKWh,
    stock: offer.availability,
    suppressAmazonFallback: seed.suppressAmazonFallback ?? false,
  };
}

/** Build a ProductRow from a static stub (no live scraped price). */
function staticToRow(
  seed: SeedProduct,
  row: NonNullable<SeedProduct['staticRows']>[number],
): ProductRow {
  const fallbackUrl = row.url ?? `https://www.${seed.brand.toLowerCase()}.co.uk`;
  return {
    brand: seed.brand,
    model: row.model,
    wattsAC: seed.wattsAC,
    wattsDC: row.wattsDC,
    priceGBP: null, // not yet confirmed — UI shows "—"
    ukCompliant: seed.ukCompliant,
    retailer: seed.retailerLabel,
    url: fallbackUrl,
    retailers: [
      {
        retailer: seed.retailerLabel,
        url: fallbackUrl,
        priceGBP: undefined,
        isFallback: true,
      },
    ],
    notes: row.notes,
    hasBattery: seed.hasBattery,
    batteryKWh: seed.batteryKWh,
    stock: 'unknown',
  };
}

function defaultDescribe(offer: JsonLdOffer): { model: string; wattsDC?: number; notes?: string } {
  return { model: offer.name || offer.sku || 'Unknown variant' };
}
