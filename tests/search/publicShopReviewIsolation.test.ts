import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {parseShopNavigation,shopNavigationNeedsNormalization,shopPageHref,shopNavigationHasUtilityState} from '../../lib/shopCatalogNavigation.ts';

test('public Shop route no longer depends on protected owner-review mode in Production',()=>{
 const s=readFileSync('app/shop/page.tsx','utf8');
 assert.match(s,/process\.env\.VERCEL_ENV === 'production'/);
 assert.match(s,/status: 'disabled' as const, release: null/);
 assert.match(s,/readClosedReviewPresentation\(\)/);
 assert.match(s,/if \(reviewGate\.status === 'blocked'\) notFound\(\)/);
 assert.match(s,/readCachedApprovedStorefrontCatalogV1\(\)/);
 assert.match(s,/products: \[\],/);
 const frozen=JSON.parse(readFileSync('config/product-os-ui-freeze.json','utf8'));
 assert.match(frozen.files['app/shop/page.tsx'],/^[a-f0-9]{40}$/);
});
test('Shop root navigation is a real public listing, never an accidental 404',()=>{
 const nav=parseShopNavigation({});
 assert.ok(nav);
 assert.equal(nav.page,1);
 assert.equal(shopPageHref(nav.page,nav.filters),'/shop');
 assert.equal(shopNavigationHasUtilityState(nav),false);
 assert.equal(shopNavigationNeedsNormalization({},nav),false);
 const second=parseShopNavigation({page:'2'});
 assert.equal(second?.page,2);
 assert.equal(shopPageHref(second!.page,second!.filters),'/shop?page=2');
});
test('Shop retains owner-approved visuals and immutable Search release behavior',()=>{
 const s=readFileSync('app/shop/page.tsx','utf8');
 assert.match(s,/OwnerShopSeoText/);
 assert.match(s,/ShopClient/);
 assert.match(s,/SHOP_PAGE_SIZE/);
 assert.match(s,/closedReviewRequested/);
 assert.doesNotMatch(s,/FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE|PHASE13_PRODUCTION_PUBLISH_AUTHORIZED/);
 assert.ok(!s.includes('STOREFRONT_VIEW_V4'));
});
