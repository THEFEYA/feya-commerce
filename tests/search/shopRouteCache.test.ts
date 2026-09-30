import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

test('final Phase 6 Shop slice streams URL state before reading the persistent catalog cache',()=>{
  const page=readFileSync('app/shop/page.tsx','utf8');
  const cache=readFileSync('lib/storefrontCatalogCacheServer.ts','utf8');
  assert.match(page,/export const instant = true/);
  assert.match(page,/readCachedApprovedStorefrontCatalogV1/);
  assert.doesNotMatch(page,/await connection\(\)|from 'next\/server'/);
  const paramsIndex=page.indexOf('const params = await searchParams');
  const productsIndex=page.indexOf('const { products, error, review } = await getProducts()');
  assert.ok(paramsIndex>=0&&productsIndex>paramsIndex);
  assert.match(cache,/'use cache'/);
  assert.match(cache,/cacheLife\('max'\)/);
  assert.match(cache,/STOREFRONT_CACHE_TAGS\.site/);
  assert.match(cache,/STOREFRONT_CACHE_TAGS\.catalog/);
});

test('Shop review and URL enforcement stay request-scoped outside the shared cache',()=>{
  const page=readFileSync('app/shop/page.tsx','utf8');
  const cache=readFileSync('lib/storefrontCatalogCacheServer.ts','utf8');
  assert.match(page,/readClosedReviewPresentation/);
  assert.match(page,/if \(reviewGate\.status === 'blocked'\) notFound\(\)/);
  assert.match(page,/if \(review && !navigation\) notFound\(\)/);
  assert.match(page,/redirect\(shopPageHref\(1, navigation\.filters\)\)/);
  assert.doesNotMatch(cache,/readClosedReviewPresentation|closedReviewRequested|cookies\(|headers\(|getClaims|getUser/);
});
