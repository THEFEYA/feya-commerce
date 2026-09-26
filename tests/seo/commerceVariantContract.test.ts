import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveExactVariant, validateVariantSnapshot, validateVariantTransition,
  type VariantSnapshot } from '../../lib/commerceVariantContract.ts';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Synthetic contract data; these are not FEYA prices, color IDs or verified live variants.
const make = (): VariantSnapshot => ({ canonical_product_id: id(1), product_revision: 1,
  pricing_policy_ref: 'synthetic-color-material-neutral-policy',
  configurations: [{ configuration_price_id: id(2), sellable_configuration_id: id(3),
    base_price: { quote_id: id(9), price_revision: 1, status: 'verified_exact', amount_minor: 12345,
      currency: 'EUR', evidence_ref: 'synthetic-test-only' } }],
  colors: [{ id: id(4), label: 'Gold', state: 'confirmed' }, { id: id(5), label: 'Silver', state: 'proposed' }],
  sizes: [{ id: id(6), label: 'M', state: 'confirmed' }],
  variants: [{ variant_id: id(7), configuration_price_id: id(2), color_id: id(4), size_id: id(6), state: 'active',
    pricing: { mode: 'configuration_base' } }],
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
    const s = make(); s.configurations[0].base_price.status = status;
    assert.throws(() => validateVariantSnapshot(s), /without_exact_price/);
    s.variants[0].state = 'draft'; validateVariantSnapshot(s);
    assert.throws(() => resolveExactVariant(s, selection(), 1), /not_orderable/);
  }
});
test('exact prices require evidence and valid positive minor units; selection requires the current product revision', () => {
  for (const patch of [{ evidence_ref: null }, { amount_minor: null }, { amount_minor: 0 },
    { amount_minor: 12.345 }, { amount_minor: NaN }]) {
    const s = make(); Object.assign(s.configurations[0].base_price, patch);
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
  next.colors[0].label = 'Glossy Gold';
  validateVariantTransition(previous, next);
  assert.equal(resolveExactVariant(next, selection(), 2).variant_id, id(7));
  const deleted = structuredClone(next); deleted.variants = [];
  assert.throws(() => validateVariantTransition(previous, deleted), /reassigned_or_deleted/);
  const moved = structuredClone(next); moved.variants[0].size_id = null;
  assert.throws(() => validateVariantTransition(previous, moved), /reassigned_or_deleted/);
});
test('retirement preserves identity and stops orderability while keeping historical attributes', () => {
  const previous = make(), next = make(); next.product_revision = 2;
  next.variants[0].state = 'retired'; next.colors[0].state = 'retired';
  validateVariantTransition(previous, next);
  assert.throws(() => resolveExactVariant(next, selection(), 2), /not_orderable/);
  next.colors.pop(); assert.throws(() => validateVariantTransition(previous, next), /attribute_deleted/);
});

test('two available colors inherit one configuration quote without duplicated prices or new price review', () => {
  const before = make(), next = make(); next.product_revision = 2; next.colors[1].state = 'confirmed';
  next.variants.push({ ...structuredClone(next.variants[0]), variant_id: id(8), color_id: id(5) });
  validateVariantTransition(before, next);
  const gold = resolveExactVariant(next, selection(), 2);
  const silver = resolveExactVariant(next, { ...selection(), color_id: id(5) }, 2);
  assert.notEqual(gold.variant_id, silver.variant_id);
  assert.equal(gold.quote_id, silver.quote_id); assert.equal(gold.amount_minor, silver.amount_minor);
  assert.equal(gold.price_revision, 1); assert.equal(silver.price_source, 'configuration_base');
  assert.deepEqual(next.configurations[0].base_price, before.configurations[0].base_price);
});

test('an explicit price exception changes only its selected variant and preserves the base quote', () => {
  const s = make(); s.colors[1].state = 'confirmed';
  s.variants.push({ ...structuredClone(s.variants[0]), variant_id: id(8), color_id: id(5),
    pricing: { mode: 'exception_override', exception_id: id(10), reason: 'Synthetic explicitly approved exception',
      price: { ...s.configurations[0].base_price, quote_id: id(11), amount_minor: 15000 } } });
  assert.equal(resolveExactVariant(s, selection(), 1).amount_minor, 12345);
  const special = resolveExactVariant(s, { ...selection(), color_id: id(5) }, 1);
  assert.equal(special.amount_minor, 15000); assert.equal(special.price_source, 'exception_override');
});

test('an incomplete exception never falls back to the normal configuration price', () => {
  const s = make(); s.variants[0].pricing = { mode: 'exception_override', exception_id: id(10), reason: 'Pending exception',
    price: { ...s.configurations[0].base_price, quote_id: id(11), status: 'unverified' } };
  assert.throws(() => resolveExactVariant(s, selection(), 1), /without_exact_price/);
  s.variants[0].state = 'draft';
  assert.throws(() => resolveExactVariant(s, selection(), 1), /not_orderable/);
  s.variants[0].pricing.reason = '';
  assert.throws(() => validateVariantSnapshot(s), /exception_evidence_invalid/);
});

test('changing configuration selects its own base price rather than the color price', () => {
  const s = make(); s.configurations.push({ configuration_price_id: id(12), sellable_configuration_id: id(3),
    base_price: { ...s.configurations[0].base_price, quote_id: id(13), amount_minor: 21000 } });
  s.variants.push({ ...structuredClone(s.variants[0]), variant_id: id(14), configuration_price_id: id(12) });
  assert.equal(resolveExactVariant(s, selection(), 1).amount_minor, 12345);
  assert.equal(resolveExactVariant(s, { ...selection(), configuration_price_id: id(12) }, 1).amount_minor, 21000);
});

test('a price update creates a new quote revision without rewriting historical quote identity', () => {
  const before = make(), next = make(); next.product_revision = 2;
  next.configurations[0].base_price.amount_minor = 16000;
  assert.throws(() => validateVariantTransition(before, next), /quote_reassigned_or_mutated/);
  next.configurations[0].base_price.quote_id = id(15);
  assert.throws(() => validateVariantTransition(before, next), /price_revision_conflict/);
  next.configurations[0].base_price.price_revision = 2;
  validateVariantTransition(before, next);
  assert.equal(resolveExactVariant(next, selection(), 2).amount_minor, 16000);
  assert.equal(resolveExactVariant(before, selection(), 1).amount_minor, 12345);
});
test('owner material/color answer supplies no exact variant prices for the actual product', () => {
  const decisions = JSON.parse(readFileSync('docs/search/owner-product-decisions-20260924.json', 'utf8'));
  assert.equal(decisions.pricing_policy.color_effect, 'neutral_unless_explicit_exception');
  assert.equal(decisions.pricing_policy.material_effect, 'neutral_unless_explicit_exception');
  const d = decisions.decisions.find((d: any) => d.decision_id === 'owner-glossy-vegan-armor-20260924-03');
  assert.equal(d.current_material, 'vegan leather'); assert.equal(d.selection_dimensions_separate, true);
  assert.deepEqual(d.owner_named_colors, ['Gold', 'Silver']);
  const s = make(); s.canonical_product_id = d.product_ids[0]; s.variants = [];
  assert.throws(() => resolveExactVariant(s, selection(), 1), /not_orderable/);
});
