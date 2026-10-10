import type {StorefrontProduct} from './types';

/** Opt-in flag is created ONLY by the authenticated five-product owner Preview.
 * Never persisted in Product Truth, copied into a purchase/quote, or sourced
 * from URL params; public PDPs keep their byte-for-byte frozen renderer and
 * current grouped purchase-unit presentation until a governed Phase13 release.
 */
export const OWNER_APPROVED_LEFT_COMPONENT_REVIEW_FLAG =
  '__feya_owner_approved_pdp_components_preview_v1' as const;

export function withOwnerApprovedComponentReview(
  product:StorefrontProduct,
):StorefrontProduct{
  const presentation={...product} as StorefrontProduct & Record<string,unknown>;
  presentation[OWNER_APPROVED_LEFT_COMPONENT_REVIEW_FLAG]=true;
  return presentation;
}
