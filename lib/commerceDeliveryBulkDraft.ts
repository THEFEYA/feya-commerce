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


export type ProductionAssignmentStatus =
  | { kind: 'unassigned'; profile_id: null }
  | { kind: 'assigned'; profile_id: string }
  | { kind: 'mixed'; profile_id: null };

/** Explicit owner assignments only, not the global inherited default.
 * A conflict at configuration level is flagged instead of silently hidden. */
export function getProductionAssignmentStatus(
  draft: DeliveryWorkspaceDraft,
  product: DeliveryCatalogProduct,
): ProductionAssignmentStatus {
  const assignments = draft.assignments.filter(a => a.canonical_product_id === product.canonical_product_id);
  const whole = assignments.find(a => a.configuration_price_id === null)?.production_profile_id ?? null;
  const exact = new Map(assignments.filter(a => a.configuration_price_id !== null)
    .map(a => [a.configuration_price_id, a.production_profile_id] as const));
  const resolved = product.configurations.length
    ? product.configurations.map(c => exact.get(c.configuration_price_id) ?? whole)
    : [whole];
  const distinct = [...new Set(resolved.filter((p): p is string => Boolean(p)))];
  if (!distinct.length) return { kind: 'unassigned', profile_id: null };
  if (distinct.length === 1 && resolved.every(id => id === distinct[0])) {
    return { kind: 'assigned', profile_id: distinct[0] };
  }
  return { kind: 'mixed', profile_id: null };
}

/** Owner explicitly selects ONE manufacturing duration for a whole product.
 * Replaces earlier variant-level production overrides on those selected products,
 * but never touches variant-level shipping/parcel exceptions or Product Truth.
 * Normalized one-product-one-profile assignments cannot silently accumulate. */
export function applyUniformProductionProfile(
  draft: DeliveryWorkspaceDraft,
  catalog: DeliveryCatalogProduct[],
  requestedIds: string[],
  profileId: string,
): DeliveryWorkspaceDraft {
  if (!draft.production_profiles.some(p => p.id === profileId)) return draft;
  const allowed = new Set(catalog.map(p => p.canonical_product_id));
  const selected = new Set(requestedIds.filter(id => allowed.has(id)));
  if (!selected.size) return draft;
  const retained = draft.assignments.flatMap(a => {
    if (!selected.has(a.canonical_product_id)) return [a];
    if (a.configuration_price_id === null) return [{ ...a, production_profile_id: profileId }];
    // Explicit bulk production replacement supersedes variant-specific production,
    // while retaining a variant's unique shipping/oversize override.
    return a.shipping_profile_id ? [{ ...a, production_profile_id: null }] : [];
  });
  const wholeAssigned = new Set(retained.filter(a => a.configuration_price_id === null)
    .map(a => a.canonical_product_id));
  for (const productId of selected) {
    if (!wholeAssigned.has(productId)) {
      retained.push({ canonical_product_id: productId, configuration_price_id: null,
        production_profile_id: profileId, shipping_profile_id: null });
    }
  }
  if (JSON.stringify(retained) === JSON.stringify(draft.assignments)) return draft;
  return { ...draft, assignments: retained };
}
