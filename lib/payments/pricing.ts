import type {PairedSetSelection} from './pairedSetSelection.ts';

/**
 * TheFEYA checkout pricing authority (server-side). Integer euro cents only.
 *
 * Sources of each number (owner decisions recorded in the repository):
 *  - Standard €19 / Express €35 per order:            docs/payments/M2_OWNER_CONFIRMED_EUR_SHIPPING_20261008.md,
 *                                                       public /shipping (Shipping V13)
 *  - €5 per additional DISTINCT listing:               docs/payments/M2_CARRIER_EUR_HANDLING_POLICY_20261009.md
 *  - +€20 remote zone AU / MX / NZ (one per order):     M2_OWNER_CONFIRMED_EUR_SHIPPING_20261008.md ("first remote zone")
 *  - Extras €15 per made-to-measure piece, gift card €10, gift box €25:
 *                                                       the published V13 bag (components/CartOwnerLiveReviewClient.tsx)
 *
 * Browser-supplied prices are NEVER used here: unit prices come from the published
 * product read model on the server (see catalogAuthority.ts).
 */
export const CHECKOUT_PRICING_V1 = {
  contract: 'feya_checkout_pricing_v1',
  currency: 'EUR',
  shippingMinor: {standard: 1900, express: 3500},
  extraListingHandlingMinor: 500,
  remoteSurchargeMinor: 2000,
  remoteCountries: ['AU', 'MX', 'NZ'] as readonly string[],
  extrasMinor: {made_to_measure: 1500, gift_card: 1000, gift_box: 2500},
  maxLines: 40,
  maxQuantityPerLine: 100,
  maxTotalQuantity: 400,
  maxTotalMinor: 5_000_000,
  minTotalMinor: 100,
} as const;

export type DeliveryMethod = 'standard' | 'express';

export type PricedLine = {
  line_id: string;
  canonical_product_id: string;
  slug: string;
  title: string;
  option_label: string;
  configuration_id: string;
  color: string;
  color_code?: string | null;
  size: string;
  wearer: 'men' | 'women' | null;
  made_to_measure: boolean;
  paired_selection?: PairedSetSelection | null;
  quantity: number;
  unit_minor: number;
  line_minor: number;
  image: string | null;
};

export type ExtraLine = {
  code: 'made_to_measure' | 'gift_card' | 'gift_box';
  label: string;
  quantity: number;
  unit_minor: number;
  amount_minor: number;
};

export type CheckoutAmounts = {
  currency: 'EUR';
  merchandise_minor: number;
  extras_minor: number;
  shipping_minor: number;
  remote_minor: number;
  handling_minor: number;
  tax_minor: 0;
  total_minor: number;
  distinct_listing_count: number;
  item_quantity: number;
};

export class CheckoutPricingError extends Error {
  constructor(code: string) { super(code); this.name = 'CheckoutPricingError'; }
}

function assertMinor(value: number, code: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new CheckoutPricingError(code);
}

export function isRemoteDestination(country: string) {
  return CHECKOUT_PRICING_V1.remoteCountries.includes(country);
}

export function buildExtraLines(lines: readonly PricedLine[], options: {giftCard: boolean; giftBox: boolean}): ExtraLine[] {
  const extras: ExtraLine[] = [];
  // Custom-size outfits must be paid for, and a couple may contain TWO
  // separately customized outfits in one single priced merchandise bundle.
  let mtm = 0;
  for (const line of lines) {
    const pair = line.paired_selection;
    const required = pair
      ? Number(pair.women.size === 'Custom') + Number(pair.men.size === 'Custom')
      : Number(line.size === 'Custom');
    if (required > 0 && !line.made_to_measure)
      throw new CheckoutPricingError('checkout_custom_measurements_required');
    if (!line.made_to_measure) continue;
    const outfitted = pair ? (required || 2) : 1;
    mtm += outfitted * line.quantity;
  }
  const p = CHECKOUT_PRICING_V1.extrasMinor;
  if (mtm > 0) extras.push({code: 'made_to_measure', label: 'Made to your measurements', quantity: mtm,
    unit_minor: p.made_to_measure, amount_minor: p.made_to_measure * mtm});
  if (options.giftCard) extras.push({code: 'gift_card', label: 'Gift message card', quantity: 1,
    unit_minor: p.gift_card, amount_minor: p.gift_card});
  if (options.giftBox) extras.push({code: 'gift_box', label: 'Gift box', quantity: 1,
    unit_minor: p.gift_box, amount_minor: p.gift_box});
  return extras;
}

