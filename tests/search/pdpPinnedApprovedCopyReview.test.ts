import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  PDP_COPY_REVIEW_BRANCH,
  PDP_COPY_REVIEW_SAMPLES,
  isPdpCopyReviewDeployment,
  pdpCopyReviewSample,
} from '../../config/pdpCopyReviewSamples.ts';
import {selectApprovedStorefrontCopy} from '../../lib/seoApprovedStorefrontPolicy.ts';
import {approvedCopyHash,prepareApprovedContentProjection} from '../../lib/seoApprovedContentProjection.ts';

test('owner preview is constrained to ONE exact protected deployment branch',()=>{
  const env={
    VERCEL:'1',VERCEL_ENV:'preview',
    VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',
    VERCEL_GIT_COMMIT_REF:PDP_COPY_REVIEW_BRANCH,
  };
  assert.equal(isPdpCopyReviewDeployment(env),true);
  for(const bad of [
    {VERCEL_ENV:'production'}, {VERCEL_ENV:'development'},
    {VERCEL:'0'}, {VERCEL_PROJECT_ID:'another-project'},
    {VERCEL_GIT_COMMIT_REF:'main'},
    {FEYA_OWNER_PREVIEW_DISABLED:'true'},
  ])assert.equal(isPdpCopyReviewDeployment({...env,...bad}),false);
  assert.equal(isPdpCopyReviewDeployment({}),false);
});

test('five exact real product/draft pairs are unique and no unknown slug can be selected',()=>{
  assert.equal(PDP_COPY_REVIEW_SAMPLES.length,5);
  assert.equal(new Set(PDP_COPY_REVIEW_SAMPLES.map(x=>x.slug)).size,5);
  assert.equal(new Set(PDP_COPY_REVIEW_SAMPLES.map(x=>x.canonical_product_id)).size,5);
  assert.equal(new Set(PDP_COPY_REVIEW_SAMPLES.map(x=>x.pinned_draft_id)).size,5);
  for(const item of PDP_COPY_REVIEW_SAMPLES){
    assert.match(item.canonical_product_id,/^[0-9a-f-]{36}$/);
    assert.match(item.pinned_draft_id,/^[0-9a-f-]{36}$/);
    assert.equal(pdpCopyReviewSample(item.slug)?.pinned_draft_id,item.pinned_draft_id);
    assert.ok(item.slug.length<240);
  }
  assert.equal(pdpCopyReviewSample('unknown-item'),null);
});

test('approved payload is immutable and changes to text/approval identity fail by hash',()=>{
  const product={canonical_product_id:'10000000-0000-4000-8000-000000000001',product_slug:'approved-test-piece'};
  const page={seo_page_id:'20000000-0000-4000-8000-000000000002',
    canonical_product_id:product.canonical_product_id,url_path:'/shop/approved-test-piece'};
  const output={
    seo_title:'Approved test title',h1:'Approved test h1',
    meta_description:'Authentic artist-authored metadata',intro:'Authentic artist-authored intro',
    pdp_blocks:[
      {block_key:'about_this_piece',heading:'About this piece',placement:'left_description',body:'Actual text one.'},
      {block_key:'why_youll_love_it',heading:'Why you will love it',placement:'left_description',body:'Actual text two.'},
      {block_key:'ideal_for',heading:'Ideal for',placement:'left_description',body:'Actual text three.'},
      {block_key:'main_description',heading:'Made to order',placement:'left_description',body:'Actual text four.'},
    ],
  };
  const draft={
    id:'30000000-0000-4000-8000-000000000003',canonical_product_id:product.canonical_product_id,
    status:'approved_draft',review_status:'approved',archived_at:null,
    updated_at:'2026-09-20T13:40:55.234567+00:00',
    seo_title:output.seo_title,h1:output.h1,
    meta_description:output.meta_description,intro:output.intro,agent_output_snapshot:output,
  };
  const projection=prepareApprovedContentProjection({product,page,draft});
  assert.equal(projection.status,'prepared');
  assert.equal(projection.payload?.draft.pdp_blocks.length,4);
  assert.equal(projection.payload?.draft.pdp_blocks[0].body,'Actual text one.');
  assert.equal(projection.payload?.draft.pdp_blocks[3].body,'Actual text four.');
  const binding={
    canonical_product_id:product.canonical_product_id,
    seo_page_id:page.seo_page_id,draft_id:draft.id,url_path:page.url_path,
    content_sha256:approvedCopyHash(projection.payload!),
    draft_updated_at:draft.updated_at,
  };
  assert.deepEqual(selectApprovedStorefrontCopy({product,page,draft},binding),projection.payload);
  assert.equal(selectApprovedStorefrontCopy({product,page,draft:{
    ...draft,agent_output_snapshot:{...output,pdp_blocks:[{...output.pdp_blocks[0],body:'Tampered.'},...output.pdp_blocks.slice(1)]},
  }},binding),null);
  assert.equal(selectApprovedStorefrontCopy({product,page,draft},{...binding,
    draft_updated_at:'2026-09-20T13:40:56.234567+00:00'}),null);
  assert.equal(selectApprovedStorefrontCopy({product,page,draft:{...draft,review_status:'not_reviewed'}},binding),null);
});

test('pinned-copy source reader may not choose latest SEO draft or leak source to a browser',()=>{
  const source=readFileSync('lib/pdpPinnedApprovedCopyReviewServer.ts','utf8');
  assert.match(source,/import 'server-only'/);
  assert.match(source,/feya_storefront_approved_product_bindings_v1/);
  assert.match(source,/feya_commerce_seo_pack_drafts_v1/);
  assert.match(source,/sample\.pinned_draft_id/);
  assert.match(source,/draft_updated_at_snapshot/);
  assert.match(source,/selectApprovedStorefrontCopy/);
  assert.match(source,/approvedCopyHash/);
  assert.doesNotMatch(source,/(?:\bupsert\s*\(|\.update\s*\(|\.insert\s*\()/);
});

test('before and after have SAME frozen ProductDetailClient; after additionally shows atomic included members',()=>{
  const route=readFileSync('app/pdp-copy-review/[slug]/page.tsx','utf8');
  const index=readFileSync('app/pdp-copy-review/page.tsx','utf8');
  for(const source of [route,index]){
    assert.match(source,/robots:\{index:false,follow:false/);
    assert.match(source,/isPdpCopyReviewDeployment\(process\.env\)/);
    assert.match(source,/notFound\(\)/);
  }
  assert.match(route,/<ProductDetailClient/);
  assert.match(route,/product=\\{comparisonMode\\?withOwnerApprovedComponentReview\\(source\\.product\\):source\\.product\\}/);
  assert.match(route,/draft=\{comparisonMode\?source\.approvedCopy\.draft:null\}/);
  assert.match(route,/previewMode=\{false\}/);
  assert.match(index,/mode=before/);
  assert.match(index,/mode=after/);
  assert.doesNotMatch(route,/FEYA_SELLER_ONLINE_PAYMENTS_ENABLED/);
  assert.doesNotMatch(index,/FEYA_SELLER_ONLINE_PAYMENTS_ENABLED/);
});
