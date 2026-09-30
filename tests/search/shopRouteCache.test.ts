import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

test('Phase 7 keeps one persistent slim catalog while URL state stays request-scoped',()=>{
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

test('Phase 7 direct-filter validation, normalization and review auth stay outside the shared cache',()=>{
  const page=readFileSync('app/shop/page.tsx','utf8');
  const cache=readFileSync('lib/storefrontCatalogCacheServer.ts','utf8');
  assert.match(page,/readClosedReviewPresentation/);
  assert.match(page,/if \(reviewGate\.status === 'blocked'\) notFound\(\)/);
  assert.match(page,/const navigation = parseShopNavigation\(params\)/);
  assert.match(page,/if \(!navigation\) notFound\(\)/);
  assert.match(page,/shopNavigationHasUtilityState/);
  assert.match(page,/filteredCount===0\) notFound\(\)/);
  assert.match(page,/shopNavigationNeedsNormalization/);
  assert.match(page,/redirect\(shopHrefWithTracking\(normalizedHref,params\)\)/);
  assert.match(page,/initialNavigation=\{initialNavigation\}/);
  assert.doesNotMatch(cache,/readClosedReviewPresentation|closedReviewRequested|cookies\(|headers\(|getClaims|getUser/);
});
