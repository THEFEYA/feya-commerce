import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareReviewRelease, assertReviewReleaseIntegrity, reviewHash } from '../../lib/searchReviewRelease.ts';
import { approvedCopyHash, type ApprovedCopyPayload } from '../../lib/seoApprovedContentProjection.ts';

function fixture() {
  const copies = ['a','b','c'].map(id => {
    const payload: ApprovedCopyPayload = { metadata:{title:id,description:id,canonical_path:`/shop/${id}`},
      draft:{h1:id,intro:id,meta_description:id,pdp_blocks:[]} };
    return {identity:{canonical_product_id:id,seo_page_id:`page-${id}`,draft_id:`draft-${id}`,
      draft_updated_at:'2026-09-24T10:00:00.123456Z',content_sha256:approvedCopyHash(payload)},payload};
  });
  return {release_id:'review-test',captured_at:'2026-09-24T10:00:00Z',source_commit:'a'.repeat(40),correction_commit:'a'.repeat(40),
    expected_source_count:3,copies,products:['a','b','c'].map(id=>({canonical_product_id:id,product_slug:id,configurations:[],media_gallery:[]})),
    decisions:[{decision_id:'dedupe-a',action:'suppress_duplicate_in_future_storefront' as const,source:copies[0].identity,retained:copies[1].identity}]};
}
test('one suppression retains source identities and all authority remains closed',()=>{
  const m=prepareReviewRelease(fixture());
  assert.deepEqual(assertReviewReleaseIntegrity(m,m.manifest_sha256),{source_count:3,visible_count:2,suppressed_count:1,can_publish:false,can_index:false,can_enable_checkout:false});
  assert.equal(m.suppressed[0].canonical_product_id,'a');
  assert.deepEqual(m.entries.map(e=>e.identity.canonical_product_id),['b','c']);
});
test('missing and repeated product rows fail instead of silently shrinking the release',()=>{
  const f=fixture();f.products.pop();assert.throws(()=>prepareReviewRelease(f),/incomplete/);
  const g=fixture();g.products[2]=g.products[0];assert.throws(()=>prepareReviewRelease(g),/duplicate/);
});
test('changed text, moved route and stale suppression evidence fail',()=>{
  const f=fixture();f.copies[1].payload.draft.intro='changed';assert.throws(()=>prepareReviewRelease(f),/binding/);
  const g=fixture();g.products[1].product_slug='changed';assert.throws(()=>prepareReviewRelease(g),/binding/);
  const h=fixture();h.decisions[0].retained={...h.decisions[0].retained,draft_id:'new'};assert.throws(()=>prepareReviewRelease(h),/scope/);
});
test('prepared manifest does not retain mutable references to subsequent edits',()=>{
  const f=fixture(),m=prepareReviewRelease(f);f.copies[1].payload.draft.intro='new draft';f.products[1].product_slug='changed';
  assert.equal(m.entries[0].payload.draft.intro,'b');assert.equal(m.entries[0].product.product_slug,'b');
  assert.doesNotThrow(()=>assertReviewReleaseIntegrity(m,m.manifest_sha256));
});
test('a self-rehashed tampered manifest cannot replace the trusted release hash',()=>{
  const m=prepareReviewRelease(fixture()),trusted=m.manifest_sha256;
  m.entries[0].payload.draft.intro='changed';
  const {manifest_sha256:_,...rest}=m;m.manifest_sha256=reviewHash(rest);
  assert.throws(()=>assertReviewReleaseIntegrity(m,trusted),/integrity/);
});
test('private or unknown fields cannot enter a future public projection',()=>{
  const f=fixture();Object.assign(f.products[0],{notes:'PRIVATE_CANARY'});assert.throws(()=>prepareReviewRelease(f),/private/);
  const g=fixture();Object.assign(g.copies[1].payload.draft,{human_review_notes:'PRIVATE_CANARY'});assert.throws(()=>prepareReviewRelease(g),/private/);
});
test('correction code identity and stable hashing are reproducible',()=>{
  assert.equal(reviewHash({b:2,a:1}),reviewHash({a:1,b:2}));
  assert.notEqual(reviewHash(['a','b']),reviewHash(['b','a']));
  const f=fixture();f.correction_commit='';assert.throws(()=>prepareReviewRelease(f),/identity/);
  assert.equal(prepareReviewRelease(fixture()).manifest_sha256,prepareReviewRelease(fixture()).manifest_sha256);
});
