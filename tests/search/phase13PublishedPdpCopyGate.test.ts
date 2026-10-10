import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 phase13PublicPdpCopyEnabled,
 PHASE13_PDP_COPY_PUBLIC_RELEASE,PHASE13_SOURCE_RELEASE,
 PHASE13_REQUIRED_PIN_COUNT,
 PHASE13_APPROVED_SOURCE_ROW_COUNT,PHASE13_OWNER_SUPPRESSED_DUPLICATE_ID,
} from '../../lib/phase13PdpCopyReleaseGate.ts';

const pins=JSON.parse(readFileSync('config/approved-content-review-bindings.json','utf8')) as {
 version:string;mode:string;can_publish:boolean;can_index:boolean;
 entries:Array<{canonical_product_id:string;seo_page_id:string;draft_id:string;url_path:string;content_sha256:string;draft_updated_at:string}>;
};
const livePins=pins.entries.filter(x=>x.canonical_product_id!==PHASE13_OWNER_SUPPRESSED_DUPLICATE_ID);
const cohort={version:pins.version,count:livePins.length,sourceCount:pins.entries.length,suppressedCount:pins.entries.length-livePins.length};
const gitBlobSha=(input:Buffer)=>createHash('sha1')
 .update(Buffer.from(`blob ${input.length}\0`)).update(input).digest('hex');

