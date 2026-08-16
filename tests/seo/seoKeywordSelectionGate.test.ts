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

test('current sellable offer is sufficient source evidence without legacy Etsy rows', () => {
  const current = draft('confirmed') as any;
  current.product_truth.source_description_fragment = '';
  current.product_truth.source_variations = [];
  current.product_truth.option_price_rows = [];
  current.product_truth.included_components = ['stale top'];
  current.product_truth.known_components = ['stale top'];
  current.product_truth.sellable_offer_components = ['Shoulders', 'Skirt'];
  current.product_truth.sellable_offer = {
    status: 'ready',
    source_available: true,
    component_labels: ['Shoulders', 'Skirt'],
    blockers: [],
  };
  current.keyword_roles.primary = [{ keyword: 'warrior armor costume' }];

  assert.equal(
    getSeoPackApprovalBlockers(current).includes('missing_source_configuration_evidence'),
    false,
  );
  assert.deepEqual(getSeoGenerationProductTruthBlockers(current), []);
});

test('ready current sellable offer supersedes stale legacy component warnings', () => {
  const current = draft('confirmed') as any;
  current.product_truth.included_components = ['Bodysuit', 'Tail'];
  current.product_truth.unresolved_component_facts = [
    { raw_option_value: 'Чехлы для передних конечностей', reason: 'legacy mapper did not recognize arm wording' },
  ];
  current.product_truth.component_review_blockers = [
    { blocker_code: 'legacy_configuration_component_family_null' },
  ];
  current.product_truth.sellable_offer_components = ['Forearm Covers', 'Tail', 'Bodysuit'];
  current.product_truth.sellable_offer = {
    status: 'ready',
    source_available: true,
    component_labels: ['Forearm Covers', 'Tail', 'Bodysuit'],
    blockers: [],
  };
  current.keyword_roles.primary = [{ keyword: 'halloween costumes with red bodysuit' }];

  assert.deepEqual(getSeoGenerationProductTruthBlockers(current), []);
  const approvalBlockers = getSeoPackApprovalBlockers(current);
  assert.equal(approvalBlockers.includes('unresolved_component_truth'), false);
  assert.equal(approvalBlockers.includes('component_review_blockers_present'), false);
  assert.equal(approvalBlockers.includes('composition_has_unresolved_facts'), false);
  assert.equal(approvalBlockers.includes('composition_has_review_blockers'), false);
});

test('approval fails closed when the current sellable offer is unresolved', () => {
  const unsafe = draft('confirmed') as any;
  unsafe.product_truth.sellable_offer_components = [];
  unsafe.product_truth.sellable_offer = {
    status: 'hold',
    source_available: true,
    component_labels: [],
    blockers: ['aggregate_members_unknown:full_set'],
  };

  const blockers = getSeoPackApprovalBlockers(unsafe);
  assert.ok(blockers.includes('option_truth_mismatch'));
  assert.ok(blockers.includes('aggregate_members_unknown:full_set'));
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

  unsafe.product_truth.included_components = ['Bodysuit', 'Leg Covers', 'Headpiece'];
  unsafe.product_truth.known_components = ['Bodysuit', 'Leg Covers', 'Headpiece'];
  unsafe.keyword_roles.primary = [{ keyword: 'black bodysuit halloween costume' }];
  assert.deepEqual(getSeoKeywordSelectionBlockers(unsafe), []);

  unsafe.product_truth.included_components = ['Shoulders', 'Harness', 'Skirt'];
  unsafe.product_truth.known_components = ['Shoulders', 'Harness', 'Skirt'];

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
