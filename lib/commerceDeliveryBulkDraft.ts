import type { DeliveryCatalogProduct, DeliveryWorkspaceDraft } from './commerceDeliveryWorkspace.ts';

/** Draft-only patch. A product-wide profile affects only its selected axis, never
 * existing exact-configuration overrides, merchandise prices or Product Truth. */
export function applyDeliveryBulkProfile(
  draft: DeliveryWorkspaceDraft,
  catalog: DeliveryCatalogProduct[],
  requestedIds: string[],
  kind: 'shipping' | 'production',
  profileId: string,
): DeliveryWorkspaceDraft {
  const eligible = new Set(catalog.map(p => p.canonical_product_id));
  const targets = new Set(requestedIds.filter(id => eligible.has(id)));
  const profiles = kind === 'shipping' ? draft.shipping_profiles : draft.production_profiles;
  if (!targets.size || !profiles.some(p => p.id === profileId)) return draft;

  const unaffected = draft.assignments.filter(a =>
    a.configuration_price_id !== null || !targets.has(a.canonical_product_id));
  const patched = [...targets].map(id => {
    const prior = draft.assignments.find(a => a.canonical_product_id === id && a.configuration_price_id === null);
    return {
      canonical_product_id: id, configuration_price_id: null,
      shipping_profile_id: kind === 'shipping' ? profileId : prior?.shipping_profile_id || null,
      production_profile_id: kind === 'production' ? profileId : prior?.production_profile_id || null,
    };
  });
  return { ...draft, assignments: [...unaffected, ...patched] };
}
