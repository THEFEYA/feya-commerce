import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSellerOnlineReadOnlyReview } from '../../lib/sellerOnlineReviewAccess.ts';

const authorized = {
  VERCEL:'1', VERCEL_ENV:'preview',
  VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',
  VERCEL_GIT_COMMIT_REF:'work/bonanza-color-variants-20261020',
};

test('Seller Online preview review does not grant access on production or another branch',()=>{
  assert.equal(isSellerOnlineReadOnlyReview(authorized),true);
  for(const patch of [
    {VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL:'0'},
    {VERCEL_PROJECT_ID:'wrong'},{VERCEL_GIT_COMMIT_REF:'main'},
    {VERCEL_GIT_COMMIT_REF:'work/seller-online-public-contact-disclosure-20261021'},
    {FEYA_OWNER_PREVIEW_DISABLED:'true'},
  ])assert.equal(isSellerOnlineReadOnlyReview({...authorized,...patch}),false);
  assert.equal(isSellerOnlineReadOnlyReview({}),false);
});

test('Seller Online preview admin middleware is read-only, noindex and avoids login wall',()=>{
  const middleware=readFileSync('middleware.ts','utf8');
  const adminServer=readFileSync('lib/adminServerData.ts','utf8');
  assert.ok(middleware.includes('isSellerOnlineReadOnlyReview(process.env)'));
  assert.ok(middleware.includes("target.pathname = '/admin'"));
  assert.ok(middleware.includes("['GET','HEAD'].includes(request.method)"));
  assert.ok(middleware.includes('seller_online_review_read_only'));
  assert.ok(middleware.includes("status:423"));
  assert.ok(middleware.includes('noindex, nofollow, noarchive'));
  assert.ok(adminServer.includes('isSellerOnlineReadOnlyReview(process.env)'));
  assert.ok(adminServer.includes('ownerPreviewReadFetch(fetch,url)'));
  assert.ok(!adminServer.includes('SUPABASE_SERVICE_ROLE_KEY ='));
});
