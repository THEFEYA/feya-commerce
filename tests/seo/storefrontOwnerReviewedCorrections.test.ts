import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOwnerReviewedStorefrontCorrections } from '../../lib/storefrontOwnerReviewedCorrections.ts';
import { resolveStorefrontSellableOffer } from '../../lib/storefrontSellableOffer.ts';

const product = {
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

test('restores the source-proven Top Harness and complete Full Set without editing raw evidence', () => {
  const corrected = applyOwnerReviewedStorefrontCorrections(product);
  const topHarness = corrected.configurations.find((row) => row.configuration_id === 'ed3b7548-e8b4-4342-8dbe-5093d70a9cfc');
  const fullSet = corrected.configurations.find((row) => row.is_full_set);

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
  const mensSet = {
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
  } as any;

  const corrected = applyOwnerReviewedStorefrontCorrections(mensSet);
  const fullSet = corrected.configurations.find((row) => row.is_full_set);

  assert.deepEqual(fullSet.bundle_component_codes, ['arms', 'shoulders', 'skirt', 'top']);
  assert.deepEqual(fullSet.bundle_component_labels, ['Bracelet', 'Shoulders', 'Skirt', 'Top']);
  assert.equal(corrected.component_sum_display_price_amount, 386.02);
  assert.equal(corrected.full_set_savings_amount, 103.25);
  assert.equal(corrected.full_set_savings_percent, 26.75);

  const offer = resolveStorefrontSellableOffer(corrected);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.default_included_components, ['Bracelet', 'Shoulders', 'Skirt', 'Top']);
});
