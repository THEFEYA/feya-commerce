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
  assert.deepEqual(parsed.filters.color,['Gold']);
  assert.equal(parsed.filters.colorMode,'photo');
  assert.deepEqual(parseShopNavigation({color:'Gold',color_mode:'available'})?.filters.color,['Gold']);
  assert.equal(parseShopNavigation({color:'Gold',color_mode:'invalid'}),null);
  assert.deepEqual(parsed.filters.piece,['Dress','Skirt']);
  assert.equal(isShopTrackingParam('utm_campaign'),true);
  assert.equal(isShopTrackingParam('GCLID'),true);
  assert.equal(parseShopNavigation({mystery:'value'}),null);
  assert.equal(parseShopNavigation({color:['Gold','Silver']}),null);
  assert.deepEqual(parseShopNavigation({color:'Red,Black,Red'})?.filters.color,['Black','Red']);
  assert.equal(parseShopNavigation({color:'Gold,NotAColor'}),null);
  assert.equal(parseShopNavigation({piece:'Skirt,'.repeat(100)}),null);
});

test('public Shop tolerates auxiliary URL keys but never invalid facets, prices or pagination',()=>{
  const transport={_rsc:'transport',__edge:'trace',some_analytics_key:'opaque'};
  assert.equal(parseShopNavigation(transport),null,'default protected mode stays strict');
  const publicRoot=parseShopNavigation(transport,{ignoreUnknownParams:true});
  assert.ok(publicRoot);
  assert.equal(publicRoot.page,1);
  assert.equal(shopPageHref(publicRoot.page,publicRoot.filters),'/shop');
  const filtered=parseShopNavigation({...transport,piece:'Skirt',page:'2'},{ignoreUnknownParams:true});
  assert.deepEqual(filtered?.filters.piece,['Skirt']);
  assert.equal(filtered?.page,2);
  assert.equal(shopPageHref(filtered!.page,filtered!.filters),'/shop?piece=Skirt&page=2');
  for(const invalid of [{piece:'not-a-piece'},{color:['Gold','Silver']},{page:'0'},{min:'1000',max:'10'},{search:'x'.repeat(200)}]){
    assert.equal(parseShopNavigation({...transport,...invalid},{ignoreUnknownParams:true}),null);
  }
  const publicCode=readFileSync('app/shop/page.tsx','utf8');
  assert.equal((publicCode.match(/ignoreUnknownParams:process.env.VERCEL_ENV === 'production'/g)||[]).length,2);
  assert.ok(publicCode.includes('OwnerShopSeoText'));
  assert.ok(publicCode.includes('readCachedApprovedStorefrontCatalogV1()'));
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
  const available = parseShopNavigation({color:'Green',color_mode:'available'});
  assert.ok(available);
  assert.equal(shopPageHref(available.page,available.filters),'/shop?color=Green&color_mode=available');
});

test('filter utility state is distinct from pagination while both remain validated URL state',()=>{
  const base={page:1,filters:defaultShopFilters()};
  assert.equal(shopNavigationHasFilterState(base),false);
  assert.equal(shopNavigationHasUtilityState(base),false);
  assert.equal(shopNavigationHasFilterState({...base,page:2}),false);
  assert.equal(shopNavigationHasUtilityState({...base,page:2}),true);
  const filtered={page:1,filters:{...defaultShopFilters(),color:['Gold']}};
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
