import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveExactVariant, validateVariantSnapshot, validateVariantTransition,
  type VariantSnapshot } from '../../lib/commerceVariantContract.ts';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Synthetic contract data; these are not FEYA prices, color IDs or verified live variants.
const make = (): VariantSnapshot => ({ canonical_product_id: id(1), product_revision: 1,
  configurations: [{ configuration_price_id: id(2), sellable_configuration_id: id(3) }],
  colors: [{ id: id(4), label: 'Gold', state: 'confirmed' }, { id: id(5), label: 'Silver', state: 'proposed' }],
  sizes: [{ id: id(6), label: 'M', state: 'confirmed' }],
  variants: [{ variant_id: id(7), configuration_price_id: id(2), color_id: id(4), size_id: id(6), state: 'active',
    price: { status: 'verified_exact', amount_minor: 12345, currency: 'EUR', evidence_ref: 'synthetic-test-only', verified_product_revision: 1 } }],
});
const selection = () => ({ configuration_price_id: id(2), color_id: id(4), size_id: id(6) });

test('exact tuple returns stable IDs and minor-unit price without mutating evidence', () => {
  const s = make(), before = JSON.stringify(s), quote = resolveExactVariant(s, selection(), 1);
  assert.equal(quote.variant_id, id(7)); assert.equal(quote.amount_minor, 12345);
  assert.equal(quote.configuration_price_id, id(2)); assert.equal(JSON.stringify(s), before);
});
test('missing color, size and parent-configuration selections never borrow another tuple price', () => {
  for (const selectionAttempt of [{ ...selection(), color_id: id(5) }, { ...selection(), size_id: null },
    { ...selection(), color_id: null }, { ...selection(), configuration_price_id: id(3) }])
    assert.throws(() => resolveExactVariant(make(), selectionAttempt, 1), /not_orderable/);
});
test('range prices and unverified prices cannot activate a variant', () => {
  for (const status of ['range', 'unverified'] as const) {
    const s = make(); s.variants[0].price.status = status;
    assert.throws(() => validateVariantSnapshot(s), /without_exact_price/);
    s.variants[0].state = 'draft'; validateVariantSnapshot(s);
    assert.throws(() => resolveExactVariant(s, selection(), 1), /not_orderable/);
  }
});
test('exact prices require evidence, a matching revision and valid positive minor units', () => {
  for (const patch of [{ evidence_ref: null }, { amount_minor: null }, { amount_minor: 0 },
    { amount_minor: 12.345 }, { amount_minor: NaN }, { verified_product_revision: 2 }]) {
    const s = make(); Object.assign(s.variants[0].price, patch);
    assert.throws(() => validateVariantSnapshot(s), /exact_price_evidence_invalid/);
  }
  assert.throws(() => resolveExactVariant(make(), selection(), 2), /revision_conflict/);
});
test('new colors are not auto-expanded and an unconfirmed color cannot be activated', () => {
  const s = make(); validateVariantSnapshot(s); assert.equal(s.variants.length, 1);
  s.variants[0].color_id = id(5);
  assert.throws(() => validateVariantSnapshot(s), /attribute_unconfirmed/);
  s.colors[1].state = 'confirmed'; validateVariantSnapshot(s);
});
test('duplicate tuples, reused IDs and foreign configuration references are rejected', () => {
  const s = make(); s.variants.push({ ...structuredClone(s.variants[0]), variant_id: id(8) });
  assert.throws(() => validateVariantSnapshot(s), /tuple_identity_invalid/);
  s.variants.pop(); s.variants[0].configuration_price_id = id(99);
  assert.throws(() => validateVariantSnapshot(s), /tuple_identity_invalid/);
});
test('renaming a color preserves IDs; deleting a historical variant or repurposing it is rejected', () => {
  const previous = make(), next = make(); next.product_revision = 2;
  next.variants[0].price.verified_product_revision = 2; next.colors[0].label = 'Glossy Gold';
  validateVariantTransition(previous, next);
  assert.equal(resolveExactVariant(next, selection(), 2).variant_id, id(7));
  const deleted = structuredClone(next); deleted.variants = [];
  assert.throws(() => validateVariantTransition(previous, deleted), /reassigned_or_deleted/);
  const moved = structuredClone(next); moved.variants[0].size_id = null;
  assert.throws(() => validateVariantTransition(previous, moved), /reassigned_or_deleted/);
});
test('retirement preserves identity and stops orderability while keeping historical attributes', () => {
  const previous = make(), next = make(); next.product_revision = 2;
  next.variants[0].state = 'retired'; next.variants[0].price.status = 'unverified'; next.colors[0].state = 'retired';
  validateVariantTransition(previous, next);
  assert.throws(() => resolveExactVariant(next, selection(), 2), /not_orderable/);
  next.colors.pop(); assert.throws(() => validateVariantTransition(previous, next), /attribute_deleted/);
});
test('owner material/color answer supplies no exact variant prices for the actual product', () => {
  const decisions = JSON.parse(readFileSync('docs/search/owner-product-decisions-20260924.json', 'utf8'));
  const d = decisions.decisions.find((d: any) => d.decision_id === 'owner-glossy-vegan-armor-20260924-03');
  assert.equal(d.current_material, 'vegan leather'); assert.equal(d.selection_dimensions_separate, true);
  assert.deepEqual(d.owner_named_colors, ['Gold', 'Silver']);
  const s = make(); s.canonical_product_id = d.product_ids[0]; s.variants = [];
  assert.throws(() => resolveExactVariant(s, selection(), 1), /not_orderable/);
});
