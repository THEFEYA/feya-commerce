import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  defaultShopFilters,
  isShopTrackingParam,
  parseShopNavigation,
  shopHrefWithTracking,
  shopNavigationHasUtilityState,
  shopNavigationNeedsNormalization,
  shopPageHref,
} from '../../lib/shopCatalogNavigation.ts';

test('shop URL grammar validates filters, accepts attribution params and rejects unknown state',()=>{
  const parsed=parseShopNavigation({
    color:'gold',
    piece:'Skirt,Skirt',
    utm_source:'google',
    gclid:'fixture-click',
  });
  assert.ok(parsed);
  assert.equal(parsed.filters.color,'Gold');
  assert.deepEqual(parsed.filters.piece,['Skirt']);
  assert.equal(isShopTrackingParam('utm_campaign'),true);
  assert.equal(isShopTrackingParam('GCLID'),true);
  assert.equal(parseShopNavigation({mystery:'value'}),null);
  assert.equal(parseShopNavigation({color:['Gold','Silver']}),null);
});

test('shop normalization omits defaults, canonicalizes values and preserves tracking outside canonicals',()=>{
  const parsed=parseShopNavigation({color:'gold',page:'1',utm_source:'google'});
  assert.ok(parsed);
  assert.equal(shopNavigationNeedsNormalization({color:'gold',page:'1',utm_source:'google'},parsed),true);
  const canonical=shopPageHref(parsed.page,parsed.filters);
  assert.equal(canonical,'/shop?color=Gold');
  assert.equal(shopHrefWithTracking(canonical,{utm_source:'google',gclid:'abc'}),'/shop?color=Gold&utm_source=google&gclid=abc');

  const normalized=parseShopNavigation({color:'Gold'});
  assert.ok(normalized);
  assert.equal(shopNavigationNeedsNormalization({color:'Gold'},normalized),false);
});

test('only real filters or explicit pagination create Shop utility URL state',()=>{
  const base={page:1,filters:defaultShopFilters()};
  assert.equal(shopNavigationHasUtilityState(base),false);
  assert.equal(shopNavigationHasUtilityState({...base,page:2}),true);
  assert.equal(shopNavigationHasUtilityState({page:1,filters:{...defaultShopFilters(),color:'Gold'}}),true);
});

test('public Shop client seeds direct URLs server-side then keeps filter interaction zero-network',()=>{
  const page=readFileSync('app/shop/page.tsx','utf8');
  const client=readFileSync('components/ShopClient.tsx','utf8');

  assert.match(page,/initialNavigation/);
  assert.match(page,/robots: \{ index: false, follow: true \}/);
  assert.match(client,/initialNavigation\?: ShopNavigation/);
  assert.match(client,/useDeferredValue\(filters\)/);
  assert.match(client,/window\.history\.replaceState/);
  assert.match(client,/shopPageHref\(1,filters\)/);
  assert.match(client,/isShopTrackingParam/);
  assert.doesNotMatch(client,/fetch\(|XMLHttpRequest|axios/i);
});
