import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  defaultShopFilters,
  isShopTrackingParam,
  parseShopNavigation,
  shopHrefWithTracking,
  shopNavigationHasFilterState,
  shopNavigationHasUtilityState,
  shopNavigationNeedsNormalization,
  shopPageHref,
} from '../../lib/shopCatalogNavigation.ts';

test('shop URL grammar validates filters, accepts attribution params and rejects unknown state',()=>{
  const parsed=parseShopNavigation({
    color:'gold',
    piece:' Skirt ,Dress,Skirt',
    utm_source:'google',
    gclid:'fixture-click',
  });
  assert.ok(parsed);
  assert.equal(parsed.filters.color,'Gold');
  assert.deepEqual(parsed.filters.piece,['Dress','Skirt']);
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
  const multi=parseShopNavigation({piece:'Skirt,Dress'});
  assert.ok(multi);
  assert.equal(shopPageHref(multi.page,multi.filters),'/shop?piece=Dress%2CSkirt');
  assert.equal(shopNavigationNeedsNormalization({piece:'Skirt,Dress'},multi),true);

  const normalized=parseShopNavigation({color:'Gold'});
  assert.ok(normalized);
  assert.equal(shopNavigationNeedsNormalization({color:'Gold'},normalized),false);

  const empty=parseShopNavigation({search:''});
  assert.ok(empty);
  assert.equal(shopNavigationNeedsNormalization({search:''},empty),true);
  assert.equal(shopPageHref(empty.page,empty.filters),'/shop');
});

test('filter utility state is distinct from pagination while both remain validated URL state',()=>{
  const base={page:1,filters:defaultShopFilters()};
  assert.equal(shopNavigationHasFilterState(base),false);
  assert.equal(shopNavigationHasUtilityState(base),false);
  assert.equal(shopNavigationHasFilterState({...base,page:2}),false);
  assert.equal(shopNavigationHasUtilityState({...base,page:2}),true);
  const filtered={page:1,filters:{...defaultShopFilters(),color:'Gold'}};
  assert.equal(shopNavigationHasFilterState(filtered),true);
  assert.equal(shopNavigationHasUtilityState(filtered),true);
});

test('public Shop client seeds direct URLs server-side then keeps filter interaction zero-network',()=>{
  const page=readFileSync('app/shop/page.tsx','utf8');
  const client=readFileSync('components/ShopClient.tsx','utf8');

  assert.match(page,/initialNavigation/);
  assert.match(page,/robots: \{ index: false, follow: true \}/);
  assert.match(client,/initialNavigation\?: ShopNavigation/);
  assert.match(client,/useDeferredValue\(filters\)/);
  assert.match(client,/window\.history\.replaceState/);
  assert.doesNotMatch(client,/window\.history\.pushState/);
  assert.match(client,/shopPageHref\(1,filters\)/);
  assert.match(client,/isShopTrackingParam/);
  assert.doesNotMatch(client,/fetch\(|XMLHttpRequest|axios/i);
});


test('filter utility URLs stay noindex and outside the Search Release sitemap owner graph',()=>{
  const page=readFileSync('app/shop/page.tsx','utf8');
  const sitemap=readFileSync('app/sitemap.ts','utf8');
  const release=readFileSync('lib/searchReleaseIndexationServer.ts','utf8');

  assert.match(page,/filterState[\s\S]*robots: \{ index: false, follow: true \}/);
  assert.match(sitemap,/readActiveSearchReleaseIndexItems/);
  assert.doesNotMatch(sitemap,/shopCatalogNavigation|searchParams|filterShopProducts/);
  assert.doesNotMatch(release,/shopCatalogNavigation|filterShopProducts/);
});
