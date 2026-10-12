import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=(path:string)=>readFileSync(path,'utf8');

test('Phase13 P1 changes only Home/Shop input view, not approved card projections or caching',()=>{
 const reader=src('lib/storefrontCardReadModelServer.ts');
 const view=src('supabase/migrations/20261012193000_phase13_fast_pinned_card_view_v2.sql');
 const cache=src('lib/storefrontCatalogCacheServer.ts');
 const home=src('lib/homePresentationServer.ts');
 assert.ok(reader.includes("STOREFRONT_CARD_READ_MODEL_V1 = 'feya_storefront_product_cards_fast_v2'"));
 assert.ok(reader.includes('STOREFRONT_CARD_READ_MODEL_EXPECTED_COUNT = 207'));
 for(const key of ['card_title','card_display_price_amount','approved_content_sha256',
  'primary_image_url','membership_codes','facet_contract_version','facet_snapshot_hash'])
  assert.ok(reader.includes("'"+key+"'"),key);
 assert.ok(view.includes('create view public.feya_storefront_product_cards_fast_v2'));
 assert.ok(view.includes('feya_storefront_collection_cards_fast_v1 live'));
 assert.ok(!view.includes('feya_commerce_v_step7_storefront_products_api_v4 live'));
 assert.ok(view.includes('grant select on public.feya_storefront_product_cards_fast_v2 to service_role'));
 assert.ok(view.includes('security_invoker=true'));
 assert.ok(cache.includes('readApprovedStorefrontCardProductsV1'));
 assert.ok(cache.includes("cacheLife('max')"));
 assert.ok(home.includes('readCachedApprovedStorefrontCatalogV1'));
});

test('no PDP copy or user-approved left/right visual/content contracts changed by P1',()=>{
 const pdp=src('components/ProductDetailClient.tsx');
 const source=src('app/shop/[slug]/page.tsx');
 const gate=src('lib/phase13PdpCopyReleaseGate.ts');
 assert.ok(pdp.includes("GENERATED_DESCRIPTION_BLOCK_ORDER"));
 assert.ok(pdp.includes("placement === 'left_description'"));
 assert.ok(pdp.includes('resolveThefeyaRightPdpPanel'));
 assert.ok(pdp.includes('<GeneratedDescription'));
 assert.ok(source.includes('readExactPublicApprovedPdpCopy'));
 assert.ok(source.includes('ProductDetailClient'));
 assert.ok(gate.includes('PHASE13_REQUIRED_PIN_COUNT=207'));
 assert.ok(!src('components/Footer.tsx').includes('OwnerSellerOnlinePartnerDetails'));
 assert.ok(src('app/shipping-public-v13/page.tsx').includes('OwnerSellerOnlinePartnerDetails'));
});

test('no payment, booking, SEO indexation, product prices, variant or site-design change',()=>{
 const reader=src('lib/storefrontCardReadModelServer.ts');
 const pdp=src('app/shop/[slug]/page.tsx');
 assert.ok(pdp.includes('releaseRobotsForPath'));
 assert.ok(reader.includes("STOREFRONT_CARD_READ_MODEL_FACET_CONTRACT"));
 assert.ok(!reader.includes("createPaymentSession"));
 assert.ok(!reader.includes("FEYA_COMMERCE_CHECKOUT"));
});
