import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

test('only the collection product-card read switches; SEO ownership and release remain pinned',()=>{
 const source=read('lib/searchLandingPageServer.ts');
 assert.ok(source.includes("from '@/lib/collectionCardFastReadModel'"));
 assert.ok(source.includes('.from(COLLECTION_FAST_VIEW)'));
 assert.ok(source.includes('.select(COLLECTION_FAST_SELECT)'));
 assert.ok(!source.includes('STOREFRONT_V4_CARD_SELECT'));
 assert.ok(!source.includes('STOREFRONT_VIEW_V4'));
 for(const contract of [
  'readSearchReleasePathState',
  'SEARCH_LANDING_ACTIVE_RELEASE_VERSION_MISMATCH',
  'SEARCH_LANDING_ACTIVE_RELEASE_MEMBERSHIP_MISMATCH',
  'SEARCH_LANDING_ACTIVE_RELEASE_CONTENT_HASH_MISMATCH',
  "eq('eligibility_status','eligible')",
  "eq('orderability_status','confirmed')",
  'SEARCH_LANDING_MEMBERSHIP_COUNT_MISMATCH',
  "SEARCH_LANDING_STOREFRONT_PARITY_FAILED",
  'attachStorefrontFacets',
  "STOREFRONT_CACHE_TAGS.catalog",
 ]) assert.ok(source.includes(contract),contract);
});

test('fast collection select carries exactly the original rendered card data',()=>{
 const module=read('lib/collectionCardFastReadModel.ts');
 const migration=read('supabase/migrations/20261012180500_phase13_collection_card_fast_read_v1.sql');
 assert.ok(module.includes("import 'server-only'"));
 assert.ok(module.includes("feya_storefront_collection_cards_fast_v1"));
 const required=[
 'canonical_product_id','product_slug','card_title','h1','seo_title','meta_description',
 'primary_image_url','primary_image_alt','secondary_image_url','hover_image_url',
 'media_count','has_video','video_url','min_price','max_price','currency',
 'full_set_display_price_amount','category_label','world_label','canonical_color_label',
 'color_options','material','color','product_type',
 ];
 for(const x of required){
   assert.ok(module.includes("'"+x+"'"),x);
   assert.ok(migration.includes(x),x);
 }
 assert.ok(!module.includes("'configurations'"));
 assert.ok(!module.includes("'media_gallery'"));
 assert.ok(!module.includes('createPaymentSession'));
 assert.ok(!module.includes('service_role'));
});

test('Search v12 actual collection route, Home/Shop source and owner visuals are unchanged',()=>{
 const collection=read('app/collections/[slug]/page.tsx');
 const shop=read('lib/storefrontCatalogCacheServer.ts');
 assert.ok(collection.includes('releaseRobotsForPath'));
 assert.ok(collection.includes('readCachedSearchLandingRelease'));
 assert.ok(shop.includes('readApprovedStorefrontCardProductsV1'));
 assert.ok(read('app/shipping-public-v13/page.tsx').includes('OwnerSellerOnlinePartnerDetails'));
 assert.ok(!read('components/Footer.tsx').includes('OwnerSellerOnlinePartnerDetails'));
});
