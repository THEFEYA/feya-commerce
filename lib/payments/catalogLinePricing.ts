import type {StorefrontConfiguration, StorefrontProduct} from '@/lib/types';
import {colorOptions, getMedia, optionLabel, optionPrice, productTitle, sortedOptions} from '../storefront.ts';
import {CHECKOUT_PRICING_V1, CheckoutPricingError, type PricedLine} from './pricing.ts';
import {isSourceConfirmedPairedSet, PAIRED_SET_SIZES, type PairedSetSelection} from './pairedSetSelection.ts';
import {verifiedColorChoice} from './bonanzaColorAuthority.ts';
import {verifiedColorPriceRows} from '../bonanzaColorPriceExceptions.ts';

/** Exactly the size buttons offered on the published product page. */
export const PDP_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Custom'] as const;

export type CartLineInput = {
  id: string;
  slug: string;
  configuration_id: string;
  size: string;
  color: string;
  color_code?: string | null;
  quantity: number;
  wearer: 'men' | 'women' | null;
  made_to_measure: boolean;
  paired_selection?: PairedSetSelection | null;
  /** What the buyer's browser displayed. Only used to tell the buyer a price changed. */
  client_unit_minor: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The stable identifier the product page writes into the bag for an option. */
export function configurationIdentity(option: StorefrontConfiguration): string {
  const record = option as StorefrontConfiguration & Record<string, unknown>;
  const value = record.configuration_id || record.configuration_price_id || record.source_price_row_id;
  return typeof value === 'string' ? value : '';
}

/**
 * Re-prices one bag line against the published product read model — the same data
 * and the same helper functions the product page uses to display the price.
 */
export function priceCartLine(product: StorefrontProduct, line: CartLineInput): PricedLine & {price_changed: boolean} {
  const productId = String(product.canonical_product_id || '');
  if (!UUID.test(productId) || product.product_slug !== line.slug || !line.id.startsWith(productId + '-'))
    throw new CheckoutPricingError('checkout_product_mismatch');
  const options = sortedOptions(product);
  const index = options.findIndex(option => configurationIdentity(option) === line.configuration_id);
  if (index < 0) throw new CheckoutPricingError('checkout_option_unavailable');
  const option = options[index];
  const price = optionPrice(option);
  if (price == null || !Number.isFinite(price) || price <= 0) throw new CheckoutPricingError('checkout_option_unpriced');
  const currency = (option as Record<string, unknown>).currency || product.currency || 'EUR';
  if (currency !== CHECKOUT_PRICING_V1.currency) throw new CheckoutPricingError('checkout_currency_unsupported');
  const unit = Math.round(price * 100);
  if (!Number.isSafeInteger(unit) || unit < 1) throw new CheckoutPricingError('checkout_option_unpriced');

  if (!(PDP_SIZES as readonly string[]).includes(line.size)) throw new CheckoutPricingError('checkout_size_invalid');
  const colors = new Set<string>([
    ...(option.configuration_color ? [String(option.configuration_color)] : []),
    ...colorOptions(product).map(String),
  ]);
  if (!colors.size) colors.add('Mirror');
  const paired = isSourceConfirmedPairedSet(option);
  const reviewed = line.color_code ? verifiedColorChoice(productId, line.color_code) : null;
  if (paired) {
    if (!line.paired_selection) throw new CheckoutPricingError('checkout_paired_selection_required');
    if (line.wearer != null || line.size !== line.paired_selection.women.size)
      throw new CheckoutPricingError('checkout_paired_selection_invalid');
    const women = verifiedColorChoice(productId, line.paired_selection.women.color);
    const men = verifiedColorChoice(productId, line.paired_selection.men.color);
    if (!women || !men) throw new CheckoutPricingError('checkout_color_invalid');
    if (line.color !== women.label || (line.color_code && line.color_code !== women.code))
      throw new CheckoutPricingError('checkout_paired_selection_invalid');
    for (const fit of [line.paired_selection.women, line.paired_selection.men]) {
      if (!(PAIRED_SET_SIZES as readonly string[]).includes(fit.size)) throw new CheckoutPricingError('checkout_size_invalid');
    }
  } else {
    if (line.paired_selection) throw new CheckoutPricingError('checkout_paired_selection_invalid');
    if (line.color_code) {
      if (!reviewed || reviewed.label !== line.color) throw new CheckoutPricingError('checkout_color_invalid');
    } else if (!colors.has(line.color)) {
      throw new CheckoutPricingError('checkout_color_invalid');
    }
  }
  // The exact three color-priced products must NOT inherit the price of a
  // different approved Brown/Black/Green configuration. No White price is invented.
  const colorPriced = verifiedColorPriceRows(productId, options);
  if (colorPriced !== null) {
    if (!colorPriced.length || option.configuration_color !== line.color ||
        !colorPriced.some(row => configurationIdentity(row) === line.configuration_id))
      throw new CheckoutPricingError('checkout_option_unpriced');
  }

  const media = getMedia(product);
  const image = typeof product.primary_image_url === 'string' && product.primary_image_url.startsWith('https://')
    ? product.primary_image_url
    : (media[0]?.url && String(media[0].url).startsWith('https://') ? String(media[0].url) : null);

  return {
    line_id: line.id,
    canonical_product_id: productId,
    slug: line.slug,
    title: productTitle(product).slice(0, 200) || 'TheFEYA piece',
    option_label: optionLabel(option, index).slice(0, 180),
    configuration_id: line.configuration_id,
    color: line.color,
    ...(line.color_code ? {color_code: line.color_code} : {}),
    size: line.size,
    wearer: line.wearer,
    made_to_measure: line.made_to_measure,
    ...(paired ? {paired_selection: line.paired_selection} : {}),
    quantity: line.quantity,
    unit_minor: unit,
    line_minor: unit * line.quantity,
    image,
    price_changed: line.client_unit_minor != null && line.client_unit_minor !== unit,
  };
}
