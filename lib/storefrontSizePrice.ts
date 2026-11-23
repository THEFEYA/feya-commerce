import type {StorefrontConfiguration} from './types.ts';
import {optionPrice} from './storefront.ts';

/** Size-specific amounts exist only when the release contains selected-size observations. */
export function selectedOptionPrice(option: StorefrontConfiguration | null | undefined, size: string | null | undefined) {
  const prices = option?.published_size_eur_minor;
  if (!prices || !size) return optionPrice(option);
  const cents = prices[size];
  return Number.isSafeInteger(cents) && cents > 0 ? cents / 100 : null;
}

export function selectedPriceConfidence(option: StorefrontConfiguration | null | undefined, size: string | null | undefined) {
  if (!option?.published_etsy_observed_sizes || !size) return option?.price_confidence_status;
  return option.published_etsy_observed_sizes.includes(size) ? 'verified_selected_size' : 'website_only_size_price';
}
