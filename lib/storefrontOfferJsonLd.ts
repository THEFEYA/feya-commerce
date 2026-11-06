import type { StorefrontProduct } from './types.ts';
import { isFullSetOption, optionKey, optionPrice, sortedOptions } from './storefront.ts';
import { verifiedColorPriceRows } from './bonanzaColorPriceExceptions.ts';
import { colorChoiceLabel } from './bonanzaColorChoices.ts';

/**
 * Offer markup for a PDP, derived from the same option list and the same
 * initial-selection rule as `ProductDetailClient` (verified photographed color
 * for the three color-priced products, otherwise Full Set or the single option).
 * The price is therefore exactly the
 * price the server-rendered page shows and the checkout charges for that
 * configuration (`optionPrice`, EUR).
 *
 * - A page that preselects one configuration gets a single `Offer` (Google
 *   merchant listings require `Offer`, not `AggregateOffer`).
 * - A page that asks the buyer to choose first (no Full Set, several options,
 *   or no verified price for the photographed color) gets an `AggregateOffer` low/high range
 *   so no specific price is claimed for an unselected variant.
 * - Made-to-order pieces are orderable now and ship within the published
 *   3–5 business-day handling time, so availability is InStock (Google
 *   availability spec; matches the Merchant Center feed).
 */
export type PdpOfferJsonLd =
  | {
      '@type': 'Offer';
      url: string;
      price: string;
      priceCurrency: 'EUR';
      availability: 'https://schema.org/InStock';
      itemCondition: 'https://schema.org/NewCondition';
      sku?: string;
    }
  | {
      '@type': 'AggregateOffer';
      url: string;
      lowPrice: string;
      highPrice: string;
      offerCount: number;
      priceCurrency: 'EUR';
      availability: 'https://schema.org/InStock';
      itemCondition: 'https://schema.org/NewCondition';
    };

function money(amount: number) {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

function positive(amount: number | null | undefined): amount is number {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
}

export function pdpOfferJsonLd(product: StorefrontProduct, url: string): PdpOfferJsonLd | null {
  if (String(product.currency || 'EUR').toUpperCase() !== 'EUR') return null;
  const options = sortedOptions(product);
  const id = String(product.canonical_product_id || '');
  const pricedColors = verifiedColorPriceRows(id, options);
  // Mirror the existing initial selection in ProductDetailClient. A different
  // color's cheaper price must never replace the photographed color's quote.
  const photographedPriceRow = pricedColors?.find(option =>
    option.configuration_color?.toLowerCase() === colorChoiceLabel(product.default_color_choice || '').toLowerCase()
  ) || null;

  const full = options.find((option, index) => isFullSetOption(option, index));
  const preselected = pricedColors !== null ? photographedPriceRow : (full || (options.length === 1 ? options[0] : null));
  const preselectedPrice = optionPrice(preselected);
  if (preselected && positive(preselectedPrice)) {
    return {
      '@type': 'Offer',
      url,
      price: money(preselectedPrice),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      sku: optionKey(preselected, options.indexOf(preselected)),
    };
  }

  const prices = (pricedColors ?? options).map(option => optionPrice(option)).filter(positive);
  if (!prices.length) return null;
  return {
    '@type': 'AggregateOffer',
    url,
    lowPrice: money(Math.min(...prices)),
    highPrice: money(Math.max(...prices)),
    offerCount: prices.length,
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
  };
}
