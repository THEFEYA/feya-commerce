import assert from 'node:assert/strict';
import test from 'node:test';
import { applyUnmeasuredEditorialReviewIntent } from '../../lib/seoUnmeasuredEditorialReview.ts';
import { getSeoPackApprovalBlockers, getSeoPackReviewDraftStorageBlockers } from '../../lib/seoPackContract.ts';

function fixture() {
  const draft: any = {
    canonical_product_id: '32b1e29b-d709-4e00-a95c-6ad0b4c92704',
    source_decision_id: '2575b6c9-547c-4812-88e2-f3fe837ea225',
    status: 'blocked_by_product_mismatch',
    manual_focus: {
      component: ['shoulders', 'top', 'skirt', 'panties', 'arms', 'legs'],
      material: ['black', 'leather'], event: ['halloween', 'cosplay'],
      style: ['glam', 'punk', 'goth'], persona: [], audience: ['women'], exclude: [],
    },
    product_truth: {
      title: 'Black costume set', slug: 'black-costume-set',
      product_truth_source: 'seo_product_truth_v1',
      known_components: ['Top', 'Skirt', 'Shoulders'], included_components: ['Top', 'Skirt', 'Shoulders'],
      sellable_offer_components: ['Top', 'Skirt', 'Shoulders'],
      sellable_offer: { status: 'ready', source_available: true },
      sellable_offer_signature: 'current-sellable-offer',
    },
    keyword_roles: { primary: [], secondary: [], support: [], hold: [], reject: [] },
    keyword_selection: { status: 'needs_keyword_review' },
    metrics_status: { status: 'missing', validated_count: 0 },
    qa_checks: { product_specificity: 'pass', forbidden_mismatch: 'pass', validated_metrics: 'blocker' },
  };
  const source = {
    keywords: [], keywordBankWarning: null,
    decision: {
      decision_status: 'needs_keyword_review',
      manual_focus_json: { selection_verified: true, sellable_offer_signature: 'current-sellable-offer' },
    },
  };
  return { draft, source };
}

test('unmeasured editorial copy can be reviewed but cannot pass SEO Approval/Apply', () => {
  const { draft, source } = fixture();
  const result = applyUnmeasuredEditorialReviewIntent(draft, source);
  assert.deepEqual(getSeoPackReviewDraftStorageBlockers(result), []);
  const approval = getSeoPackApprovalBlockers(result);
  assert.ok(approval.includes('missing_validated_keyword_metric'));
  assert.ok(approval.includes('keyword_selection_not_human_confirmed'));
  assert.ok(approval.includes('qa_blocker_validated_metrics'));
  assert.equal(result.keyword_roles.primary[0].avg_monthly_searches, null);
  assert.equal(result.keyword_roles.primary[0].metric_source, null);
  assert.equal(result.qa_checks.validated_metrics, 'blocker');
  assert.equal(draft.keyword_roles.primary.length, 0);
});

test('changed focus, offer, decision, excluded phrase or bank failure cannot use this proposal', () => {
  for (const mutate of [
    (f: any) => { f.draft.manual_focus.event = ['rave']; },
    (f: any) => { f.draft.manual_focus.exclude = ['goth']; },
    (f: any) => { f.draft.source_decision_id = 'new-decision'; },
    (f: any) => { f.draft.canonical_product_id = 'another-product'; },
    (f: any) => { f.source.decision.manual_focus_json.sellable_offer_signature = 'stale'; },
    (f: any) => { f.source.decision.manual_focus_json.selection_verified = false; },
    (f: any) => { f.source.keywordBankWarning = 'database unavailable'; },
    (f: any) => { f.source.keywords = [{ keyword: 'new measured candidate' }]; },
    (f: any) => { f.draft.product_truth.sellable_offer.status = 'blocked'; },
  ]) {
    const f = fixture(); mutate(f);
    assert.equal(applyUnmeasuredEditorialReviewIntent(f.draft, f.source), f.draft);
    assert.ok(getSeoPackReviewDraftStorageBlockers(f.draft).length > 0);
  }
});
