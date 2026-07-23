import assert from 'node:assert/strict';
import test from 'node:test';
import {
  componentEvidenceLabel,
  getCanonicalComponentTruthDiagnostic,
  isReviewFieldResolved,
} from '../../lib/adminComponentTruth.ts';

test('component review events cannot override unresolved canonical Product Truth', () => {
  assert.equal(isReviewFieldResolved('component', true, true), false);
  assert.equal(isReviewFieldResolved('component', true, false), false);
  assert.equal(isReviewFieldResolved('component', false, false), true);
});

test('non-component review events retain the existing acknowledgement behavior', () => {
  assert.equal(isReviewFieldResolved('label', true, true), true);
  assert.equal(isReviewFieldResolved('price', true, false), false);
  assert.equal(isReviewFieldResolved('media', false, false), true);
});

test('canonical component diagnostics preserve unresolved evidence as blockers', () => {
  const result = getCanonicalComponentTruthDiagnostic({
    canonical_product_id: 'product-1',
    included_components: [],
    unresolved_component_facts: [{ fact_type: 'mapping_requires_review', raw_option_value: 'Shoulders' }],
    component_review_blockers_json: [{ blocker_code: 'configuration_component_family_null', configuration_name: 'Full Set' }],
    source_variations_json: [{ raw_value: 'Full Set' }],
    option_price_rows_json: [{ raw_option_value: 'Плечи' }],
  });

  assert.deepEqual(result.blockers, [
    'composition_missing_confirmed_components',
    'composition_has_unresolved_facts',
    'composition_has_review_blockers',
  ]);
  assert.equal(result.sourceVariations.length, 1);
  assert.equal(result.optionPriceRows.length, 1);
  assert.equal(
    componentEvidenceLabel(result.reviewBlockers[0]),
    'configuration_component_family_null: Full Set',
  );
});

test('missing canonical Product Truth is never treated as reviewed', () => {
  assert.deepEqual(
    getCanonicalComponentTruthDiagnostic(null).blockers,
    ['canonical_product_truth_unavailable'],
  );
});
