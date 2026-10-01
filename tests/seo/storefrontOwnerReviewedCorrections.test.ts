import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOwnerReviewedStorefrontCorrections } from '../../lib/storefrontOwnerReviewedCorrections.ts';
import { resolveStorefrontSellableOffer } from '../../lib/storefrontSellableOffer.ts';

type OfferFixture = Record<string, any> & { configurations: Record<string, any>[] };

const product: OfferFixture = {
  canonical_product_id: 'ce899f23-b983-4ede-ae81-3348757b1c15',
  needs_label_review: true,
  configurations: [
    { configuration_id: '7c29ac2a-8276-4ebd-a374-ffcf5fe31355', public_label: 'Bracelet', component_code: 'arms', component_family: 'Arms', display_price_amount: 91.68, sort_order: 1 },
    { configuration_id: '7f9f2f1d-2a1b-4a48-b155-ff782b02f8e8', public_label: 'Garters', component_code: 'legs', component_family: 'Legs', display_price_amount: 96.5, sort_order: 2 },
    { configuration_id: 'ed3b7548-e8b4-4342-8dbe-5093d70a9cfc', public_label: 'Option', component_code: null, component_family: null, display_price_amount: 96.5, needs_label_review: true, sort_order: 3 },
    { configuration_id: '9ecc5baf-5028-407e-923c-cf216033364d', public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 125.45, sort_order: 4 },
    { configuration_id: '2bdff862-d860-49f9-b9ff-a99809620882', public_label: 'Shoulder + Bracelet', component_code: 'bundle', component_family: 'Bundle', is_bundle: true, bundle_component_codes: ['arms', 'shoulders'], display_price_amount: 159.51, sort_order: 5 },
    { configuration_id: '3b0d3f60-3e99-40ab-b0b3-6e5034efcc9a', public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms', 'legs', 'shoulders'], display_price_amount: 303.07, sort_order: 6 },
  ],
};

test('harness colour variants retain distinct prices but include just one harness', () => {
  const source: OfferFixture = {
    canonical_product_id: 'de38a842-37c4-40a7-86b4-393341c4c9aa',
    configurations: [
      { configuration_id: 'e689d3b4-acc1-4fa2-ad12-4463207fcdd9', public_label: 'Option', component_code: null, component_family: null, sort_order: 1, display_price_amount: 130.35, raw_option_value: 'Черный', needs_label_review: true },
      { configuration_id: '9a3cd61f-e87f-4590-b39f-b143e75ca0f7', public_label: 'Option', component_code: null, component_family: null, sort_order: 2, display_price_amount: 140.01, raw_option_value: 'Зеленый', needs_label_review: true },
      { configuration_id: '4b56be10-1771-4a5c-9daa-6ae70e8650f0', public_label: 'Option', component_code: null, component_family: null, sort_order: 3, display_price_amount: 159.31, raw_option_value: 'Коричневый', needs_label_review: true },
    ],
  };
  const before = JSON.stringify(source);
  const corrected = applyOwnerReviewedStorefrontCorrections(source);
  const offer = resolveStorefrontSellableOffer(corrected);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.component_codes, ['harness']);
  assert.deepEqual(offer.default_included_components, ['Harness']);
  assert.equal(offer.atomic_options.length, 3);
  assert.equal(offer.aggregate_options.length, 0);
  assert.deepEqual(corrected.configurations.map(row => [row.configuration_color, row.display_price_amount]), [['Black', 130.35], ['Green', 140.01], ['Brown', 159.31]]);
  assert.equal([...corrected.configurations].sort((a,b)=>a.sort_order-b.sort_order)[0].configuration_color, 'Brown');
  assert.deepEqual(corrected.configurations.map(row => [row.configuration_id, row.raw_option_value]), source.configurations.map(row => [row.configuration_id, row.raw_option_value]));
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(applyOwnerReviewedStorefrontCorrections(corrected), corrected);
  const unknown = applyOwnerReviewedStorefrontCorrections({ ...source, configurations: [...source.configurations, {configuration_id:'unknown',public_label:'Option',needs_label_review:true}] });
  assert.equal(resolveStorefrontSellableOffer(unknown).status, 'hold');
});

test('owner-confirmed cosmic top replaces its integrated shoulder label without changing options or prices', () => {
  const original = {
    canonical_product_id: '657bd6d8-fbe1-4441-abad-f574e3380897',
    configurations: [
      { configuration_id: '2a41b72b-4ce0-468f-b709-824d03b385e9', public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 130.28, raw_option_value: 'Плечи' },
      { configuration_id: '0b545588-0b9a-4fe3-a998-d412c97561c1', public_label: 'Skirt', component_code: 'skirt', component_family: 'Bottom', display_price_amount: 144.76 },
      { configuration_id: 'f61b93dd-811a-437b-9594-d37867041107', public_label: 'Full Set', component_code: 'full_set', is_full_set: true, bundle_component_codes: ['shoulders', 'skirt'], bundle_component_labels: ['Shoulders', 'Skirt'], display_price_amount: 207.36 },
    ],
  };
  const before = JSON.stringify(original);
  const corrected = applyOwnerReviewedStorefrontCorrections(original);
  const offer = resolveStorefrontSellableOffer(corrected);
  assert.deepEqual(offer.default_included_components, ['Top', 'Skirt']);
  assert.deepEqual(offer.component_codes, ['skirt', 'top']);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(corrected.configurations.map(row => [row.configuration_id, row.display_price_amount]), original.configurations.map(row => [row.configuration_id, row.display_price_amount]));
  assert.equal(corrected.configurations[0].raw_option_value, 'Плечи');
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(applyOwnerReviewedStorefrontCorrections(corrected), corrected);
});

