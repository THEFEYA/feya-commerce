import test from 'node:test';
import assert from 'node:assert/strict';
import { projectApprovedOfferSnapshot } from '../../lib/storefrontApprovedOfferProjection.ts';

test('approved offer snapshot restores public labels while preserving current prices and ids', () => {
  const product = {
    canonical_product_id: 'gold-amazon',
    configurations: [
      { configuration_id: 'a', public_label: 'Shoulders', display_price_amount: 135.10, currency: 'EUR' },
      { configuration_id: 'b', public_label: 'Option 3', display_price_amount: 144.76, currency: 'EUR' },
      { configuration_id: 'c', public_label: 'Full Set', display_price_amount: 199.39, currency: 'EUR', is_full_set: true },
    ],
  };
  const snapshot = {
    draft_id: 'draft',
    source_decision_id: 'decision',
    sellable_offer_signature: 'storefront-sellable-offer-v1:' + JSON.stringify([
      { id: 'a', code: 'shoulders', family: 'shoulders', label: 'Shoulders', aggregate: false, full_set: false, members: [] },
      { id: 'b', code: 'arms', family: 'arms', label: 'Arm Guards', aggregate: false, full_set: false, members: [] },
      { id: 'c', code: 'full_set', family: 'bundle', label: 'Full Set', aggregate: true, full_set: true, members: ['arms','shoulders'] },
    ]),
    optional_configurations: [
      { configuration_id: 'a', public_label: 'Shoulders', sort_order: 1, display_price_amount: 135.10 },
      { configuration_id: 'b', public_label: 'Arm Guards', sort_order: 2, display_price_amount: 144.76 },
      { configuration_id: 'c', public_label: 'Full Set', sort_order: 3, display_price_amount: 199.39 },
    ],
  };

  const projected = projectApprovedOfferSnapshot(product, snapshot);
  assert.deepEqual(projected.configurations.map((row: any) => row.public_label), ['Shoulders','Arm Guards','Full Set']);
  assert.deepEqual(projected.configurations.map((row: any) => row.display_price_amount), [135.10,144.76,199.39]);
  assert.deepEqual(projected.configurations.map((row: any) => row.configuration_id), ['a','b','c']);
  assert.deepEqual(projected.configurations[2].bundle_component_labels, ['Arm Guards','Shoulders']);
});

test('approved offer projection fails closed on stale selector ids instead of partially mixing versions', () => {
  const product = {
    configurations: [
      { configuration_id: 'a', public_label: 'Option 1', display_price_amount: 100 },
      { configuration_id: 'b', public_label: 'Option 2', display_price_amount: 200 },
    ],
  };
  const snapshot = {
    sellable_offer_signature: 'storefront-sellable-offer-v1:' + JSON.stringify([
      { id: 'a', code: 'arms', family: 'arms', label: 'Arm Guards', aggregate: false, full_set: false, members: [] },
      { id: 'missing', code: 'full_set', family: 'bundle', label: 'Full Set', aggregate: true, full_set: true, members: ['arms'] },
    ]),
  };
  assert.equal(projectApprovedOfferSnapshot(product, snapshot), product);
});

test('optional configuration snapshot can restore labels when an older approved draft lacks a signature', () => {
  const product = {
    configurations: [
      { configuration_id: 'horns', public_label: 'Option 4', display_price_amount: 159.59 },
      { configuration_id: 'full', public_label: 'Full Set', display_price_amount: 311.20 },
    ],
  };
  const projected = projectApprovedOfferSnapshot(product, {
    optional_configurations: [
      { configuration_id: 'horns', public_label: 'Horns', component_code: 'horns', component_family: 'Headpiece', sort_order: 1 },
      { configuration_id: 'full', public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, sort_order: 2 },
    ],
  });
  assert.deepEqual(projected.configurations.map((row: any) => row.public_label), ['Horns','Full Set']);
  assert.deepEqual(projected.configurations.map((row: any) => row.display_price_amount), [159.59,311.20]);
});
