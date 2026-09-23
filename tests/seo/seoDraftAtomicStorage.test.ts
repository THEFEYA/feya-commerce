import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { seoDraftRequestKey, insertSeoDraftWithEvent } from '../../lib/seoDraftAtomicStorage.ts';
import { normalizeReviewDraftForSeoPack } from '../../lib/seoReviewDraftNormalization.ts';
import { stampCurrentSeoEditorialPolicy } from '../../lib/seoEditorialPolicy.ts';
import { validateSeoReviewDraft } from '../../lib/seoReviewDraftValidation.ts';
import { reviewFlowFixture } from './helpers/review-flow-fixture.ts';
import { buildSavedDraftPreviewResult } from '../../lib/seoSavedDraftPreview.ts';

test('retry identity ignores object ordering but changes with content/evidence, and is product-scoped', () => {
  assert.equal(seoDraftRequestKey({a:1,b:{y:2,x:3}}), seoDraftRequestKey({b:{x:3,y:2},a:1}));
  assert.notEqual(seoDraftRequestKey({a:1}), seoDraftRequestKey({a:2}));
  assert.notEqual(seoDraftRequestKey({canonical_product_id:'one'},'client-key-01'), seoDraftRequestKey({canonical_product_id:'two'},'client-key-01'));
  assert.throws(() => seoDraftRequestKey({},''), /Idempotency-Key/);
});

test('missing atomic migration or malformed receipt fails closed with no second write path', async () => {
  let calls = 0;
  const missing = { rpc: async () => { calls++; return {data:null,error:{code:'PGRST202',message:'Atomic RPC missing'}}; } };
  const result = await insertSeoDraftWithEvent(missing, {});
  assert.equal(result.ok, false);
  assert.equal(result.draft, null);
  assert.equal(calls, 1);
  const bad = {rpc: async () => ({data:{draft:{id:'a'},event:{id:'event',draft_id:'b'}},error:null})};
  assert.equal((await insertSeoDraftWithEvent(bad,{})).ok, false);
});

test('new resave preview uses current policy and unchanged saved historical approval remains readable', () => {
  const row = JSON.parse(readFileSync(new URL('./fixtures/historical-approved-draft-20260923.json', import.meta.url),'utf8'));
  const original = JSON.stringify(row);
  const historical = buildSavedDraftPreviewResult(row);
  assert.equal(historical.saved_draft.review_status,'approved');
  assert.equal(historical.generated_draft_output.editorial_policy_version,undefined);
  const {draft} = reviewFlowFixture();
  const edited = stampCurrentSeoEditorialPolicy(normalizeReviewDraftForSeoPack(row.agent_output_snapshot,draft));
  const validation = validateSeoReviewDraft(edited,draft);
  assert.equal(validation.commercial_validation.editorial_policy_version,'brand_mission_v2');
  assert.equal(validation.ok,false);
  assert.equal(JSON.stringify(row),original);
});

test('resave preparation is stable and storage readiness includes keyword evidence blockers', () => {
  const {candidate,draft} = reviewFlowFixture();
  const output = stampCurrentSeoEditorialPolicy(normalizeReviewDraftForSeoPack(candidate,draft));
  const repeated = stampCurrentSeoEditorialPolicy(normalizeReviewDraftForSeoPack(output,draft));
  assert.deepEqual(repeated,output);
  assert.equal(validateSeoReviewDraft(output,draft).ok,true);
  const missingEvidence: typeof draft = {...draft,metrics_status:{status:'missing',validated_count:0,missing_metric_count:1,note:'Synthetic missing-evidence case'}};
  const result = validateSeoReviewDraft(output,missingEvidence);
  assert.equal(result.ok,false);
  assert.ok(result.review_draft_storage_blockers.includes('missing_validated_keyword_metric'));
  assert.equal(result.assembled_seo_pack.quality_gate.ready_for_storage,false);
  assert.equal(result.assembled_seo_pack.quality_gate.ready_for_publish,false);
});