export function computeCheckoutAmounts(input: {
  lines: readonly PricedLine[];
  extras: readonly ExtraLine[];
  method: DeliveryMethod;
  country: string;
}): CheckoutAmounts {
  const {lines, extras, method, country} = input;
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > CHECKOUT_PRICING_V1.maxLines)
    throw new CheckoutPricingError('checkout_lines_invalid');
  if (method !== 'standard' && method !== 'express') throw new CheckoutPricingError('checkout_method_invalid');
  let merchandise = 0, quantity = 0;
  const listings = new Set<string>();
  for (const line of lines) {
    assertMinor(line.unit_minor, 'checkout_line_price_invalid');
    if (line.unit_minor < 1) throw new CheckoutPricingError('checkout_line_price_invalid');
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > CHECKOUT_PRICING_V1.maxQuantityPerLine)
      throw new CheckoutPricingError('checkout_line_quantity_invalid');
    if (line.line_minor !== line.unit_minor * line.quantity) throw new CheckoutPricingError('checkout_line_arithmetic_invalid');
    merchandise += line.line_minor;
    quantity += line.quantity;
    listings.add(line.canonical_product_id);
  }
  if (quantity > CHECKOUT_PRICING_V1.maxTotalQuantity) throw new CheckoutPricingError('checkout_quantity_too_large');
  let extrasMinor = 0;
  for (const extra of extras) {
    assertMinor(extra.amount_minor, 'checkout_extra_invalid');
    if (extra.amount_minor !== extra.unit_minor * extra.quantity) throw new CheckoutPricingError('checkout_extra_invalid');
    extrasMinor += extra.amount_minor;
  }
  const shipping = CHECKOUT_PRICING_V1.shippingMinor[method];
  const remote = isRemoteDestination(country) ? CHECKOUT_PRICING_V1.remoteSurchargeMinor : 0;
  // €5 for each additional DISTINCT listing — not per size/color/variant/unit.
  const handling = Math.max(0, listings.size - 1) * CHECKOUT_PRICING_V1.extraListingHandlingMinor;
  const total = merchandise + extrasMinor + shipping + remote + handling;
  if (!Number.isSafeInteger(total) || total < CHECKOUT_PRICING_V1.minTotalMinor || total > CHECKOUT_PRICING_V1.maxTotalMinor)
    throw new CheckoutPricingError('checkout_total_out_of_range');
  return {
    currency: 'EUR', merchandise_minor: merchandise, extras_minor: extrasMinor,
    // No extra tax is charged to the customer by this checkout. Seller-Online LLC
    // is the legal seller and accounts for any applicable sales tax separately.
    shipping_minor: shipping, remote_minor: remote, handling_minor: handling, tax_minor: 0,
    total_minor: total, distinct_listing_count: listings.size, item_quantity: quantity,
  };
}

/** "12.34" — PayPal decimal string for EUR. */
export function minorToDecimal(minor: number) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new CheckoutPricingError('money_invalid');
  const euros = Math.floor(minor / 100), cents = minor % 100;
  return `${euros}.${cents.toString().padStart(2, '0')}`;
}

/** Parses "12.34" / "12.3" / "12" strictly into cents. Returns null when invalid. */
export function decimalToMinor(value: unknown): number | null {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value)) return null;
  const [whole, frac = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}
