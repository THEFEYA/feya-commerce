import priceRelease from '../config/etsyRegularPriceRelease.json' with {type:'json'};
import type {StorefrontConfiguration,StorefrontProduct} from './types.ts';
import {isSourceConfirmedPairedSet,PAIRED_SET_SIZES} from './payments/pairedSetSelection.ts';

type Evidence = {
  kind: string;
  policy?: string;
  observedSize?: string;
  sourceUrl?: string;
  optionAxis?: string;
  matchedOption?: string;
  sourceOptionRowId?: string;
};
type ReleasedOffer = {
  regularUsdMinor: number;
  etsyOptionValue: string | null;
  sizes?: string[];
  evidence?: Evidence;
  observedPricesBySize?: Record<string, {regularUsdMinor:number; sourceUrl:string}>;
  publicLabel?: string;
  publicLabelMode?: string;
};

type ProductRelease = {
  etsyListingId:string;
  etsySizeValues:Record<string,string>;
  etsyListedSizes?: string[];
  cardConfigurationId: string;
  ownerPricedPair?: {configurationId: string; regularUsdMinor: number; approvedOn: string};
  ownerWebsiteFullSet?: {regularEurMinor: number; approvedOn: string};
  separateConfigurationIds?: string[];
  baselineEurMinor: Record<string, number>;
  offers: Record<string, ReleasedOffer>;
};

const releases: Readonly<Record<string, ProductRelease>> = priceRelease.products;
const standardSizes:readonly string[] = PAIRED_SET_SIZES.filter(size=>size!=='Custom');
const defaultSize = 'M';
export const publishedPriceContractVersion = 'etsy_regular_eur_' + priceRelease.version;

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

type SourceListing = Pick<ProductRelease,'etsyListingId'|'etsySizeValues'|'etsyListedSizes'>;

function listedOnEtsy(product: SourceListing, size: string) {
  const etsySize = size === 'XXL' ? '2X' : size === 'XXXL' ? '3X' : size;
  return product.etsyListedSizes?.includes(etsySize) ?? false;
}

function checkObservedSelection(product: SourceListing, offer: ReleasedOffer, size: string | null, sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (url.origin !== 'https://www.etsy.com' || !url.pathname.startsWith('/listing/' + product.etsyListingId + '/')) {
    throw new Error('Wrong source listing for a reviewed price');
  }
  const optionIds = [url.searchParams.get('variation0'), url.searchParams.get('variation1')].filter(Boolean);
  if (new Set(optionIds).size !== optionIds.length) throw new Error('Duplicate source option in price evidence');
  if (offer.etsyOptionValue !== null && !optionIds.includes(offer.etsyOptionValue)) {
    throw new Error('Wrong Etsy option in price evidence');
  }
  if (size !== null && (!standardSizes.includes(size) || product.etsySizeValues[size] === offer.etsyOptionValue || !optionIds.includes(product.etsySizeValues[size]))) {
    throw new Error('Wrong Etsy size in price evidence');
  }
}

