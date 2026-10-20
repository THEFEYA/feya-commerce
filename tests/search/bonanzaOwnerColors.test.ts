import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  BONANZA_COLOR_PARTS,
  colorChoiceLabel,
  colorChoiceStyle,
  constituentColors,
  enrichStorefrontProductColors,
  inferredDefaultColorCode,
} from '../../lib/bonanzaColorChoices.ts';
import {defaultShopFilters,filterShopProducts,parseShopNavigation,shopPageHref} from '../../lib/shopCatalogNavigation.ts';
import type {StorefrontProduct} from '../../lib/types.ts';

const snapshot = JSON.parse(readFileSync('config/bonanzaReviewedColors20261011.json','utf8')) as {
  schema:string;
  source_product_count:number;
  ready_product_count:number;
  held_product_count:number;
  products:Record<string,{colors:string[];held:boolean}>;
};
const productId='09f51ad4-6b90-4311-aa5a-54f91cf4b7bf';

test('exact reviewed Bonanza evidence includes all 207 IDs and no inferred combinations',()=>{
  const rows=Object.values(snapshot.products);
  assert.equal(snapshot.schema,'feya-bonanza-approved-colors-v1');
  assert.equal(snapshot.source_product_count,207);
  assert.equal(rows.length,207);
  assert.equal(rows.filter(x=>x.held).length,1);
  assert.equal(snapshot.ready_product_count,206);
  assert.equal(snapshot.held_product_count,1);
  assert.equal(rows.reduce((total,row)=>total+row.colors.length,0),528);
  assert.equal(new Set(rows.flatMap(row=>row.colors)).size,20);
  for(const row of rows){
    assert.equal(new Set(row.colors).size,row.colors.length,'No duplicate colorways per listing');
    for(const code of row.colors)assert.ok(code in BONANZA_COLOR_PARTS,'Unknown colorway is not publishable');
  }
  assert.deepEqual(snapshot.products[productId].colors,
    ['black_gold','black_silver','white_gold','white_silver','black_red']);
});

test('holographic and triple-color selections are atomic options, filter axes are their constituents',()=>{
  assert.deepEqual(BONANZA_COLOR_PARTS.holographic_black,['Holographic','Black']);
  assert.deepEqual(BONANZA_COLOR_PARTS.holographic_white,['Holographic','White']);
  assert.deepEqual(BONANZA_COLOR_PARTS.gold_silver_black,['Gold','Silver','Black']);
  assert.deepEqual(BONANZA_COLOR_PARTS.white_gold_silver,['White','Gold','Silver']);
  assert.equal(colorChoiceLabel('black_red'),'Black + Red');
  assert.deepEqual(constituentColors(['black_red','black_silver','holographic_white']),
    ['Silver','Black','White','Red','Holographic']);
  assert.match(String(colorChoiceStyle('black_red').backgroundImage),/linear-gradient/);
  assert.match(String(colorChoiceStyle('holographic_black').backgroundImage),/linear-gradient/);
  assert.match(String(colorChoiceStyle('holographic').backgroundImage),/conic-gradient/);
});

