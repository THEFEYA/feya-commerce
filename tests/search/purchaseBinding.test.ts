import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compilePurchaseBindingEvidence, inspectPurchaseSelection, parseSourcePriceEvidence, type ProductScope } from '../../lib/purchaseBindingEvidence.ts';
const capture = JSON.parse(readFileSync('docs/search/purchase-binding-capture-20260924.json', 'utf8'));
const sources = JSON.parse(readFileSync('docs/search/inventory-reconciliation-capture-20260924.json', 'utf8'));
const scopes: ProductScope[] = sources.products.filter((s: { canonical_product_id: string }) => capture.scope_product_ids.includes(s.canonical_product_id))
  .map((s: { canonical_product_id: string; source_listing_id: string; source_variations_json: { raw_variation_name: string; values: string[] }[] }) => ({
    canonical_product_id: s.canonical_product_id, source_listing_id: s.source_listing_id,
    declared_sizes: s.source_variations_json.filter(a => /^(?:Size|Unisex shirt size)$/i.test(a.raw_variation_name)).flatMap(a => a.values),
    declared_colors: s.source_variations_json.filter(a => /^(?:Primary color|Color|Colour)$/i.test(a.raw_variation_name)).flatMap(a => a.values),
  }));
const proposal = compilePurchaseBindingEvidence(capture, scopes);
const gold = '0cd7c558-7344-4076-91a5-86f7f5fe0ad0';
test('all 142 price identities and amounts survive binding; size rows never become components or Cartesian variants', () => {
  const before = JSON.stringify(capture), result = compilePurchaseBindingEvidence(capture, scopes);
  assert.equal(JSON.stringify(capture), before); assert.equal(result.rows.length, 142);
  assert.equal(result.rows.filter(r => r.axis === 'size').length, 125);
  assert.ok(result.rows.filter(r => r.axis === 'size').every(r => r.purchase_option_ref === null));
  for (const row of result.rows) {
    const old = capture.prices.find((p: { configuration_price_id: string }) => p.configuration_price_id === row.configuration_price_id);
    assert.equal(row.storefront_configuration_id, old.configuration_price_id);
    assert.equal(row.preserved_price.public_price_amount, old.public_price_amount);
    assert.equal(row.preserved_price.manual_override_amount, old.manual_override_amount);
    assert.equal(row.review_status.price, old.review_status);
    assert.equal(row.complete_variant_coordinates, null); assert.equal(row.charge_amount, null);
  }
  assert.ok(result.coverage.every(c => c.generated_variant_combinations === 0 && c.confirmed_orderable_variant_count === null));
});
test('original ranges survive a lossy single-price import and never become quotes', () => {
  const ranges = proposal.rows.filter(r => r.price_observation.kind === 'range_observation');
  assert.equal(ranges.length, 13);
  const jacket = ranges.find(r => r.configuration_price_id === 'ae4841a5-dcaf-47e2-a2fd-0a44684df95e')!;
  assert.deepEqual([jacket.price_observation.minimum, jacket.price_observation.maximum], ['518.67', '550.59']);
  assert.equal(jacket.preserved_price.public_price_amount, '518.67');
  assert.ok(jacket.blockers.includes('range_is_not_exact_variant_price')); assert.equal(jacket.charge_amount, null);
});
test('M selection cannot borrow the surviving XL price or invent a 4X/Custom price', () => {
  const m = inspectPurchaseSelection(proposal, { canonical_product_id: gold, size: 'M', color: 'Gold', configuration_price_id: '4f81a685-d6e9-4a44-b310-7c8a04f28e21' });
  assert.equal(m.size_price_observations[0].minimum, '271.31');
  assert.ok(m.blockers.includes('selected_size_price_row_mismatch')); assert.equal(m.charge_amount, null);
  const extra = inspectPurchaseSelection(proposal, { canonical_product_id: gold, size: '4X', color: 'Gold' });
  assert.ok(extra.blockers.includes('size_price_not_observed')); assert.ok(!extra.blockers.includes('size_not_declared'));
  const custom = inspectPurchaseSelection(proposal, { canonical_product_id: gold, size: 'Custom', color: 'Pink' });
  assert.ok(custom.blockers.includes('size_not_declared')); assert.ok(custom.blockers.includes('color_not_declared'));
});
test('1X and 2X retain their actual observed labels and cannot borrow XXL aliases', () => {
  const id = '1ce50e76-c066-46b8-97ba-d6be92a593ff';
  const one = inspectPurchaseSelection(proposal, { canonical_product_id: id, size: '1X', color: 'White' });
  assert.equal(one.size_price_observations[0].minimum, '287.27');
  const two = inspectPurchaseSelection(proposal, { canonical_product_id: id, size: '2X', color: 'White' });
  assert.equal(two.size_price_observations[0].minimum, '303.22');
  const alias = inspectPurchaseSelection(proposal, { canonical_product_id: id, size: 'XXL' });
  assert.equal(alias.size_price_observations.length, 0); assert.ok(alias.blockers.includes('size_not_declared'));
});
test('shared legacy whole-product parents keep distinct price-row identities and purchase scopes', () => {
  const coll = proposal.configuration_parent_collisions.find(c => c.canonical_product_id === '179e407a-5fed-4b42-ae19-ff220f939867')!;
  assert.equal(coll.configuration_price_ids.length, 3); assert.equal(coll.option_mapping_ids.length, 3); assert.equal(coll.can_merge, false);
  assert.equal(new Set(proposal.rows.map(r => r.proposal_key)).size, 142);
});
test('duplicates, missing joins, source swaps and product swaps reject a binding compilation', () => {
  for (const mutate of [
    (c: typeof capture) => c.prices.push(c.prices[0]),
    (c: typeof capture) => c.mappings.pop(),
    (c: typeof capture) => { c.prices[0].canonical_product_id = 'another-product'; },
    (c: typeof capture) => { c.prices[0].source_price_row_id = c.prices[1].source_price_row_id; },
    (c: typeof capture) => { c.configurations[0].canonical_product_id = 'another-product'; },
  ]) {
    const c = structuredClone(capture); mutate(c); assert.throws(() => compilePurchaseBindingEvidence(c, scopes), /identity|lineage|binding/);
  }
});
test('original price parser fails closed on malformed/ambiguous/foreign-currency/conflicting evidence', () => {
  const base = { raw_option_name: 'Size', raw_option_value: 'M', raw_option_text: JSON.stringify({ Size: 'M (10,00 € - 20,00 €)' }), parsed_price_amount: '10.00', currency: 'EUR' };
  assert.equal(parseSourcePriceEvidence(base).kind, 'range_observation');
  for (const patch of [
    { raw_option_text: '{}' }, { raw_option_text: '{' }, { raw_option_name: 'Color' }, { raw_option_value: 'XL' },
    { raw_option_text: JSON.stringify({ Size: 'M (1.234,00 €)' }) },
    { raw_option_text: JSON.stringify({ Size: 'M (20,00 € - 10,00 €)' }) },
    { parsed_price_amount: '20.00' }, { currency: 'USD' }, { raw_payload: { raw_option: 'different record' } },
  ]) assert.equal(parseSourcePriceEvidence({ ...base, ...patch }).kind, 'unresolved');
});
test('a configuration-price ID from another product is never selected', () => {
  const selection = inspectPurchaseSelection(proposal, { canonical_product_id: gold, size: 'M', configuration_price_id: 'ae4841a5-dcaf-47e2-a2fd-0a44684df95e' });
  assert.ok(selection.blockers.includes('price_id_not_owned_by_product')); assert.equal(selection.chosen_price_observation, null);
});
test('binding report reproduces captured identities, ranges, selector loss and held status offline', () => {
  execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/audit-purchase-bindings.ts', '--check'], { stdio: 'pipe' });
});
