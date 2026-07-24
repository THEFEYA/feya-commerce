import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildListingMasterKeywordSnapshot,
  getListingMasterDecisionStatus,
  getListingMasterKeywordSelection,
  listingMasterKeywordIds,
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

test('only a reviewed draft becomes a confirmed operator selection', () => {
  assert.equal(getListingMasterKeywordSelection('blocked_product_truth').status, 'blocked_product_truth');
  assert.equal(getListingMasterKeywordSelection('needs_keyword_review').status, 'needs_keyword_review');
  assert.equal(getListingMasterKeywordSelection('draft').status, 'confirmed');
  assert.equal(getListingMasterKeywordSelection(null).confirmation_required, true);
});
