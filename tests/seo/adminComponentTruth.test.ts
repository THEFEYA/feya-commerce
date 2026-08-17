import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  componentEvidenceLabel,
  getCanonicalComponentTruthDiagnostic,
  isReviewFieldResolved,
} from '../../lib/adminComponentTruth.ts';

test('component review queue uses a fast catalog and bounded Product Truth pages', () => {
  const page = readFileSync(
    new URL('../../app/admin/review/components/page.tsx', import.meta.url),
    'utf8',
  );

  assert.ok(page.includes('STOREFRONT_VIEW_V1'));
  assert.ok(page.includes('const PAGE_SIZE = 6'));
  assert.ok(page.includes('const TRUTH_READ_CONCURRENCY = 3'));
  assert.ok(page.includes(".eq('canonical_product_id', id)"));
  assert.ok(page.includes('.maybeSingle()'));
  assert.ok(page.includes('allRows.slice(pageStart, pageStart + PAGE_SIZE)'));
  assert.equal(page.includes("query.in('canonical_product_id', canonicalProductIds)"), false);
  assert.equal(page.includes('STOREFRONT_VIEW_V4'), false);
});

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

test('size and color review facts remain visible without blocking composition', () => {
  const result = getCanonicalComponentTruthDiagnostic({
    canonical_product_id: 'product-2',
    included_components: ['Corset'],
    unresolved_component_facts: [],
    component_review_blockers_json: [],
    variant_review_facts: [
      {
        source: 'component_review_blockers_json',
        detected_canonical_axis: 'size',
        evidence: {
          option_mapping_id: 'mapping-1',
          reason: 'option_mapping_requires_review',
          raw_phrase: 'M US',
        },
      },
      {
        source: 'unresolved_component_facts',
        detected_canonical_axis: 'size',
        evidence: {
          option_mapping_id: 'mapping-1',
          reason: 'option_mapping_requires_review',
          raw_phrase: 'M US',
        },
      },
      { detected_canonical_axis: 'color', evidence: { raw_phrase: 'Gold' } },
    ],
  });

  assert.deepEqual(result.blockers, []);
  assert.equal(result.variantReviewFacts.length, 2);
});
