import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

test('homepage uses the approved card corpus behind governed persistent cache tags',()=>{
  const page=readFileSync('app/page.tsx','utf8');
  const server=readFileSync('lib/homePresentationServer.ts','utf8');

  assert.match(page,/export const instant = true/);
  assert.match(page,/readCachedHomePresentationProducts/);
  assert.match(page,/async function HomeBody\(\)/);
  assert.match(page,/await connection\(\)/);
  assert.match(page,/<Suspense fallback=\{<HomeBodyFallback \/>\}>/);
  assert.doesNotMatch(page,/STOREFRONT_VIEW_V[1-4]|STOREFRONT_MEDIA_FAST_VIEW|getSupabaseReadClient|mergeMedia\(/);

  assert.match(server,/'use cache'/);
  assert.match(server,/cacheLife\('max'\)/);
  assert.match(server,/STOREFRONT_CACHE_TAGS\.site/);
  assert.match(server,/STOREFRONT_CACHE_TAGS\.home/);
  assert.match(server,/storefrontCacheTagForProduct/);
  assert.match(server,/readApprovedStorefrontCardProductsV1/);
  assert.match(server,/homePresentationProductIds/);
});

test('homepage keeps request-time review authorization outside the shared public cache',()=>{
  const page=readFileSync('app/page.tsx','utf8');
  const server=readFileSync('lib/homePresentationServer.ts','utf8');

  assert.match(page,/readClosedReviewPresentation/);
  assert.match(page,/isHybridVisualPreviewDeployment/);
  assert.match(page,/if \(review\.status === 'blocked'\) notFound\(\)/);
  assert.doesNotMatch(server,/readClosedReviewPresentation|cookies\(|headers\(|getClaims|getUser/);
});
