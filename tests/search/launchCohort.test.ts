import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessLaunchCandidate, findSavedPrimaryOverlaps } from '../../lib/searchLaunchCohort.ts';

const inventory = JSON.parse(readFileSync('docs/search/inventory-capture-20260924.json', 'utf8'));
const capture = JSON.parse(readFileSync('docs/search/launch-scope-capture-20260924.json', 'utf8'));
const directive = JSON.parse(readFileSync('docs/search/owner-launch-scope-20260924.json', 'utf8'));
const first = directive.pilot_product_ids[0];
const fixture = () => ({
  product: structuredClone(inventory.products.find((p: { canonical_product_id: string }) => p.canonical_product_id === first)),
  draft: structuredClone(capture.drafts.find((d: { canonical_product_id: string }) => d.canonical_product_id === first)),
  bank: structuredClone(capture.bank), deferredIds: new Set<string>(),
});
test('compatible historical evidence selects work only; no publication, payment or input mutation', () => {
  const input = fixture(), before = JSON.stringify(input);
  const result = assessLaunchCandidate(input);
  assert.equal(result.state, 'candidate_preflight');
  assert.equal(result.cqa_status, 'not_run');
  assert.equal(result.can_publish, false); assert.equal(result.can_index, false); assert.equal(result.can_enable_checkout, false);
  assert.equal(JSON.stringify(input), before);
});
test('owner deferral uses exact family IDs and never a material-wide filter', () => {
  const input = fixture(); input.product.material = 'acrylic plastic mirror fabric';
  assert.equal(assessLaunchCandidate(input).state, 'candidate_preflight');
  input.deferredIds.add(first);
  assert.equal(assessLaunchCandidate(input).state, 'deferred_expansion');
  const ids = directive.deferred_groups.flatMap((g: { product_ids: string[] }) => g.product_ids);
  assert.equal(ids.length, 19); assert.equal(new Set(ids).size, 19);
  assert.ok(!ids.includes('40384eea-fd82-40f4-98e7-804383c42796'));
});
test('draft identity, current decision and modified offer signatures cannot inherit approval', () => {
  for (const field of ['canonical_product_id', 'source_decision_id']) {
    const input = fixture(); input.draft[field] = 'other';
    assert.equal(assessLaunchCandidate(input).state, 'review_backlog');
  }
  const input = fixture(); input.draft.current_focus.sellable_offer_signature += ':changed';
  assert.ok(assessLaunchCandidate(input).reasons.includes('offer_signature_not_covered'));
  input.draft.latest_decision_updated_at = '2099-01-01';
  assert.ok(assessLaunchCandidate(input).reasons.includes('decision_version_not_covered'));
});
test('missing/null/different-market evidence cannot be treated as a measured zero', () => {
  const input = fixture(); input.bank = [];
  assert.ok(assessLaunchCandidate(input).reasons.includes('primary_bank_evidence_unverified'));
  for (const value of [null, '10', NaN, -1]) {
    const changed = fixture(); changed.draft.primary_keywords[0].avg_monthly_searches = value;
    assert.ok(assessLaunchCandidate(changed).reasons.includes('primary_bank_evidence_unverified'));
  }
  const changed = fixture(); changed.draft.primary_keywords[0].region = 'AU';
  assert.ok(assessLaunchCandidate(changed).reasons.includes('primary_bank_evidence_unverified'));
});
test('actual stored zero is not missing demand and date changes cannot refresh the original evidence', () => {
  const input = fixture(), primary = input.draft.primary_keywords[0];
  primary.avg_monthly_searches = 0;
  input.bank.find((b: { id: string }) => b.id === primary.id).avg_monthly_searches = 0;
  assert.equal(assessLaunchCandidate(input).state, 'candidate_preflight');
  primary.last_checked = '2026-09-24';
  assert.ok(assessLaunchCandidate(input).reasons.includes('primary_bank_evidence_unverified'));
});
test('primary overlaps are scoped to market/language, deduplicated by product and do not assign an owner', () => {
  const d = fixture().draft;
  const peer = structuredClone(d); peer.canonical_product_id = 'peer';
  const foreign = structuredClone(d); foreign.canonical_product_id = 'foreign'; foreign.primary_keywords[0].region = 'AU';
  const overlaps = findSavedPrimaryOverlaps([d, peer, peer, foreign]);
  assert.equal(overlaps.length, 1); assert.equal(overlaps[0].product_ids.length, 2);
  assert.ok(!overlaps[0].product_ids.includes('foreign'));
});
test('all proposed pilot products preserve exact page IDs and pass only the offline prerequisites', () => {
  const deferredIds = new Set<string>(directive.deferred_groups.flatMap((g: { product_ids: string[] }) => g.product_ids));
  for (const id of directive.pilot_product_ids) {
    const product = inventory.products.find((p: { canonical_product_id: string }) => p.canonical_product_id === id);
    const draft = capture.drafts.find((d: { canonical_product_id: string }) => d.canonical_product_id === id);
    const result = assessLaunchCandidate({ product, draft, bank: capture.bank, deferredIds });
    assert.equal(result.state, 'candidate_preflight'); assert.equal(result.canonical_product_id, id);
    assert.equal(inventory.pages.filter((p: { canonical_product_id: string }) => p.canonical_product_id === id).length, 1);
  }
});
