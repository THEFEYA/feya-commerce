import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { getSeoPackDraftSaveBlockers } from '../../lib/seoPackContract.ts';

function draft(selectionStatus: 'confirmed' | 'needs_human_confirmation') {
  return {
    canonical_product_id: 'product-1',
    status: 'brief_ready',
    keyword_selection: {
      mode: selectionStatus === 'confirmed' ? 'operator_decision' : 'auto_recommendation',
      status: selectionStatus,
      evidence_source: 'vw_seo_keyword_bank_v1_approved',
      confirmation_required: selectionStatus !== 'confirmed',
    },
    product_truth: {
      title: 'Gold Shoulder Armor',
      slug: 'gold-shoulder-armor',
      product_truth_source: 'seo_product_truth_v1',
      included_components: ['Shoulders'],
      known_components: ['Shoulders'],
      unresolved_component_facts: [],
      component_review_blockers: [],
      source_description_fragment: 'Confirmed source description.',
      source_variations: [],
      option_price_rows: [],
    },
    keyword_roles: {
      primary: [{ keyword: 'gold shoulder armor' }],
      secondary: [],
    },
    metrics_status: { validated_count: 1 },
    qa_checks: {},
  } as never;
}

test('storage gate blocks an automatic keyword recommendation until human confirmation', () => {
  assert.ok(getSeoPackDraftSaveBlockers(draft('needs_human_confirmation')).includes('keyword_selection_not_human_confirmed'));
  assert.equal(getSeoPackDraftSaveBlockers(draft('confirmed')).includes('keyword_selection_not_human_confirmed'), false);
});
