import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSeoGenerationProductTruthBlockers,
  getSeoKeywordSelectionBlockers,
  getSeoPackApprovalBlockers,
  getSeoPackReviewDraftStorageBlockers,
} from '../../lib/seoPackContract.ts';
import { buildSeoDraftStoragePayload } from '../../lib/seoDraftStoragePayload.ts';

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

test('approval gate blocks an automatic keyword recommendation until human confirmation', () => {
  assert.ok(getSeoPackApprovalBlockers(draft('needs_human_confirmation')).includes('keyword_selection_not_human_confirmed'));
  assert.equal(getSeoPackApprovalBlockers(draft('confirmed')).includes('keyword_selection_not_human_confirmed'), false);
});

test('review storage requires the operator to confirm the automatic recommendation', () => {
  assert.ok(getSeoPackReviewDraftStorageBlockers(draft('needs_human_confirmation')).includes('keyword_selection_not_human_confirmed'));
});

test('review storage still blocks drafts without validated source evidence', () => {
  const unsafe = draft('needs_human_confirmation') as any;
  unsafe.product_truth.source_description_fragment = '';
  unsafe.product_truth.source_variations = [];
  unsafe.product_truth.option_price_rows = [];
  assert.ok(getSeoPackReviewDraftStorageBlockers(unsafe).includes('missing_source_configuration_evidence'));
});

test('real generation blocks unresolved or unproven composition before OpenAI', () => {
  const unsafe = draft('confirmed') as any;
  unsafe.product_truth.included_components = [];
  unsafe.product_truth.known_components = [];
  unsafe.product_truth.optional_configurations = ['Full Set'];
  unsafe.product_truth.unresolved_component_facts = ['Full Set has not been mapped to exact pieces.'];

  assert.deepEqual(getSeoGenerationProductTruthBlockers(unsafe), [
    'composition_missing_confirmed_components',
    'composition_has_unresolved_facts',
  ]);
});

test('real generation requires canonical truth and source configuration evidence', () => {
  const unsafe = draft('confirmed') as any;
  unsafe.product_truth.product_truth_source = 'listing_master_product_focus_v1';
  unsafe.product_truth.source_description_fragment = '';
  unsafe.product_truth.source_variations = [];
  unsafe.product_truth.option_price_rows = [];

  assert.deepEqual(getSeoGenerationProductTruthBlockers(unsafe), [
    'composition_missing_canonical_product_truth',
    'composition_missing_source_configuration_evidence',
  ]);
});

test('real generation opens only for canonical confirmed composition', () => {
  assert.deepEqual(getSeoGenerationProductTruthBlockers(draft('confirmed')), []);
});

test('multi-component product cannot be confirmed with a component-only primary', () => {
  const unsafe = draft('confirmed') as any;
  unsafe.product_truth.title = 'Gold Festival Armor Outfit';
  unsafe.product_truth.included_components = ['Shoulders', 'Harness', 'Skirt'];
  unsafe.product_truth.known_components = ['Shoulders', 'Harness', 'Skirt'];
  unsafe.keyword_roles.primary = [{ keyword: 'gold shoulder armor' }];

  assert.deepEqual(getSeoKeywordSelectionBlockers(unsafe), [
    'primary_keyword_scope_mismatch_for_multi_component_product',
  ]);
  assert.ok(getSeoPackApprovalBlockers(unsafe).includes('primary_keyword_scope_mismatch_for_multi_component_product'));
  assert.ok(getSeoPackReviewDraftStorageBlockers(unsafe).includes('primary_keyword_scope_mismatch_for_multi_component_product'));

  unsafe.keyword_roles.primary = [{ keyword: 'gold shoulder armor costume' }];
  assert.deepEqual(getSeoKeywordSelectionBlockers(unsafe), [
    'primary_keyword_scope_mismatch_for_multi_component_product',
  ]);

  unsafe.keyword_roles.primary = [{ keyword: 'gold festival armor outfit' }];
  assert.deepEqual(getSeoKeywordSelectionBlockers(unsafe), []);

  unsafe.keyword_roles.primary = [{ keyword: 'shoulder armor harness and skirt costume' }];
  assert.deepEqual(getSeoKeywordSelectionBlockers(unsafe), []);
});

test('stored partial draft is explicitly marked for human review', () => {
  const source = draft('needs_human_confirmation') as any;
  const payload = buildSeoDraftStoragePayload({
    seoPackDraft: source,
    agentInput: { product: { slug: source.product_truth.slug }, manual_focus: {}, metrics_status: {} } as any,
    agentOutput: { contract_version: 'seo_agent_output_v1' } as any,
    validationResult: {
      ok: true,
      issues: [],
      approval_blockers: ['keyword_selection_not_human_confirmed'],
      product_truth_blockers: ['keyword_selection_not_human_confirmed'],
    } as any,
  });

  assert.equal(payload.status, 'needs_human_review');
  assert.equal(payload.review_status, 'not_reviewed');
});