test('color projection preserves SEO, source configuration, price and image',()=>{
  const product={
    canonical_product_id:productId,
    product_slug:'futuristic-4389332118',
    card_title:'Black and Red Futuristic Bodysuit',
    h1:'Approved description unchanged',
    primary_image_url:'https://example.test/red.jpg',
    color_options:[],
    canonical_color_label:null,
    full_set_display_price_amount:334.97,
    configurations:[{configuration_id:'source',display_price_amount:334.97}],
    facets:{colors:[],materials:['Vegan Leather'],events:['Rave'],parts:['Full Body'],
      subtypes:['Bodysuit'],performance:[],dance:[],styles:[],personas:[],audience:[],
      effects:[],mappingVersion:'feya-storefront-facets-v4'},
  } as unknown as StorefrontProduct;
  const decision=snapshot.products[productId];
  const enhanced=enrichStorefrontProductColors(product,decision);
  assert.notEqual(enhanced,product);
  assert.deepEqual(product.color_options,[]);
  assert.equal(enhanced.default_color_choice,'black_red');
  assert.equal(inferredDefaultColorCode(product.card_title!,decision.colors),'black_red');
  assert.deepEqual(enhanced.color_choices,decision.colors);
  assert.deepEqual(enhanced.color_filter_values,['Gold','Silver','Black','White','Red']);
  assert.deepEqual(enhanced.facets?.colors,enhanced.color_filter_values);
  assert.equal(enhanced.facets?.materials[0],'Vegan Leather');
  assert.equal(enhanced.facets?.events[0],'Rave');
  assert.equal(enhanced.primary_image_url,product.primary_image_url);
  assert.equal(enhanced.full_set_display_price_amount,product.full_set_display_price_amount);
  assert.equal(enhanced.configurations,product.configurations);
  assert.equal(enhanced.h1,product.h1);
  const held=enrichStorefrontProductColors(product,{...decision,held:true});
  assert.equal(held,product);
  const override=enrichStorefrontProductColors(product,{...decision,primary:'black_gold',filter_colors:['Red']});
  assert.equal(override.default_color_choice,'black_gold');
  assert.deepEqual(override.facets?.colors,['Red']);
  assert.throws(()=>enrichStorefrontProductColors(product,{...decision,filter_colors:['Blue']}),/BONANZA_COLOR_FILTER/);
});

test('filter Black + Red is OR, repeated click removes one color, options retain exact codes',()=>{
  const original={
    canonical_product_id:productId,
    card_title:'Black and Red Futuristic Bodysuit',
    configurations:[],full_set_display_price_amount:334.97,min_price:334.97,max_price:334.97,
    color_options:[],facets:{colors:[],parts:[],subtypes:[],events:[],performance:[],
      dance:[],styles:[],personas:[],audience:[],materials:[],effects:[],mappingVersion:'feya-storefront-facets-v4'},
  } as unknown as StorefrontProduct;
  const red=enrichStorefrontProductColors(original,snapshot.products[productId]);
  const blue=enrichStorefrontProductColors({...original,canonical_product_id:'other',card_title:'Blue costume'},
    {colors:['blue_black'],held:false});
  const list=[red,blue];
  const filter={...defaultShopFilters(),color:['Black','Red']};
  assert.deepEqual(filterShopProducts(list,filter),[red],'Multi-color photo requires every displayed color');
  assert.deepEqual(filterShopProducts(list,{...filter,color:['Red']}),[]);
  assert.deepEqual(filterShopProducts(list,{...filter,color:['Blue','Black']}),[blue]);
  assert.deepEqual(filterShopProducts(list,{...filter,color:['Gold'],colorMode:'available'}),[red]);
  const url=shopPageHref(1,filter);
  assert.equal(url,'/shop?color=Black%2CRed');
  assert.deepEqual(parseShopNavigation({color:'red,black,red'})?.filters.color,['Black','Red']);
  assert.deepEqual(parseShopNavigation({color:'red,black,red'})?.filters.color.filter(c=>c!=='Black'),['Red']);
  assert.equal(parseShopNavigation({color:'black,not-real'}),null);
});


test('released SEO collections share the same owner-approved colorway overlay as Shop',()=>{
  const facets=readFileSync('lib/storefrontFacetsServer.ts','utf8');
  const landing=readFileSync('lib/searchLandingPageServer.ts','utf8');
  const card=readFileSync('lib/storefrontCardReadModelServer.ts','utf8');
  assert.match(landing,/products:await attachStorefrontFacets\(release\.products\)/);
  assert.match(facets,/products\.map\(\(product\) => applyReviewedBonanzaColors\(/);
  assert.match(card,/rows\.map\(\(row\) => applyReviewedBonanzaColors\(/);
  assert.doesNotMatch(facets,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});
