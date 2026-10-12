import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync('supabase/migrations/20261012180500_phase13_collection_card_fast_read_v1.sql','utf8');
const release=readFileSync('lib/searchLandingPageServer.ts','utf8');

test('fast collection model is strictly additive, versioned and service-only',()=>{
 assert.match(migration,/create view public\.feya_storefront_collection_cards_fast_v1/);
 assert.match(migration,/with \(security_invoker=true\)/);
 assert.match(migration,/revoke all on public\.feya_storefront_collection_cards_fast_v1 from public,anon,authenticated,service_role/);
 assert.match(migration,/grant select on public\.feya_storefront_collection_cards_fast_v1 to service_role/);
 assert.doesNotMatch(migration,/drop (?:table|view)|truncate|delete from|update public\.feya_commerce_/i);
 assert.doesNotMatch(release,/feya_storefront_collection_cards_fast_v1/);
});

test('fast model retains exact release pins and rejects stale or unpublished products',()=>{
 for(const marker of [
 'feya_storefront_product_card_snapshots_v1',
 'feya_storefront_approved_product_bindings_v1',
 'feya_commerce_seo_pack_drafts_v1',
 "d.status='approved_draft'",
 "d.review_status='approved'",
 'd.updated_at=b.draft_updated_at_snapshot',
 "sp.page_type='product'",
 "sp.portfolio_status='active'",
 'sp.url_path=b.url_path_snapshot',
 'coalesce(pd.do_not_publish_flag,false)=false',
 "s.source_release_ref='feya-review-207-20260924'",
 'actual_count<>207',
 'actual_distinct<>207',
 'missing_required<>0',
 ]) assert.ok(migration.includes(marker),marker);
});

test('fast collection source does not change options or mint new prices',()=>{
 for(const marker of [
 'feya_commerce_v_step7_storefront_products_api_v2',
 'feya_commerce_configuration_prices',
 'feya_commerce_sellable_configurations',
 'feya_commerce_source_price_rows',
 "coalesce(cp.sampler_excluded_flag,false)=false",
 "coalesce(cp.fallback_flag,false)=false",
 "coalesce(spr.fallback_flag,false)=false",
 "coalesce(spr.sampler_non_catalog_flag,false)=false",
 "full[[:space:]]*set",
 'min(cp.public_price_amount)',
 'fs.full_set_display_price_amount',
 'p.primary_image_url',
 'p.world_label',
 'p.color_options',
 ]) assert.ok(migration.includes(marker),marker);
 assert.doesNotMatch(migration,/\b(insert into|update|delete from)\s+public\.feya_commerce_(?:configuration_prices|source_price_rows)/i);
});
