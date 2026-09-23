import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { applyOwnerReviewedStorefrontCorrections as correct } from '../../lib/storefrontOwnerReviewedCorrections.ts';
import { resolveStorefrontSellableOffer as offer, sellableOfferIncludedLabels, sellableOfferPurchaseUnitLabels } from '../../lib/storefrontSellableOffer.ts';
import { resolveMinimumSeparatePurchaseTotal } from '../../lib/storefrontPriceComparison.ts';

type Product = Record<string, unknown> & { canonical_product_id: string; configurations: Record<string, unknown>[] };
const replay: { products: Product[] } = JSON.parse(readFileSync(new URL('./fixtures/liveOfferReplay20260923.json', import.meta.url), 'utf8'));

test('live RPC replay preserves every product/configuration ID and original price without mutating evidence', () => {
  for (const product of replay.products) {
    const original = JSON.stringify(product);
    const fixed = correct(product);
    assert.equal(fixed.canonical_product_id, product.canonical_product_id);
    const identityAndPrice = (p: Product) => p.configurations.map(c => [c.configuration_id, c.display_price_amount]);
    assert.deepEqual(identityAndPrice(fixed), identityAndPrice(product));
    for (const field of ['currency', 'min_price', 'max_price', 'full_set_display_price_amount']) assert.equal(fixed[field], product[field]);
    assert.equal(JSON.stringify(product), original);
    assert.deepEqual(correct(fixed), fixed);
    assert.equal(offer(fixed).status, 'ready', JSON.stringify(offer(fixed).blockers));
  }
});

test('exact Full Set x1/x2 selection and persisted signature preserve quantities independently', () => {
  const product = replay.products.find(p => p.canonical_product_id === 'a7109e93-df1f-43a6-bb6f-62bdf74e4c4f');
  assert.ok(product);
  const truth = offer(product);
  const single = { configuration_id: 'fe93bdb2-824c-4669-a58c-4bb3a377f2ef', is_full_set: true };
  const pair = { configuration_id: '91993da0-b771-4215-ba1c-6edabf0737ad', is_full_set: true };
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, single), ['Shoulder x1', 'Arm Cover x1']);
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, pair), ['Shoulders x2', 'Arm Covers x2']);
  assert.ok(truth.signature);
  const signature: Array<{ id: string; members: string[] }> = JSON.parse(truth.signature.split('storefront-sellable-offer-v1:')[1]);
  assert.deepEqual(signature.find(row => row.id === single.configuration_id)?.members, ['arm_cover_x1', 'shoulder_x1']);
  assert.deepEqual(signature.find(row => row.id === pair.configuration_id)?.members, ['arm_covers_x2', 'shoulders_x2']);
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, { configuration_id: 'missing', is_full_set: true }), []);
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, { is_full_set: true }), []);
});

test('incomplete or unknown correction mappings cannot fabricate a reviewed offer', () => {
  const product = replay.products[0];
  const unknown = { ...product, canonical_product_id: 'unreviewed' };
  assert.equal(correct(unknown), unknown);
  assert.equal(offer(unknown).status, 'hold');
  const incomplete = { ...product, configurations: product.configurations.slice(1) };
  assert.equal(offer(incomplete).status, 'hold');
});

const atomic = (code: string, label: string, sort = 1) => ({ configuration_id: code, component_code: code, public_label: label, sort_order: sort });
const bundle = (id: string, codes: string[], labels: string[], full = false) => ({
  configuration_id: id, component_code: full ? 'full_set' : id, public_label: full ? 'Full Set' : labels.join(' + '),
  is_bundle: true, is_full_set: full, source_confirmed_bundle_members: true,
  bundle_component_codes: codes, bundle_component_labels: labels,
});

test('display keeps grouped units while Product OS retains their factual component list', () => {
  const group = bundle('top_shoulders', ['top', 'shoulders'], ['Top', 'Shoulders']);
  const full = bundle('full', ['skirt', 'top', 'shoulders'], ['Skirt', 'Top', 'Shoulders'], true);
  const truth = offer({ configurations: [group, atomic('skirt', 'Skirt'), full] });
  assert.deepEqual(sellableOfferIncludedLabels(truth, group), ['Top', 'Shoulders']);
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, group), ['Top + Shoulders']);
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, full), ['Skirt', 'Top + Shoulders']);
});

test('Full Set display follows its confirmed member order regardless of selector sorting', () => {
  const full = bundle('full', ['shoulders', 'skirt'], ['Shoulders', 'Skirt'], true);
  const truth = offer({ configurations: [atomic('skirt', 'Skirt', 1), atomic('shoulders', 'Shoulders', 10), full] });
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, full), ['Shoulders', 'Skirt']);
});

test('grouped display is an exact partition, never two groups that duplicate a component', () => {
  const full = bundle('full', ['shoulders', 'top', 'skirt', 'panties'], ['Shoulders', 'Top', 'Skirt', 'Panties'], true);
  const truth = offer({ configurations: [
    atomic('shoulders', 'Shoulders'),
    bundle('upper', ['top', 'shoulders'], ['Top', 'Shoulders']),
    bundle('lower', ['top', 'skirt', 'panties'], ['Top', 'Skirt', 'Panties']), full,
  ] });
  assert.equal(truth.status, 'ready');
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, full), ['Shoulders', 'Top + Skirt + Panties']);
});

test('two explicit contradictory member labels fail closed; generated axis aliases do not overrule facts', () => {
  const full = bundle('full', ['top', 'legs'], ['Top', 'Garters'], true);
  const inferred = { ...bundle('group', ['top', 'legs'], ['Top', 'Garters']), bundle_component_labels: [] };
  assert.equal(offer({ configurations: [inferred, full] }).status, 'ready');
  const contradictory = bundle('group', ['top', 'legs'], ['Top', 'Leg Covers']);
  assert.ok(offer({ configurations: [contradictory, full] }).blockers.includes('sellable_component_label_conflict:legs'));
});

test('exact separate-price comparison excludes extra pieces and overlapping purchases', () => {
  assert.equal(resolveMinimumSeparatePurchaseTotal({ targetMemberCodes: ['top', 'skirt'], candidates: [
    { price: 10, memberCodes: ['top', 'skirt', 'boots'] },
    { price: 30, memberCodes: ['top'] }, { price: 40, memberCodes: ['skirt'] },
  ] }), 70);
  assert.equal(resolveMinimumSeparatePurchaseTotal({ targetMemberCodes: ['top', 'skirt', 'shoulders'], candidates: [
    { price: 10, memberCodes: ['top', 'skirt'] }, { price: 20, memberCodes: ['top', 'shoulders'] },
  ] }), null);
});


test('explicit confirmed Full Set membership is not expanded to other available options', () => {
  const full = bundle('full', ['top', 'skirt'], ['Top', 'Skirt'], true);
  const truth = offer({ configurations: [atomic('top', 'Top'), atomic('skirt', 'Skirt'), atomic('boots', 'Boots'), bundle('extra', ['top', 'boots'], ['Top', 'Boots']), full] });
  assert.deepEqual(sellableOfferIncludedLabels(truth, full), ['Top', 'Skirt']);
  assert.deepEqual(sellableOfferPurchaseUnitLabels(truth, full), ['Top', 'Skirt']);
});
