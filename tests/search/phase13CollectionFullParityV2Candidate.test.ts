import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('supabase/migrations/20261015120500_phase13_collection_exact_fast_v2.sql','utf8');
const reader=readFileSync('lib/collectionCardFastReadModel.ts','utf8');
const searchReader=readFileSync('lib/searchLandingPageServer.ts','utf8');

test('Phase13 collection V2 is additive and has exact field parity plus service-only ACL',()=>{
 assert.ok(source.includes('create view public.feya_storefront_collection_cards_fast_v2'));
 assert.ok(source.includes('with (security_invoker=true)'));
 assert.ok(source.includes('from public.feya_storefront_product_cards_fast_v3 v'));
 assert.ok(source.includes('join public.feya_commerce_product_drafts pd'));
 for(const field of [
  'pd.card_title','pd.h1','pd.seo_title','pd.meta_description',
  'pd.matched_etsy_listing_id','pd.source_url','pd.size_mode','pd.production_profile',
  'pd.shipping_profile','pd.handmade_flag','pd.styled_imagery_flag',
  'v.primary_image_url','v.primary_image_alt','v.secondary_image_url',
  'v.hover_image_url','v.video_url','v.min_price','v.max_price',
  'v.category_label','v.world_label','v.canonical_color_label','v.color_options'
 ]) assert.ok(source.includes(field),field);
 for(const priceGate of ['cp.sampler_excluded_flag,false','cp.fallback_flag,false',
  'spr.fallback_flag,false','spr.sampler_non_catalog_flag,false',
  'full_set_display_price_amount']){
  assert.ok(source.includes(priceGate),priceGate);
 }
 for(const gate of ['FEYA_PHASE13_COLLECTION_V2_COUNT_PARITY_FAILED',
  'FEYA_PHASE13_COLLECTION_V2_FIELD_PARITY_FAILED',
  'FEYA_PHASE13_COLLECTION_V2_ACL_FAILED']){
  assert.ok(source.includes(gate),gate);
 }
 assert.ok(source.includes('grant select on public.feya_storefront_collection_cards_fast_v2 to service_role'));
 assert.ok(!source.includes('create or replace view'));
 assert.ok(!source.includes('drop view'));
 assert.ok(!source.includes('update public.'));
 assert.ok(!source.includes('FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE='));
});

test('public collection reader remains original V1 until an independent controlled switch',()=>{
 assert.ok(reader.includes("COLLECTION_FAST_VIEW='feya_storefront_collection_cards_fast_v1'"));
 assert.ok(searchReader.includes('.from(COLLECTION_FAST_VIEW)'));
 assert.ok(searchReader.includes("SEARCH_LANDING_STOREFRONT_PARITY_FAILED"));
 assert.ok(searchReader.includes('readSearchReleasePathState(urlPath)'));
});