test('restores the source-proven Top Harness and complete Full Set without editing raw evidence', () => {
  const corrected = applyOwnerReviewedStorefrontCorrections(product);
  const topHarness = corrected.configurations.find((row) => row.configuration_id === 'ed3b7548-e8b4-4342-8dbe-5093d70a9cfc');
  const fullSet = corrected.configurations.find((row) => row.is_full_set);

  assert.ok(topHarness);
  assert.ok(fullSet);
  assert.equal(topHarness.public_label, 'Top Harness');
  assert.equal(topHarness.component_code, 'harness');
  assert.deepEqual(fullSet.bundle_component_codes, ['shoulders', 'harness', 'arms', 'legs']);
  assert.deepEqual(fullSet.bundle_component_labels, ['Shoulders', 'Top Harness', 'Bracelet', 'Garters']);
  assert.equal(corrected.needs_label_review, false);
  assert.equal(corrected.component_sum_display_price_amount, 410.13);
  assert.equal(corrected.full_set_savings_amount, 107.06);

  const offer = resolveStorefrontSellableOffer(corrected);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.component_codes, ['arms', 'harness', 'legs', 'shoulders']);
  assert.deepEqual(offer.default_included_components, ['Shoulders', 'Top Harness', 'Bracelet', 'Garters']);
});

test('does not touch another product with an anonymous option', () => {
  const unrelated = {
    ...product,
    canonical_product_id: 'another-product',
  };
  assert.equal(applyOwnerReviewedStorefrontCorrections(unrelated), unrelated);
});

test('silver mens warrior Full Set includes its grouped option and compares all separate choices', () => {
  const mensSet: OfferFixture = {
    canonical_product_id: '4b0c8180-774d-4d5c-a12c-0864f305d1cb',
    configurations: [
      { configuration_id: 'bb5ae6b4-824d-45cf-a1ac-8e2a26111242', public_label: 'Bracelet', component_code: 'arms', display_price_amount: 96.5 },
      { configuration_id: '22aacfc5-7ffa-4a7e-800e-448ba0ec88dc', public_label: 'Skirt', component_code: 'skirt', display_price_amount: 144.76 },
      { configuration_id: 'e0b68b79-a4a1-4b9e-a33e-8240777a52bc', public_label: 'Top + Shoulders', component_code: 'bundle', is_bundle: true, bundle_component_codes: ['shoulders', 'top'], display_price_amount: 144.76 },
      { configuration_id: 'aa40d23b-7bcf-4a59-ab91-7e1fca94fab8', public_label: 'Full Set', component_code: 'full_set', is_full_set: true, bundle_component_codes: ['arms', 'skirt'], bundle_component_labels: ['Bracelet', 'Skirt'], display_price_amount: 282.77 },
    ],
    component_sum_display_price_amount: 241.26,
    full_set_savings_amount: null,
    full_set_savings_percent: null,
  };

  const corrected = applyOwnerReviewedStorefrontCorrections(mensSet);
  const fullSet = corrected.configurations.find((row) => row.is_full_set);

  assert.ok(fullSet);
  assert.deepEqual(fullSet.bundle_component_codes, ['arms', 'shoulders', 'skirt', 'top']);
  assert.deepEqual(fullSet.bundle_component_labels, ['Bracelet', 'Shoulders', 'Skirt', 'Top']);
  assert.equal(corrected.component_sum_display_price_amount, 386.02);
  assert.equal(corrected.full_set_savings_amount, 103.25);
  assert.equal(corrected.full_set_savings_percent, 26.75);

  const offer = resolveStorefrontSellableOffer(corrected);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.default_included_components, ['Bracelet', 'Shoulders', 'Skirt', 'Top']);
});


test('gold armor numbered variants stay distinct with source prices', () => {
  const corrected = applyOwnerReviewedStorefrontCorrections({
    canonical_product_id: '437a20cd-27a3-4aaf-b154-3353899e0ebd',
    needs_label_review: true,
    configurations: [
      { configuration_id: '899e0b93-6222-4208-9d3a-218e4747b982', public_label: 'Option', display_price_amount: 303.07, sort_order: 1, needs_label_review: true },
      { configuration_id: 'a737ac7d-bff8-4325-b101-fa934bb1d322', public_label: 'Option', display_price_amount: 358.90, sort_order: 2, needs_label_review: true },
      { configuration_id: '3ae4183d-f178-4231-a551-5c874520a25a', public_label: 'Option', display_price_amount: 199.39, sort_order: 3, needs_label_review: true },
      { configuration_id: 'dce0b722-5c5b-4b2b-81c4-032c1d295a53', public_label: 'Option', display_price_amount: 223.31, sort_order: 4, needs_label_review: true },
    ],
  });

  assert.deepEqual(
    corrected.configurations.map((row: any) => [row.public_label, row.display_price_amount, row.sort_order]),
    [
      ['Variant #1', 303.07, 1],
      ['Variant #2', 358.90, 2],
      ['Variant #3', 199.39, 3],
      ['Variant #4', 223.31, 4],
    ],
  );
  assert.equal(corrected.needs_label_review, false);
});
