import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildListingMasterKeywordSnapshot,
  getListingMasterDecisionInvalidationBlockers,
  getListingMasterDecisionStatus,
  getListingMasterKeywordSelection,
  listingMasterKeywordIds,
  listingMasterKeywordSelectionSignature,
} from '../../lib/seoListingMasterDecision.ts';

test('Listing Master snapshot preserves metric and recommendation provenance', () => {
  const snapshot = buildListingMasterKeywordSnapshot([{
    id: 'kw-1',
    keyword: 'gold festival armor outfit',
    keyword_norm: 'gold festival armor outfit',
    bank_bucket: 'product',
    role: 'primary',
    review_status: 'approved_draft',
    score: 88,
    avg_monthly_searches: 210,
    competition: 'HIGH',
    competition_index: 71,
    region: 'US',
    language: 'en',
    metric_source: 'google_keyword_planner',
    last_checked: '2026-07-08',
    recommendation_score: 411.25,
    recommendation_reason: 'scope:whole_product · component:armor',
    validation_status: 'validated',
    data_freshness_status: 'validated',
    whole_product_intent: true,
    auto_recommendation: true,
    auto_recommendation_needs_human_confirmation: true,
  }]);

  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].metric_source, 'google_keyword_planner');
  assert.equal(snapshot[0].last_checked, '2026-07-08');
  assert.equal(snapshot[0].role, 'primary');
  assert.equal(snapshot[0].whole_product_intent, true);
  assert.deepEqual(listingMasterKeywordIds(snapshot), ['kw-1']);
});

test('decision status prioritizes Product Truth and Primary review gates', () => {
  assert.equal(
    getListingMasterDecisionStatus(['composition_missing_confirmed_components'], [{ role: 'primary' }]),
    'blocked_product_truth',
  );
  assert.equal(getListingMasterDecisionStatus([], [{ role: 'secondary' }]), 'needs_keyword_review');
  assert.equal(getListingMasterDecisionStatus([], [{ role: 'primary' }]), 'draft');
});

test('keyword selection signature changes when the reviewed shortlist or roles change', () => {
  const reviewed = [
    { id: 'kw-1', keyword_norm: 'Gold Festival Outfit', role: 'primary' },
    { id: 'kw-2', keyword_norm: 'warrior armor costume', role: 'secondary' },
  ];
  const sameSelection = [
    { id: 'kw-1', keyword: 'gold-festival-outfit', role: 'PRIMARY' },
    { id: 'kw-2', keyword: 'warrior armor costume', role: 'secondary' },
  ];
  const changedRole = [
    { id: 'kw-1', keyword_norm: 'gold festival outfit', role: 'secondary' },
    { id: 'kw-2', keyword_norm: 'warrior armor costume', role: 'primary' },
  ];
  const changedKeyword = [
    { id: 'kw-1', keyword_norm: 'gold festival outfit', role: 'primary' },
    { id: 'kw-3', keyword_norm: 'skirt and top set festival', role: 'secondary' },
  ];

  assert.equal(
    listingMasterKeywordSelectionSignature(reviewed),
    listingMasterKeywordSelectionSignature(sameSelection),
  );
  assert.notEqual(
    listingMasterKeywordSelectionSignature(reviewed),
    listingMasterKeywordSelectionSignature(changedRole),
  );
  assert.notEqual(
    listingMasterKeywordSelectionSignature(reviewed),
    listingMasterKeywordSelectionSignature(changedKeyword),
  );
});

test('only a reviewed draft becomes a confirmed operator selection', () => {
  assert.equal(getListingMasterKeywordSelection('blocked_product_truth').status, 'blocked_product_truth');
  assert.equal(getListingMasterKeywordSelection('needs_keyword_review').status, 'needs_keyword_review');
  assert.equal(getListingMasterKeywordSelection('draft').status, 'confirmed');
  assert.equal(getListingMasterKeywordSelection(null).confirmation_required, true);
});

test('a changed storefront option snapshot invalidates an otherwise reviewed draft', () => {
  assert.deepEqual(
    getListingMasterDecisionInvalidationBlockers({
      hasPrimary: true,
      savedKeywordSelectionSignature: 'selection-a',
      currentKeywordSelectionSignature: 'selection-a',
      savedSellableOfferSignature: 'offer:shoulders|skirt|top',
      currentSellableOfferSignature: 'offer:shoulders|skirt',
    }),
    ['stale_option_snapshot'],
  );
});

test('keyword role changes and unsupported focus require a fresh human review', () => {
  assert.deepEqual(
    getListingMasterDecisionInvalidationBlockers({
      hasPrimary: false,
      savedKeywordSelectionSignature: 'selection-a',
      currentKeywordSelectionSignature: 'selection-b',
      savedSellableOfferSignature: 'offer-a',
      currentSellableOfferSignature: 'offer-a',
      removedUnsupportedFocusComponents: ['top', 'harness'],
    }),
    [
      'no_valid_pdp_primary',
      'keyword_roles_changed_after_reaudit',
      'manual_focus_contains_unsupported_component',
    ],
  );
});

test('keyword-bank row UUID or display order does not invalidate the same reviewed shortlist', () => {
  const saved = listingMasterKeywordSelectionSignature([
    { id: 'listing-view-id', keyword: "metallic bodysuit women's", role: 'secondary' },
    { id: 'primary-id', keyword: 'robot armor costume', role: 'primary' },
  ]);
  const reaudit = listingMasterKeywordSelectionSignature([
    { id: 'primary-id', keyword: 'robot armor costume', role: 'primary' },
    { id: 'approved-view-id', keyword_norm: 'metallic bodysuit womens', role: 'secondary' },
  ]);

  assert.deepEqual(
    getListingMasterDecisionInvalidationBlockers({
      hasPrimary: true,
      savedKeywordSelectionSignature: saved,
      currentKeywordSelectionSignature: reaudit,
      savedSellableOfferSignature: 'offer-a',
      currentSellableOfferSignature: 'offer-a',
    }),
    [],
  );
});
