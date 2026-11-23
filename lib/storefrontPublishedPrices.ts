import priceRelease from '../config/etsyRegularPriceRelease.json' with {type:'json'};
import type {StorefrontConfiguration,StorefrontProduct} from './types.ts';

type ReleasedOffer = {
  regularUsdMinor: number;
  sizes: string[];
  publicLabel?: string;
};

type ProductRelease = {
  cardConfigurationId: string;
  separateConfigurationIds?: string[];
  baselineEurMinor: Record<string, number>;
  offers: Record<string, ReleasedOffer>;
};

const releases: Readonly<Record<string, ProductRelease>> = priceRelease.products;
const standardSizes = ['XS','S','M','L','XL','XXL','XXXL'];

// A versioned EUR amount is charged everywhere until the next catalog release.
// Convert positive integer cents with a decimal exchange rate and round once.
export function usdToEurMinor(usdMinor: number, usdPerEur: string): number {
  if (!Number.isSafeInteger(usdMinor) || usdMinor < 1 || !/^\d+(?:\.\d{1,6})?$/.test(usdPerEur)) {
    throw new Error('Invalid catalog amount or exchange rate');
  }
  const scale = 10 ** (usdPerEur.split('.')[1]?.length ?? 0);
  const divisor = Number(usdPerEur.replace('.',''));
  const numerator = 2 * usdMinor * scale + divisor;
  if (divisor <= 0 || !Number.isSafeInteger(2 * divisor) || !Number.isSafeInteger(numerator)) {
    throw new Error('Catalog conversion outside safe integer range');
  }
  const amount = Math.floor(numerator / (2 * divisor));
  if (amount < 1) throw new Error('Catalog conversion produced a zero price');
  return amount;
}

function prepareProduct(release: ProductRelease) {
  const regular = new Map<string, number>();
  const current = new Map(Object.entries(release.baselineEurMinor));
  for (const [id, offer] of Object.entries(release.offers)) {
    // The current storefront uses a single configuration price for every standard size.
    // An incomplete or size-dependent source requires a separate pricing model.
    if (!current.has(id) || offer.sizes.length !== standardSizes.length ||
        !standardSizes.every(size => offer.sizes.includes(size))) throw new Error('Incomplete standard-size price evidence: ' + id);
    const amount = usdToEurMinor(offer.regularUsdMinor, priceRelease.fx.usdPerEur);
    regular.set(id,amount);
    current.set(id,amount);
  }
  const card = current.get(release.cardConfigurationId);
  if (!card || !regular.size) throw new Error('Missing catalog display price');
  const values = [...current.values()];
  if (values.some(amount => !Number.isSafeInteger(amount) || amount < 1)) throw new Error('Invalid catalog price');
  // Only compare a set when this catalog entry has one documented composition.
  // The frozen PDP presents one comparison for every set; omit it on multi-set products.
  const pieces = release.separateConfigurationIds ?? [];
  if (new Set(pieces).size !== pieces.length || pieces.some(id => id === release.cardConfigurationId || !current.has(id))) {
    throw new Error('Invalid separate-purchase composition');
  }
  const separate = pieces.reduce((sum,id) => sum + current.get(id)!,0);
  return {release, regular, minimum: Math.min(...values), maximum: Math.max(...values), card, separate};
}

const published = new Map(Object.entries(releases).map(([id,release]) => [id,prepareProduct(release)]));

/** Exact released EUR cents, shared with Merchant and server-side price validation. */
export function publishedRegularEurMinor(productId: string, configurationId: string): number | null {
  return published.get(productId)?.regular.get(configurationId) ?? null;
}

type Card = {
  canonical_product_id: string;
  currency: string | null;
  min_price: number | null;
  max_price: number | null;
  full_set_display_price_amount?: number | null;
  card_display_price_amount?: number | null;
};

/** Both card data sources are materialized independently from the PDP. */
export function applyPublishedCardPrices<T extends Card>(card: T): T {
  const item = published.get(card.canonical_product_id);
  if (!item) return card;
  if (card.currency !== 'EUR') throw new Error('Released catalog currency mismatch');
  return {...card, min_price:item.minimum / 100, max_price:item.maximum / 100,
    ...('full_set_display_price_amount' in card ? {full_set_display_price_amount:item.card / 100} : {}),
    ...('card_display_price_amount' in card ? {card_display_price_amount:item.card / 100} : {})};
}

/** Runs after owner-reviewed selector and color corrections. Preserves the immutable source payload. */
export function applyPublishedProductPrices(product: StorefrontProduct): StorefrontProduct {
  const item = published.get(product.canonical_product_id);
  if (!item) return product;
  if (product.currency !== 'EUR' || !Array.isArray(product.configurations)) throw new Error('Released catalog identity mismatch');
  const source = product.configurations as StorefrontConfiguration[];
  const found = new Set<string>();
  const configurations = source.map(row => {
    const id = row.configuration_id || row.configuration_price_id || '';
    const minor = item.regular.get(id);
    if (minor == null) return row;
    if (found.has(id) || (row.currency && row.currency !== 'EUR')) throw new Error('Released catalog configuration mismatch: ' + id);
    found.add(id);
    const label = item.release.offers[id].publicLabel;
    return {...row, ...(label ? {public_label:label} : {}),
      base_price_amount:minor / 100, display_price_amount:minor / 100, sale_price_amount:null,
      compare_at_price_amount:null, discount_percent:null, price_source_mode:'etsy_regular_usd',
      price_confidence_status:'verified_standard_sizes'};
  });
  if (found.size !== item.regular.size) throw new Error('Released catalog configuration is missing');
  const separate = item.separate;
  const savings = Math.max(0,separate - item.card);
  return {...product, configurations, price_contract_version:'etsy_regular_eur_'+priceRelease.version,
    min_price:item.minimum / 100, max_price:item.maximum / 100,
    full_set_display_price_amount:item.card / 100, component_sum_display_price_amount:separate / 100,
    full_set_savings_amount:savings / 100,
    full_set_savings_percent:separate ? Math.round(10000 * savings / separate) / 100 : null};
}
