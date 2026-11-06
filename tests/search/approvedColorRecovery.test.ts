import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {projectReviewedBonanzaColors} from '../../lib/bonanzaReviewedColorProjection.ts';
import {EXACT_COLOR_PRICE_PRODUCTS} from '../../lib/bonanzaColorPriceExceptions.ts';
import {applyOwnerReviewedStorefrontCorrections} from '../../lib/storefrontOwnerReviewedCorrections.ts';
import {defaultShopFilters,filterShopProducts,parseShopNavigation,shopPageHref,catalogPageHref} from '../../lib/shopCatalogNavigation.ts';
import {productAvailableBaseColors} from '../../lib/bonanzaColorChoices.ts';
import type {StorefrontProduct} from '../../lib/types.ts';

const products=['part1','part2'].flatMap(part=>JSON.parse(readFileSync(
  `tests/fixtures/approved-product-selectors-20261026-${part}.json`,'utf8')).products) as StorefrontProduct[];

test('all 207 slim cards gain reviewed colors without price tuples, writes or source mutation',()=>{
  assert.equal(products.length,207);
  for(const raw of products){
    const slim={...raw,configurations:[]} as StorefrontProduct;
    const before=JSON.stringify(slim);
    const projected=projectReviewedBonanzaColors(slim,'catalog');
    assert.equal(JSON.stringify(slim),before);
    assert.equal(projected.canonical_product_id,slim.canonical_product_id);
    assert.equal(projected.primary_image_url,slim.primary_image_url);
    assert.equal(projected.min_price,slim.min_price);
    assert.deepEqual(projected.configurations,[]);
    assert.ok(projected.color_choices?.length,raw.product_slug || raw.canonical_product_id);
    assert.ok(projected.photo_color_filter_values?.length,raw.product_slug || raw.canonical_product_id);
    assert.ok(productAvailableBaseColors(projected).length);
    assert.ok(projected.photo_color_filter_values!.every(c=>projected.color_filter_values?.includes(c)));
  }
});

test('three color-priced slim cards omit unpriced White; full PDP still requires all three source prices',()=>{
  for(const id of EXACT_COLOR_PRICE_PRODUCTS){
    const raw=products.find(p=>p.canonical_product_id===id)!;
    const catalog=projectReviewedBonanzaColors({...raw,configurations:[]},'catalog');
    assert.deepEqual(new Set(catalog.color_choices),new Set(['brown','black','green']));
    assert.ok(!catalog.color_filter_values?.includes('White'));
    assert.throws(()=>projectReviewedBonanzaColors({...raw,configurations:[]}),/COLOR_PRICE_SOURCE_UNVERIFIED/);
    const corrected=applyOwnerReviewedStorefrontCorrections(raw as unknown as Record<string,unknown>) as StorefrontProduct;
    const detailed=projectReviewedBonanzaColors(corrected);
    assert.deepEqual(detailed.configurations,corrected.configurations,'display projection must not rewrite a price/configuration');
    assert.deepEqual(detailed.color_choices,catalog.color_choices);
  }
});

test('photo-first mixed colors require their components; available-color search uses any approved option',()=>{
  const raw=products.find(p=>p.product_slug?.endsWith('4389332118'))!;
  const red=projectReviewedBonanzaColors(raw,'catalog');
  const defaults=defaultShopFilters();
  assert.deepEqual(red.photo_color_filter_values,['Black','Red']);
  assert.deepEqual(filterShopProducts([red],{...defaults,color:['Gold']}),[]);
  assert.deepEqual(filterShopProducts([red],{...defaults,color:['Red']}),[]);
  assert.deepEqual(filterShopProducts([red],{...defaults,color:['Black','Red']}),[red]);
  assert.deepEqual(filterShopProducts([red],{...defaults,color:['Gold'],colorMode:'available'}),[red]);
  const all=products.map(p=>projectReviewedBonanzaColors({...p,configurations:[]},'catalog'));
  assert.equal(filterShopProducts(all,{...defaults,color:['Green']}).length,0);
  assert.equal(filterShopProducts(all,{...defaults,color:['Green'],colorMode:'available'}).length,3);
});

test('multi-color links normalize, reload and paginate within their original collection',()=>{
  const nav=parseShopNavigation({color:'white,Silver,white',color_mode:'available',page:'2'})!;
  assert.deepEqual(nav.filters.color,['Silver','White']);
  assert.equal(shopPageHref(2,nav.filters),'/shop?color=Silver%2CWhite&color_mode=available&page=2');
  assert.equal(catalogPageHref(2,nav.filters,'/collections/festival-outfits'),
    '/collections/festival-outfits?color=Silver%2CWhite&color_mode=available&page=2');
  assert.deepEqual(parseShopNavigation(Object.fromEntries(new URL(shopPageHref(2,nav.filters),'https://thefeya.com').searchParams)),nav);
  for(const params of [{color:'Gold,Invisible'},{color_mode:'all'},{color:['Gold','Silver']}])assert.equal(parseShopNavigation(params),null);
});
