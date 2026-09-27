import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertReviewLiveSources, closedReviewMode, prepareReviewPresentation } from '../../lib/searchReviewPresentation.ts';
import { reviewHash, type ReviewRelease } from '../../lib/searchReviewRelease.ts';
import { inspectSearchEnvironment } from '../../lib/searchEnvironmentGate.ts';
import { defaultShopFilters, filterShopProducts, parseShopNavigation, shopPageHref, SHOP_PAGE_SIZE } from '../../lib/shopCatalogNavigation.ts';

const read = (path: string) => JSON.parse(readFileSync(path,'utf8'));
const source: ReviewRelease = read('docs/search/closed-review-source-manifest-20260924.json');
const binding = read('config/closed-review-presentation-binding.json');
const make = () => prepareReviewPresentation(source,binding.source_sha256);
function live() {
  return {
    drafts: source.entries.map(e => ({id:e.identity.draft_id,canonical_product_id:e.identity.canonical_product_id,
      status:'approved_draft',review_status:'approved',archived_at:null,updated_at:e.identity.draft_updated_at,
      seo_title:e.payload.metadata.title,h1:e.payload.draft.h1,meta_description:e.payload.metadata.description,intro:e.payload.draft.intro,
      agent_output_snapshot:{seo_title:e.payload.metadata.title,...structuredClone(e.payload.draft)}, human_review_notes:'PRIVATE_CANARY'})),
    pages: source.entries.map(e => ({seo_page_id:e.identity.seo_page_id,canonical_product_id:e.identity.canonical_product_id,
      url_path:e.payload.metadata.canonical_path,page_type:'product',portfolio_status:'active',lifecycle_state:'candidate'})),
    products: source.entries.map(e => ({canonical_product_id:e.identity.canonical_product_id,product_slug:e.product.product_slug})),
    productHolds: source.entries.map(e => ({canonical_product_id:e.identity.canonical_product_id,do_not_publish_flag:false})),
  };
}

test('sealed 207-entry projection preserves source IDs, approved copy, prices and exact owner material', () => {
  const before = reviewHash(source), p = make();
  assert.equal(p.presentation_sha256,binding.presentation_sha256); assert.equal(p.entries.length,207);
  assert.ok(!p.entries.some(e => e.identity.canonical_product_id==='d42dd678-7b11-4f38-890e-411de686f418'));
  for (const e of p.entries) {
    const original = source.entries.find(o => o.identity.canonical_product_id===e.identity.canonical_product_id)!;
    assert.deepEqual(e.copy,original.payload); assert.deepEqual(e.identity,original.identity);
    for (const c of e.product.configurations as Record<string,unknown>[]) {
      const raw = (original.product.configurations as Record<string,unknown>[]).find(x=>x.configuration_id===c.configuration_id)!;
      assert.ok(raw);
      for (const k of ['configuration_id','sellable_configuration_id','currency','base_price_amount','sale_price_amount','display_price_amount']) assert.equal(c[k],raw[k]);
    }
  }
  assert.equal(p.entries.find(e=>e.identity.canonical_product_id.startsWith('a83b1b51'))!.product.material,'Glossy Vegan Leather');
  assert.equal(reviewHash(source),before); assert.equal(p.can_enable_checkout,false);
  assert.equal(assertReviewLiveSources(p,live()),true);
});

test('pinned drafts survive unrelated edits; changed or revoked exact versions close the whole release', () => {
  const p=make(), data=live();
  assert.equal(assertReviewLiveSources(p,data),true);
  const mutations = [
    (d: typeof data) => {d.drafts[0].review_status='changes_requested';},
    (d: typeof data) => {d.drafts[0].status='draft_generated';},
    (d: typeof data) => {d.drafts[0].updated_at='2026-09-24T23:59:59.000001Z';},
    (d: typeof data) => {d.drafts[0].agent_output_snapshot.h1='Unapproved edit';},
    (d: typeof data) => {d.pages[0].url_path='/shop/moved';},
    (d: typeof data) => {d.pages[0].portfolio_status='retired';},
    (d: typeof data) => {d.products.pop();},
    (d: typeof data) => {d.productHolds[0].do_not_publish_flag=true;},
    (d: typeof data) => {d.drafts[1]=d.drafts[0];},
  ];
  for (const mutate of mutations) {const changed=structuredClone(data);mutate(changed);assert.throws(()=>assertReviewLiveSources(p,changed));}
  // Live product material is deliberately not merged into the captured display.
  const displayBefore=reviewHash(p); Object.assign(data.products[0],{material:'New draft material'});
  assert.equal(assertReviewLiveSources(p,data),true); assert.equal(reviewHash(p),displayBefore);
  assert.ok(!JSON.stringify(p).includes('PRIVATE_CANARY'));
});

test('closed review remains noindex for hostile flags and is blocked outside authenticated preview', () => {
  const env={FEYA_CLOSED_REVIEW_RELEASE:binding.release_id,VERCEL_ENV:'preview',FEYA_ADMIN_AUTH_REQUIRED:'true'};
  assert.equal(closedReviewMode(env,binding.release_id),'review');
  for (const patch of [{VERCEL_ENV:'production'},{FEYA_ADMIN_AUTH_REQUIRED:'false'},{FEYA_CLOSED_REVIEW_RELEASE:'unknown'}]) assert.equal(closedReviewMode({...env,...patch},binding.release_id),'blocked');
  assert.equal(closedReviewMode({},binding.release_id),'disabled');
  assert.equal(inspectSearchEnvironment({...env,VERCEL_ENV:'production',FEYA_SEARCH_INDEXING_ENABLED:'true',FEYA_CANONICAL_ORIGIN_CONFIRMED:'true',NEXT_PUBLIC_SITE_URL:'https://example.test'}).enabled,false);
});

test('eleven disjoint server pages cover exactly 207 visible products in stable order', () => {
  const products=make().entries.map(e=>e.product), list=filterShopProducts(products,defaultShopFilters());
  assert.equal(list.length,207);
  const ids=[];
  for(let page=1;page<=11;page++) {
    const url=new URL(shopPageHref(page),'https://example.test');
    const parsed=parseShopNavigation(Object.fromEntries(url.searchParams))!;
    assert.equal(parsed.page,page);
    ids.push(...list.slice((page-1)*SHOP_PAGE_SIZE,page*SHOP_PAGE_SIZE).map(p=>p.canonical_product_id));
  }
  assert.equal(ids.length,207); assert.equal(new Set(ids).size,207);
  assert.deepEqual(ids,products.map(p=>p.canonical_product_id));
});

test('filters round-trip in page links; invalid/ambiguous pages and unknown collection are rejected', () => {
  const f={...defaultShopFilters(),search:'gold armor',color:'Gold',occasion:['Stage','Festival'],collection:'armor',sort:'Price · high to low'};
  const url=new URL(shopPageHref(2,f),'https://example.test');
  assert.deepEqual(parseShopNavigation(Object.fromEntries(url.searchParams)),{page:2,filters:f});
  for(const page of ['0','-1','1.5','1e2','01','NaN','999999999999999999999']) assert.equal(parseShopNavigation({page}),null);
  assert.equal(parseShopNavigation({page:['1','2']}),null);
  assert.equal(parseShopNavigation({collection:'unknown'}),null);
  assert.equal(parseShopNavigation({min:'999',max:'1'}),null);
  assert.equal(shopPageHref(1),'/shop');
});
