/** Pure contract for the next Product OS writer/quote service. No DB or checkout side effects. */
export type VariantAttribute = { id: string; label: string; state: 'confirmed' | 'proposed' | 'retired' };
export type VariantSelection = { configuration_price_id: string; color_id: string | null; size_id: string | null };
export type CommerceVariant = VariantSelection & {
  variant_id: string; state: 'draft' | 'active' | 'retired';
  price: { status: 'unverified' | 'range' | 'verified_exact'; amount_minor: number | null;
    currency: string; evidence_ref: string | null; verified_product_revision: number | null };
};
export type VariantSnapshot = {
  canonical_product_id: string; product_revision: number;
  configurations: { configuration_price_id: string; sellable_configuration_id: string }[];
  colors: VariantAttribute[]; sizes: VariantAttribute[]; variants: CommerceVariant[];
};
const uuid = (s: string) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const tuple = (s: VariantSelection) => JSON.stringify([s.configuration_price_id, s.color_id, s.size_id]);

export function validateVariantSnapshot(s: VariantSnapshot): void {
  if (!uuid(s.canonical_product_id) || !Number.isSafeInteger(s.product_revision) || s.product_revision < 1)
    throw new Error('variant_product_identity_invalid');
  const configs = new Set(s.configurations.map(c => c.configuration_price_id));
  if (configs.size !== s.configurations.length || s.configurations.some(c => !uuid(c.configuration_price_id) || !uuid(c.sellable_configuration_id)))
    throw new Error('variant_configuration_identity_invalid');
  for (const attrs of [s.colors, s.sizes]) {
    if (new Set(attrs.map(a => a.id)).size !== attrs.length
      || attrs.some(a => !uuid(a.id) || !a.label.trim() || !['confirmed', 'proposed', 'retired'].includes(a.state)))
      throw new Error('variant_attribute_identity_invalid');
  }
  const ids = new Set<string>(), tuples = new Set<string>();
  for (const v of s.variants) {
    const key = tuple(v);
    if (!uuid(v.variant_id) || ids.has(v.variant_id) || tuples.has(key) || !configs.has(v.configuration_price_id)
      || !['draft', 'active', 'retired'].includes(v.state)) throw new Error('variant_tuple_identity_invalid');
    ids.add(v.variant_id); tuples.add(key);
    for (const [id, attrs] of [[v.color_id, s.colors], [v.size_id, s.sizes]] as const) {
      // null means explicitly not applicable to this tuple, never "any color/size".
      if (id === null) continue;
      const attr = attrs.find(a => a.id === id);
      if (!attr || (v.state === 'active' && attr.state !== 'confirmed')) throw new Error('variant_attribute_unconfirmed');
    }
    const p = v.price;
    if (!['unverified', 'range', 'verified_exact'].includes(p.status) || !/^[A-Z]{3}$/.test(p.currency))
      throw new Error('variant_price_invalid');
    if (p.status === 'verified_exact' && (!Number.isSafeInteger(p.amount_minor) || p.amount_minor! <= 0
      || !p.evidence_ref?.trim() || p.verified_product_revision !== s.product_revision))
      throw new Error('variant_exact_price_evidence_invalid');
    if (v.state === 'active' && p.status !== 'verified_exact') throw new Error('variant_active_without_exact_price');
  }
}

export function resolveExactVariant(s: VariantSnapshot, selection: VariantSelection, expectedRevision: number) {
  validateVariantSnapshot(s);
  if (s.product_revision !== expectedRevision) throw new Error('variant_revision_conflict');
  const v = s.variants.find(v => tuple(v) === tuple(selection));
  if (!v || v.state !== 'active' || v.price.status !== 'verified_exact') throw new Error('variant_not_orderable');
  return { canonical_product_id: s.canonical_product_id, product_revision: s.product_revision,
    variant_id: v.variant_id, configuration_price_id: v.configuration_price_id,
    color_id: v.color_id, size_id: v.size_id, amount_minor: v.price.amount_minor!, currency: v.price.currency };
}

/** Existing variant identity cannot be recycled for a different selection, including after retirement. */
export function validateVariantTransition(previous: VariantSnapshot, next: VariantSnapshot) {
  validateVariantSnapshot(previous); validateVariantSnapshot(next);
  if (previous.canonical_product_id !== next.canonical_product_id || next.product_revision !== previous.product_revision + 1)
    throw new Error('variant_revision_conflict');
  for (const old of previous.variants) {
    const current = next.variants.find(v => v.variant_id === old.variant_id);
    if (!current || tuple(old) !== tuple(current)) throw new Error('variant_identity_reassigned_or_deleted');
  }
  for (const old of previous.configurations) {
    const current = next.configurations.find(c => c.configuration_price_id === old.configuration_price_id);
    if (!current || current.sellable_configuration_id !== old.sellable_configuration_id)
      throw new Error('variant_configuration_reassigned_or_deleted');
  }
  for (const key of ['colors', 'sizes'] as const) {
    if (previous[key].some(old => !next[key].some(a => a.id === old.id)))
      throw new Error('variant_attribute_deleted_instead_of_retired');
  }
}
