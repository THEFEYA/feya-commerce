import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  BONANZA_COLOR_PARTS, constituentColors, enrichStorefrontProductColors,
} from '../../lib/bonanzaColorChoices.ts';
import {coupleColorSelection, couplePairLabel, COUPLE_LISTING_IDS} from '../../lib/bonanzaCoupleColorChoices.ts';
import {defaultShopFilters, filterShopProducts,parseShopNavigation,shopPageHref} from '../../lib/shopCatalogNavigation.ts';
import type {StorefrontProduct} from '../../lib/types.ts';

const source=JSON.parse(readFileSync('config/bonanzaReviewedColors20261011.json','utf8')) as {
  products:Record<string,{colors:string[];held:boolean}>;
};
const review=JSON.parse(readFileSync('config/bonanzaColorReviewCatalog20261020.json','utf8')) as {
  count:number;products:Array<{id:string;title:string;slug:string;image:string}>;
};
const selected=JSON.parse(readFileSync('config/bonanzaColorDisplayOverrides.json','utf8')) as {
  products:Record<string,{primary:string;filter_colors:string[];owner_review_hold_color_only?:boolean}>;
};

function allProducts(){
  return review.products.map(row=>{
    const original=source.products[row.id],decision=selected.products[row.id];
    const allowHeld=row.id==='ffbf1db6-6fae-4606-afbe-013415d6421d'
      &&original.held&&decision.owner_review_hold_color_only===true&&decision.primary==='gold';
    const raw={canonical_product_id:row.id,card_title:row.title,product_slug:row.slug,
      primary_image_url:row.image,configurations:[],color_options:[],
      full_set_display_price_amount:100,facets:{colors:[],audience:[],parts:[],subtypes:[],
        events:[],performance:[],dance:[],styles:[],personas:[],materials:[],effects:[],
        mappingVersion:'feya-storefront-facets-v4'}} as unknown as StorefrontProduct;
    return enrichStorefrontProductColors(raw,{...original,...decision,held:original.held&&!allowHeld});
  });
}

test('owner export: 206 original selections imported without dropping 207th Bonanza HOLD',()=>{
  assert.equal(review.count,207);
  assert.equal(Object.keys(selected.products).length,207);
  assert.equal(Object.values(source.products).filter(x=>x.held).length,1);
  assert.equal(source.products['ffbf1db6-6fae-4606-afbe-013415d6421d'].held,true);
  assert.equal(selected.products['ffbf1db6-6fae-4606-afbe-013415d6421d'].primary,'gold');
  assert.equal(selected.products['ffbf1db6-6fae-4606-afbe-013415d6421d'].owner_review_hold_color_only,true);
  for(const row of review.products){
    const original=source.products[row.id],decision=selected.products[row.id];
    assert.ok(original && decision,'No missing approval');
    assert.ok(original.colors.includes(decision.primary),'Default must be a Bonanza approved colorway');
    assert.deepEqual(decision.filter_colors.filter(c=>!constituentColors(original.colors).includes(c)),[]);
    assert.equal(new Set(decision.filter_colors).size,decision.filter_colors.length);
  }
});

test('primary photo facet is distinct from availability for all 207 products',()=>{
  const products=allProducts();
  assert.equal(products.length,207);
  for(const product of products) {
    assert.ok(product.photo_color_filter_values?.length);
    assert.ok(product.default_color_choice);
    assert.ok(product.color_choices?.includes(product.default_color_choice!));
    assert.ok(product.photo_color_filter_values!.every(c=>product.color_filter_values?.includes(c)));
  }
  const red=products.find(x=>x.product_slug?.endsWith('4389332118'))!;
  assert.deepEqual(red.photo_color_filter_values,['Black','Red']);
  assert.deepEqual(red.color_filter_values,['Gold','Silver','Black','White','Red']);
  const s=defaultShopFilters();
  assert.deepEqual(filterShopProducts([red],{...s,color:['Gold']}),[]);
  assert.deepEqual(filterShopProducts([red],{...s,color:['Red']}),[]);
  assert.deepEqual(filterShopProducts([red],{...s,color:['Black','Red']}),[red]);
  assert.deepEqual(filterShopProducts([red],{...s,color:['Red','Gold']}),[]);
  assert.deepEqual(filterShopProducts([red],{...s,color:['Gold'],colorMode:'available'}),[red]);
});

test('green only exists as a purchasable option; browser can reveal it rather than returning 404',()=>{
  const list=allProducts(), base=defaultShopFilters();
  const pictured=filterShopProducts(list,{...base,color:['Green']});
  const available=filterShopProducts(list,{...base,color:['Green'],colorMode:'available'});
  assert.equal(pictured.length,0);
  assert.equal(available.length,3);
  assert.ok(available.every(x=>x.photo_color_filter_values?.includes('Brown')));
  const url=shopPageHref(1,{...base,color:['Green'],colorMode:'available'});
  assert.equal(url,'/shop?color=Green&color_mode=available');
  assert.deepEqual(parseShopNavigation({color:'Green',color_mode:'available'})?.filters,
    {...base,color:['Green'],colorMode:'available'});
  assert.equal(parseShopNavigation({color_mode:'wrong'}),null);
  const page=readFileSync('app/shop/page.tsx','utf8');
  assert.doesNotMatch(page,/filteredCount===0\) notFound\(\)/);
});

test('five exact couple IDs allow independent women/men finishes without adding source price tuples',()=>{
  const all=allProducts();
  const ids=new Set(COUPLE_LISTING_IDS);
  assert.equal(ids.size,5);
  assert.equal(all.filter(x=>ids.has(x.canonical_product_id as typeof COUPLE_LISTING_IDS[number])).length,5);
  for(const product of all){
    const selection=coupleColorSelection(product);
    if(!ids.has(product.canonical_product_id as typeof COUPLE_LISTING_IDS[number])){
      assert.equal(selection,null);continue;
    }
    assert.ok(selection);
    assert.deepEqual(selection.available,source.products[product.canonical_product_id].colors);
    assert.ok(selection.available.includes(selection.defaultPair.women));
    assert.ok(selection.available.includes(selection.defaultPair.men));
    if(selection.available.length===2){
      const combos=new Set(selection.available.flatMap(w=>selection.available.map(m=>w+'/'+m)));
      assert.equal(combos.size,4,'four sex-specific permutations');
      assert.ok(combos.has('gold/silver')&&combos.has('silver/gold'));
    }
  }
  const mixed=all.find(x=>x.canonical_product_id==='f012a88f-44db-4e17-ba57-7f60bb7b5719')!;
  assert.deepEqual(mixed.photo_color_filter_values,['Gold','Silver']);
  assert.deepEqual(coupleColorSelection(mixed)?.defaultPair,{women:'gold',men:'silver'});
  assert.match(couplePairLabel({women:'silver',men:'gold'}),/Women's Silver · Men's Gold/);
  const pdp=readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.match(pdp,/womens_color_code: isCoupleSet \? womenColorCode : null/);
  assert.match(pdp,/mens_color_code: isCoupleSet \? menColorCode : null/);
  assert.match(pdp,/womens_size: isCoupleSet \? womenSize : null/);
  assert.match(pdp,/mens_size: isCoupleSet \? menSize : null/);
  assert.match(pdp,/isCoupleSet \? !womenSize \|\| !menSize : !size/);
  assert.ok(Object.keys(BONANZA_COLOR_PARTS).length===20);
  assert.doesNotMatch(pdp,/\.update\(|\.upsert\(|\.insert\(/);
});
