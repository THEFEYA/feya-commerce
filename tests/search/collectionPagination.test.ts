import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  catalogPageHref,defaultShopFilters,parseShopNavigation,shopPageHref,
  shopHrefWithTracking,shopNavigationNeedsNormalization,
} from '../../lib/shopCatalogNavigation.ts';

test('collection pagination retains the collection and every active filter across a server load',()=>{
  const query={page:'2',color:'Gold',audience:'Women',piece:'Shoulder',search:'stage & show',sort:'Price · high to low'};
  const nav=parseShopNavigation(query)!;
  const href=catalogPageHref(nav.page,nav.filters,'/collections/shoulder-armor');
  const url=new URL(href,'https://thefeya.com');
  assert.equal(url.pathname,'/collections/shoulder-armor');
  assert.deepEqual(parseShopNavigation(Object.fromEntries(url.searchParams)),nav);
  assert.equal(shopNavigationNeedsNormalization(Object.fromEntries(url.searchParams),nav),false);
  assert.equal(catalogPageHref(1,defaultShopFilters(),'/collections/shoulder-armor'),'/collections/shoulder-armor');
  assert.equal(catalogPageHref(3,nav.filters),shopPageHref(3,nav.filters));
});

test('collection links cannot escape into another origin, route, query or fragment',()=>{
  for(const path of ['https://example.com','//example.com','/shop/other','/collections/../shop','/collections/gold?audience=Men','/collections/gold#page=2','/collections/%2fother']){
    assert.throws(()=>catalogPageHref(2,defaultShopFilters(),path),/INVALID_CATALOG_PATH/);
  }
});

test('normalization keeps attribution without putting it in the canonical or subsequent links',()=>{
  const query={page:'1',color:'gold',utm_source:'pinterest',fbclid:'attribution'};
  const nav=parseShopNavigation(query)!;
  const href=catalogPageHref(nav.page,nav.filters,'/collections/festival-outfits');
  assert.equal(href,'/collections/festival-outfits?color=Gold');
  assert.ok(shopNavigationNeedsNormalization(query,nav));
  const redirect=new URL(shopHrefWithTracking(href,query),'https://thefeya.com');
  assert.equal(redirect.pathname,'/collections/festival-outfits');
  assert.equal(redirect.searchParams.get('utm_source'),'pinterest');
  assert.equal(redirect.searchParams.get('fbclid'),'attribution');
  assert.doesNotMatch(href,/utm_|fbclid/);
});

test('collection SSR preserves governed membership and the existing release gate for query states',()=>{
  const page=readFileSync('app/collections/[slug]/page.tsx','utf8');
  assert.match(page,/readCachedSearchLandingRelease\(slug\)/);
  assert.match(page,/filterShopProducts\(products,navigation\.filters\)/);
  assert.match(page,/releaseRobotsForPath\(canonicalPath\)/);
  assert.match(page,/canonical:canonicalPath/);
  assert.match(page,/navigation\.page>Math\.max\(1,Math\.ceil\(filteredProducts\.length\/SHOP_PAGE_SIZE\)\)\)notFound/);
  const shell=page.slice(page.indexOf('export default async function'),page.indexOf('function CollectionRouteFallback'));
  assert.doesNotMatch(shell,/await searchParams/);
  assert.match(shell,/searchParams=\{searchParams\}/);
  assert.doesNotMatch(page,/readCachedApprovedStorefrontCatalog|candidateMatchesProduct|fetch\(/);
});