test('the historical review-only source cannot silently switch on a public or indexable release',()=>{
  assert.equal(pins.mode,'authenticated_review_only');
  assert.equal(pins.can_publish,false);
  assert.equal(pins.can_index,false);
  assert.equal(pins.entries.length,PHASE13_APPROVED_SOURCE_ROW_COUNT);
  assert.equal(livePins.length,PHASE13_REQUIRED_PIN_COUNT);
  assert.equal(cohort.suppressedCount,1);
  assert.ok(pins.entries.some(x=>x.canonical_product_id===PHASE13_OWNER_SUPPRESSED_DUPLICATE_ID));
  assert.ok(!livePins.some(x=>x.canonical_product_id===PHASE13_OWNER_SUPPRESSED_DUPLICATE_ID));
  assert.equal(new Set(pins.entries.map(x=>x.canonical_product_id)).size,208);
  assert.equal(new Set(livePins.map(x=>x.canonical_product_id)).size,207);
  assert.equal(new Set(pins.entries.map(x=>x.draft_id)).size,208);
  assert.equal(new Set(livePins.map(x=>x.draft_id)).size,207);
  assert.equal(new Set(pins.entries.map(x=>x.url_path)).size,208);
  assert.equal(new Set(livePins.map(x=>x.url_path)).size,207);
  assert.equal(new Set(pins.entries.map(x=>x.seo_page_id)).size,208);
  assert.equal(new Set(livePins.map(x=>x.seo_page_id)).size,207);
  assert.equal(PHASE13_SOURCE_RELEASE,'feya-review-207-20260924');
  for(const row of pins.entries){
    assert.match(row.canonical_product_id,/^[0-9a-f-]{36}$/);
    assert.match(row.draft_id,/^[0-9a-f-]{36}$/);
    assert.match(row.content_sha256,/^[a-f0-9]{64}$/);
    assert.match(row.url_path,/^\/shop\/[a-z0-9-]+$/);
    assert.ok(typeof row.draft_updated_at==='string'&&row.draft_updated_at.length>20);
  }
});
test('a PUBLIC approved PDP content release requires two exact owner/production secrets and the complete 207-pin identity',()=>{
  const valid={
    VERCEL:'1',VERCEL_ENV:'production',
    FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE:PHASE13_PDP_COPY_PUBLIC_RELEASE,
    FEYA_PUBLIC_APPROVED_PDP_OWNER_SIGNOFF:'approved-2026-10-10',
  };
  const correct=cohort;
  assert.equal(phase13PublicPdpCopyEnabled(valid,correct),true);
  assert.equal(phase13PublicPdpCopyEnabled({},correct),false);
  for(const invalid of [
   {VERCEL:'0'}, {VERCEL_ENV:'preview'}, {VERCEL_ENV:'development'},
   {FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE:'off'},
   {FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE:'approved-catalog-20260924-v1'},
   {FEYA_PUBLIC_APPROVED_PDP_OWNER_SIGNOFF:'false'},
  ])assert.equal(phase13PublicPdpCopyEnabled({...valid,...invalid},correct),false);
  for(const invalid of [
   {...cohort,version:'unknown'},{...cohort,count:206},{...cohort,count:208},
   {...cohort,sourceCount:207},{...cohort,suppressedCount:0},
  ])assert.equal(phase13PublicPdpCopyEnabled(valid,invalid),false);
});
test('new source is strictly server-only, always selects pinned DRAFT, PAGE and current BINDING, verifies all details',()=>{
  const source=readFileSync('lib/seoPublishedPinnedPdpServer.ts','utf8');
  assert.match(source,/import 'server-only'/);
  for(const expected of [
   'feya_storefront_approved_product_bindings_v1','feya_commerce_seo_pack_drafts_v1',
   'feya_commerce_seo_pages_v1','maybeSingle()','archived_at','source_release_ref',
   'product_slug_snapshot','url_path_snapshot','draft_updated_at','content_sha256',
   'selectApprovedStorefrontCopy','approvedCopyHash','pdp_blocks',
  ])assert.ok(source.includes(expected),expected);
  assert.doesNotMatch(source,/\.upsert\(|\.update\(|\.insert\(|\.delete\(|generateObject|OpenAI/);
  assert.match(source,/cache\(async\(slug:string\)/);
  assert.match(source,/if\(!phase13PublicPdpCopyEnabled\(process\.env,corpus\)\)return null/);
});
test('current owner visual freeze retains exact ProductDetailClient/header/cards and updates ONLY PDP server data wiring',()=>{
  const visual=JSON.parse(readFileSync('config/product-os-ui-freeze.json','utf8')) as {files:Record<string,string>};
  for(const name of [
   'components/ProductDetailClient.tsx','components/ShopClient.tsx','components/Header.tsx',
   'app/page.tsx','app/shop/page.tsx','app/shop/[slug]/page.tsx',
  ]){
   assert.equal(gitBlobSha(readFileSync(name)),visual.files[name],name);
  }
  assert.equal(visual.files['components/ProductDetailClient.tsx'],'729514b30288a38429bad3900c025c69d452eea1');
  const page=readFileSync('app/shop/[slug]/page.tsx','utf8');
  assert.match(page,/readExactPublicApprovedPdpCopy\(slug\)/);
  assert.match(page,/withOwnerApprovedComponentReview\(result\.product\)/);
  assert.match(page,/approvedPublicCopy: approved\?\.status==='published'/);
  assert.match(page,/!allowHybridPreviewCommerce && !approvedPublicCopy/);
  assert.match(page,/releaseRobotsForPath\(path\)/);
  assert.match(page,/sourcePinnedCopy\?\.copy\.metadata\.title\|\|metadata\.title/);
  assert.match(page,/sourcePinnedCopy\?\.copy\.metadata\.description\|\|metadata\.description/);
});
test('published content only reaches the current PDP props; existing review and disabled modes remain separate',()=>{
  const server=readFileSync('lib/seoApprovedStorefrontServer.ts','utf8');
  assert.match(server,/if \(mode === 'disabled'\)/);
  assert.match(server,/readExactPublicApprovedPdpCopy/);
  assert.match(server,/published\.canonical_product_id===product\.canonical_product_id/);
  assert.match(server,/\{status:'published',copy:published\.copy,offerSnapshot:null\}/);
  assert.match(server,/if \(mode === 'blocked'\) return blocked\(\)/);
  assert.match(server,/getAdminServiceClient\(\)/);
  const page=readFileSync('app/shop/[slug]/page.tsx','utf8');
  assert.match(page,/approvedPublicCopy, copyBlocked/);
  // Runtime exact result is request-cache backed and public robots are not
  // mutated to index with a newer copy release.
  assert.match(page,/readCachedStorefrontProductMetadataV1\(slug\)/);
  assert.doesNotMatch(page,/robots:\{index:true,follow:true\}/);
});