/** Source observations and the shop's own configuration-wide price policy are distinct. */
export function validateRegularPriceEvidence(offer: ReleasedOffer, product: SourceListing) {
  if (offer.sizes) {
    const observed = offer.sizes;
    const sizeValues = standardSizes.map(size => product.etsySizeValues[size]);
    const complete = observed.length === standardSizes.length && standardSizes.every(size => observed.includes(size));
    const sourceIds = sizeValues.every(value => typeof value === 'string' && /^\d+$/.test(value)) && new Set(sizeValues).size === sizeValues.length;
    if (!complete || !sourceIds || offer.evidence || offer.observedPricesBySize) throw new Error('Incomplete or ambiguous observed sizes');
    return 'verified_standard_sizes';
  }
  const evidence = offer.evidence;
  if (evidence?.kind === 'observed_size_prices') {
    const selected = offer.observedPricesBySize;
    if (!selected || selected[defaultSize]?.regularUsdMinor !== offer.regularUsdMinor) throw new Error('Missing observed reference size price');
    for (const [size, row] of Object.entries(selected)) {
      if (!listedOnEtsy(product, size)) throw new Error('Selected price size absent from the Etsy size menu');
      checkObservedSelection(product, offer, size, row.sourceUrl);
    }
    return 'verified_selected_sizes';
  }
  if (offer.observedPricesBySize) throw new Error('Conflicting size evidence');
  if (!evidence?.sourceUrl) throw new Error('Missing source for the configuration price');
  if (evidence.kind === 'price_option_without_size') {
    if (!offer.etsyOptionValue || !evidence.matchedOption || !evidence.optionAxis || Object.keys(product.etsySizeValues).length) {
      throw new Error('Missing or conflicting source for a size-free option');
    }
    checkObservedSelection(product, offer, null, evidence.sourceUrl);
    return 'verified_price_option';
  }
  if (evidence.kind !== 'configuration_base_policy' || evidence.policy !== 'owner-configuration-base-price-20260924-04' || evidence.observedSize !== defaultSize) {
    throw new Error('Missing approved configuration pricing policy');
  }
  if (!standardSizes.every(size => listedOnEtsy(product, size))) throw new Error('Website size missing from Etsy size menu');
  checkObservedSelection(product, offer, evidence.observedSize, evidence.sourceUrl);
  return 'owner_configuration_base';
}

function prepareProduct(release: ProductRelease) {
  const regular = new Map<string, number>();
  const current = new Map(Object.entries(release.baselineEurMinor));
  const sizePrices = new Map<string,Record<string,number>>();
  const confidence = new Map<string,string>();
  const sourceOptionIds = new Set<string | null>();
  for (const [id, offer] of Object.entries(release.offers)) {
    if (sourceOptionIds.has(offer.etsyOptionValue)) throw new Error('Repeated Etsy option on a product');
    sourceOptionIds.add(offer.etsyOptionValue);
    if (!current.has(id)) throw new Error('Unknown configuration: ' + id);
    confidence.set(id, validateRegularPriceEvidence(offer, release));
    const amount = usdToEurMinor(offer.regularUsdMinor, priceRelease.fx.usdPerEur);
    if (offer.observedPricesBySize) {
      // Website-only fits retain their previously approved EUR base, including Custom.
      const websiteBase = current.get(id)!;
      const amounts: Record<string, number> = {};
      for (const size of PAIRED_SET_SIZES) {
        const observed = offer.observedPricesBySize[size];
        amounts[size] = observed ? usdToEurMinor(observed.regularUsdMinor, priceRelease.fx.usdPerEur) : websiteBase;
      }
      sizePrices.set(id, amounts);
    }
    regular.set(id,amount);
    current.set(id,amount);
  }
  const pieces = release.separateConfigurationIds ?? [];
  const pair = release.ownerPricedPair;
  if (pair) {
    const id = pair.configurationId;
    if (id !== release.cardConfigurationId || !current.has(id) || regular.has(id)
      || pieces.length !== 2 || !pieces.every(piece => regular.has(piece))) {
      throw new Error('An owner-priced pair requires a separate full set and two priced outfits');
    }
    const amount = usdToEurMinor(pair.regularUsdMinor, priceRelease.fx.usdPerEur);
    regular.set(id, amount);
    current.set(id, amount);
    confidence.set(id, 'owner_reviewed');
  }
  if (release.ownerWebsiteFullSet) {
    const id = release.cardConfigurationId;
    if (!current.has(id) || regular.has(id) || pieces.length < 2) {
      throw new Error('An owner-priced website set requires one distinct set and its separate pieces');
    }
    const amount = release.ownerWebsiteFullSet.regularEurMinor;
    regular.set(id, amount);
    current.set(id, amount);
    confidence.set(id, 'owner_reviewed');
  }
  const card = current.get(release.cardConfigurationId);
  if (!card || !regular.size) throw new Error('Missing catalog display price');
  const sizeAmounts = Array.from(sizePrices.values()).flatMap(prices => standardSizes.map(size => prices[size]));
  const values = [...current.values(), ...sizeAmounts];
  if (values.some(amount => !Number.isSafeInteger(amount) || amount < 1)) throw new Error('Invalid catalog price');
  // Only compare a set when this catalog entry has one documented composition.
  // The frozen PDP presents one comparison for every set; omit it on multi-set products.
  if (new Set(pieces).size !== pieces.length || pieces.some(id => id === release.cardConfigurationId || !current.has(id))) {
    throw new Error('Invalid separate-purchase composition');
  }
  const separate = sizePrices.size ? 0 : pieces.reduce((sum,id) => sum + current.get(id)!,0);
  return {release, regular, sizePrices, confidence, minimum: Math.min(...values), maximum: Math.max(...values), card, separate};
}

