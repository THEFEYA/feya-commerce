import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Shop runtime uses the exact slim read model through the governed catalog cache without media fan-out', () => {
  const page = readFileSync('app/shop/page.tsx','utf8');
  const cache = readFileSync('lib/storefrontCatalogCacheServer.ts','utf8');
  assert.ok(page.includes('readCachedApprovedStorefrontCatalogV1'));
  assert.ok(cache.includes('readApprovedStorefrontCardProductsV1'));
  assert.ok(page.includes('readClosedReviewPresentation'));
  assert.ok(page.includes("if (reviewGate.status === 'blocked') notFound()"));
  assert.ok(!page.includes('MEDIA_LOOKUP_CHUNK_SIZE'));
  assert.ok(!page.includes('SHOP_PRODUCTS_LIMIT'));
  assert.ok(!page.includes('fetchMediaForSlugs'));
  assert.ok(!page.includes('mergeMedia'));
  assert.ok(!page.includes('STOREFRONT_MEDIA_FAST_VIEW'));
  assert.ok(!page.includes('STOREFRONT_VIEW_V4'));
  assert.ok(!/export\\s+const\\s+(?:dynamic|revalidate|fetchCache|runtime)\\s*=/.test(page));
});

test('Phase 4 changes data loading only and preserves the frozen Shop composition', () => {
  const page = readFileSync('app/shop/page.tsx','utf8');
  assert.ok(page.includes('<Header /><ShopClient key={navigation ? shopPageHref(navigation.page, navigation.filters) : \'legacy\'} products={products} error={error} navigation={navigation} />'));
  const card = readFileSync('components/ProductCard.tsx','utf8');
  assert.ok(card.includes('product-card reveal group block'));
  assert.ok(card.includes('group-hover:opacity-100'));
  assert.ok(card.includes('worldLabel(p)'));
});

test('slim adapter preserves existing price/filter APIs without heavyweight PDP payloads', () => {
  const source = readFileSync('lib/storefrontCardReadModelServer.ts','utf8');
  assert.ok(source.includes('readApprovedStorefrontCardProductsV1'));
  assert.ok(source.includes('full_set_display_price_amount: Number(row.card_display_price_amount)'));
  assert.ok(source.includes('facets: buildStorefrontFacets(row, row.membership_codes)'));
  assert.ok(source.includes('media_gallery: []'));
  assert.ok(source.includes('configurations: []'));
  assert.ok(!source.includes("'use cache'"));
  assert.ok(!source.includes('unstable_cache'));
  const cache = readFileSync('lib/storefrontCatalogCacheServer.ts','utf8');
  assert.ok(cache.includes("'use cache'"));
  assert.ok(cache.includes("cacheLife('max')"));
  assert.ok(cache.includes('STOREFRONT_CACHE_TAGS.site'));
  assert.ok(cache.includes('STOREFRONT_CACHE_TAGS.catalog'));
});
