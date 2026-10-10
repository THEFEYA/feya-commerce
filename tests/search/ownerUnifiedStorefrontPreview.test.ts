import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  isOwnerUnifiedStorefrontPreview,
  OWNER_UNIFIED_PREVIEW_BRANCH,
  OWNER_UNIFIED_PREVIEW_PROJECT,
} from '../../lib/ownerUnifiedStorefrontPreview.ts';
import {isOwnerRealCartReviewDeployment} from '../../lib/commerceOwnerCartReview.ts';
import {isPdpCopyReviewDeployment,PDP_COPY_REVIEW_SAMPLES} from '../../config/pdpCopyReviewSamples.ts';
import {
  phase13PublicPdpCopyEnabled,
  PHASE13_PRODUCTION_PUBLISH_AUTHORIZED,
} from '../../lib/phase13PdpCopyReleaseGate.ts';

const good={
  VERCEL:'1',VERCEL_ENV:'preview',
  VERCEL_PROJECT_ID:OWNER_UNIFIED_PREVIEW_PROJECT,
  VERCEL_GIT_COMMIT_REF:OWNER_UNIFIED_PREVIEW_BRANCH,
};
const corpus={version:'approved-catalog-20260924-v1',count:207,sourceCount:208,suppressedCount:1};
const fixture='a'.repeat(64);

test('one exact owner-authenticated Vercel SSO preview branch unlocks EVERY review layer',()=>{
  assert.equal(isOwnerUnifiedStorefrontPreview(good),true);
  assert.equal(isOwnerRealCartReviewDeployment(good),true);
  assert.equal(isPdpCopyReviewDeployment(good),true);
  assert.equal(phase13PublicPdpCopyEnabled(good,corpus),true);
  assert.equal(PDP_COPY_REVIEW_SAMPLES.length,5);
  assert.equal(OWNER_UNIFIED_PREVIEW_BRANCH,'work/owner-unified-storefront-review-20261010');
  assert.equal(OWNER_UNIFIED_PREVIEW_PROJECT,'prj_ePIymo4sUG33wrRjHBxWrSlaxPID');
  assert.equal(PHASE13_PRODUCTION_PUBLISH_AUTHORIZED,false);
});
test('no ordinary URL/other branch/production/development/user header can reveal live bag, approved copy or review hub',()=>{
  for(const bad of [
    {VERCEL:'0'},{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},
    {VERCEL_PROJECT_ID:'other-project'},{VERCEL_GIT_COMMIT_REF:'main'},
    {VERCEL_GIT_COMMIT_REF:'work/no-preview'},
    {VERCEL_GIT_COMMIT_REF:'work/collections-home-scale-owner-preview-20261010'},
    {VERCEL_GIT_COMMIT_REF:'work/pdp-pinned-approved-copy-owner-review-20261010'},
    {FEYA_OWNER_PREVIEW_DISABLED:'true'},
  ]){
    const env={...good,...bad};
    assert.equal(isOwnerUnifiedStorefrontPreview(env),false,JSON.stringify(bad));
    // These legacy URLs may remain independently valid in their original
    // exact branches; their legacy review feature never enables real bag.
    assert.equal(isOwnerRealCartReviewDeployment(env),false,JSON.stringify(bad));
    assert.equal(phase13PublicPdpCopyEnabled(env,corpus),false,JSON.stringify(bad));
  }
  assert.equal(isOwnerUnifiedStorefrontPreview({}),false);
  assert.equal(isOwnerRealCartReviewDeployment({}),false);
  assert.equal(phase13PublicPdpCopyEnabled({},corpus),false);
  // Even an exact copied Production release token cannot enable public copy
  // because the independent Git-based owner publish authorization is still OFF.
  assert.equal(phase13PublicPdpCopyEnabled({
    VERCEL:'1',VERCEL_ENV:'production',
    FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE:'phase13-owner-approved-pdp207-20261010-v1',
    FEYA_PUBLIC_APPROVED_PDP_OWNER_SIGNOFF:'approved-2026-10-10',
  },corpus),false);
});
test('the unified owner page is NOINDEX, 404 except exact branch, and has all independently gated review links',()=>{
 const source=readFileSync('app/owner-review/page.tsx','utf8');
 assert.match(source,/robots:\{index:false,follow:false,nocache:true,noarchive:true\}/);
 assert.match(source,/isOwnerUnifiedStorefrontPreview\(process\.env\)/);
 assert.match(source,/if\(!isOwnerUnifiedStorefrontPreview\(process\.env\)\)notFound\(\)/);
 assert.match(source,/PDP_COPY_REVIEW_SAMPLES\.map/);
 for(const route of ['/cart','/pdp-copy-review','/collections-review','/shipping-review','/contact-review','/checkout-review']){
   assert.ok(source.includes(route),route);
 }
 assert.match(source,/href=\{'\/shop\/\'\+p\.slug\}/);
 assert.match(source,/€5/);
 assert.match(source,/207/);
 assert.match(source,/Оплата выключена/);
 assert.doesNotMatch(source,/<iframe|<form|createOrder|checkout\.pay|PaymentIntent|upsert\(|execute_sql/);
});
test('original user-frozen PDP/catalog source and actual first-sale checkout remain unaffected',()=>{
 const source=readFileSync('app/shop/[slug]/page.tsx','utf8');
 const productDetail=readFileSync('components/ProductDetailClient.tsx','utf8');
 const originalCart=readFileSync('app/cart/page.tsx','utf8');
 const collection=readFileSync('app/collections-review/page.tsx','utf8');
 const phase13=readFileSync('lib/phase13PdpCopyReleaseGate.ts','utf8');
 assert.match(source,/readExactPublicApprovedPdpCopy\(slug\)/);
 assert.match(source,/releaseRobotsForPath\(path\)/);
 assert.match(productDetail,/const includedLines = storefrontIncludedOptions\(p, activeConfig\)/);
 assert.match(originalCart,/Online checkout is not active yet/);
 assert.match(originalCart,/robots:\{index:false,follow:false\}/);
 assert.match(collection,/isOwnerUnifiedStorefrontPreview\(process\.env\)/);
 assert.match(collection,/VERCEL_GIT_COMMIT_REF===BRANCH/);
 assert.match(phase13,/PHASE13_PRODUCTION_PUBLISH_AUTHORIZED=false/);
 assert.doesNotMatch(source,/FEYA_SELLER_ONLINE_PAYMENTS_ENABLED=true/);
});
test('cart storage stays one same-origin key and no private address is saved by preview UI',()=>{
 const realCart=readFileSync('components/CartOwnerLiveReviewClient.tsx','utf8');
 const parser=readFileSync('lib/commerceOwnerCartReview.ts','utf8');
 const pdp=readFileSync('components/ProductDetailClient.tsx','utf8');
 assert.match(parser,/OWNER_CART_STORAGE_KEY='feya_visual_cart_v1'/);
 assert.match(pdp,/feya_visual_cart_v1/);
 assert.match(realCart,/OWNER_CART_STORAGE_KEY/);
 assert.match(realCart,/totals\.show_handling_fee&&/);
 assert.match(realCart,/Additional packaging for multiple items/);
 assert.match(realCart,/amount_due_minor/);
 assert.doesNotMatch(realCart,/fetch\(|sendBeacon\(|FormData\(/);
 assert.doesNotMatch(realCart,/localStorage\.setItem\([^\n]*email/);
});