const published = new Map(Object.entries(releases).map(([id,release]) => [id,prepareProduct(release)]));

/** Exact released EUR cents, shared with Merchant and server-side price validation. */
export function publishedRegularEurMinor(productId: string, configurationId: string, size?: string): number | null {
  const product = published.get(productId);
  const schedule = product?.sizePrices.get(configurationId);
  if (schedule && size) {
    if (!Object.hasOwn(schedule, size)) throw new Error('Unrecognized size in price lookup');
    return schedule[size];
  }
  return product?.regular.get(configurationId) ?? null;
}

export function publishedPriceNeedsSize(productId: string, configurationId: string) {
  return published.get(productId)?.sizePrices.has(configurationId) ?? false;
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
    const offer = item.release.offers[id];
    const ownerPair = item.release.ownerPricedPair?.configurationId === id;
    if (ownerPair && !isSourceConfirmedPairedSet(row)) throw new Error('Owner bundle requires both outfits');
    let regularPriceSource = ownerPair ? 'owner_authorized_bundle' : 'etsy_regular_usd';
    if (item.release.ownerWebsiteFullSet && item.release.cardConfigurationId === id) {
      if (row.is_full_set !== true) throw new Error('Owner website set price requires a Full Set configuration');
      regularPriceSource = 'owner_authorized_full_set_eur';
    }
    const label = offer?.publicLabel;
    const sizes = item.sizePrices.get(id);
    const source = offer?.evidence;
    if (label && source) {
      const selectedLabel = offer.publicLabelMode === 'omit_quantity_suffix'
        ? source.matchedOption?.replace(/ \*\d+$/, '') : source.matchedOption;
      if (!source.sourceOptionRowId || label !== selectedLabel) {
        throw new Error('Published label requires the selected source option and its original price row');
      }
    }
    if (source?.optionAxis === 'Primary color' && row.configuration_color !== source.matchedOption) {
      throw new Error('Etsy color does not match the released configuration');
    }
    if (source?.optionAxis === 'Material' && row.configuration_material !== source.matchedOption) {
      throw new Error('Etsy material does not match the released configuration');
    }
    if (sizes && isSourceConfirmedPairedSet(row)) throw new Error('A paired set requires independent size pricing evidence');
    const bySize = sizes && offer.observedPricesBySize ? {
      published_size_eur_minor: sizes,
      published_etsy_observed_sizes: Object.keys(offer.observedPricesBySize),
    } : {};
    return {...row, ...(label ? {public_label:label} : {}), ...bySize,
      base_price_amount:minor / 100, display_price_amount:minor / 100, sale_price_amount:null,
      compare_at_price_amount:null, discount_percent:null,
      price_source_mode:sizes ? 'etsy_regular_selected_sizes_and_website_base' : regularPriceSource,
      price_confidence_status:item.confidence.get(id)};
  });
  if (found.size !== item.regular.size) throw new Error('Released catalog configuration is missing');
  const separate = item.separate;
  const savings = Math.max(0,separate - item.card);
  return {...product, configurations, ...(item.sizePrices.size?{published_reference_size:defaultSize}:{}), price_contract_version:publishedPriceContractVersion,
    min_price:item.minimum / 100, max_price:item.maximum / 100,
    full_set_display_price_amount:item.card / 100, component_sum_display_price_amount:separate / 100,
    full_set_savings_amount:savings / 100,
    full_set_savings_percent:separate ? Math.round(10000 * savings / separate) / 100 : null};
}
