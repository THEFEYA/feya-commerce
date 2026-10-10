import type {StorefrontProduct} from './types.ts';
import {storefrontIncludedOptions} from './storefrontIncludedOptions.ts';
import {
  resolveStorefrontSellableOffer,
  sellableOfferIncludedLabels,
} from './storefrontSellableOffer.ts';

/**
 * Describes the physical pieces inside the SELECTED configuration, not the
 * grouped units by which customers can purchase those pieces.
 *
 * Exact seller-v4 offer component members are the only authority here. For
 * example the right selector can retain "Top + Skirt" as one payable bundle
 * while the left approved Description lists "Top" and "Skirt" separately.
 *
 * This helper does not edit source SEO drafts, option labels, configuration
 * IDs, quantities, merchandise prices, data schema, or Search v12 release pins.
 * Unknown/held facts retain the existing fail-closed public behavior.
 */
export function storefrontDescriptionComponentLabels(
  product:StorefrontProduct,
  activeConfiguration?:Record<string,unknown>|null,
):string[]{
  const offer=resolveStorefrontSellableOffer(product);
  if(offer.status==='ready'&&offer.source_available){
    const exact=sellableOfferIncludedLabels(offer,activeConfiguration);
    if(exact.length>0)return exact;
  }
  return storefrontIncludedOptions(product,activeConfiguration);
}
