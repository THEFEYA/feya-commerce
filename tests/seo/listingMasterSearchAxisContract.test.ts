import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LISTING_MASTER_SEARCH_AXIS_CONTRACT,
  partitionListingMasterComponentAxes,
  reconcileListingMasterComponentFocus,
  writerComponentAxesFromListingMasterFocus,
  restoreListingMasterComponentAxes,
} from '../../lib/listingMasterSearchAxisContract.ts';
import { resolveStorefrontSellableOffer } from '../../lib/storefrontSellableOffer.ts';

const offer = resolveStorefrontSellableOffer({
  configurations: [
    { component_code: 'legs', component_family: 'legs', public_label: 'Leg Covers' },
    { component_code: 'choker', component_family: 'choker', public_label: 'Choker' },
    {
      component_code: 'full_set',
      public_label: 'Full Set',
      is_full_set: true,
      bundle_component_codes: ['legs', 'choker'],
    },
  ],
});

test('SEO component axes are partitioned without changing the storefront offer', () => {
  const result = partitionListingMasterComponentAxes(
    ['top', 'harness', 'legs', 'choker'],
    offer,
  );

  assert.deepEqual(result.selected, ['top', 'harness', 'legs', 'choker']);
  assert.deepEqual(result.sellableComponentAxes, ['legs', 'choker']);
  assert.deepEqual(result.searchOnlyComponentAxes, ['top', 'harness']);
  assert.deepEqual(offer.component_labels, ['Choker', 'Leg Covers']);
});

test('versioned SEO search axes remain available for keyword retrieval', () => {
  const result = reconcileListingMasterComponentFocus({
    component_focus_contract: LISTING_MASTER_SEARCH_AXIS_CONTRACT,
    component: ['top', 'harness', 'legs', 'choker'],
  }, offer);

  assert.equal(result.usesSearchAxisContract, true);
  assert.deepEqual(result.focus.component, ['top', 'harness', 'legs', 'choker']);
  assert.deepEqual(result.sellableComponentAxes, ['legs', 'choker']);
  assert.deepEqual(result.searchOnlyComponentAxes, ['top', 'harness']);
  assert.deepEqual(result.removedComponents, []);
});

test('legacy decisions still fail closed until they are explicitly re-saved', () => {
  const result = reconcileListingMasterComponentFocus({
    component: ['top', 'harness', 'legs', 'choker'],
  }, offer);

  assert.equal(result.usesSearchAxisContract, false);
  assert.deepEqual(result.focus.component, ['legs', 'choker']);
  assert.deepEqual(result.removedComponents, ['top', 'harness']);
});

test('writer-visible component focus excludes search-only axes', () => {
  const focus = {
    component_focus_contract: LISTING_MASTER_SEARCH_AXIS_CONTRACT,
    component: ['top', 'harness', 'legs', 'choker'],
    sellable_component_axes: ['legs', 'choker'],
    search_only_component_axes: ['top', 'harness'],
  };

  assert.deepEqual(writerComponentAxesFromListingMasterFocus(focus), ['legs', 'choker']);
});

test('restoring owner search axes preserves choices across offer changes and holds', () => {
  const focus = {
    component_focus_contract: LISTING_MASTER_SEARCH_AXIS_CONTRACT,
    sellable_offer_signature: 'previous-composition',
    component: ['top', 'arms'],
  };
  assert.deepEqual(restoreListingMasterComponentAxes(focus, offer, ['legs', 'choker']), ['top', 'arms']);
  assert.deepEqual(restoreListingMasterComponentAxes(focus, { ...offer, status: 'hold' }, ['choker']), ['top', 'arms']);
  assert.deepEqual(restoreListingMasterComponentAxes({ ...focus, component: [] }, offer, ['choker']), []);
  // Restoration never updates the stored signature or marks the stale decision valid.
  assert.equal(focus.sellable_offer_signature, 'previous-composition');
});

test('legacy restoration retains the current-offer boundary', () => {
  assert.deepEqual(restoreListingMasterComponentAxes({component:['legs'],sellable_offer_signature:offer.signature},offer,['choker']), ['legs']);
  assert.deepEqual(restoreListingMasterComponentAxes({component:['legs'],sellable_offer_signature:'old'},offer,['choker']), ['choker']);
});
