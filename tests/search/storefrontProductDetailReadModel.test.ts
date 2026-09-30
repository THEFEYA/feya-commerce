import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('approved PDP read model is exact-corpus, service-only and wired through the Phase 6 public cache',()=>{
  const migration=readFileSync('supabase/migrations/20261001000500_storefront_product_detail_read_model_v1.sql','utf8');
  const loader=readFileSync('lib/storefrontProductDetailReadModelServer.ts','utf8');
  const presentation=readFileSync('lib/storefrontProductPresentationServer.ts','utf8');
  const pdp=readFileSync('app/shop/[slug]/page.tsx','utf8');

  for(const invariant of [
    'feya_storefront_product_details_v1',
    "b.source_release_ref='feya-review-207-20260924'",
    'd.updated_at=b.draft_updated_at_snapshot',
    'sp.url_path=b.url_path_snapshot',
    'coalesce(pd.do_not_publish_flag,false)=false',
    'feya_commerce_v_step7_product_media_gallery_fast_v1',
    'revoke all on public.feya_storefront_product_details_v1 from public,anon,authenticated,service_role',
    'grant select on public.feya_storefront_product_details_v1 to service_role',
    'FEYA_DETAIL_READ_MODEL_COUNT_MISMATCH',
  ]) assert.ok(migration.includes(invariant),invariant);

  assert.ok(loader.includes("import 'server-only'"));
  assert.ok(loader.includes('applyOwnerReviewedStorefrontCorrections'));
  assert.ok(loader.includes("row.url_path_snapshot !== '/shop/' + cleanSlug"));
  assert.ok(loader.includes('Array.isArray(product.configurations)'));
  assert.ok(loader.includes('Array.isArray(product.media_gallery)'));

  assert.match(presentation,/'use cache'/);
  assert.match(presentation,/cacheLife\('max'\)/);
  assert.match(presentation,/readApprovedStorefrontProductDetailV1\(slug\)/);
  assert.match(presentation,/storefrontCacheTagForProduct/);
  assert.match(presentation,/STOREFRONT_CACHE_TAGS\.catalog/);
  assert.match(presentation,/STOREFRONT_CACHE_TAGS\.collections/);

  assert.match(pdp,/export const instant = true/);
  assert.match(pdp,/readCachedStorefrontProductPresentation/);
  assert.doesNotMatch(pdp,/STOREFRONT_VIEW_V[1-4]|STOREFRONT_MEDIA_FAST_VIEW|attachMedia\(/);
  assert.doesNotMatch(pdp,/await connection\(\)/);
});
